<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-xl font-semibold text-gray-900">Team</h1>
          <p class="text-sm text-gray-500 mt-0.5">{{ companyName }}</p>
        </div>
        <button @click="showInvite = !showInvite"
          class="px-4 py-2 bg-brand text-white text-sm rounded-lg hover:bg-brand-hover transition-colors">
          + Invite Member
        </button>
      </div>

      <!-- Invite form -->
      <div v-if="showInvite" class="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 class="text-sm font-medium text-gray-900 mb-4">Invite a team member</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <input v-model="invite.email" type="email" placeholder="Email address"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input v-model="invite.first_name" type="text" placeholder="First name"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <input v-model="invite.last_name" type="text" placeholder="Last name"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div class="flex items-center gap-3">
          <button @click="sendInvite" :disabled="inviting"
            class="px-4 py-2 bg-brand text-white text-sm rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-colors">
            {{ inviting ? 'Sending...' : 'Send Invitation' }}
          </button>
          <button @click="showInvite = false; inviteMsg = ''"
            class="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <p v-if="inviteMsg" class="text-sm" :class="inviteError ? 'text-red-600' : 'text-green-600'">
            {{ inviteMsg }}
          </p>
        </div>
      </div>

      <!-- Member list -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div v-if="loading" class="py-16 text-center text-sm text-gray-500">Loading...</div>
        <div v-else-if="!members.length" class="py-16 text-center text-sm text-gray-500">
          No team members found.
        </div>
        <table v-else class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Member</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
              <th class="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in members" :key="m.name" class="border-b border-gray-100">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{{ m.full_name || m.name }}</p>
                <p class="text-xs text-gray-500">{{ m.name }}</p>
              </td>
              <td class="px-4 py-3 text-gray-600">
                {{ m.is_officer ? 'Authorising Officer' : (m.user_role || 'Agent') }}
              </td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="m.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                  {{ m.enabled ? 'Active' : 'Invited' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HubNav from '@/components/HubNav.vue'
import { apiClient } from '@/services/api/base'
import { session } from '@/data/session'

const members = ref([])
const loading = ref(true)
const showInvite = ref(false)
const inviting = ref(false)
const inviteMsg = ref('')
const inviteError = ref(false)
const companyName = ref('')

const invite = ref({ email: '', first_name: '', last_name: '' })

async function loadMembers() {
  loading.value = true
  try {
    const data = await apiClient.call('councilsonlinehub.api.hub.get_company_members')
    members.value = data || []
  } catch {
    members.value = []
  } finally {
    loading.value = false
  }
}

async function sendInvite() {
  if (!invite.value.email || !invite.value.first_name) {
    inviteMsg.value = 'Email and first name are required'
    inviteError.value = true
    return
  }
  inviting.value = true
  inviteMsg.value = ''
  inviteError.value = false
  try {
    await apiClient.call('councilsonlinehub.api.hub.invite_company_member', {
      email: invite.value.email,
      first_name: invite.value.first_name,
      last_name: invite.value.last_name,
    })
    inviteMsg.value = `Invitation sent to ${invite.value.email}`
    invite.value = { email: '', first_name: '', last_name: '' }
    await loadMembers()
  } catch (e) {
    inviteMsg.value = e?.message || 'Failed to send invitation'
    inviteError.value = true
  } finally {
    inviting.value = false
  }
}

onMounted(async () => {
  // Get company name from profile
  try {
    const profile = await apiClient.call('councilsonlinehub.api.hub.get_hub_profile')
    companyName.value = profile?.company_name || ''
  } catch {}
  await loadMembers()
})
</script>
