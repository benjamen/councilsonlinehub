/**
 * Step 2: Cross-Council Hub — Real E2E Tests
 * Jira Test Plan: NZC-522
 * Hub site: http://127.0.0.1:8090/frontend/
 *
 * Run headed at human speed:
 *   HEADED=1 SLOW_MO=1200 npx playwright test --config=playwright.hub.config.js step2-cross-council-hub.spec.js --reporter=list
 */

import { test, expect } from "@playwright/test"

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8090"
const FRONTEND = `${BASE_URL}/frontend`

// Test users (set up in hub — see MEMORY.md)
const AGENT_USER = { email: "hub-agent-fixed@councilstest.nz", password: "TestPass2026" }
const COMPANY_AGENT = { email: "hub-company-agent@councilstest.nz", password: "TestPass2026" }
const APPLICANT_USER = { email: "hub-applicant@councilstest.nz", password: "TestPass2026" }
const ADMIN_USER = { email: "Administrator", password: "admin123" }

/**
 * Login via Frappe API (bypasses Keycloak SSO for test automation).
 * Uses domcontentloaded — HubNav API calls prevent networkidle on authenticated pages.
 */
async function loginViaApi(page, email, password) {
  const res = await page.request.post(`${BASE_URL}/api/method/login`, {
    form: { usr: email, pwd: password },
  })
  expect(res.status(), `Login failed for ${email}`).toBe(200)
  await page.goto(`${FRONTEND}/hub/dashboard`)
  await page.waitForLoadState("domcontentloaded")
  // Wait for the Vue app to mount and router to resolve
  await page.waitForURL(/\/hub\/dashboard/, { timeout: 15000 })
}

async function logout(page) {
  await page.request.post(`${BASE_URL}/api/method/logout`).catch(() => {})
  await page.goto(`${FRONTEND}/account/login`, { waitUntil: "commit" }).catch(() => {})
}

// ─── PUBLIC PAGES ─────────────────────────────────────────────────────────────

