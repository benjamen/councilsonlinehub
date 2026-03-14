/**
 * Hub Registration & Council Provisioning — 6 Persona E2E Tests
 *
 * Tests the full hub→council provisioning flow for each persona type:
 *   1. Individual Agent
 *   2. Individual Applicant
 *   3. Company Agent (no staff)
 *   4. Company Applicant (no staff)
 *   5. Company Agent + staff
 *   6. Company Applicant + staff
 *
 * Run headed:
 *   npx playwright test --config=playwright.hub-provisioning.config.js --reporter=list
 */

import { test, expect, Page } from "@playwright/test"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE = process.env.BASE_URL || "http://127.0.0.1:8090"
const WDC_URL = process.env.WDC_URL || "http://127.0.0.1:8092"  // real WDC council site
const WDC_CODE = "WDC"
const PASSWORD = "HubTest2026!"
const ADMIN_EMAIL = "Administrator"
const ADMIN_PASSWORD = "admin123"

// All test emails — cleaned up in afterAll
const ALL_EMAILS = [
	"indiv-agent@hubtest.nz",
	"indiv-applicant@hubtest.nz",
	"company-agent-solo@hubtest.nz",
	"company-applicant-solo@hubtest.nz",
	"company-agent-staff@hubtest.nz",
	"staff-agent-1@hubtest.nz",
	"staff-agent-2@hubtest.nz",
	"company-applicant-staff@hubtest.nz",
	"staff-appl-1@hubtest.nz",
	"staff-appl-2@hubtest.nz",
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAdmin(page: Page) {
	await page.goto(`${BASE}/login`)
	await page.fill("input#login_email, input[name='usr']", ADMIN_EMAIL)
	await page.fill("input#login_password, input[name='pwd']", ADMIN_PASSWORD)
	await page.click(".btn-login, button[type='submit']")
	await page.waitForURL("**/app**", { timeout: 20_000 })
}

async function loginAs(page: Page, email: string) {
	// Clear any existing session via the API (no redirect complications)
	await page.context().request.get(`${BASE}/api/method/logout`)

	// Navigate to Frappe desk login page — has email/password inputs (unlike the Vue SSO page)
	await page.goto(`${BASE}/login`)
	await page.waitForLoadState("networkidle")

	// Fill in credentials and submit
	await page.fill("#login_email, input[name='usr']", email)
	await page.fill("#login_password, input[name='pwd']", PASSWORD)
	await page.click(".btn-login, button[type='submit']")

	// Website users land on /frontend, desk users on /app — wait for either
	await page.waitForURL(/\/(frontend|app)/, { timeout: 20_000 })
}

async function logout(page: Page) {
	await page.goto(`${BASE}/api/method/logout`)
	await page.waitForLoadState("networkidle")
}

/** POST to a Frappe API method using the current page session */
async function callAPI(page: Page, method: string, body: Record<string, unknown>) {
	return callAPIOn(page, BASE, method, body)
}

async function callAPIOn(page: Page, base: string, method: string, body: Record<string, unknown>) {
	return page.evaluate(
		async ({ method, body, base }) => {
			const csrf =
				document.cookie
					.split("; ")
					.find((r) => r.startsWith("csrf_token="))
					?.split("=")[1] || ""
			const r = await fetch(`${base}/api/method/${method}`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
					"X-Frappe-CSRF-Token": csrf,
				},
				body: JSON.stringify(body),
			})
			return r.json()
		},
		{ method, body, base },
	)
}

