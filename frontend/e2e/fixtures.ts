import { expect, test as base, type Page } from "@playwright/test";
import { createHash } from "node:crypto";

/** Every test fails if the page logs a console error or throws. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      await use(errors);
      expect(errors, "console errors").toEqual([]);
    },
    { auto: true }
  ]
});

export { expect };

export async function openStory(page: Page) {
  await page.goto("/#/story");
  await expect(page.locator("#story-title")).toBeVisible();
}

export async function openExplore(page: Page) {
  await page.goto("/#/explore");
  await expect(page.getByTestId("stop-card")).toHaveCount(7);
}

/** Hash of what the map currently shows, used to prove views differ. */
export async function mapFingerprint(page: Page, testId = "explore-map"): Promise<string> {
  const image = await page.getByTestId(testId).screenshot();
  return createHash("sha1").update(image).digest("hex");
}
