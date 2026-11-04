import { test, expect } from "@playwright/test";
import { login, confirmDialog, isoDay } from "./helpers";

test("Decor submits a reservation, the Warehouse Manager approves it", async ({ browser }) => {
  // Decor: add a product, set dates, submit
  const decorCtx = await browser.newContext();
  const decor = await decorCtx.newPage();
  await login(decor, "decor@rii.demo");
  await decor.goto("/products");
  await decor.locator('main a[href^="/products/"]').first().click();
  await expect(decor).toHaveURL(/\/products\/.+/);
  await decor.getByTestId("add-to-cart").click();
  await decor.goto("/cart");
  await decor.getByTestId("project-select").selectOption({ index: 1 });
  await decor.getByTestId("cart-from").fill(isoDay(20));
  await decor.getByTestId("cart-to").fill(isoDay(22));
  await decor.getByTestId("save-details").click();
  await expect(decor.getByTestId("submit-reservation")).toBeEnabled();
  await decor.getByTestId("submit-reservation").click();
  await expect(decor).toHaveURL(/\/my-reservations\/.+/);
  const resUrl = new URL(decor.url()).pathname;
  const id = resUrl.split("/").pop()!;
  await expect(decor.locator("main")).toContainText(/Menunggu persetujuan|pending/i);

  // Manager: approve
  const mgrCtx = await browser.newContext();
  const mgr = await mgrCtx.newPage();
  await login(mgr, "manager@rii.demo");
  await mgr.goto(`/app/reservations/${id}`);
  await mgr.getByRole("button", { name: "Setujui" }).first().click();
  await confirmDialog(mgr, "Setujui");
  await expect(mgr.locator("main")).toContainText(/Disetujui|Approved/);

  // Decor sees the new status; the approval created an outbox email for the requester
  await decor.reload();
  await expect(decor.locator("main")).toContainText(/Disetujui|Approved/);
  await decorCtx.close(); await mgrCtx.close();
});

test("a reservation cannot exceed available stock", async ({ page }) => {
  await login(page, "decor@rii.demo");
  await page.goto("/products");
  await page.locator('main a[href^="/products/"]').first().click();
  const qty = page.getByTestId("qty-input");
  await qty.fill("9999");
  await expect(page.getByTestId("add-to-cart")).toBeDisabled();
});
