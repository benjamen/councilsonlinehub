import { defineConfig, devices } from "@playwright/test"
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /debug-session\.spec\.js/,
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8090",
    headless: true,
    launchOptions: { args: ["--no-sandbox"] },
  },
  projects: [{
    name: "hub",
    use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
  }],
})
