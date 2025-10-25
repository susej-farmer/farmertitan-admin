import api from './api'

export const authApi = {
  // Login with email and password
  async login(credentials) {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },

  // Logout current user
  async logout() {
    const response = await api.post('/auth/logout')
    return response.data
  },

  // Get current user profile
  async getCurrentUser() {
    const response = await api.get('/auth/me')
    return response.data
  },

  // Refresh authentication token
  async refreshToken(refreshToken) {
    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken
    })
    return response.data
  },

  // Update user profile
  async updateProfile(profileData) {
    const response = await api.put('/auth/profile', profileData)
    return response.data
  },

  // Change password
  async changePassword(passwords) {
    const response = await api.post('/auth/change-password', passwords)
    return response.data
  }
}

export default authApi