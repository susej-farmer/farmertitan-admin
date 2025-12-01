<template>
  <div class="production-batches">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h3 class="text-lg font-medium text-gray-900">Production Batches</h3>
        <p class="text-sm text-gray-600">Manage QR code production batches from external printing services</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="btn btn-primary"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        New Production Batch
      </button>
    </div>


    <!-- Batches Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" 
                  @click="sortBy('created')">
                <div class="flex items-center space-x-1">
                  <span>Batch Code</span>
                  <svg v-if="sorting.field === 'created'" class="w-4 h-4" :class="{ 'transform rotate-180': sorting.order === 'desc' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" 
                  @click="sortBy('quantity')">
                <div class="flex items-center space-x-1">
                  <span>Quantity</span>
                  <svg v-if="sorting.field === 'quantity'" class="w-4 h-4" :class="{ 'transform rotate-180': sorting.order === 'desc' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" 
                  @click="sortBy('defective')">
                <div class="flex items-center space-x-1">
                  <span>Defective</span>
                  <svg v-if="sorting.field === 'defective'" class="w-4 h-4" :class="{ 'transform rotate-180': sorting.order === 'desc' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" 
                  @click="sortBy('supplier')">
                <div class="flex items-center space-x-1">
                  <span>Supplier</span>
                  <svg v-if="sorting.field === 'supplier'" class="w-4 h-4" :class="{ 'transform rotate-180': sorting.order === 'desc' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" 
                  @click="sortBy('status')">
                <div class="flex items-center space-x-1">
                  <span>Status</span>
                  <svg v-if="sorting.field === 'status'" class="w-4 h-4" :class="{ 'transform rotate-180': sorting.order === 'desc' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" 
                  @click="sortBy('created')">
                <div class="flex items-center space-x-1">
                  <span>Created</span>
                  <svg v-if="sorting.field === 'created'" class="w-4 h-4" :class="{ 'transform rotate-180': sorting.order === 'desc' }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="batch in batches" :key="batch.id" class="hover:bg-gray-50">
              <!-- Batch Code -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ batch.batch_code }}</div>
              </td>
              
              <!-- Quantity -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ batch.quantity }}</div>
              </td>
              
              <!-- Defective -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm" :class="batch.defective_count > 0 ? 'text-red-600' : 'text-gray-500'">
                  {{ batch.defective_count || 0 }}
                </div>
              </td>
              
              <!-- Supplier -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ batch.qr_supplier?.name || batch.supplier?.name || batch.supplier_name || '-' }}
              </td>
              
              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="getStatusClass(batch.status)">
                  {{ formatStatus(batch.status) }}
                </span>
              </td>
              
              <!-- Created -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(batch.created_at) }}
              </td>
              
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    @click="viewBatchDetails(batch)"
                    class="p-1 text-blue-600 hover:text-blue-800"
                    title="View Details"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  
                  <button
                    @click="generateBatchPDF(batch)"
                    class="p-1 text-green-600 hover:text-green-800"
                    title="Download PDF with QR Codes"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                  
                  <!-- Change Status button -->
                  <button
                    v-if="!['received', 'cancelled', 'completed', 'partial'].includes(batch.status)"
                    @click="openStatusModal(batch)"
                    class="p-1 text-blue-600 hover:text-blue-800"
                    title="Change Status"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div class="flex items-center justify-between">
          <!-- Navigation Arrows -->
          <div class="flex items-center space-x-2">
            <button
              @click="previousPage"
              :disabled="!pagination.hasPrev"
              class="p-2 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            <button
              @click="nextPage"
              :disabled="!pagination.hasNext"
              class="p-2 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          
          <!-- Page Controls -->
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-700">Page</span>
              <input
                v-model="currentPageInput"
                @keyup.enter="goToPage"
                @blur="goToPage"
                type="number"
                min="1"
                :max="pagination.totalPages"
                class="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
              />
              <span class="text-sm text-gray-700">of {{ pagination.totalPages }}</span>
            </div>
            
            <div class="flex items-center space-x-2">
              <select 
                v-model="pagination.limit" 
                @change="loadBatches"
                class="border border-gray-300 rounded px-3 py-1 pr-8 text-sm"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span class="text-sm text-gray-700">rows</span>
            </div>
            
            <div class="text-sm text-gray-700">
              {{ pagination.total }} records
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Production Batch Modal -->
    <ProductionBatchModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onBatchCreated"
    />
    
    
    <!-- Batch Details Modal -->
    <BatchDetailsModal
      v-if="showBatchDetails"
      :batch="detailsBatch"
      @close="showBatchDetails = false"
    />

    <!-- Change Status Modal -->
    <div v-if="showStatusModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <!-- Modal Header -->
        <div class="mt-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">
              Change Status
            </h3>
            <button @click="showStatusModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="mt-4">
            <p class="text-sm text-gray-500">
              Batch: {{ selectedBatch?.batch_code }}
            </p>
            <p class="text-sm text-gray-500">
              Current Status: <span :class="getStatusClass(selectedBatch?.status)">{{ formatStatus(selectedBatch?.status) }}</span>
            </p>
          </div>

          <!-- Error Alert -->
          <div v-if="statusModalData.error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">
                  {{ statusModalData.error.title || 'Error' }}
                </h3>
                <div class="mt-2 text-sm text-red-700">
                  <p>{{ statusModalData.error.message }}</p>
                </div>
                <div v-if="statusModalData.error.suggestion" class="mt-2 text-sm text-red-600">
                  <p class="font-medium">Suggestion:</p>
                  <p>{{ statusModalData.error.suggestion }}</p>
                </div>
              </div>
              <div class="ml-auto pl-3">
                <div class="-mx-1.5 -my-1.5">
                  <button 
                    @click="statusModalData.error = null"
                    class="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100"
                  >
                    <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Status Selection -->
          <div class="mt-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              New Status
            </label>
            <div class="space-y-2">
              <div 
                v-for="status in getAvailableStatuses(selectedBatch?.status)" 
                :key="status.value"
                class="flex items-center"
              >
                <input
                  :id="status.value"
                  v-model="statusModalData.selectedStatus"
                  :value="status.value"
                  type="radio"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label 
                  :for="status.value" 
                  class="ml-3 block text-sm font-medium"
                  :class="`text-${status.color}-700`"
                >
                  {{ status.label }}
                </label>
              </div>
            </div>
          </div>

          <!-- Defective Items Section (only for 'received' status) -->
          <div v-if="statusModalData.selectedStatus === 'received'" class="mt-6">
            <div class="border-t pt-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Number of Defective Items
              </label>
              <input
                v-model.number="statusModalData.defectiveCount"
                type="number"
                min="0"
                :max="selectedBatch?.quantity"
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
              
              <div v-if="statusModalData.defectiveCount > 0" class="mt-4 space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Defective Positions
                  </label>
                  <div class="flex">
                    <span class="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      Pos:
                    </span>
                    <input
                      v-model="statusModalData.defectivePositions"
                      type="text"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1, 5, 10"
                    />
                    <button
                      @click="addDefectivePosition"
                      class="ml-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      +
                    </button>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    Separate multiple positions with commas (e.g., 1, 5, 10)
                  </p>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Defective Short Codes
                  </label>
                  <div class="flex">
                    <span class="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      Code:
                    </span>
                    <input
                      v-model="statusModalData.defectiveShortCodes"
                      type="text"
                      class="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="FT-ABC123, FT-DEF456"
                    />
                    <button
                      @click="addDefectiveShortCode"
                      class="ml-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      +
                    </button>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    Separate multiple short codes with commas (e.g., FT-ABC123, FT-DEF456)
                  </p>
                </div>
                
                <!-- Show added items -->
                <div v-if="statusModalData.addedPositions.length > 0 || statusModalData.addedShortCodes.length > 0" class="mt-4 p-3 bg-gray-50 rounded-md">
                  <h4 class="text-sm font-medium text-gray-700 mb-2">Added Defective Items:</h4>
                  <div v-if="statusModalData.addedPositions.length > 0" class="mb-2">
                    <span class="text-xs font-medium text-gray-600">Positions:</span>
                    <div class="flex flex-wrap gap-1 mt-1">
                      <span
                        v-for="(pos, index) in statusModalData.addedPositions"
                        :key="`pos-${index}`"
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                      >
                        {{ pos }}
                        <button
                          @click="removePosition(index)"
                          class="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  </div>
                  <div v-if="statusModalData.addedShortCodes.length > 0">
                    <span class="text-xs font-medium text-gray-600">Short Codes:</span>
                    <div class="flex flex-wrap gap-1 mt-1">
                      <span
                        v-for="(code, index) in statusModalData.addedShortCodes"
                        :key="`code-${index}`"
                        class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                      >
                        {{ code }}
                        <button
                          @click="removeShortCode(index)"
                          class="ml-1 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
            <button
              @click="showStatusModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              @click="handleStatusChange"
              :disabled="!statusModalData.selectedStatus || statusModalData.loading"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <svg v-if="statusModalData.loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ statusModalData.loading ? 'Changing...' : 'Change Status' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '@/utils/formatters'
