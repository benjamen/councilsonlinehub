<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <router-link to="/hub/dashboard" class="text-gray-500 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </router-link>
          <h1 class="text-lg font-semibold text-gray-900">My Profile</h1>
        </div>
        <button @click="saveProfile" :disabled="saving"
          class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="flex justify-center py-16 text-sm text-gray-500">Loading...</div>

    <main v-else class="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <p class="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
        Your profile is automatically synced to each council when you log in for the first time.
      </p>

      <!-- Contact -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Contact Details</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
            <input v-model="form.phone" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      <!-- Business / Organisation Details -->
      <div v-if="hasBusinessType" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">{{ businessSectionLabel }}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-600 mb-1">{{ businessNameLabel }}</label>
            <input v-model="form.company_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">GST Number</label>
            <input v-model="form.gst_number" type="text" placeholder="Digits only" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Business Phone</label>
            <input v-model="form.business_phone" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      <!-- Directors / Officials -->
      <div v-if="showDirectors" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-700">{{ directorsLabel }}</h2>
          <button @click="addDirector" class="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add</button>
        </div>
        <div v-for="(d, idx) in directors" :key="idx" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
          <div>
            <label class="block text-xs text-gray-500 mb-1">First Name <span class="text-red-500">*</span></label>
            <input v-model="d.first_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Last Name <span class="text-red-500">*</span></label>
            <input v-model="d.last_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Email <span class="text-red-500">*</span></label>
            <input v-model="d.email" type="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div class="flex gap-2 items-end">
            <div class="flex-1">
              <label class="block text-xs text-gray-500 mb-1">Phone (NZ format)</label>
              <input v-model="d.phone" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <button @click="directors.splice(idx, 1)" class="mb-0.5 text-gray-400 hover:text-red-500 flex-shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <p v-if="!directors.length" class="text-sm text-gray-400">No entries yet</p>
      </div>

      <!-- Authorising Officer -->
      <div v-if="hasBusinessType" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Authorising Officer</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">First Name</label>
            <input v-model="form.ao_first_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
            <input v-model="form.ao_last_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Phone</label>
            <input v-model="form.ao_phone" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input v-model="form.ao_email" type="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      <!-- Physical Address -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Physical Address</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-600 mb-1">Flat/Unit &amp; Street</label>
            <input v-model="form.physical_flat_unit" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Rural Delivery No</label>
            <input v-model="form.physical_rural_delivery" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Suburb</label>
            <input v-model="form.physical_suburb" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">City/Town</label>
            <input v-model="form.physical_city" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Postcode</label>
            <input v-model="form.physical_postcode" type="text" maxlength="6" placeholder="4-6 digits" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      <!-- Mailing Address -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Mailing / Billing Address</h2>
        <div class="flex gap-6 mb-4">
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input v-model="form.mailing_type" type="radio" value="Same as Physical" />
            Same as Physical
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input v-model="form.mailing_type" type="radio" value="Postal Address" />
            Postal Address
          </label>
        </div>
        <div v-if="form.mailing_type === 'Postal Address'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-600 mb-1">PO Box / Private Bag</label>
            <input v-model="form.mailing_po_box" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Suburb</label>
            <input v-model="form.mailing_suburb" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Town/City</label>
            <input v-model="form.mailing_city" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Postcode</label>
            <input v-model="form.mailing_postcode" type="text" maxlength="6" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      <!-- Specialties (Agents only) -->
      <div v-if="isAgent" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Business Specialties</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <label v-for="s in SPECIALTIES" :key="s" class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" :value="s" v-model="selectedSpecialties" class="rounded text-blue-600" />
            {{ s }}
          </label>
        </div>
      </div>

      <p v-if="saveError" class="text-sm text-red-600 text-center">{{ saveError }}</p>
      <p v-if="saveSuccess" class="text-sm text-green-600 text-center">{{ saveSuccess }}</p>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { apiClient } from '@/services/api/base'

const SPECIALTIES = [
  'Resource Consent', 'Building Consent', 'Land Use', 'Subdivision',
  'Heritage', 'Environment', 'Planning', 'Engineering', 'Architecture', 'Other',
]

const loading = ref(true)
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref('')
const businessType = ref('')
const userRole = ref('')
const directors = ref([])
const selectedSpecialties = ref([])

