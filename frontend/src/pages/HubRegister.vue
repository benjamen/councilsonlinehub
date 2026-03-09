<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">CouncilsOnline Hub</h1>
        <p v-if="councilName" class="text-sm text-gray-500 mt-1">
          Register to submit applications with {{ councilName }}
        </p>
        <p v-else class="text-sm text-gray-500 mt-1">
          Create your agent account
        </p>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <button
          @click="registerWithSSO"
          class="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Continue with Keycloak SSO
        </button>
        <p class="mt-4 text-center text-xs text-gray-400">
          You will be redirected to our secure identity portal.
          After signing in you will be registered with{{ councilName ? ` ${councilName}` : ' the council' }} automatically.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getLoginUrl } from '@/constants/keycloak'

const route = useRoute()
const councilName = ref(null)

const PENDING_KEY = 'pending_council_code'

onMounted(() => {
  const code = route.query.council_code
  if (code) {
    // Persist council_code so it survives the Keycloak OAuth round-trip
    localStorage.setItem(PENDING_KEY, code)
    // Optionally look up the council name for display (not critical)
    councilName.value = route.query.council_name || code
  }
})

function registerWithSSO() {
  window.location.href = getLoginUrl('NZ')
}
</script>
