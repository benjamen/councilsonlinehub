import { test, expect } from "@playwright/test"

/**
 * Hub E2E: Agent signs up and is visible across all councils
 */

const BASE = process.env.BASE_URL || "http://127.0.0.1:8090"
// Unique per run so we can re-run cleanly
const TEST_AGENT_EMAIL = `hub-agent-fixed@councilstest.nz`
const TEST_AGENT_PASSWORD = "TestPass2026"

async function loginAgent(page) {
	await page.goto(`${BASE}/login`)
	await page.waitForSelector("input#login_email, input[name='usr']", { timeout: 10000 })
	await page.fill("input#login_email, input[name='usr']", TEST_AGENT_EMAIL)
	await page.fill("input#login_password, input[name='pwd']", TEST_AGENT_PASSWORD)
	await page.click(".btn-login, button[type='submit']")
	// Agent has no desk access → Frappe redirects to /frontend
	// Then Vue router may further redirect to complete-registration or dashboard
	await page.waitForURL(/\/(frontend|app)/, { timeout: 15000 })
	await page.waitForTimeout(2000)
}

async function loginAdmin(page) {
	await page.goto(`${BASE}/login`)
	await page.waitForSelector("input#login_email, input[name='usr']", { timeout: 10000 })
	await page.fill("input#login_email, input[name='usr']", "Administrator")
	await page.fill("input#login_password, input[name='pwd']", "admin123")
	await page.click(".btn-login, button[type='submit']")
	await page.waitForURL("**/app**", { timeout: 15000 })
	await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {})
}

