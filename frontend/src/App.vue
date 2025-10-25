<template>
  <div id="app" class="h-screen bg-gray-50">
    <!-- Loading screen -->
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="loading-spinner w-12 h-12 mx-auto mb-4"></div>
        <p class="text-gray-600">Loading FarmerTitan Admin...</p>
      </div>
    </div>
    
    <!-- Guest layout (for login page) -->
    <div v-else-if="isGuestRoute" class="h-full">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
    
    <!-- Authenticated layout -->
    <div v-else class="flex h-full">
      <!-- Sidebar -->
      <aside :class="['sidebar', { 'sidebar-collapsed': isSidebarCollapsed }]">
        <AppSidebar :is-collapsed="isSidebarCollapsed" />
      </aside>
      
      <!-- Main content -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Header -->
        <header class="bg-white border-b border-gray-200 px-6 py-4">
          <AppHeader @toggle-sidebar="toggleSidebar" />
        </header>
        
        <!-- Content area -->
        <div class="flex-1 overflow-auto">
          <!-- Breadcrumbs -->
          <nav class="px-6 py-4 border-b border-gray-200 bg-white">
            <AppBreadcrumbs />
          </nav>
          
          <!-- Page content -->
          <div class="p-6">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </div>
        </div>
      </main>
    </div>
    
    <!-- Global notifications -->
    <AppNotifications />
    
    <!-- Global modals -->
    <AppModals />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppBreadcrumbs from '@/components/layout/AppBreadcrumbs.vue'
import AppNotifications from '@/components/layout/AppNotifications.vue'
import AppModals from '@/components/layout/AppModals.vue'

export default {
  name: 'App',
  components: {
    AppSidebar,
    AppHeader,
    AppBreadcrumbs,
    AppNotifications,
    AppModals
  },
  setup() {
    const isLoading = ref(true)
    const isSidebarCollapsed = ref(false)
    const route = useRoute()
    const authStore = useAuthStore()
    
    const isGuestRoute = computed(() => {
      return route.meta?.requiresGuest || route.name === 'Login'
    })
    
    const toggleSidebar = () => {
      isSidebarCollapsed.value = !isSidebarCollapsed.value
    }
    
    onMounted(async () => {
      try {
        // Initialize application
        await initializeApp()
      } catch (error) {
        console.error('Failed to initialize application:', error)
      } finally {
        isLoading.value = false
      }
    })
    
    async function initializeApp() {
      // Initialize auth store
      authStore.initializeAuth()
      
      // Simulate initialization time
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('FarmerTitan Admin initialized successfully')
    }
    
    return {
      isLoading,
      isGuestRoute,
      isSidebarCollapsed,
      toggleSidebar
    }
  }
}
</script>

<style scoped>
/* Component-specific styles */
</style>