/**
 * Council-First Registration Flow — Automated Walkthrough
 *
 * New flow (all external users register via hub):
 *  1. Land on the council site (Whangarei, port 8092)
 *  2. Click "Get Started" → Register page
 *  3. Click "Register as Applicant" → redirected to hub register page (nzcouncil.localhost:8090)
 *     with ?council_code=WDC in the URL
 *  4. Hub register page auto-redirects to Keycloak /registrations (login_hint=Applicant, no button click)
 *  5. Keycloak registration form appears — fill it out
 *  6. Keycloak redirects back → hub dashboard (nzcouncil.localhost:8090)
 *  7. HubDashboard.provisionPendingCouncil() auto-provisions to WDC
 *  8. Redirected to council dashboard at whangarei.localhost:8092/frontend/dashboard
 *  9. PAUSE — inspect the council dashboard
 *
 * Run:
 *   npx playwright test --config=playwright.council-first.config.js --reporter=list
 */

import { test, expect } from "@playwright/test"

const COUNCIL_URL = process.env.COUNCIL_URL || "http://whangarei.localhost:8092"
const HUB_URL     = process.env.HUB_URL     || "http://nzcouncil.localhost:8090"

const ts = Date.now()
const TEST_EMAIL    = `council-first-${ts}@councilstest.nz`
const TEST_PASSWORD = "CouncilTest2026!"
const TEST_FIRST    = "Tana"
const TEST_LAST     = "Applicant"
const TEST_PHONE    = "+64211234567"

test("council-first: council site → hub register → Keycloak → auto-provision → council dashboard", async ({ page }) => {

	// ── Step 1: Land on council site ───────────────────────────────────────
	console.log("\n▶  Step 1: Opening council landing page at", COUNCIL_URL)
	await page.goto(`${COUNCIL_URL}/frontend/`)
	await page.waitForLoadState("networkidle")
	await page.screenshot({ path: "playwright-report/council-first/01-landing.png" })

	// ── Step 2: Click Get Started ──────────────────────────────────────────
	console.log("▶  Step 2: Clicking Get Started")
	const getStartedBtn = page.locator("button, a").filter({ hasText: /get started/i }).first()
	await expect(getStartedBtn).toBeVisible({ timeout: 10_000 })
	await getStartedBtn.click()
	await page.waitForLoadState("networkidle")
	await page.screenshot({ path: "playwright-report/council-first/02-register-page.png" })

	// ── Step 3: Click Register as Applicant → hub register page ──────────
	console.log("▶  Step 3: Clicking Register as Applicant")
	const applicantBtn = page.locator("button").filter({ hasText: /register as applicant/i }).first()
	await expect(applicantBtn).toBeVisible({ timeout: 10_000 })
	await applicantBtn.click()

	// Should redirect to hub register page with council_code param (auto-redirects to Keycloak after 400ms)
	console.log("▶  Step 3b: Waiting for hub register page…")
	await page.waitForURL(/nzcouncil\.localhost:8090.*register/, { timeout: 15_000 })
	// Capture URL immediately — before waitForLoadState which would wait through the 400ms auto-redirect
	const hubRegisterUrl = page.url()
	console.log("   Hub register URL:", hubRegisterUrl)
	const hubRegUrl = new URL(hubRegisterUrl)
	const councilCode = hubRegUrl.searchParams.get("council_code")
	console.log("   council_code param:", councilCode)
	expect(councilCode).toBeTruthy()
	await page.screenshot({ path: "playwright-report/council-first/03-hub-register.png" })

	// ── Step 4: Hub register page auto-redirects to Keycloak (no button click needed) ─
	console.log("▶  Step 4: Waiting for auto-redirect to Keycloak…")

	// ── Step 5: Keycloak registration form (hub redirects directly to /registrations) ──
	console.log("▶  Step 5: Waiting for Keycloak registration form…")
	await page.waitForURL(/login\.councilsonline/, { timeout: 15_000 })
	console.log("   Keycloak URL:", page.url())
	await page.waitForLoadState("networkidle")
	await expect(page.locator("#kc-register-form")).toBeVisible({ timeout: 15_000 })
	console.log("   On Keycloak registration form:", page.url())
	await page.screenshot({ path: "playwright-report/council-first/05-keycloak-register.png" })

	// ── Step 6: Fill custom CouncilsOnline registration form ───────────────
	console.log(`▶  Step 6: Filling registration form as ${TEST_EMAIL}`)

	// Dismiss any JS alerts (form validation) automatically
	page.on("dialog", async (dialog) => {
		console.log("   [dialog]", dialog.message())
		await dialog.accept()
	})

	// Select Applicant tab and force-set hidden field as fallback
	await page.locator("#tab-applicant").click()
	await page.evaluate(() => {
		const el = document.getElementById("userTypeHidden") as HTMLInputElement
		if (!el.value) el.value = "Applicant"
	})

	// Select entity type: Individual — click radio AND ensure hidden field is set
	await page.locator("input[name='_entityType'][value='Individual']").click()
	await page.evaluate(() => {
		const el = document.getElementById("entityTypeHidden") as HTMLInputElement
		if (!el.value) el.value = "Individual"
	})

	await page.locator("#firstName").fill(TEST_FIRST)
	await page.locator("#lastName").fill(TEST_LAST)
	await page.locator("#email").fill(TEST_EMAIL)
	await page.locator("#phoneNumber").fill(TEST_PHONE)
	await page.locator("#password").fill(TEST_PASSWORD)
	await page.locator("#password-confirm").fill(TEST_PASSWORD)
	await page.locator("#termsAccepted").check()

	const userType   = await page.evaluate(() => (document.getElementById("userTypeHidden") as HTMLInputElement).value)
	const entityType = await page.evaluate(() => (document.getElementById("entityTypeHidden") as HTMLInputElement).value)
	console.log(`   userType=${userType} entityType=${entityType}`)

	await page.screenshot({ path: "playwright-report/council-first/06-keycloak-filled.png" })
	await page.locator("#submit-btn").click()
	console.log("   Registration form submitted")

	// ── Step 7: Back on hub dashboard ─────────────────────────────────────
	console.log("▶  Step 7: Waiting for hub dashboard…")
	await page.waitForURL(/nzcouncil\.localhost:8090.*frontend/, { timeout: 60_000 })
	console.log("   Hub URL:", page.url())
	await page.waitForLoadState("networkidle")
	await page.screenshot({ path: "playwright-report/council-first/07-hub-dashboard.png" })

	// ── Step 8: Auto-provision fires → council dashboard ──────────────────
	console.log("▶  Step 8: Waiting for auto-provision redirect to council dashboard…")
	await page.waitForURL(/whangarei\.localhost:8092.*frontend\/dashboard/, { timeout: 45_000 })
	console.log("   ✓ Landed on council dashboard:", page.url())
	await page.waitForLoadState("networkidle")
	await page.screenshot({ path: "playwright-report/council-first/08-council-dashboard.png" })

	expect(page.url()).toContain("/frontend/dashboard")

	// ── Step 10: PAUSE on council dashboard ───────────────────────────────
	console.log("\n" + "═".repeat(60))
	console.log("  ✅ SUCCESS — You are on the council dashboard!")
	console.log("     Inspect the page, then press Resume to close.")
	console.log("═".repeat(60) + "\n")
	await page.pause()
})
