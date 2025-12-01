/**
 * Authentication utility functions
 * Provides reusable token management and validation
 */

// Token storage keys
const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_DATA_KEY = 'user_data'

export const authUtils = {
  /**
   * Get the current auth token from localStorage
   * @returns {string|null} The auth token or null if not found
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },

  /**
   * Get the refresh token from localStorage
   * @returns {string|null} The refresh token or null if not found
   */
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  /**
   * Store authentication tokens
   * @param {string} token - The access token
   * @param {string} refreshToken - The refresh token
   */
  setTokens(token, refreshToken) {
    localStorage.setItem(TOKEN_KEY, token)
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    }
  },

  /**
   * Store user data
   * @param {Object} userData - User information
   */
  setUserData(userData) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData))
  },

  /**
   * Get stored user data
   * @returns {Object|null} User data or null if not found
   */
  getUserData() {
    const userData = localStorage.getItem(USER_DATA_KEY)
    return userData ? JSON.parse(userData) : null
  },

  /**
   * Check if user is authenticated (has valid token)
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    const token = this.getToken()
    return token && this.isTokenValid(token)
  },

  /**
   * Validate token format and expiration
   * @param {string} token - The token to validate
   * @returns {boolean} True if token appears valid
   */
  isTokenValid(token) {
    if (!token) return false

    try {
      // Basic JWT validation - check if it has 3 parts
      const parts = token.split('.')
      if (parts.length !== 3) return false

      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      
      // Check if token is expired (with 30 second buffer)
      return payload.exp && payload.exp > (currentTime + 30)
    } catch (error) {
      console.warn('[Auth] Invalid token format:', error.message)
      return false
    }
  },

  /**
   * Clear all authentication data from localStorage
   */
  clearAuth() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_DATA_KEY)
  },

  /**
   * Handle authentication failure - clear data and redirect
   * @param {Object} router - Vue router instance
   */
  handleAuthFailure(router) {
    console.warn('[Auth] Authentication failure detected - clearing auth data')
    this.clearAuth()
    
    // Redirect to login if router is available
    if (router) {
      router.push('/login')
    } else {
      window.location.href = '/login'
    }
  },

  /**
   * Validate authentication before making API calls
   * @param {Object} router - Vue router instance (optional)
   * @returns {boolean} True if authenticated, false otherwise
   */
  requireAuth(router) {
    if (!this.isAuthenticated()) {
      console.warn('[Auth] Authentication required but not authenticated')
      this.handleAuthFailure(router)
      return false
    }
    return true
  },

  /**
   * Get authorization header value
   * @returns {string|null} Bearer token or null
   */
  getAuthHeader() {
    const token = this.getToken()
    return token ? `Bearer ${token}` : null
  },

  /**
   * Check if error is authentication related
   * @param {Object} error - API error object
   * @returns {boolean} True if auth error
   */
  isAuthError(error) {
    if (error.response?.status === 401) return true
    
    const errorCode = error.response?.data?.error?.code
    return ['UNAUTHORIZED', 'INVALID_TOKEN', 'AUTH_FAILED'].includes(errorCode)
  },

  /**
   * Get user-friendly error message for auth errors
   * @param {Object} error - API error object
   * @returns {string} User-friendly error message
   */
  getAuthErrorMessage(error) {
    const errorCode = error.response?.data?.error?.code
    const errorMessage = error.response?.data?.error?.message

    switch (errorCode) {
      case 'UNAUTHORIZED':
        return 'Please log in to continue'
      case 'INVALID_TOKEN':
        return 'Your session has expired. Please log in again'
      case 'AUTH_FAILED':
        return 'Authentication failed. Please try logging in again'
      default:
        return errorMessage || 'Authentication error occurred'
    }
  }
}

export default authUtils