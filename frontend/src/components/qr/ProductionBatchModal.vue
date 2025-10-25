<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click.self="$emit('close')">
    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-[500px] shadow-lg rounded-md bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          Create Production Batch
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="py-4">
        <form @submit.prevent="createBatch">
          <div class="space-y-4">
            <!-- Quantity -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                v-model.number="form.quantity"
                type="number"
                min="1"
                max="100"
                required
                :class="[
                  'w-full rounded-md border shadow-sm focus:ring-emerald-500',
                  form.quantity > 100 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-emerald-500'
                ]"
                placeholder="Number of QR codes to generate (max 100)"
              />
              <p v-if="form.quantity > 100" class="text-xs text-red-600 mt-1 font-medium">
                ⚠️ Warning: Quantity cannot exceed 100 QR codes per batch
              </p>
              <p v-else class="text-xs text-gray-500 mt-1">Maximum 100 QR codes per batch for performance reasons</p>
            </div>

            <!-- Supplier -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                v-model="form.supplier_id"
                required
                :class="[
                  'w-full rounded-md border shadow-sm focus:ring-emerald-500',
                  !form.supplier_id && form.quantity 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-emerald-500'
                ]"
              >
                <option value="">Select Supplier</option>
                <option v-for="supplier in suppliers" :key="supplier.id" :value="supplier.id">
                  {{ supplier.name }}
                </option>
              </select>
              <p v-if="!form.supplier_id && form.quantity" class="text-xs text-red-600 mt-1">
                Please select a supplier
              </p>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                v-model="form.notes"
                rows="3"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Additional notes or specifications..."
              ></textarea>
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
              {{ isCreating ? 'Creating...' : 'Create Batch' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import qrApi from '@/services/qrApi.js'

const emit = defineEmits(['close', 'created'])

// State
const suppliers = ref([])
const isCreating = ref(false)
const error = ref('')

// Form data
const form = reactive({
  quantity: 50,
  supplier_id: '',
  notes: ''
})

// Computed properties
const isFormValid = computed(() => {
  return form.quantity >= 1 && 
         form.quantity <= 100 && 
         form.supplier_id && 
         form.supplier_id.trim() !== ''
})

// Methods
const loadSuppliers = async () => {
  try {
    const response = await qrApi.getSuppliers()
    if (response.success) {
      suppliers.value = response.data || []
    }
  } catch (err) {
    console.error('Error loading suppliers:', err)
    suppliers.value = []
  }
}

const createBatch = async () => {
  try {
    isCreating.value = true
    error.value = ''
    
    // Validate form
    if (!form.quantity || form.quantity <= 0 || form.quantity > 100) {
      error.value = 'Please enter a valid quantity (1-100)'
      return
    }
    
    if (!form.supplier_id) {
      error.value = 'Please select a supplier'
      return
    }
    
    // Call backend API
    const response = await qrApi.createProductionBatch({
      quantity: form.quantity,
      supplier_id: form.supplier_id,
      notes: form.notes
    })
    
    if (response.success) {
      emit('created', response.data)
      emit('close')
    } else {
      error.value = 'Failed to create production batch'
    }
    
  } catch (err) {
    console.error('Error creating batch:', err)
    error.value = err.userMessage || 'An error occurred while creating the batch'
  } finally {
    isCreating.value = false
  }
}

// Initialize
onMounted(() => {
  loadSuppliers()
})
</script>