<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">CouncilsOnline Portal</h1>
        <p class="text-sm text-gray-500 mt-1">Sign in to manage your applications across all councils</p>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <!-- SSO error notice -->
        <div v-if="ssoError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
          <p class="text-red-700 font-medium text-xs">Sign-in failed</p>
          <p class="text-red-600 text-xs mt-1">{{ ssoError }}</p>
          <button @click="ssoError = ''" class="mt-2 text-xs text-red-500 hover:text-red-700 underline">Dismiss</button>
        </div>

        <!-- Already-logged-in banner -->
        <div v-if="session.isLoggedIn" class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <p class="text-amber-800 font-medium">Already signed in as</p>
          <p class="text-amber-700 truncate text-xs mt-0.5">{{ session.user }}</p>
          <div class="flex gap-2 mt-3">
            <button
              @click="goToDashboard"
              class="flex-1 py-1.5 px-3 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              @click="signOutAndLogin"
              :disabled="loggingOut"
              class="flex-1 py-1.5 px-3 border border-amber-300 text-amber-800 rounded text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {{ loggingOut ? 'Signing out…' : 'Sign out & switch' }}
            </button>
          </div>
        </div>

        <button
          v-else
          @click="loginWithSSO"
          :disabled="loading"
          class="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {{ loading ? 'Redirecting…' : 'Sign in with Keycloak SSO' }}
        </button>

        <p class="mt-4 text-center text-xs text-gray-400">
          You will be redirected to our secure identity portal.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { session } from '@/data/session'
import { getLoginUrl } from '@/constants/keycloak'

const router = useRouter()
const loading = ref(false)
const loggingOut = ref(false)
const ssoError = ref('')

function goToDashboard() {
  router.push('/hub/dashboard')
}

async function getLoginRedirectUrl() {
  let siteUrl = ''
  try {
    const resp = await fetch('/api/method/councilsonlinehub.api.hub.get_hub_config')
    const data = await resp.json()
    siteUrl = data?.message?.site_url || ''
  } catch (_) { /* fall back */ }
  return getLoginUrl('NZ', siteUrl)
}

async function loginWithSSO() {
  ssoError.value = ''
  try {
    loading.value = true
    const url = await getLoginRedirectUrl()
    window.location.href = url
  } catch (err) {
    loading.value = false
    ssoError.value = 'Unable to start sign-in. Please try again or contact support.'
  }
}

async function signOutAndLogin() {
  ssoError.value = ''
  loggingOut.value = true
  try {
    await fetch('/api/method/logout', { method: 'POST', credentials: 'include' })
    session.user = null
  } catch (_) { /* ignore — session may already be invalid */ }
  try {
    const url = await getLoginRedirectUrl()
    window.location.href = url
  } catch (err) {
    loggingOut.value = false
    ssoError.value = 'Unable to start sign-in. Please try again or contact support.'
  }
}

onMounted(() => {
  // Check if redirected back from Keycloak with an error
  const params = new URLSearchParams(window.location.search)
  const errCode = params.get('error')
  const errDesc = params.get('error_description')
  if (errCode) {
    const messages = {
      access_denied: 'Access was denied. Please try again.',
      invalid_request: 'The sign-in request was invalid. Please try again.',
      temporarily_unavailable: 'The identity server is temporarily unavailable. Please try again in a moment.',
    }
    ssoError.value = messages[errCode] || (errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : `Sign-in error: ${errCode}. Please try again.`)
    const clean = new URL(window.location.href)
    clean.searchParams.delete('error')
    clean.searchParams.delete('error_description')
    window.history.replaceState({}, '', clean.toString())
  }
})
</script>
