import api, { apiUtils } from './api.js'

/**
 * QR Codes API Service
 * Handles all QR code related API calls with authentication
 */
export const qrApi = {
  // QR Code Management
  async getQRCodes(params = {}, router = null) {
    return apiUtils.qrRequest(() => apiUtils.getPaginated('/qr-codes', params), router)
  },

  async createQRCode(data, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post('/qr-codes', data)
      return response.data
    }, router)
  },

  async getQRCode(id, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.get(`/qr-codes/${id}`)
      return response.data
    }, router)
  },

  async updateQRCode(id, data, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.put(`/qr-codes/${id}`, data)
      return response.data
    }, router)
  },

  async deleteQRCode(id, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.delete(`/qr-codes/${id}`)
      return response.data
    }, router)
  },

  async scanQRCode(identifier, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post('/qr-codes/scan', { identifier })
      return response.data
    }, router)
  },

  async bindQRToAsset(qrId, assetType, assetId, farmId = null, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post(`/qr-codes/${qrId}/bind`, {
        asset_type: assetType,
        asset_id: assetId,
        farm_id: farmId
      })
      return response.data
    }, router)
  },

  async unbindQRFromAsset(qrId, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post(`/qr-codes/${qrId}/unbind`)
      return response.data
    }, router)
  },

  async allocateQRsToFarm(qrIds, farmId, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post('/qr-codes/allocate', {
        qr_ids: qrIds,
        farm_id: farmId
      })
      return response.data
    }, router)
  },

  async bulkUpdateQRs(qrIds, status, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post('/qr-codes/bulk-update', {
        qr_ids: qrIds,
        status
      })
      return response.data
    }, router)
  },

  async getQRStatistics(router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.get('/qr-codes/stats/overview')
      return response.data
    }, router)
  },

  // Production Batch Management
  async getProductionBatches(params = {}, router = null) {
    return apiUtils.qrRequest(() => apiUtils.getPaginated('/qr-codes/batches', params), router)
  },

  async createProductionBatch(data, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post('/qr-codes/batches', data)
      return response.data
    }, router)
  },

  async getProductionBatch(id, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.get(`/qr-codes/batches/${id}`)
      return response.data
    }, router)
  },

  async updateProductionBatch(id, data, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.put(`/qr-codes/batches/${id}`, data)
      return response.data
    }, router)
  },

  async updateBatchStatus(id, data, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.put(`/qr-codes/batches/${id}/status`, data)
      return response.data
    }, router)
  },

  async getBatchQRCodes(batchId, params = {}, router = null) {
    return apiUtils.qrRequest(() => apiUtils.getPaginated(`/qr-codes/batches/${batchId}/qr-codes`, params), router)
  },

  async getBatchStatistics(router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.get('/qr-codes/batches/stats/overview')
      return response.data
    }, router)
  },

  async getSuppliers(router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.get('/qr-codes/suppliers')
      return response.data
    }, router)
  },

  // Delivery Request Management
  async getDeliveryRequests(params = {}, router = null) {
    return apiUtils.qrRequest(() => apiUtils.getPaginated('/qr-codes/delivery-requests', params), router)
  },

  async createDeliveryRequest(data, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post('/qr-codes/delivery-requests', data)
      return response.data
    }, router)
  },

  async getDeliveryRequest(id, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.get(`/qr-codes/delivery-requests/${id}`)
      return response.data
    }, router)
  },

  async updateDeliveryRequest(id, data, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.put(`/qr-codes/delivery-requests/${id}`, data)
      return response.data
    }, router)
  },

  async approveDeliveryRequest(id, router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post(`/qr-codes/delivery-requests/${id}/approve`)
      return response.data
    }, router)
  },

  async cancelDeliveryRequest(id, reason = '', router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post(`/qr-codes/delivery-requests/${id}/cancel`, { reason })
      return response.data
    }, router)
  },

  async markRequestDelivered(id, trackingNumber = '', router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.post(`/qr-codes/delivery-requests/${id}/deliver`, {
        tracking_number: trackingNumber
      })
      return response.data
    }, router)
  },

  async getDeliveryStatistics(router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.get('/qr-codes/delivery-requests/stats/overview')
      return response.data
    }, router)
  },

  // Analytics
  async getAnalytics(timeRange = '30d', router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.get('/qr-codes/analytics', {
        params: { time_range: timeRange }
      })
      return response.data
    }, router)
  },

  async getAssetDistribution(router = null) {
    return apiUtils.qrRequest(async () => {
      const response = await api.get('/qr-codes/analytics/distribution')
      return response.data
    }, router)
  },

  // Farm-specific endpoints
  async getFarmQRCodes(farmId, params = {}, router = null) {
    return apiUtils.qrRequest(() => apiUtils.getPaginated(`/qr-codes/farms/${farmId}/qr-codes`, params), router)
  },

  async getFarmDeliveryRequests(farmId, params = {}, router = null) {
    return apiUtils.qrRequest(() => apiUtils.getPaginated(`/qr-codes/farms/${farmId}/delivery-requests`, params), router)
  }
}

export default qrApi