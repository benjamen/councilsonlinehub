<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <h1 class="text-lg font-semibold text-gray-900">My Applications</h1>
        <div class="flex items-center gap-3">
          <router-link to="/hub/profile" class="text-sm text-blue-600 hover:text-blue-800">Edit Profile</router-link>
          <router-link to="/hub/councils" class="text-sm text-blue-600 hover:text-blue-800">My Councils</router-link>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
          <p class="text-xs text-gray-500 mt-1">Total</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ stats.inProgress }}</p>
          <p class="text-xs text-gray-500 mt-1">In Progress</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p class="text-2xl font-bold text-green-600">{{ stats.approved }}</p>
          <p class="text-xs text-gray-500 mt-1">Approved</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p class="text-2xl font-bold text-gray-600">{{ stats.councils }}</p>
          <p class="text-xs text-gray-500 mt-1">Councils</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mb-4">
        <select v-model="filterCouncil" class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All Councils</option>
          <option v-for="c in councilOptions" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="filterStatus" class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
          <option value="">All Statuses</option>
          <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
        </select>
        <input v-model="filterText" type="text" placeholder="Search..." class="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-32" />
        <button @click="loadRequests" :disabled="loading" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>

      <!-- Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div v-if="loading" class="py-16 text-center text-sm text-gray-500">Loading applications...</div>
        <div v-else-if="!filteredRequests.length" class="py-16 text-center text-sm text-gray-500">
          No applications found.
        </div>
        <table v-else class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Application #</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Council</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="req in filteredRequests" :key="req.request_number"
              @click="openRequest(req)"
              class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            >
              <td class="px-4 py-3 font-medium text-blue-600">{{ req.request_number }}</td>
              <td class="px-4 py-3 text-gray-700">{{ req.request_type || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ req.council_name }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 rounded-full text-xs font-medium"
                  :class="statusClass(req.workflow_state)">
                  {{ req.workflow_state || 'Draft' }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-500">{{ req.submitted_date }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/services/api/base'

const allRequests = ref([])
const loading = ref(false)
const filterCouncil = ref('')
const filterStatus = ref('')
const filterText = ref('')

const councilOptions = computed(() => [...new Set(allRequests.value.map(r => r.council_name).filter(Boolean))])
const statusOptions = computed(() => [...new Set(allRequests.value.map(r => r.workflow_state).filter(Boolean))])

const filteredRequests = computed(() => {
  return allRequests.value.filter(r => {
    if (filterCouncil.value && r.council_name !== filterCouncil.value) return false
    if (filterStatus.value && r.workflow_state !== filterStatus.value) return false
    if (filterText.value) {
      const q = filterText.value.toLowerCase()
      if (!(r.request_number || '').toLowerCase().includes(q) &&
          !(r.request_type || '').toLowerCase().includes(q)) return false
    }
    return true
  })
})

const stats = computed(() => ({
  total: allRequests.value.length,
  inProgress: allRequests.value.filter(r => r.workflow_state && !['Approved', 'Granted', 'Declined', 'Withdrawn'].includes(r.workflow_state)).length,
  approved: allRequests.value.filter(r => ['Approved', 'Granted'].includes(r.workflow_state)).length,
  councils: councilOptions.value.length,
}))

function statusClass(state) {
  if (!state) return 'bg-gray-100 text-gray-600'
  if (['Approved', 'Granted'].includes(state)) return 'bg-green-100 text-green-700'
  if (['Declined', 'Withdrawn'].includes(state)) return 'bg-red-100 text-red-700'
  if (['Submitted', 'Under Review'].includes(state)) return 'bg-blue-100 text-blue-700'
  return 'bg-yellow-100 text-yellow-700'
}

function openRequest(req) {
  if (req.council_url && req.request_number) {
    window.open(req.council_url + '/frontend/request/' + req.request_number, '_blank')
  }
}

async function loadRequests() {
  loading.value = true
  try {
    const result = await apiClient.call('councilsonline.api.hub.aggregate_requests')
    allRequests.value = result || []
  } catch (e) {
    allRequests.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadRequests)
</script>
