<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="$emit('close')"></div>

      <div class="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">
            Receive Batch: {{ batch?.batch_code }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <!-- Batch Info -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-medium text-gray-900 mb-2">Batch Information</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-500">Quantity:</span>
                  <span class="ml-2 font-medium">{{ batch?.quantity }}</span>
                </div>
                <div>
                  <span class="text-gray-500">Supplier:</span>
                  <span class="ml-2 font-medium">{{ batch?.supplier?.name || batch?.supplier_name }}</span>
                </div>
              </div>
            </div>

            <!-- Defective QRs Section -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Defective QR Codes (Optional)
              </label>
              <p class="text-xs text-gray-500 mb-3">
                Specify which QR codes are defective by position or QR code.
              </p>
              
              <!-- Method Selection -->
              <div class="mb-3">
                <label class="flex items-center">
                  <input 
                    type="radio" 
                    v-model="defectiveMethod" 
                    value="positions" 
                    class="mr-2"
                  >
                  <span class="text-sm">By Position (e.g., 1, 5, 10)</span>
                </label>
                <label class="flex items-center mt-1">
                  <input 
                    type="radio" 
                    v-model="defectiveMethod" 
                    value="short_codes" 
                    class="mr-2"
                  >
                  <span class="text-sm">By QR Code (e.g., FT-ABC123, FT-DEF456)</span>
                </label>
              </div>

              <!-- Input based on method -->
              <div v-if="defectiveMethod === 'positions'">
                <input
                  type="text"
                  v-model="defectiveInput"
                  placeholder="Enter positions separated by commas (e.g., 1, 5, 10)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                <p class="text-xs text-gray-500 mt-1">
                  Position numbers from 1 to {{ batch?.quantity }}
                </p>
              </div>

              <div v-if="defectiveMethod === 'short_codes'">
                <input
                  type="text"
                  v-model="defectiveInput"
                  placeholder="Enter QR codes separated by commas (e.g., FT-ABC123, FT-DEF456)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                <p class="text-xs text-gray-500 mt-1">
                  QR codes as printed on the physical labels
                </p>
              </div>
            </div>

            <!-- Notes -->
            <div>
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
                Reception Notes
              </label>
              <textarea
                id="notes"
                v-model="form.notes"
                rows="3"
                placeholder="Any notes about the received batch..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <!-- Summary -->
            <div v-if="defectiveCount > 0" class="bg-yellow-50 p-3 rounded-lg">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-yellow-800">
                    {{ defectiveCount }} QR code(s) will be marked as defective
                  </p>
                  <p class="text-sm text-yellow-700">
                    {{ validCount }} QR code(s) will be available for allocation
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {{ loading ? 'Processing...' : 'Receive Batch' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue'
import { qrService } from '@/services/qrService'

const props = defineProps({
  batch: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'received'])

// State
const loading = ref(false)
const defectiveMethod = ref('positions')
const defectiveInput = ref('')
const form = ref({
  notes: ''
})

// Computed
const defectiveList = computed(() => {
  if (!defectiveInput.value.trim()) return []
  
  return defectiveInput.value
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)
})

const defectiveCount = computed(() => {
  if (defectiveMethod.value === 'positions') {
    return defectiveList.value.filter(pos => {
      const num = parseInt(pos)
      return !isNaN(num) && num >= 1 && num <= props.batch?.quantity
    }).length
  }
  return defectiveList.value.length
})

const validCount = computed(() => {
  return (props.batch?.quantity || 0) - defectiveCount.value
})

// Methods
const handleSubmit = async () => {
  try {
    loading.value = true
    
    // Build defective_info object
    const defectiveInfo = {}
    
    if (defectiveCount.value > 0) {
      if (defectiveMethod.value === 'positions') {
        const positions = defectiveList.value
          .map(pos => parseInt(pos))
          .filter(num => !isNaN(num) && num >= 1 && num <= props.batch.quantity)
        
        if (positions.length > 0) {
          defectiveInfo.positions = positions
        }
      } else {
        defectiveInfo.short_codes = defectiveList.value
      }
    }
    
    await qrService.updateBatchStatus(props.batch.id, {
      status: 'received',
      notes: form.value.notes,
      defective_info: defectiveInfo
    })
    
    emit('received')
  } catch (error) {
    console.error('Failed to receive batch:', error)
    alert('Failed to receive batch. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>