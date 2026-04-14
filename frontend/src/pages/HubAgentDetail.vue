<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
    </div>

    <main v-else-if="agent" class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Back -->
      <button @click="$router.back()"
        class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to Marketplace
      </button>

      <!-- Profile Card -->
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div class="flex flex-col sm:flex-row items-start gap-6">
          <!-- Avatar -->
          <div v-if="agent.profile_image" class="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
            <img :src="agent.profile_image" :alt="agent.display_name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center flex-shrink-0">
            <span class="text-3xl font-bold text-white">{{ getInitials(agent.display_name) }}</span>
          </div>

          <div class="flex-1">
            <h2 class="text-2xl font-bold text-gray-900">{{ agent.display_name }}</h2>
            <p class="text-gray-500">{{ agent.business_type }}</p>
            <div v-if="agent.company_name" class="text-sm text-gray-400 mt-1">{{ agent.company_name }}</div>

            <!-- Rating -->
            <div class="flex items-center gap-2 mt-3">
              <div class="flex">
                <svg v-for="star in 5" :key="star" class="w-5 h-5"
                  :class="star <= Math.round(agent.average_rating) ? 'text-yellow-400' : 'text-gray-200'"
                  fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <span class="font-semibold">{{ (agent.average_rating || 0).toFixed(1) }}</span>
              <span class="text-gray-400 text-sm">({{ agent.total_reviews }} reviews)</span>
            </div>

            <!-- Stats -->
            <div class="flex gap-6 mt-4 text-sm">
              <div v-if="agent.years_experience">
                <span class="font-semibold text-gray-900">{{ agent.years_experience }}</span>
                <span class="text-gray-500 ml-1">years experience</span>
              </div>
              <div>
                <span class="font-semibold text-gray-900">{{ agent.total_applications }}</span>
                <span class="text-gray-500 ml-1">applications</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bio -->
        <div v-if="agent.bio" class="mt-6 pt-6 border-t border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-2">About</h3>
          <p class="text-gray-600">{{ agent.bio }}</p>
        </div>

        <!-- Invite to Quote -->
        <div v-if="session.user && session.user !== 'Guest'" class="mt-6 pt-6 border-t border-gray-100">
          <button @click="openInviteModal"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Invite to Quote
          </button>
          <p class="text-xs text-gray-400 mt-2">Select one of your active applications to invite this agent to quote.</p>
        </div>

        <!-- Contact -->
        <div class="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-if="agent.contact_email">
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
            <a :href="'mailto:' + agent.contact_email" class="text-sm text-brand hover:underline">{{ agent.contact_email }}</a>
          </div>
          <div v-if="agent.contact_phone">
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Phone</p>
            <a :href="'tel:' + agent.contact_phone" class="text-sm text-brand hover:underline">{{ agent.contact_phone }}</a>
          </div>
          <div v-if="agent.website">
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Website</p>
            <a :href="agent.website" target="_blank" rel="noopener" class="text-sm text-brand hover:underline">{{ agent.website }}</a>
          </div>
        </div>
      </div>

      <!-- Services & Areas -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div v-if="agent.services?.length" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Services</h3>
          <div class="flex flex-wrap gap-2">
            <span v-for="svc in agent.services" :key="svc.service_name"
              class="px-3 py-1 rounded-full text-sm bg-brand-light/30 text-brand">
              {{ svc.service_name }}
            </span>
          </div>
        </div>
        <div v-if="agent.areas?.length" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Areas Served</h3>
          <div class="flex flex-wrap gap-2">
            <span v-for="area in agent.areas" :key="area.area_name"
              class="px-3 py-1 rounded-full text-sm bg-green-50 text-green-700">
              {{ area.area_name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Reviews -->
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 class="text-base font-semibold text-gray-900 mb-4">Reviews ({{ agent.total_reviews }})</h3>
        <div v-if="agent.reviews?.length" class="space-y-4">
          <div v-for="review in agent.reviews" :key="review.name"
            class="border-b border-gray-100 pb-4 last:border-0">
            <div class="flex items-center gap-3 mb-2">
              <div class="flex">
                <svg v-for="star in 5" :key="star" class="w-4 h-4"
                  :class="star <= review.rating ? 'text-yellow-400' : 'text-gray-200'"
                  fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <span class="text-sm font-medium text-gray-900">{{ review.reviewer_name }}</span>
              <span class="text-xs text-gray-400">{{ formatDate(review.review_date) }}</span>
            </div>
            <h4 v-if="review.title" class="text-sm font-medium text-gray-800 mb-1">{{ review.title }}</h4>
            <p v-if="review.comment" class="text-sm text-gray-600">{{ review.comment }}</p>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500 text-center py-4">No reviews yet</p>
      </div>
    </main>

    <!-- Not found -->
    <div v-else class="text-center py-20">
      <p class="text-gray-500">Agent profile not found</p>
      <router-link to="/hub/agents" class="mt-4 inline-block text-sm text-brand hover:underline">
        Back to Marketplace
      </router-link>
    </div>

    <!-- Invite to Quote Modal -->
    <div v-if="showInviteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 class="text-base font-semibold text-gray-900 mb-1">Invite {{ agent?.display_name }} to Quote</h3>
        <p class="text-xs text-gray-500 mb-4">Select an active application to invite this agent.</p>

        <div v-if="inviteSuccess" class="text-center py-6">
          <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <p class="text-sm font-semibold text-gray-900">Invite sent!</p>
          <p class="text-xs text-gray-500 mt-1">{{ agent?.display_name }} will be notified to submit a quote.</p>
          <button @click="showInviteModal = false" class="mt-4 px-4 py-2 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-hover transition-colors">
            Done
          </button>
        </div>

        <div v-else>
          <div v-if="requestsLoading" class="space-y-2 animate-pulse mb-4">
            <div v-for="i in 3" :key="i" class="h-10 bg-gray-100 rounded-lg"></div>
          </div>
          <div v-else-if="!myRequests.length" class="text-sm text-gray-500 text-center py-4 mb-4">
            No active applications found.
          </div>
          <div v-else class="space-y-2 mb-4 max-h-56 overflow-y-auto">
            <label v-for="req in myRequests" :key="req.name"
              class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
              :class="selectedRequest?.name === req.name ? 'border-blue-500 bg-brand-light/30' : 'border-gray-200 hover:border-gray-300'">
              <input type="radio" :value="req" v-model="selectedRequest" class="text-brand" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800 truncate">{{ req.request_number }}</p>
                <p class="text-xs text-gray-500 truncate">{{ req.request_type }} — {{ req.council_name }}</p>
              </div>
            </label>
          </div>

          <p v-if="inviteError" class="text-xs text-red-600 mb-3">{{ inviteError }}</p>

          <div class="flex gap-3">
            <button @click="sendInvite" :disabled="inviting || !selectedRequest"
              class="flex-1 px-4 py-2.5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-hover disabled:opacity-50 transition-colors">
              {{ inviting ? 'Sending…' : 'Send Invite' }}
            </button>
            <button @click="showInviteModal = false"
              class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '@/services/api/base'
import HubNav from '@/components/HubNav.vue'
import { session } from '@/data/session'

const route = useRoute()

const agent = ref(null)
const loading = ref(true)

// Invite to Quote
const showInviteModal = ref(false)
const myRequests = ref([])
const requestsLoading = ref(false)
const selectedRequest = ref(null)
const inviting = ref(false)
const inviteSuccess = ref(false)
const inviteError = ref('')

async function openInviteModal() {
  showInviteModal.value = true
  inviteSuccess.value = false
  inviteError.value = ''
  selectedRequest.value = null
  if (!myRequests.value.length) {
    requestsLoading.value = true
    try {
      const all = await apiClient.call('councilsonlinehub.api.hub.aggregate_requests')
      myRequests.value = (all || []).filter(r =>
        !['Approved', 'Granted', 'Declined', 'Withdrawn'].includes(r.workflow_state)
      )
    } catch {
      myRequests.value = []
    } finally {
      requestsLoading.value = false
    }
  }
}

async function sendInvite() {
  if (!selectedRequest.value) return
  inviting.value = true
  inviteError.value = ''
  try {
    await apiClient.call('councilsonlinehub.api.hub.invite_agent_to_quote', {
      agent_profile: agent.value.user,
      request_name: selectedRequest.value.name,
      council_url: selectedRequest.value.council_url,
    })
    inviteSuccess.value = true
  } catch (e) {
    inviteError.value = e?.message || 'Failed to send invite'
  } finally {
    inviting.value = false
  }
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

onMounted(async () => {
  try {
    agent.value = await apiClient.call(
      'councilsonlinehub.api.hub.get_agent_detail',
      { agent_name: route.params.id }
    )
  } catch {
    agent.value = null
  } finally {
    loading.value = false
  }
})
</script>
