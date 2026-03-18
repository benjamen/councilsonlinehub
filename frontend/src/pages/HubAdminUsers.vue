<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">COL Admin Users</h1>
          <p class="text-sm text-gray-500 mt-0.5">Manage platform administrators (maximum {{ MAX_ADMINS }})</p>
        </div>
        <button @click="openInviteModal"
          :disabled="admins.length >= MAX_ADMINS"
          :title="admins.length >= MAX_ADMINS ? 'Maximum of ' + MAX_ADMINS + ' admins reached' : ''"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          + Invite Admin
        </button>
      </div>

      <div v-if="!isAdmin" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
        System Manager access required.
      </div>

      <div v-else-if="loading" class="text-sm text-gray-400 text-center py-16">Loading…</div>

      <div v-else>
        <!-- Slot usage indicator -->
        <div class="mb-4 flex items-center gap-2">
          <div class="flex gap-1">
            <div v-for="i in MAX_ADMINS" :key="i"
              class="w-4 h-4 rounded-full"
              :class="i <= admins.length ? 'bg-blue-500' : 'bg-gray-200'" />
          </div>
          <span class="text-xs text-gray-500">{{ admins.length }} / {{ MAX_ADMINS }} slots used</span>
          <span v-if="admins.length >= MAX_ADMINS" class="text-xs text-amber-600 font-medium">— Maximum reached</span>
        </div>

        <div v-if="!admins.length" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          No admin users found.
        </div>

        <div v-else class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th class="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th class="px-5 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="u in admins" :key="u.email" class="hover:bg-gray-50 transition-colors">
                <td class="px-5 py-3 font-medium text-gray-900">
                  {{ u.full_name || (u.first_name + ' ' + u.last_name).trim() || u.email }}
                </td>
                <td class="px-5 py-3 text-gray-500 text-xs hidden sm:table-cell">{{ u.email }}</td>
                <td class="px-5 py-3">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    :class="u.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
                    {{ u.enabled ? 'Active' : 'Disabled' }}
                  </span>
                </td>
                <td class="px-5 py-3">
                  <div class="flex gap-3 justify-end">
                    <button v-if="u.email !== currentUser"
                      @click="toggleDisable(u)"
                      class="text-xs font-medium"
                      :class="u.enabled ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'">
                      {{ u.enabled ? 'Disable' : 'Enable' }}
                    </button>
                    <button v-if="u.email !== currentUser"
                      @click="confirmDelete(u)"
                      class="text-xs text-red-500 hover:text-red-700 font-medium">
                      Delete
                    </button>
                    <span v-if="u.email === currentUser" class="text-xs text-gray-400 italic">You</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- Invite Admin Modal -->
    <Teleport to="body">
      <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="showInviteModal = false" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-5">Invite COL Admin</h2>
          <div class="space-y-4">
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
              <input v-model="inviteForm.email" type="email" placeholder="jane.smith@councilsonline.co.nz"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <p v-if="modalError" class="text-sm text-red-500 mt-3">{{ modalError }}</p>
          <div class="flex gap-3 mt-6">
            <button @click="doInvite" :disabled="saving"
              class="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {{ saving ? 'Inviting…' : 'Send Invitation' }}
            </button>
            <button @click="showInviteModal = false"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40" @click="deleteTarget = null" />
        <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <p class="text-base font-semibold text-gray-900 mb-2">Delete admin user?</p>
          <p class="text-sm text-gray-500 mb-5">
            Remove <strong>{{ deleteTarget.full_name || deleteTarget.email }}</strong> as a COL Admin?
            This will delete their account from the system.
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

const MAX_ADMINS = 3

const admins = ref([])
const loading = ref(true)
const saving = ref(false)
const isAdmin = ref(false)
const currentUser = ref('')
const showInviteModal = ref(false)
const deleteTarget = ref(null)
const modalError = ref('')

const inviteForm = reactive({ email: '', first_name: '', last_name: '' })

onMounted(async () => {
  try {
    const [adminsResult, sessionResult] = await Promise.all([
      apiClient.call('councilsonlinehub.api.hub.get_hub_admins'),
      apiClient.call('frappe.auth.get_logged_user'),
    ])
    admins.value = adminsResult || []
    currentUser.value = sessionResult || ''
    isAdmin.value = true
  } catch {
    isAdmin.value = false
  }
  loading.value = false
})

function openInviteModal() {
  Object.assign(inviteForm, { email: '', first_name: '', last_name: '' })
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
    await apiClient.call('councilsonlinehub.api.hub.invite_hub_admin', {
      email: inviteForm.email.trim(),
      first_name: inviteForm.first_name.trim(),
      last_name: inviteForm.last_name.trim(),
    })
    showInviteModal.value = false
    await reload()
  } catch (e) {
    modalError.value = e?.message || 'Failed to invite user'
  }
  saving.value = false
}

async function toggleDisable(u) {
  saving.value = true
  try {
    const method = u.enabled
      ? 'councilsonlinehub.api.hub.disable_hub_admin'
      : 'councilsonlinehub.api.hub.enable_hub_admin'
    await apiClient.call(method, { user_email: u.email })
    await reload()
  } catch (e) {
    alert(e?.message || 'Failed to update user')
  }
  saving.value = false
}

function confirmDelete(u) {
  deleteTarget.value = u
}

async function doDelete() {
  saving.value = true
  try {
    await apiClient.call('councilsonlinehub.api.hub.delete_hub_admin', {
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
  const result = await apiClient.call('councilsonlinehub.api.hub.get_hub_admins')
  admins.value = result || []
}
</script>