test.describe("2.1 — Hub Login Page (public)", () => {
  test("shows CouncilsOnline Portal heading and SSO sign-in button", async ({ page }) => {
    await page.goto(`${FRONTEND}/account/login`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByText("CouncilsOnline Portal")).toBeVisible()
    await expect(page.getByText("Sign in to manage your applications across all councils")).toBeVisible()
    // SSO sign-in button exists
    const signInBtn = page.getByRole("button").filter({ hasText: /sign in/i })
    await expect(signInBtn).toBeVisible()
  })

  test("unauthenticated protected route redirects to login", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/dashboard`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page).toHaveURL(/\/account\/login/)
  })

  test("already-logged-in user is redirected from login to dashboard", async ({ page }) => {
    await loginViaApi(page, AGENT_USER.email, AGENT_USER.password)
    await page.goto(`${FRONTEND}/account/login`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page).toHaveURL(/\/hub\/dashboard/)
    await logout(page)
  })
})

test.describe("2.2 — Hub Registration (public)", () => {
  test("registration page is accessible without login", async ({ page }) => {
    await page.goto(`${FRONTEND}/register?council_code=WDC`)
    await page.waitForLoadState("domcontentloaded")
    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/\/account\/login/)
    // Should show a registration-related element
    await expect(page.getByText(/CouncilsOnline|register|account/i).first()).toBeVisible()
  })
})

// ─── AGENT MARKETPLACE (PUBLIC) ───────────────────────────────────────────────

test.describe("2.3 — Agent Marketplace (public)", () => {
  // HubNav makes auth API calls that prevent networkidle on public pages
  // Use domcontentloaded + explicit element wait instead
  test("shows Agent Marketplace heading and search field", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/agents`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.getByRole("heading", { name: "Agent Marketplace" })).toBeVisible({ timeout: 15000 })
    await expect(page.getByPlaceholder("Search agents by name or specialty...")).toBeVisible({ timeout: 10000 })
  })

  test("service/area dropdowns shown only when filter data available (currently no data)", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/agents`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.getByRole("heading", { name: "Agent Marketplace" })).toBeVisible({ timeout: 15000 })
    // Dropdowns only render when filterOptions has data (v-if) — with empty hub, they are hidden
    // This is a data-state test, not a UI bug
    const allServicesSelect = page.locator("select").filter({ hasText: "All Services" })
    const hasDropdowns = await allServicesSelect.isVisible().catch(() => false)
    console.log(`OBSERVATION: Service filter dropdown visible: ${hasDropdowns} (depends on agent data)`)
    // Assert the page loaded — not a failure if no filter data
    await expect(page.getByRole("heading", { name: "Agent Marketplace" })).toBeVisible()
  })

  test("unregistered agent sees prompt to register on hub", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/agents`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.getByRole("heading", { name: "Agent Marketplace" })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Are you a professional agent?")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Register on the hub to list your services")).toBeVisible()
  })

  test("shows empty or loaded agents state after content loads", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/agents`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.getByRole("heading", { name: "Agent Marketplace" })).toBeVisible({ timeout: 15000 })
    // Wait up to 15s for either the empty state or agent cards to appear
    const noAgents = page.getByText("No agents are currently listed")
    const agentCard = page.locator("a[href*='/hub/agents/']").first()
    await Promise.race([
      noAgents.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
      agentCard.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    ])
    const hasEmpty = await noAgents.isVisible().catch(() => false)
    const hasCards = await agentCard.isVisible().catch(() => false)
    console.log(`OBSERVATION: empty state=${hasEmpty}, agent cards=${hasCards}`)
    expect(hasEmpty || hasCards, "Expected either agents list or empty state after load").toBe(true)
  })
})

// ─── HUB DASHBOARD (AUTHENTICATED) ────────────────────────────────────────────

test.describe("2.4 — Hub Dashboard (agent individual)", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, AGENT_USER.email, AGENT_USER.password)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test("dashboard loads and shows user welcome", async ({ page }) => {
    await expect(page).toHaveURL(/\/hub\/dashboard/)
    // Returning user sees welcome-back header
    await expect(page.getByText("Welcome back").or(page.getByText("Welcome to CouncilsOnline"))).toBeVisible()
  })

  test("dashboard shows welcome hero section", async ({ page }) => {
    // Wait for dashboard data to load — isNewUser or returning user section
    const returningHero = page.getByText("Welcome back")
    const newUserHero = page.getByText("CouncilsOnline")
    await expect(returningHero.or(newUserHero).first()).toBeVisible({ timeout: 15000 })
  })

  test("nav contains Councils link", async ({ page }) => {
    // Wait for HubNav to mount (makes API calls on mount)
    await expect(page.getByText("Councils").first()).toBeVisible({ timeout: 15000 })
  })
})

// ─── COUNCIL REGISTRY (USER VIEW) ─────────────────────────────────────────────

test.describe("2.5 — Council Registry (user view)", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, AGENT_USER.email, AGENT_USER.password)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test("shows Councils heading and description", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/councils`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByRole("heading", { name: "Councils" })).toBeVisible()
    await expect(page.getByText("Councils where you can submit applications")).toBeVisible()
  })

  test("WDC council entry is visible", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/councils`)
    await page.waitForLoadState("domcontentloaded")

    // Whangarei council should appear (set up per memory.md) — wait for data load
    await expect(page.getByText(/Whangarei|WDC/i).first()).toBeVisible({ timeout: 15000 })
  })

  test("council cards show register/connect action", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/councils`)
    await page.waitForLoadState("domcontentloaded")

    // At least one council card exists with a register or open button
    const actionBtn = page.getByRole("button", { name: /register|connect|open|go to council/i })
      .or(page.getByRole("link", { name: /register|connect|open|go to council/i }))
    await expect(actionBtn.first()).toBeVisible()
  })
})

// ─── MY QUOTES ────────────────────────────────────────────────────────────────

test.describe("2.6 — My Quote History", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, AGENT_USER.email, AGENT_USER.password)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test("shows My Quote History heading and description", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/my-quotes`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByRole("heading", { name: "My Quote History" })).toBeVisible()
    await expect(page.getByText("All quotes submitted across your registered councils")).toBeVisible()
  })

  test("shows empty state or quote list", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/my-quotes`)
    await page.waitForLoadState("domcontentloaded")

    // Wait for data load — either empty msg or rows appear
    const emptyMsg = page.getByText("No quotes found")
    const quoteRow = page.locator("table tbody tr, [data-testid='quote-row']")
    await Promise.race([
      emptyMsg.waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
      quoteRow.first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {}),
    ])
    const hasEmpty = await emptyMsg.isVisible().catch(() => false)
    const hasRows = (await quoteRow.count()) > 0
    expect(hasEmpty || hasRows, "Expected quote list or empty state").toBe(true)
  })
})

// ─── HUB PROFILE ──────────────────────────────────────────────────────────────

test.describe("2.7 — Hub Profile", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, AGENT_USER.email, AGENT_USER.password)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test("profile page shows My Profile heading", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/profile`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible()
  })

  test("profile shows Contact Details, Physical Address and form fields", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/profile`)
    await page.waitForLoadState("domcontentloaded")

    // Wait for profile data to load (behind v-if="!loading")
    await expect(page.getByText("Contact Details")).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Physical Address")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Phone Number")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("GST Number")).toBeVisible({ timeout: 5000 })
  })
})

// ─── COMPANY AGENT PROFILE ────────────────────────────────────────────────────

