import { qrApi } from './qrApi.js'

/**
 * QR Service - Higher level service wrapping QR API calls
 * Provides additional business logic and data transformation with authentication
 */
export const qrService = {
  // Production Batches
  async getProductionBatches(params = {}, router = null) {
    return await qrApi.getProductionBatches(params, router)
  },

  async createProductionBatch(data, router = null) {
    return await qrApi.createProductionBatch(data, router)
  },

  async getProductionBatch(id, router = null) {
    return await qrApi.getProductionBatch(id, router)
  },

  async updateBatchStatus(id, data, router = null) {
    return await qrApi.updateBatchStatus(id, data, router)
  },

  async getBatchQRCodes(batchId, params = {}, router = null) {
    return await qrApi.getBatchQRCodes(batchId, params, router)
  },

  async getSuppliers(router = null) {
    return await qrApi.getSuppliers(router)
  },

  // QR Codes
  async getQRCodes(params = {}, router = null) {
    return await qrApi.getQRCodes(params, router)
  },

  async createQRCode(data, router = null) {
    return await qrApi.createQRCode(data, router)
  },

  async scanQRCode(identifier, router = null) {
    return await qrApi.scanQRCode(identifier, router)
  },

  async bindQRToAsset(qrId, assetType, assetId, farmId = null, router = null) {
    return await qrApi.bindQRToAsset(qrId, assetType, assetId, farmId, router)
  },

  async allocateQRsToFarm(qrIds, farmId, router = null) {
    return await qrApi.allocateQRsToFarm(qrIds, farmId, router)
  },

  // Delivery Requests
  async getDeliveryRequests(params = {}, router = null) {
    return await qrApi.getDeliveryRequests(params, router)
  },

  async createDeliveryRequest(data, router = null) {
    return await qrApi.createDeliveryRequest(data, router)
  },

  async approveDeliveryRequest(id, router = null) {
    return await qrApi.approveDeliveryRequest(id, router)
  },

  async cancelDeliveryRequest(id, reason = '', router = null) {
    return await qrApi.cancelDeliveryRequest(id, reason, router)
  },

  // Statistics
  async getQRStatistics(router = null) {
    return await qrApi.getQRStatistics(router)
  },

  async getBatchStatistics(router = null) {
    return await qrApi.getBatchStatistics(router)
  },

  async getDeliveryStatistics(router = null) {
    return await qrApi.getDeliveryStatistics(router)
  },

  async getAnalytics(timeRange = '30d', router = null) {
    return await qrApi.getAnalytics(timeRange, router)
  }
}

export default qrService