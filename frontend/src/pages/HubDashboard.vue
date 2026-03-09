<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <!-- Hero strip -->
    <div class="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div class="flex items-center gap-4">
            <!-- Avatar -->
            <div class="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <span class="text-xl font-bold text-white">{{ initials }}</span>
            </div>
            <div>
              <p class="text-blue-200 text-xs font-medium uppercase tracking-wide">Welcome back</p>
              <h1 class="text-2xl font-bold text-white leading-tight">{{ fullName }}</h1>
              <p v-if="profile" class="text-blue-200 text-sm mt-0.5">
                {{ profile.company_name || profile.trading_name || profile.business_type || 'Agent' }}
              </p>
            </div>
          </div>

          <!-- Hero actions -->
          <div class="flex gap-2 flex-shrink-0">
            <a
              v-if="firstCouncilUrl"
              :href="firstCouncilUrl"
              target="_blank"
              class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-blue-700 text-sm font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              New Application
            </a>
            <router-link
              to="/hub/councils"
              class="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/15 border border-white/30 text-white text-sm font-semibold rounded-xl hover:bg-white/25 transition-colors"
            >
              My Councils
            </router-link>
          </div>
        </div>

        <!-- Stats row inside hero -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
          <div v-for="stat in heroStats" :key="stat.label"
            class="bg-white/10 border border-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
            <p class="text-2xl font-bold text-white">
              <span v-if="requestsLoading" class="inline-block w-8 h-7 bg-white/20 rounded animate-pulse"></span>
              <span v-else>{{ stat.value }}</span>
            </p>
            <p class="text-blue-200 text-xs mt-0.5">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content grid -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- ── MAIN COLUMN (2/3) ── -->
        <div class="lg:col-span-2 space-y-6">

          <!-- Applications card -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <!-- Card header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 class="text-base font-semibold text-gray-900">Recent Applications</h2>
                <p class="text-xs text-gray-400 mt-0.5">Across all your councils</p>
              </div>
              <button
                @click="showFilters = !showFilters"
                class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                Filter
              </button>
            </div>

            <!-- Filter bar (collapsible) -->
            <div v-if="showFilters" class="flex flex-wrap gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
              <select v-model="filterCouncil"
                class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Councils</option>
                <option v-for="c in councilOptions" :key="c" :value="c">{{ c }}</option>
              </select>
              <select v-model="filterStatus"
                class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="">All Statuses</option>
                <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
              <input v-model="filterText" type="text" placeholder="Search applications…"
                class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-36 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              <button @click="loadRequests" :disabled="requestsLoading"
                class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Refresh
              </button>
            </div>

            <!-- Skeleton loading -->
            <div v-if="requestsLoading" class="divide-y divide-gray-50">
              <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-6 py-4 animate-pulse">
                <div class="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0"></div>
                <div class="flex-1 space-y-1.5">
                  <div class="h-3.5 bg-gray-200 rounded w-32"></div>
                  <div class="h-3 bg-gray-100 rounded w-48"></div>
                </div>
                <div class="h-5 bg-gray-200 rounded-full w-20"></div>
                <div class="h-3 bg-gray-100 rounded w-16"></div>
              </div>
            </div>

            <!-- Empty state -->
            <div v-else-if="!displayedRequests.length" class="px-6 py-14 text-center">
              <div class="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p class="text-sm font-medium text-gray-700">No applications yet</p>
              <p class="text-xs text-gray-400 mt-1 mb-4">
                {{ filterCouncil || filterStatus || filterText ? 'Try clearing filters' : 'Register with a council and submit your first application' }}
              </p>
              <router-link to="/hub/councils"
                class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                Browse Councils →
              </router-link>
            </div>

            <!-- Applications list -->
            <div v-else class="divide-y divide-gray-50">
              <div
                v-for="req in displayedRequests" :key="req.request_number"
                @click="openRequest(req)"
                class="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <!-- Status dot -->
                <div class="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" :class="statusDot(req.workflow_state)"></div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-blue-600 group-hover:text-blue-700 truncate">
                    {{ req.request_number }}
                    <span class="text-gray-400 font-normal ml-1">·</span>
                    <span class="text-gray-600 font-normal ml-1">{{ req.request_type || 'Application' }}</span>
                  </p>
                  <p class="text-xs text-gray-400 mt-0.5 truncate">{{ req.council_name }}</p>
                </div>

                <!-- Status badge -->
                <span class="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium" :class="statusClass(req.workflow_state)">
                  {{ req.workflow_state || 'Draft' }}
                </span>

                <!-- Date -->
                <span class="flex-shrink-0 text-xs text-gray-400 hidden sm:block">{{ formatDate(req.submitted_date) }}</span>

                <!-- Arrow -->
                <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            <!-- Show more footer -->
            <div v-if="!requestsLoading && filteredRequests.length > 10"
              class="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
              <p class="text-xs text-gray-400">Showing {{ displayedRequests.length }} of {{ filteredRequests.length }}</p>
              <button @click="showAll = !showAll"
                class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                {{ showAll ? 'Show less' : `Show all ${filteredRequests.length}` }}
              </button>
            </div>
          </div>
        </div>

        <!-- ── SIDEBAR (1/3) ── -->
        <div class="space-y-4">

          <!-- Profile card -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <!-- Profile skeleton -->
            <div v-if="profileLoading" class="animate-pulse space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                <div class="space-y-1.5 flex-1">
                  <div class="h-3.5 bg-gray-200 rounded w-32"></div>
                  <div class="h-3 bg-gray-100 rounded w-20"></div>
                </div>
              </div>
              <div class="h-3 bg-gray-100 rounded w-full"></div>
              <div class="h-3 bg-gray-100 rounded w-3/4"></div>
            </div>

            <div v-else-if="profile">
              <div class="flex items-start gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span class="text-sm font-bold text-blue-700">{{ initials }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ fullName }}</p>
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mt-1">
                    {{ profile.business_type || 'Agent' }}
                  </span>
                </div>
              </div>

              <!-- Specialties -->
              <div v-if="profile.specialties && profile.specialties.length" class="flex flex-wrap gap-1.5 mb-4">
                <span v-for="s in profile.specialties" :key="s"
                  class="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600">
                  {{ s }}
                </span>
              </div>

              <router-link to="/hub/profile"
                class="flex items-center justify-center gap-1.5 w-full py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                Edit Profile
              </router-link>
            </div>
          </div>

          <!-- Councils card -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold text-gray-900">Your Councils</h3>
              <router-link to="/hub/councils" class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                Manage →
              </router-link>
            </div>

            <div v-if="requestsLoading" class="space-y-2 animate-pulse">
              <div v-for="i in 3" :key="i" class="h-8 bg-gray-100 rounded-lg"></div>
            </div>

            <div v-else-if="registeredCouncils.length === 0" class="text-center py-4">
              <p class="text-xs text-gray-400 mb-3">No councils registered yet</p>
              <router-link to="/hub/councils"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                Browse Councils →
              </router-link>
            </div>

            <div v-else class="space-y-1">
              <a
                v-for="council in registeredCouncils.slice(0, 4)" :key="council.name"
                :href="council.url + '/frontend/'"
                target="_blank"
                class="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                  <span class="text-sm text-gray-700 truncate">{{ council.name }}</span>
                </div>
                <span class="text-xs text-blue-500 group-hover:text-blue-700 flex-shrink-0 ml-2">Open →</span>
              </a>
              <p v-if="registeredCouncils.length > 4" class="text-xs text-gray-400 px-3 pt-1">
                +{{ registeredCouncils.length - 4 }} more
              </p>
            </div>
          </div>

          <!-- Company details card (company agents only) -->
          <div v-if="profile && isCompanyAgent" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Company Details</h3>
            <div class="space-y-2">
              <div v-if="profile.company_number" class="flex items-center justify-between text-sm">
                <span class="text-gray-400">Company No.</span>
                <span class="text-gray-900 font-medium font-mono text-xs">{{ profile.company_number }}</span>
              </div>
              <div v-if="profile.gst_number" class="flex items-center justify-between text-sm">
                <span class="text-gray-400">GST</span>
                <span class="text-gray-900 font-medium font-mono text-xs">{{ profile.gst_number }}</span>
              </div>
              <div v-if="profile.physical_city" class="flex items-center justify-between text-sm">
                <span class="text-gray-400">City</span>
                <span class="text-gray-900 font-medium text-xs">{{ profile.physical_city }}</span>
              </div>
              <div v-if="profile.business_phone" class="flex items-center justify-between text-sm">
                <span class="text-gray-400">Phone</span>
                <span class="text-gray-900 font-medium text-xs">{{ profile.business_phone }}</span>
              </div>
            </div>

            <div v-if="profile.directors && profile.directors.length" class="mt-4 pt-4 border-t border-gray-100">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Directors</p>
              <div class="space-y-1">
                <p v-for="d in profile.directors" :key="d.email || d.first_name"
                  class="text-xs text-gray-700">
                  {{ d.first_name }} {{ d.last_name }}
                </p>
              </div>
            </div>

            <div v-if="profile.authorising_officer" class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Authorising Officer</p>
              <p class="text-xs text-gray-700">
                {{ profile.authorising_officer.first_name }} {{ profile.authorising_officer.last_name }}
              </p>
              <p v-if="profile.authorising_officer.email" class="text-xs text-gray-400 truncate">
                {{ profile.authorising_officer.email }}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/services/api/base'
