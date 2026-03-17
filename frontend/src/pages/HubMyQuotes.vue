<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <router-link to="/hub/dashboard"
            class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Dashboard
          </router-link>
          <h1 class="text-2xl font-bold text-gray-900">My Quote History</h1>
          <p class="text-sm text-gray-500 mt-1">All quotes submitted across your registered councils</p>
        </div>
      </div>

      <!-- Status filter pills -->
      <div class="flex flex-wrap gap-2 mb-6">
        <button v-for="f in filters" :key="f.value"
          @click="activeFilter = f.value"
          :class="activeFilter === f.value
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'"
          class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors">
          {{ f.label }}
          <span v-if="countByStatus[f.value] !== undefined"
            class="ml-1 opacity-75">({{ countByStatus[f.value] }})</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="h-20 bg-white rounded-xl border border-gray-100 animate-pulse"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!filteredQuotes.length" class="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p class="text-gray-500 text-sm">No quotes found</p>
        <p class="text-gray-400 text-xs mt-1">
          {{ activeFilter === 'All' ? 'You have not been invited to quote on any applications yet.' : 'No quotes with this status.' }}
        </p>
      </div>

      <!-- Quote list -->
      <div v-else class="space-y-3">
        <div v-for="quote in filteredQuotes" :key="quote.name"
          class="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 truncate">
                {{ quote.request_type || quote.request_number || quote.request }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ quote.council_name }} · {{ formatDate(quote.invited_at) }}
              </p>
              <p v-if="quote.request_number" class="text-xs text-gray-400 mt-0.5">
                Ref: {{ quote.request_number }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span :class="statusClass(quote.status)"
                class="text-xs font-semibold px-2 py-0.5 rounded-full">
                {{ quote.status }}
              </span>
              <span v-if="quote.total_amount || quote.fee_estimate" class="text-xs font-medium text-gray-700">
                ${{ fmt(quote.total_amount || quote.fee_estimate) }}
              </span>
            </div>
          </div>

          <!-- Action: open on council site -->
          <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span class="text-xs text-gray-400">
              {{ quote.estimated_days ? quote.estimated_days + ' working days' : '' }}
            </span>
            <a v-if="quote.council_url && quote.request"
              :href="`${quote.council_url}/frontend/request/${quote.request}/my-quote`"
              target="_blank"
              class="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
              View quote
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/services/api/base'
import HubNav from '@/components/HubNav.vue'

const ALL_STATUSES = ['Invited', 'Drafting', 'Quoted', 'Accepted', 'Declined', 'Withdrawn']

const quotes = ref([])
const loading = ref(true)
const activeFilter = ref('All')

const filters = [
  { label: 'All', value: 'All' },
  { label: 'Pending', value: 'Invited' },
  { label: 'Quoted', value: 'Quoted' },
  { label: 'Accepted', value: 'Accepted' },
  { label: 'Declined', value: 'Declined' },
]

const countByStatus = computed(() => {
  const counts = { All: quotes.value.length }
  for (const s of ALL_STATUSES) {
    counts[s] = quotes.value.filter(q => q.status === s).length
  }
  return counts
})

const filteredQuotes = computed(() => {
  if (activeFilter.value === 'All') return quotes.value
  return quotes.value.filter(q => q.status === activeFilter.value)
})

function statusClass(status) {
  const map = {
    Invited: 'bg-amber-100 text-amber-700',
    Drafting: 'bg-blue-100 text-blue-700',
    Quoted: 'bg-green-100 text-green-700',
    Accepted: 'bg-green-100 text-green-800',
    Declined: 'bg-red-100 text-red-600',
    Withdrawn: 'bg-gray-100 text-gray-500',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

function fmt(val) {
  return Number(val || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

onMounted(async () => {
  try {
    quotes.value = await apiClient.call('councilsonlinehub.api.hub.get_agent_quote_history') || []
  } catch (e) {
    console.error('Failed to load quote history', e)
    quotes.value = []
  } finally {
    loading.value = false
  }
})
</script>
