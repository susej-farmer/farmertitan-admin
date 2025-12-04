<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-lg font-medium text-gray-900">Bulk Import Equipment</h2>
      <p class="mt-1 text-sm text-gray-600">
        Import multiple equipment items to <span class="font-medium">{{ farm.name }}</span> using a CSV file.
      </p>
    </div>

    <!-- Download Template -->
    <div class="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm font-medium text-blue-900">Need a template?</span>
      </div>
      <a
        href="/templates/equipment_template.csv"
        download="equipment_template.csv"
        class="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white"
      >
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Template
      </a>
    </div>

    <!-- Upload Area -->
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
            accept=".csv"
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
            <p class="mt-1 text-xs text-gray-500">CSV files only, up to 5MB</p>
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

    <!-- Preview -->
    <div v-if="previewData.length > 0" class="card">
      <div class="card-body">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          Preview (first {{ previewData.length }} rows)
        </h3>

        <div class="overflow-x-auto">
          <table class="table min-w-full">
            <thead class="table-header">
              <tr>
                <th class="table-header-cell">Row</th>
                <th v-for="header in previewHeaders" :key="header" class="table-header-cell">
                  {{ header }}
                </th>
              </tr>
            </thead>
            <tbody class="table-body">
              <tr v-for="(row, index) in previewData" :key="index" class="table-row">
                <td class="table-cell font-medium">{{ index + 1 }}</td>
                <td v-for="header in previewHeaders" :key="header" class="table-cell">
                  {{ row[header] || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <p class="text-sm text-gray-600">
            Total rows detected: <span class="font-medium">{{ totalRows }}</span>
          </p>

          <button
            @click="processImport"
            :disabled="processing"
            class="btn btn-primary"
          >
            <svg v-if="!processing" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <div v-else class="loading-spinner w-5 h-5 mr-2"></div>
            {{ processing ? 'Importing...' : `Import ${totalRows} Equipment` }}
          </button>
        </div>
      </div>
    </div>

    <!-- Import Result -->
    <div v-if="importResult" ref="resultCard" class="card">
      <div class="card-body space-y-6">
        <!-- Summary Header -->
        <div v-if="importResult.success"
             :class="[
               'border rounded-lg p-6',
               importResult.summary.skipped > 0
                 ? 'bg-yellow-50 border-yellow-200'
                 : 'bg-green-50 border-green-200'
             ]">
          <div class="flex items-start">
            <div :class="[
                'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
                importResult.summary.skipped > 0 ? 'bg-yellow-100' : 'bg-green-100'
              ]">
              <svg
                :class="[
                  'w-6 h-6',
                  importResult.summary.skipped > 0 ? 'text-yellow-600' : 'text-green-600'
                ]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path v-if="importResult.summary.skipped === 0" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div class="ml-4 flex-1">
              <h3 :class="[
                'text-xl font-bold',
                importResult.summary.skipped > 0 ? 'text-yellow-900' : 'text-green-900'
              ]">
                {{ importResult.summary.skipped === 0 ? 'Import Completed Successfully!' : 'Import Completed with Some Errors' }}
              </h3>
              <p class="mt-1 text-sm" :class="importResult.summary.skipped > 0 ? 'text-yellow-700' : 'text-green-700'">
                {{ importResult.message }}
              </p>

              <!-- Statistics Grid -->
              <div class="mt-4 grid grid-cols-3 gap-6">
                <div>
                  <p class="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Records</p>
                  <p class="mt-1 text-3xl font-bold text-gray-900">{{ importResult.summary.totalRecords }}</p>
                </div>
                <div>
                  <p class="text-xs font-medium text-gray-600 uppercase tracking-wide">Successfully Created</p>
                  <p class="mt-1 text-3xl font-bold text-green-600">{{ importResult.summary.successfullyCreated }}</p>
                </div>
                <div v-if="importResult.summary.skipped > 0">
                  <p class="text-xs font-medium text-gray-600 uppercase tracking-wide">Failed</p>
                  <p class="mt-1 text-3xl font-bold text-red-600">{{ importResult.summary.skipped }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Complete Failure -->
        <div v-else-if="!importResult.success" class="bg-red-50 border border-red-200 rounded-lg p-6">
          <div class="flex items-start">
            <div class="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div class="ml-4 flex-1">
              <h3 class="text-xl font-bold text-red-900">Import Failed</h3>
              <p class="mt-1 text-sm text-red-700">{{ importResult.message }}</p>
            </div>
          </div>
        </div>

        <!-- Tabs for Details -->
        <div v-if="importResult.success && (importResult.processed?.length > 0 || importResult.skipped?.length > 0)" class="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <!-- Tab Headers -->
          <div class="border-b border-gray-200 bg-gray-50">
            <nav class="-mb-px flex">
              <button
                @click="resultTab = 'success'"
                :class="[
                  'py-3 px-6 border-b-2 font-medium text-sm flex items-center',
                  resultTab === 'success'
                    ? 'border-green-500 text-green-700 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Successfully Created
                <span class="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  {{ importResult.summary.successfullyCreated }}
                </span>
              </button>
              <button
                v-if="importResult.summary.skipped > 0"
                @click="resultTab = 'failed'"
                :class="[
                  'py-3 px-6 border-b-2 font-medium text-sm flex items-center',
                  resultTab === 'failed'
                    ? 'border-red-500 text-red-700 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                ]"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Failed
                <span class="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  {{ importResult.summary.skipped }}
                </span>
              </button>
            </nav>
          </div>

          <!-- Tab Content -->
          <div class="p-0">
            <!-- Successfully Created Tab -->
            <div v-if="resultTab === 'success' && importResult.processed?.length > 0">
              <div class="overflow-x-auto">
                <table class="table min-w-full">
                  <thead class="table-header bg-gray-50 sticky top-0">
                    <tr>
                      <th class="table-header-cell text-left">Line</th>
                      <th class="table-header-cell text-left">Equipment ID</th>
                      <th class="table-header-cell text-left">Equipment Name</th>
                      <th class="table-header-cell text-left">Type</th>
                      <th class="table-header-cell text-left">Make / Model</th>
                      <th class="table-header-cell text-left">Serial Number</th>
                      <th class="table-header-cell text-left">Tasks Created</th>
                    </tr>
                  </thead>
                  <tbody class="table-body">
                    <tr v-for="(item, index) in importResult.processed" :key="index" class="table-row hover:bg-gray-50">
                      <td class="table-cell">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          {{ item.line }}
                        </span>
                      </td>
                      <td class="table-cell">
                        <span class="font-mono text-xs text-gray-600">{{ item.created_equipment_id }}</span>
                      </td>
                      <td class="table-cell font-medium text-gray-900">{{ item.name }}</td>
                      <td class="table-cell">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {{ item.equipment_type }}
                        </span>
                      </td>
                      <td class="table-cell text-sm text-gray-600">
                        {{ item.make }}
                        <span v-if="item.model" class="text-gray-400">/ {{ item.model }}</span>
                      </td>
                      <td class="table-cell font-mono text-sm text-gray-900">{{ item.serial_number }}</td>
                      <td class="table-cell">
                        <span class="inline-flex items-center text-sm text-gray-700">
                          <svg class="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {{ item.tasks_created }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button @click="downloadSuccessReport" class="btn btn-sm btn-secondary">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Success Report (CSV)
                </button>
              </div>
            </div>

            <!-- Failed Tab -->
            <div v-if="resultTab === 'failed' && importResult.skipped?.length > 0">
              <div class="overflow-x-auto">
                <table class="table min-w-full">
                  <thead class="table-header bg-gray-50 sticky top-0">
                    <tr>
                      <th class="table-header-cell text-left">Line</th>
                      <th class="table-header-cell text-left">Equipment Name</th>
                      <th class="table-header-cell text-left">Serial Number</th>
                      <th class="table-header-cell text-left">Error Reason</th>
                    </tr>
                  </thead>
                  <tbody class="table-body">
                    <tr v-for="(item, index) in importResult.skipped" :key="index" class="table-row hover:bg-red-50">
                      <td class="table-cell">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          {{ item.line }}
                        </span>
                      </td>
                      <td class="table-cell font-medium text-gray-900">{{ item.data?.equipment_name || '-' }}</td>
                      <td class="table-cell font-mono text-sm text-gray-600">{{ item.data?.serial_number || '-' }}</td>
                      <td class="table-cell">
                        <div class="flex items-start">
                          <svg class="w-4 h-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span class="text-sm text-red-700">{{ item.reason }}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button @click="downloadErrorReport" class="btn btn-sm btn-danger">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Error Report (CSV)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center space-x-3">
          <button @click="resetImport" class="btn btn-primary">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Import Another File
          </button>
          <button v-if="importResult.summary?.successfullyCreated > 0" @click="viewImportedEquipment" class="btn btn-secondary">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View All Equipment
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { farmsApi } from '@/services/farmsApi'
import { useNotifications } from '@/composables/useNotifications'

const props = defineProps({
  farm: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['import-complete', 'view-equipment'])

const { error: showError } = useNotifications()

// State
const fileInput = ref(null)
const selectedFile = ref(null)
const isDragging = ref(false)
const validationError = ref('')
const previewData = ref([])
const previewHeaders = ref([])
const totalRows = ref(0)
const processing = ref(false)
const importResult = ref(null)
const resultCard = ref(null)
const resultTab = ref('success') // Tab control for results

// Debug lifecycle
onMounted(() => {
  console.log('🟢 BulkImportTab mounted')
})

onUnmounted(() => {
  console.log('🔴 BulkImportTab unmounted - importResult will be lost!')
})

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

const processFile = async (file) => {
  // Reset state
  validationError.value = ''
  previewData.value = []
  importResult.value = null

  // Validate file
  if (!file.name.endsWith('.csv')) {
    validationError.value = 'Please select a CSV file (.csv extension)'
    return
  }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    validationError.value = 'File size must be less than 5MB'
    return
  }

  selectedFile.value = file

  // Parse and preview
  try {
    await parseAndPreview(file)
  } catch (error) {
    console.error('Failed to parse CSV:', error)
    validationError.value = 'Failed to parse CSV file. Please check the format.'
  }
}

const parseAndPreview = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target.result
        // Split by newline and filter empty lines (only whitespace)
        const allLines = text.split('\n')
        const lines = allLines.filter(line => line.trim().length > 0)

        if (lines.length < 2) {
          validationError.value = 'CSV file must have at least a header row and one data row'
          reject(new Error('Empty CSV'))
          return
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim())
        previewHeaders.value = headers

        // Validate required columns
        const requiredColumns = ['equipment_name', 'equipment_type_id', 'make_id', 'serial_number']
        const missingColumns = requiredColumns.filter(col => !headers.includes(col))

        if (missingColumns.length > 0) {
          validationError.value = `Missing required columns: ${missingColumns.join(', ')}`
          reject(new Error('Missing columns'))
          return
        }

        // Parse data rows (everything after header)
        const dataLines = lines.slice(1)
        totalRows.value = dataLines.length

        // Validate maximum rows (500 data rows max, excluding header)
        if (dataLines.length > 500) {
          validationError.value = `File contains ${dataLines.length} data rows. Maximum allowed is 500 rows (excluding header)`
          reject(new Error('Too many rows'))
          return
        }

        const preview = dataLines.slice(0, 5).map(line => {
          const values = parseCSVLine(line)
          const row = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          return row
        })

        previewData.value = preview
        resolve()
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}

