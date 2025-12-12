<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="close">
    <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="close"></div>

      <!-- Modal panel -->
      <div class="relative inline-block w-full max-w-5xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Bulk Import Maintenance Templates</h2>
            <p class="mt-1 text-sm text-gray-600">
              Import multiple default maintenance tasks using a CSV file
            </p>
          </div>
          <button
            @click="close"
            class="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-6">
          <!-- Download Template -->
          <BulkImportTemplateDownload
            :template-path="config.templatePath"
            :file-name="config.templateFileName"
            message="Need a template?"
            button-text="Download Template"
          />

          <!-- Upload Zone -->
          <BulkImportUploadZone
            ref="uploadZone"
            @file-selected="handleFileSelected"
            @file-cleared="handleFileCleared"
          />

          <!-- Validation Errors from Parsing -->
          <div v-if="validationError" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex">
              <svg class="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="flex-1">
                <h3 class="text-sm font-medium text-red-900">Invalid CSV File</h3>
                <div class="mt-2 text-sm text-red-700 space-y-1">
                  <p v-for="(line, index) in validationError.split('\n')" :key="index" class="whitespace-pre-wrap">
                    {{ line }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview -->
          <BulkImportPreview
            v-if="previewData.length > 0"
            :headers="previewHeaders"
            :data="previewData"
            :total-rows="totalRows"
            :processing="processing"
            entity-name="Templates"
            import-button-text="Import"
            processing-text="Importing..."
            @import="processImport"
          />

          <!-- Results -->
          <BulkImportResults
            v-if="importResult"
            :result="importResult"
            @reset="resetImport"
            @download-success="downloadSuccessReport"
            @download-errors="downloadErrorReport"
          >
            <!-- Custom Success Table -->
            <template #success-table="{ items }">
              <table class="table min-w-full">
                <thead class="table-header bg-gray-50 sticky top-0">
                  <tr>
                    <th class="table-header-cell text-left">Line</th>
                    <th class="table-header-cell text-left">Task Name</th>
                    <th class="table-header-cell text-left">Equipment Type ID</th>
                    <th class="table-header-cell text-left">Make ID</th>
                    <th class="table-header-cell text-left">Model ID</th>
                    <th class="table-header-cell text-left">Interval</th>
                  </tr>
                </thead>
                <tbody class="table-body">
                  <tr v-for="(item, index) in items" :key="index" class="table-row hover:bg-gray-50">
                    <td class="table-cell">
                      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        {{ item.line }}
                      </span>
                    </td>
                    <td class="table-cell font-medium text-gray-900">{{ item.task_name }}</td>
                    <td class="table-cell">
                      <span v-if="item.equipment_type_id" class="font-mono text-xs text-gray-600">
                        {{ item.equipment_type_id }}
                      </span>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="table-cell">
                      <span v-if="item.equipment_make_id" class="font-mono text-xs text-gray-600">
                        {{ item.equipment_make_id }}
                      </span>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="table-cell">
                      <span v-if="item.equipment_model_id" class="font-mono text-xs text-gray-600">
                        {{ item.equipment_model_id }}
                      </span>
                      <span v-else class="text-gray-400">-</span>
                    </td>
                    <td class="table-cell">
                      <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                        {{ item.time_interval }} {{ item.time_type }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>

            <!-- Custom Failed Table -->
            <template #failed-table="{ items }">
              <table class="table min-w-full">
                <thead class="table-header bg-gray-50 sticky top-0">
                  <tr>
                    <th class="table-header-cell text-left">Line</th>
                    <th class="table-header-cell text-left">Task Name</th>
                    <th class="table-header-cell text-left">Equipment Type</th>
                    <th class="table-header-cell text-left">Error Reason</th>
                  </tr>
                </thead>
                <tbody class="table-body">
                  <tr v-for="(item, index) in items" :key="index" class="table-row hover:bg-red-50">
                    <td class="table-cell">
                      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                        {{ item.line }}
                      </span>
                    </td>
                    <td class="table-cell font-medium text-gray-900">{{ item.data?.task_name || '-' }}</td>
                    <td class="table-cell text-sm text-gray-600">{{ item.data?._equipment_type || '-' }}</td>
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
            </template>

            <!-- Extra Actions -->
            <template #extra-actions="{ result }">
              <button v-if="result.summary?.successfullyCreated > 0" @click="viewTemplates" class="btn btn-secondary">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View All Templates
              </button>
            </template>
          </BulkImportResults>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { maintenanceApi } from '@/services/maintenanceApi'
import { useBulkImport } from '@/composables/useBulkImport'
import { useNotifications } from '@/composables/useNotifications'
import BulkImportTemplateDownload from '@/components/shared/bulk-import/BulkImportTemplateDownload.vue'
import BulkImportUploadZone from '@/components/shared/bulk-import/BulkImportUploadZone.vue'
import BulkImportPreview from '@/components/shared/bulk-import/BulkImportPreview.vue'
import BulkImportResults from '@/components/shared/bulk-import/BulkImportResults.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'import-complete'])

const { error: showError } = useNotifications()

// Composable with configuration
const {
  previewData,
  previewHeaders,
  totalRows,
  validationError,
  validationWarnings,
  config,
  parseAndPreview,
  generateCSV,
  downloadCSV,
  reset
} = useBulkImport({
  importType: 'MAINTENANCE_TEMPLATES'
})

// State
const uploadZone = ref(null)
const selectedFile = ref(null)
const processing = ref(false)
const importResult = ref(null)

// Methods
const handleFileSelected = async (file) => {
  selectedFile.value = file
  importResult.value = null

  try {
    await parseAndPreview(file)
  } catch (error) {
    console.error('Failed to parse CSV:', error)
    // validationError is already set by the composable
    showError('Invalid CSV', validationError.value || 'Failed to parse CSV file')
  }
}

const handleFileCleared = () => {
  selectedFile.value = null
  reset()
  importResult.value = null
}

const processImport = async () => {
  if (!selectedFile.value) {
    return
  }

  processing.value = true
  importResult.value = null

  try {
    const response = await maintenanceApi.bulkImportTemplates(selectedFile.value)

    if (response.success) {
      // Map API response: successful -> processed, failed -> skipped
      // Transform failed items to match expected format
      const mappedFailed = (response.data.failed || []).map(item => ({
        line: item.row,
        reason: item.error_message || 'Unknown error',
        data: {
          task_name: item.task_name,
          _equipment_type: item.equipment_type || ''
        }
      }))

      importResult.value = {
        success: true,
        message: response.message,
        summary: {
          totalRecords: response.data.summary.total,
          successfullyCreated: response.data.summary.successful,
          skipped: response.data.summary.failed
        },
        processed: response.data.successful || [],
        skipped: mappedFailed
      }

      console.log('✅ Import completed:', importResult.value.summary)

      // Emit event to parent
      emit('import-complete', {
        ...importResult.value.summary
      })
    } else {
      throw new Error(response.message || 'Import failed')
    }
  } catch (error) {
    console.error('Import failed:', error)
    importResult.value = {
      success: false,
      message: error.userMessage || error.message || 'Failed to import maintenance templates'
    }
    showError('Import Failed', error.userMessage || error.message)
  } finally {
    processing.value = false
  }
}

const resetImport = () => {
  if (uploadZone.value) {
    uploadZone.value.clearFile()
  }
  handleFileCleared()
}

const downloadSuccessReport = (items) => {
  const headers = [
    'Line',
    'Task Name',
    'Task Description',
    'Equipment Type ID',
    'Equipment Make ID',
    'Equipment Model ID',
    'Equipment Trim ID',
    'Equipment Year',
    'Part Type ID',
    'Consumable Type ID',
    'Time Type',
    'Time Interval'
  ]

  const rows = items.map(item => [
    item.line,
    item.task_name,
    item.task_description,
    item.equipment_type_id || '',
    item.equipment_make_id || '',
    item.equipment_model_id || '',
    item.equipment_trim_id || '',
    item.equipment_year || '',
    item.part_type_id || '',
    item.consumable_type_id || '',
    item.time_type,
    item.time_interval
  ])

  const csvContent = generateCSV(headers, rows)
  downloadCSV(csvContent, `maintenance-import-success-${Date.now()}.csv`)
}

const downloadErrorReport = (items) => {
  const headers = ['Line', 'Task Name', 'Equipment Type', 'Reason']

  const rows = items.map(item => [
    item.line,
    item.data?.task_name || '',
    item.data?._equipment_type || '',
    item.reason
  ])

  const csvContent = generateCSV(headers, rows)
  downloadCSV(csvContent, `import-errors-${Date.now()}.csv`)
}

const viewTemplates = () => {
  close()
  // Reload the main view
  emit('import-complete')
}

const close = () => {
  emit('close')
}
</script>
