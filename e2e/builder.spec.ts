import { test, expect, type Page } from "@playwright/test";
import { login, confirmDialog } from "./helpers";

async function openEditor(page: Page) {
  await page.goto("/app/builder/editor");
  await expect(page.getByText("Memuat kanvas")).toBeHidden({ timeout: 60_000 });
}

test.describe.serial("Website builder: draft, publish, restore", () => {
  const heading = `Uji E2E ${Date.now().toString(36)}`;

  test("inline edit + save changes the draft but not the live site", async ({ page, browser }) => {
    await login(page, "admin@rii.demo");
    await openEditor(page);
    const canvas = page.frameLocator('iframe[title="Kanvas website"]');
    const h1 = canvas.locator("[data-canvas-id] h1[data-editable]").first();
    await h1.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type(heading);
    await canvas.locator("footer").first().click(); // blur commits the edit
    await expect(page.getByTestId("save-status")).toHaveText(/Belum disimpan/);
    await page.getByRole("button", { name: "Simpan draf" }).click();
    await expect(page.getByText(/Draf disimpan/)).toBeVisible();

    await page.goto("/preview/draft");
    await expect(page.locator("h1").first()).toHaveText(heading);
    await page.goto("/");
    await expect(page.locator("body")).not.toContainText(heading);
  });

  test("add, reorder and hide sections in the editor", async ({ page }) => {
    await login(page, "admin@rii.demo");
    await openEditor(page);
    const rows = page.locator("aside ul li");
    const before = await rows.count();
    await page.locator("nav").getByRole("button", { name: "Tambah Bagian" }).click();
    await page.locator("[data-add-section=faq]").click();
    await expect(rows).toHaveCount(before + 1);
    await page.locator("nav").getByRole("button", { name: "Tata Letak" }).click();
    // move the new FAQ section up with the canvas toolbar
    const canvas = page.frameLocator('iframe[title="Kanvas website"]');
    await canvas.locator('[data-canvas-id] button[title="Naikkan"]').first().click();
    await expect(rows.nth(before - 1)).toContainText("FAQ");
    await page.getByRole("button", { name: "Simpan draf" }).click();
    await expect(page.getByText(/Draf disimpan/)).toBeVisible();
  });

  test("publish makes the draft live; version history can restore the previous version", async ({ page }) => {
    await login(page, "admin@rii.demo");
    await page.goto("/app/builder/publish");
    await expect(page.getByTestId("pending-changes")).toContainText("Beranda");
    await page.fill("input[name=note]", "E2E publish");
    await page.getByRole("button", { name: /Publikasikan sebagai/ }).click();
    await expect(page.getByText(/Versi \d+ dipublikasikan/).first()).toBeVisible();
    await page.goto("/");
    await expect(page.locator("h1").first()).toHaveText(heading);

    await page.goto("/app/builder/versions");
    const v1 = page.locator('tr[data-version="1"]');
    await v1.getByRole("button", { name: "Pulihkan & publikasikan" }).click();
    await confirmDialog(page, "Pulihkan & publikasikan");
    await expect(page.getByText(/Dipulihkan/).first()).toBeVisible();
    await page.goto("/");
    await expect(page.locator("body")).not.toContainText(heading);
  });
});

test("template library: filter, search, preview and apply to draft", async ({ page }) => {
  await login(page, "admin@rii.demo");
  await page.goto("/app/builder/templates");
  await expect(page.locator("[data-template]")).toHaveCount(50);
  await page.getByRole("button", { name: "Skandinavia" }).click();
  await expect(page.locator("[data-template]")).toHaveCount(5);
  await page.getByLabel("Cari template").fill("hygge");
  await expect(page.locator("[data-template]")).toHaveCount(1);
  await page.locator("[data-template=scn-hygge]").getByRole("button", { name: "Pratinjau", exact: true }).click();
  const frame = page.locator('iframe[title="Hygge"]');
  await expect(frame).toBeVisible();
  await page.getByRole("button", { name: "Mobile" }).click();
  await expect.poll(async () => Math.round((await frame.boundingBox())!.width)).toBe(390);
  await page.getByRole("dialog").getByRole("button", { name: "Gunakan Template Ini" }).click();
  await page.getByRole("button", { name: /Terapkan ke draf/ }).click();
  await expect(page).toHaveURL(/\/app\/builder\/editor/);
  await page.goto("/app/builder");
  await expect(page.locator("main")).toContainText("Hygge");
});
