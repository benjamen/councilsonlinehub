import { defineConfig, devices } from "@playwright/test"
export default defineConfig({
	testDir: "./tests/e2e",
	// All hub regression specs — maps to Jira subtasks NZ-353 to NZ-356 + existing NZ-278–283 subtasks
	testMatch: /hub-(pages|agent-signup|remaining-coverage|keycloak-sync|provisioning-personas|profile-updates)\.spec\.ts|step(2|3|4|5|6|7|8|9)-(cross-council-hub|agent-quote|pre-application-meeting|application-lodgement|council-receipt-acknowledgement|completeness-check-fir|assessment-project-tasks|notification-determination)\.spec\.js/,
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
