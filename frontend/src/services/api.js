import axios from 'axios'
import { authUtils } from '@/utils/auth'

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add request timestamp for performance monitoring
    config.metadata = { startTime: new Date() }
    
    // Add auth token using utility function
    const authHeader = authUtils.getAuthHeader()
    if (authHeader) {
      config.headers.Authorization = authHeader
    }
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
        hasAuth: !!authHeader
      })
    }
    
    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime
    
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        duration: `${duration}ms`,
        data: response.data
      })
    }
    
    return response
  },
  (error) => {
    const duration = error.config?.metadata ? new Date() - error.config.metadata.startTime : 0
    
    // Log error
    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      status: error.response?.status,
      duration: `${duration}ms`,
      message: error.message,
      data: error.response?.data,
      errorCode: error.response?.data?.error?.code
    })
    
    // Handle authentication errors using utility
    if (authUtils.isAuthError(error)) {
      console.warn('[API] Authentication error detected:', authUtils.getAuthErrorMessage(error))
      authUtils.handleAuthFailure() // This will clear tokens and redirect
      // Enhance error with user-friendly message
      error.userMessage = authUtils.getAuthErrorMessage(error)
    } else if (error.response) {
      // Handle other error types
      const { status, data } = error.response
      
      switch (status) {
        case 403:
          // Forbidden - show access denied message
          error.userMessage = 'You do not have permission to perform this action.'
          break
          
        case 404:
          // Not found - show appropriate message
          error.userMessage = 'The requested resource was not found.'
          break
          
        case 422:
          // Validation error - return validation details
          if (data.error?.details) {
            error.validationErrors = data.error.details
          }
          error.userMessage = data.error?.message || 'Validation failed. Please check your input.'
          break
          
        case 500:
          // Server error - show generic error message
          error.userMessage = 'Server error. Please try again later.'
          break
          
        default:
          // Other errors
          error.userMessage = data.error?.message || getDefaultErrorMessage(status)
          break
      }
    } else if (error.request) {
      // Network error
      error.userMessage = 'Network error. Please check your connection and try again.'
    } else {
      // Request setup error
      error.userMessage = 'An unexpected error occurred. Please try again.'
    }
    
    return Promise.reject(error)
  }
)

// Helper function to get default error messages
function getDefaultErrorMessage(status) {
  const messages = {
    400: 'Invalid request. Please check your input and try again.',
    401: 'Authentication required. Please log in.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'Conflict: The resource already exists or is in use.',
    422: 'Validation failed. Please check your input.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable.',
    503: 'Service temporarily unavailable.',
    504: 'Request timeout. Please try again.'
  }
  
  return messages[status] || 'An error occurred. Please try again.'
}

// API utility functions
export const apiUtils = {
  /**
   * Make authenticated request - validates token before making call
   * @param {Function} requestFn - The API request function to execute
   * @param {Object} router - Vue router instance (optional)
   * @returns {Promise} API response or rejection
   */
  async authenticatedRequest(requestFn, router = null) {
    // Validate authentication before making the request
    if (!authUtils.requireAuth(router)) {
      throw new Error('Authentication required')
    }
    
    try {
      return await requestFn()
    } catch (error) {
      // Handle auth errors specifically
      if (authUtils.isAuthError(error) && router) {
        authUtils.handleAuthFailure(router)
      }
      throw error
    }
  },

  /**
   * Wrapper for QR-related API calls that require authentication
   * @param {Function} requestFn - The API request function
   * @param {Object} router - Vue router instance (optional)
   * @returns {Promise} API response
   */
  async qrRequest(requestFn, router = null) {
    return this.authenticatedRequest(requestFn, router)
  },
  // Build query string from params object
  buildQueryString(params) {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, value)
      }
    })
    
    return searchParams.toString()
  },
  
  // Handle paginated requests
  async getPaginated(endpoint, params = {}) {
    const queryString = this.buildQueryString(params)
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    
    const response = await api.get(url)
    return response.data
  },
  
  // Handle file uploads
  async uploadFile(endpoint, file, onProgress = null) {
    const formData = new FormData()
    formData.append('file', file)
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
    
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percentage)
      }
    }
    
    const response = await api.post(endpoint, formData, config)
    return response.data
  },
  
  // Batch requests
  async batch(requests) {
    try {
      const responses = await Promise.allSettled(requests.map(req => api(req)))
      
      return responses.map((response, index) => ({
        request: requests[index],
        success: response.status === 'fulfilled',
        data: response.status === 'fulfilled' ? response.value.data : null,
        error: response.status === 'rejected' ? response.reason : null
      }))
    } catch (error) {
      console.error('[API Batch Error]', error)
      throw error
    }
  }
}

export default api