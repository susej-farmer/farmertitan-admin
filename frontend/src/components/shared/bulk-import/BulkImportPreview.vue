<template>
  <div v-if="data.length > 0" class="card">
    <div class="card-body">
      <h3 class="text-lg font-medium text-gray-900 mb-4">
        Preview (first {{ data.length }} rows)
      </h3>

      <div class="overflow-x-auto">
        <table class="table min-w-full">
          <thead class="table-header">
            <tr>
              <th class="table-header-cell">Row</th>
              <th v-for="header in headers" :key="header" class="table-header-cell">
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody class="table-body">
            <tr v-for="(row, index) in data" :key="index" class="table-row">
              <td class="table-cell font-medium">{{ index + 1 }}</td>
              <td v-for="header in headers" :key="header" class="table-cell">
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
          @click="$emit('import')"
          :disabled="processing"
          class="btn btn-primary"
        >
          <svg v-if="!processing" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <div v-else class="loading-spinner w-5 h-5 mr-2"></div>
          {{ processing ? processingText : `${importButtonText} ${totalRows} ${entityName}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  headers: {
    type: Array,
    required: true
  },
  data: {
    type: Array,
    required: true
  },
  totalRows: {
    type: Number,
    required: true
  },
  processing: {
    type: Boolean,
    default: false
  },
  entityName: {
    type: String,
    default: 'Records'
  },
  importButtonText: {
    type: String,
    default: 'Import'
  },
  processingText: {
    type: String,
    default: 'Importing...'
  }
})

defineEmits(['import'])
</script>
