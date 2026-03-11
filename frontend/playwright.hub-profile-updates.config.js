import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: /hub-profile-updates\.spec\.ts/,
	timeout: 120 * 1000,
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: process.env.BASE_URL || "http://127.0.0.1:8090",
		headless: false,
		slowMo: parseInt(process.env.SLOW_MO || "300", 10),
		screenshot: "on",
		video: "retain-on-failure",
		launchOptions: { args: ["--no-sandbox"] },
	},
	projects: [
		{
			name: "hub-profile-updates",
			use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
		},
	],
})
