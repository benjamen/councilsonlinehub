<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Platform Users</h1>
          <p class="text-sm text-gray-500 mt-0.5">Manage applicants and agents registered on the hub</p>
        </div>
        <button @click="openInviteModal"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          + Add User
        </button>
      </div>

      <div v-if="!isAdmin" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
        System Manager access required.
      </div>

      <div v-else>
        <!-- Tab bar -->
        <div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
          <button v-for="tab in tabs" :key="tab.key"
            @click="activeTab = tab.key"
            class="px-5 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="activeTab === tab.key
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'">
            {{ tab.label }}
            <span class="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
              :class="activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'">
              {{ tab.key === 'Individual' ? applicants.length : agents.length }}
            </span>
          </button>
        </div>

        <div v-if="loading" class="text-sm text-gray-400 text-center py-16">Loading…</div>

        <template v-else>
          <div v-if="!activeUsers.length" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
            No {{ activeTab === 'Individual' ? 'applicants' : 'agents' }} found.
          </div>

          <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-100 bg-gray-50">
                  <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Hub URL</th>
                  <th class="px-5 py-3" />
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="u in activeUsers" :key="u.email" class="hover:bg-gray-50 transition-colors">
                  <td class="px-5 py-3 font-medium text-gray-900">{{ u.full_name || u.email }}</td>
                  <td class="px-5 py-3 text-gray-500 text-xs hidden sm:table-cell">{{ u.email }}</td>
                  <td class="px-5 py-3">
                    <div class="flex items-center gap-1.5">
                      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        :class="u.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
                        {{ u.enabled ? 'Active' : 'Disabled' }}
                      </span>
                      <span v-if="!u.enabled"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        Locked
                      </span>
                    </div>
                  </td>
                  <td class="px-5 py-3 text-gray-400 text-xs truncate max-w-[180px] hidden md:table-cell">
                    {{ u.hub_url || '—' }}
                  </td>
                  <td class="px-5 py-3">
                    <div class="flex gap-2 justify-end">
                      <button v-if="!u.enabled"
                        @click="unlockUser(u)"
                        class="text-xs text-green-600 hover:text-green-800 font-medium">
                        Unlock
                      </button>
                      <button v-if="u.enabled"
                        @click="confirmDisable(u)"
                        class="text-xs text-amber-600 hover:text-amber-800 font-medium">
                        Disable
                      </button>
                      <button @click="confirmDelete(u)"
                        class="text-xs text-red-500 hover:text-red-700 font-medium">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="mt-3 text-xs text-gray-400 text-right">
            {{ activeUsers.length }} {{ activeTab === 'Individual' ? 'applicant' : 'agent' }}{{ activeUsers.length !== 1 ? 's' : '' }}
          </p>
        </template>
      </div>
    </main>

    <!-- Invite / Add User Modal -->
    <Teleport to="body">
      <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="showInviteModal = false" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-5">Add Platform User</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">User Type <span class="text-red-500">*</span></label>
              <select v-model="inviteForm.user_type"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Individual">Applicant (Individual)</option>
                <option value="Agent">Agent</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">First Name <span class="text-red-500">*</span></label>
              <input v-model="inviteForm.first_name" type="text" placeholder="Jane"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Last Name <span class="text-red-500">*</span></label>
              <input v-model="inviteForm.last_name" type="text" placeholder="Smith"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Email <span class="text-red-500">*</span></label>
              <input v-model="inviteForm.email" type="email" placeholder="jane@example.com"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <p v-if="modalError" class="text-sm text-red-500 mt-3">{{ modalError }}</p>
          <div class="flex gap-3 mt-6">
            <button @click="doInvite" :disabled="saving"
              class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {{ saving ? 'Adding…' : 'Add User' }}
            </button>
            <button @click="showInviteModal = false"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Disable Confirm -->
    <Teleport to="body">
      <div v-if="disableTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="disableTarget = null" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <p class="text-base font-semibold text-gray-900 mb-2">Disable user?</p>
          <p class="text-sm text-gray-500 mb-5">
            Disable <strong>{{ disableTarget.full_name || disableTarget.email }}</strong>?
            They will not be able to log in until re-enabled.
          </p>
          <div class="flex gap-3">
            <button @click="doDisable" :disabled="saving"
              class="flex-1 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors">
              {{ saving ? 'Disabling…' : 'Disable' }}
            </button>
            <button @click="disableTarget = null"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="deleteTarget = null" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <p class="text-base font-semibold text-gray-900 mb-2">Delete user?</p>
          <p class="text-sm text-gray-500 mb-5">
            Permanently remove <strong>{{ deleteTarget.full_name || deleteTarget.email }}</strong> from the platform?
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
import { ref, reactive, computed, onMounted } from 'vue'
import HubNav from '@/components/HubNav.vue'
import { apiClient } from '@/services/api/base'

