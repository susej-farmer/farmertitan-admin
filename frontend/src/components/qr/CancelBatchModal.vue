<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="$emit('close')"></div>

      <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-medium text-gray-900">
            Cancel Batch
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Warning -->
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div class="flex">
            <svg class="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <div>
              <h4 class="text-sm font-medium text-red-800">
                Are you sure you want to cancel this batch?
              </h4>
              <div class="mt-2 text-sm text-red-700">
                <p><strong>Batch:</strong> {{ batch?.batch_code }}</p>
                <p><strong>Quantity:</strong> {{ batch?.quantity }} QR codes</p>
                <p class="mt-2">
                  This action will retire all QR codes in this batch and cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <!-- Cancellation Reason -->
            <div>
              <label for="reason" class="block text-sm font-medium text-gray-700 mb-1">
                Cancellation Reason <span class="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                v-model="form.reason"
                rows="3"
                required
                placeholder="Please provide a reason for cancelling this batch..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              ></textarea>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Keep Batch
            </button>
            <button
              type="submit"
              :disabled="loading || !form.reason.trim()"
              class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {{ loading ? 'Cancelling...' : 'Cancel Batch' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { qrService } from '@/services/qrService'

const props = defineProps({
  batch: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'cancelled'])

// State
const loading = ref(false)
const form = ref({
  reason: ''
})

// Methods
const handleSubmit = async () => {
  try {
    loading.value = true
    
    await qrService.updateBatchStatus(props.batch.id, {
      status: 'cancelled',
      notes: form.value.reason
    })
    
    emit('cancelled')
  } catch (error) {
    console.error('Failed to cancel batch:', error)
    alert('Failed to cancel batch. Please try again.')
  } finally {
    loading.value = false
  }
}
</script>