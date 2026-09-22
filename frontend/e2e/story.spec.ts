import { expect, openStory, test } from "./fixtures";

test("the story has seven steps and the arrow keys move through them", async ({ page }) => {
  await openStory(page);
  await expect(page.locator(".story-tracker li")).toHaveCount(7);
  await expect(page.locator("#story-title")).toHaveText("From Phase 1 to Phase 2");

  for (let step = 1; step < 7; step += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator("#story-title")).toContainText("trade-off");

  await page.getByRole("button", { name: "Previous step" }).click();
  await expect(page.locator("#story-title")).toHaveText("Stop by stop");

  await page.locator(".story-tracker button").first().click();
  await expect(page.locator("#story-title")).toContainText("Phase 1");
});

test("story figures match the evidence and label their source", async ({ page }) => {
  await openStory(page);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".figure-value").first()).toContainText("349,787");
  await expect(page.locator(".story-card .evidence-tag").first()).toHaveText("Measured data");

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#story-title")).toHaveText("Who gains");
  await expect(page.locator(".story-card")).toContainText("126,330");
  await expect(page.locator(".story-card")).toContainText("+55,021");
});

test("the story shows data attribution", async ({ page }) => {
  await openStory(page);
  await expect(page.locator(".story-attribution")).toContainText("Open Government Licence");
});
