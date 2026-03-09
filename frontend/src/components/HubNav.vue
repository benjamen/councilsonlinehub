<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-30">
    <div class="max-w-5xl mx-auto px-4 sm:px-6">
      <div class="flex items-center justify-between h-16">

        <!-- Logo + brand -->
        <router-link to="/hub/dashboard" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span class="font-semibold text-gray-900 text-base">CouncilsOnline Hub</span>
        </router-link>

        <!-- Nav links (desktop) -->
        <nav class="hidden sm:flex items-center gap-1">
          <router-link
            to="/hub/dashboard"
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="isActive('/hub/dashboard') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
          >
            Dashboard
          </router-link>
          <router-link
            to="/hub/councils"
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="isActive('/hub/councils') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
          >
            Councils
          </router-link>
          <router-link
            to="/hub/profile"
            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="isActive('/hub/profile') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
          >
            Profile
          </router-link>
        </nav>

        <!-- Right side: user + logout -->
        <div class="flex items-center gap-2">
          <span class="hidden sm:block text-sm text-gray-500">{{ userName }}</span>
          <button
            @click="logout"
            class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <!-- Mobile nav -->
      <div class="flex sm:hidden gap-1 pb-2">
        <router-link
          to="/hub/dashboard"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="isActive('/hub/dashboard') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
        >Dashboard</router-link>
        <router-link
          to="/hub/councils"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="isActive('/hub/councils') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
        >Councils</router-link>
        <router-link
          to="/hub/profile"
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="isActive('/hub/profile') ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'"
        >Profile</router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { session } from '@/data/session'

const route = useRoute()

const userName = computed(() => session.user || '')

function isActive(path) {
  return route.path === path
}

function logout() {
  session.logout.submit()
}
</script>
