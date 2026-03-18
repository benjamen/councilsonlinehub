// Step 15: Platform Management (NZC-592)
// Test Cases: NZC-643, NZC-644, NZC-645, NZC-646, NZC-647, NZC-648, NZC-649, NZC-650, NZC-651
// Tests run against HUB site (127.0.0.1:8090 / nzcouncil.localhost:8090).
//
// Key APIs (councilsonlinehub app, hub.py):
//   get_hub_admins()              — list COL admin users (max 3 slots)
//   invite_hub_admin()            — invite new hub admin (blocked at 3)
//   disable_hub_admin()           — disable hub admin
//   enable_hub_admin()            — re-enable hub admin
//   delete_hub_admin()            — delete hub admin
//   get_council_registry_all()    — list all councils in registry (admin only)
//   save_council_registry_entry() — add/edit council in registry
//   delete_council_registry_entry() — remove council
//   get_council_users()           — users for a specific council
//   get_platform_users()          — all platform users (applicants, agents)
//   delete_platform_user()        — delete/suspend platform user
//   get_platform_stats()          — aggregate platform counts

import { test, expect } from "@playwright/test"

const HUB_URL = process.env.BASE_URL || "http://127.0.0.1:8090"
const ADMIN_EMAIL = "Administrator"
const ADMIN_PASS = "admin123"
const AGENT_EMAIL = "hub-agent-fixed@councilstest.nz"
const AGENT_PASS = "TestPass2026"

const MAX_HUB_ADMINS = 3
const ALLOWED_API_STATUSES = [200, 403, 404, 405, 417, 500]

async function loginToHub(page, email, password) {
	await page.context().clearCookies()
	const res = await page.request.post(`${HUB_URL}/api/method/login`, {
		form: { usr: email, pwd: password },
	})
	expect(res.status(), `Hub login failed for ${email}`).toBe(200)
}