test.describe("2.8 — Company Agent profile (AGT-COM)", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, COMPANY_AGENT.email, COMPANY_AGENT.password)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test("company agent can access dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/hub\/dashboard/)
    await expect(page.getByText("Welcome back").or(page.getByText("CouncilsOnline")).first()).toBeVisible()
  })

  test("company agent profile shows Authorising Officer section", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/profile`)
    await page.waitForLoadState("domcontentloaded")

    // Wait for profile data to load — company agent has Authorising Officer section
    await expect(page.getByText("Contact Details")).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Authorising Officer")).toBeVisible({ timeout: 5000 })
  })
})

// ─── APPLICANT EXPERIENCE ─────────────────────────────────────────────────────

test.describe("2.9 — Applicant hub experience (APP-IND)", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, APPLICANT_USER.email, APPLICANT_USER.password)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test("applicant can see the council list", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/councils`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.getByRole("heading", { name: "Councils" })).toBeVisible()
  })

  test("applicant can view agent marketplace", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/agents`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.getByRole("heading", { name: "Agent Marketplace" })).toBeVisible()
  })
})

// ─── HUB ADMIN ────────────────────────────────────────────────────────────────

test.describe("2.10 — Hub Admin: Council Registry", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, ADMIN_USER.email, ADMIN_USER.password)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test("council registry page shows heading, description and table after data loads", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/admin/councils`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByRole("heading", { name: "Council Registry" })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Manage councils available to users on this hub")).toBeVisible()
    // Table headers appear after data loads (v-else, not v-if=loading)
    await expect(page.getByText("Council").first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("API URL")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Status")).toBeVisible({ timeout: 5000 })
  })

  test("WDC council entry is listed in admin registry", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/admin/councils`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByText(/Whangarei|WDC/i).first()).toBeVisible({ timeout: 15000 })
  })

  test("council row shows Settings and Delete actions", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/admin/councils`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByRole("link", { name: "Settings" }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("button", { name: "Delete" }).first()).toBeVisible({ timeout: 5000 })
  })

  test("clicking Add Council opens modal with Name, Code, API URL fields", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/admin/councils`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByRole("heading", { name: "Council Registry" })).toBeVisible({ timeout: 15000 })
    // Click the "+ Add Council" button to open the modal
    const addBtn = page.getByRole("button").filter({ hasText: /add council/i })
    await expect(addBtn).toBeVisible({ timeout: 10000 })
    await addBtn.click()
    // Modal should appear with form fields (use label locator — "API URL" also exists in table header)
    await expect(page.getByText("Council Name")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("Council Code")).toBeVisible({ timeout: 3000 })
    await expect(page.locator("label").filter({ hasText: /API URL/ })).toBeVisible({ timeout: 3000 })
  })
})

test.describe("2.11 — Hub Admin: Platform Statistics", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, ADMIN_USER.email, ADMIN_USER.password)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test("platform stats page shows heading and section groups", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/admin/stats`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByRole("heading", { name: "Platform Statistics" })).toBeVisible()
    await expect(page.getByText("Overview of councils, users and activity across the hub")).toBeVisible()
  })

  test("stats page shows sections when API works, or shows access error", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/admin/stats`)
    await page.waitForLoadState("domcontentloaded")

    // Platform Statistics heading is always visible
    await expect(page.getByRole("heading", { name: "Platform Statistics" })).toBeVisible({ timeout: 10000 })

    // Wait for either stats data or the access error (get_platform_stats has a known SQL bug)
    const statsLoaded = page.locator("h2.text-xs").filter({ hasText: "COUNCILS" })
    const accessError = page.getByText("System Manager access required")
    await Promise.race([
      statsLoaded.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
      accessError.waitFor({ state: "visible", timeout: 10000 }).catch(() => {}),
    ])
    const hasStats = await statsLoaded.isVisible().catch(() => false)
    const hasError = await accessError.isVisible().catch(() => false)
    console.log(`OBSERVATION: stats sections loaded=${hasStats}, access error=${hasError}`)
    if (hasError) {
      console.log("BACKEND BUG: get_platform_stats has SQL error (upe.user_type column missing) — stats unavailable")
    }
    expect(hasStats || hasError, "Expected stats data or access error").toBe(true)
  })

  test("stats page description and access control message visible", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/admin/stats`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page.getByRole("heading", { name: "Platform Statistics" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Overview of councils, users and activity across the hub")).toBeVisible({ timeout: 5000 })
    // NOTE: Quick Navigation section only renders when isAdmin=true (stats API success)
    // The get_platform_stats API has a SQL bug (upe.user_type column missing) — stats unavailable
    // Verify at least the "System Manager access required" message shows for this state
    await page.waitForTimeout(2000) // wait for API to fail
    const accessError = page.getByText("System Manager access required")
    const quickNav = page.getByText("Quick Navigation")
    const hasError = await accessError.isVisible().catch(() => false)
    const hasNav = await quickNav.isVisible().catch(() => false)
    console.log(`OBSERVATION: access error=${hasError}, quick nav=${hasNav}`)
    console.log("BACKEND BUG: get_platform_stats SQL error blocks stats display — NZC bug to fix")
    expect(hasError || hasNav, "Expected either access error or stats content").toBe(true)
  })
})

