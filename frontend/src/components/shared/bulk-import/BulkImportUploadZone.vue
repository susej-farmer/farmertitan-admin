<template>
  <div class="card">
    <div class="card-body">
      <div
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        :class="[
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50'
        ]"
      >
        <input
          ref="fileInput"
          type="file"
          :accept="accept"
          @change="handleFileSelect"
          class="hidden"
        />

        <div v-if="!selectedFile">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="mt-2 text-sm font-medium text-gray-900">
            Drop your CSV file here, or
            <button
              @click="$refs.fileInput.click()"
              type="button"
              class="text-emerald-600 hover:text-emerald-500"
            >
              browse
            </button>
          </p>
          <p class="mt-1 text-xs text-gray-500">{{ acceptLabel }}</p>
        </div>

        <div v-else class="flex items-center justify-center space-x-4">
          <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div class="text-left">
            <p class="text-sm font-medium text-gray-900">{{ selectedFile.name }}</p>
            <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <button
            @click="clearFile"
            class="btn btn-sm btn-danger"
          >
            Remove
          </button>
        </div>
      </div>

      <!-- Validation Errors -->
      <div v-if="validationError" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex">
          <svg class="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-sm font-medium text-red-900">Validation Error</h3>
            <p class="mt-1 text-sm text-red-700">{{ validationError }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  accept: {
    type: String,
    default: '.csv'
  },
  maxSize: {
    type: Number,
    default: 5 * 1024 * 1024 // 5MB
  },
  acceptLabel: {
    type: String,
    default: 'CSV files only, up to 5MB'
  }
})

const emit = defineEmits(['file-selected', 'file-cleared', 'validation-error'])

// State
const fileInput = ref(null)
const selectedFile = ref(null)
const isDragging = ref(false)
const validationError = ref('')

// Methods
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    processFile(file)
  }
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file) {
    processFile(file)
  }
}

const processFile = (file) => {
  validationError.value = ''

  // Validate file extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    validationError.value = 'Please select a CSV file (.csv extension)'
    emit('validation-error', validationError.value)
    return
  }

  // Validate file size
  if (file.size > props.maxSize) {
    const maxMB = (props.maxSize / (1024 * 1024)).toFixed(0)
    validationError.value = `File size must be less than ${maxMB}MB`
    emit('validation-error', validationError.value)
    return
  }

  selectedFile.value = file
  emit('file-selected', file)
}

const clearFile = () => {
  selectedFile.value = null
  validationError.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  emit('file-cleared')
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Expose methods for parent components
defineExpose({
  clearFile
})
</script>
