<template>
  <div class="delivery-requests">
    <!-- Header with actions -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900">Delivery Requests</h3>
        <p class="text-sm text-gray-500">Manage QR code delivery batches to farms</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Delivery Request
      </button>
    </div>


    <!-- Filters -->
    <div class="bg-white shadow rounded-lg mb-6">
      <div class="px-4 py-5 sm:p-6">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search delivery code or notes..."
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              v-model="filters.status"
              @change="applyFilters"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="requested">Requested</option>
              <option value="in_progress">In Progress</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Date From -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              v-model="filters.date_from"
              @change="applyFilters"
              type="date"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <!-- Date To -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              v-model="filters.date_to"
              @change="applyFilters"
              type="date"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div class="mt-4 flex justify-between items-center">
          <button
            @click="clearFilters"
            class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Clear Filters
          </button>
          
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-500">Page size:</span>
            <select
              :value="pagination.limit"
              @change="changePageSize($event.target.value)"
              class="border-gray-300 rounded-md text-sm"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Delivery requests table -->
    <div class="bg-white shadow overflow-hidden sm:rounded-md">
      <!-- Loading state -->
      <div v-if="loading" class="px-4 py-8 text-center">
        <div class="inline-flex items-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading delivery requests...
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="px-4 py-8 text-center">
        <div class="text-red-600 mb-2">{{ error }}</div>
        <button @click="loadDeliveryRequests()" class="text-emerald-600 hover:text-emerald-900">Try again</button>
      </div>

      <!-- Empty state -->
      <div v-else-if="deliveryRequests.length === 0" class="px-4 py-8 text-center text-gray-500">
        No delivery requests found.
      </div>

      <!-- Table -->
      <div v-else class="px-4 py-5 sm:p-6">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th 
                  @click="sortBy('delivery_code')"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div class="flex items-center">
                    Delivery Code
                    <svg class="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 8l5-5 5 5H5z" v-if="filters.sort === 'delivery_code' && filters.order === 'asc'"/>
                      <path d="M15 12l-5 5-5-5h10z" v-else-if="filters.sort === 'delivery_code' && filters.order === 'desc'"/>
                      <path d="M5 8l5-5 5 5H5zM15 12l-5 5-5-5h10z" v-else opacity="0.3"/>
                    </svg>
                  </div>
                </th>
                <th 
                  @click="sortBy('farm')"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div class="flex items-center">
                    Farm
                    <svg class="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 8l5-5 5 5H5z" v-if="filters.sort === 'farm' && filters.order === 'asc'"/>
                      <path d="M15 12l-5 5-5-5h10z" v-else-if="filters.sort === 'farm' && filters.order === 'desc'"/>
                      <path d="M5 8l5-5 5 5H5zM15 12l-5 5-5-5h10z" v-else opacity="0.3"/>
                    </svg>
                  </div>
                </th>
                <th 
                  @click="sortBy('requested_quantity')"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div class="flex items-center">
                    QR Codes
                    <svg class="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 8l5-5 5 5H5z" v-if="filters.sort === 'requested_quantity' && filters.order === 'asc'"/>
                      <path d="M15 12l-5 5-5-5h10z" v-else-if="filters.sort === 'requested_quantity' && filters.order === 'desc'"/>
                      <path d="M5 8l5-5 5 5H5zM15 12l-5 5-5-5h10z" v-else opacity="0.3"/>
                    </svg>
                  </div>
                </th>
                <th 
                  @click="sortBy('current_status')"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div class="flex items-center">
                    Status
                    <svg class="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 8l5-5 5 5H5z" v-if="filters.sort === 'current_status' && filters.order === 'asc'"/>
                      <path d="M15 12l-5 5-5-5h10z" v-else-if="filters.sort === 'current_status' && filters.order === 'desc'"/>
                      <path d="M5 8l5-5 5 5H5zM15 12l-5 5-5-5h10z" v-else opacity="0.3"/>
                    </svg>
                  </div>
                </th>
                <th 
                  @click="sortBy('created_at')"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div class="flex items-center">
                    Created
                    <svg class="ml-1 w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 8l5-5 5 5H5z" v-if="filters.sort === 'created_at' && filters.order === 'asc'"/>
                      <path d="M15 12l-5 5-5-5h10z" v-else-if="filters.sort === 'created_at' && filters.order === 'desc'"/>
                      <path d="M5 8l5-5 5 5H5zM15 12l-5 5-5-5h10z" v-else opacity="0.3"/>
                    </svg>
                  </div>
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="request in deliveryRequests" :key="request.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ request.delivery_code }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ request.farm?.name || 'Unknown Farm' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ request.requested_quantity }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getStatusClass(request.current_status)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                    {{ getStatusDisplayName(request.current_status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(request.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button class="text-emerald-600 hover:text-emerald-900 mr-3">View</button>
                  <button v-if="request.current_status === 'requested'" class="text-blue-600 hover:text-blue-900">Process</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              @click="changePage(pagination.page - 1)"
              :disabled="!pagination.hasPrev"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              @click="changePage(pagination.page + 1)"
              :disabled="!pagination.hasNext"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing
                <span class="font-medium">{{ ((pagination.page - 1) * pagination.limit) + 1 }}</span>
                to
                <span class="font-medium">{{ Math.min(pagination.page * pagination.limit, pagination.total) }}</span>
                of
                <span class="font-medium">{{ pagination.total }}</span>
                results
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  @click="changePage(pagination.page - 1)"
                  :disabled="!pagination.hasPrev"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="sr-only">Previous</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>

                <button
                  v-for="page in Math.min(pagination.totalPages, 10)"
                  :key="page"
                  @click="changePage(page)"
                  :class="[
                    page === pagination.page
                      ? 'z-10 bg-emerald-50 border-emerald-500 text-emerald-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                  ]"
                >
                  {{ page }}
                </button>

                <button
                  @click="changePage(pagination.page + 1)"
                  :disabled="!pagination.hasNext"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span class="sr-only">Next</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Delivery Request Modal -->
    <DeliveryRequestModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="handleRequestCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import DeliveryRequestModal from './DeliveryRequestModal.vue'
