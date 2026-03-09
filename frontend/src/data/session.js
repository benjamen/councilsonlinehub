import { computed, reactive } from "vue"
import { createResource } from "frappe-ui"

export function sessionUser() {
  const cookies = new URLSearchParams(document.cookie.split("; ").join("&"))
  const user = cookies.get("user_id")
  return user === "Guest" ? null : (user || null)
}

export const session = reactive({
  user: sessionUser(),
  isLoggedIn: computed(() => !!session.user),

  /** Verify session is still valid server-side. Clears user if expired. */
  async validate() {
    try {
      const resp = await fetch("/api/method/frappe.auth.get_logged_user", {
        credentials: "include",
      })
      if (!resp.ok) {
        session.user = null
        return false
      }
      const data = await resp.json()
      const user = data.message
      if (!user || user === "Guest") {
        session.user = null
        return false
      }
      session.user = user
      return true
    } catch {
      return false
    }
  },

  logout: createResource({
    url: "logout",
    onSuccess() {
      session.user = null
      window.location.href = "/frontend/account/login"
    },
  }),
})
