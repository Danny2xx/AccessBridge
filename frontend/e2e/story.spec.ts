import { expect, openStory, test } from "./fixtures";

test("the story has seven steps and the arrow keys move through them", async ({ page }) => {
  await openStory(page);
  await expect(page.getByTestId("story-step-dot")).toHaveCount(7);
  await expect(page.locator("#story-title")).toHaveText("From Phase 1 to Phase 2");

  for (let step = 1; step < 7; step += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator("#story-title")).toContainText("trade-off");

  await page.getByRole("button", { name: "Previous step" }).click();
  await expect(page.locator("#story-title")).toHaveText("Stop by stop");

  await page.getByTestId("story-step-dot").first().click();
  await expect(page.locator("#story-title")).toContainText("Phase 1");
});

test("story figures match the evidence and label their source", async ({ page, expected }) => {
  await openStory(page);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("figure-value").first()).toContainText(expected.population);
  await expect(page.getByTestId("story-panel").getByTestId("evidence-tag").first()).toHaveText("Measured data");

  for (let step = 0; step < 3; step += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator("#story-title")).toHaveText("Who gains");
  await expect(page.getByTestId("story-panel")).toContainText(expected.mostDeprivedReached);
  await expect(page.getByTestId("story-panel")).toContainText(expected.mostDeprivedGain);
});

test("the story shows data attribution", async ({ page }) => {
  await openStory(page);
  await expect(page.getByTestId("story-attribution")).toContainText("Open Government Licence");
});