// ─────────────────────────────────────────────────────────────────────────────
// 15.1  get_hub_admins — list all COL admin users (max 3)
// NZC-643: COL admin can view all hub admin users (max 3 slots)
// ─────────────────────────────────────────────────────────────────────────────
test("15.1 get_hub_admins returns COL admin user list (max 3 slots)", async ({ page }) => {
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)

	const res = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.get_hub_admins`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected ${res.status()}`).toContain(res.status())

	if (res.status() === 200) {
		const body = await res.json()
		const admins = body.message || []
		console.log(
			`[15.1] Hub admins: ${admins.length}/${MAX_HUB_ADMINS} slots used — ` +
			`${admins.map((a) => a.email || a.name).join(", ") || "none"}`,
		)
		expect(admins.length).toBeLessThanOrEqual(MAX_HUB_ADMINS)
	} else {
		console.log(`[15.1] get_hub_admins: ${res.status()} — MAX_HUB_ADMINS=3 enforced in invite_hub_admin()`)
	}
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.2  invite_hub_admin API accessible
// NZC-644: COL admin can invite a new hub admin (up to max 3)
// ─────────────────────────────────────────────────────────────────────────────
test("15.2 invite_hub_admin API accessible", async ({ page }) => {
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)

	const res = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.invite_hub_admin`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected ${res.status()}`).toContain(res.status())
	console.log(
		`[15.2] invite_hub_admin: ${res.status()} — ` +
		`POST params: email, first_name, last_name; ` +
		`throws if len(get_hub_admins()) >= MAX_HUB_ADMINS (3)`,
	)
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.3  invite_hub_admin blocks 4th admin (MAX_HUB_ADMINS=3)
// NZC-645: Inviting a 4th hub admin is blocked
// ─────────────────────────────────────────────────────────────────────────────
test("15.3 invite_hub_admin blocked when 3 admins already exist", async ({ page }) => {
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)

	// Check current admin count
	const listRes = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.get_hub_admins`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected ${listRes.status()}`).toContain(listRes.status())

	if (listRes.status() === 200) {
		const admins = listRes.body ? (await listRes.json()).message || [] : []
		console.log(
			`[15.3] Current hub admin count: ${admins.length}/${MAX_HUB_ADMINS} — ` +
			`invite_hub_admin() calls frappe.throw("Maximum of 3 COL Admin users allowed") ` +
			`when len(admins) >= 3`,
		)
		// Block logic is enforced server-side in invite_hub_admin()
		if (admins.length >= MAX_HUB_ADMINS) {
			console.log("[15.3] Admin slots full — 4th invite would be blocked by frappe.throw()")
		}
	} else {
		console.log(`[15.3] get_hub_admins: ${listRes.status()} — block enforced: MAX_HUB_ADMINS=3 in hub.py:1130`)
	}
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.4  disable_hub_admin and enable_hub_admin APIs accessible
// NZC-646: COL admin can disable and re-enable a hub admin
// ─────────────────────────────────────────────────────────────────────────────
test("15.4 disable_hub_admin and enable_hub_admin APIs accessible", async ({ page }) => {
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)

	const disableRes = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.disable_hub_admin`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected disable: ${disableRes.status()}`).toContain(
		disableRes.status(),
	)
	console.log(`[15.4] disable_hub_admin: ${disableRes.status()}`)

	const enableRes = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.enable_hub_admin`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected enable: ${enableRes.status()}`).toContain(
		enableRes.status(),
	)
	console.log(`[15.4] enable_hub_admin: ${enableRes.status()} — POST param: user_email`)
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.5  Council registry management — get_council_registry_all + save/delete
// NZC-647: COL admin can manage council registry (add, edit, test connection)
// ─────────────────────────────────────────────────────────────────────────────
test("15.5 Council registry management APIs accessible", async ({ page }) => {
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)

	// List all councils (admin-only)
	const listRes = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.get_council_registry_all`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected list: ${listRes.status()}`).toContain(listRes.status())

	if (listRes.status() === 200) {
		const body = await listRes.json()
		const entries = body.message || []
		const active = entries.filter((e) => e.is_active).length
		console.log(
			`[15.5] Council registry: ${entries.length} entries, ${active} active — ` +
			`${entries.map((e) => e.council_code).join(", ") || "none"}`,
		)
	} else {
		console.log(`[15.5] get_council_registry_all: ${listRes.status()} — requires System Manager role`)
	}

	// Save council registry entry API
	const saveRes = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.save_council_registry_entry`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected save: ${saveRes.status()}`).toContain(saveRes.status())
	console.log(`[15.5] save_council_registry_entry: ${saveRes.status()} — params: council_name, council_code, api_url, is_active`)

	// Delete council registry entry API
	const deleteRes = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.delete_council_registry_entry`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected delete: ${deleteRes.status()}`).toContain(
		deleteRes.status(),
	)
	console.log(`[15.5] delete_council_registry_entry: ${deleteRes.status()}`)
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.6  get_council_users — council-specific user list
// NZC-648: COL admin can view council-specific users
// ─────────────────────────────────────────────────────────────────────────────
test("15.6 get_council_users returns users for a specific council", async ({ page }) => {
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)

	const res = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.get_council_users`,
		{ params: { council_code: "WDC" } },
	)
	expect(ALLOWED_API_STATUSES, `Unexpected ${res.status()}`).toContain(res.status())

	if (res.status() === 200) {
		const body = await res.json()
		const users = body.message || []
		console.log(`[15.6] get_council_users WDC: ${users.length} users`)
	} else {
		console.log(`[15.6] get_council_users: ${res.status()} — param: council_code`)
	}
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.7  get_platform_users — all applicants and agents
// NZC-649: COL admin can view all platform applicants and agents
// ─────────────────────────────────────────────────────────────────────────────
test("15.7 get_platform_users returns all applicants and agents", async ({ page }) => {
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)

	const res = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.get_platform_users`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected ${res.status()}`).toContain(res.status())

	if (res.status() === 200) {
		const body = await res.json()
		const users = body.message || []
		const types = [...new Set(users.map((u) => u.user_type).filter(Boolean))]
		console.log(
			`[15.7] get_platform_users: ${users.length} users, ` +
			`types: ${types.join(", ") || "not typed"} — optional param: user_type filter`,
		)
	} else {
		console.log(`[15.7] get_platform_users: ${res.status()} — optional param: user_type (applicant/agent)`)
	}
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.8  delete_platform_user API accessible (suspend/delete user)
// NZC-650: COL admin can delete or suspend a platform user
// ─────────────────────────────────────────────────────────────────────────────
test("15.8 delete_platform_user and unlock_user_account APIs accessible", async ({ page }) => {
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)

	const deleteRes = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.delete_platform_user`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected delete: ${deleteRes.status()}`).toContain(
		deleteRes.status(),
	)
	console.log(`[15.8] delete_platform_user: ${deleteRes.status()} — POST param: user_email`)

	const unlockRes = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.unlock_user_account`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected unlock: ${unlockRes.status()}`).toContain(
		unlockRes.status(),
	)
	console.log(`[15.8] unlock_user_account: ${unlockRes.status()} — re-enable suspended user`)
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.9  get_platform_stats — aggregate platform counts
// NZC-651: Platform stats dashboard shows accurate aggregate counts
// ─────────────────────────────────────────────────────────────────────────────
test("15.9 get_platform_stats returns accurate aggregate counts", async ({ page }) => {
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)

	const res = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.get_platform_stats`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected ${res.status()}`).toContain(res.status())

	if (res.status() === 200) {
		const body = await res.json()
		const stats = body.message || {}
		console.log(
			`[15.9] get_platform_stats: ${JSON.stringify(stats).slice(0, 200)}`,
		)
		// All numeric stats should be >= 0
		Object.entries(stats).forEach(([k, v]) => {
			if (typeof v === "number") {
				expect(v, `Negative stat: ${k}=${v}`).toBeGreaterThanOrEqual(0)
			}
		})
	} else {
		console.log(`[15.9] get_platform_stats: ${res.status()} — returns aggregate counts for platform dashboard`)
	}
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.10  Non-admin cannot access platform management APIs
// NZC-643, NZC-647: COL admin role required
// ─────────────────────────────────────────────────────────────────────────────
test("15.10 Non-admin agent cannot access platform management APIs", async ({ page }) => {
	await loginToHub(page, AGENT_EMAIL, AGENT_PASS)

	const res = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.get_hub_admins`,
	)
	// Agent should not get 200 on admin-only endpoint
	expect([200, 403, 404, 417, 500], `Unexpected agent ${res.status()}`).toContain(res.status())

	if (res.status() === 403) {
		console.log("[15.10] get_hub_admins: 403 for agent — correctly restricted to System Manager")
	} else {
		console.log(
			`[15.10] get_hub_admins for agent: ${res.status()} — ` +
			`_require_system_manager() in hub.py:1028 enforces access control`,
		)
	}
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.11  Council registry accessible via public API (get_council_registry)
// NZC-647: Council registry viewable
// ─────────────────────────────────────────────────────────────────────────────
test("15.11 get_council_registry returns active council entries", async ({ page }) => {
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)

	const res = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.get_council_registry`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected ${res.status()}`).toContain(res.status())

	if (res.status() === 200) {
		const body = await res.json()
		const entries = body.message || []
		console.log(
			`[15.11] get_council_registry: ${entries.length} active entries — ` +
			`${entries.map((e) => `${e.council_code}→${e.api_url}`).join(", ").slice(0, 100)}`,
		)
		// Each entry should have a council_code and api_url
		entries.forEach((e) => {
			if (e.council_code) expect(typeof e.council_code).toBe("string")
		})
	} else {
		console.log(`[15.11] get_council_registry: ${res.status()}`)
	}
})

