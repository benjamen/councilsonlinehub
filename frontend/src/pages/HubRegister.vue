<template>
  <!-- Auto-redirecting — show a branded spinner while we store state and bounce to Keycloak -->
  <div class="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-sky-500 flex items-center justify-center px-4">
    <div class="text-center">
      <!-- Wordmark -->
      <div class="inline-flex items-center gap-3 mb-10">
        <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3M9 7h1m-1 4h1m4-4h1m-1 4h1M9 21v-3.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V21"/>
          </svg>
        </div>
        <span class="text-white font-extrabold text-xl tracking-tight">CouncilsOnline</span>
      </div>

      <div class="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-5"
        style="border-width:3px"></div>
      <p class="text-white font-semibold text-sm mb-1">
        {{ councilName ? `Registering with ${councilName}…` : 'Taking you to secure sign-in…' }}
      </p>
      <p class="text-blue-300 text-xs">You will be redirected to create your account</p>

      <!-- Manual fallback (if redirect takes too long) -->
      <button v-if="showFallback" @click="go"
        class="mt-8 px-6 py-2.5 bg-white text-blue-700 font-bold text-sm rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
        Continue to Sign-In
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getRegisterUrl } from '@/constants/keycloak'
import { session } from '@/data/session'

const route = useRoute()
const councilName = ref(null)
const showFallback = ref(false)

const PENDING_KEY = 'pending_council_code'
const AO_TOKEN_KEY = 'pending_ao_token'
const AO_COUNCIL_KEY = 'pending_ao_council'

function go() {
  window.location.href = getRegisterUrl('Applicant', 'NZ')
}

onMounted(() => {
  const code = route.query.council_code
  if (code) {
    localStorage.setItem(PENDING_KEY, code)
    councilName.value = route.query.council_name || code
  }

  const aoToken = route.query.ao_token
  if (aoToken) {
    localStorage.setItem(AO_TOKEN_KEY, aoToken)
    if (route.query.council_code) {
      localStorage.setItem(AO_COUNCIL_KEY, route.query.council_code)
    }
    // If already logged in, skip Keycloak and go straight to dashboard to complete provisioning
    if (session.isLoggedIn) {
      window.location.href = '/frontend/hub/dashboard'
      return
    }
  }

  // Auto-redirect immediately to Keycloak register
  setTimeout(go, 400)

  // Show manual button after 5s as fallback
  setTimeout(() => { showFallback.value = true }, 5000)
})
</script>