import ProductionBatchModal from './ProductionBatchModal.vue'
import BatchDetailsModal from './BatchDetailsModal.vue'
import { qrService } from '@/services/qrService'

// Router
const router = useRouter()

// State
const batches = ref([])
const showCreateModal = ref(false)
const showStatusModal = ref(false)
const selectedBatch = ref(null)
const loading = ref(false)

// Status change modal data
const statusModalData = ref({
  selectedStatus: '',
  defectiveCount: 0,
  defectivePositions: '',
  defectiveShortCodes: '',
  addedPositions: [],
  addedShortCodes: [],
  error: null,
  loading: false
})

// Pagination
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
})

// Sorting
const sorting = ref({
  field: 'created',
  order: 'desc'
})

// Page input
const currentPageInput = ref(1)

// Methods
const loadBatches = async () => {
  try {
    loading.value = true
    console.log('Loading production batches...', {
      page: pagination.value.page,
      limit: pagination.value.limit,
      sort: sorting.value.field,
      order: sorting.value.order
    })
    
    const response = await qrService.getProductionBatches({
      page: pagination.value.page,
      limit: pagination.value.limit,
      sort: sorting.value.field,
      order: sorting.value.order
    }, router)
    
    console.log('Batches response:', response)
    
    if (response && response.success && response.data) {
      batches.value = response.data || []
      if (response.pagination) {
        pagination.value = { ...response.pagination }
      }
      console.log('Loaded batches:', batches.value)
      console.log('Pagination:', pagination.value)
    } else {
      throw new Error('Invalid response format')
    }
  } catch (error) {
    console.error('Failed to load batches:', error)
    console.error('Error details:', error.response || error.message)
    
    // Fallback to mock data if API fails  
    console.log('Using fallback mock data')
    batches.value = [
      {
        id: '1',
        batch_code: 'PRINT-2024-001',
        quantity: 100,
        status: 'received',
        supplier: { name: 'QR Print Solutions' },
        available_count: 45,
        defective_count: 0,
        created_at: '2024-01-10T08:00:00Z'
      },
      {
        id: '2',
        batch_code: 'PRINT-2024-002',
        quantity: 200,
        status: 'printing',
        supplier: { name: 'QR Print Solutions' },
        available_count: 0,
        defective_count: 0,
        created_at: '2024-01-15T10:30:00Z'
      }
    ]
    pagination.value = {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  } finally {
    loading.value = false
  }
}

const sortBy = (field) => {
  if (sorting.value.field === field) {
    sorting.value.order = sorting.value.order === 'asc' ? 'desc' : 'asc'
  } else {
    sorting.value.field = field
    sorting.value.order = 'desc'
  }
  pagination.value.page = 1
  loadBatches()
}

const changePage = (page) => {
  pagination.value.page = page
  loadBatches()
}

const previousPage = () => {
  if (pagination.value.hasPrev) {
    changePage(pagination.value.page - 1)
  }
}

const nextPage = () => {
  if (pagination.value.hasNext) {
    changePage(pagination.value.page + 1)
  }
}

const goToPage = () => {
  const pageNum = parseInt(currentPageInput.value)
  if (pageNum >= 1 && pageNum <= pagination.value.totalPages) {
    changePage(pageNum)
  } else {
    // Reset input to current page if invalid
    currentPageInput.value = pagination.value.page
  }
}

const getPageNumbers = () => {
  const pages = []
  const currentPage = pagination.value.page
  const totalPages = pagination.value.totalPages
  
  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Show first page
    pages.push(1)
    
    if (currentPage > 4) {
      pages.push('...')
    }
    
    // Show pages around current page
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    if (currentPage < totalPages - 3) {
      pages.push('...')
    }
    
    // Show last page
    if (totalPages > 1) {
      pages.push(totalPages)
    }
  }
  
  return pages
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

const formatStatus = (status) => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const showBatchDetails = ref(false)
const detailsBatch = ref(null)

const viewBatchDetails = (batch) => {
  detailsBatch.value = batch
  showBatchDetails.value = true
}

const updateStatus = async (batch, newStatus, notes = '', defectiveInfo = {}) => {
  try {
    loading.value = true
    const response = await qrService.updateBatchStatus(batch.id, {
      status: newStatus,
      notes,
      defective_info: defectiveInfo
    }, router)
    
    // Only reload batches if the response was successful
    if (!response || response.success !== false) {
      await loadBatches()
    }
    
    return response
  } catch (error) {
    console.error('Failed to update batch status:', error)
    throw error // Re-throw to let caller handle it
  } finally {
    loading.value = false
  }
}


const generateBatchPDF = async (batch) => {
  try {
    console.log('Generate PDF for batch:', batch)
    
    // Load jsPDF and QRCode libraries
    const { jsPDF } = await import('jspdf')
    const QRCode = await import('qrcode')
    
    // Get QR codes for this batch
    const qrResponse = await qrService.getBatchQRCodes(batch.id, { limit: 100 }, router)
    const qrCodes = qrResponse?.data || []
    
    if (qrCodes.length === 0) {
      alert('No QR codes found for this batch')
      return
    }
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    // PDF settings
    const margin = 15
    const headerHeight = 20
    const qrSize = 30 // Reduced QR size to fit better
    const cellWidth = (pageWidth - margin * 2) / 3 // 3 columns
    const cellHeight = 48 // Increased to accommodate position text
    const positionHeight = 5 // More space for position text
    const codesPerRow = 3
    const rowsPerPage = Math.floor((pageHeight - headerHeight - margin * 2) / cellHeight)
    
    let currentPage = 1
    let currentRow = 0
    let currentCol = 0
    
    // Add header to first page
    const addHeader = (pageNum) => {
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`FarmerTitan QR Codes - Batch: ${batch.batch_code}`, margin, 15)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Quantity: ${batch.quantity} | Page: ${pageNum}`, margin, 22)
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 60, 22)
      
      // Draw line under header
      pdf.line(margin, headerHeight + 3, pageWidth - margin, headerHeight + 3)
    }
    
    addHeader(currentPage)
    
    // Process each QR code
    for (let i = 0; i < qrCodes.length; i++) {
      const qr = qrCodes[i]
      
      // Check if we need a new page
      if (currentRow >= rowsPerPage) {
        pdf.addPage()
        currentPage++
        currentRow = 0
        currentCol = 0
        addHeader(currentPage)
      }
      
      // Calculate position
      const x = margin + (currentCol * cellWidth)
      const baseY = headerHeight + 5 + (currentRow * cellHeight)
      
      // Add position text above the cell
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      const positionText = `Position ${qr.print_position || 'N/A'}`
      const positionTextWidth = pdf.getTextWidth(positionText)
      const positionTextX = x + (cellWidth - positionTextWidth) / 2
      pdf.text(positionText, positionTextX, baseY + 3)
      // Calculate cell position (below position text)
      const y = baseY + positionHeight
      try {
        // Generate QR code image with farmertitan URL
        const qrUrl = `https://app.farmertitan.com/qr?code=${qr.id}`
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        
        // Center QR code in cell
        const qrX = x + (cellWidth - qrSize) / 2
        const qrY = y + 5
        
        // Add QR code image
        pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
        
        // Add short code centered below QR
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'bold')
        const shortCode = qr.short_code || qr.id.slice(-8)
        const textWidth = pdf.getTextWidth(shortCode)
        const textX = x + (cellWidth - textWidth) / 2
        pdf.text(shortCode, textX, qrY + qrSize + 4)
        
        // Draw border around cell (not including position text)
        pdf.rect(x, y, cellWidth, cellHeight - positionHeight)
        
      } catch (qrError) {
        console.warn('Failed to generate QR code for:', qr.id, qrError)
        
        // Add fallback text
        pdf.setFontSize(9)
        pdf.text('QR Code Error', x + 8, y + 20)
        pdf.setFontSize(8)
        pdf.text(qr.id, x + 5, y + 30)
        
        // Draw border around cell (not including position text)
        pdf.rect(x, y, cellWidth, cellHeight - positionHeight)
      }
      
      // Move to next position
      currentCol++
      if (currentCol >= codesPerRow) {
        currentCol = 0
        currentRow++
      }
    }
    
    // Save the PDF
    const filename = `QR_Batch_${batch.batch_code}_${new Date().toISOString().slice(0, 10)}.pdf`
    pdf.save(filename)
    
    console.log(`PDF generated successfully: ${filename}`)
    
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    alert('Failed to generate PDF. Please try again.')
  }
}


