import api from './api'

export const reportsApi = {
  // Get system statistics (equipment, farms, QR codes)
  async getSystemStats() {
    const response = await api.get('/reports/system-stats')
    return response.data
  }
}

export default reportsApi
