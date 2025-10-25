import api, { apiUtils } from './api.js'

/**
 * QR Codes API Service
 * Handles all QR code related API calls
 */
export const qrApi = {
  // QR Code Management
  async getQRCodes(params = {}) {
    return apiUtils.getPaginated('/qr-codes', params)
  },

  async createQRCode(data) {
    const response = await api.post('/qr-codes', data)
    return response.data
  },

  async getQRCode(id) {
    const response = await api.get(`/qr-codes/${id}`)
    return response.data
  },

  async updateQRCode(id, data) {
    const response = await api.put(`/qr-codes/${id}`, data)
    return response.data
  },

  async deleteQRCode(id) {
    const response = await api.delete(`/qr-codes/${id}`)
    return response.data
  },

  async scanQRCode(identifier) {
    const response = await api.post('/qr-codes/scan', { identifier })
    return response.data
  },

  async bindQRToAsset(qrId, assetType, assetId, farmId = null) {
    const response = await api.post(`/qr-codes/${qrId}/bind`, {
      asset_type: assetType,
      asset_id: assetId,
      farm_id: farmId
    })
    return response.data
  },

  async unbindQRFromAsset(qrId) {
    const response = await api.post(`/qr-codes/${qrId}/unbind`)
    return response.data
  },

  async allocateQRsToFarm(qrIds, farmId) {
    const response = await api.post('/qr-codes/allocate', {
      qr_ids: qrIds,
      farm_id: farmId
    })
    return response.data
  },

  async bulkUpdateQRs(qrIds, status) {
    const response = await api.post('/qr-codes/bulk-update', {
      qr_ids: qrIds,
      status
    })
    return response.data
  },

  async getQRStatistics() {
    const response = await api.get('/qr-codes/stats/overview')
    return response.data
  },

  // Production Batch Management
  async getProductionBatches(params = {}) {
    return apiUtils.getPaginated('/qr-codes/batches', params)
  },

  async createProductionBatch(data) {
    const response = await api.post('/qr-codes/batches', data)
    return response.data
  },

  async getProductionBatch(id) {
    const response = await api.get(`/qr-codes/batches/${id}`)
    return response.data
  },

  async updateProductionBatch(id, data) {
    const response = await api.put(`/qr-codes/batches/${id}`, data)
    return response.data
  },

  async updateBatchStatus(id, data) {
    const response = await api.put(`/qr-codes/batches/${id}/status`, data)
    return response.data
  },

  async getBatchQRCodes(batchId, params = {}) {
    return apiUtils.getPaginated(`/qr-codes/batches/${batchId}/qr-codes`, params)
  },

  async getBatchStatistics() {
    const response = await api.get('/qr-codes/batches/stats/overview')
    return response.data
  },

  async getSuppliers() {
    const response = await api.get('/qr-codes/suppliers')
    return response.data
  },

  // Delivery Request Management
  async getDeliveryRequests(params = {}) {
    return apiUtils.getPaginated('/qr-codes/delivery-requests', params)
  },

  async createDeliveryRequest(data) {
    const response = await api.post('/qr-codes/delivery-requests', data)
    return response.data
  },

  async getDeliveryRequest(id) {
    const response = await api.get(`/qr-codes/delivery-requests/${id}`)
    return response.data
  },

  async updateDeliveryRequest(id, data) {
    const response = await api.put(`/qr-codes/delivery-requests/${id}`, data)
    return response.data
  },

  async approveDeliveryRequest(id) {
    const response = await api.post(`/qr-codes/delivery-requests/${id}/approve`)
    return response.data
  },

  async cancelDeliveryRequest(id, reason = '') {
    const response = await api.post(`/qr-codes/delivery-requests/${id}/cancel`, { reason })
    return response.data
  },

  async markRequestDelivered(id, trackingNumber = '') {
    const response = await api.post(`/qr-codes/delivery-requests/${id}/deliver`, {
      tracking_number: trackingNumber
    })
    return response.data
  },

  async getDeliveryStatistics() {
    const response = await api.get('/qr-codes/delivery-requests/stats/overview')
    return response.data
  },

  // Analytics
  async getAnalytics(timeRange = '30d') {
    const response = await api.get('/qr-codes/analytics', {
      params: { time_range: timeRange }
    })
    return response.data
  },

  async getAssetDistribution() {
    const response = await api.get('/qr-codes/analytics/distribution')
    return response.data
  },

  // Farm-specific endpoints
  async getFarmQRCodes(farmId, params = {}) {
    return apiUtils.getPaginated(`/qr-codes/farms/${farmId}/qr-codes`, params)
  },

  async getFarmDeliveryRequests(farmId, params = {}) {
    return apiUtils.getPaginated(`/qr-codes/farms/${farmId}/delivery-requests`, params)
  }
}

export default qrApi