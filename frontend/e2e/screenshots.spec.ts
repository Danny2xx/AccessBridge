import { expect, test } from "./fixtures";

/**
 * Portfolio screenshots, written to docs/screenshots. Run with
 * `npm run screenshots`; the normal `npm run test:e2e` run skips them.
 */
const OUT = "../docs/screenshots";

async function shot(page: import("@playwright/test").Page, name: string, fullPage = false) {
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 82, fullPage });
}

test("story screenshots", async ({ page }) => {
  await page.goto("/#/story");
  await expect(page.locator("#story-title")).toBeVisible();
  const names = ["01-story-phase-2", "02-deprivation", "03-access-gap", "04-the-plan", "05-who-gains-3d", "06-stop-close-up", "07-trade-off"];
  for (let index = 0; index < names.length; index += 1) {
    await page.waitForTimeout(index === 0 ? 3500 : 3200);
    await shot(page, names[index]);
    if (index < names.length - 1) await page.keyboard.press("ArrowRight");
  }
});

test("explore screenshots", async ({ page }) => {
  await page.goto("/#/explore");
  await expect(page.getByTestId("stop-card")).toHaveCount(7);
  await page.waitForTimeout(3500);
  await shot(page, "08-explore");
  await page.getByTestId("stop-card-main").nth(1).click();
  await page.waitForTimeout(3000);
  await shot(page, "09-explore-stop-focus");
  await page.getByTestId("stop-card-main").nth(1).click();
  await page.getByRole("radio", { name: "3D" }).click();
  await page.waitForTimeout(3000);
  await shot(page, "10-explore-3d");
});

test("document page screenshots", async ({ page }) => {
  for (const [route, name] of [
    ["evidence", "11-evidence"],
    ["how-it-works", "12-how-it-works"],
    ["ask", "13-the-ask"]
  ]) {
    await page.goto(`/#/${route}`);
    await expect(page.locator("h1")).toBeVisible();
    await page.waitForTimeout(1800);
    await shot(page, name, true);
  }
});

test("dark mode screenshots", async ({ page }) => {
  await page.goto("/#/explore");
  await expect(page.getByTestId("stop-card")).toHaveCount(7);
  await page.getByTestId("theme-toggle").click();
  await page.waitForTimeout(4000);
  await shot(page, "14-dark-explore");

  await page.goto("/#/evidence");
  await expect(page.locator("h1")).toBeVisible();
  await page.waitForTimeout(1800);
  await shot(page, "15-dark-evidence", true);
});