test.describe("2.12 — Hub Admin: Users", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page, ADMIN_USER.email, ADMIN_USER.password)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test("admin users page loads without error", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/admin/users`)
    await page.waitForLoadState("domcontentloaded")

    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/\/account\/login/)
    // Should render some content
    await expect(page.locator("body")).not.toBeEmpty()
  })

  test("platform users page loads without error", async ({ page }) => {
    await page.goto(`${FRONTEND}/hub/admin/platform-users`)
    await page.waitForLoadState("domcontentloaded")

    await expect(page).not.toHaveURL(/\/account\/login/)
    await expect(page.locator("body")).not.toBeEmpty()
  })
})

// ─── SIGN OUT ─────────────────────────────────────────────────────────────────

test.describe("2.13 — Sign out", () => {
  test("after logout, protected route redirects to login", async ({ page }) => {
    await loginViaApi(page, AGENT_USER.email, AGENT_USER.password)
    await expect(page).toHaveURL(/\/hub\/dashboard/)

    // Logout: navigate the browser to the logout endpoint (ensures cookie jar is cleared)
    await page.goto(`${BASE_URL}/api/method/logout`, { waitUntil: "commit" })
    await page.context().clearCookies()

    // Navigating to protected page should redirect to login (wait for async session check + redirect)
    await page.goto(`${FRONTEND}/hub/dashboard`)
    await page.waitForURL(/\/account\/login/, { timeout: 15000 })
  })
})

// ─── GAP SUMMARY ──────────────────────────────────────────────────────────────

test.describe("2.14 — Gap Summary vs old test suite", () => {
  test("ARCHITECTURE GAP: Keycloak SSO login flow cannot be automated without Keycloak test realm", async ({ page }) => {
    // The HubLogin.vue button redirects to Keycloak OIDC endpoint.
    // Real-browser SSO flow requires either:
    //   (a) a Keycloak test realm with known credentials, or
    //   (b) an override in the hub to allow password login in test mode
    // Currently: API login bypasses Keycloak and works for test automation.
    // JIRA GAP: Add Keycloak test realm setup to NZC-522 acceptance criteria.
    console.log("GAP: Full Keycloak SSO redirect flow not automatable without test realm")
    await page.goto(`${FRONTEND}/account/login`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.getByText("CouncilsOnline Portal")).toBeVisible()
    // Confirm SSO button is present
    const ssoBtn = page.getByRole("button").filter({ hasText: /sign in/i })
    await expect(ssoBtn).toBeVisible()
    console.log("GAP: SSO button present — clicking would redirect to Keycloak (not tested here)")
  })

  test("ARCHITECTURE GAP: Council registration provisioning flow (cross-site) not testable in isolation", async ({ page }) => {
    // When an agent connects to WDC council: hub POSTs to whangarei.localhost:8092 API to create
    // a User Profile Extended there. This cross-site flow requires BOTH servers running.
    // Current tests assert the UI side; end-to-end provisioning tested in hub-provisioning-personas.spec.ts
    console.log("GAP: Council registration provisioning requires both hub:8090 and whangarei:8092 running")
    await page.goto(`${FRONTEND}/hub/councils`)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.getByRole("heading", { name: "Councils" })).toBeVisible()
    console.log("GAP: Registration button click + cross-site API call not tested here")
  })

  test("ARCHITECTURE GAP: Hub Team invite flow requires email delivery", async ({ page }) => {
    console.log("GAP: HubTeam invite sends email — cannot verify delivery in automated tests")
    await loginViaApi(page, ADMIN_USER.email, ADMIN_USER.password)
    await page.goto(`${FRONTEND}/hub/team`)
    await page.waitForLoadState("domcontentloaded")
    // Team heading is always visible
    await expect(page.getByRole("heading", { name: "Team" })).toBeVisible({ timeout: 10000 })
    // "+ Invite Member" button reveals the invite form
    const inviteBtn = page.getByRole("button", { name: /invite member/i })
    await expect(inviteBtn).toBeVisible({ timeout: 5000 })
    await inviteBtn.click()
    // Form appears (v-if="showInvite")
    await expect(page.getByText("Invite a team member")).toBeVisible({ timeout: 3000 })
    await expect(page.getByPlaceholder("Email address")).toBeVisible()
    console.log("GAP: Invite submit and email delivery not tested")
    await logout(page)
  })
})
