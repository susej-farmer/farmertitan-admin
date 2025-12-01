<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click.self="$emit('close')">
    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-[500px] shadow-lg rounded-md bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          New Delivery Request
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="py-4">
        <form @submit.prevent="createDeliveryRequest">
          <div class="space-y-4">
            <!-- Farm -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Farm</label>
              <select
                v-model="form.farm_id"
                required
                :class="[
                  'w-full rounded-md border shadow-sm focus:ring-emerald-500',
                  !form.farm_id && form.requested_quantity 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-emerald-500'
                ]"
              >
                <option value="">Select Farm</option>
                <option v-for="farm in farms" :key="farm.id" :value="farm.id">
                  {{ farm.name }}
                </option>
              </select>
              <p v-if="!form.farm_id && form.requested_quantity" class="text-xs text-red-600 mt-1">
                Please select a farm
              </p>
            </div>

            <!-- Requested Quantity -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Requested Quantity</label>
              <input
                v-model.number="form.requested_quantity"
                type="number"
                min="1"
                max="1000"
                required
                :class="[
                  'w-full rounded-md border shadow-sm focus:ring-emerald-500',
                  form.requested_quantity > 1000 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-emerald-500'
                ]"
                placeholder="Number of QR codes requested (max 1000)"
              />
              <p v-if="form.requested_quantity > 1000" class="text-xs text-red-600 mt-1 font-medium">
                ⚠️ Warning: Quantity cannot exceed 1000 QR codes
              </p>
              <p v-else class="text-xs text-gray-500 mt-1">Maximum 1000 QR codes per request</p>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                v-model="form.notes"
                rows="3"
                :class="[
                  'w-full rounded-md border shadow-sm focus:ring-emerald-500',
                  notesError 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-emerald-500'
                ]"
                placeholder="Additional information, delivery instructions, or notes..."
              ></textarea>
              <p v-if="notesError" class="text-xs text-red-600 mt-1">
                {{ notesError }}
              </p>
              <p v-else class="text-xs text-gray-500 mt-1">Optional: Add any special instructions or notes</p>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4 border-t mt-6">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isCreating || !isFormValid"
              class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isCreating ? 'Creating...' : 'Create Request' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import api, { apiUtils } from '@/services/api.js'
import farmsApi from '@/services/farmsApi.js'

const emit = defineEmits(['close', 'created'])

// State
const farms = ref([])
const isCreating = ref(false)
const error = ref('')
const notesError = ref('')

// Form data
const form = reactive({
  farm_id: '',
  requested_quantity: null,
  notes: ''
})

// Computed properties
const isFormValid = computed(() => {
  // Clear notes error when notes change
  if (form.notes !== undefined) {
    validateNotes()
  }
  
  return form.requested_quantity >= 1 && 
         form.requested_quantity <= 1000 && 
         form.farm_id && 
         form.farm_id.trim() !== '' &&
         !notesError.value
})

// Methods
const validateNotes = () => {
  if (form.notes && form.notes.trim() === '') {
    notesError.value = 'Notes cannot be empty if provided. Please provide valid notes or leave blank.'
    return false
  }
  notesError.value = ''
  return true
}

const handleApiError = (response) => {
  const errorCode = response.response?.data?.code || response.code
  
  switch (errorCode) {
    case 'FARM_NOT_FOUND':
      return 'Selected farm not found. Please refresh and try again.'
    case 'USER_NOT_FOUND':
      return 'Authentication error. Please log in again.'
    case 'VALIDATION_ERROR':
      return response.response?.data?.error || response.error || 'Validation failed. Please check your input.'
    case 'MISSING_FARM_ID':
      return 'Please select a farm.'
    case 'DUPLICATE_ERROR':
      return 'System conflict. Please try again.'
    case 'UNAUTHORIZED':
      return 'Please log in to continue.'
    case 'UNEXPECTED_ERROR':
      return 'System error. Please contact support.'
    default:
      return response.userMessage || response.response?.data?.error || 'An unexpected error occurred.'
  }
}

const loadFarms = async () => {
  try {
    const response = await apiUtils.authenticatedRequest(() => farmsApi.getFarms())
    if (response.data) {
      farms.value = response.data
    }
  } catch (err) {
    console.error('Error loading farms:', err)
    farms.value = []
  }
}

const createDeliveryRequest = async () => {
  try {
    isCreating.value = true
    error.value = ''
    notesError.value = ''
    
    // Validate form client-side
    if (!form.requested_quantity || form.requested_quantity <= 0 || form.requested_quantity > 1000) {
      error.value = 'Please enter a valid quantity (1-1000)'
      return
    }
    
    if (!form.farm_id) {
      error.value = 'Please select a farm'
      return
    }
    
    // Validate notes
    if (!validateNotes()) {
      return
    }
    
    // Prepare payload according to API specification
    const payload = {
      farm_id: form.farm_id,
      requested_quantity: form.requested_quantity
    }
    
    // Add metadata only if notes are provided and not empty
    if (form.notes && form.notes.trim()) {
      payload.metadata = {
        notes: form.notes.trim()
      }
    }
    
    // Call backend API with correct endpoint
    const response = await apiUtils.authenticatedRequest(() => 
      api.post('/qr-codes/requests', payload)
    )
    
    // Success - emit the created data
    if (response.data && response.data.success) {
      emit('created', response.data.data)
      emit('close')
    } else {
      error.value = 'Unexpected response format from server'
    }
    
  } catch (err) {
    console.error('Error creating delivery request:', err)
    error.value = handleApiError(err)
  } finally {
    isCreating.value = false
  }
}

// Initialize
onMounted(() => {
  loadFarms()
})
</script>