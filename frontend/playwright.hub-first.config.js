import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /hub-first-flow\.spec\.ts/,
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.HUB_URL || "http://nzcouncil.localhost:8090",
    headless: false,
    slowMo: 800,
    screenshot: "on",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "hub-first",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1400, height: 900 },
      },
    },
  ],
  reporter: [["list"]],
})
