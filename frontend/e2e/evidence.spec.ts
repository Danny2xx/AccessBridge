import { expect, test } from "./fixtures";

test("every chart can be shown as a table", async ({ page, expected }) => {
  await page.goto("/#/evidence");
  const budget = page.getByTestId("chart-card").filter({ hasText: "What more budget buys" });
  await budget.getByRole("button", { name: "Show table" }).click();
  await expect(budget.locator("tbody tr")).toHaveCount(expected.budgetPoints);
  await budget.getByRole("button", { name: "Show chart" }).click();
  await expect(budget.getByTestId("column-chart")).toBeVisible();
});

test("chart values are reachable by hover and by keyboard", async ({ page, expected }) => {
  await page.goto("/#/evidence");
  await page.getByTestId("column-hit").nth(6).hover();
  await expect(page.getByTestId("chart-tooltip").first()).toContainText(expected.mostDeprivedReached);

  await page.mouse.move(2, 2);
  await page.getByTestId("band-row").first().focus();
  await expect(page.getByTestId("chart-tooltip").first()).toContainText(expected.mostDeprivedReached);
});

test("evidence labels explain themselves on hover", async ({ page }) => {
  await page.goto("/#/evidence");
  await page.getByTestId("chart-card").first().getByTestId("evidence-tag").first().hover();
  await expect(page.getByRole("tooltip")).toContainText("IMD 2025");
});

test("the value-for-money breakdown adds up", async ({ page, expected }) => {
  await page.goto("/#/evidence");
  const value = page.getByTestId("chart-card").filter({ hasText: "Value for money" });
  await expect(value).toContainText(expected.costPerResident);
  await expect(value).toContainText(`${expected.busStops} × bus stop`);
  await expect(value).toContainText(expected.totalCost);
});

test("the ask page links back to Phase 1 and shows attribution", async ({ page, expected }) => {
  await page.goto("/#/ask");
  await expect(page.getByRole("link", { name: /Phase 1 in SpineLens AI/ }).first()).toHaveAttribute(
    "href",
    "https://spinelens-ai.pages.dev"
  );
  await expect(page.getByTestId("ask-hero")).toContainText(expected.mostDeprivedGain);
  await expect(page.getByTestId("footer-attribution")).toContainText("OpenStreetMap");
});