import HubNav from '@/components/HubNav.vue'
import { session } from '@/data/session'

const allRequests = ref([])
const requestsLoading = ref(false)
const showFilters = ref(false)
const showAll = ref(false)
const filterCouncil = ref('')
const filterStatus = ref('')
const filterText = ref('')

const profile = ref(null)
const profileLoading = ref(true)

// ── Computed ──────────────────────────────────────────────

const fullName = computed(() => {
  if (!profile.value) return session.user || ''
  const u = profile.value
  if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`
  return u.company_name || u.trading_name || session.user || ''
})

const initials = computed(() => {
  const name = fullName.value || session.user || ''
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
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

const displayedRequests = computed(() =>
  showAll.value ? filteredRequests.value : filteredRequests.value.slice(0, 10)
)

const heroStats = computed(() => [
  { label: 'Total', value: allRequests.value.length },
  { label: 'In Progress', value: allRequests.value.filter(r => r.workflow_state && !['Approved', 'Granted', 'Declined', 'Withdrawn'].includes(r.workflow_state)).length },
  { label: 'Approved', value: allRequests.value.filter(r => ['Approved', 'Granted'].includes(r.workflow_state)).length },
  { label: 'Councils', value: councilOptions.value.length },
])

const registeredCouncils = computed(() => {
  const seen = new Map()
  allRequests.value.forEach(r => {
    if (r.council_name && r.council_url && !seen.has(r.council_name)) {
      seen.set(r.council_name, { name: r.council_name, url: r.council_url })
    }
  })
  return [...seen.values()]
})

const firstCouncilUrl = computed(() => {
  if (registeredCouncils.value.length) return registeredCouncils.value[0].url + '/frontend/'
  return null
})

// ── Helpers ───────────────────────────────────────────────

function statusClass(state) {
  if (!state) return 'bg-gray-100 text-gray-600'
  if (['Approved', 'Granted'].includes(state)) return 'bg-green-100 text-green-700'
  if (['Declined', 'Withdrawn'].includes(state)) return 'bg-red-100 text-red-700'
  if (['Submitted', 'Under Review', 'Processing'].includes(state)) return 'bg-blue-100 text-blue-700'
  return 'bg-amber-100 text-amber-700'
}

function statusDot(state) {
  if (!state) return 'bg-gray-300'
  if (['Approved', 'Granted'].includes(state)) return 'bg-green-500'
  if (['Declined', 'Withdrawn'].includes(state)) return 'bg-red-400'
  if (['Submitted', 'Under Review', 'Processing'].includes(state)) return 'bg-blue-500'
  return 'bg-amber-400'
}

function formatDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

function openRequest(req) {
  if (req.council_url && req.request_number) {
    window.open(req.council_url + '/frontend/request/' + req.request_number, '_blank')
  }
}

// ── Data loading ──────────────────────────────────────────

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
  requestsLoading.value = true
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.aggregate_requests')
    allRequests.value = result || []
  } catch {
    allRequests.value = []
  } finally {
    requestsLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
  loadRequests()
})
</script>
