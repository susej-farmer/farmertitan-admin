import api, { apiUtils } from './api'

export const farmsApi = {
  // Get all farms with pagination and filtering
  async getFarms(params = {}) {
    return apiUtils.getPaginated('/farms', params)
  },

  // Get single farm by ID
  async getFarm(id) {
    const response = await api.get(`/farms/${id}`)
    return response.data
  },

  // Create new farm
  async createFarm(data) {
    const response = await api.post('/farms', data)
    return response.data
  },

  // Update farm
  async updateFarm(id, data) {
    const response = await api.put(`/farms/${id}`, data)
    return response.data
  },

  // Delete farm
  async deleteFarm(id) {
    const response = await api.delete(`/farms/${id}`)
    return response.data
  },

  // Activate farm
  async activateFarm(id) {
    const response = await api.patch(`/farms/${id}/activate`)
    return response.data
  },

  // Deactivate farm
  async deactivateFarm(id) {
    const response = await api.patch(`/farms/${id}/deactivate`)
    return response.data
  },

  // Get farm statistics
  async getStatistics() {
    const response = await api.get('/farms/stats/overview')
    return response.data
  }
}

export default farmsApi