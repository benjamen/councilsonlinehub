import { test, expect } from "@playwright/test"
const BASE_URL = "http://127.0.0.1:8090"
const FRONTEND = `${BASE_URL}/frontend`

test("debug: capture all navigations", async ({ page, context }) => {
  const navigations = []
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) navigations.push(frame.url())
  })
  
  await page.request.post(`${BASE_URL}/api/method/login`, {
    form: { usr: "hub-agent-fixed@councilstest.nz", pwd: "TestPass2026" },
  })
  await page.goto(`${FRONTEND}/hub/dashboard`)
  await page.waitForURL(/\/hub\/dashboard/, { timeout: 10000 })
  console.log("Navs to dashboard:", navigations)
  navigations.length = 0
  
  // Navigate directly to profile
  await page.goto(`${FRONTEND}/hub/profile`)
  await page.waitForTimeout(2000)
  console.log("URL after profile goto:", page.url())
  console.log("Frame navigations:", navigations)
  
  // Check console errors
  const errors = []
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.waitForTimeout(1000)
  console.log("Console errors:", errors)
})
