/**
 * Hub Profile Updates — E2E Tests (all 6 personas)
 *
 * Verifies that updates to profiles, organisations and accounts:
 *   1. Persist on the hub (save_hub_profile)
 *   2. Flow to the council on re-provision (provision_on_council)
 *
 * Uses "upd-" prefix on all test emails to avoid clashing with
 * the provisioning suite if both are run in the same session.
 *
 * Run:
 *   npx playwright test --config=playwright.hub-profile-updates.config.js --reporter=list
 */

import { test, expect, Page } from "@playwright/test"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE = process.env.BASE_URL || "http://127.0.0.1:8090"
const WDC_CODE = "WDC"
const PASSWORD = "HubUpd2026!"
const ADMIN_EMAIL = "Administrator"
const ADMIN_PASSWORD = "admin123"

const ALL_EMAILS = [
	"upd-indiv-agent@hubtest.nz",
	"upd-indiv-applicant@hubtest.nz",
	"upd-company-agent-solo@hubtest.nz",
	"upd-company-applicant-solo@hubtest.nz",
	"upd-company-agent-staff@hubtest.nz",
	"upd-staff-agent-1@hubtest.nz",
	"upd-staff-agent-2@hubtest.nz",
	"upd-company-applicant-staff@hubtest.nz",
	"upd-staff-appl-1@hubtest.nz",
	"upd-staff-appl-2@hubtest.nz",
]

const ALL_ORGS = [
	"Upd Agency Ltd",
	"Upd Corp Ltd",
	"Upd Staff Agency Ltd",
	"Upd Staff Corp Ltd",
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
	await page.goto(`${BASE}/login`)
	await page.fill("input#login_email, input[name='usr']", email)
	await page.fill("input#login_password, input[name='pwd']", PASSWORD)
	await page.click(".btn-login, button[type='submit']")
	await page.waitForURL(/\/(frontend|app)/, { timeout: 20_000 })
}

async function logout(page: Page) {
	await page.goto(`${BASE}/api/method/logout`)
	await page.waitForLoadState("networkidle")
}

async function callAPI(page: Page, method: string, body: Record<string, unknown>) {
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
		{ method, body, base: BASE },
	)
}

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
		specialties?: string[]
		directors?: Array<{ first_name: string; last_name: string; email: string; phone: string }>
		officers?: Array<{ first_name: string; last_name: string; email: string; phone: string }>
	},
) {
	// User
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

	// User Profile Extended
	const upeUserRole = opts.role === "Applicant" ? "Individual" : opts.role
	await callAPI(page, "frappe.client.insert", {
		doc: {
			doctype: "User Profile Extended",
			user: opts.email,
			full_name: `${opts.firstName} ${opts.lastName}`.trim(),
			user_role: upeUserRole,
			business_type: opts.businessType,
			phone: opts.phone,
			physical_city: opts.city,
			physical_postcode: opts.postcode,
			company_name: opts.company || "",
			specialties: (opts.specialties || []).map((s) => ({ specialty_name: s })),
		},
	})

	// Organization (company personas)
	if (opts.company && (opts.directors?.length || opts.officers?.length)) {
		await callAPI(page, "frappe.client.insert", {
			doc: {
				doctype: "Organization",
				organization_name: opts.company,
				organization_type: "Other",
				email: opts.email,
				phone: opts.phone,
				physical_address: `${opts.city} ${opts.postcode}`.trim() || "NZ",
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
			},
		})
	}
}

async function deleteUser(page: Page, email: string) {
	await callAPI(page, "frappe.client.delete", {
		doctype: "User Profile Extended",
		name: email,
	}).catch(() => null)

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

	await callAPI(page, "frappe.client.delete", {
		doctype: "User",
		name: email,
	}).catch(() => null)
}

/** Call provision_on_council as the currently-logged-in user via API */
async function provisionOnCouncil(page: Page, councilCode: string = WDC_CODE) {
	const result = await callAPI(page, "councilsonlinehub.api.hub.provision_on_council", {
		council_code: councilCode,
	})
	return result
}

