<template>
  <div class="qr-registry">
    <!-- Header with search -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900">QR Registry</h3>
        <p class="text-sm text-gray-500">Complete database of all QR codes in the system</p>
      </div>
      <div class="flex space-x-3">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search QR codes..."
            class="block w-80 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
          />
          <svg class="absolute right-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          @click="exportRegistry"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select v-model="filters.status" class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="bound">Bound</option>
            <option value="allocated">Allocated</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Farm</label>
          <select v-model="filters.farm" class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
            <option value="">All Farms</option>
            <option v-for="farm in farms" :key="farm.id" :value="farm.id">{{ farm.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
          <select v-model="filters.assetType" class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
            <option value="">All Types</option>
            <option value="equipment">Equipment</option>
            <option value="part">Part</option>
            <option value="consumable">Consumable</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
          <select v-model="filters.dateRange" class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Registry table -->
    <div class="bg-white shadow overflow-hidden sm:rounded-md">
      <div class="px-4 py-5 sm:p-6">
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
                  Binding
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="qr in filteredQRCodes" :key="qr.id">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                        <svg class="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM12 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ qr.short_code }}</div>
                      <div class="text-sm text-gray-500">{{ qr.uuid.substring(0, 8) }}...</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusClass(qr.status)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                    {{ qr.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ qr.farm_name || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div v-if="qr.binding">
                    <div class="font-medium">{{ qr.binding.asset_name }}</div>
                    <div class="text-gray-500">{{ qr.binding.asset_type }}</div>
                  </div>
                  <div v-else class="text-gray-500">Unbound</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(qr.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(qr.updated_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button class="text-emerald-600 hover:text-emerald-900 mr-3">View</button>
                  <button class="text-blue-600 hover:text-blue-900">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div class="flex-1 flex justify-between sm:hidden">
            <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Previous
            </button>
            <button class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              Next
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing <span class="font-medium">1</span> to <span class="font-medium">10</span> of <span class="font-medium">{{ totalQRCodes }}</span> results
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  Previous
                </button>
                <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  1
                </button>
                <button class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// State
const searchQuery = ref('')
const qrCodes = ref([])
const farms = ref([])
const filters = ref({
  status: '',
  farm: '',
  assetType: '',
  dateRange: ''
})

// Mock data
const loadQRCodes = () => {
  qrCodes.value = [
    {
      id: 'qr1',
      uuid: 'qr-uuid-123456789',
      short_code: 'FT-ABC123',
      status: 'bound',
      farm_name: 'Green Valley Farm',
      binding: {
        asset_name: 'John Deere Tractor',
        asset_type: 'equipment'
      },
      created_at: '2024-01-10T10:00:00Z',
      updated_at: '2024-01-12T14:30:00Z'
    },
    {
      id: 'qr2',
      uuid: 'qr-uuid-987654321',
      short_code: 'FT-DEF456',
      status: 'available',
      farm_name: null,
      binding: null,
      created_at: '2024-01-11T09:15:00Z',
      updated_at: '2024-01-11T09:15:00Z'
    },
    {
      id: 'qr3',
      uuid: 'qr-uuid-456789123',
      short_code: 'FT-GHI789',
      status: 'allocated',
      farm_name: 'Sunset Acres',
      binding: null,
      created_at: '2024-01-12T16:20:00Z',
      updated_at: '2024-01-13T11:45:00Z'
    }
  ]
}

const loadFarms = () => {
  farms.value = [
    { id: 'farm1', name: 'Green Valley Farm' },
    { id: 'farm2', name: 'Sunset Acres' },
    { id: 'farm3', name: 'Mountain View Ranch' }
  ]
}

// Computed
const filteredQRCodes = computed(() => {
  let filtered = qrCodes.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(qr => 
      qr.short_code.toLowerCase().includes(query) ||
      qr.uuid.toLowerCase().includes(query) ||
      (qr.farm_name && qr.farm_name.toLowerCase().includes(query)) ||
      (qr.binding && qr.binding.asset_name.toLowerCase().includes(query))
    )
  }

  if (filters.value.status) {
    filtered = filtered.filter(qr => qr.status === filters.value.status)
  }

  if (filters.value.farm) {
    filtered = filtered.filter(qr => qr.farm_id === filters.value.farm)
  }

  if (filters.value.assetType) {
    filtered = filtered.filter(qr => qr.binding && qr.binding.asset_type === filters.value.assetType)
  }

  return filtered
})

const totalQRCodes = computed(() => qrCodes.value.length)

// Methods
const getStatusClass = (status) => {
  const classes = {
    available: 'bg-green-100 text-green-800',
    bound: 'bg-blue-100 text-blue-800',
    allocated: 'bg-yellow-100 text-yellow-800',
    delivered: 'bg-purple-100 text-purple-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

const exportRegistry = () => {
  console.log('Exporting QR registry...')
}

// Initialize
onMounted(() => {
  loadQRCodes()
  loadFarms()
})
</script>