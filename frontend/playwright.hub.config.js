import { defineConfig, devices } from "@playwright/test"
export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: /hub-(pages|agent-signup|remaining-coverage|keycloak-sync)\.spec\.ts/,
	timeout: 90 * 1000,
	fullyParallel: false,
	workers: 1,
	reporter: [["list"], ["html", { outputFolder: "playwright-report/hub" }]],
	use: {
		baseURL: process.env.BASE_URL || "http://127.0.0.1:8090",
		trace: "on-first-retry",
		screenshot: "on",
		headless: !process.env.HEADED,
		slowMo: process.env.HEADED ? parseInt(process.env.SLOW_MO || "600", 10) : 0,
		launchOptions: { args: ["--no-sandbox"] },
	},
	projects: [
		{
			name: "hub",
			use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
		},
	],
})
