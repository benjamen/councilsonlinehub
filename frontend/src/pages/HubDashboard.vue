<template>
  <!-- ── Provisioning: seamless redirect spinner ──────────────────────── -->
  <div v-if="provisioning" class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded bg-blue-600 mb-5">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3M9 7h1m-1 4h1m4-4h1m-1 4h1M9 21v-3.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V21"/>
        </svg>
      </div>
      <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p class="text-gray-900 font-semibold text-sm">Setting up your council access…</p>
      <p class="text-gray-500 text-xs mt-1">You will be redirected automatically</p>
    </div>
  </div>

  <div v-else class="min-h-screen bg-gray-50">
    <HubNav />

    <!-- ═══════════════════════════════════════════════════════════════
         NEW USER — landing page experience (no councils yet)
    ════════════════════════════════════════════════════════════════ -->
    <template v-if="isNewUser">

      <!-- Hero - flat header -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-5xl mx-auto px-6 py-10">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3M9 7h1m-1 4h1m4-4h1m-1 4h1M9 21v-3.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V21"/>
              </svg>
            </div>
            <span class="font-bold text-gray-900 text-lg">CouncilsOnline</span>
          </div>

          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome, {{ firstName }}</h1>
          <p class="text-gray-500 text-sm sm:text-base max-w-2xl mb-7">
            Submit building consents, resource applications and more — managed in one place across every participating New Zealand council.
          </p>

          <div class="flex flex-wrap gap-3">
            <router-link to="/hub/councils"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded hover:bg-blue-700 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3"/>
              </svg>
              Register with a Council
            </router-link>
            <router-link to="/hub/profile"
              class="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 font-semibold text-sm rounded hover:bg-gray-50 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Complete Your Profile
            </router-link>
          </div>

          <!-- Stats row -->
          <div class="flex flex-wrap items-center gap-x-8 gap-y-2 mt-7 pt-6 border-t border-gray-100">
            <div v-for="feat in features" :key="feat.label">
              <div class="text-lg font-bold text-gray-900">{{ feat.value }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ feat.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile completeness banner (if profile incomplete) -->
      <div v-if="!profileLoading && profileCompletion.pct < 100"
        class="bg-amber-50 border-b border-amber-200">
        <div class="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-amber-900">Your profile is {{ profileCompletion.pct }}% complete</p>
              <p class="text-xs text-amber-700 mt-0.5">
                Missing: {{ profileCompletion.missing.join(', ') }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <div class="w-32 bg-amber-200 rounded-full h-2">
              <div class="bg-amber-500 h-2 rounded-full transition-all" :style="`width:${profileCompletion.pct}%`"></div>
            </div>
            <router-link to="/hub/profile"
              class="px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap">
              Complete Now
            </router-link>
          </div>
        </div>
      </div>

      <!-- How it works -->
      <div class="max-w-5xl mx-auto px-6 py-16 sm:py-20">
        <div class="text-center mb-12">
          <p class="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Simple from day one</p>
          <h2 class="text-2xl sm:text-3xl font-bold text-gray-900">How CouncilsOnline works</h2>
          <p class="text-gray-500 text-sm mt-2 max-w-lg mx-auto">Three steps to submit your first application — no paperwork, no in-person visits required.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div v-for="(step, i) in onboardingSteps" :key="i"
            class="bg-white rounded-lg border border-gray-200 p-5">
            <div class="flex items-center gap-2 mb-3">
              <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" :class="step.numBg">
                {{ i + 1 }}
              </span>
              <div class="w-8 h-8 rounded flex items-center justify-center" :class="step.iconBg">
                <svg class="w-4 h-4" :class="step.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="step.icon"/>
                </svg>
              </div>
            </div>
            <h3 class="text-sm font-semibold text-gray-900 mb-1">{{ step.title }}</h3>
            <p class="text-xs text-gray-500 leading-relaxed">{{ step.desc }}</p>
          </div>
        </div>

        <!-- CTA strip -->
        <div class="border border-blue-200 bg-blue-50 rounded-lg p-6 sm:p-8">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 class="text-base font-bold text-gray-900 mb-1">Ready to register with a council?</h3>
              <p class="text-gray-500 text-sm">Browse participating councils and connect your account in seconds.</p>
            </div>
            <router-link to="/hub/councils"
              class="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded hover:bg-blue-700 transition-colors whitespace-nowrap">
              Browse Councils
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </router-link>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         RETURNING USER — dashboard
    ════════════════════════════════════════════════════════════════ -->
    <template v-else>

      <!-- Page header - flat -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-3">
              <!-- Avatar -->
              <div class="w-10 h-10 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span class="text-sm font-bold text-white">{{ initials }}</span>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-0.5">
                  <p class="text-gray-500 text-xs font-medium">Welcome back</p>
                  <span v-if="profileCompletion.pct === 100" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-semibold">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                    Profile complete
                  </span>
                </div>
                <h1 class="text-xl font-bold text-gray-900 leading-tight">{{ fullName }}</h1>
                <p v-if="profile" class="text-gray-500 text-sm mt-0.5">
                  {{ profile.company_name || profile.trading_name || profile.business_type || 'Agent' }}
                </p>
              </div>
            </div>

            <div class="flex gap-2 flex-shrink-0">
              <a v-if="firstCouncilUrl" :href="firstCouncilUrl" target="_blank"
                class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                New Application
              </a>
              <router-link to="/hub/councils"
                class="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded hover:bg-gray-50 transition-colors">
                My Councils
              </router-link>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div v-for="stat in heroStats" :key="stat.label"
              class="border border-gray-200 rounded px-4 py-3 bg-gray-50">
              <p class="text-xl font-bold text-gray-900">
                <span v-if="requestsLoading" class="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse"></span>
                <span v-else>{{ stat.value }}</span>
              </p>
              <p class="text-gray-500 text-xs mt-0.5">{{ stat.label }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Profile completeness alert (returning user, incomplete) -->
      <div v-if="!profileLoading && profileCompletion.pct < 100"
        class="bg-amber-50 border-b border-amber-200">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="text-sm text-amber-800 font-medium">Profile {{ profileCompletion.pct }}% complete — missing: {{ profileCompletion.missing.join(', ') }}</span>
          </div>
          <router-link to="/hub/profile" class="text-xs font-bold text-amber-700 underline underline-offset-2 hover:text-amber-900 whitespace-nowrap">
            Complete profile →
          </router-link>
        </div>
      </div>

      <!-- Main grid -->
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Applications card -->
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 class="text-base font-semibold text-gray-900">Recent Applications</h2>
                  <p class="text-xs text-gray-400 mt-0.5">Across all your councils</p>
                </div>
                <button @click="showFilters = !showFilters"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
                  </svg>
                  Filter
                </button>
              </div>

              <div v-if="showFilters" class="flex flex-wrap gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100">
                <select v-model="filterCouncil"
                  class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All Councils</option>
                  <option v-for="c in councilOptions" :key="c" :value="c">{{ c }}</option>
                </select>
                <select v-model="filterStatus"
                  class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">All Statuses</option>
                  <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
                </select>
                <input v-model="filterText" type="text" placeholder="Search applications…"
                  class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm flex-1 min-w-36 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
                <button @click="loadRequests" :disabled="requestsLoading"
                  class="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  Refresh
                </button>
              </div>

              <!-- Skeleton -->
              <div v-if="requestsLoading" class="divide-y divide-gray-50">
                <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-6 py-4 animate-pulse">
                  <div class="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0"></div>
                  <div class="flex-1 space-y-1.5">
                    <div class="h-3.5 bg-gray-200 rounded w-32"></div>
                    <div class="h-3 bg-gray-100 rounded w-48"></div>
                  </div>
                  <div class="h-5 bg-gray-200 rounded-full w-20"></div>
                  <div class="h-3 bg-gray-100 rounded w-16"></div>
                </div>
              </div>

              <!-- Empty with applications but filtered to zero -->
              <div v-else-if="!displayedRequests.length" class="px-6 py-12 text-center">
                <svg class="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p class="text-sm font-medium text-gray-700">No applications found</p>
                <p class="text-xs text-gray-400 mt-1">{{ filterCouncil || filterStatus || filterText ? 'Try clearing your filters' : '' }}</p>
              </div>

              <!-- List -->
              <div v-else class="divide-y divide-gray-50">
                <div v-for="req in displayedRequests" :key="req.request_number"
                  @click="openRequest(req)"
                  class="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors group">
                  <div class="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" :class="statusDot(req.workflow_state)"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-blue-600 group-hover:text-blue-700 truncate">
                      {{ req.request_number }}
                      <span class="text-gray-300 font-normal mx-1">·</span>
                      <span class="text-gray-600 font-normal">{{ req.request_type || 'Application' }}</span>
                    </p>
                    <p class="text-xs text-gray-400 mt-0.5 truncate">{{ req.council_name }}</p>
                  </div>
                  <span class="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold" :class="statusClass(req.workflow_state)">
                    {{ req.workflow_state || 'Draft' }}
                  </span>
                  <span class="flex-shrink-0 text-xs text-gray-400 hidden sm:block">{{ formatDate(req.submitted_date) }}</span>
                  <button @click="openMessages(req, $event)"
                    class="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="View / send messages">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                  </button>
                  <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>

              <div v-if="!requestsLoading && filteredRequests.length > 10"
                class="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                <p class="text-xs text-gray-400">Showing {{ displayedRequests.length }} of {{ filteredRequests.length }}</p>
                <button @click="showAll = !showAll" class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  {{ showAll ? 'Show less' : `Show all ${filteredRequests.length}` }}
                </button>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-4">

            <!-- Quick actions -->
            <div class="bg-white rounded-lg border border-gray-200 p-5">
              <h3 class="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div class="space-y-2">
                <a v-if="firstCouncilUrl" :href="firstCouncilUrl" target="_blank"
                  class="flex items-center gap-3 px-3 py-2.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors group">
                  <div class="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                  </div>
                  <span class="text-sm font-semibold">New Application</span>
                  <svg class="w-4 h-4 ml-auto opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </a>
                <router-link to="/hub/councils"
                  class="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-gray-50 border border-gray-200 transition-colors group">
                  <div class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3"/>
                    </svg>
                  </div>
                  <span class="text-sm font-medium text-gray-700 group-hover:text-gray-900">Browse Councils</span>
                  <svg class="w-4 h-4 ml-auto text-gray-300 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </router-link>
                <router-link to="/hub/profile"
                  class="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-gray-50 border border-gray-200 transition-colors group">
                  <div class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-700 group-hover:text-gray-900">Edit Profile</span>
                    <div v-if="profileCompletion.pct < 100" class="mt-1 w-full bg-gray-100 rounded-full h-1">
                      <div class="bg-amber-400 h-1 rounded-full" :style="`width:${profileCompletion.pct}%`"></div>
                    </div>
                  </div>
                  <span v-if="profileCompletion.pct < 100" class="text-xs text-amber-600 font-semibold flex-shrink-0">{{ profileCompletion.pct }}%</span>
                  <svg v-else class="w-4 h-4 ml-auto text-gray-300 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </router-link>
              </div>
            </div>

            <!-- Profile card -->
            <div class="bg-white rounded-lg border border-gray-200 p-5">
              <div v-if="profileLoading" class="animate-pulse space-y-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                  <div class="space-y-1.5 flex-1">
                    <div class="h-3.5 bg-gray-200 rounded w-32"></div>
                    <div class="h-3 bg-gray-100 rounded w-20"></div>
                  </div>
                </div>
              </div>
              <div v-else-if="profile">
                <div class="flex items-start gap-3 mb-3">
                  <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span class="text-sm font-bold text-white">{{ initials }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">{{ fullName }}</p>
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mt-1">
                      {{ profile.business_type || 'Agent' }}
                    </span>
                  </div>
                </div>
                <div v-if="profile.physical_city" class="text-xs text-gray-400 mb-3 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {{ profile.physical_city }}
                </div>
                <div v-if="profile.specialties && profile.specialties.length" class="flex flex-wrap gap-1.5 mb-3">
                  <span v-for="s in profile.specialties.slice(0, 4)" :key="s"
                    class="px-2 py-0.5 rounded-md text-xs bg-sky-50 text-sky-700 font-medium border border-sky-100">{{ s }}</span>
                  <span v-if="profile.specialties.length > 4" class="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-500">
                    +{{ profile.specialties.length - 4 }}
                  </span>
                </div>
                <div v-if="isCompanyAgent" class="border-t border-gray-100 pt-3 mt-1 space-y-1.5">
                  <div v-if="profile.company_name" class="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/>
                    </svg>
                    <span class="truncate font-medium text-gray-700">{{ profile.company_name }}</span>
                  </div>
                  <div v-if="profile.gst_number" class="flex items-center gap-1.5 text-xs text-gray-500">
                    <span class="font-medium text-gray-400">GST</span>
                    <span class="font-mono text-gray-700">{{ profile.gst_number }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quote Requests card (agents only) -->
            <div v-if="isAgent" class="bg-white rounded-lg border border-gray-200 p-5">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-gray-900">Quote Requests</h3>
                <div class="flex items-center gap-2">
                  <span v-if="quoteRequests.filter(q => q.status === 'Invited').length"
                    class="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    {{ quoteRequests.filter(q => q.status === 'Invited').length }} new
                  </span>
                  <router-link to="/hub/my-quotes"
                    class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    History →
                  </router-link>
                </div>
              </div>
              <div v-if="quotesLoading" class="space-y-2 animate-pulse">
                <div v-for="i in 2" :key="i" class="h-12 bg-gray-100 rounded-lg"></div>
              </div>
              <div v-else-if="!quoteRequests.length" class="text-center py-3">
                <p class="text-xs text-gray-400">No pending quote requests</p>
              </div>
              <div v-else class="space-y-2">
                <div v-for="quote in quoteRequests.slice(0, 4)" :key="quote.name"
                  class="rounded border border-gray-200 p-3">
                  <div class="flex items-start justify-between gap-2 mb-1.5">
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-semibold text-gray-800 truncate">{{ quote.request_type || quote.request }}</p>
                      <p class="text-xs text-gray-400 truncate">{{ quote.council_name }}</p>
                    </div>
                    <span :class="quote.status === 'Quoted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
                      class="flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                      {{ quote.status }}
                    </span>
                  </div>
                  <div v-if="quote.status === 'Invited'" class="flex gap-1.5">
                    <button @click="openQuoteModal(quote)"
                      class="flex-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      Quote
                    </button>
                    <button @click="declineQuote(quote)"
                      class="flex-1 px-2.5 py-1 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                      Decline
                    </button>
                  </div>
                  <div v-else class="text-xs text-gray-500">
                    ${{ quote.fee_estimate }} · {{ quote.estimated_days }} days
                  </div>
                </div>
                <router-link v-if="quoteRequests.length > 4" to="/hub/my-quotes"
                  class="block text-xs text-blue-600 hover:text-blue-700 text-center pt-1 font-medium">
                  +{{ quoteRequests.length - 4 }} more — View all
                </router-link>
              </div>
            </div>

            <!-- Councils card -->
            <div class="bg-white rounded-lg border border-gray-200 p-5">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold text-gray-900">Your Councils</h3>
                <router-link to="/hub/councils" class="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Manage →
                </router-link>
              </div>
              <div v-if="requestsLoading" class="space-y-2 animate-pulse">
                <div v-for="i in 3" :key="i" class="h-8 bg-gray-100 rounded-lg"></div>
              </div>
              <div v-else-if="registeredCouncils.length === 0" class="text-center py-4">
                <p class="text-xs text-gray-400 mb-2">No councils yet</p>
                <router-link to="/hub/councils" class="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  + Add a council
                </router-link>
              </div>
              <div v-else class="space-y-1">
                <a v-for="council in registeredCouncils.slice(0, 5)" :key="council.name"
                  :href="council.url + '/frontend/'" target="_blank"
                  class="flex items-center justify-between px-3 py-2 rounded hover:bg-blue-50 transition-colors group">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                    <span class="text-sm text-gray-700 truncate group-hover:text-blue-700">{{ council.name }}</span>
                  </div>
                  <span class="text-xs text-blue-400 group-hover:text-blue-600 flex-shrink-0 ml-2">Open →</span>
                </a>
                <p v-if="registeredCouncils.length > 5" class="text-xs text-gray-400 px-3 pt-1">
                  +{{ registeredCouncils.length - 5 }} more
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Quote Submission Modal -->
    <div v-if="showQuoteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-md border border-gray-200 max-w-md w-full p-6">
        <h3 class="text-base font-semibold text-gray-900 mb-1">Submit Quote</h3>
        <p class="text-xs text-gray-500 mb-4">{{ activeQuote?.request_type }} — {{ activeQuote?.council_name }}</p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fee Estimate ($) <span class="text-red-500">*</span></label>
            <input type="number" v-model="quoteForm.feeEstimate" step="0.01" min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Timeline (working days) <span class="text-red-500">*</span></label>
            <input type="number" v-model="quoteForm.estimatedDays" min="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cover Note</label>
            <textarea v-model="quoteForm.coverNote" rows="3" placeholder="Describe your experience and approach..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-5">
          <button @click="submitQuote" :disabled="submittingQuote || !quoteForm.feeEstimate || !quoteForm.estimatedDays"
            class="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {{ submittingQuote ? 'Submitting…' : 'Submit Quote' }}
          </button>
          <button @click="showQuoteModal = false"
            class="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Messages modal (NZ-547) -->
  <HubMessagesModal
    v-if="showMessagesModal && activeMessage"
    :council-code="activeMessage.councilCode"
    :request-id="activeMessage.requestId"
    :request-number="activeMessage.requestNumber"
    :council-name="activeMessage.councilName"
    @close="showMessagesModal = false"
  />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiClient } from '@/services/api/base'
import HubNav from '@/components/HubNav.vue'
import HubMessagesModal from '@/components/HubMessagesModal.vue'
import { session } from '@/data/session'

const allRequests    = ref([])
const requestsLoading = ref(true)
const showFilters    = ref(false)
const showAll        = ref(false)
const filterCouncil  = ref('')
const filterStatus   = ref('')
const filterText     = ref('')

const profile        = ref(null)
const profileLoading = ref(true)

// Messages modal
const showMessagesModal = ref(false)
const activeMessage     = ref(null)

function openMessages(req, e) {
  e.stopPropagation()
  activeMessage.value = {
    councilCode:   req.council_code || '',
    requestId:     req.request_number,
    requestNumber: req.request_number,
    councilName:   req.council_name || '',
    councilUrl:    req.council_url  || '',
  }
  showMessagesModal.value = true
}

// Quote requests (agent only)
const quoteRequests     = ref([])
const quotesLoading     = ref(false)
const showQuoteModal    = ref(false)
const activeQuote       = ref(null)
const quoteForm         = ref({ feeEstimate: '', estimatedDays: '', coverNote: '' })
const submittingQuote   = ref(false)

async function loadQuoteRequests() {
  quotesLoading.value = true
  try {
    quoteRequests.value = await apiClient.call('councilsonlinehub.api.hub.get_agent_quote_requests') || []
  } catch {
    quoteRequests.value = []
  } finally {
    quotesLoading.value = false
  }
}

function openQuoteModal(quote) {
  activeQuote.value = quote
  quoteForm.value = { feeEstimate: '', estimatedDays: '', coverNote: '' }
  showQuoteModal.value = true
}

async function submitQuote() {
  if (!activeQuote.value) return
  submittingQuote.value = true
  try {
    const url = activeQuote.value.council_url + '/api/method/councilsonline.api.agents.submit_agent_quote'
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_name: activeQuote.value.request,
        fee_estimate: quoteForm.value.feeEstimate,
        estimated_days: quoteForm.value.estimatedDays,
        cover_note: quoteForm.value.coverNote,
      }),
    })
    if (resp.ok) {
      showQuoteModal.value = false
      await loadQuoteRequests()
    }
  } catch (e) {
    console.error('Failed to submit quote', e)
  } finally {
    submittingQuote.value = false
  }
}