const openStatusModal = (batch) => {
  selectedBatch.value = batch
  statusModalData.value = {
    selectedStatus: '',
    defectiveCount: 0,
    defectivePositions: '',
    defectiveShortCodes: '',
    addedPositions: [],
    addedShortCodes: [],
    error: null,
    loading: false
  }
  showStatusModal.value = true
}

// Get available status options based on current status
const getAvailableStatuses = (currentStatus) => {
  if (currentStatus === 'ordered') {
    return [
      { value: 'printing', label: 'Printing', color: 'blue' },
      { value: 'received', label: 'Received', color: 'green' },
      { value: 'cancelled', label: 'Cancelled', color: 'red' }
    ]
  } else if (currentStatus === 'printing') {
    return [
      { value: 'received', label: 'Received', color: 'green' },
      { value: 'cancelled', label: 'Cancelled', color: 'red' }
    ]
  }
  return []
}

// Add defective position
const addDefectivePosition = () => {
  const positions = statusModalData.value.defectivePositions
    .split(',')
    .map(p => parseInt(p.trim()))
    .filter(p => !isNaN(p) && p > 0)
  
  positions.forEach(pos => {
    if (!statusModalData.value.addedPositions.includes(pos)) {
      statusModalData.value.addedPositions.push(pos)
    }
  })
  statusModalData.value.defectivePositions = ''
}

