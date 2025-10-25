<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click.self="$emit('close')">
    <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-[600px] shadow-lg rounded-md bg-white">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900">
          Generate QR Code
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <div class="py-4">
        <form @submit.prevent="generateQR">
          <!-- Generation Type -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Generation Type</label>
            <div class="grid grid-cols-1 gap-3">
              <label class="relative flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                <input
                  v-model="form.generationType"
                  type="radio"
                  value="individual"
                  class="h-4 w-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                />
                <div class="ml-3">
                  <div class="text-sm font-medium text-gray-900">Individual QR Code</div>
                  <div class="text-sm text-gray-500">Generate a single QR code for immediate use</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Farm Selection -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Target Farm</label>
            <select
              v-model="form.farmId"
              required
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">Select Farm</option>
              <option v-for="farm in farms" :key="farm.id" :value="farm.id">
                {{ farm.name }}
              </option>
            </select>
          </div>

          <!-- Immediate Binding Option -->
          <div class="mb-4">
            <div class="flex items-center">
              <input
                v-model="form.immediateBind"
                type="checkbox"
                class="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <label class="ml-2 text-sm font-medium text-gray-700">
                Bind immediately to asset
              </label>
            </div>
            <p class="mt-1 text-sm text-gray-500">If checked, you can select an asset to bind this QR to immediately</p>
          </div>

          <!-- Asset Selection (if immediate binding) -->
          <div v-if="form.immediateBind" class="space-y-4 mb-4">
            <!-- Asset Type -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
              <select
                v-model="form.assetType"
                @change="loadAssets"
                required
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="">Select Asset Type</option>
                <option value="equipment">Equipment</option>
                <option value="part">Part</option>
                <option value="consumable">Consumable</option>
              </select>
            </div>

            <!-- Asset Selection -->
            <div v-if="form.assetType">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ form.assetType.charAt(0).toUpperCase() + form.assetType.slice(1) }}
              </label>
              <select
                v-model="form.assetId"
                :disabled="isLoadingAssets"
                required
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="">{{ isLoadingAssets ? 'Loading...' : `Select ${form.assetType}` }}</option>
                <option v-for="asset in availableAssets" :key="asset.id" :value="asset.id">
                  {{ asset.name }} {{ asset.serial_number ? `(${asset.serial_number})` : '' }}
                </option>
              </select>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isGenerating"
              class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {{ isGenerating ? 'Generating...' : 'Generate QR Code' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Success State -->
      <div v-if="generatedQR" class="py-4 border-t">
        <div class="bg-green-50 border border-green-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">QR Code Generated Successfully!</h3>
              <div class="mt-2 text-sm text-green-700">
                <p>QR Code: <span class="font-medium">{{ generatedQR.short_code }}</span></p>
                <p v-if="generatedQR.binding_result?.success">
                  Bound to: {{ generatedQR.binding_result.bound_to.type }}
                </p>
              </div>
              <div class="mt-3">
                <button
                  @click="downloadQR"
                  class="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-md hover:bg-green-200"
                >
                  Download QR Code
                </button>
                <button
                  @click="printQR"
                  class="ml-2 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-md hover:bg-green-200"
                >
                  Print QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="py-4 border-t">
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error Generating QR Code</h3>
              <div class="mt-2 text-sm text-red-700">{{ error }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const emit = defineEmits(['close', 'generated'])

// State
const farms = ref([])
const availableAssets = ref([])
const isGenerating = ref(false)
const isLoadingAssets = ref(false)
const generatedQR = ref(null)
const error = ref(null)

// Form data
const form = reactive({
  generationType: 'individual',
  farmId: '',
  immediateBind: false,
  assetType: '',
  assetId: ''
})

// Methods
const loadFarms = async () => {
  try {
    // Mock data for now
    farms.value = [
      { id: 'farm1', name: 'Farm 1' },
      { id: 'farm2', name: 'Farm 2' },
      { id: 'farm3', name: 'Farm 3' }
    ]
  } catch (err) {
    console.error('Error loading farms:', err)
  }
}

const loadAssets = async () => {
  if (!form.assetType || !form.farmId) {
    availableAssets.value = []
    return
  }

  try {
    isLoadingAssets.value = true
    
    // Mock asset data based on type
    if (form.assetType === 'equipment') {
      availableAssets.value = [
        { id: 'eq1', name: 'John Deere Tractor', serial_number: 'JD001' },
        { id: 'eq2', name: 'Case IH Harvester', serial_number: 'CH002' }
      ]
    } else if (form.assetType === 'part') {
      availableAssets.value = [
        { id: 'pt1', name: 'Engine Filter' },
        { id: 'pt2', name: 'Hydraulic Pump' }
      ]
    } else if (form.assetType === 'consumable') {
      availableAssets.value = [
        { id: 'cs1', name: 'Engine Oil' },
        { id: 'cs2', name: 'Coolant' }
      ]
    }
  } catch (err) {
    console.error('Error loading assets:', err)
    availableAssets.value = []
  } finally {
    isLoadingAssets.value = false
  }
}

const generateQR = async () => {
  try {
    isGenerating.value = true
    error.value = null
    
    // Validate form
    if (!form.farmId) {
      throw new Error('Please select a farm')
    }
    
    if (form.immediateBind && (!form.assetType || !form.assetId)) {
      throw new Error('Please select an asset for immediate binding')
    }
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Mock successful response
    const mockResponse = {
      success: true,
      qr_id: 'qr-' + Date.now(),
      short_code: 'FT-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      generation_type: 'individual',
      status: form.immediateBind ? 'bound' : 'ready_to_print'
    }
    
    if (form.immediateBind) {
      mockResponse.binding_result = {
        success: true,
        bound_to: {
          type: form.assetType,
          id: form.assetId
        }
      }
    }
    
    generatedQR.value = mockResponse
    emit('generated', mockResponse)
    
  } catch (err) {
    console.error('Error generating QR:', err)
    error.value = err.message
  } finally {
    isGenerating.value = false
  }
}

const downloadQR = () => {
  // Implement QR download functionality
  console.log('Download QR:', generatedQR.value.short_code)
}

const printQR = () => {
  // Implement QR print functionality
  console.log('Print QR:', generatedQR.value.short_code)
}

// Initialize
onMounted(() => {
  loadFarms()
})
</script>