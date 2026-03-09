<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Councils</h1>
          <p class="text-sm text-gray-500 mt-0.5">Councils where you can submit applications</p>
        </div>
      </div>

      <div v-if="loading" class="text-sm text-gray-500 text-center py-16">Loading...</div>

      <div v-else class="space-y-4">
        <div v-if="!councils.length" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          No councils configured. Contact your administrator.
        </div>

        <div
          v-for="c in councils" :key="c.council_code"
          class="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-medium text-gray-900">{{ c.council_name }}</p>
                <span v-if="c.registered"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Registered
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5 truncate">{{ c.api_url }}</p>
              <p v-if="c.registered && c.application_count != null" class="text-xs text-gray-500 mt-1">
                {{ c.application_count }} application{{ c.application_count !== 1 ? 's' : '' }} submitted
              </p>
            </div>

            <div class="flex gap-2 flex-shrink-0">
              <a
                v-if="c.registered"
                :href="c.api_url + '/frontend/'"
                target="_blank"
                class="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Open Portal
              </a>
              <a
                v-else
                :href="c.api_url + '/frontend/account/login'"
                target="_blank"
                class="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Register
              </a>
            </div>
          </div>

          <!-- Registered: quick links -->
          <div v-if="c.registered" class="mt-3 pt-3 border-t border-gray-100 flex gap-4">
            <a :href="c.api_url + '/frontend/'" target="_blank" class="text-xs text-blue-600 hover:underline">
              New application →
            </a>
            <a :href="c.api_url + '/frontend/account/profile'" target="_blank" class="text-xs text-blue-600 hover:underline">
              Your profile →
            </a>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HubNav from '@/components/HubNav.vue'
import { apiClient } from '@/services/api/base'

const councils = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [registry, requests] = await Promise.allSettled([
      apiClient.call('councilsonlinehub.api.hub.get_council_registry'),
      apiClient.call('councilsonlinehub.api.hub.aggregate_requests'),
    ])

    const raw = registry.value || []
    const reqs = requests.value || []

    const countByCode = {}
    reqs.forEach(r => {
      if (r.council_code) countByCode[r.council_code] = (countByCode[r.council_code] || 0) + 1
    })
    const activeCodes = new Set(Object.keys(countByCode))

    councils.value = raw
      .map(c => ({
        ...c,
        registered: activeCodes.has(c.council_code),
        application_count: countByCode[c.council_code] ?? null,
      }))
      .sort((a, b) => (b.registered ? 1 : 0) - (a.registered ? 1 : 0))
  } catch (e) {
    console.error(e)
  }
  loading.value = false
})
</script>