// Add defective short code
const addDefectiveShortCode = () => {
  const codes = statusModalData.value.defectiveShortCodes
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 0)
  
  codes.forEach(code => {
    if (!statusModalData.value.addedShortCodes.includes(code)) {
      statusModalData.value.addedShortCodes.push(code)
    }
  })
  statusModalData.value.defectiveShortCodes = ''
}

// Remove position
const removePosition = (index) => {
  statusModalData.value.addedPositions.splice(index, 1)
}

// Remove short code
const removeShortCode = (index) => {
  statusModalData.value.addedShortCodes.splice(index, 1)
}

// Handle status change
const handleStatusChange = async () => {
  try {
    // Clear previous errors
    statusModalData.value.error = null
    statusModalData.value.loading = true
    
    const { selectedStatus, defectiveCount, addedPositions, addedShortCodes } = statusModalData.value
    
    if (!selectedStatus) {
      statusModalData.value.error = {
        title: 'Status Required',
        message: 'Please select a status to continue.'
      }
      return
    }

    // Validate defective data for 'received' status
    if (selectedStatus === 'received' && defectiveCount > 0) {
      const totalDefectiveItems = addedPositions.length + addedShortCodes.length
      
      if (totalDefectiveItems === 0) {
        statusModalData.value.error = {
          title: 'Missing Defective Details',
          message: 'When defective count > 0, you must specify defective QR codes.',
          suggestion: 'Add positions and/or short codes below to specify which items are defective.'
        }
        return
      }
      
      if (defectiveCount !== totalDefectiveItems) {
        statusModalData.value.error = {
          title: 'Count Mismatch',
          message: `Defective count (${defectiveCount}) must match the total number of specified positions and short codes (${totalDefectiveItems}).`,
          suggestion: 'Either adjust the defective count or add/remove positions and short codes to match.'
        }
        return
      }
    }

    // Build defective_info according to backend format
    const defectiveInfo = {}
    
    if (selectedStatus === 'received') {
      // Always include defectiveCount for 'received' status
      defectiveInfo.defectiveCount = defectiveCount
      
      if (defectiveCount > 0) {
        if (addedPositions.length > 0) {
          defectiveInfo.positions = addedPositions
        }
        if (addedShortCodes.length > 0) {
          defectiveInfo.short_codes = addedShortCodes
        }
      }
      // If defectiveCount is 0, only defectiveCount: 0 is included
    }

    const response = await updateStatus(selectedBatch.value, selectedStatus, '', defectiveInfo)
    
    // Check response success based on new format
    if (response && response.success === false) {
      // Handle error response according to new format
      const { code, message } = response.error || {}
      
      switch (code) {
        case 'INVALID_STATUS_TRANSITION':
          statusModalData.value.error = {
            title: 'Invalid Status Transition',
            message: message,
            suggestion: 'Please follow the correct status flow: Ordered → Printing → Received'
          }
          break
        case 'MISSING_DEFECTIVE_DETAILS':
          statusModalData.value.error = {
            title: 'Missing Defective Details',
            message: 'You must specify defective QR codes when defective count > 0.',
            suggestion: 'Add positions and/or short codes below to specify which items are defective.'
          }
          break
        case 'DEFECTIVE_COUNT_MISMATCH':
          statusModalData.value.error = {
            title: 'Count Mismatch',
            message: message,
            suggestion: 'Make sure the defective count matches the total positions and short codes specified.'
          }
          break
        default:
          statusModalData.value.error = {
            title: 'Error',
            message: message || 'Failed to change status'
          }
      }
      return // Don't close modal on error
    }
    
    // Success - close modal and reset
    showStatusModal.value = false
    selectedBatch.value = null
    statusModalData.value = {
      selectedStatus: '',
      defectiveCount: 0,
      defectivePositions: '',
      defectiveShortCodes: '',
      addedPositions: [],
      addedShortCodes: [],
      error: null,
      loading: false
    }
  } catch (error) {
    console.error('Error updating status:', error)
    
    // Handle network or unexpected errors
    if (error.response?.data) {
      const responseData = error.response.data
      
      // Check if it's the new error format
      if (responseData.success === false && responseData.error) {
        const { code, message } = responseData.error
        
        switch (code) {
          case 'INVALID_STATUS_TRANSITION':
            statusModalData.value.error = {
              title: 'Invalid Status Transition',
              message: message,
              suggestion: 'Please follow the correct status flow: Ordered → Printing → Received'
            }
            break
          case 'MISSING_DEFECTIVE_DETAILS':
            statusModalData.value.error = {
              title: 'Missing Defective Details',
              message: 'You must specify defective QR codes when defective count > 0.',
              suggestion: 'Add positions and/or short codes below to specify which items are defective.'
            }
            break
          case 'DEFECTIVE_COUNT_MISMATCH':
            statusModalData.value.error = {
              title: 'Count Mismatch',
              message: message,
              suggestion: 'Make sure the defective count matches the total positions and short codes specified.'
            }
            break
          default:
            statusModalData.value.error = {
              title: 'Error',
              message: message || 'Failed to change status'
            }
        }
      } else {
        // Fallback for old format or unexpected structure
        statusModalData.value.error = {
          title: 'Error',
          message: responseData.error?.message || 'Failed to change status'
        }
      }
    } else {
      statusModalData.value.error = {
        title: 'Network Error',
        message: 'Please check your connection and try again.'
      }
    }
  } finally {
    statusModalData.value.loading = false
  }
}


const onBatchCreated = () => {
  showCreateModal.value = false
  loadBatches()
}

// Watch pagination page changes to sync with input
watch(() => pagination.value.page, (newPage) => {
  currentPageInput.value = newPage
})

// Initialize
onMounted(() => {
  loadBatches()
})
</script>