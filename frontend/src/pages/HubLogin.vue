<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">CouncilsOnline Hub</h1>
        <p class="text-sm text-gray-500 mt-1">Agent portal — sign in to manage your applications</p>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <button
          @click="loginWithSSO"
          class="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Sign in with Keycloak SSO
        </button>
        <p class="mt-4 text-center text-xs text-gray-400">
          You will be redirected to our secure identity portal.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getLoginUrl } from '@/constants/keycloak'

function loginWithSSO() {
  window.location.href = getLoginUrl('NZ')
}
</script>
