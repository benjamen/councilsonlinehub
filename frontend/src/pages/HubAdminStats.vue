<template>
  <div class="min-h-screen bg-gray-50">
    <HubNav />

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div class="mb-6">
        <h1 class="text-xl font-semibold text-gray-900">Platform Statistics</h1>
        <p class="text-sm text-gray-500 mt-0.5">Overview of councils, users and activity across the hub</p>
      </div>

      <div v-if="!isAdmin" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
        System Manager access required.
      </div>

      <div v-else-if="loading" class="text-sm text-gray-400 text-center py-16">Loading…</div>

      <div v-else class="space-y-6">
        <!-- Councils -->
        <div>
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Councils</h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Councils" :value="stats.total_councils" color="blue" />
            <StatCard label="Active" :value="stats.active_councils" color="green" />
            <StatCard label="Inactive" :value="stats.inactive_councils" color="gray" />
          </div>
        </div>

        <!-- Users -->
        <div>
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Platform Users</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard label="Applicants" :value="stats.total_applicants" color="purple" />
            <StatCard label="Agents" :value="stats.total_agents" color="indigo" />
          </div>
        </div>

        <!-- Requests -->
        <div>
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Activity</h2>
          <div class="grid grid-cols-1 sm:grid-cols-1 gap-4">
            <StatCard label="Total Consent Requests" :value="stats.total_requests" color="blue" />
          </div>
        </div>

        <!-- Quick nav to admin areas -->
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h2 class="text-sm font-semibold text-gray-700 mb-3">Quick Navigation</h2>
          <div class="flex flex-wrap gap-2">
            <router-link to="/hub/admin/councils"
              class="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Council Registry
            </router-link>
            <router-link to="/hub/admin/users"
              class="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
              COL Admin Users
            </router-link>
            <router-link to="/hub/admin/platform-users"
              class="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Platform Users
            </router-link>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HubNav from '@/components/HubNav.vue'
import { apiClient } from '@/services/api/base'

const loading = ref(true)
const isAdmin = ref(false)
const stats = ref({
  total_councils: 0,
  active_councils: 0,
  inactive_councils: 0,
  total_applicants: 0,
  total_agents: 0,
  total_requests: 0,
})

onMounted(async () => {
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.get_platform_stats')
    stats.value = result || stats.value
    isAdmin.value = true
  } catch {
    isAdmin.value = false
  }
  loading.value = false
})
</script>

<!-- Inline stat card component for this page -->
<script>
import { defineComponent, h } from 'vue'

const colorMap = {
  blue:   { card: 'bg-blue-50 border-blue-100',   num: 'text-blue-700',   label: 'text-blue-500' },
  green:  { card: 'bg-green-50 border-green-100',  num: 'text-green-700',  label: 'text-green-500' },
  gray:   { card: 'bg-gray-50 border-gray-200',    num: 'text-gray-700',   label: 'text-gray-500' },
  purple: { card: 'bg-purple-50 border-purple-100',num: 'text-purple-700', label: 'text-purple-500' },
  indigo: { card: 'bg-indigo-50 border-indigo-100',num: 'text-indigo-700', label: 'text-indigo-500' },
}

export const StatCard = defineComponent({
  name: 'StatCard',
  props: {
    label: String,
    value: { type: Number, default: 0 },
    color: { type: String, default: 'blue' },
  },
  setup(props) {
    return () => {
      const c = colorMap[props.color] || colorMap.blue
      return h('div', { class: `rounded-xl border p-5 ${c.card}` }, [
        h('p', { class: `text-3xl font-bold tabular-nums ${c.num}` }, props.value),
        h('p', { class: `text-sm font-medium mt-1 ${c.label}` }, props.label),
      ])
    }
  },
})
</script>
