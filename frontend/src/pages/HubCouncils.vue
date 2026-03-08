<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <router-link to="/hub/dashboard" class="text-gray-500 hover:text-gray-700">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </router-link>
        <h1 class="text-lg font-semibold text-gray-900">My Councils</h1>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div v-if="loading" class="text-sm text-gray-500 text-center py-16">Loading...</div>

      <div v-else class="space-y-4">
        <p class="text-sm text-gray-600">
          Click a council to visit its portal. Councils where you are registered will show your profile automatically.
        </p>

        <div v-if="!councils.length" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          No councils configured. Contact your administrator.
        </div>

        <div
          v-for="c in councils" :key="c.council_code"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center justify-between"
        >
          <div>
            <p class="font-medium text-gray-900">{{ c.council_name }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ c.api_url }}</p>
          </div>
          <a
            :href="c.api_url + '/frontend/'"
            target="_blank"
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex-shrink-0"
          >
            Visit Portal
          </a>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiClient } from '@/services/api/base'

const councils = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const data = await apiClient.call('councilsonline.api.config.get_council_config')
    // Falls back to council_registry from hub settings if available
    if (data && data.council_registry) {
      councils.value = data.council_registry
    } else {
      // Try fetching from settings directly
      const settings = await fetch('/api/method/councilsonline.api.hub.get_council_registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': window.csrf_token },
      })
      const res = await settings.json()
      councils.value = res.message || []
    }
  } catch {}
  loading.value = false
})
</script>