const tabs = [
  { key: 'Individual', label: 'Applicants' },
  { key: 'Agent', label: 'Agents' },
]

const activeTab = ref('Individual')
const allUsers = ref([])
const loading = ref(true)
const saving = ref(false)
const isAdmin = ref(false)
const showInviteModal = ref(false)
const disableTarget = ref(null)
const deleteTarget = ref(null)
const modalError = ref('')

const inviteForm = reactive({
  email: '', first_name: '', last_name: '', user_type: 'Individual',
})

const applicants = computed(() => allUsers.value.filter(u => u.user_type === 'Individual'))
const agents = computed(() => allUsers.value.filter(u => u.user_type === 'Agent'))
const activeUsers = computed(() => activeTab.value === 'Individual' ? applicants.value : agents.value)

onMounted(async () => {
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.get_platform_users')
    allUsers.value = result || []
    isAdmin.value = true
  } catch {
    isAdmin.value = false
  }
  loading.value = false
})

function openInviteModal() {
  Object.assign(inviteForm, { email: '', first_name: '', last_name: '', user_type: activeTab.value })
  modalError.value = ''
  showInviteModal.value = true
}

async function doInvite() {
  if (!inviteForm.email.trim() || !inviteForm.first_name.trim() || !inviteForm.last_name.trim()) {
    modalError.value = 'All fields are required.'
    return
  }
  saving.value = true
  modalError.value = ''
  try {
    // Use standard Frappe user invite mechanism — the user_type is set on User Profile Extended
    await apiClient.call('councilsonlinehub.api.hub.invite_hub_admin', {
      email: inviteForm.email.trim(),
      first_name: inviteForm.first_name.trim(),
      last_name: inviteForm.last_name.trim(),
    })
    showInviteModal.value = false
    await reload()
  } catch (e) {
    modalError.value = e?.message || 'Failed to add user'
  }
  saving.value = false
}

async function unlockUser(u) {
  saving.value = true
  try {
    await apiClient.call('councilsonlinehub.api.hub.unlock_user_account', { user_email: u.email })
    await reload()
  } catch (e) {
    alert(e?.message || 'Failed to unlock user')
  }
  saving.value = false
}

function confirmDisable(u) {
  disableTarget.value = u
}

async function doDisable() {
  saving.value = true
  try {
    await apiClient.call('councilsonlinehub.api.hub.delete_platform_user', {
      user_email: disableTarget.value.email,
    })
    disableTarget.value = null
    await reload()
  } catch (e) {
    alert(e?.message || 'Failed to disable user')
  }
  saving.value = false
}

function confirmDelete(u) {
  deleteTarget.value = u
}

async function doDelete() {
  saving.value = true
  try {
    await apiClient.call('councilsonlinehub.api.hub.delete_platform_user', {
      user_email: deleteTarget.value.email,
    })
    deleteTarget.value = null
    await reload()
  } catch (e) {
    alert(e?.message || 'Failed to delete user')
  }
  saving.value = false
}

async function reload() {
  const result = await apiClient.call('councilsonlinehub.api.hub.get_platform_users')
  allUsers.value = result || []
}
</script>