async function declineQuote(quote) {
  try {
    const url = quote.council_url + '/api/method/councilsonline.api.agents.decline_agent_quote'
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote_name: quote.name }),
    })
    await loadQuoteRequests()
  } catch (e) {
    console.error('Failed to decline quote', e)
  }
}

// ── Onboarding content ────────────────────────────────────

const onboardingSteps = [
  {
    numBg: 'bg-blue-600',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3',
    title: 'Register with a Council',
    desc: 'Browse participating councils and register once to gain access. Your profile data is shared automatically.',
  },
  {
    numBg: 'bg-sky-500',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    title: 'Submit Applications',
    desc: 'Use guided application forms for building consents, resource consents and more — from any council in your list.',
  },
  {
    numBg: 'bg-indigo-500',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    title: 'Track Progress',
    desc: 'Monitor every application across all councils in one dashboard. Get notified on status changes and decisions.',
  },
]

const features = [
  { value: '16+',  label: 'Participating councils' },
  { value: '1',    label: 'Account for all' },
  { value: '100%', label: 'Online process' },
  { value: '24/7', label: 'Available anytime' },
]

// ── Computed ──────────────────────────────────────────────

const firstName = computed(() => {
  if (!profile.value) return session.user?.split('@')[0] || ''
  return profile.value.first_name || profile.value.company_name || session.user?.split('@')[0] || ''
})

