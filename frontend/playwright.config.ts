import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for the AccessBridge site. They start the FastAPI backend and
 * the Vite dev server if they are not already running.
 *
 * Uses the locally installed Google Chrome by default. On a machine without it,
 * run `npx playwright install chromium` and set PW_CHANNEL=chromium.
 */
const channel = process.env.PW_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    channel,
    viewport: { width: 1600, height: 1000 },
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chrome",
      testIgnore: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1600, height: 1000 } }
    },
    {
      // Portfolio screenshots for docs/screenshots. Run with `npm run screenshots`.
      name: "screenshots",
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1440, height: 900 } }
    }
  ],
  webServer: [
    {
      command: ".venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000",
      cwd: "..",
      url: "http://127.0.0.1:8000/health",
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 120_000
    }
  ]
});
