<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-30">
    <div class="max-w-6xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between h-16">

        <!-- Logo + brand -->
        <router-link to="/hub/dashboard" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span class="font-semibold text-gray-900 text-base">CouncilsOnline Portal</span>
        </router-link>

        <!-- Nav links (desktop) -->
        <nav class="hidden sm:flex items-center gap-1">
          <router-link
            v-for="item in navItems" :key="item.to"
            :to="item.to"
            class="relative px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="isActive(item.to) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
          >
            {{ item.label }}
            <span v-if="item.badge"
              class="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {{ item.badge > 9 ? '9+' : item.badge }}
            </span>
          </router-link>
        </nav>

        <!-- Right side: role badge + user + logout -->
        <div class="flex items-center gap-2">
          <span v-if="roleBadge"
            class="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            :class="roleBadge.class">
            {{ roleBadge.label }}
          </span>
          <span class="hidden sm:block text-sm text-gray-500 max-w-[160px] truncate">{{ userName }}</span>
          <button
            @click="logout"
            class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <!-- Mobile nav -->
      <div class="flex sm:hidden gap-1 pb-2 overflow-x-auto">
        <router-link
          v-for="item in navItems" :key="item.to"
          :to="item.to"
          class="relative flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          :class="isActive(item.to) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
        >
          {{ item.label }}
          <span v-if="item.badge"
            class="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
            {{ item.badge > 9 ? '9+' : item.badge }}
          </span>
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { session } from '@/data/session'
import { apiClient } from '@/services/api/base'

const route = useRoute()

const userName = computed(() => session.user || '')

// Role detection — lightweight profile check
const userRole = ref('')
const pendingQuoteCount = ref(0)
const isSystemManager = ref(false)

onMounted(async () => {
  try {
    const profile = await apiClient.call('councilsonlinehub.api.hub.get_hub_profile')
    userRole.value = (profile?.user_role || '').toLowerCase()

    // Agents: load pending quote count for badge
    if (isAgentUser.value) {
      const quotes = await apiClient.call('councilsonlinehub.api.hub.get_agent_quote_requests')
      pendingQuoteCount.value = (quotes || []).filter(q => q.status === 'Invited').length
    }

    // Check for System Manager by attempting admin endpoint
    try {
      await apiClient.call('councilsonlinehub.api.hub.get_council_registry_all')
      isSystemManager.value = true
    } catch {
      isSystemManager.value = false
    }
  } catch {
    // ignore — nav degrades gracefully
  }
})

const isAgentUser = computed(() => {
  const r = userRole.value
  return r.includes('agent')
})

const navItems = computed(() => {
  const items = [
    { to: '/hub/dashboard', label: 'Dashboard' },
    { to: '/hub/councils',  label: 'Councils' },
  ]

  // Agents get: Profile + Quote Requests
  if (isAgentUser.value) {
    items.push({ to: '/hub/profile', label: 'Profile' })
    items.push({
      to: '/hub/agents',
      label: 'Quote Requests',
      badge: pendingQuoteCount.value || null,
    })
  } else {
    // Applicants and guests get: Profile + Find an Agent
    items.push({ to: '/hub/profile', label: 'Profile' })
    items.push({ to: '/hub/agents', label: 'Find an Agent' })
  }

  if (isSystemManager.value) {
    items.push({ to: '/hub/admin/councils', label: 'Admin' })
  }

  return items
})

const roleBadge = computed(() => {
  if (isAgentUser.value) return { label: 'Agent', class: 'bg-blue-100 text-blue-700' }
  return null
})

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

function logout() {
  session.logout.submit()
}
</script>
