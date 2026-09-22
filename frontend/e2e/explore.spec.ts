import { expect, mapFingerprint, openExplore, test } from "./fixtures";

test("need, gap and gain render different maps", async ({ page }) => {
  await openExplore(page);
  const prints = new Set<string>();
  for (const mode of ["Need", "Gap", "Gain"]) {
    await page.getByRole("radio", { name: new RegExp(`^${mode}`) }).click();
    await page.waitForTimeout(900);
    prints.add(await mapFingerprint(page));
  }
  expect(prints.size).toBe(3);
});

test("the default plan, its band chart and attribution are shown", async ({ page }) => {
  await openExplore(page);
  await expect(page.locator(".result-lead")).toContainText("126,330");
  await expect(page.locator(".band-section .band-row")).toHaveCount(5);
  await expect(page.locator(".band-section .section-hint")).toContainText("71,309");
  await expect(page.locator(".data-note")).toContainText("Open Government Licence");
});

test("selecting a stop focuses it and lists its neighbourhoods", async ({ page }) => {
  await openExplore(page);
  const card = page.locator(".stop-card").nth(1);
  await card.locator(".stop-card-main").click();
  await expect(card.locator(".stop-card-main")).toHaveAttribute("aria-pressed", "true");
  await card.locator(".stop-toggle").click();
  await expect(card.locator(".neighbourhood-list li")).toHaveCount(14);
});

test("changing the walking time re-runs the optimiser", async ({ page }) => {
  await openExplore(page);
  await page.locator('label:has-text("15 min")').click();
  await expect(page.locator(".result-lead")).toContainText("15-minute");
  await expect(page.locator(".result-lead")).not.toContainText("126,330");
});

test("an impossible budget explains how to fix it, and reset restores the plan", async ({ page }) => {
  await openExplore(page);
  await page.locator('input[type="range"]').first().focus();
  await page.keyboard.press("Home");
  await expect(page.locator(".result-lead")).toContainText("No set of stops");
  await expect(page.locator(".result-detail")).toContainText("£150,000");

  await page.locator(".switch-field").click();
  await expect(page.locator(".result-lead")).toContainText("This stop puts");

  await page.getByRole("button", { name: /Back to the default plan/ }).click();
  await expect(page.locator(".result-lead")).toContainText("126,330");
});

test("3D view and the extra stop layers render without errors", async ({ page }) => {
  await openExplore(page);
  const flat = await mapFingerprint(page);
  await page.getByRole("radio", { name: /3D/ }).click();
  await page.locator('label.check-chip:has-text("possible locations")').click();
  await page.waitForTimeout(2500);
  expect(await mapFingerprint(page)).not.toBe(flat);
  await expect(page.locator(".map-legend")).toContainText("Possible stop location");
});