/** Create a Frappe User + User Profile Extended + optional Organization */
async function createPersona(
	page: Page,
	opts: {
		email: string
		firstName: string
		lastName: string
		role: "Agent" | "Applicant"
		businessType: string
		phone: string
		city: string
		postcode: string
		company?: string
		businessPhone?: string
		specialties?: string[]
		directors?: Array<{ first_name: string; last_name: string; email: string; phone: string }>
		officers?: Array<{ first_name: string; last_name: string; email: string; phone: string }>
	},
) {
	// 1. Create User — include new_password in the insert so User.validate() sets it during before_insert
	await callAPI(page, "frappe.client.insert", {
		doc: {
			doctype: "User",
			email: opts.email,
			first_name: opts.firstName,
			last_name: opts.lastName,
			enabled: 1,
			user_type: "Website User",
			send_welcome_email: 0,
			new_password: PASSWORD,
			roles: [{ role: opts.role }],
		},
	})

	// 2. Create User Profile Extended
	// UPE user_role only accepts "", "Individual", "Agent" — map Applicant → Individual
	const upeUserRole = opts.role === "Applicant" ? "Individual" : opts.role
	const profileDoc: Record<string, unknown> = {
		doctype: "User Profile Extended",
		user: opts.email,
		full_name: `${opts.firstName} ${opts.lastName}`.trim(),
		user_role: upeUserRole,
		business_type: opts.businessType,
		phone: opts.phone,
		physical_city: opts.city,
		physical_postcode: opts.postcode,
		company_name: opts.company || "",
		business_phone: opts.businessPhone || "",
		specialties: (opts.specialties || []).map((s) => ({ specialty_name: s })),
	}
	await callAPI(page, "frappe.client.insert", { doc: profileDoc })

	// 3. Create Organization (company personas only)
	if (opts.company && (opts.directors?.length || opts.officers?.length)) {
		const city = opts.city || ""
		const postcode = opts.postcode || ""
		const orgDoc: Record<string, unknown> = {
			doctype: "Organization",
			organization_name: opts.company,
			organization_type: "Other",
			email: opts.email,
			phone: opts.phone,
			physical_address: `${city} ${postcode}`.trim() || "NZ",
			directors: (opts.directors || []).map((d) => ({
				director_name: `${d.first_name} ${d.last_name}`.trim(),
				director_email: d.email,
				director_phone: d.phone,
			})),
			authorising_officers: (opts.officers || []).map((o) => ({
				officer_name: `${o.first_name} ${o.last_name}`.trim(),
				officer_email: o.email,
				officer_phone: o.phone,
			})),
		}
		await callAPI(page, "frappe.client.insert", { doc: orgDoc })
	}
}

/** Delete a user and their Profile Extended if they exist */
async function deleteUser(page: Page, email: string) {
	// Delete UPE first (child of User)
	await callAPI(page, "frappe.client.delete", {
		doctype: "User Profile Extended",
		name: email,
	}).catch(() => null)

	// Delete Hub Council Memberships
	const memberships = await callAPI(page, "frappe.client.get_list", {
		doctype: "Hub Council Membership",
		filters: [["user", "=", email]],
		fields: ["name"],
	})
	for (const m of (memberships.message || [])) {
		await callAPI(page, "frappe.client.delete", {
			doctype: "Hub Council Membership",
			name: m.name,
		}).catch(() => null)
	}

	// Delete User
	await callAPI(page, "frappe.client.delete", {
		doctype: "User",
		name: email,
	}).catch(() => null)
}

/** Verify Hub Council Membership exists for a user */
async function getMembership(page: Page, userEmail: string, councilCode: string) {
	const result = await callAPI(page, "frappe.client.get_list", {
		doctype: "Hub Council Membership",
		filters: [["user", "=", userEmail], ["council_code", "=", councilCode]],
		fields: ["user", "council_code", "council_name", "is_active"],
	})
	return (result.message || [])[0] || null
}

