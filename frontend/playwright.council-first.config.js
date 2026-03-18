import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /council-first-flow\.spec\.ts/,
  timeout: 300_000,   // 5 min total — plenty of time for manual Keycloak step
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.COUNCIL_URL || "http://whangarei.localhost:8092",
    headless: false,
    slowMo: 800,      // human-readable speed
    screenshot: "on",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "council-first",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1400, height: 900 },
      },
    },
  ],
  reporter: [["list"]],
})
