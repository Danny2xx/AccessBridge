import { expect, mapFingerprint, openExplore, test } from "./fixtures";

test("need, gap and gain render different maps", async ({ page, expected }) => {
  await openExplore(page, expected.stopCount);
  const prints = new Set<string>();
  for (const mode of ["Need", "Gap", "Gain"]) {
    await page.getByRole("radio", { name: new RegExp(`^${mode}`) }).click();
    await page.waitForTimeout(900);
    prints.add(await mapFingerprint(page));
  }
  expect(prints.size).toBe(3);
});

test("the default plan, its band chart and attribution are shown", async ({ page, expected }) => {
  await openExplore(page, expected.stopCount);
  await expect(page.getByTestId("result-lead")).toContainText(expected.mostDeprivedReached);
  await expect(page.locator("aside").getByTestId("band-row")).toHaveCount(5);
  await expect(page.getByTestId("band-sentence")).toContainText(expected.reachedToday);
  await expect(page.getByTestId("data-note")).toContainText("Open Government Licence");
});

test("selecting a stop focuses it and lists its neighbourhoods", async ({ page, expected }) => {
  await openExplore(page, expected.stopCount);
  const card = page.getByTestId("stop-card").nth(1);
  await card.getByTestId("stop-card-main").click();
  await expect(card.getByTestId("stop-card-main")).toHaveAttribute("aria-pressed", "true");
  await card.getByTestId("stop-toggle").click();
  await expect(card.getByTestId("neighbourhood-row")).toHaveCount(expected.secondStopNeighbourhoods);
});

test("changing the walking time re-runs the optimiser", async ({ page, expected }) => {
  await openExplore(page, expected.stopCount);
  await page.getByRole("radio", { name: "15 min" }).click();
  await expect(page.getByTestId("result-lead")).toContainText("15-minute");
  await expect(page.getByTestId("result-lead")).not.toContainText(expected.mostDeprivedReached);
});

test("an impossible budget explains how to fix it, and reset restores the plan", async ({ page, expected }) => {
  await openExplore(page, expected.stopCount);
  await page.getByRole("slider", { name: "Budget" }).focus();
  await page.keyboard.press("Home");
  await expect(page.getByTestId("result-lead")).toContainText("No set of stops");
  await expect(page.getByTestId("result-detail")).toContainText("£150,000");

  await page.getByRole("switch", { name: /rail or Metro link/ }).click();
  await expect(page.getByTestId("result-lead")).toContainText("This stop puts");

  await page.getByRole("button", { name: /Back to the default plan/ }).click();
  await expect(page.getByTestId("result-lead")).toContainText(expected.mostDeprivedReached);
});

test("3D view and the extra stop layers render without errors", async ({ page, expected }) => {
  await openExplore(page, expected.stopCount);
  const flat = await mapFingerprint(page);
  await page.getByRole("radio", { name: "3D" }).click();
  await page.getByRole("button", { name: /possible locations/ }).click();
  await page.waitForTimeout(2500);
  expect(await mapFingerprint(page)).not.toBe(flat);
  await expect(page.getByTestId("map-legend")).toContainText("Possible stop location");
});
