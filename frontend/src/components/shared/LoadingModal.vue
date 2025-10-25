<template>
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 transition-opacity">
        <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
      
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6">
          <div class="text-center">
            <div class="loading-spinner w-12 h-12 mx-auto mb-4"></div>
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">{{ title }}</h3>
            <p class="text-sm text-gray-500">{{ message }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingModal',
  props: {
    title: { type: String, default: 'Loading...' },
    message: { type: String, default: 'Please wait...' }
  }
}
</script>
