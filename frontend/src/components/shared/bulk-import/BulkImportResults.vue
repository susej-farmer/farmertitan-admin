<template>
  <div v-if="result" ref="resultCard" class="card">
    <div class="card-body space-y-6">
      <!-- Summary Header -->
      <div v-if="result.success"
           :class="[
             'border rounded-lg p-6',
             result.summary.skipped > 0
               ? 'bg-yellow-50 border-yellow-200'
               : 'bg-green-50 border-green-200'
           ]">
        <div class="flex items-start">
          <div :class="[
              'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
              result.summary.skipped > 0 ? 'bg-yellow-100' : 'bg-green-100'
            ]">
            <svg
              :class="[
                'w-6 h-6',
                result.summary.skipped > 0 ? 'text-yellow-600' : 'text-green-600'
              ]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path v-if="result.summary.skipped === 0" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div class="ml-4 flex-1">
            <h3 :class="[
              'text-xl font-bold',
              result.summary.skipped > 0 ? 'text-yellow-900' : 'text-green-900'
            ]">
              {{ result.summary.skipped === 0 ? 'Import Completed Successfully!' : 'Import Completed with Some Errors' }}
            </h3>
            <p class="mt-1 text-sm" :class="result.summary.skipped > 0 ? 'text-yellow-700' : 'text-green-700'">
              {{ result.message }}
            </p>

            <!-- Statistics Grid -->
            <div class="mt-4 grid grid-cols-3 gap-6">
              <div>
                <p class="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Records</p>
                <p class="mt-1 text-3xl font-bold text-gray-900">{{ result.summary.totalRecords }}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-600 uppercase tracking-wide">Successfully Created</p>
                <p class="mt-1 text-3xl font-bold text-green-600">{{ result.summary.successfullyCreated }}</p>
              </div>
              <div v-if="result.summary.skipped > 0">
                <p class="text-xs font-medium text-gray-600 uppercase tracking-wide">Failed</p>
                <p class="mt-1 text-3xl font-bold text-red-600">{{ result.summary.skipped }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Complete Failure -->
      <div v-else-if="!result.success" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <div class="flex items-start">
          <div class="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div class="ml-4 flex-1">
            <h3 class="text-xl font-bold text-red-900">Import Failed</h3>
            <p class="mt-1 text-sm text-red-700">{{ result.message }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs for Details -->
      <div v-if="result.success && (result.processed?.length > 0 || result.skipped?.length > 0)" class="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <!-- Tab Headers -->
        <div class="border-b border-gray-200 bg-gray-50">
          <nav class="-mb-px flex">
            <button
              @click="activeTab = 'success'"
              :class="[
                'py-3 px-6 border-b-2 font-medium text-sm flex items-center',
                activeTab === 'success'
                  ? 'border-green-500 text-green-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
              ]"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Successfully Created
              <span class="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                {{ result.summary.successfullyCreated }}
              </span>
            </button>
            <button
              v-if="result.summary.skipped > 0"
              @click="activeTab = 'failed'"
              :class="[
                'py-3 px-6 border-b-2 font-medium text-sm flex items-center',
                activeTab === 'failed'
                  ? 'border-red-500 text-red-700 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
              ]"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Failed
              <span class="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                {{ result.summary.skipped }}
              </span>
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-0">
          <!-- Successfully Created Tab -->
          <div v-if="activeTab === 'success' && result.processed?.length > 0">
            <div class="overflow-x-auto">
              <slot name="success-table" :items="result.processed">
                <p class="p-6 text-gray-500">No success table template provided</p>
              </slot>
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
          <div v-if="activeTab === 'failed' && result.skipped?.length > 0">
            <div class="overflow-x-auto">
              <slot name="failed-table" :items="result.skipped">
                <table class="table min-w-full">
                  <thead class="table-header bg-gray-50 sticky top-0">
                    <tr>
                      <th class="table-header-cell text-left">Line</th>
                      <th class="table-header-cell text-left">Error Reason</th>
                    </tr>
                  </thead>
                  <tbody class="table-body">
                    <tr v-for="(item, index) in result.skipped" :key="index" class="table-row hover:bg-red-50">
                      <td class="table-cell">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          {{ item.line }}
                        </span>
                      </td>
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
              </slot>
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
        <button @click="$emit('reset')" class="btn btn-primary">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Import Another File
        </button>
        <slot name="extra-actions" :result="result"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  result: {
    type: Object,
    default: null
  },
  successHeaders: {
    type: Array,
    default: () => []
  },
  errorHeaders: {
    type: Array,
    default: () => ['Line', 'Reason']
  }
})

const emit = defineEmits(['reset', 'download-success', 'download-errors'])

const resultCard = ref(null)
const activeTab = ref('success')

// Scroll to results when they appear
watch(() => props.result, async (newResult) => {
  if (newResult) {
    activeTab.value = 'success'
    await nextTick()
    if (resultCard.value) {
      resultCard.value.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }
})

const downloadSuccessReport = () => {
  emit('download-success', props.result.processed)
}

const downloadErrorReport = () => {
  emit('download-errors', props.result.skipped)
}
</script>
