import { createRouter, createWebHistory } from "vue-router"
import { session } from "@/data/session"

const routes = [
  // Auth
  {
    path: "/account/login",
    name: "Login",
    component: () => import("@/pages/HubLogin.vue"),
    meta: { public: true },
  },
  // Council-initiated registration: /register?council_code=WDC
  {
    path: "/register",
    name: "Register",
    component: () => import("@/pages/HubRegister.vue"),
    meta: { public: true },
  },
  // Hub pages
  {
    path: "/hub/dashboard",
    name: "HubDashboard",
    component: () => import("@/pages/HubDashboard.vue"),
  },
  {
    path: "/hub/profile",
    name: "HubProfile",
    component: () => import("@/pages/HubProfile.vue"),
  },
  {
    path: "/hub/councils",
    name: "HubCouncils",
    component: () => import("@/pages/HubCouncils.vue"),
  },
  {
    path: "/hub/team",
    name: "HubTeam",
    component: () => import("@/pages/HubTeam.vue"),
  },
  // Admin
  {
    path: "/hub/admin/councils",
    name: "HubAdminCouncils",
    component: () => import("@/pages/HubAdminCouncils.vue"),
  },
  {
    path: "/hub/admin/councils/:councilCode/settings",
    name: "HubAdminCouncilSettings",
    component: () => import("@/pages/HubAdminCouncilSettings.vue"),
  },
  {
    path: "/hub/admin/councils/:councilCode/users",
    name: "HubAdminCouncilUsers",
    component: () => import("@/pages/HubAdminCouncilUsers.vue"),
  },
  {
    path: "/hub/admin/users",
    name: "HubAdminUsers",
    component: () => import("@/pages/HubAdminUsers.vue"),
  },
  {
    path: "/hub/admin/platform-users",
    name: "HubAdminPlatformUsers",
    component: () => import("@/pages/HubAdminPlatformUsers.vue"),
  },
  {
    path: "/hub/admin/stats",
    name: "HubAdminStats",
    component: () => import("@/pages/HubAdminStats.vue"),
  },
  // Agent Marketplace (public)
  {
    path: "/hub/agents",
    name: "HubAgentMarketplace",
    component: () => import("@/pages/HubAgentMarketplace.vue"),
    meta: { public: true },
  },
  {
    path: "/hub/agents/:id",
    name: "HubAgentDetail",
    component: () => import("@/pages/HubAgentDetail.vue"),
    meta: { public: true },
  },
  // My Quote History (NZ-541)
  {
    path: "/hub/my-quotes",
    name: "HubMyQuotes",
    component: () => import("@/pages/HubMyQuotes.vue"),
  },
  // Catch-all: redirect to hub dashboard or login
  {
    path: "/:pathMatch(.*)*",
    redirect: () => (session.isLoggedIn ? "/hub/dashboard" : "/account/login"),
  },
]

const router = createRouter({
  history: createWebHistory("/frontend"),
  routes,
})

// Validate session server-side once per app load (not on every navigation)
let sessionValidated = false

router.beforeEach(async (to) => {
  // On first protected-route visit, confirm the session is still alive server-side.
  // This catches the case where the Frappe sid cookie has expired but user_id cookie
  // is still present (so session.isLoggedIn reads true client-side).
  if (!to.meta.public && !sessionValidated) {
    sessionValidated = true
    const valid = await session.validate()
    if (!valid) {
      return { name: "Login", query: { redirect: to.fullPath } }
    }
  }

  if (!to.meta.public && !session.isLoggedIn) {
    return { name: "Login", query: { redirect: to.fullPath } }
  }
  if (to.name === "Login" && session.isLoggedIn) {
    return { name: "HubDashboard" }
  }
})

export default router