/** Call save_hub_profile as the currently-logged-in user */
async function saveHubProfile(page: Page, updates: Record<string, unknown>) {
	return callAPI(page, "councilsonlinehub.api.hub.save_hub_profile", updates)
}

/** Read UPE fields as admin */
async function getUPE(page: Page, email: string, fields: string[]) {
	const result = await callAPI(page, "frappe.client.get_value", {
		doctype: "User Profile Extended",
		filters: { user: email },
		fieldname: fields,
	})
	return result.message || {}
}

/** Read specialties for a user by reading the parent UPE document */
async function getSpecialties(page: Page, email: string): Promise<string[]> {
	const result = await callAPI(page, "frappe.client.get", {
		doctype: "User Profile Extended",
		name: email,
	})
	const specialties = result.message?.specialties || []
	return specialties.map((s: { specialty_name: string }) => s.specialty_name)
}

/** Read Organization directors */
async function getOrgDirectors(page: Page, orgName: string) {
	const result = await callAPI(page, "frappe.client.get", {
		doctype: "Organization",
		name: orgName,
	})
	return (result.message?.directors || []) as Array<{ director_name: string; director_email: string }>
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

test.beforeAll(async ({ browser }) => {
	const page = await browser.newPage()
	await loginAdmin(page)

	// Ensure hub settings are configured (same as provisioning spec)
	const TEST_TOKEN = "hubtest-service-token-2026"
	await callAPI(page, "frappe.client.set_value", {
		doctype: "CouncilsOnline Settings",
		name: "CouncilsOnline Settings",
		fieldname: "hub_service_token",
		value: TEST_TOKEN,
	})
	const settingsDoc = await callAPI(page, "frappe.client.get", {
		doctype: "CouncilsOnline Settings",
		name: "CouncilsOnline Settings",
	})
	if (settingsDoc.message) {
		const doc = settingsDoc.message
		for (const entry of (doc.council_registry || [])) {
			if (entry.council_code === "WDC") {
				entry.api_url = BASE
			}
		}
		await callAPI(page, "frappe.client.save", { doc })
	}

	// Clean up stale data
	for (const email of ALL_EMAILS) {
		await deleteUser(page, email)
	}
	for (const org of ALL_ORGS) {
		await callAPI(page, "frappe.client.delete", { doctype: "Organization", name: org }).catch(() => null)
	}

	// ── Persona 1: Individual Agent ──────────────────────────────────────────
	await createPersona(page, {
		email: "upd-indiv-agent@hubtest.nz",
		firstName: "Indie",
		lastName: "Agent",
		role: "Agent",
		businessType: "Sole Trader",
		phone: "+64211112001",
		city: "Auckland",
		postcode: "1010",
		specialties: ["Resource Consent", "Building Consent"],
	})

	// ── Persona 2: Individual Applicant ─────────────────────────────────────
	await createPersona(page, {
		email: "upd-indiv-applicant@hubtest.nz",
		firstName: "Indie",
		lastName: "Applicant",
		role: "Applicant",
		businessType: "Individual",
		phone: "+64211112002",
		city: "Wellington",
		postcode: "6011",
	})

	// ── Persona 3: Company Agent (solo) ─────────────────────────────────────
	await createPersona(page, {
		email: "upd-company-agent-solo@hubtest.nz",
		firstName: "Carlos",
		lastName: "Solo",
		role: "Agent",
		businessType: "Limited Company",
		phone: "+64211112003",
		city: "Christchurch",
		postcode: "8011",
		company: "Upd Agency Ltd",
		specialties: ["Resource Consent"],
		directors: [{ first_name: "Diana", last_name: "Director", email: "diana@upd-solo.nz", phone: "+64211112011" }],
		officers: [{ first_name: "Oliver", last_name: "Officer", email: "oliver@upd-solo.nz", phone: "+64211112012" }],
	})

	// ── Persona 4: Company Applicant (solo) ─────────────────────────────────
	await createPersona(page, {
		email: "upd-company-applicant-solo@hubtest.nz",
		firstName: "Carla",
		lastName: "Solo",
		role: "Applicant",
		businessType: "Limited Company",
		phone: "+64211112004",
		city: "Dunedin",
		postcode: "9016",
		company: "Upd Corp Ltd",
		directors: [{ first_name: "Dorothy", last_name: "Director", email: "dorothy@upd-corp.nz", phone: "+64211112013" }],
		officers: [{ first_name: "Ophelia", last_name: "Officer", email: "ophelia@upd-corp.nz", phone: "+64211112014" }],
	})

	// ── Persona 5: Company Agent + staff ────────────────────────────────────
	await createPersona(page, {
		email: "upd-company-agent-staff@hubtest.nz",
		firstName: "Stan",
		lastName: "Agent",
		role: "Agent",
		businessType: "Limited Company",
		phone: "+64211112005",
		city: "Hamilton",
		postcode: "3204",
		company: "Upd Staff Agency Ltd",
		specialties: ["Building Consent", "Resource Consent"],
		directors: [{ first_name: "David", last_name: "Director", email: "david@upd-staff.nz", phone: "+64211112015" }],
		officers: [{ first_name: "Oscar", last_name: "Officer", email: "oscar@upd-staff.nz", phone: "+64211112016" }],
	})
	await createPersona(page, {
		email: "upd-staff-agent-1@hubtest.nz",
		firstName: "Sam",
		lastName: "Staff",
		role: "Agent",
		businessType: "Limited Company",
		phone: "+64211112021",
		city: "Hamilton",
		postcode: "3204",
		company: "Upd Staff Agency Ltd",
	})
	await createPersona(page, {
		email: "upd-staff-agent-2@hubtest.nz",
		firstName: "Sue",
		lastName: "Staff",
		role: "Agent",
		businessType: "Limited Company",
		phone: "+64211112022",
		city: "Hamilton",
		postcode: "3204",
		company: "Upd Staff Agency Ltd",
	})

	// ── Persona 6: Company Applicant + staff ────────────────────────────────
	await createPersona(page, {
		email: "upd-company-applicant-staff@hubtest.nz",
		firstName: "Stella",
		lastName: "Applicant",
		role: "Applicant",
		businessType: "Limited Company",
		phone: "+64211112006",
		city: "Tauranga",
		postcode: "3110",
		company: "Upd Staff Corp Ltd",
		directors: [{ first_name: "Debra", last_name: "Director", email: "debra@upd-staffcorp.nz", phone: "+64211112017" }],
		officers: [{ first_name: "Owen", last_name: "Officer", email: "owen@upd-staffcorp.nz", phone: "+64211112018" }],
	})
	await createPersona(page, {
		email: "upd-staff-appl-1@hubtest.nz",
		firstName: "Alex",
		lastName: "Staff",
		role: "Applicant",
		businessType: "Limited Company",
		phone: "+64211112031",
		city: "Tauranga",
		postcode: "3110",
		company: "Upd Staff Corp Ltd",
	})
	await createPersona(page, {
		email: "upd-staff-appl-2@hubtest.nz",
		firstName: "Blake",
		lastName: "Staff",
		role: "Applicant",
		businessType: "Limited Company",
		phone: "+64211112032",
		city: "Tauranga",
		postcode: "3110",
		company: "Upd Staff Corp Ltd",
	})

	await page.close()
})

test.afterAll(async ({ browser }) => {
	const page = await browser.newPage()
	await loginAdmin(page)
	for (const email of ALL_EMAILS) {
		await deleteUser(page, email)
	}
	for (const org of ALL_ORGS) {
		await callAPI(page, "frappe.client.delete", { doctype: "Organization", name: org }).catch(() => null)
	}
	await page.close()
})

// ---------------------------------------------------------------------------
// Persona 1 — Individual Agent
// ---------------------------------------------------------------------------

test.describe("Persona 1 — Individual Agent: profile update flows to council", () => {
	test("phone + city + specialties update via save_hub_profile, re-provision propagates changes", async ({ page }) => {
		const EMAIL = "upd-indiv-agent@hubtest.nz"

		// Initial provision so membership exists
		await loginAs(page, EMAIL)
		const initResult = await provisionOnCouncil(page)
		expect(initResult.message?.success).toBe(true)
		await page.screenshot({ path: "playwright-report/hub-updates/01-agent-initial-provision.png" })

		// Update profile: new phone, city, postcode, and replaced specialties
		const updateResult = await saveHubProfile(page, {
			phone: "+64211119001",
			physical_city: "Napier",
			physical_postcode: "4110",
			specialties: ["Subdivision"],
		})
		expect(updateResult.message?.status).toBe("ok")
		await page.screenshot({ path: "playwright-report/hub-updates/01-agent-profile-saved.png" })

		// Re-provision to push updated data to council
		const reprovisionResult = await provisionOnCouncil(page)
		expect(reprovisionResult.message?.success).toBe(true)
		await page.screenshot({ path: "playwright-report/hub-updates/01-agent-reprovisioned.png" })

		// Verify as admin
		await logout(page)
		await loginAdmin(page)

		// UPE should reflect updated city, postcode, phone
		const upe = await getUPE(page, EMAIL, ["phone", "physical_city", "physical_postcode"])
		expect(upe.phone).toBe("+64211119001")
		expect(upe.physical_city).toBe("Napier")
		expect(upe.physical_postcode).toBe("4110")

		// Specialties should be replaced (not appended)
		const specialties = await getSpecialties(page, EMAIL)
		expect(specialties).toContain("Subdivision")
		expect(specialties).not.toContain("Resource Consent")
		expect(specialties).not.toContain("Building Consent")
		expect(specialties).toHaveLength(1)

		// Membership still active after re-provision
		const memberships = await callAPI(page, "frappe.client.get_list", {
			doctype: "Hub Council Membership",
			filters: [["user", "=", EMAIL], ["council_code", "=", WDC_CODE]],
			fields: ["is_active"],
		})
		expect((memberships.message || [])[0]?.is_active).toBe(1)

		await page.screenshot({ path: "playwright-report/hub-updates/01-agent-verified.png" })
	})
})

// ---------------------------------------------------------------------------
// Persona 2 — Individual Applicant
// ---------------------------------------------------------------------------

test.describe("Persona 2 — Individual Applicant: profile update flows to council", () => {
	test("phone + city update via save_hub_profile, re-provision propagates changes", async ({ page }) => {
		const EMAIL = "upd-indiv-applicant@hubtest.nz"

		await loginAs(page, EMAIL)
		const initResult = await provisionOnCouncil(page)
		expect(initResult.message?.success).toBe(true)

		// Update profile
		const updateResult = await saveHubProfile(page, {
			phone: "+64211119002",
			physical_city: "Palmerston North",
			physical_postcode: "4410",
			specialties: [],  // Applicants have no specialties — ensure empty list doesn't break
		})
		expect(updateResult.message?.status).toBe("ok")
		await page.screenshot({ path: "playwright-report/hub-updates/02-applicant-profile-saved.png" })

		// Re-provision
		const reprovisionResult = await provisionOnCouncil(page)
		expect(reprovisionResult.message?.success).toBe(true)

		await logout(page)
		await loginAdmin(page)

		const upe = await getUPE(page, EMAIL, ["phone", "physical_city", "physical_postcode", "user_role"])
		expect(upe.phone).toBe("+64211119002")
		expect(upe.physical_city).toBe("Palmerston North")
		expect(upe.physical_postcode).toBe("4410")
		// user_role should remain Individual (Applicant maps to Individual)
		expect(upe.user_role).toBe("Individual")

		// Membership still active
		const memberships = await callAPI(page, "frappe.client.get_list", {
			doctype: "Hub Council Membership",
			filters: [["user", "=", EMAIL], ["council_code", "=", WDC_CODE]],
			fields: ["is_active"],
		})
		expect((memberships.message || [])[0]?.is_active).toBe(1)

		await page.screenshot({ path: "playwright-report/hub-updates/02-applicant-verified.png" })
	})
})

// ---------------------------------------------------------------------------
// Persona 3 — Company Agent (solo)
// ---------------------------------------------------------------------------

test.describe("Persona 3 — Company Agent (solo): profile + director update flows to council", () => {
	test("phone + specialties + director update, re-provision propagates profile changes", async ({ page }) => {
		const EMAIL = "upd-company-agent-solo@hubtest.nz"
		const ORG = "Upd Agency Ltd"

		await loginAs(page, EMAIL)
		const initResult = await provisionOnCouncil(page)
		expect(initResult.message?.success).toBe(true)
		await page.screenshot({ path: "playwright-report/hub-updates/03-company-agent-initial-provision.png" })

		// Update phone, city, specialties, and director
		const updateResult = await saveHubProfile(page, {
			phone: "+64211119003",
			physical_city: "Rotorua",
			physical_postcode: "3010",
			specialties: ["Resource Consent", "Subdivision"],
			directors: [
				{
					first_name: "Diana",
					last_name: "Updated",
					email: "diana-upd@upd-solo.nz",
					phone: "+64211119011",
				},
			],
		})
		expect(updateResult.message?.status).toBe("ok")
		await page.screenshot({ path: "playwright-report/hub-updates/03-company-agent-profile-saved.png" })

		// Re-provision
		const reprovisionResult = await provisionOnCouncil(page)
		expect(reprovisionResult.message?.success).toBe(true)
		await page.screenshot({ path: "playwright-report/hub-updates/03-company-agent-reprovisioned.png" })

		await logout(page)
		await loginAdmin(page)

		// UPE updated on council
		const upe = await getUPE(page, EMAIL, ["phone", "physical_city", "physical_postcode", "company_name"])
		expect(upe.phone).toBe("+64211119003")
		expect(upe.physical_city).toBe("Rotorua")
		expect(upe.physical_postcode).toBe("3010")
		expect(upe.company_name).toBe(ORG)

		// Specialties replaced
		const specialties = await getSpecialties(page, EMAIL)
		expect(specialties).toContain("Resource Consent")
		expect(specialties).toContain("Subdivision")
		expect(specialties).not.toContain("Building Consent")
		expect(specialties).toHaveLength(2)

		// Organization still exists on council with updated director
		const directors = await getOrgDirectors(page, ORG)
		expect(directors.length).toBeGreaterThan(0)
		// Director name updated via save_hub_profile → _save_directors
		const directorNames = directors.map((d) => d.director_name)
		expect(directorNames.some((n) => n.includes("Updated"))).toBe(true)

		// Membership still active
		const memberships = await callAPI(page, "frappe.client.get_list", {
			doctype: "Hub Council Membership",
			filters: [["user", "=", EMAIL], ["council_code", "=", WDC_CODE]],
			fields: ["is_active"],
		})
		expect((memberships.message || [])[0]?.is_active).toBe(1)

		await page.screenshot({ path: "playwright-report/hub-updates/03-company-agent-verified.png" })
	})
})

// ---------------------------------------------------------------------------
// Persona 4 — Company Applicant (solo)
// ---------------------------------------------------------------------------

test.describe("Persona 4 — Company Applicant (solo): profile update flows to council", () => {
	test("phone + city update, re-provision propagates changes, org remains intact", async ({ page }) => {
		const EMAIL = "upd-company-applicant-solo@hubtest.nz"
		const ORG = "Upd Corp Ltd"

		await loginAs(page, EMAIL)
		const initResult = await provisionOnCouncil(page)
		expect(initResult.message?.success).toBe(true)

		const updateResult = await saveHubProfile(page, {
			phone: "+64211119004",
			physical_city: "Nelson",
			physical_postcode: "7010",
			specialties: [],  // Applicant — no specialties
		})
		expect(updateResult.message?.status).toBe("ok")
		await page.screenshot({ path: "playwright-report/hub-updates/04-company-applicant-profile-saved.png" })

		const reprovisionResult = await provisionOnCouncil(page)
		expect(reprovisionResult.message?.success).toBe(true)

		await logout(page)
		await loginAdmin(page)

		const upe = await getUPE(page, EMAIL, ["phone", "physical_city", "physical_postcode", "user_role", "company_name"])
		expect(upe.phone).toBe("+64211119004")
		expect(upe.physical_city).toBe("Nelson")
		expect(upe.physical_postcode).toBe("7010")
		expect(upe.user_role).toBe("Individual")
		expect(upe.company_name).toBe(ORG)

		// Organization still exists after profile update + re-provision
		const orgExists = await callAPI(page, "frappe.client.get_value", {
			doctype: "Organization",
			filters: { organization_name: ORG },
			fieldname: ["organization_name"],
		})
		expect(orgExists.message?.organization_name).toBe(ORG)

		// Membership still active
		const memberships = await callAPI(page, "frappe.client.get_list", {
			doctype: "Hub Council Membership",
			filters: [["user", "=", EMAIL], ["council_code", "=", WDC_CODE]],
			fields: ["is_active"],
		})
		expect((memberships.message || [])[0]?.is_active).toBe(1)

		await page.screenshot({ path: "playwright-report/hub-updates/04-company-applicant-verified.png" })
	})
})

// ---------------------------------------------------------------------------
// Persona 5 — Company Agent + staff
// ---------------------------------------------------------------------------

test.describe("Persona 5 — Company Agent (with staff): profile update + staff membership unchanged", () => {
	test("primary user profile updates, re-provision keeps all staff under company", async ({ page }) => {
		const EMAIL = "upd-company-agent-staff@hubtest.nz"
		const ORG = "Upd Staff Agency Ltd"

		await loginAs(page, EMAIL)
		const initResult = await provisionOnCouncil(page)
		expect(initResult.message?.success).toBe(true)
		await page.screenshot({ path: "playwright-report/hub-updates/05-staff-agent-initial-provision.png" })

		// Update primary user's profile
		const updateResult = await saveHubProfile(page, {
			phone: "+64211119005",
			physical_city: "Whanganui",
			physical_postcode: "4500",
			specialties: ["Building Consent"],  // reduced from 2 to 1
			directors: [
				{
					first_name: "David",
					last_name: "DirectorNew",
					email: "david-new@upd-staff.nz",
					phone: "+64211119015",
				},
			],
		})
		expect(updateResult.message?.status).toBe("ok")
		await page.screenshot({ path: "playwright-report/hub-updates/05-staff-agent-profile-saved.png" })

		// Re-provision
		const reprovisionResult = await provisionOnCouncil(page)
		expect(reprovisionResult.message?.success).toBe(true)
		await page.screenshot({ path: "playwright-report/hub-updates/05-staff-agent-reprovisioned.png" })

		await logout(page)
		await loginAdmin(page)

		// Primary user UPE updated
		const upe = await getUPE(page, EMAIL, ["phone", "physical_city", "physical_postcode", "company_name"])
		expect(upe.phone).toBe("+64211119005")
		expect(upe.physical_city).toBe("Whanganui")
		expect(upe.company_name).toBe(ORG)

		// Specialties replaced
		const specialties = await getSpecialties(page, EMAIL)
		expect(specialties).toContain("Building Consent")
		expect(specialties).not.toContain("Resource Consent")
		expect(specialties).toHaveLength(1)

		// Director updated on Organization
		const directors = await getOrgDirectors(page, ORG)
		const directorNames = directors.map((d) => d.director_name)
		expect(directorNames.some((n) => n.includes("DirectorNew"))).toBe(true)

		// All staff members still linked to the company
		const staffList = await callAPI(page, "frappe.client.get_list", {
			doctype: "User Profile Extended",
			filters: [["company_name", "=", ORG]],
			fields: ["user", "full_name"],
		})
		const staffEmails = (staffList.message || []).map((m: { user: string }) => m.user)
		expect(staffEmails).toContain(EMAIL)
		expect(staffEmails).toContain("upd-staff-agent-1@hubtest.nz")
		expect(staffEmails).toContain("upd-staff-agent-2@hubtest.nz")
		expect(staffEmails.length).toBeGreaterThanOrEqual(3)

		// Membership still active
		const memberships = await callAPI(page, "frappe.client.get_list", {
			doctype: "Hub Council Membership",
			filters: [["user", "=", EMAIL], ["council_code", "=", WDC_CODE]],
			fields: ["is_active"],
		})
		expect((memberships.message || [])[0]?.is_active).toBe(1)

		await page.screenshot({ path: "playwright-report/hub-updates/05-staff-agent-verified.png" })
	})
})

// ---------------------------------------------------------------------------
// Persona 6 — Company Applicant + staff
// ---------------------------------------------------------------------------

test.describe("Persona 6 — Company Applicant (with staff): profile update + staff membership unchanged", () => {
	test("primary user profile updates, re-provision keeps all staff under company", async ({ page }) => {
		const EMAIL = "upd-company-applicant-staff@hubtest.nz"
		const ORG = "Upd Staff Corp Ltd"

		await loginAs(page, EMAIL)
		const initResult = await provisionOnCouncil(page)
		expect(initResult.message?.success).toBe(true)
		await page.screenshot({ path: "playwright-report/hub-updates/06-staff-applicant-initial-provision.png" })

		// Update profile
		const updateResult = await saveHubProfile(page, {
			phone: "+64211119006",
			physical_city: "Invercargill",
			physical_postcode: "9810",
			specialties: [],  // Applicant — no specialties
		})
		expect(updateResult.message?.status).toBe("ok")
		await page.screenshot({ path: "playwright-report/hub-updates/06-staff-applicant-profile-saved.png" })

		// Re-provision
		const reprovisionResult = await provisionOnCouncil(page)
		expect(reprovisionResult.message?.success).toBe(true)
		await page.screenshot({ path: "playwright-report/hub-updates/06-staff-applicant-reprovisioned.png" })

		await logout(page)
		await loginAdmin(page)

		// Primary user UPE updated
		const upe = await getUPE(page, EMAIL, ["phone", "physical_city", "physical_postcode", "user_role", "company_name"])
		expect(upe.phone).toBe("+64211119006")
		expect(upe.physical_city).toBe("Invercargill")
		expect(upe.physical_postcode).toBe("9810")
		expect(upe.user_role).toBe("Individual")
		expect(upe.company_name).toBe(ORG)

		// Organization still accessible
		const orgExists = await callAPI(page, "frappe.client.get_value", {
			doctype: "Organization",
			filters: { organization_name: ORG },
			fieldname: ["organization_name"],
		})
		expect(orgExists.message?.organization_name).toBe(ORG)

		// All staff still under company
		const staffList = await callAPI(page, "frappe.client.get_list", {
			doctype: "User Profile Extended",
			filters: [["company_name", "=", ORG]],
			fields: ["user", "full_name", "user_role"],
		})
		const staffEmails = (staffList.message || []).map((m: { user: string }) => m.user)
		expect(staffEmails).toContain(EMAIL)
		expect(staffEmails).toContain("upd-staff-appl-1@hubtest.nz")
		expect(staffEmails).toContain("upd-staff-appl-2@hubtest.nz")
		expect(staffEmails.length).toBeGreaterThanOrEqual(3)

		// Membership still active
		const memberships = await callAPI(page, "frappe.client.get_list", {
			doctype: "Hub Council Membership",
			filters: [["user", "=", EMAIL], ["council_code", "=", WDC_CODE]],
			fields: ["is_active"],
		})
		expect((memberships.message || [])[0]?.is_active).toBe(1)

		await page.screenshot({ path: "playwright-report/hub-updates/06-staff-applicant-verified.png" })
	})
})