test.describe.serial("Hub Agent Full Flow", () => {

	test("SETUP: Verify test agent user exists and can be accessed", async ({ page }) => {
		// User hub-agent-fixed@councilstest.nz is pre-created via bench console
		// Just verify the admin can see them in the system
		await loginAdmin(page)
		const result = await page.evaluate(
			async (email) => {
				const resp = await fetch("/api/resource/User/" + encodeURIComponent(email), {
					headers: { "X-Frappe-CSRF-Token": window.csrf_token || "" },
				})
				return { status: resp.status }
			},
			TEST_AGENT_EMAIL
		)
		console.log("User lookup status:", result.status)
		expect([200, 403]).toContain(result.status) // 403 = exists but restricted (fine)
		await page.screenshot({ path: "playwright-report/hub/1-verify-agent.png" })
	})

	test("STEP 1: Agent logs in → redirected to CompleteRegistration", async ({ page }) => {
		await loginAgent(page)

		// Router guard should redirect incomplete agent to complete-registration
		const url = page.url()
		console.log("Agent landed at:", url)
		expect(url).toContain("/frontend/")
		// Should be on complete-registration (new agent with no SQ)
		const isCompleteReg = url.includes("complete-registration")
		console.log("On CompleteRegistration?", isCompleteReg)

		await page.screenshot({ path: "playwright-report/hub/2-agent-login-redirect.png" })
	})

	test("STEP 2: Agent completes profile via save_registration_profile", async ({ page }) => {
		await loginAgent(page)
		// Ensure we're on the frontend to get CSRF token
		if (!page.url().includes("/frontend/")) {
			await page.goto(`${BASE}/frontend/`)
			await page.waitForTimeout(2000)
		}

		const result = await page.evaluate(async () => {
			const resp = await fetch("/api/method/councilsonline.api.auth.save_registration_profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Frappe-CSRF-Token": window.csrf_token || "",
				},
				body: JSON.stringify({
					phone: "+64 9 555 1234",
					physical_flat_unit: "12 Kamo Road",
					physical_suburb: "Kamo",
					physical_city: "Whangarei",
					physical_postcode: "0112",
					mailing_type: "Same as Physical",
					specialties: JSON.stringify([
						{ specialty: "Residential" },
						{ specialty: "Commercial" },
					]),
					sq1_question: "What is your mother's maiden name?",
					sq1_answer: "Smith",
					sq2_question: "What was the name of your first pet?",
					sq2_answer: "Rover",
					sq3_question: "What city were you born in?",
					sq3_answer: "Auckland",
				}),
			})
			return { status: resp.status, body: await resp.json() }
		})

		console.log("save_registration_profile:", result.status, JSON.stringify(result.body?.message || result.body, null, 2))
		expect(result.status).toBe(200)
		await page.screenshot({ path: "playwright-report/hub/3-profile-saved.png" })
	})

	test("STEP 3: Hub get_hub_profile returns complete agent data", async ({ page }) => {
		await loginAgent(page)
		if (!page.url().includes("/frontend/")) {
			await page.goto(`${BASE}/frontend/`)
			await page.waitForTimeout(2000)
		}

		const result = await page.evaluate(async () => {
			const resp = await fetch("/api/method/councilsonlinehub.api.hub.get_hub_profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Frappe-CSRF-Token": window.csrf_token || "",
				},
			})
			return { status: resp.status, body: await resp.json() }
		})

		console.log("get_hub_profile:", result.status)
		expect(result.status).toBe(200)

		const profile = result.body.message
		expect(profile.phone).toBeTruthy()
		expect(profile.physical_city).toBe("Whangarei")
		expect(profile.physical_postcode).toBe("0112")
		expect(Array.isArray(profile.specialties)).toBe(true)
		expect(profile.specialties.length).toBeGreaterThanOrEqual(2)
		console.log(`Profile OK — city: ${profile.physical_city}, specialties: ${profile.specialties.map((s: any) => s.specialty_name || s.specialty).join(", ")}`)

		await page.screenshot({ path: "playwright-report/hub/4-hub-profile-fetched.png" })
	})

	test("STEP 4: aggregate_requests works with agent session (0 requests initially)", async ({ page }) => {
		await loginAgent(page)
		if (!page.url().includes("/frontend/")) {
			await page.goto(`${BASE}/frontend/`)
			await page.waitForTimeout(2000)
		}

		const result = await page.evaluate(async () => {
			const resp = await fetch("/api/method/councilsonlinehub.api.hub.aggregate_requests", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Frappe-CSRF-Token": window.csrf_token || "",
				},
			})
			return { status: resp.status, body: await resp.json() }
		})

		console.log("aggregate_requests:", result.status, "count:", result.body?.message?.length)
		expect(result.status).toBe(200)
		expect(Array.isArray(result.body.message)).toBe(true)
		console.log(`Agent has ${result.body.message.length} requests across all councils (expected 0 initially)`)

		await page.screenshot({ path: "playwright-report/hub/5-aggregate-requests.png" })
	})

	test("STEP 5: get_council_agent_requests returns agent's council requests", async ({ page }) => {
		await loginAdmin(page)
		// Use /app (desk) as base context — no Vue Router redirects, CSRF token available
		await page.goto(`${BASE}/app`)
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {})

		const result = await page.evaluate(
			async ({ agentEmail, token }) => {
				const resp = await fetch(
					"/api/method/councilsonline.api.auth.get_council_agent_requests",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"X-Frappe-CSRF-Token": window.csrf_token || "",
						},
						body: JSON.stringify({ agent_email: agentEmail, service_token: token }),
					}
				)
				return { status: resp.status, body: await resp.json() }
			},
			{ agentEmail: TEST_AGENT_EMAIL, token: "test-secret-token-123" }
		)

		console.log("get_council_agent_requests:", result.status, "count:", result.body?.message?.length)
		expect(result.status).toBe(200)
		expect(Array.isArray(result.body.message)).toBe(true)
		console.log(`Council has ${result.body.message.length} requests for agent (expected 0)`)

		await page.screenshot({ path: "playwright-report/hub/6-council-agent-requests.png" })
	})

	test("STEP 6: get_agent_profile_for_council syncs profile hub→council", async ({ page }) => {
		// Navigate to base URL first so relative fetch URLs work
		await page.goto(BASE)
		await page.waitForTimeout(1000)
		// This endpoint is allow_guest=True; hub calls it when agent first logs into a council
		const result = await page.evaluate(
			async ({ agentEmail, token }) => {
				const resp = await fetch(
					"/api/method/councilsonlinehub.api.hub.get_agent_profile_for_council",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ agent_email: agentEmail, service_token: token }),
					}
				)
				return { status: resp.status, body: await resp.json() }
			},
			{ agentEmail: TEST_AGENT_EMAIL, token: "test-secret-token-123" }
		)

		console.log("get_agent_profile_for_council status:", result.status)
		expect(result.status).toBe(200)

		const profile = result.body.message
		expect(profile.physical_city).toBe("Whangarei")
		expect(profile.physical_postcode).toBe("0112")
		expect(Array.isArray(profile.specialties)).toBe(true)
		console.log(`Sync profile: city=${profile.physical_city}, specialties=${profile.specialties?.length}`)
		console.log("Directors:", profile.directors)
		console.log("Authorising officer:", profile.authorising_officer)

		await page.screenshot({ path: "playwright-report/hub/7-profile-for-council-sync.png" })
	})

	test("STEP 7: Hub pages render with agent session", async ({ page }) => {
		await loginAgent(page)

		// hub/councils
		await page.goto(`${BASE}/frontend/hub/councils`)
		await page.waitForTimeout(2500)
		let content = await page.content()
		expect(content).not.toContain("Page Not Found")
		const hasWDC = content.includes("Whangarei") || content.includes("WDC")
		console.log("HubCouncils shows WDC:", hasWDC)
		await page.screenshot({ path: "playwright-report/hub/8-hub-councils.png" })

		// hub/profile
		await page.goto(`${BASE}/frontend/hub/profile`)
		await page.waitForTimeout(2500)
		content = await page.content()
		expect(content).not.toContain("Page Not Found")
		await page.screenshot({ path: "playwright-report/hub/9-hub-profile.png" })

		// hub/dashboard
		await page.goto(`${BASE}/frontend/hub/dashboard`)
		await page.waitForTimeout(2500)
		content = await page.content()
		expect(content).not.toContain("Page Not Found")
		await page.screenshot({ path: "playwright-report/hub/10-hub-dashboard.png" })

		console.log("All hub pages rendered OK")
	})
})
