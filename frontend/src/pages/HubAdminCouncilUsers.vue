<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Back link -->
      <div class="mb-6">
        <router-link to="/hub/admin/councils"
          class="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Councils
        </router-link>
      </div>

      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Council Users</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Users provisioned to council
            <span class="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ councilCode }}</span>
          </p>
        </div>
        <router-link :to="`/hub/admin/councils/${councilCode}/settings`"
          class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
          Settings
        </router-link>
      </div>

      <div v-if="!isAdmin" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
        System Manager access required.
      </div>

      <div v-else-if="loading" class="text-sm text-gray-400 text-center py-16">Loading…</div>

      <div v-else>
        <div v-if="!users.length" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          No users provisioned to this council yet.
        </div>

        <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Role / Type</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Last Login</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="u in users" :key="u.email" class="hover:bg-gray-50 transition-colors">
                <td class="px-5 py-3 font-medium text-gray-900">{{ u.full_name || u.email }}</td>
                <td class="px-5 py-3 text-gray-500 text-xs hidden sm:table-cell">{{ u.email }}</td>
                <td class="px-5 py-3 text-gray-500 text-xs hidden md:table-cell">{{ u.user_type || '—' }}</td>
                <td class="px-5 py-3 text-gray-400 text-xs hidden lg:table-cell">
                  {{ u.last_login ? formatDate(u.last_login) : 'Never' }}
                </td>
                <td class="px-5 py-3">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    :class="u.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
                    {{ u.enabled ? 'Active' : 'Disabled' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="mt-3 text-xs text-gray-400 text-right">{{ users.length }} user{{ users.length !== 1 ? 's' : '' }}</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import HubNav from '@/components/HubNav.vue'
import { apiClient } from '@/services/api/base'

const route = useRoute()
const councilCode = route.params.councilCode

const users = ref([])
const loading = ref(true)
const isAdmin = ref(false)

onMounted(async () => {
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.get_council_users', {
      council_code: councilCode,
    })
    users.value = result || []
    isAdmin.value = true
  } catch {
    isAdmin.value = false
  }
  loading.value = false
})

function formatDate(dt) {
  if (!dt) return ''
  try {
    return new Date(dt).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dt
  }
}
</script>
