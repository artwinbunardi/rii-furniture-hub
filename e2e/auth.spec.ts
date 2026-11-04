import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Authentication & role-based access", () => {
  test("unauthenticated users are sent to login, with a safe return path", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fdashboard/);
  });

  test("wrong password is rejected", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "admin@rii.demo");
    await page.fill("#password", "wrong-password1");
    await page.locator('button[type=submit]:has-text("Masuk")').click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  for (const [email, home] of [
    ["admin@rii.demo", "/app/dashboard"],
    ["management@rii.demo", "/app/dashboard"],
    ["manager@rii.demo", "/app/reservations"],
    ["staff@rii.demo", "/app/warehouse"],
    ["decor@rii.demo", "/"],
  ] as const) {
    test(`${email} lands on their role home`, async ({ page }) => {
      await login(page, email);
      expect(new URL(page.url()).pathname).toBe(home);
    });
  }

  test("Decor Team cannot open admin, warehouse or builder pages, nor export data", async ({ page }) => {
    await login(page, "decor@rii.demo");
    for (const path of ["/app/dashboard", "/app/users", "/app/warehouse", "/app/builder", "/app/builder/editor", "/preview/draft"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/forbidden/);
    }
    const r = await page.request.get("/api/app/export/inventory");
    expect(r.status()).toBe(403);
  });

  test("Warehouse Manager cannot reach the website builder", async ({ page }) => {
    await login(page, "manager@rii.demo");
    await page.goto("/app/builder");
    await expect(page).toHaveURL(/\/forbidden/);
  });
});