// Simple CSV line parser (handles basic cases)
const parseCSVLine = (line) => {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

const processImport = async () => {
  if (!selectedFile.value || !props.farm.id) {
    return
  }

  processing.value = true
  importResult.value = null

  try {
    const response = await farmsApi.bulkImportEquipment(props.farm.id, selectedFile.value)

    if (response.success) {
      // Map the new response structure
      importResult.value = {
        success: true,
        message: response.data.message,
        summary: response.data.summary,
        processed: response.data.processed,
        skipped: response.data.skipped
      }

      // Reset to success tab
      resultTab.value = 'success'

      console.log('✅ Import completed:', importResult.value.summary)

      // Emit event to parent with summary data
      emit('import-complete', {
        ...response.data.summary,
        processedRecords: response.data.summary.successfullyCreated,
        skippedRecords: response.data.summary.skipped
      })

      // Scroll to results after DOM updates
      await nextTick()
      if (resultCard.value) {
        resultCard.value.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
      }
    } else {
      throw new Error(response.message || 'Import failed')
    }
  } catch (error) {
    console.error('Import failed:', error)
    importResult.value = {
      success: false,
      message: error.userMessage || error.message || 'Failed to import equipment'
    }
    showError('Import Failed', error.userMessage || error.message)
  } finally {
    processing.value = false
  }
}

const clearFile = () => {
  selectedFile.value = null
  previewData.value = []
  previewHeaders.value = []
  totalRows.value = 0
  validationError.value = ''
  importResult.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const resetImport = () => {
  clearFile()
}

const downloadSuccessReport = () => {
  if (!importResult.value?.processed?.length) return

  // Generate CSV content
  const headers = [
    'Line',
    'Equipment ID',
    'Equipment Name',
    'Type',
    'Make',
    'Model',
    'Serial Number',
    'License Number',
    'Year Purchased',
    'Lease/Owned',
    'Tasks Created'
  ]

  const rows = importResult.value.processed.map(item => [
    item.line,
    item.created_equipment_id,
    item.name,
    item.equipment_type,
    item.make,
    item.model || '',
    item.serial_number,
    item.license_number || '',
    item.year_purchased || '',
    item.lease_owned ? 'Owned' : 'Leased',
    item.tasks_created
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Escape commas and quotes in CSV
      const escaped = String(cell).replace(/"/g, '""')
      return escaped.includes(',') ? `"${escaped}"` : escaped
    }).join(','))
  ].join('\n')

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `import-success-${Date.now()}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const downloadErrorReport = () => {
  if (!importResult.value?.skipped?.length) return

  // Generate CSV content
  const headers = ['Line', 'Equipment Name', 'Serial Number', 'Reason']
  const rows = importResult.value.skipped.map(item => [
    item.line,
    item.data?.equipment_name || '',
    item.data?.serial_number || '',
    item.reason
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Escape commas and quotes in CSV
      const escaped = String(cell).replace(/"/g, '""')
      return escaped.includes(',') ? `"${escaped}"` : escaped
    }).join(','))
  ].join('\n')

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `import-errors-${Date.now()}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const viewEquipmentDetails = (equipmentId) => {
  // TODO: Navigate to equipment detail page
  // This will depend on your routing setup
  console.log('View equipment details:', equipmentId)
  // Example: router.push(`/equipment/${equipmentId}`)
}

const viewImportedEquipment = () => {
  // Switch to Equipment tab
  // This would need to be implemented based on your tab structure
  // For now, we can emit an event to the parent
  emit('view-equipment')
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>
