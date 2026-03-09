import { createResource } from "frappe-ui"

/**
 * Base API client with standardized error handling
 * Uses frappe-ui's createResource for consistency
 */
export class BaseAPIClient {
	constructor() {
		this.defaultOptions = {
			onError: this.handleError.bind(this),
			onSuccess: this.handleSuccess.bind(this),
		}
	}

	/**
	 * Create Frappe resource with standard options
	 * @param {Object} config - Resource configuration
	 * @returns {Object} Frappe resource instance
	 */
	createResource(config) {
		return createResource({
			...this.defaultOptions,
			...config,
		})
	}

	/**
	 * Standardized error handler
	 * @param {Object|Error} error - Error object
	 * @returns {Object} Error response
	 */
	handleError(error) {
		// Extract error message
		const message = error?.exc_type
			? error.exc_type
			: error?.message || "An unexpected error occurred"

		// Store error in global error state (async to avoid blocking)
		import("../../stores/errorStore")
			.then(({ useErrorStore }) => {
				const errorStore = useErrorStore()
				errorStore.addError({ message, type: "api_error", context: error })
			})
			.catch(() => {
				// Fail silently if store not available
			})

		return { error: message }
	}

	/**
	 * Success handler with optional logging
	 * @param {*} data - Response data
	 * @returns {*} Response data
	 */
	handleSuccess(data) {
		return data
	}

	/**
	 * Call Frappe method directly (for non-resource calls)
	 * @param {string} method - Frappe method path (e.g., 'councilsonline.api.create_draft_request')
	 * @param {Object} args - Method arguments
	 * @returns {Promise<*>} Response data
	 */
	async call(method, args = {}) {
		try {
			const headers = {
				"Content-Type": "application/json",
			}

			// Always read fresh CSRF token from cookie (SPA login may have changed it)
			const csrfCookie = document.cookie
				.split("; ")
				.find((row) => row.startsWith("csrf_token="))
			if (csrfCookie) {
				const freshToken = csrfCookie.split("=")[1]
				if (freshToken) {
					window.csrf_token = freshToken
				}
			}
			if (window.csrf_token) {
				headers["X-Frappe-CSRF-Token"] = window.csrf_token
			}

			const response = await fetch("/api/method/" + method, {
				method: "POST",
				headers: headers,
				credentials: "include",
				body: JSON.stringify(args),
			})

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`)
			}

			const data = await response.json()

			if (data.exc) {
				throw new Error(data.exc)
			}

			return data.message
		} catch (error) {
			this.handleError(error)
			throw error
		}
	}

	/**
	 * Upload file to Frappe
	 * @param {File} file - File object
	 * @param {Object} options - Upload options (doctype, docname, fieldname, etc.)
	 * @returns {Promise<Object>} File document
	 */
	async uploadFile(file, options = {}) {
		const maxRetries = 3
		const retryDelay = 1000 // Start with 1 second

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

				// Always read fresh CSRF token from cookie
				const csrfCookie = document.cookie
					.split("; ")
					.find((row) => row.startsWith("csrf_token="))
				if (csrfCookie) {
					const freshToken = csrfCookie.split("=")[1]
					if (freshToken) {
						window.csrf_token = freshToken
					}
				}
				if (window.csrf_token) {
					headers["X-Frappe-CSRF-Token"] = window.csrf_token
				}

				const response = await fetch("/api/method/upload_file", {
					method: "POST",
					headers: headers,
					credentials: "include",
					body: formData,
				})

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}))

					// Check if it's a file not found error (OSError) that can be retried
					if (
						response.status === 500 &&
						errorData.exc_type === "OSError" &&
						attempt < maxRetries
					) {
						const waitTime = retryDelay * Math.pow(2, attempt) // Exponential backoff
						await new Promise((resolve) => setTimeout(resolve, waitTime))
						continue // Retry
					}

					throw new Error(
						`Upload failed (${response.status}): ${errorData.exception || response.statusText}`,
					)
				}

				const data = await response.json()

				if (data.exc) {
					// Check if it's an OSError that can be retried
					if (data.exc_type === "OSError" && attempt < maxRetries) {
						const waitTime = retryDelay * Math.pow(2, attempt)
						await new Promise((resolve) => setTimeout(resolve, waitTime))
						continue // Retry
					}
					throw new Error(data.exc)
				}

				// Success - return the uploaded file
				return data.message
			} catch (error) {
				// If this is the last attempt, throw the error
				if (attempt === maxRetries) {
					this.handleError(error)
					throw error
				}

				// For other errors on non-final attempts, retry with backoff
				const waitTime = retryDelay * Math.pow(2, attempt)
				await new Promise((resolve) => setTimeout(resolve, waitTime))
			}
		}
	}
}

export const apiClient = new BaseAPIClient()
