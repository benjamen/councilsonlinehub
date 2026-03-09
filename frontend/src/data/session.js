import { computed, reactive } from "vue"
import { createResource } from "frappe-ui"

export function sessionUser() {
  const cookies = new URLSearchParams(document.cookie.split("; ").join("&"))
  const user = cookies.get("user_id")
  return user === "Guest" ? null : (user || null)
}

function refreshCsrfToken() {
  const csrfCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf_token="))
  if (csrfCookie) {
    window.csrf_token = csrfCookie.split("=")[1]
  }
}

export const session = reactive({
  user: sessionUser(),
  isLoggedIn: computed(() => !!session.user),

  logout: createResource({
    url: "logout",
    onSuccess() {
      session.user = null
      window.location.href = "/frontend/account/login"
    },
  }),
})
