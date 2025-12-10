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
            template-path="/templates/maintenance_template.csv"
            file-name="maintenance_template.csv"
            message="Need a template?"
            button-text="Download Template"
          />

          <!-- Upload Zone -->
          <BulkImportUploadZone
            ref="uploadZone"
            @file-selected="handleFileSelected"
            @file-cleared="handleFileCleared"
          />

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
                    <th class="table-header-cell text-left">Equipment Type</th>
                    <th class="table-header-cell text-left">Make / Model</th>
                    <th class="table-header-cell text-left">Task Name</th>
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
                    <td class="table-cell">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {{ item.equipment_type || '-' }}
                      </span>
                    </td>
                    <td class="table-cell text-sm text-gray-600">
                      {{ item.equipment_make || '-' }}
                      <span v-if="item.equipment_model" class="text-gray-400">/ {{ item.equipment_model }}</span>
                    </td>
                    <td class="table-cell font-medium text-gray-900">{{ item.task_name }}</td>
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

// Composable
const {
  previewData,
  previewHeaders,
  totalRows,
  parseAndPreview,
  generateCSV,
  downloadCSV,
  reset
} = useBulkImport({
  maxRows: 500,
  requiredColumns: ['_equipment_type', 'task_name', 'task_description', 'time_type', 'time_interval']
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
      importResult.value = {
        success: true,
        message: response.data.message,
        summary: response.data.summary,
        processed: response.data.processed,
        skipped: response.data.skipped
      }

      console.log('✅ Import completed:', importResult.value.summary)

      // Emit event to parent
      emit('import-complete', {
        ...response.data.summary
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
    'Equipment Type',
    'Equipment Make',
    'Equipment Model',
    'Equipment Year',
    'Task Name',
    'Task Description',
    'Time Type',
    'Time Interval'
  ]

  const rows = items.map(item => [
    item.line,
    item.equipment_type || '',
    item.equipment_make || '',
    item.equipment_model || '',
    item.equipment_year || '',
    item.task_name,
    item.task_description,
    item.time_type,
    item.time_interval
  ])

  const csvContent = generateCSV(headers, rows)
  downloadCSV(csvContent, `import-success-${Date.now()}.csv`)
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
