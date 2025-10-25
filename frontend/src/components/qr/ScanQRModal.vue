<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click.self="$emit('close')">
    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-[500px] shadow-lg rounded-md bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          Scan QR Code
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="py-4">
        <form @submit.prevent="scanQR">
          <div class="space-y-4">
            <!-- QR Code Input -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">QR Code</label>
              <input
                v-model="qrCode"
                type="text"
                required
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Enter QR code or scan..."
                @input="validateQR"
              />
              <p class="mt-1 text-sm text-gray-500">Enter the QR code manually or use a scanner</p>
            </div>

            <!-- Scanner Button -->
            <div class="text-center">
              <button
                type="button"
                @click="startScanner"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use Camera Scanner
              </button>
            </div>
          </div>

          <!-- QR Info Display -->
          <div v-if="qrInfo" class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 class="text-sm font-medium text-blue-900 mb-2">QR Code Information</h4>
            <dl class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-blue-700">Status</dt>
                <dd class="text-sm text-blue-900">{{ qrInfo.status }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-blue-700">Farm</dt>
                <dd class="text-sm text-blue-900">{{ qrInfo.farm?.name || '-' }}</dd>
              </div>
              <div v-if="qrInfo.binding?.bound">
                <dt class="text-sm font-medium text-blue-700">Bound To</dt>
                <dd class="text-sm text-blue-900">{{ qrInfo.binding.asset_name }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-blue-700">Generation</dt>
                <dd class="text-sm text-blue-900">{{ qrInfo.generation?.type }}</dd>
              </div>
            </dl>
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
              :disabled="isScanning || !qrCode"
              class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {{ isScanning ? 'Scanning...' : 'Scan QR Code' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'scanned'])

// State
const qrCode = ref('')
const qrInfo = ref(null)
const isScanning = ref(false)

// Methods
const validateQR = () => {
  // Clear previous info when input changes
  qrInfo.value = null
}

const scanQR = async () => {
  try {
    isScanning.value = true
    
    // Mock API call to get QR info
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock QR info response
    qrInfo.value = {
      found: true,
      qr_id: 'qr-123',
      identifiers: {
        uuid: 'qr-123',
        short_code: qrCode.value
      },
      status: 'bound',
      farm: {
        id: 'farm1',
        name: 'Farm 1'
      },
      generation: {
        type: 'individual',
        source: 'Farm Direct'
      },
      binding: {
        bound: true,
        asset_type: 'equipment',
        asset_id: 'eq1',
        asset_name: 'John Deere Tractor'
      }
    }
    
    emit('scanned', qrInfo.value)
    
  } catch (err) {
    console.error('Error scanning QR:', err)
  } finally {
    isScanning.value = false
  }
}

const startScanner = () => {
  // Implement camera scanner functionality
  console.log('Start camera scanner')
  // For now, just simulate a scanned code
  qrCode.value = 'FT-DEMO123'
}
</script>