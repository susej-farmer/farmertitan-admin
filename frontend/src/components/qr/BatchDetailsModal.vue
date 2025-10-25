<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-4/5 max-w-none shadow-lg rounded-md bg-white">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-lg font-medium text-gray-900">
            Production Batch Details
          </h3>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Batch Summary -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <dt class="text-sm font-medium text-gray-500">Batch Code</dt>
          <dd class="text-sm text-gray-900 font-mono">{{ batch.batch_code }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Status</dt>
          <dd :class="getStatusClass(batch.status)">
            {{ formatStatus(batch.status) }}
          </dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Supplier</dt>
          <dd class="text-sm text-gray-900">{{ batch.qr_supplier?.name || batch.supplier?.name || batch.supplier_name || '-' }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Available</dt>
          <dd class="text-sm text-gray-900">{{ batch.available_count || 0 }} of {{ batch.quantity }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-gray-500">Created</dt>
          <dd class="text-sm text-gray-900">{{ formatDate(batch.created_at) }}</dd>
        </div>
      </div>

      <!-- QR Codes Table -->
      <div class="mb-4">
        <div class="flex justify-between items-center mb-4">
          <h4 class="text-md font-medium text-gray-900">QR Codes ({{ filteredQRCodes.length }}{{ searchQuery ? ` of ${qrCodes.length}` : '' }})</h4>
          <div class="flex space-x-2 items-center">
            <input
              v-model="searchQuery"
              @input="onSearchChange"
              type="text"
              placeholder="Search by QR code or short code..."
              class="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div v-if="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>

        <div v-else-if="filteredQRCodes.length === 0" class="text-center py-8 text-gray-500">
          {{ searchQuery ? 'No QR codes match your search criteria' : 'No QR codes found for this batch' }}
        </div>

        <div v-else class="bg-white shadow rounded-lg overflow-hidden">
          <div class="overflow-x-auto max-h-96">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th 
                    @click="sortBy('print_position')"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div class="flex items-center space-x-1">
                      <span>Position</span>
                      <span class="text-gray-400">
                        {{ getSortIcon('print_position') }}
                      </span>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    QR Code
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Short Code
                  </th>
                  <th 
                    @click="sortBy('farm')"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div class="flex items-center space-x-1">
                      <span>Farm</span>
                      <span class="text-gray-400">
                        {{ getSortIcon('farm') }}
                      </span>
                    </div>
                  </th>
                  <th 
                    @click="sortBy('status')"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div class="flex items-center space-x-1">
                      <span>Status</span>
                      <span class="text-gray-400">
                        {{ getSortIcon('status') }}
                      </span>
                    </div>
                  </th>
                  <th 
                    @click="sortBy('bound_at')"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div class="flex items-center space-x-1">
                      <span>Bound At</span>
                      <span class="text-gray-400">
                        {{ getSortIcon('bound_at') }}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="qr in filteredQRCodes" :key="qr.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ qr.print_position || '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-mono text-gray-900">{{ qr.id }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-mono text-gray-900">{{ qr.short_code || '-' }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ qr.farm?.name || '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="getQRStatusClass(qr.status)">
                      {{ formatStatus(qr.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ qr.bound_at ? formatDate(qr.bound_at) : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pagination && pagination.totalPages > 1" class="flex justify-between items-center mt-4">
          <div class="text-sm text-gray-700">
            Showing {{ (pagination.page - 1) * pagination.limit + 1 }} to 
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }} of 
            {{ pagination.total }} results (Page {{ pagination.page }} of {{ pagination.totalPages }})
          </div>
          <div class="flex space-x-2 items-center">
            <button
              @click="firstPage"
              :disabled="!pagination.hasPrev"
              class="px-2 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="First page"
            >
              ««
            </button>
            <button
              @click="previousPage"
              :disabled="!pagination.hasPrev"
              class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <!-- Page numbers -->
            <div class="flex space-x-1">
              <button
                v-for="page in getVisiblePages()"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'px-3 py-1 text-sm rounded-md',
                  page === pagination.page
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                ]"
              >
                {{ page }}
              </button>
            </div>
            
            <button
              @click="nextPage"
              :disabled="!pagination.hasNext"
              class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              @click="lastPage"
              :disabled="!pagination.hasNext"
              class="px-2 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Last page"
            >
              »»
            </button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end space-x-3 pt-4 border-t">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { formatDate } from '@/utils/formatters'
import { qrService } from '@/services/qrService'

const props = defineProps({
  batch: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const qrCodes = ref([])
const loading = ref(false)
const pagination = ref(null)
const currentPage = ref(1)
const searchQuery = ref('')
const sortField = ref('print_position')
const sortOrder = ref('asc')

const loadQRCodes = async (page = 1) => {
  try {
    loading.value = true
    console.log('Loading QR codes for batch:', props.batch.id)
    
    const response = await qrService.getBatchQRCodes(props.batch.id, {
      page,
      limit: 10,
      sort: sortField.value,
      order: sortOrder.value
    })
    
    console.log('QR codes response:', response)
    
    if (response && response.success) {
      qrCodes.value = response.data || []
      pagination.value = response.pagination
      currentPage.value = page
      console.log('Loaded QR codes:', qrCodes.value.length)
    } else {
      console.warn('Invalid QR codes response format')
      qrCodes.value = []
    }
  } catch (error) {
    console.error('Failed to load QR codes:', error)
    qrCodes.value = []
  } finally {
    loading.value = false
  }
}

const filteredQRCodes = computed(() => {
  if (!searchQuery.value) {
    return qrCodes.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return qrCodes.value.filter(qr => {
    return qr.id?.toLowerCase().includes(query) || 
           qr.short_code?.toLowerCase().includes(query)
  })
})

const onSearchChange = () => {
  // Reactive search - no debouncing needed for local filtering
}

const sortBy = (field) => {
  console.log('sortBy called with field:', field)
  console.log('Current sortField:', sortField.value)
  console.log('Current sortOrder:', sortOrder.value)
  
  if (sortField.value === field) {
    // Toggle order if same field
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    console.log('Toggled order to:', sortOrder.value)
  } else {
    // New field, start with asc
    sortField.value = field
    sortOrder.value = 'asc'
    console.log('New field, set to asc')
  }
  currentPage.value = 1 // Reset to first page when sorting changes
  loadQRCodes(1)
}

const getSortIcon = (field) => {
  if (sortField.value !== field) {
    return '↕' // Neutral sort icon
  }
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

const nextPage = () => {
  if (pagination.value?.hasNext) {
    loadQRCodes(currentPage.value + 1)
  }
}

const previousPage = () => {
  if (pagination.value?.hasPrev) {
    loadQRCodes(currentPage.value - 1)
  }
}

const firstPage = () => {
  if (pagination.value?.hasPrev) {
    loadQRCodes(1)
  }
}

const lastPage = () => {
  if (pagination.value?.hasNext) {
    loadQRCodes(pagination.value.totalPages)
  }
}

const goToPage = (page) => {
  if (page !== currentPage.value) {
    loadQRCodes(page)
  }
}

const getVisiblePages = () => {
  if (!pagination.value) return []
  
  const current = pagination.value.page
  const total = pagination.value.totalPages
  const pages = []
  
  if (total <= 7) {
    // Show all pages if total is 7 or less
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Show first page
    pages.push(1)
    
    if (current > 4) {
      pages.push('...')
    }
    
    // Show pages around current
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) {
        pages.push(i)
      }
    }
    
    if (current < total - 3) {
      pages.push('...')
    }
    
    // Show last page
    if (!pages.includes(total)) {
      pages.push(total)
    }
  }
  
  return pages.filter(page => page !== '...' || pages.indexOf(page) > 0)
}

const getStatusClass = (status) => {
  const baseClass = 'inline-flex px-2 py-1 text-xs font-semibold rounded-full'
  
  switch (status) {
    case 'ordered':
      return `${baseClass} bg-yellow-100 text-yellow-800`
    case 'printing':
      return `${baseClass} bg-blue-100 text-blue-800`
    case 'received':
      return `${baseClass} bg-green-100 text-green-800`
    case 'partial':
      return `${baseClass} bg-orange-100 text-orange-800`
    case 'completed':
      return `${baseClass} bg-purple-100 text-purple-800`
    case 'cancelled':
      return `${baseClass} bg-red-100 text-red-800`
    default:
      return `${baseClass} bg-gray-100 text-gray-800`
  }
}

const getQRStatusClass = (status) => {
  const baseClass = 'inline-flex px-2 py-1 text-xs font-semibold rounded-full'
  
  switch (status) {
    case 'active':
      return `${baseClass} bg-green-100 text-green-800`
    case 'used':
      return `${baseClass} bg-blue-100 text-blue-800`
    case 'defective':
      return `${baseClass} bg-red-100 text-red-800`
    case 'inactive':
      return `${baseClass} bg-gray-100 text-gray-800`
    default:
      return `${baseClass} bg-gray-100 text-gray-800`
  }
}

const formatStatus = (status) => {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : ''
}

onMounted(() => {
  loadQRCodes()
})
</script>