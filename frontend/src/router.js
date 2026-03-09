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

// Navigation guard: redirect unauthenticated users to login
router.beforeEach((to) => {
  if (!to.meta.public && !session.isLoggedIn) {
    return { name: "Login", query: { redirect: to.fullPath } }
  }
  // Already logged in → skip login page
  if (to.name === "Login" && session.isLoggedIn) {
    return { name: "HubDashboard" }
  }
})

export default router
