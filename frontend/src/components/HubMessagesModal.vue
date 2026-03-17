<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" @click.self="$emit('close')">
      <div class="fixed inset-0 bg-black/40" @click="$emit('close')" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">

        <!-- Header -->
        <div class="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p class="text-sm font-semibold text-gray-900">{{ requestNumber }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ councilName }}</p>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Message thread -->
        <div ref="threadEl" class="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          <div v-if="loading" class="text-sm text-gray-400 text-center py-8">Loading messages…</div>
          <div v-else-if="!messages.length" class="text-sm text-gray-400 text-center py-8">
            No messages yet. Send one below.
          </div>
          <template v-else>
            <div v-for="msg in messages" :key="msg.name"
              class="flex gap-3"
              :class="msg.direction === 'Outgoing' ? 'justify-end' : 'justify-start'">
              <div class="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                :class="msg.direction === 'Outgoing'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'">
                <p class="font-medium text-xs mb-1 opacity-70">{{ msg.direction === 'Outgoing' ? 'You' : 'Council' }}</p>
                <p class="font-semibold mb-0.5">{{ msg.subject }}</p>
                <p class="whitespace-pre-wrap" v-html="msg.content" />
                <p class="text-xs mt-1 opacity-60">{{ formatDate(msg.communication_date) }}</p>
              </div>
            </div>
          </template>
        </div>

        <!-- Compose -->
        <div class="px-5 pb-5 pt-3 border-t border-gray-100 flex-shrink-0 space-y-2">
          <input v-model="newSubject" type="text" placeholder="Subject"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea v-model="newMessage" rows="3" placeholder="Write a message…"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <p v-if="sendError" class="text-xs text-red-500">{{ sendError }}</p>
          <div class="flex justify-end gap-2">
            <button @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Close
            </button>
            <button @click="sendMessage" :disabled="sending || !newSubject.trim() || !newMessage.trim()"
              class="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {{ sending ? 'Sending…' : 'Send' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { apiClient } from '@/services/api/base'

const props = defineProps({
  councilCode:   { type: String, required: true },
  requestId:     { type: String, required: true },
  requestNumber: { type: String, required: true },
  councilName:   { type: String, default: '' },
})
defineEmits(['close'])

const messages  = ref([])
const loading   = ref(true)
const sending   = ref(false)
const sendError = ref('')
const newSubject = ref('')
const newMessage = ref('')
const threadEl  = ref(null)

onMounted(loadMessages)

async function loadMessages() {
  loading.value = true
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.get_request_messages', {
      council_code: props.councilCode,
      request_id:   props.requestId,
    })
    messages.value = (result?.data || []).sort(
      (a, b) => new Date(a.communication_date) - new Date(b.communication_date)
    )
    await nextTick()
    if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
  } catch (e) {
    sendError.value = e?.message || 'Could not load messages'
  }
  loading.value = false
}

async function sendMessage() {
  sendError.value = ''
  sending.value   = true
  try {
    await apiClient.call('councilsonlinehub.api.hub.send_hub_request_message', {
      council_code: props.councilCode,
      request_id:   props.requestId,
      subject:      newSubject.value.trim(),
      message:      newMessage.value.trim(),
    })
    newSubject.value = ''
    newMessage.value = ''
    await loadMessages()
  } catch (e) {
    sendError.value = e?.message || 'Failed to send message'
  }
  sending.value = false
}

function formatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('en-NZ', { dateStyle: 'short', timeStyle: 'short' })
}
</script>