const fullName = computed(() => {
  if (!profile.value) return session.user || ''
  const u = profile.value
  if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`
  return u.company_name || u.trading_name || session.user || ''
})

const initials = computed(() => {
  const name = fullName.value || session.user || ''
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
})

const isCompanyAgent = computed(() => {
  if (!profile.value) return false
  const type = (profile.value.business_type || '').toLowerCase()
  return type.includes('company') || type.includes('ltd') || type.includes('limited') ||
    !!profile.value.company_number || !!(profile.value.directors && profile.value.directors.length)
})

const profileCompletion = computed(() => {
  if (!profile.value) return { pct: 0, missing: ['Profile not loaded'] }
  const p = profile.value
  const checks = [
    { label: 'Phone', ok: !!p.phone },
    { label: 'Address', ok: !!(p.physical_flat_unit || p.physical_city) },
    { label: 'City', ok: !!p.physical_city },
  ]
  if (isCompanyAgent.value) {
    checks.push({ label: 'Business name', ok: !!(p.company_name || p.trading_name) })
    checks.push({ label: 'Specialties', ok: !!(p.specialties && p.specialties.length) })
    checks.push({ label: 'Director', ok: !!(p.directors && p.directors.length && p.directors[0].first_name) })
  } else {
    checks.push({ label: 'Specialties', ok: !!(p.specialties && p.specialties.length) })
  }
  const missing = checks.filter(c => !c.ok).map(c => c.label)
  const pct = Math.round(((checks.length - missing.length) / checks.length) * 100)
  return { pct, missing }
})

const councilOptions  = computed(() => [...new Set(allRequests.value.map(r => r.council_name).filter(Boolean))])
const statusOptions   = computed(() => [...new Set(allRequests.value.map(r => r.workflow_state).filter(Boolean))])

const filteredRequests = computed(() => allRequests.value.filter(r => {
  if (filterCouncil.value && r.council_name !== filterCouncil.value) return false
  if (filterStatus.value  && r.workflow_state !== filterStatus.value)  return false
  if (filterText.value) {
    const q = filterText.value.toLowerCase()
    if (!(r.request_number || '').toLowerCase().includes(q) &&
        !(r.request_type   || '').toLowerCase().includes(q)) return false
  }
  return true
}))

const displayedRequests = computed(() =>
  showAll.value ? filteredRequests.value : filteredRequests.value.slice(0, 10)
)

const heroStats = computed(() => [
  { label: 'Total',       value: allRequests.value.length },
  { label: 'In Progress', value: allRequests.value.filter(r => r.workflow_state && !['Approved','Granted','Declined','Withdrawn'].includes(r.workflow_state)).length },
  { label: 'Approved',    value: allRequests.value.filter(r => ['Approved','Granted'].includes(r.workflow_state)).length },
  { label: 'Councils',    value: councilOptions.value.length },
])

const registeredCouncils = computed(() => {
  const seen = new Map()
  allRequests.value.forEach(r => {
    if (r.council_name && r.council_url && !seen.has(r.council_name))
      seen.set(r.council_name, { name: r.council_name, url: r.council_url })
  })
  return [...seen.values()]
})

const firstCouncilUrl = computed(() =>
  registeredCouncils.value.length ? registeredCouncils.value[0].url + '/frontend/' : null
)

const isNewUser = computed(() =>
  !requestsLoading.value && !profileLoading.value && allRequests.value.length === 0
)

const isAgent = computed(() => {
  if (!profile.value) return false
  const role = (profile.value.user_role || '').toLowerCase()
  return role.includes('agent') || !!(profile.value.company_name || profile.value.business_type)
})

// ── Helpers ───────────────────────────────────────────────

function statusClass(state) {
  if (!state) return 'bg-gray-100 text-gray-600'
  if (['Approved','Granted'].includes(state))          return 'bg-green-100 text-green-700'
  if (['Declined','Withdrawn'].includes(state))        return 'bg-red-100 text-red-700'
  if (['Submitted','Under Review','Processing'].includes(state)) return 'bg-blue-100 text-blue-700'
  return 'bg-amber-100 text-amber-700'
}

function statusDot(state) {
  if (!state) return 'bg-gray-300'
  if (['Approved','Granted'].includes(state))          return 'bg-green-500'
  if (['Declined','Withdrawn'].includes(state))        return 'bg-red-400'
  if (['Submitted','Under Review','Processing'].includes(state)) return 'bg-blue-500'
  return 'bg-amber-400'
}

function formatDate(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

function openRequest(req) {
  if (req.council_url && req.request_number)
    window.open(req.council_url + '/frontend/request/' + req.request_number, '_blank')
}

// ── Data loading ──────────────────────────────────────────

async function loadProfile() {
  profileLoading.value = true
  try {
    profile.value = await apiClient.call('councilsonlinehub.api.hub.get_hub_profile')
  } catch {
    profile.value = null
  } finally {
    profileLoading.value = false
  }
}

async function loadRequests() {
  requestsLoading.value = true
  try {
    const result = await apiClient.call('councilsonlinehub.api.hub.aggregate_requests')
    allRequests.value = result || []
  } catch {
    allRequests.value = []
  } finally {
    requestsLoading.value = false
  }
}

// ── Provisioning ──────────────────────────────────────────

const PENDING_KEY = 'pending_council_code'
const AO_TOKEN_KEY = 'pending_ao_token'
const AO_COUNCIL_KEY = 'pending_ao_council'
const provisioning = ref(!!(localStorage.getItem(PENDING_KEY) || localStorage.getItem(AO_TOKEN_KEY)))

async function provisionPendingCouncil() {
  const code = localStorage.getItem(PENDING_KEY)
  if (!code) return
  localStorage.removeItem(PENDING_KEY)
  try {
    const result = await apiClient.call(
      'councilsonlinehub.api.hub.provision_on_council',
      { council_code: code }
    )
    if (result && result.auto_login_url) {
      window.location.href = result.auto_login_url
      return
    }
  } catch (e) {
    console.error('Auto-provision failed:', e)
  }
  provisioning.value = false
}

async function provisionPendingAo() {
  const token = localStorage.getItem(AO_TOKEN_KEY)
  const councilCode = localStorage.getItem(AO_COUNCIL_KEY)
  if (!token) return
  localStorage.removeItem(AO_TOKEN_KEY)
  localStorage.removeItem(AO_COUNCIL_KEY)
  try {
    const result = await apiClient.call(
      'councilsonlinehub.api.hub.provision_ao_to_council',
      { ao_token: token, council_code: councilCode }
    )
    if (result && result.auto_login_url) {
      window.location.href = result.auto_login_url
      return
    }
  } catch (e) {
    console.error('AO provision failed:', e)
  }
  provisioning.value = false
}

onMounted(() => {
  if (localStorage.getItem(AO_TOKEN_KEY)) {
    provisionPendingAo()
  } else if (localStorage.getItem(PENDING_KEY)) {
    provisionPendingCouncil()
  } else {
    provisioning.value = false
    loadProfile().then(() => {
      if (isAgent.value) loadQuoteRequests()
    })
    loadRequests()
  }
})
</script>
