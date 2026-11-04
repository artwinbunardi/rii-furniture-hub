import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("the catalog works on a phone", async ({ page }) => {
  await login(page, "decor@rii.demo");
  await page.goto("/products");
  await expect(page.locator('main a[href^="/products/"]').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