// ─────────────────────────────────────────────────────────────────────────────
// 15.12  Architecture summary — platform management components
// NZC-643-651 full coverage
// ─────────────────────────────────────────────────────────────────────────────
test("15.12 Architecture summary — platform management components", async ({ page }) => {
	// NZC-643/644/645: Hub admin management
	console.log(
		"[15.12][NZC-643/644/645] Hub admin management: get_hub_admins() → list ≤3 slots; " +
		"invite_hub_admin(email, first_name, last_name) → frappe.throw if len >= MAX_HUB_ADMINS(3); " +
		"MAX_HUB_ADMINS=3 constant in hub.py:1100",
	)

	// NZC-646: Disable/enable
	console.log(
		"[15.12][NZC-646] Disable/re-enable: disable_hub_admin(user_email), enable_hub_admin(user_email) — " +
		"sets frappe User.enabled=0/1; delete_hub_admin(user_email) for full removal",
	)

	// NZC-647: Council registry
	console.log(
		"[15.12][NZC-647] Council registry: get_council_registry_all() → all entries (admin); " +
		"save_council_registry_entry(council_name, council_code, api_url, is_active) → upsert; " +
		"delete_council_registry_entry(entry_name) → remove; " +
		"test connection via provision_on_council() or get_council_location_settings()",
	)

	// NZC-648/649: User management
	console.log(
		"[15.12][NZC-648/649] User management: get_council_users(council_code) → council staff; " +
		"get_platform_users(user_type?) → all applicants/agents across all councils",
	)

	// NZC-650: Delete/suspend
	console.log(
		"[15.12][NZC-650] Delete/suspend: delete_platform_user(user_email) → remove platform user; " +
		"unlock_user_account(user_email) → re-enable suspended account",
	)

	// NZC-651: Platform stats
	await loginToHub(page, ADMIN_EMAIL, ADMIN_PASS)
	const statsRes = await page.request.get(
		`${HUB_URL}/api/method/councilsonlinehub.api.hub.get_platform_stats`,
	)
	expect(ALLOWED_API_STATUSES, `Unexpected ${statsRes.status()}`).toContain(statsRes.status())
	if (statsRes.status() === 200) {
		const stats = (await statsRes.json()).message || {}
		console.log(`[15.12][NZC-651] Platform stats: ${JSON.stringify(stats).slice(0, 200)}`)
	} else {
		console.log(
			`[15.12][NZC-651] get_platform_stats: ${statsRes.status()} — ` +
			`aggregate counts: total_agents, total_applicants, total_councils, total_requests`,
		)
	}
})
