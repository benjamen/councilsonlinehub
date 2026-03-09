import { createPinia } from "pinia"
import piniaPluginPersistedstate from "pinia-plugin-persistedstate"
import { createApp } from "vue"
import { frappeRequest, resourcesPlugin, setConfig } from "frappe-ui"

import App from "./App.vue"
import router from "./router"
import "./index.css"

const app = createApp(App)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

setConfig("resourceFetcher", frappeRequest)

app.use(pinia)
app.use(router)
app.use(resourcesPlugin)

async function initApp() {
	// Ensure CSRF token is available
	if (!window.csrf_token) {
		const csrfCookie = document.cookie
			.split("; ")
			.find((row) => row.startsWith("csrf_token="))
		if (csrfCookie) {
			window.csrf_token = csrfCookie.split("=")[1]
		}
	}
	app.mount("#app")
}

initApp()
