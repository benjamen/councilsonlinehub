<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      <!-- Agent/Company header card -->
      <div v-if="profile" class="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <!-- Avatar / initials -->
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span class="text-xl font-bold text-blue-700">{{ initials }}</span>
        </div>

        <!-- Identity -->
        <div class="flex-1 min-w-0">
          <h2 class="text-lg font-semibold text-gray-900 truncate">
            {{ profile.company_name || profile.trading_name || 'Your Company' }}
          </h2>
          <p v-if="profile.trading_name && profile.trading_name !== profile.company_name"
             class="text-sm text-gray-500 truncate">Trading as {{ profile.trading_name }}</p>
          <div class="flex flex-wrap gap-2 mt-1.5">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              {{ profile.business_type || 'Agent' }}
            </span>
            <span v-for="s in (profile.specialties || []).slice(0, 3)" :key="s"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {{ s }}
            </span>
            <span v-if="(profile.specialties || []).length > 3"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              +{{ profile.specialties.length - 3 }} more
            </span>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="flex gap-2 flex-shrink-0">
          <router-link to="/hub/profile"
            class="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            Edit Profile
          </router-link>
          <router-link to="/hub/councils"
            class="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            My Councils
          </router-link>
        </div>
      </div>

      <!-- Skeleton while profile loading -->
      <div v-else-if="profileLoading" class="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex items-center gap-4 animate-pulse">
        <div class="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-200 rounded w-48"></div>
          <div class="h-3 bg-gray-100 rounded w-32"></div>
        </div>
      </div>

      <!-- Company details card (company agents only) -->
      <div v-if="profile && isCompanyAgent" class="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">Company Details</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div v-if="profile.company_number" class="flex justify-between">
            <span class="text-gray-500">Company #</span>
            <span class="text-gray-900 font-medium">{{ profile.company_number }}</span>
          </div>
          <div v-if="profile.gst_number" class="flex justify-between">
            <span class="text-gray-500">GST #</span>
            <span class="text-gray-900 font-medium">{{ profile.gst_number }}</span>
          </div>
          <div v-if="profile.physical_city" class="flex justify-between">
            <span class="text-gray-500">City</span>
            <span class="text-gray-900 font-medium">{{ profile.physical_city }}</span>
          </div>
          <div v-if="profile.business_phone" class="flex justify-between">
            <span class="text-gray-500">Phone</span>
            <span class="text-gray-900 font-medium">{{ profile.business_phone }}</span>
          </div>
        </div>

        <!-- Directors -->
        <div v-if="profile.directors && profile.directors.length" class="mt-4 pt-4 border-t border-gray-100">
          <p class="text-xs font-semibold text-gray-500 uppercase mb-2">Directors</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="d in profile.directors" :key="d.email || d.first_name"
              class="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              {{ d.first_name }} {{ d.last_name }}
            </span>
          </div>
        </div>

        <!-- Authorising Officer -->
        <div v-if="profile.authorising_officer" class="mt-3 pt-3 border-t border-gray-100">
          <p class="text-xs font-semibold text-gray-500 uppercase mb-1">Authorising Officer</p>
          <p class="text-sm text-gray-800">
            {{ profile.authorising_officer.first_name }} {{ profile.authorising_officer.last_name }}
            <span v-if="profile.authorising_officer.email" class="text-gray-500 ml-1">
              — {{ profile.authorising_officer.email }}
            </span>
          </p>
        </div>
      </div>

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
import HubNav from '@/components/HubNav.vue'
import { session } from '@/data/session'

const allRequests = ref([])
const loading = ref(false)
const filterCouncil = ref('')
const filterStatus = ref('')
const filterText = ref('')

const profile = ref(null)
const profileLoading = ref(true)

const initials = computed(() => {
  const name = profile.value?.company_name || profile.value?.trading_name || session.user || ''
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
})

const isCompanyAgent = computed(() => {
  if (!profile.value) return false
  const type = (profile.value.business_type || '').toLowerCase()
  return type.includes('company') || type.includes('ltd') || type.includes('limited') ||
    !!profile.value.company_number || !!(profile.value.directors && profile.value.directors.length)
})

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

async function loadProfile() {
  profileLoading.value = true
  try {
    profile.value = await apiClient.call('councilsonlinehub.api.hub.get_hub_profile')
  } catch {
    profile.value = null
  } finally {
    profileLoading.value = false
  }
}

async function loadRequests() {
  loading.value = true
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.aggregate_requests')
    allRequests.value = result || []
  } catch (e) {
    allRequests.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProfile()
  loadRequests()
})
</script>
