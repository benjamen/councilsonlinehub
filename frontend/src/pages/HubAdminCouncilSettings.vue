<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <main class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <!-- Back link -->
      <div class="mb-6">
        <router-link to="/hub/admin/councils"
          class="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Councils
        </router-link>
      </div>

      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">
            {{ council ? council.council_name : 'Council Settings' }}
          </h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Configure settings for
            <span class="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ councilCode }}</span>
          </p>
        </div>
      </div>

      <div v-if="!isAdmin" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
        System Manager access required.
      </div>

      <div v-else-if="loading" class="text-sm text-gray-400 text-center py-16">Loading…</div>

      <div v-else-if="!council" class="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center text-sm text-amber-700">
        Council <strong>{{ councilCode }}</strong> not found in the registry.
      </div>

      <div v-else class="space-y-6">
        <!-- Settings card -->
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-sm font-semibold text-gray-700 mb-4">Council Details</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Council Name <span class="text-red-500">*</span></label>
              <input v-model="form.council_name" type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Council Code</label>
              <input :value="form.council_code" type="text" disabled
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 font-mono" />
              <p class="text-xs text-gray-400 mt-1">Council code cannot be changed.</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">API URL <span class="text-red-500">*</span></label>
              <div class="flex gap-2">
                <input v-model="form.api_url" type="url" placeholder="https://council.councilsonline.co.nz"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button @click="testConnection" :disabled="testingConnection"
                  class="px-3 py-2 bg-gray-100 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap">
                  {{ testingConnection ? 'Testing…' : 'Test Connection' }}
                </button>
              </div>
              <div v-if="connectionResult" class="mt-2 flex items-center gap-1.5 text-xs"
                :class="connectionResult.status === 'ok' ? 'text-green-600' : 'text-red-600'">
                <svg v-if="connectionResult.status === 'ok'" class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <span v-if="connectionResult.status === 'ok'">
                  Connection OK (HTTP {{ connectionResult.http_status }}) — {{ connectionResult.url }}
                </span>
                <span v-else>{{ connectionResult.message || 'Connection failed' }}</span>
              </div>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="form.is_active" class="rounded text-blue-600" />
              <span class="text-sm text-gray-700">Active (visible to users)</span>
            </label>
          </div>

          <p v-if="saveError" class="text-sm text-red-500 mt-4">{{ saveError }}</p>
          <p v-if="saveSuccess" class="text-sm text-green-600 mt-4">Settings saved successfully.</p>

          <div class="flex gap-3 mt-6">
            <button @click="saveSettings" :disabled="saving"
              class="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {{ saving ? 'Saving…' : 'Save Settings' }}
            </button>
            <router-link to="/hub/admin/councils"
              class="px-6 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </router-link>
          </div>
        </div>

        <!-- Quick nav to council users -->
        <div class="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-900">Council Users</p>
            <p class="text-xs text-gray-500 mt-0.5">View and manage users provisioned to this council</p>
          </div>
          <router-link :to="`/hub/admin/councils/${councilCode}/users`"
            class="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
            View Users
          </router-link>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import HubNav from '@/components/HubNav.vue'
import { apiClient } from '@/services/api/base'

const route = useRoute()
const councilCode = route.params.councilCode

const loading = ref(true)
const saving = ref(false)
const isAdmin = ref(false)
const council = ref(null)
const saveError = ref('')
const saveSuccess = ref(false)
const testingConnection = ref(false)
const connectionResult = ref(null)

const form = reactive({
  council_name: '', council_code: '', api_url: '', is_active: true,
})

onMounted(async () => {
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.get_council_registry_all')
    const allCouncils = result || []
    const found = allCouncils.find(c => c.council_code === councilCode)
    isAdmin.value = true
    if (found) {
      council.value = found
      Object.assign(form, {
        council_name: found.council_name,
        council_code: found.council_code,
        api_url: found.api_url,
        is_active: !!found.is_active,
      })
    }
  } catch {
    isAdmin.value = false
  }
  loading.value = false
})

async function saveSettings() {
  if (!form.council_name.trim() || !form.api_url.trim()) {
    saveError.value = 'Council name and API URL are required.'
    return
  }
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await apiClient.call('councilsonlinehub.api.hub.save_council_registry_entry', {
      council_name: form.council_name.trim(),
      council_code: form.council_code,
      api_url: form.api_url.trim(),
      is_active: form.is_active ? 1 : 0,
      entry_name: council.value?.name || null,
    })
    saveSuccess.value = true
    // Update local council reference
    council.value = { ...council.value, ...form, is_active: form.is_active ? 1 : 0 }
  } catch (e) {
    saveError.value = e?.message || 'Failed to save settings'
  }
  saving.value = false
}

async function testConnection() {
  testingConnection.value = true
  connectionResult.value = null
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.test_council_connection', {
      council_code: councilCode,
    })
    connectionResult.value = result
  } catch (e) {
    connectionResult.value = { status: 'error', message: e?.message || 'Request failed' }
  }
  testingConnection.value = false
}
</script>
