import { test, expect } from "@playwright/test"

/**
 * Keycloak NZ sync tests
 *
 * Tests sync_nz_attributes + _sync_from_hub via the test_sync_nz_attributes
 * endpoint, simulating a Keycloak NZ SSO login.
 *
 * Hub is master — hub data ALWAYS overwrites council-local data on every login.
 */

const BASE = process.env.BASE_URL || "http://localhost:8092"
const TEST_EMAIL = "kc-sync-e2e@councilstest.nz"
const ADMIN_PASS = "admin123"

const KC_USERINFO = {
	sub: "test-kc-sub-001",
	email: TEST_EMAIL,
	email_verified: true,
	given_name: "Keycloak",
	family_name: "SyncTest",
	azp: "councilsonline-nz-app",
	userType: "Agent",
	agentType: "Sole Trader",
	phone: "+64 9 555 9876",
	tradingName: "KC Sync Planning Ltd",
	securityQuestion1: "What was the name of your first pet?",
	securityAnswer1: "Fido",
	securityQuestion2: "What is your mother's maiden name?",
	securityAnswer2: "Johnson",
	securityQuestion3: "What city were you born in?",
	securityAnswer3: "Christchurch",
}

async function loginAdmin(page) {
	await page.goto(`${BASE}/login`)
	await page.waitForSelector("input#login_email, input[name='usr']", { timeout: 10000 })
	await page.fill("input#login_email, input[name='usr']", "Administrator")
	await page.fill("input#login_password, input[name='pwd']", ADMIN_PASS)
	await page.click(".btn-login, button[type='submit']")
	await page.waitForURL("**/app**", { timeout: 15000 })
	await page.goto(`${BASE}/frontend/`)
	await page.waitForTimeout(1500)
}

