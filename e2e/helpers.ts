import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Demo1234!";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login")),
    page.locator('button[type=submit]:has-text("Masuk"), button[type=submit]:has-text("Sign in")').first().click(),
  ]);
}

/** Confirm the open <dialog> (ConfirmButton) by clicking its action button. */
export async function confirmDialog(page: Page, label: string | RegExp) {
  const btn = page.locator("dialog[open]").getByRole("button", { name: label });
  await expect(btn).toBeVisible();
  await btn.click();
}

export const isoDay = (offset: number) => {
  const d = new Date(Date.now() + 7 * 3600_000); // Asia/Jakarta
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
