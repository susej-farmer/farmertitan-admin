<template>
  <div class="qr-inventory">
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div class="bg-blue-50 p-6 rounded-lg">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-blue-600">Available QRs</p>
            <p class="text-2xl font-bold text-gray-900">{{ summary.available_batch_qrs || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="bg-green-50 p-6 rounded-lg">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-green-600">Bound QRs</p>
            <p class="text-2xl font-bold text-gray-900">{{ summary.bound_qrs || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="bg-yellow-50 p-6 rounded-lg">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-yellow-600">Farm Generated</p>
            <p class="text-2xl font-bold text-gray-900">{{ summary.farm_individual_qrs || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="bg-purple-50 p-6 rounded-lg">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-purple-600">Total QRs</p>
            <p class="text-2xl font-bold text-gray-900">{{ summary.total_qrs || 0 }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-12 gap-3 items-end">
        <div class="col-span-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">Farm</label>
          <select 
            v-model="filters.farm_id" 
            @change="applyFilters"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
          >
            <option value="">All Farms</option>
            <option v-for="farm in farms" :key="farm.id" :value="farm.id">
              {{ farm.name }}
            </option>
          </select>
        </div>

        <div class="col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select 
            v-model="filters.status" 
            @change="applyFilters"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="bound">Bound</option>
            <option value="claimed">Claimed</option>
            <option value="farm_generated">Farm Generated</option>
          </select>
        </div>

        <div class="col-span-3">
          <label class="block text-sm font-medium text-gray-700 mb-1">Generation Type</label>
          <select 
            v-model="filters.generation_type" 
            @change="applyFilters"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
          >
            <option value="">All Types</option>
            <option value="batch">Batch</option>
            <option value="individual">Individual</option>
          </select>
        </div>

        <div class="col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input 
            v-model="filters.search"
            @input="applyFilters"
            type="text"
            placeholder="QR Code..."
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm"
          />
        </div>

        <div class="col-span-2">
          <button 
            @click="clearFilters"
            class="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      <span class="ml-2 text-gray-600">Loading QR inventory...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Error Loading Inventory</h3>
          <div class="mt-2 text-sm text-red-700">{{ error }}</div>
        </div>
      </div>
    </div>

    <!-- QR Table -->
    <div v-else class="bg-white shadow rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                QR Code
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Farm
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Generation
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bound Asset
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="qr in paginatedQRs" :key="qr.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="text-sm font-medium text-gray-900">{{ qr.short_code }}</div>
                  <button
                    @click="copyQRCode(qr.short_code)"
                    class="ml-2 p-1 text-gray-400 hover:text-gray-600"
                    title="Copy QR Code"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusClass(qr.status)">
                  {{ formatStatus(qr.status) }}
                </span>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ qr.farm_name || '-' }}
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ qr.generation_type === 'batch' ? qr.production_batch_code : 'Individual' }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ qr.generation_type }}
                </div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="qr.asset_name" class="text-sm text-gray-900">
                  {{ qr.asset_name }}
                  <div class="text-xs text-gray-500">{{ qr.bindable_type }}</div>
                </div>
                <div v-else class="text-sm text-gray-400">Unbound</div>
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(qr.created_at) }}
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    @click="viewQRDetails(qr)"
                    class="p-1 text-blue-600 hover:text-blue-800"
                    title="View Details"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  
                  <button
                    v-if="qr.status === 'farm_generated' || qr.status === 'ready_to_print'"
                    @click="printQR(qr)"
                    class="p-1 text-gray-600 hover:text-emerald-600"
                    title="Print QR"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-if="filteredQRs.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No QR codes found</h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ Object.keys(filters).some(key => filters[key]) ? 'Try adjusting your filters.' : 'Get started by generating QR codes.' }}
        </p>
      </div>

      <!-- Pagination -->
      <div v-if="filteredQRs.length > 0" class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            @click="goToPreviousPage"
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            @click="goToNextPage"
            :disabled="currentPage === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              Showing
              <span class="font-medium">{{ ((currentPage - 1) * itemsPerPage) + 1 }}</span>
              to
              <span class="font-medium">{{ Math.min(currentPage * itemsPerPage, filteredQRs.length) }}</span>
              of
              <span class="font-medium">{{ filteredQRs.length }}</span>
              results
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                @click="goToPreviousPage"
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
              <button
                @click="goToNextPage"
                :disabled="currentPage === totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { formatDate } from '@/utils/formatters'