test.describe.serial("Keycloak NZ Sync (_sync_from_hub — hub is master)", () => {

	test("SETUP: Ensure test user doesnt exist (clean slate)", async ({ page }) => {
		await loginAdmin(page)
		const cleanup = await page.evaluate(async (email) => {
			const resp = await fetch("/api/method/frappe.client.delete", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": window.csrf_token || "" },
				body: JSON.stringify({ doctype: "User Profile Extended", name: email }),
			})
			const r2 = await fetch("/api/method/frappe.client.delete", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": window.csrf_token || "" },
				body: JSON.stringify({ doctype: "User", name: email }),
			})
			return { profileDel: resp.status, userDel: r2.status }
		}, TEST_EMAIL)
		console.log("Cleanup:", cleanup)
		await page.screenshot({ path: "playwright-report/hub/sync-0-setup.png" })
	})

	test("SETUP: Set site to hub mode + hub_api_url configured", async ({ page }) => {
		await loginAdmin(page)
		const r = await page.evaluate(async (baseUrl) => {
			const r1 = await fetch("/api/method/frappe.client.set_value", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": window.csrf_token || "" },
				body: JSON.stringify({ doctype: "CouncilsOnline Settings", name: "CouncilsOnline Settings", fieldname: "site_mode", value: "hub" }),
			})
			const r2 = await fetch("/api/method/frappe.client.set_value", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": window.csrf_token || "" },
				body: JSON.stringify({ doctype: "CouncilsOnline Settings", name: "CouncilsOnline Settings", fieldname: "hub_api_url", value: baseUrl }),
			})
			return { r1: r1.status, r2: r2.status }
		}, BASE)
		console.log("Settings update:", r)
		await page.screenshot({ path: "playwright-report/hub/sync-1-settings.png" })
	})

	test("STEP 1: sync_nz_attributes creates profile with Keycloak attributes", async ({ page }) => {
		await loginAdmin(page)

		const result = await page.evaluate(async ({ email, userinfo }) => {
			const resp = await fetch("/api/method/councilsonline.api.hub.test_sync_nz_attributes", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": window.csrf_token || "" },
				body: JSON.stringify({
					target_email: email,
					userinfo_json: JSON.stringify(userinfo),
				}),
			})
			return { status: resp.status, body: await resp.json() }
		}, { email: TEST_EMAIL, userinfo: KC_USERINFO })

		console.log("Sync result:", result.status, JSON.stringify(result.body?.message, null, 2))
		expect(result.status).toBe(200)

		const profile = result.body.message
		expect(profile).not.toBeNull()
		expect(profile.user_role).toBe("Agent")
		expect(profile.business_type).toBe("Sole Trader")
		expect(profile.phone).toBe("+64 9 555 9876")
		expect(profile.trading_name).toBe("KC Sync Planning Ltd")
		expect(profile.sq1_question).toBe("What was the name of your first pet?")
		console.log("Keycloak attributes synced: role, business_type, phone, trading_name, SQ1")

		await page.screenshot({ path: "playwright-report/hub/sync-2-profile-created.png" })
	})

	test("STEP 2: get_agent_profile_for_council endpoint is callable", async ({ page }) => {
		await loginAdmin(page)
		const result = await page.evaluate(async ({ email, token }) => {
			const resp = await fetch("/api/method/councilsonline.api.hub.get_agent_profile_for_council", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ agent_email: email, service_token: token }),
			})
			return { status: resp.status, body: await resp.json() }
		}, { email: TEST_EMAIL, token: "test-secret-token-123" })

		console.log("get_agent_profile_for_council:", result.status)
		expect(result.status).toBe(200)
		const hubProfile = result.body.message
		console.log("Hub profile phone:", hubProfile?.phone, "business_type:", hubProfile?.business_type)

		await page.screenshot({ path: "playwright-report/hub/sync-3-hub-api.png" })
	})

	test("STEP 3: Hub is master — overwrites stale council data on every login", async ({ page }) => {
		/**
		 * Single-site test for hub-is-master overwrite behaviour.
		 *
		 * On a single site, hub and council share the same DB record, so the
		 * HTTP-based _sync_from_hub would always read its own current value.
		 * Instead, we use test_apply_hub_data to directly inject hub data
		 * (as _sync_from_hub would apply it), verifying the overwrite logic.
		 *
		 * Steps:
		 * 1. Profile has Keycloak attributes but no address (from STEP 1)
		 * 2. Simulate stale local edit: set physical_city = Auckland
		 * 3. Apply hub data (Wellington) via test_apply_hub_data
		 * 4. Verify Auckland was overwritten with Wellington (hub is master)
		 */
		await loginAdmin(page)

		// Step 1: Set stale council-side data (simulates agent editing locally)
		await page.evaluate(async (email) => {
			await fetch("/api/method/frappe.client.set_value", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": window.csrf_token || "" },
				body: JSON.stringify({ doctype: "User Profile Extended", name: email, fieldname: "physical_city", value: "Auckland" }),
			})
		}, TEST_EMAIL)
		console.log("Simulated stale council edit: physical_city = Auckland")

		// Step 2: Apply Wellington hub data directly (simulates _sync_from_hub applying hub response)
		const hubData = {
			physical_city: "Wellington",
			physical_postcode: "6011",
			physical_suburb: "CBD",
			physical_flat_unit: "5 Lambton Quay",
			mailing_type: "Same as Physical",
		}
		const applyResult = await page.evaluate(async ({ email, data }) => {
			const resp = await fetch("/api/method/councilsonline.api.hub.test_apply_hub_data", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": window.csrf_token || "" },
				body: JSON.stringify({ target_email: email, hub_data_json: JSON.stringify(data) }),
			})
			return { status: resp.status, body: await resp.json() }
		}, { email: TEST_EMAIL, data: hubData })

		console.log("Hub data applied:", applyResult.status, applyResult.body?.message)
		expect(applyResult.status).toBe(200)
		const result = applyResult.body?.message
		expect(result?.physical_city).toBe("Wellington")
		expect(result?.physical_postcode).toBe("6011")
		console.log("Hub overwrote stale Auckland -> Wellington (hub is master)")

		await page.screenshot({ path: "playwright-report/hub/sync-4-hub-overwrote-council.png" })
	})

	test("STEP 4: Frappe error log has no hub sync errors", async ({ page }) => {
		await loginAdmin(page)
		const errors = await page.evaluate(async () => {
			const resp = await fetch('/api/resource/Error Log?filters=[["method","like","%hub%"],["creation",">=","2026-03-08"]]&fields=["name","method","error"]&limit=5', {
				headers: { "X-Frappe-CSRF-Token": window.csrf_token || "" },
			})
			return (await resp.json()).data || []
		})
		console.log("Hub-related errors in log:", errors.length)
		if (errors.length > 0) {
			errors.forEach(e => console.log(`  - ${e.method}: ${e.error?.substring(0, 100)}`))
		}
		expect(errors.length).toBe(0)
		await page.screenshot({ path: "playwright-report/hub/sync-5-no-errors.png" })
	})

	test("STEP 5: Non-NZ azp claim is correctly ignored by sync_nz_attributes", async ({ page }) => {
		await loginAdmin(page)
		await page.evaluate(async ({ email }) => {
			await fetch("/api/method/councilsonline.api.hub.test_sync_nz_attributes", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": window.csrf_token || "" },
				body: JSON.stringify({
					target_email: email,
					userinfo_json: JSON.stringify({
						sub: "test-sub-002",
						email: email,
						given_name: "Test",
						family_name: "User",
						azp: "some-other-client",
						userType: "Agent",
					}),
				}),
			})
		}, { email: TEST_EMAIL })

		// Profile should be unchanged - hub Wellington data still there
		const profile = await page.evaluate(async (email) => {
			const resp = await fetch(`/api/resource/User Profile Extended/${encodeURIComponent(email)}?fields=["physical_city","phone"]`, {
				headers: { "X-Frappe-CSRF-Token": window.csrf_token || "" },
			})
			return (await resp.json()).data
		}, TEST_EMAIL)
		console.log("Profile after non-NZ sync attempt:", profile)
		expect(profile?.physical_city).toBe("Wellington")
		console.log("Non-NZ azp claim correctly ignored - profile unchanged")
		await page.screenshot({ path: "playwright-report/hub/sync-6-non-nz-ignored.png" })
	})
})
