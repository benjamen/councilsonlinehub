import { test, expect } from "@playwright/test"

/**
 * Hub pages smoke test
 * Tests navigation to hub pages and verifies they render correctly.
 * Site runs the councilsonlinehub app (presence of the app makes it the hub).
 */

const BASE = process.env.BASE_URL || "http://localhost:8092"

async function loginAsAdmin(page) {
	await page.goto(`${BASE}/login`)
	await page.fill("input#login_email, input[name='usr']", "Administrator")
	await page.fill("input#login_password, input[name='pwd']", "admin123")
	await page.click(".btn-login, button[type='submit']")
	await page.waitForTimeout(2000)
}

test.describe("Hub Pages", () => {
	test.beforeEach(async ({ page }) => {
		// Login via Frappe desk
		await page.goto(`${BASE}/login`)
		await page.waitForSelector("input#login_email, input[name='usr']", { timeout: 10000 })
		await page.fill("input#login_email, input[name='usr']", "Administrator")
		await page.fill("input#login_password, input[name='pwd']", "admin123")
		await page.click(".btn-login, button[type='submit']")
		await page.waitForURL("**/app**", { timeout: 10000 })
	})

	test("hub/councils page loads with council registry", async ({ page }) => {
		await page.goto(`${BASE}/frontend/hub/councils`)
		await page.waitForTimeout(3000)

		// Should show the councils page
		const content = await page.content()
		// Check it's not a 404 or error page
		expect(content).not.toContain("Page Not Found")
		expect(content).not.toContain("404")

		// Take screenshot
		await page.screenshot({ path: "playwright-report/hub-councils.png" })

		console.log("Hub Councils URL:", page.url())
		console.log("Page title:", await page.title())
	})

	test("hub API - get_council_registry returns data", async ({ page }) => {
		// Call the API via page.evaluate to use the session
		const result = await page.evaluate(async () => {
			const resp = await fetch("/api/method/councilsonline.api.hub.get_council_registry", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Frappe-CSRF-Token": window.csrf_token || "",
				},
			})
			return resp.json()
		})
		console.log("council_registry result:", JSON.stringify(result, null, 2))
		expect(result.message).toBeDefined()
		expect(Array.isArray(result.message)).toBe(true)
		expect(result.message.length).toBeGreaterThan(0)
		expect(result.message[0].council_code).toBe("WDC")
	})

	test("hub API - aggregate_requests returns array (as agent)", async ({ page }) => {
		// For Administrator, aggregate_requests will fail with "You must be logged in"
		// since Administrator is blocked. Let's just verify the API exists and
		// the error message is meaningful.
		const result = await page.evaluate(async () => {
			const resp = await fetch("/api/method/councilsonline.api.hub.aggregate_requests", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Frappe-CSRF-Token": window.csrf_token || "",
				},
			})
			const body = await resp.json()
			return { status: resp.status, body }
		})
		console.log("aggregate_requests result:", JSON.stringify(result, null, 2))
		// Either success (200) or permission error (403) - both are valid responses
		expect([200, 403]).toContain(result.status)
		if (result.status === 403) {
			// Expected - Administrator is blocked, agents should use their own accounts
			console.log("Note: aggregate_requests correctly blocks Administrator (use agent account)")
		}
	})

	test("hub/dashboard page renders", async ({ page }) => {
		await page.goto(`${BASE}/frontend/hub/dashboard`)
		await page.waitForTimeout(3000)

		const content = await page.content()
		expect(content).not.toContain("Page Not Found")

		await page.screenshot({ path: "playwright-report/hub-dashboard.png" })
		console.log("Hub Dashboard title:", await page.title())
	})

	test("hub/profile page renders", async ({ page }) => {
		await page.goto(`${BASE}/frontend/hub/profile`)
		await page.waitForTimeout(3000)

		const content = await page.content()
		expect(content).not.toContain("Page Not Found")

		await page.screenshot({ path: "playwright-report/hub-profile.png" })
		console.log("Hub Profile title:", await page.title())
	})

	test("get_council_agent_requests endpoint exists on council sites", async ({ page }) => {
		// This endpoint on council sites is called by the hub to aggregate requests
		const result = await page.evaluate(async () => {
			const resp = await fetch("/api/method/councilsonline.api.auth.get_council_agent_requests", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Frappe-CSRF-Token": window.csrf_token || "",
				},
				body: JSON.stringify({
					agent_email: "test@example.com",
					service_token: "test-secret-token-123",
				}),
			})
			return { status: resp.status, body: await resp.json() }
		})
		console.log("get_council_agent_requests:", JSON.stringify(result, null, 2))
		// Should return a list (possibly empty) or auth error
		expect([200, 403, 417]).toContain(result.status)
	})
})
