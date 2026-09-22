import { expect, test } from "./fixtures";

const ROUTES = ["story", "explore", "evidence", "how-it-works", "ask"];

test("the first Tab on a fresh load reaches the skip link", async ({ page }) => {
  for (const route of ["story", "explore", "ask"]) {
    // A hash-only change is an in-app navigation, so load a blank page first.
    await page.goto("about:blank");
    await page.goto(`/#/${route}`);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveText("Skip to content");
  }
});

test("moving between pages puts focus on the new content", async ({ page }) => {
  await page.goto("/#/ask");
  await expect(page.locator("h1")).toHaveText("The Ask");
  await page.click('a[href="#/evidence"]');
  await expect(page.locator("h1")).toHaveText("The evidence");
  await expect(page.locator("main")).toBeFocused();
});

test.describe("phone width", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const route of ROUTES) {
    test(`${route} does not scroll sideways`, async ({ page }) => {
      await page.goto(`/#/${route}`);
      await expect(page.locator("h1").first()).toBeVisible();
      await page.waitForTimeout(1500);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("story cards do not animate and counters show final values at once", async ({ page }) => {
    await page.goto("/#/story");
    await expect(page.locator("#story-title")).toHaveText("From Phase 1 to Phase 2");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#story-title")).toHaveText("Who lives around it");
    const duration = await page.locator(".story-card-scroll").evaluate((el) => getComputedStyle(el).animationDuration);
    expect(parseFloat(duration)).toBeLessThan(0.01);
    await expect(page.locator(".figure-value [aria-hidden='true']").first()).toHaveText("349,787");
  });
});
