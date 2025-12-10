<template>
  <div class="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
    <div class="flex items-center">
      <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-sm font-medium text-blue-900">{{ message }}</span>
    </div>
    <a
      :href="templatePath"
      :download="fileName"
      class="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white"
    >
      <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {{ buttonText }}
    </a>
  </div>
</template>

<script setup>
defineProps({
  templatePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: 'Need a template?'
  },
  buttonText: {
    type: String,
    default: 'Download Template'
  }
})
</script>
