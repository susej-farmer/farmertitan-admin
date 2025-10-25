<template>
  <nav class="flex" aria-label="Breadcrumb">
    <ol class="flex items-center space-x-4">
      <li>
        <div>
          <router-link to="/" class="text-gray-400 hover:text-gray-500">
            <svg class="flex-shrink-0 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span class="sr-only">Home</span>
          </router-link>
        </div>
      </li>
      
      <li v-for="(breadcrumb, index) in breadcrumbs" :key="index">
        <div class="flex items-center">
          <svg class="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
          <span 
            class="ml-4 text-sm font-medium"
            :class="index === breadcrumbs.length - 1 ? 'text-gray-700' : 'text-gray-500 hover:text-gray-700'"
          >
            {{ breadcrumb }}
          </span>
        </div>
      </li>
    </ol>
  </nav>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export default {
  name: 'AppBreadcrumbs',
  setup() {
    const route = useRoute()
    
    const breadcrumbs = computed(() => {
      return route.meta.breadcrumbs || []
    })
    
    return {
      breadcrumbs
    }
  }
}
</script>