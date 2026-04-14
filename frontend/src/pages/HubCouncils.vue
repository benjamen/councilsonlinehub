<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <!-- Toast: council opened in new tab -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="openedCouncilName"
        class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg"
      >
        {{ openedCouncilName }} opened in a new tab
      </div>
    </Transition>

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

            </div>

            <div class="flex gap-2 flex-shrink-0">
              <a
                v-if="c.registered"
                :href="c.api_url + '/frontend/dashboard'"
                target="_blank"
                class="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Open Portal
              </a>
              <button
                v-else
                @click="registerWithCouncil(c)"
                :disabled="registering === c.council_code"
                class="px-3 py-2 text-sm font-medium rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-50 transition-colors"
              >
                {{ registering === c.council_code ? 'Registering…' : 'Register' }}
              </button>
            </div>
          </div>

          <!-- Registered: quick links -->
          <div v-if="c.registered" class="mt-3 pt-3 border-t border-gray-100 flex gap-4">
            <a :href="c.api_url + '/frontend/request/new'" target="_blank" class="text-xs text-brand hover:underline">
              New application →
            </a>
            <a :href="c.api_url + '/frontend/applicant/profile'" target="_blank" class="text-xs text-brand hover:underline">
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
const registering = ref(null)
const openedCouncilName = ref(null)

async function registerWithCouncil(council) {
  registering.value = council.council_code
  try {
    const result = await apiClient.call(
      'councilsonlinehub.api.hub.provision_on_council',
      { council_code: council.council_code }
    )
    if (result && result.auto_login_url) {
      window.open(result.auto_login_url, '_blank')
      // Show toast and refresh so the "Registered" badge appears
      openedCouncilName.value = council.council_name
      setTimeout(() => { openedCouncilName.value = null }, 4000)
      setTimeout(() => loadCouncils(), 2000)
    }
  } catch (e) {
    console.error('Provision error:', e)
    alert('Could not register with this council: ' + (e.message || 'Unknown error'))
  }
  registering.value = null
}

async function loadCouncils() {
  try {
    const [registry, memberships] = await Promise.allSettled([
      apiClient.call('councilsonlinehub.api.hub.get_council_registry'),
      apiClient.call('councilsonlinehub.api.hub.get_user_memberships'),
    ])

    const raw = registry.value || []
    const memberCodes = new Set((memberships.value || []).map(m => m.council_code))

    councils.value = raw
      .map(c => ({ ...c, registered: memberCodes.has(c.council_code) }))
      .sort((a, b) => (b.registered ? 1 : 0) - (a.registered ? 1 : 0))
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

onMounted(() => loadCouncils())
</script>
