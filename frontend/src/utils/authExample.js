/**
 * Authentication Implementation Examples
 * How to use the new authentication utilities in your components
 */

// 1. In Vue Components with QR Services
import { useRouter } from 'vue-router'
import { qrService } from '@/services/qrService'

export default {
  setup() {
    const router = useRouter()
    
    // Example: Loading QR data with authentication
    const loadQRData = async () => {
      try {
        // The router parameter enables automatic redirect on auth failure
        const response = await qrService.getQRCodes({}, router)
        console.log('QR data loaded:', response)
      } catch (error) {
        // Auth errors are handled automatically by the interceptor
        // but you can still catch them for custom handling
        console.error('Failed to load QR data:', error.userMessage)
      }
    }
    
    return { loadQRData }
  }
}

// 2. Manual Authentication Checking
import { authUtils } from '@/utils/auth'

// Check if user is authenticated before making sensitive operations
const handleSensitiveOperation = (router) => {
  if (!authUtils.requireAuth(router)) {
    // User will be redirected to login automatically
    return
  }
  
  // Proceed with operation
  console.log('User is authenticated')
}

// 3. Error Handling in try/catch blocks
const handleAPICall = async (router) => {
  try {
    const response = await qrService.createQRCode(data, router)
    console.log('QR code created:', response)
  } catch (error) {
    if (authUtils.isAuthError(error)) {
      // Show user-friendly auth error message
      alert(authUtils.getAuthErrorMessage(error))
      // User is already redirected by the interceptor
    } else {
      // Handle other types of errors
      console.error('Operation failed:', error.userMessage)
    }
  }
}

// 4. Login Success Handler (store auth tokens)
const handleLoginSuccess = (loginResponse) => {
  const { access_token, refresh_token, user } = loginResponse
  
  // Store tokens and user data
  authUtils.setTokens(access_token, refresh_token)
  authUtils.setUserData(user)
  
  console.log('User logged in successfully')
}

// 5. Manual Logout
const handleLogout = (router) => {
  authUtils.clearAuth()
  router.push('/login')
}

// 6. Check Authentication Status
const checkAuthStatus = () => {
  if (authUtils.isAuthenticated()) {
    console.log('User is authenticated')
    const userData = authUtils.getUserData()
    console.log('Current user:', userData)
  } else {
    console.log('User is not authenticated')
  }
}