import { defineStore } from "pinia"
import { ref } from "vue"

export const useErrorStore = defineStore("error", () => {
  const errors = ref([])

  function addError(error) {
    const err = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message: error.message || "Unknown error",
      type: error.type || "error",
      context: error.context || {}
    }
    errors.value.push(err)
  }

  function removeError(id) {
    errors.value = errors.value.filter(e => e.id !== id)
  }

  function clearErrors() {
    errors.value = []
  }

  return {
    errors,
    addError,
    removeError,
    clearErrors
  }
})
