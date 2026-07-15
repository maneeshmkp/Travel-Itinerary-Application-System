/** @type {import('@playwright/test').PlaywrightTestConfig} */
import { defineConfig, devices } from "@playwright/test"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isCI = !!process.env.CI
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000"
const skipWebServer = process.env.E2E_SKIP_WEBSERVER === "1" || process.env.E2E_SKIP_WEBSERVER === "true"

export default defineConfig({
  testDir: path.join(__dirname, "tests/e2e"),
  outputDir: path.join(__dirname, "test-results"),
  fullyParallel: false,
  forbidOnly: isCI,
  retries: 1,
  workers: isCI ? 1 : 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ...(isCI ? [["github"]] : []),
  ],
  use: {
    baseURL,
    headless: isCI ? true : process.env.E2E_HEADED !== "1",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    ...devices["Desktop Chrome"],
  },
  projects: [
    {
      name: "critical",
      testMatch: /.*\.critical\.spec\.js/,
      retries: 1,
    },
    {
      name: "chromium",
      testMatch: /.*\.spec\.js/,
      testIgnore: /.*\.critical\.spec\.js/,
      retries: 1,
    },
  ],
  webServer: skipWebServer
    ? undefined
    : [
        {
          command: "npm run start --prefix backend",
          url: process.env.E2E_API_URL || "http://127.0.0.1:5000/api/health",
          reuseExistingServer: !isCI,
          timeout: 120_000,
          cwd: __dirname,
        },
        {
          command: "npm run dev --prefix frontend",
          url: baseURL,
          reuseExistingServer: !isCI,
          timeout: 120_000,
          cwd: __dirname,
        },
      ],
})
