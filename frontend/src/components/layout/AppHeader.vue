<template>
  <div class="flex items-center justify-between">
    <!-- Left side -->
    <div class="flex items-center space-x-4">
      <!-- Sidebar toggle button -->
      <button 
        @click="$emit('toggle-sidebar')"
        class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <!-- Page title -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ pageTitle }}
        </h1>
        <p v-if="pageDescription" class="text-sm text-gray-600 mt-1">
          {{ pageDescription }}
        </p>
      </div>
    </div>
    
    <!-- Header actions -->
    <div class="flex items-center space-x-4">
      <!-- User menu -->
      <div v-if="authStore.isAuthenticated" class="relative" ref="userMenuContainerRef">
        <button 
          @click="showUserMenu = !showUserMenu"
          class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <!-- User initials avatar -->
          <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span class="text-xs font-semibold text-white">{{ userInitials }}</span>
          </div>
        </button>

        <!-- Dropdown menu -->
        <div 
          v-if="showUserMenu"
          class="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
        >
          <div class="px-4 py-2 border-b border-gray-100">
            <div class="text-sm font-medium text-gray-900">{{ userName }}</div>
            <div class="text-xs text-gray-500">{{ userRole }}</div>
            <div class="text-xs text-gray-400">{{ authStore.user?.email }}</div>
          </div>
          
          <button 
            @click="handleLogout"
            class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <!-- Guest user -->
      <div v-else class="flex items-center space-x-2">
        <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <span class="text-sm text-gray-700">Guest User</span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'AppHeader',
  emits: ['toggle-sidebar'],
  setup() {
    const route = useRoute()
    const router = useRouter()
    const authStore = useAuthStore()
    const showUserMenu = ref(false)
    const userMenuContainerRef = ref(null)
    
    const pageTitle = computed(() => {
      return route.meta.title || 'FarmerTitan Admin'
    })
    
    const pageDescription = computed(() => {
      return route.meta.description || null
    })

    const userName = computed(() => {
      if (!authStore.user) return 'User'
      
      // Try to extract name from email (before @)
      if (authStore.user.email) {
        const emailName = authStore.user.email.split('@')[0]
        // Convert susejreina.dev to Susej Reina
        return emailName
          .replace(/[._-]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }
      
      return 'User'
    })

    const userInitials = computed(() => {
      const name = userName.value
      const words = name.split(' ')
      
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      } else if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase()
      }
      
      return 'U'
    })

    const userRole = computed(() => {
      if (!authStore.user) return ''
      
      if (authStore.isSuperAdmin) {
        return 'Super Admin'
      }
      
      if (authStore.isAdmin) {
        return 'Administrator'
      }
      
      return 'User'
    })

    const handleLogout = async () => {
      try {
        showUserMenu.value = false
        await authStore.logout()
        router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
        // Force redirect to login even if logout fails
        router.push('/login')
      }
    }

    // Handle click outside to close dropdown
    const handleClickOutside = (event) => {
      if (userMenuContainerRef.value && !userMenuContainerRef.value.contains(event.target)) {
        showUserMenu.value = false
      }
    }

    onMounted(() => {
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside)
    })
    
    return {
      pageTitle,
      pageDescription,
      authStore,
      showUserMenu,
      userMenuContainerRef,
      userName,
      userInitials,
      userRole,
      handleLogout
    }
  }
}
</script>