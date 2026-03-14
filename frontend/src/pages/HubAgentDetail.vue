<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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

        <!-- Contact -->
        <div class="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div v-if="agent.contact_email">
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
            <a :href="'mailto:' + agent.contact_email" class="text-sm text-blue-600 hover:underline">{{ agent.contact_email }}</a>
          </div>
          <div v-if="agent.contact_phone">
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Phone</p>
            <a :href="'tel:' + agent.contact_phone" class="text-sm text-blue-600 hover:underline">{{ agent.contact_phone }}</a>
          </div>
          <div v-if="agent.website">
            <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Website</p>
            <a :href="agent.website" target="_blank" rel="noopener" class="text-sm text-blue-600 hover:underline">{{ agent.website }}</a>
          </div>
        </div>
      </div>

      <!-- Services & Areas -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div v-if="agent.services?.length" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Services</h3>
          <div class="flex flex-wrap gap-2">
            <span v-for="svc in agent.services" :key="svc.service_name"
              class="px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700">
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
      <router-link to="/hub/agents" class="mt-4 inline-block text-sm text-blue-600 hover:underline">
        Back to Marketplace
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '@/services/api/base'
import HubNav from '@/components/HubNav.vue'

const route = useRoute()

const agent = ref(null)
const loading = ref(true)

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
