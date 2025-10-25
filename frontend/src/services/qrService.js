import { qrApi } from './qrApi.js'

/**
 * QR Service - Higher level service wrapping QR API calls
 * Provides additional business logic and data transformation
 */
export const qrService = {
  // Production Batches
  async getProductionBatches(params = {}) {
    return await qrApi.getProductionBatches(params)
  },

  async createProductionBatch(data) {
    return await qrApi.createProductionBatch(data)
  },

  async getProductionBatch(id) {
    return await qrApi.getProductionBatch(id)
  },

  async updateBatchStatus(id, data) {
    return await qrApi.updateBatchStatus(id, data)
  },

  async getBatchQRCodes(batchId, params = {}) {
    return await qrApi.getBatchQRCodes(batchId, params)
  },

  async getSuppliers() {
    return await qrApi.getSuppliers()
  },

  // QR Codes
  async getQRCodes(params = {}) {
    return await qrApi.getQRCodes(params)
  },

  async createQRCode(data) {
    return await qrApi.createQRCode(data)
  },

  async scanQRCode(identifier) {
    return await qrApi.scanQRCode(identifier)
  },

  async bindQRToAsset(qrId, assetType, assetId, farmId = null) {
    return await qrApi.bindQRToAsset(qrId, assetType, assetId, farmId)
  },

  async allocateQRsToFarm(qrIds, farmId) {
    return await qrApi.allocateQRsToFarm(qrIds, farmId)
  },

  // Delivery Requests
  async getDeliveryRequests(params = {}) {
    return await qrApi.getDeliveryRequests(params)
  },

  async createDeliveryRequest(data) {
    return await qrApi.createDeliveryRequest(data)
  },

  async approveDeliveryRequest(id) {
    return await qrApi.approveDeliveryRequest(id)
  },

  async cancelDeliveryRequest(id, reason = '') {
    return await qrApi.cancelDeliveryRequest(id, reason)
  },

  // Statistics
  async getQRStatistics() {
    return await qrApi.getQRStatistics()
  },

  async getBatchStatistics() {
    return await qrApi.getBatchStatistics()
  },

  async getDeliveryStatistics() {
    return await qrApi.getDeliveryStatistics()
  },

  async getAnalytics(timeRange = '30d') {
    return await qrApi.getAnalytics(timeRange)
  }
}

export default qrService