import api, { apiUtils } from '@/services/api.js'
import { formatDate } from '@/utils/formatters.js'

// State
const deliveryRequests = ref([])
const showCreateModal = ref(false)
const loading = ref(false)
const error = ref('')

// Pagination and filters
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
})

const filters = ref({
  search: '',
  status: '',
  farm_id: '',
  date_from: '',
  date_to: '',
  sort: 'created_at',
  order: 'desc'
})

// Load delivery requests from API
const loadDeliveryRequests = async (resetPagination = false) => {
  try {
    loading.value = true
    error.value = ''
    
    if (resetPagination) {
      pagination.value.page = 1
    }
    
    // Build query parameters
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      sort: filters.value.sort,
      order: filters.value.order
    }
    
    // Add filters if they have values
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.farm_id) params.farm_id = filters.value.farm_id
    if (filters.value.date_from) params.date_from = filters.value.date_from
    if (filters.value.date_to) params.date_to = filters.value.date_to
    
    // Make API call
    const response = await apiUtils.authenticatedRequest(() => 
      api.get('/qr-codes/requests', { params })
    )
    
    if (response.data && response.data.success) {
      deliveryRequests.value = response.data.data || []
      pagination.value = { ...pagination.value, ...response.data.pagination }
    } else {
      deliveryRequests.value = []
      error.value = 'Failed to load delivery requests'
    }
    
  } catch (err) {
    console.error('Error loading delivery requests:', err)
    error.value = err.userMessage || 'Failed to load delivery requests'
    deliveryRequests.value = []
  } finally {
    loading.value = false
  }
}


// Methods
const getStatusClass = (status) => {
  const classes = {
    requested: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getStatusDisplayName = (status) => {
  const names = {
    requested: 'Requested',
    in_progress: 'In Progress',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  }
  return names[status] || status
}


const handleRequestCreated = (newRequest) => {
  // Reload the first page to get the most up-to-date data
  pagination.value.page = 1
  loadDeliveryRequests()
}

const changePage = (newPage) => {
  if (newPage >= 1 && newPage <= pagination.value.totalPages) {
    pagination.value.page = newPage
    loadDeliveryRequests()
  }
}

const changePageSize = (newLimit) => {
  pagination.value.limit = newLimit
  pagination.value.page = 1
  loadDeliveryRequests()
}

const applyFilters = () => {
  loadDeliveryRequests(true)
}

const clearFilters = () => {
  filters.value = {
    search: '',
    status: '',
    farm_id: '',
    date_from: '',
    date_to: '',
    sort: 'created_at',
    order: 'desc'
  }
  loadDeliveryRequests(true)
}

const sortBy = (field) => {
  if (filters.value.sort === field) {
    filters.value.order = filters.value.order === 'asc' ? 'desc' : 'asc'
  } else {
    filters.value.sort = field
    filters.value.order = 'desc'
  }
  loadDeliveryRequests(true)
}

// Watch for filter changes (debounced search)
let searchTimeout = null
watch(() => filters.value.search, (newValue, oldValue) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (newValue !== oldValue) {
      loadDeliveryRequests(true)
    }
  }, 500)
})

// Initialize
onMounted(() => {
  loadDeliveryRequests()
})
</script>