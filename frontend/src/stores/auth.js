import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/authApi'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(localStorage.getItem('auth_token') || null)
  const refreshToken = ref(localStorage.getItem('refresh_token') || null)
  const isLoading = ref(false)
  const error = ref(null)

  // Getters
  const isAuthenticated = computed(() => !!user.value && !!token.value)
  
  const isSuperAdmin = computed(() => {
    return user.value?.global_role === 'super_admin'
  })
  
  const isAdmin = computed(() => {
    if (isSuperAdmin.value) return true
    return user.value?.farm_roles?.some(role => 
      ['admin', 'manager'].includes(role.role)
    )
  })
  
  const userPermissions = computed(() => {
    if (!user.value) return []
    
    const permissions = []
    
    if (isSuperAdmin.value) {
      permissions.push('super_admin', 'all_farms', 'system_admin')
    }
    
    user.value.farm_roles?.forEach(farmRole => {
      permissions.push(`farm_${farmRole.farm.id}_${farmRole.role}`)
      permissions.push(`farm_${farmRole.farm.id}`)
      
      if (['admin', 'manager'].includes(farmRole.role)) {
        permissions.push(`farm_${farmRole.farm.id}_admin`)
      }
    })
    
    return permissions
  })

  // Actions
  const login = async (credentials) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await authApi.login(credentials)
      
      if (response.success) {
        user.value = response.data.user
        token.value = response.data.token
        refreshToken.value = response.data.refresh_token
        
        // Store in localStorage
        localStorage.setItem('auth_token', token.value)
        localStorage.setItem('refresh_token', refreshToken.value)
        localStorage.setItem('user_data', JSON.stringify(user.value))
        
        // Set default Authorization header for future requests
        setAuthHeader(token.value)
        
        return response
      }
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true
    
    try {
      // Call API logout (optional, may fail if token expired)
      if (token.value) {
        await authApi.logout()
      }
    } catch (err) {
      console.error('Logout API error:', err)
      // Continue with local logout even if API fails
    } finally {
      // Clear local state
      user.value = null
      token.value = null
      refreshToken.value = null
      error.value = null
      
      // Clear localStorage
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')  
      localStorage.removeItem('user_data')
      
      // Remove Authorization header
      clearAuthHeader()
      
      isLoading.value = false
    }
  }

  const getCurrentUser = async () => {
    if (!token.value) return null
    
    isLoading.value = true
    error.value = null
    
    try {
      const response = await authApi.getCurrentUser()
      
      if (response.success) {
        user.value = response.data.user
        localStorage.setItem('user_data', JSON.stringify(user.value))
        return user.value
      }
    } catch (err) {
      console.error('Get current user error:', err)
      
      // If unauthorized, clear auth data
      if (err.response?.status === 401) {
        await logout()
      }
      
      error.value = err.response?.data?.error || err.message || 'Failed to get user data'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const refreshAccessToken = async () => {
    if (!refreshToken.value) {
      await logout()
      throw new Error('No refresh token available')
    }
    
    try {
      const response = await authApi.refreshToken(refreshToken.value)
      
      if (response.success) {
        user.value = response.data.user
        token.value = response.data.token
        refreshToken.value = response.data.refresh_token
        
        // Update localStorage
        localStorage.setItem('auth_token', token.value)
        localStorage.setItem('refresh_token', refreshToken.value)
        localStorage.setItem('user_data', JSON.stringify(user.value))
        
        // Update auth header
        setAuthHeader(token.value)
        
        return response
      }
    } catch (err) {
      console.error('Token refresh error:', err)
      await logout()
      throw err
    }
  }

  const updateProfile = async (profileData) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await authApi.updateProfile(profileData)
      
      if (response.success) {
        user.value = { ...user.value, ...response.data.user }
        localStorage.setItem('user_data', JSON.stringify(user.value))
        return response
      }
    } catch (err) {
      error.value = err.response?.data?.error || err.message || 'Failed to update profile'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const hasPermission = (permission) => {
    return userPermissions.value.includes(permission)
  }

  const hasFarmAccess = (farmId) => {
    if (isSuperAdmin.value) return true
    return userPermissions.value.includes(`farm_${farmId}`)
  }

  const hasFarmRole = (farmId, role) => {
    if (isSuperAdmin.value) return true
    return userPermissions.value.includes(`farm_${farmId}_${role}`)
  }

  // Initialize auth state from localStorage
  const initializeAuth = () => {
    const storedUser = localStorage.getItem('user_data')
    const storedToken = localStorage.getItem('auth_token')
    const storedRefreshToken = localStorage.getItem('refresh_token')
    
    if (storedUser && storedToken) {
      user.value = JSON.parse(storedUser)
      token.value = storedToken
      refreshToken.value = storedRefreshToken
      setAuthHeader(storedToken)
    }
  }

  // Helper functions
  const setAuthHeader = (authToken) => {
    // This will be handled by the API interceptor
    // but we store it for direct access if needed
  }

  const clearAuthHeader = () => {
    // This will be handled by the API interceptor
  }

  // Initialize on store creation
  initializeAuth()

  return {
    // State
    user,
    token,
    refreshToken,
    isLoading,
    error,
    
    // Getters
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    userPermissions,
    
    // Actions
    login,
    logout,
    getCurrentUser,
    refreshAccessToken,
    updateProfile,
    hasPermission,
    hasFarmAccess,
    hasFarmRole,
    initializeAuth
  }
})