// State
const qrs = ref([])
const farms = ref([])
const summary = ref({})
const isLoading = ref(false)
const error = ref(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(20)
const totalPages = computed(() => Math.ceil(filteredQRs.value.length / itemsPerPage.value))
const paginatedQRs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredQRs.value.slice(start, end)
})

// Filters
const filters = reactive({
  farm_id: '',
  status: '',
  generation_type: '',
  search: ''
})

// Computed
const filteredQRs = computed(() => {
  return qrs.value.filter(qr => {
    return (
      (!filters.farm_id || qr.farm_id === filters.farm_id) &&
      (!filters.status || qr.status === filters.status) &&
      (!filters.generation_type || qr.generation_type === filters.generation_type) &&
      (!filters.search || qr.short_code.toLowerCase().includes(filters.search.toLowerCase()))
    )
  })
})

// Methods
const loadQRInventory = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    // Load QR inventory data - this will be implemented with real API
    // For now, mock data
    qrs.value = [
      {
        id: '1',
        short_code: 'FT-ABC123',
        status: 'bound',
        farm_id: 'farm1',
        farm_name: 'Farm 1',
        generation_type: 'batch',
        production_batch_code: 'PRINT-2024-001',
        asset_name: 'John Deere Tractor',
        bindable_type: 'equipment',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        short_code: 'FT-DEF456',
        status: 'farm_generated',
        farm_id: 'farm1',
        farm_name: 'Farm 1',
        generation_type: 'individual',
        production_batch_code: null,
        asset_name: null,
        bindable_type: null,
        created_at: '2024-01-16T14:30:00Z'
      }
    ]
    
    summary.value = {
      available_batch_qrs: 50,
      bound_qrs: 25,
      farm_individual_qrs: 10,
      total_qrs: 85
    }
    
  } catch (err) {
    console.error('Error loading QR inventory:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

const loadFarms = async () => {
  try {
    // Load farms data - mock for now
    farms.value = [
      { id: 'farm1', name: 'Farm 1' },
      { id: 'farm2', name: 'Farm 2' }
    ]
  } catch (err) {
    console.error('Error loading farms:', err)
  }
}

const applyFilters = () => {
  currentPage.value = 1
}

const clearFilters = () => {
  filters.farm_id = ''
  filters.status = ''
  filters.generation_type = ''
  filters.search = ''
  currentPage.value = 1
}

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const goToPreviousPage = () => goToPage(currentPage.value - 1)
const goToNextPage = () => goToPage(currentPage.value + 1)

const getStatusClass = (status) => {
  const baseClass = 'inline-flex px-2 py-1 text-xs font-semibold rounded-full'
  
  switch (status) {
    case 'bound':
      return `${baseClass} bg-green-100 text-green-800`
    case 'farm_generated':
    case 'ready_to_print':
      return `${baseClass} bg-yellow-100 text-yellow-800`
    case 'claimed':
      return `${baseClass} bg-blue-100 text-blue-800`
    case 'allocated':
      return `${baseClass} bg-purple-100 text-purple-800`
    default:
      return `${baseClass} bg-gray-100 text-gray-800`
  }
}

const formatStatus = (status) => {
  switch (status) {
    case 'farm_generated':
      return 'Farm Generated'
    case 'ready_to_print':
      return 'Ready to Print'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

const copyQRCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code)
    // Show success message
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const viewQRDetails = (qr) => {
  // Open QR details modal
  console.log('View QR details:', qr)
}

const printQR = (qr) => {
  // Open print dialog for QR
  console.log('Print QR:', qr)
}

// Initialize
onMounted(async () => {
  await Promise.all([
    loadQRInventory(),
    loadFarms()
  ])
})
</script>