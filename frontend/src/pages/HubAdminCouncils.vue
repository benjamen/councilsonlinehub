<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <!-- Admin sub-navigation -->
    <div class="bg-white border-b border-gray-200">
      <div class="max-w-4xl mx-auto px-4 sm:px-6">
        <nav class="flex gap-1 py-1.5 overflow-x-auto">
          <router-link to="/hub/admin/councils"
            class="px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors"
            :class="$route.path.startsWith('/hub/admin/councils') ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'">
            Councils
          </router-link>
          <router-link to="/hub/admin/users"
            class="px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors"
            :class="$route.path === '/hub/admin/users' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'">
            Admin Users
          </router-link>
          <router-link to="/hub/admin/platform-users"
            class="px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors"
            :class="$route.path === '/hub/admin/platform-users' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'">
            Platform Users
          </router-link>
          <router-link to="/hub/admin/stats"
            class="px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors"
            :class="$route.path === '/hub/admin/stats' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'">
            Statistics
          </router-link>
        </nav>
      </div>
    </div>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Council Registry</h1>
          <p class="text-sm text-gray-500 mt-0.5">Manage councils available to users on this hub</p>
        </div>
        <button @click="openModal(null)"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + Add Council
        </button>
      </div>

      <div v-if="!isAdmin" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
        System Manager access required.
      </div>

      <div v-else-if="loading" class="text-sm text-gray-400 text-center py-16">Loading…</div>

      <div v-else>
        <div v-if="!councils.length" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          No councils configured yet.
        </div>

        <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Council</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Code</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">API URL</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th class="px-5 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="c in councils" :key="c.name" class="hover:bg-gray-50 transition-colors">
                <td class="px-5 py-3 font-medium text-gray-900">{{ c.council_name }}</td>
                <td class="px-5 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">{{ c.council_code }}</td>
                <td class="px-5 py-3 text-gray-400 text-xs truncate max-w-[200px] hidden md:table-cell">{{ c.api_url }}</td>
                <td class="px-5 py-3">
                  <button @click="toggleActive(c)"
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
                    :class="c.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'">
                    {{ c.is_active ? 'Active' : 'Inactive' }}
                  </button>
                </td>
                <td class="px-5 py-3">
                  <div class="flex gap-2 justify-end">
                    <router-link :to="`/hub/admin/councils/${c.council_code}/users`"
                      class="text-xs text-gray-500 hover:text-gray-700 font-medium">Users</router-link>
                    <router-link :to="`/hub/admin/councils/${c.council_code}/settings`"
                      class="text-xs text-gray-500 hover:text-gray-700 font-medium">Settings</router-link>
                    <button @click="openModal(c)" class="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    <button @click="confirmDelete(c)" class="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- Add/Edit modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="showModal = false" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-5">
            {{ editEntry ? 'Edit Council' : 'Add Council' }}
          </h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Council Name <span class="text-red-500">*</span></label>
              <input v-model="form.council_name" type="text" placeholder="e.g. Whangarei District Council"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Council Code <span class="text-red-500">*</span></label>
              <input v-model="form.council_code" type="text" placeholder="e.g. WDC"
                :disabled="!!editEntry"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
              <p v-if="!editEntry" class="text-xs text-gray-400 mt-1">Short unique identifier — cannot be changed later.</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">API URL <span class="text-red-500">*</span></label>
              <input v-model="form.api_url" type="url" placeholder="https://whangarei.councilsonline.co.nz"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="form.is_active" class="rounded text-blue-600" />
              <span class="text-sm text-gray-700">Active (visible to users)</span>
            </label>
          </div>
          <p v-if="modalError" class="text-sm text-red-500 mt-3">{{ modalError }}</p>
          <div class="flex gap-3 mt-6">
            <button @click="saveEntry" :disabled="saving"
              class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {{ saving ? 'Saving…' : (editEntry ? 'Save Changes' : 'Add Council') }}
            </button>
            <button @click="showModal = false"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="deleteTarget = null" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <p class="text-base font-semibold text-gray-900 mb-2">Delete council?</p>
          <p class="text-sm text-gray-500 mb-5">
            Remove <strong>{{ deleteTarget.council_name }}</strong> from the registry?
            Existing user memberships are not affected.
          </p>
          <div class="flex gap-3">
            <button @click="doDelete" :disabled="saving"
              class="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
              {{ saving ? 'Deleting…' : 'Delete' }}
            </button>
            <button @click="deleteTarget = null"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import HubNav from '@/components/HubNav.vue'
import { apiClient } from '@/services/api/base'

const councils    = ref([])
const loading     = ref(true)
const saving      = ref(false)
const isAdmin     = ref(false)
const showModal   = ref(false)
const editEntry   = ref(null)
const deleteTarget = ref(null)
const modalError  = ref('')

const form = reactive({
  council_name: '', council_code: '', api_url: '', is_active: true,
})

onMounted(async () => {
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.get_council_registry_all')
    councils.value = result || []
    isAdmin.value = true
  } catch (e) {
    isAdmin.value = false
  }
  loading.value = false
})

function openModal(entry) {
  editEntry.value = entry
  modalError.value = ''
  if (entry) {
    Object.assign(form, {
      council_name: entry.council_name,
      council_code: entry.council_code,
      api_url:      entry.api_url,
      is_active:    !!entry.is_active,
    })
  } else {
    Object.assign(form, { council_name: '', council_code: '', api_url: '', is_active: true })
  }
  showModal.value = true
}

async function saveEntry() {
  if (!form.council_name.trim() || !form.council_code.trim() || !form.api_url.trim()) {
    modalError.value = 'All fields are required.'
    return
  }
  saving.value = true
  modalError.value = ''
  try {
    await apiClient.call('councilsonlinehub.api.hub.save_council_registry_entry', {
      council_name: form.council_name.trim(),
      council_code: form.council_code.trim().toUpperCase(),
      api_url:      form.api_url.trim(),
      is_active:    form.is_active ? 1 : 0,
      entry_name:   editEntry.value?.name || null,
    })
    showModal.value = false
    await reload()
  } catch (e) {
    modalError.value = e?.message || 'Failed to save'
  }
  saving.value = false
}

async function toggleActive(entry) {
  try {
    await apiClient.call('councilsonlinehub.api.hub.save_council_registry_entry', {
      council_name: entry.council_name,
      council_code: entry.council_code,
      api_url:      entry.api_url,
      is_active:    entry.is_active ? 0 : 1,
      entry_name:   entry.name,
    })
    await reload()
  } catch (e) {
    alert(e?.message || 'Failed to update')
  }
}

function confirmDelete(entry) {
  deleteTarget.value = entry
}

async function doDelete() {
  saving.value = true
  try {
    await apiClient.call('councilsonlinehub.api.hub.delete_council_registry_entry', {
      entry_name: deleteTarget.value.name,
    })
    deleteTarget.value = null
    await reload()
  } catch (e) {
    alert(e?.message || 'Failed to delete')
  }
  saving.value = false
}

async function reload() {
  const result = await apiClient.call('councilsonlinehub.api.hub.get_council_registry_all')
  councils.value = result || []
}
</script>
