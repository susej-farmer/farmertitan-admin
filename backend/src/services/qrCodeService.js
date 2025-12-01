const QRCodeClient = require('../clients/qrCodeClient');
const ProductionBatchClient = require('../clients/productionBatchClient');
const DeliveryRequestClient = require('../clients/deliveryRequestClient');
const FarmClient = require('../clients/farmClient');
const logger = require('../database/logger');
const { AppError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

class QRCodeService {
  /**
   * Generate a single QR code with optional farm allocation and asset binding
   */
  static async generateSingleQR(qrData, createdBy = null) {
    const {
      farm_id = null,
      asset_type = null,
      asset_id = null,
      metadata = {}
    } = qrData;

    try {
      // Validate farm if provided
      if (farm_id) {
        const farm = await FarmClient.findById(farm_id);
        if (!farm.active) {
          throw new AppError('Cannot allocate QR codes to inactive farm', 400, 'FARM_INACTIVE');
        }
      }

      // Validate asset binding if provided
      if (asset_type && asset_id) {
        await this.validateAssetBinding(asset_type, asset_id, farm_id);
      }

      // Determine initial status
      let status = 'available';
      if (asset_type && asset_id) {
        status = 'bound';
      } else if (farm_id) {
        status = 'allocated';
      }

      const qrCode = await QRCodeClient.create({
        farm_id,
        asset_type,
        asset_id,
        status,
        metadata: {
          ...metadata,
          generation_type: 'individual',
          created_by: createdBy
        }
      });

      logger.info('Single QR code generated successfully', {
        qr_id: qrCode.id,
        short_code: qrCode.short_code,
        farm_id,
        asset_type,
        created_by: createdBy
      });

      return qrCode;
    } catch (error) {
      logger.error('Failed to generate single QR code', error, { qrData, createdBy });
      throw error;
    }
  }

  /**
   * Create a production batch and generate QR codes in bulk
   */
  static async createProductionBatch(batchData, createdBy = null) {
    const {
      quantity,
      supplier_id,
      notes = ''
    } = batchData;

    try {
      const result = await ProductionBatchClient.create({
        quantity,
        supplier_id,
        user_id: createdBy,
        notes
      });

      console.log('Production batch created successfully', {
        batch_id: result.id,
        batch_code: result.batch_code,
        quantity,
        supplier_id,
        created_by: createdBy
      });

      return result;
    } catch (error) {
      console.error('Failed to create production batch', error);
      throw error;
    }
  }

  /**
   * Get production batches with filtering and pagination
   */
  static async getProductionBatches(options = {}) {
    try {
      const result = await ProductionBatchClient.getAll(options);
      
      console.log('Retrieved production batches', {
        page: options.page || 1,
        limit: options.limit || 10,
        total: result.pagination?.total || 0,
        filters: {
          search: options.search || '',
          status: options.status || '',
          sort: options.sort || 'created_at'
        }
      });

      return result;
    } catch (error) {
      console.error('Failed to get production batches', error);
      throw error;
    }
  }

  /**
   * Bind QR code to a specific asset
   */
  static async bindQRToAsset(qrId, assetType, assetId, farmId = null) {
    try {
      // Validate QR code exists and is available
      const qrCode = await QRCodeClient.findById(qrId);
      
      if (qrCode.status === 'bound') {
        throw new AppError('QR code is already bound to an asset', 400, 'QR_ALREADY_BOUND');
      }

      // Validate asset exists and belongs to farm
      await this.validateAssetBinding(assetType, assetId, farmId);

      // Update QR code
      const updatedQR = await QRCodeClient.bindToAsset(qrId, assetType, assetId);

      logger.info('QR code bound to asset successfully', {
        qr_id: qrId,
        short_code: qrCode.short_code,
        asset_type: assetType,
        asset_id: assetId,
        farm_id: farmId
      });

      return updatedQR;
    } catch (error) {
      logger.error('Failed to bind QR code to asset', error, { qrId, assetType, assetId, farmId });
      throw error;
    }
  }

  /**
   * Unbind QR code from asset
   */
  static async unbindQRFromAsset(qrId) {
    try {
      const qrCode = await QRCodeClient.findById(qrId);
      
      if (qrCode.status !== 'bound') {
        throw new AppError('QR code is not bound to any asset', 400, 'QR_NOT_BOUND');
      }

      const updatedQR = await QRCodeClient.unbindFromAsset(qrId);

      logger.info('QR code unbound from asset successfully', {
        qr_id: qrId,
        short_code: qrCode.short_code,
        previous_asset_type: qrCode.asset_type,
        previous_asset_id: qrCode.asset_id
      });

      return updatedQR;
    } catch (error) {
      logger.error('Failed to unbind QR code from asset', error, { qrId });
      throw error;
    }
  }

  /**
   * Allocate QR codes to a farm
   */
  static async allocateQRsToFarm(qrIds, farmId, allocatedBy = null) {
    try {
      // Validate farm
      const farm = await FarmClient.findById(farmId);
      if (!farm.active) {
        throw new AppError('Cannot allocate QR codes to inactive farm', 400, 'FARM_INACTIVE');
      }

      const results = [];
      const errors = [];

      for (const qrId of qrIds) {
        try {
          const qrCode = await QRCodeClient.findById(qrId);
          
          if (qrCode.status !== 'available') {
            errors.push({
              qr_id: qrId,
              short_code: qrCode.short_code,
              error: 'QR code is not available for allocation'
            });
            continue;
          }

          const updatedQR = await QRCodeClient.allocateToFarm(qrId, farmId);
          results.push(updatedQR);

        } catch (error) {
          errors.push({
            qr_id: qrId,
            error: error.message
          });
        }
      }

      logger.info('QR codes allocation completed', {
        farm_id: farmId,
        farm_name: farm.name,
        total_requested: qrIds.length,
        successful: results.length,
        failed: errors.length,
        allocated_by: allocatedBy
      });

      return {
        successful: results,
        failed: errors,
        farm: farm
      };
    } catch (error) {
      logger.error('Failed to allocate QR codes to farm', error, { qrIds, farmId, allocatedBy });
      throw error;
    }
  }

  /**
   * Create delivery request for QR codes
   */
  static async createDeliveryRequest(requestData, requestedBy = null) {
    const {
      farm_id,
      qr_count,
      notes = ''
    } = requestData;

    try {
      // Validate farm
      const farm = await FarmClient.findById(farm_id);
      if (!farm.active) {
        throw new AppError('Cannot create delivery request for inactive farm', 400, 'FARM_INACTIVE');
      }

      const deliveryRequest = await DeliveryRequestClient.create({
        farm_id,
        qr_count,
        notes,
        requested_by: requestedBy,
        metadata: {
          farm_name: farm.name,
          requested_by_user: requestedBy
        }
      });

      logger.info('Delivery request created successfully', {
        request_id: deliveryRequest.request_id,
        farm_id,
        farm_name: farm.name,
        qr_count,
        requested_by: requestedBy
      });

      return deliveryRequest;
    } catch (error) {
      logger.error('Failed to create delivery request', error, { requestData, requestedBy });
      throw error;
    }
  }

  /**
   * Process delivery request approval and QR allocation
   */
  static async processDeliveryRequest(requestId, approvedBy = null) {
    try {
      const request = await DeliveryRequestClient.findById(requestId);
      
      if (request.status !== 'pending') {
        throw new AppError('Only pending requests can be processed', 400, 'INVALID_REQUEST_STATUS');
      }

      // Check available QR codes
      const availableQRs = await QRCodeClient.findAll({
        status: 'available',
        limit: request.qr_count
      });

      if (availableQRs.data.length < request.qr_count) {
        throw new AppError(
          `Insufficient QR codes available. Requested: ${request.qr_count}, Available: ${availableQRs.data.length}`,
          400,
          'INSUFFICIENT_QR_CODES'
        );
      }

      try {
        // 1. Approve the request
        await DeliveryRequestClient.approve(requestId, approvedBy);

        // 2. Allocate QR codes to the farm
        const qrIds = availableQRs.data.slice(0, request.qr_count).map(qr => qr.id);
        await this.allocateQRsToFarm(qrIds, request.farm_id, approvedBy);

        logger.info('Delivery request processed successfully', {
          request_id: request.request_id,
          farm_id: request.farm_id,
          qr_count: request.qr_count,
          approved_by: approvedBy
        });

        return await DeliveryRequestClient.findById(requestId);
      } catch (error) {
        // If there's an error, try to revert the approval
        try {
          await DeliveryRequestClient.update(requestId, { status: 'pending' });
        } catch (revertError) {
          logger.error('Failed to revert request approval', revertError, { requestId });
        }
        throw error;
      }
    } catch (error) {
      logger.error('Failed to process delivery request', error, { requestId, approvedBy });
      throw error;
    }
  }

  /**
   * Get comprehensive QR analytics
   */
  static async getAnalytics(timeRange = '30d') {
    try {
      const [qrStats, batchStats, deliveryStats, assetDistribution] = await Promise.all([
        QRCodeClient.getStatistics(),
        ProductionBatchClient.getStatistics(),
        DeliveryRequestClient.getStatistics(),
        QRCodeClient.getAssetTypeDistribution()
      ]);

      const analytics = {
        qr_codes: qrStats,
        production_batches: batchStats,
        delivery_requests: deliveryStats,
        asset_distribution: assetDistribution,
        generated_at: new Date().toISOString(),
        time_range: timeRange
      };

      logger.info('QR analytics generated successfully', { time_range: timeRange });

      return analytics;
    } catch (error) {
      logger.error('Failed to generate QR analytics', error, { timeRange });
      throw error;
    }
  }

  /**
   * Scan QR code and get information
   */
  static async scanQRCode(identifier, scannedBy = null) {
    try {
      let qrCode;

      // Try to find by short code first, then by UUID
      try {
        qrCode = await QRCodeClient.findByShortCode(identifier);
      } catch (error) {
        if (error.status === 404) {
          qrCode = await QRCodeClient.findByUUID(identifier);
        } else {
          throw error;
        }
      }

      // Log the scan event
      logger.info('QR code scanned', {
        qr_id: qrCode.id,
        short_code: qrCode.short_code,
        status: qrCode.status,
        farm_id: qrCode.farm_id,
        scanned_by: scannedBy
      });

      return qrCode;
    } catch (error) {
      logger.error('Failed to scan QR code', error, { identifier, scannedBy });
      throw error;
    }
  }

  /**
   * Validate asset binding
   */
  static async validateAssetBinding(assetType, assetId, farmId = null) {
    // This would validate against equipment, parts, or consumables tables
    // Implementation depends on your specific asset management structure
    const validAssetTypes = ['equipment', 'part', 'consumable'];
    
    if (!validAssetTypes.includes(assetType)) {
      throw new AppError(
        'Invalid asset type',
        400,
        'INVALID_ASSET_TYPE',
        { validTypes: validAssetTypes }
      );
    }

    // Add specific validation logic based on asset type
    // For now, we'll just log the validation attempt
    logger.info('Asset binding validation', {
      asset_type: assetType,
      asset_id: assetId,
      farm_id: farmId
    });

    return true;
  }

  /**
   * Get QR codes for a specific farm
   */
  static async getFarmQRCodes(farmId, options = {}) {
    try {
      const farm = await FarmClient.findById(farmId);
      
      const qrCodes = await QRCodeClient.findAll({
        ...options,
        farm_id: farmId
      });

      return {
        farm: farm,
        qr_codes: qrCodes
      };
    } catch (error) {
      logger.error('Failed to get farm QR codes', error, { farmId, options });
      throw error;
    }
  }

  /**
   * Get QR codes for a specific production batch
   */
  static async getBatchQRCodes(batchId, options = {}) {
    try {
      const result = await ProductionBatchClient.getQRCodes(batchId, options);
      
      console.log('Retrieved QR codes for batch', {
        batch_id: batchId,
        page: options.page || 1,
        limit: options.limit || 50,
        total: result.pagination?.total || 0,
        sort: options.sort || 'print_position',
        order: options.order || 'asc'
      });

      return result;
    } catch (error) {
      console.error('Failed to get batch QR codes', error, { batchId, options });
      throw error;
    }
  }

  /**
   * Bulk update QR code statuses
   */
  static async bulkUpdateStatus(qrIds, newStatus, updatedBy = null) {
    try {
      const results = [];
      const errors = [];

      for (const qrId of qrIds) {
        try {
          const updatedQR = await QRCodeClient.update(qrId, { status: newStatus });
          results.push(updatedQR);
        } catch (error) {
          errors.push({
            qr_id: qrId,
            error: error.message
          });
        }
      }

      logger.info('Bulk QR status update completed', {
        total_requested: qrIds.length,
        successful: results.length,
        failed: errors.length,
        new_status: newStatus,
        updated_by: updatedBy
      });

      return {
        successful: results,
        failed: errors
      };
    } catch (error) {
      logger.error('Failed to bulk update QR statuses', error, { qrIds, newStatus, updatedBy });
      throw error;
    }
  }
}

module.exports = QRCodeService;