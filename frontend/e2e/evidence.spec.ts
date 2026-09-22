import { expect, test } from "./fixtures";

test("every chart can be shown as a table", async ({ page }) => {
  await page.goto("/#/evidence");
  const budget = page.locator(".chart-frame", { hasText: "What more budget buys" });
  await budget.getByRole("button", { name: "Show table" }).click();
  await expect(budget.locator("tbody tr")).toHaveCount(11);
  await budget.getByRole("button", { name: "Show chart" }).click();
  await expect(budget.locator("svg.column-chart")).toBeVisible();
});

test("chart values are reachable by hover and by keyboard", async ({ page }) => {
  await page.goto("/#/evidence");
  await page.locator(".column-hit").nth(6).hover();
  await expect(page.locator(".chart-tooltip").first()).toContainText("126,330");

  await page.mouse.move(2, 2);
  await page.locator(".band-row").first().focus();
  await expect(page.locator(".chart-tooltip").first()).toContainText("126,330");
});

test("the value-for-money breakdown adds up", async ({ page }) => {
  await page.goto("/#/evidence");
  const value = page.locator(".chart-frame", { hasText: "Value for money" });
  await expect(value).toContainText("£10.90");
  await expect(value).toContainText("£450,000");
  await expect(value).toContainText("£150,000");
});

test("the ask page links back to Phase 1 and shows attribution", async ({ page }) => {
  await page.goto("/#/ask");
  await expect(page.getByRole("link", { name: /Phase 1 in SpineLens AI/ }).first()).toHaveAttribute(
    "href",
    "https://spinelens-ai.pages.dev"
  );
  await expect(page.locator(".ask-hero-figure")).toContainText("+55,021");
  await expect(page.locator(".site-footer-attribution")).toContainText("OpenStreetMap");
});
