<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <!-- Hero -->
    <div class="bg-gradient-to-br from-blue-900 via-blue-700 to-sky-500 text-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 class="text-3xl sm:text-4xl font-black mb-2">Agent Marketplace</h1>
        <p class="text-blue-200 text-base sm:text-lg max-w-xl">
          Find a licensed professional to help with your resource consent, building consent or other application.
        </p>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">

      <!-- Register as Agent CTA -->
      <div class="mb-6 p-4 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 class="text-sm font-semibold text-purple-900">Are you a professional agent?</h4>
          <p class="text-sm text-purple-700">Register on the hub to list your services and connect with applicants across all participating councils.</p>
        </div>
        <router-link
          to="/hub/agents/join"
          class="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors whitespace-nowrap flex-shrink-0"
        >
          Register as an Agent
        </router-link>
      </div>

      <!-- Search & Filters -->
      <div class="mb-6 flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search agents by name or specialty..."
            class="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
            @input="debouncedSearch"
          />
        </div>
        <select
          v-if="filterOptions.services.length"
          v-model="selectedService"
          class="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand text-sm"
          @change="loadAgents"
        >
          <option value="">All Services</option>
          <option v-for="svc in filterOptions.services" :key="svc" :value="svc">{{ svc }}</option>
        </select>
        <select
          v-if="filterOptions.areas.length"
          v-model="selectedArea"
          class="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand text-sm"
          @change="loadAgents"
        >
          <option value="">All Areas</option>
          <option v-for="area in filterOptions.areas" :key="area" :value="area">{{ area }}</option>
        </select>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="i in 6" :key="i" class="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
          <div class="flex items-start gap-4 mb-4">
            <div class="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-32"></div>
              <div class="h-3 bg-gray-100 rounded w-20"></div>
            </div>
          </div>
          <div class="space-y-2">
            <div class="h-3 bg-gray-100 rounded w-full"></div>
            <div class="h-3 bg-gray-100 rounded w-3/4"></div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!agents.length" class="text-center py-16">
        <svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 class="mt-4 text-lg font-semibold text-gray-900">No agents found</h3>
        <p class="mt-2 text-sm text-gray-500">
          {{ searchQuery || selectedService || selectedArea ? 'Try adjusting your filters' : 'No agents are currently listed' }}
        </p>
      </div>

      <!-- Agent Cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="agent in agents"
          :key="agent.name"
          class="bg-white rounded-2xl border border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
          @click="viewProfile(agent.name)"
        >
          <div class="p-6">
            <!-- Header -->
            <div class="flex items-start gap-4 mb-4">
              <div v-if="agent.profile_image" class="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                <img :src="agent.profile_image" :alt="agent.display_name" class="w-full h-full object-cover" />
              </div>
              <div v-else class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center flex-shrink-0">
                <span class="text-xl font-bold text-white">{{ getInitials(agent.display_name) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="text-base font-semibold text-gray-900 truncate">{{ agent.display_name }}</h3>
                <p class="text-sm text-gray-500">{{ agent.business_type }}</p>
                <div v-if="agent.company_name" class="text-xs text-gray-400 truncate">{{ agent.company_name }}</div>
              </div>
            </div>

            <!-- Rating -->
            <div class="flex items-center gap-1.5 mb-3">
              <div class="flex">
                <svg v-for="star in 5" :key="star" class="w-4 h-4"
                  :class="star <= Math.round(agent.average_rating) ? 'text-yellow-400' : 'text-gray-200'"
                  fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <span class="text-sm text-gray-600">{{ (agent.average_rating || 0).toFixed(1) }}</span>
              <span class="text-sm text-gray-400">({{ agent.total_reviews }})</span>
            </div>

            <!-- Bio -->
            <p v-if="agent.bio" class="text-sm text-gray-600 mb-3 line-clamp-2">{{ agent.bio }}</p>

            <!-- Services tags -->
            <div v-if="agent.services?.length" class="flex flex-wrap gap-1.5 mb-3">
              <span v-for="svc in agent.services.slice(0, 3)" :key="svc"
                class="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-light/30 text-brand">
                {{ svc }}
              </span>
              <span v-if="agent.services.length > 3" class="text-xs text-gray-400">+{{ agent.services.length - 3 }} more</span>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
              <span v-if="agent.years_experience">{{ agent.years_experience }} yrs experience</span>
              <span>{{ agent.total_applications }} applications</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { apiClient } from '@/services/api/base'
import HubNav from '@/components/HubNav.vue'

const router = useRouter()

const agents = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedService = ref('')
const selectedArea = ref('')
const filterOptions = ref({ services: [], areas: [] })

let searchTimeout = null
function debouncedSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadAgents, 300)
}

async function loadAgents() {
  loading.value = true
  try {
    const result = await apiClient.call(
      'councilsonlinehub.api.hub.get_agent_listings',
      {
        search: searchQuery.value || null,
        service: selectedService.value || null,
        area: selectedArea.value || null,
      }
    )
    agents.value = result?.agents || []
  } catch {
    agents.value = []
  } finally {
    loading.value = false
  }
}

async function loadFilters() {
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.get_agent_marketplace_filters')
    filterOptions.value = result || { services: [], areas: [] }
  } catch {
    filterOptions.value = { services: [], areas: [] }
  }
}

function viewProfile(agentName) {
  router.push({ name: 'HubAgentDetail', params: { id: agentName } })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

onMounted(async () => {
  await Promise.all([loadAgents(), loadFilters()])
})
</script>