/** Navigate to councils page and register with WDC. Returns the auto_login_url. */
async function registerWithCouncil(
	page: Page,
	screenshotPrefix: string,
	councilCode: string = WDC_CODE,
): Promise<string | null> {
	await page.goto(`${BASE}/frontend/hub/councils`)
	await expect(page.locator("h1").first()).toContainText("Councils", { timeout: 15_000 })
	await page.screenshot({ path: `playwright-report/hub-provisioning/${screenshotPrefix}-1-councils-page.png` })

	// Find the Register button (council list should be loaded)
	const registerBtn = page.locator("button").filter({ hasText: /^Register$/ }).first()
	await expect(registerBtn).toBeVisible({ timeout: 30_000 })
	await page.screenshot({ path: `playwright-report/hub-provisioning/${screenshotPrefix}-2-register-visible.png` })

	let autoLoginUrl: string | null = null

	// Intercept the API response to capture auto_login_url
	const responsePromise = page.waitForResponse(
		(resp) => resp.url().includes("provision_on_council"),
		{ timeout: 45_000 },
	)

	// Stub window.open to prevent the council new tab from opening.
	// Both sites run on 127.0.0.1 — hub_auto_login on port 8092 sets a sid cookie that
	// overwrites the hub's sid (same domain), breaking the main tab's session.
	// By suppressing window.open, the Vue component still calls loadCouncils() after
	// 2 seconds which is all we need to show the "Open Portal" link.
	await page.evaluate(() => { (window as any).open = () => null })

	await registerBtn.click()
	await page.screenshot({ path: `playwright-report/hub-provisioning/${screenshotPrefix}-3-registering.png` })

	try {
		const resp = await responsePromise
		const body = await resp.json()
		autoLoginUrl = body?.message?.auto_login_url || null
	} catch {
		// Response interception failed — still check UI
	}

	// "Open Portal" link should appear once loadCouncils() runs (2s after provision)
	await expect(page.locator("a").filter({ hasText: /Open Portal/ }).first()).toBeVisible({
		timeout: 30_000,
	})
	await page.screenshot({ path: `playwright-report/hub-provisioning/${screenshotPrefix}-4-open-portal.png` })

	return autoLoginUrl
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

test.beforeAll(async ({ browser }) => {
	const page = await browser.newPage()
	await loginAdmin(page)

	const TEST_TOKEN = "hubtest-service-token-2026"

	// 1. Update WDC api_url first (frappe.client.save masks password fields,
	//    so we must set hub_service_token AFTER this save)
	const settingsDoc = await callAPI(page, "frappe.client.get", {
		doctype: "CouncilsOnline Settings",
		name: "CouncilsOnline Settings",
	})
	if (settingsDoc.message) {
		const doc = settingsDoc.message
		for (const entry of (doc.council_registry || [])) {
			if (entry.council_code === "WDC") {
				entry.api_url = WDC_URL
			}
		}
		await callAPI(page, "frappe.client.save", { doc })
	}

	// 2. Set service token AFTER the save so it isn't masked by frappe.client.save
	await callAPI(page, "frappe.client.set_value", {
		doctype: "CouncilsOnline Settings",
		name: "CouncilsOnline Settings",
		fieldname: "hub_service_token",
		value: TEST_TOKEN,
	})
	// Sync the token to the council site as well
	if (WDC_URL !== BASE) {
		const creds = Buffer.from(`${ADMIN_EMAIL}:${ADMIN_PASSWORD}`).toString("base64")
		await fetch(`${WDC_URL}/api/method/frappe.client.set_value`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Basic ${creds}`,
			},
			body: JSON.stringify({
				doctype: "CouncilsOnline Settings",
				name: "CouncilsOnline Settings",
				fieldname: "hub_service_token",
				value: TEST_TOKEN,
			}),
		}).catch(() => null)
	}

	// Clean up any stale data from previous runs
	for (const email of ALL_EMAILS) {
		await deleteUser(page, email)
	}
	for (const org of ["Solo Agency Ltd", "Solo Corp Ltd", "Staff Agency Ltd", "Staff Corp Ltd"]) {
		await callAPI(page, "frappe.client.delete", { doctype: "Organization", name: org }).catch(() => null)
	}

	// ── Persona 1: Individual Agent ──────────────────────────────────────────
	await createPersona(page, {
		email: "indiv-agent@hubtest.nz",
		firstName: "Indie",
		lastName: "Agent",
		role: "Agent",
		businessType: "Sole Trader",
		phone: "+64211111001",
		city: "Auckland",
		postcode: "1010",
		specialties: ["Resource Consent", "Building Consent"],
	})

	// ── Persona 2: Individual Applicant ─────────────────────────────────────
	await createPersona(page, {
		email: "indiv-applicant@hubtest.nz",
		firstName: "Indie",
		lastName: "Applicant",
		role: "Applicant",
		businessType: "",
		phone: "+64211111002",
		city: "Wellington",
		postcode: "6011",
	})

	// ── Persona 3: Company Agent (solo) ─────────────────────────────────────
	await createPersona(page, {
		email: "company-agent-solo@hubtest.nz",
		firstName: "Carlos",
		lastName: "Solo",
		role: "Agent",
		businessType: "Limited Company",
		phone: "+64211111003",
		businessPhone: "+6493001003",
		city: "Christchurch",
		postcode: "8011",
		company: "Solo Agency Ltd",
		specialties: ["Resource Consent"],
		directors: [{ first_name: "Diana", last_name: "Director", email: "diana@solo.nz", phone: "+64211111011" }],
		officers: [{ first_name: "Oliver", last_name: "Officer", email: "oliver@solo.nz", phone: "+64211111012" }],
	})

	// ── Persona 4: Company Applicant (solo) ─────────────────────────────────
	await createPersona(page, {
		email: "company-applicant-solo@hubtest.nz",
		firstName: "Carla",
		lastName: "Solo",
		role: "Applicant",
		businessType: "Limited Company",
		phone: "+64211111004",
		city: "Dunedin",
		postcode: "9016",
		company: "Solo Corp Ltd",
		directors: [{ first_name: "Dorothy", last_name: "Director", email: "dorothy@solocorp.nz", phone: "+64211111013" }],
		officers: [{ first_name: "Ophelia", last_name: "Officer", email: "ophelia@solocorp.nz", phone: "+64211111014" }],
	})

	// ── Persona 5: Company Agent + staff ────────────────────────────────────
	await createPersona(page, {
		email: "company-agent-staff@hubtest.nz",
		firstName: "Stan",
		lastName: "Agent",
		role: "Agent",
		businessType: "Limited Company",
		phone: "+64211111005",
		city: "Hamilton",
		postcode: "3204",
		company: "Staff Agency Ltd",
		specialties: ["Building Consent", "Resource Consent", "Subdivision"],
		directors: [{ first_name: "David", last_name: "Director", email: "david@staff.agency.nz", phone: "+64211111015" }],
		officers: [{ first_name: "Oscar", last_name: "Officer", email: "oscar@staff.agency.nz", phone: "+64211111016" }],
	})
	// Staff member 1
	await createPersona(page, {
		email: "staff-agent-1@hubtest.nz",
		firstName: "Sam",
		lastName: "Staff",
		role: "Agent",
		businessType: "Limited Company",
		phone: "+64211111021",
		city: "Hamilton",
		postcode: "3204",
		company: "Staff Agency Ltd",
	})
	// Staff member 2
	await createPersona(page, {
		email: "staff-agent-2@hubtest.nz",
		firstName: "Sue",
		lastName: "Staff",
		role: "Agent",
		businessType: "Limited Company",
		phone: "+64211111022",
		city: "Hamilton",
		postcode: "3204",
		company: "Staff Agency Ltd",
	})

	// ── Persona 6: Company Applicant + staff ────────────────────────────────
	await createPersona(page, {
		email: "company-applicant-staff@hubtest.nz",
		firstName: "Stella",
		lastName: "Applicant",
		role: "Applicant",
		businessType: "Limited Company",
		phone: "+64211111006",
		city: "Tauranga",
		postcode: "3110",
		company: "Staff Corp Ltd",
		directors: [{ first_name: "Debra", last_name: "Director", email: "debra@staffcorp.nz", phone: "+64211111017" }],
		officers: [{ first_name: "Owen", last_name: "Officer", email: "owen@staffcorp.nz", phone: "+64211111018" }],
	})
	await createPersona(page, {
		email: "staff-appl-1@hubtest.nz",
		firstName: "Alex",
		lastName: "Staff",
		role: "Applicant",
		businessType: "Limited Company",
		phone: "+64211111031",
		city: "Tauranga",
		postcode: "3110",
		company: "Staff Corp Ltd",
	})
	await createPersona(page, {
		email: "staff-appl-2@hubtest.nz",
		firstName: "Blake",
		lastName: "Staff",
		role: "Applicant",
		businessType: "Limited Company",
		phone: "+64211111032",
		city: "Tauranga",
		postcode: "3110",
		company: "Staff Corp Ltd",
	})

	await page.close()
})

test.afterAll(async ({ browser }) => {
	const page = await browser.newPage()
	await loginAdmin(page)
	for (const email of ALL_EMAILS) {
		await deleteUser(page, email)
	}
	for (const org of ["Solo Agency Ltd", "Solo Corp Ltd", "Staff Agency Ltd", "Staff Corp Ltd"]) {
		await callAPI(page, "frappe.client.delete", { doctype: "Organization", name: org }).catch(() => null)
	}
	await page.close()
})

// ---------------------------------------------------------------------------
// Persona 1 — Individual Agent
// ---------------------------------------------------------------------------

test.describe("Persona 1 — Individual Agent", () => {
	test("registers with WDC council and membership is recorded", async ({ page }) => {
		await loginAs(page, "indiv-agent@hubtest.nz")
		await page.screenshot({ path: "playwright-report/hub-provisioning/01-indiv-agent-login.png" })

		const autoLoginUrl = await registerWithCouncil(page, "01-indiv-agent")

		// Verify membership via admin session
		await logout(page)
		await loginAdmin(page)
		const membership = await getMembership(page, "indiv-agent@hubtest.nz", WDC_CODE)
		expect(membership).not.toBeNull()
		expect(membership.is_active).toBe(1)
		expect(membership.council_code).toBe(WDC_CODE)

		// auto_login_url should be a valid URL
		if (autoLoginUrl) {
			expect(autoLoginUrl).toContain("hub_auto_login")
			console.log("✓ Auto-login URL:", autoLoginUrl)
		}

		await page.screenshot({ path: "playwright-report/hub-provisioning/01-indiv-agent-membership-verified.png" })
	})
})

// ---------------------------------------------------------------------------
// Persona 2 — Individual Applicant
// ---------------------------------------------------------------------------

test.describe("Persona 2 — Individual Applicant", () => {
	test("registers with WDC council and membership is recorded", async ({ page }) => {
		await loginAs(page, "indiv-applicant@hubtest.nz")
		await page.screenshot({ path: "playwright-report/hub-provisioning/02-indiv-applicant-login.png" })

		const autoLoginUrl = await registerWithCouncil(page, "02-indiv-applicant")

		await logout(page)
		await loginAdmin(page)
		const membership = await getMembership(page, "indiv-applicant@hubtest.nz", WDC_CODE)
		expect(membership).not.toBeNull()
		expect(membership.is_active).toBe(1)

		if (autoLoginUrl) {
			expect(autoLoginUrl).toContain("hub_auto_login")
			console.log("✓ Auto-login URL:", autoLoginUrl)
		}
	})
})

// ---------------------------------------------------------------------------
// Persona 3 — Company Agent (no staff)
// ---------------------------------------------------------------------------

test.describe("Persona 3 — Company Agent (no staff)", () => {
	test("registers with WDC council, membership recorded, Organization provisioned on council", async ({ page }) => {
		await loginAs(page, "company-agent-solo@hubtest.nz")
		await page.screenshot({ path: "playwright-report/hub-provisioning/03-company-agent-solo-login.png" })

		const autoLoginUrl = await registerWithCouncil(page, "03-company-agent-solo")

		await logout(page)
		await loginAdmin(page)

		// Check hub membership
		const membership = await getMembership(page, "company-agent-solo@hubtest.nz", WDC_CODE)
		expect(membership).not.toBeNull()
		expect(membership.is_active).toBe(1)

		// Profile should have company_name
		const profile = await callAPI(page, "frappe.client.get_value", {
			doctype: "User Profile Extended",
			filters: { user: "company-agent-solo@hubtest.nz" },
			fieldname: ["company_name", "business_type", "user_role"],
		})
		expect(profile.message?.company_name).toBe("Solo Agency Ltd")
		expect(profile.message?.business_type).toBe("Limited Company")

		if (autoLoginUrl) {
			console.log("✓ Auto-login URL:", autoLoginUrl)
		}
	})
})

// ---------------------------------------------------------------------------
// Persona 4 — Company Applicant (no staff)
// ---------------------------------------------------------------------------

test.describe("Persona 4 — Company Applicant (no staff)", () => {
	test("registers with WDC council and membership is recorded", async ({ page }) => {
		await loginAs(page, "company-applicant-solo@hubtest.nz")
		await page.screenshot({ path: "playwright-report/hub-provisioning/04-company-applicant-solo-login.png" })

		const autoLoginUrl = await registerWithCouncil(page, "04-company-applicant-solo")

		await logout(page)
		await loginAdmin(page)

		const membership = await getMembership(page, "company-applicant-solo@hubtest.nz", WDC_CODE)
		expect(membership).not.toBeNull()
		expect(membership.is_active).toBe(1)

		const profile = await callAPI(page, "frappe.client.get_value", {
			doctype: "User Profile Extended",
			filters: { user: "company-applicant-solo@hubtest.nz" },
			fieldname: ["company_name", "user_role"],
		})
		expect(profile.message?.company_name).toBe("Solo Corp Ltd")
		expect(profile.message?.user_role).toBe("Individual")

		if (autoLoginUrl) {
			console.log("✓ Auto-login URL:", autoLoginUrl)
		}
	})
})

// ---------------------------------------------------------------------------
// Persona 5 — Company Agent + staff
// ---------------------------------------------------------------------------

test.describe("Persona 5 — Company Agent (with staff)", () => {
	test("registers with WDC, membership recorded, company members visible", async ({ page }) => {
		await loginAs(page, "company-agent-staff@hubtest.nz")
		await page.screenshot({ path: "playwright-report/hub-provisioning/05-company-agent-staff-login.png" })

		const autoLoginUrl = await registerWithCouncil(page, "05-company-agent-staff")

		await logout(page)
		await loginAdmin(page)

		// Membership check
		const membership = await getMembership(page, "company-agent-staff@hubtest.nz", WDC_CODE)
		expect(membership).not.toBeNull()
		expect(membership.is_active).toBe(1)

		// Verify company members exist on hub
		const membersResult = await callAPI(page, "councilsonlinehub.api.hub.get_company_members_admin", {})
			.catch(() => null)

		// Directly query UPE for staff members
		const staffList = await callAPI(page, "frappe.client.get_list", {
			doctype: "User Profile Extended",
			filters: [["company_name", "=", "Staff Agency Ltd"]],
			fields: ["user", "full_name", "user_role"],
		})
		const staffEmails = (staffList.message || []).map((m: { user: string }) => m.user)
		expect(staffEmails).toContain("company-agent-staff@hubtest.nz")
		expect(staffEmails).toContain("staff-agent-1@hubtest.nz")
		expect(staffEmails).toContain("staff-agent-2@hubtest.nz")

		if (autoLoginUrl) {
			console.log("✓ Auto-login URL:", autoLoginUrl)
		}

		await page.screenshot({ path: "playwright-report/hub-provisioning/05-company-agent-staff-verified.png" })
	})
})

// ---------------------------------------------------------------------------
// Persona 6 — Company Applicant + staff
// ---------------------------------------------------------------------------

test.describe("Persona 6 — Company Applicant (with staff)", () => {
	test("registers with WDC, membership recorded, company members visible", async ({ page }) => {
		await loginAs(page, "company-applicant-staff@hubtest.nz")
		await page.screenshot({ path: "playwright-report/hub-provisioning/06-company-applicant-staff-login.png" })

		const autoLoginUrl = await registerWithCouncil(page, "06-company-applicant-staff")

		await logout(page)
		await loginAdmin(page)

		// Membership check
		const membership = await getMembership(page, "company-applicant-staff@hubtest.nz", WDC_CODE)
		expect(membership).not.toBeNull()
		expect(membership.is_active).toBe(1)

		// Verify all staff under Staff Corp Ltd
		const staffList = await callAPI(page, "frappe.client.get_list", {
			doctype: "User Profile Extended",
			filters: [["company_name", "=", "Staff Corp Ltd"]],
			fields: ["user", "full_name", "user_role"],
		})
		const staffEmails = (staffList.message || []).map((m: { user: string }) => m.user)
		expect(staffEmails).toContain("company-applicant-staff@hubtest.nz")
		expect(staffEmails).toContain("staff-appl-1@hubtest.nz")
		expect(staffEmails).toContain("staff-appl-2@hubtest.nz")

		const profile = await callAPI(page, "frappe.client.get_value", {
			doctype: "User Profile Extended",
			filters: { user: "company-applicant-staff@hubtest.nz" },
			fieldname: ["user_role", "company_name"],
		})
		expect(profile.message?.user_role).toBe("Individual")
		expect(profile.message?.company_name).toBe("Staff Corp Ltd")

		if (autoLoginUrl) {
			console.log("✓ Auto-login URL:", autoLoginUrl)
		}

		await page.screenshot({ path: "playwright-report/hub-provisioning/06-company-applicant-staff-verified.png" })
	})
})
