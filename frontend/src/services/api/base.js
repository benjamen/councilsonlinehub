import { createResource } from "frappe-ui"
import { session } from "@/data/session"

export class BaseAPIClient {
	constructor() {
		this.defaultOptions = {
			onError: this.handleError.bind(this),
			onSuccess: this.handleSuccess.bind(this),
		}
	}

	createResource(config) {
		return createResource({ ...this.defaultOptions, ...config })
	}

	handleError(error) {
		const message = error?.exc_type
			? error.exc_type
			: error?.message || "An unexpected error occurred"

		import("../../stores/errorStore")
			.then(({ useErrorStore }) => {
				const errorStore = useErrorStore()
				errorStore.addError({ message, type: "api_error", context: error })
			})
			.catch(() => {})

		return { error: message }
	}

	handleSuccess(data) {
		return data
	}

	async call(method, args = {}) {
		try {
			const headers = { "Content-Type": "application/json" }

			// Read fresh CSRF token from cookie (SPA login may have refreshed it)
			const csrfCookie = document.cookie
				.split("; ")
				.find((row) => row.startsWith("csrf_token="))
			if (csrfCookie) {
				const freshToken = csrfCookie.split("=")[1]
				if (freshToken) window.csrf_token = freshToken
			}
			if (window.csrf_token) {
				headers["X-Frappe-CSRF-Token"] = window.csrf_token
			}

			const response = await fetch("/api/method/" + method, {
				method: "POST",
				headers,
				credentials: "include",
				body: JSON.stringify(args),
			})

			// 401/403 = Frappe session expired → redirect to login
			if (response.status === 401 || response.status === 403) {
				session.user = null
				window.location.href = "/frontend/account/login"
				return
			}

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const data = await response.json()
			if (data.exc) throw new Error(data.exc)
			return data.message
		} catch (error) {
			this.handleError(error)
			throw error
		}
	}

	async uploadFile(file, options = {}) {
		const maxRetries = 3
		const retryDelay = 1000

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				const formData = new FormData()
				formData.append("file", file)
				if (options.doctype) formData.append("doctype", options.doctype)
				if (options.docname) formData.append("docname", options.docname)
				if (options.fieldname) formData.append("fieldname", options.fieldname)
				if (options.is_private !== undefined) {
					formData.append("is_private", options.is_private ? "1" : "0")
				}

				const headers = {}
				const csrfCookie = document.cookie
					.split("; ")
					.find((row) => row.startsWith("csrf_token="))
				if (csrfCookie) {
					const freshToken = csrfCookie.split("=")[1]
					if (freshToken) window.csrf_token = freshToken
				}
				if (window.csrf_token) headers["X-Frappe-CSRF-Token"] = window.csrf_token

				const response = await fetch("/api/method/upload_file", {
					method: "POST",
					headers,
					credentials: "include",
					body: formData,
				})

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}))
					if (response.status === 500 && errorData.exc_type === "OSError" && attempt < maxRetries) {
						await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
						continue
					}
					throw new Error(`Upload failed (${response.status}): ${errorData.exception || response.statusText}`)
				}

				const data = await response.json()
				if (data.exc) {
					if (data.exc_type === "OSError" && attempt < maxRetries) {
						await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
						continue
					}
					throw new Error(data.exc)
				}
				return data.message
			} catch (error) {
				if (attempt === maxRetries) {
					this.handleError(error)
					throw error
				}
				await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
			}
		}
	}
}

export const apiClient = new BaseAPIClient()
