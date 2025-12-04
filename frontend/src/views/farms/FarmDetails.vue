<template>
  <div class="space-y-6">
    <!-- Header -->
    <div v-if="loading" class="text-center py-8">
      <div class="loading-spinner w-8 h-8 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading farm details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="card">
      <div class="card-body text-center py-8">
        <div class="text-red-500 mb-4">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Farm</h3>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button @click="loadFarm" class="btn btn-primary">
          Try Again
        </button>
      </div>
    </div>

    <!-- Farm Details -->
    <div v-else>
      <!-- Farm Info Header -->
      <div class="card">
        <div class="card-body">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ farm.name }}</h1>
              <div class="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {{ formatNumber(farm.acres) }} acres
                </span>
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m4.5 4.5V19.5a2.25 2.25 0 0 0 2.25 2.25h2.25a2.25 2.25 0 0 0 2.25-2.25v-.75m-6 0a2.25 2.25 0 0 1-2.25-2.25v-.75m6 0V15a2.25 2.25 0 0 1 2.25-2.25h.75m-6 0a2.25 2.25 0 0 0-2.25 2.25v.75m6 0a2.25 2.25 0 0 0 2.25-2.25V15m0 0V9.75a2.25 2.25 0 0 0-2.25-2.25H15" />
                  </svg>
                  {{ farm.equipment_count || 0 }} equipment
                </span>
                <span v-if="farm.active !== false" class="badge bg-green-100 text-green-800">Active</span>
                <span v-else class="badge bg-red-100 text-red-800">Inactive</span>
              </div>
            </div>
            <div>
              <button @click="editFarm" class="btn btn-secondary">
                Edit Farm
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              :class="[
                'py-4 px-6 border-b-2 font-medium text-sm flex items-center',
                activeTab === tab.key
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              <span v-html="tab.icon" class="w-5 h-5 mr-2"></span>
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Overview Tab -->
          <div v-if="activeTab === 'overview'" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Farm Information</h3>
                <dl class="space-y-3">
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Farm ID</dt>
                    <dd class="mt-1 text-sm text-gray-900 font-mono">{{ farm.id }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Name</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ farm.name }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Acres</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ formatNumber(farm.acres) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Status</dt>
                    <dd class="mt-1">
                      <span v-if="farm.active !== false" class="badge bg-green-100 text-green-800">Active</span>
                      <span v-else class="badge bg-red-100 text-red-800">Inactive</span>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Created</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ formatDate(farm.created_at) }}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 class="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
                <dl class="space-y-3">
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Total Equipment</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ farm.equipment_count || 0 }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Total Users</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ farm.user_count || 0 }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <!-- Equipment Tab -->
          <div v-if="activeTab === 'equipment'" class="space-y-6">
            <EquipmentListTab :farm="farm" />
          </div>

          <!-- Bulk Import Tab -->
          <div v-if="activeTab === 'import'" class="space-y-6">
            <BulkImportTab
              :farm="farm"
              @import-complete="onImportComplete"
              @view-equipment="onViewEquipment"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { farmsApi } from '@/services/farmsApi'
import { useNotifications } from '@/composables/useNotifications'
import BulkImportTab from '@/components/farms/BulkImportTab.vue'
import EquipmentListTab from '@/components/farms/EquipmentListTab.vue'

const route = useRoute()
const router = useRouter()
const { success, error: showError } = useNotifications()

// State
const farm = ref({})
const loading = ref(false)
const error = ref('')
const activeTab = ref('overview')

// Tabs configuration
const tabs = [
  {
    key: 'overview',
    label: 'Overview',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
  },
  {
    key: 'equipment',
    label: 'Equipment',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m4.5 4.5V19.5a2.25 2.25 0 0 0 2.25 2.25h2.25a2.25 2.25 0 0 0 2.25-2.25v-.75m-6 0a2.25 2.25 0 0 1-2.25-2.25v-.75m6 0V15a2.25 2.25 0 0 1 2.25-2.25h.75m-6 0a2.25 2.25 0 0 0-2.25 2.25v.75m6 0a2.25 2.25 0 0 0 2.25-2.25V15" /></svg>'
  },
  {
    key: 'import',
    label: 'Bulk Import',
    icon: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>'
  }
]

// Methods
const loadFarm = async () => {
  loading.value = true
  error.value = ''

  try {
    const farmId = route.params.id
    const response = await farmsApi.getFarm(farmId)

    if (response.success) {
      farm.value = response.data
    } else {
      throw new Error(response.message || 'Failed to load farm')
    }
  } catch (err) {
    console.error('Failed to load farm:', err)
    error.value = err.userMessage || err.message || 'Failed to load farm details'
  } finally {
    loading.value = false
  }
}

const editFarm = () => {
  // Navigate back to farms overview with edit mode
  router.push({ name: 'Farms', query: { edit: farm.value.id } })
}

const onImportComplete = (result) => {
  console.log('Import complete:', result)

  // Show appropriate message based on results
  if (result.skippedRecords > 0) {
    success(
      `Import completed: ${result.processedRecords} imported, ${result.skippedRecords} skipped`,
      '',
      5000
    )
  } else {
    success(`Successfully imported ${result.processedRecords} equipment items`)
  }

  // Update equipment count without full reload to preserve import results UI
  if (result.processedRecords > 0) {
    farm.value.equipment_count = (farm.value.equipment_count || 0) + result.processedRecords
  }
}

const onViewEquipment = () => {
  // Switch to Equipment tab
  activeTab.value = 'equipment'
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString()
}

const formatNumber = (value) => {
  if (!value) return '0'
  return new Intl.NumberFormat().format(value)
}

// Lifecycle
onMounted(() => {
  loadFarm()
})
</script>
