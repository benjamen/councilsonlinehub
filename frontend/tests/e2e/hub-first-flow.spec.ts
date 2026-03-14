/**
 * Hub-First Registration Flow
 *
 * 1. Hub register page → Continue with Keycloak SSO → Keycloak login
 * 2. Click "Don't have an account? Register" → branded registration form
 * 3. Fill form (Applicant / Individual, no security questions)
 * 4. Redirect back to hub dashboard
 * 5. Councils page → Register with WDC
 * 6. New tab → council dashboard at whangarei.localhost:8092
 */

import { test, expect } from "@playwright/test"

const HUB_URL     = process.env.HUB_URL     || "http://nzcouncil.localhost:8090"
const COUNCIL_URL = process.env.COUNCIL_URL || "http://whangarei.localhost:8092"

const ts = Date.now()
const TEST_EMAIL    = `hub-first-${ts}@councilstest.nz`
const TEST_PASSWORD = "HubFirst2026!"
const TEST_FIRST    = "Hemi"
const TEST_LAST     = "Walker"
const TEST_PHONE    = "0212345678"

test("hub-first: register on hub → Councils → Register WDC → council dashboard", async ({ page, context }) => {

	// ── Step 1: Hub register page ──────────────────────────────────────────
	console.log("\n▶  Step 1: Opening hub register page at", HUB_URL)
	await page.goto(`${HUB_URL}/frontend/register`)
	await page.waitForLoadState("networkidle")
	await page.screenshot({ path: "playwright-report/hub-first/01-hub-register.png" })

	// ── Step 2 & 3: Page auto-redirects to Keycloak registration (no button) ──
	console.log("▶  Step 2: Waiting for auto-redirect to Keycloak registration…")
	await page.waitForURL(/login\.councilsonline/, { timeout: 15_000 })
	// May land on login page first (if user is already logged in) or go straight to register
	// If on login page, click the Register link
	if (!page.url().includes("registration")) {
		const registerLink = page.locator("a").filter({ hasText: /register/i }).first()
		const linkVisible = await registerLink.isVisible().catch(() => false)
		if (linkVisible) await registerLink.click()
	}
	await expect(page.locator("#page-title, h1.kc-title")).toBeVisible({ timeout: 15_000 })
	console.log("   On Keycloak registration form:", page.url())
	await page.screenshot({ path: "playwright-report/hub-first/03-keycloak-register.png" })

	// ── Step 4: Fill registration form ────────────────────────────────────
	console.log(`▶  Step 4: Filling registration form as ${TEST_EMAIL}`)

	// Dismiss any JS validation alerts automatically
	page.on("dialog", async (dialog) => {
		console.log("   [dialog]", dialog.message())
		await dialog.accept()
	})

	// Select Applicant tab + Individual entity
	await page.locator("#tab-applicant").click()
	await page.evaluate(() => {
		const el = document.getElementById("userTypeHidden") as HTMLInputElement
		if (el && !el.value) el.value = "Applicant"
	})
	await page.locator("input[name='_entityType'][value='Individual']").click()
	await page.evaluate(() => {
		const el = document.getElementById("entityTypeHidden") as HTMLInputElement
		if (el && !el.value) el.value = "Individual"
	})

	await page.locator("#firstName").fill(TEST_FIRST)
	await page.locator("#lastName").fill(TEST_LAST)
	await page.locator("#email").fill(TEST_EMAIL)
	await page.locator("#phoneNumber").fill(TEST_PHONE)
	await page.locator("#password").fill(TEST_PASSWORD)
	await page.locator("#password-confirm").fill(TEST_PASSWORD)
	await page.locator("#termsAccepted").check()

	const ut = await page.evaluate(() => (document.getElementById("userTypeHidden") as HTMLInputElement)?.value)
	const et = await page.evaluate(() => (document.getElementById("entityTypeHidden") as HTMLInputElement)?.value)
	console.log(`   userType=${ut} entityType=${et}`)

	await page.screenshot({ path: "playwright-report/hub-first/04-keycloak-filled.png" })
	await page.locator("#submit-btn").click()
	console.log("   Registration form submitted")

	// ── Step 5: Hub dashboard ──────────────────────────────────────────────
	console.log("▶  Step 5: Waiting for hub dashboard…")
	await page.waitForURL(/nzcouncil\.localhost:8090.*frontend/, { timeout: 60_000 })
	console.log("   Hub URL:", page.url())
	await page.waitForLoadState("networkidle")
	await page.screenshot({ path: "playwright-report/hub-first/05-hub-dashboard.png" })

	// ── Step 6: Navigate to Councils page ─────────────────────────────────
	console.log("▶  Step 6: Navigating to Councils page")
	await page.goto(`${HUB_URL}/frontend/hub/councils`)
	await page.waitForLoadState("networkidle")
	await page.screenshot({ path: "playwright-report/hub-first/06-councils-page.png" })

	// ── Step 7: Register with Whangarei District Council ──────────────────
	console.log("▶  Step 7: Finding WDC Register button")
	const registerBtn = page.locator("button").filter({ hasText: /^register$/i }).first()
	await expect(registerBtn).toBeVisible({ timeout: 15_000 })

	const [councilTab] = await Promise.all([
		context.waitForEvent("page", { timeout: 30_000 }),
		registerBtn.click(),
	])

	console.log("▶  Step 8: Council tab opened:", councilTab.url())
	await councilTab.waitForURL(/\/frontend\/dashboard/, { timeout: 45_000 })
	await councilTab.waitForLoadState("networkidle", { timeout: 30_000 })
	await councilTab.screenshot({ path: "playwright-report/hub-first/08-council-dashboard.png" })

	const dashUrl = councilTab.url()
	console.log("   Council tab final URL:", dashUrl)
	expect(dashUrl).toContain("/frontend/dashboard")

	console.log("\n" + "═".repeat(60))
	console.log("  ✅ SUCCESS — Council dashboard open in new tab!")
	console.log("     Inspect the page, then press Resume to close.")
	console.log("═".repeat(60) + "\n")
	await councilTab.pause()
})