const isAgent = computed(() => userRole.value === 'Agent')
const hasBusinessType = computed(() => !!businessType.value)
const isLimitedCompany = computed(() => businessType.value === 'Limited Company')
const isOrganisation = computed(() => businessType.value === 'Organisation')
const showDirectors = computed(() => isLimitedCompany.value || isOrganisation.value)
const businessSectionLabel = computed(() => isOrganisation.value ? 'Organisation Details' : 'Business Details')
const businessNameLabel = computed(() => isOrganisation.value ? 'Organisation Name' : 'Company Name')
const directorsLabel = computed(() => isOrganisation.value ? 'Officials / Signatories' : 'Company Directors')

const form = reactive({
  phone: '', company_name: '', gst_number: '', business_phone: '',
  physical_flat_unit: '', physical_rural_delivery: '', physical_suburb: '',
  physical_city: '', physical_postcode: '',
  mailing_type: 'Same as Physical', mailing_po_box: '', mailing_suburb: '',
  mailing_city: '', mailing_postcode: '',
  ao_first_name: '', ao_last_name: '', ao_phone: '', ao_email: '',
})

function addDirector() {
  directors.value.push({ first_name: '', last_name: '', email: '', phone: '' })
}

onMounted(async () => {
  try {
    const data = await apiClient.call('councilsonline.api.hub.get_hub_profile')
    const p = data || {}
    userRole.value = p.user_role || ''
    businessType.value = p.business_type || ''
    form.phone = p.phone || ''
    form.company_name = p.company_name || ''
    form.gst_number = p.gst_number || ''
    form.business_phone = p.business_phone || ''
    form.physical_flat_unit = p.physical_flat_unit || ''
    form.physical_rural_delivery = p.physical_rural_delivery || ''
    form.physical_suburb = p.physical_suburb || ''
    form.physical_city = p.physical_city || ''
    form.physical_postcode = p.physical_postcode || ''
    form.mailing_type = p.mailing_type || 'Same as Physical'
    form.mailing_po_box = p.mailing_po_box || ''
    form.mailing_suburb = p.mailing_suburb || ''
    form.mailing_city = p.mailing_city || ''
    form.mailing_postcode = p.mailing_postcode || ''
    selectedSpecialties.value = p.specialties || []
    directors.value = p.directors || []
    if (p.authorising_officer) {
      form.ao_first_name = p.authorising_officer.first_name || ''
      form.ao_last_name = p.authorising_officer.last_name || ''
      form.ao_phone = p.authorising_officer.phone || ''
      form.ao_email = p.authorising_officer.email || ''
    }
  } catch {}
  loading.value = false
})

async function saveProfile() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  try {
    const aoPayload = hasBusinessType.value ? {
      first_name: form.ao_first_name, last_name: form.ao_last_name,
      phone: form.ao_phone, email: form.ao_email,
    } : null
    const validDirs = directors.value.filter(d => d.first_name || d.last_name)

    await apiClient.call('councilsonline.api.hub.save_hub_profile', {
      phone: form.phone, company_name: form.company_name, gst_number: form.gst_number,
      business_phone: form.business_phone,
      physical_flat_unit: form.physical_flat_unit, physical_rural_delivery: form.physical_rural_delivery,
      physical_suburb: form.physical_suburb, physical_city: form.physical_city,
      physical_postcode: form.physical_postcode, mailing_type: form.mailing_type,
      mailing_po_box: form.mailing_po_box, mailing_suburb: form.mailing_suburb,
      mailing_city: form.mailing_city, mailing_postcode: form.mailing_postcode,
      specialties: JSON.stringify(isAgent.value ? selectedSpecialties.value : []),
      directors: validDirs.length ? JSON.stringify(validDirs) : undefined,
      authorising_officer: aoPayload ? JSON.stringify(aoPayload) : undefined,
      sq1_question: '', sq1_answer: '', sq2_question: '', sq2_answer: '', sq3_question: '', sq3_answer: '',
    })
    saveSuccess.value = 'Profile saved successfully'
    setTimeout(() => { saveSuccess.value = '' }, 3000)
  } catch (e) {
    saveError.value = (e && e.message) || 'Failed to save profile'
  } finally {
    saving.value = false
  }
}
</script>
