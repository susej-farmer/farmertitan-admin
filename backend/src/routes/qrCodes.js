const express = require('express');
const router = express.Router();

const QRCodeClient = require('../clients/qrCodeClient');
const ProductionBatchClient = require('../clients/productionBatchClient');
const DeliveryRequestClient = require('../clients/deliveryRequestClient');
const QRCodeService = require('../services/qrCodeService');
const QRSupplierService = require('../services/qrSupplierService');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

const { verifyToken, requireAuth } = require('../middleware/auth');
const { 
  validatePagination,
  validateId,
  validateSearch
} = require('../middleware/validation');

// QR Code Management Routes

/**
 * GET /api/qr-codes
 * Get all QR codes with filtering and pagination
 */
router.get('/', 
  validatePagination,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      search = '',
      status = null,
      farm_id = null,
      asset_type = null,
      batch_id = null,
      date_from = null,
      date_to = null
    } = req.query;

    const result = await QRCodeClient.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order,
      search,
      status,
      farm_id,
      asset_type,
      batch_id,
      date_from,
      date_to
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * POST /api/qr-codes
 * Generate a single QR code
 */
router.post('/',
  asyncHandler(async (req, res) => {
    const { farm_id, asset_type, asset_id, metadata } = req.body;
    
    const qrCode = await QRCodeService.generateSingleQR({
      farm_id,
      asset_type,
      asset_id,
      metadata
    }, req.user?.id);

    res.status(201).json({
      success: true,
      data: qrCode,
      message: 'QR code generated successfully'
    });
  })
);

/**
 * GET /api/qr-codes/stats/overview
 * Get QR code statistics
 */
router.get('/stats/overview',
  asyncHandler(async (req, res) => {
    const statistics = await QRCodeClient.getStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  })
);

/**
 * POST /api/qr-codes/scan
 * Scan QR code and get information
 */
router.post('/scan',
  asyncHandler(async (req, res) => {
    const { identifier } = req.body;
    
    if (!identifier) {
      throw new AppError('QR code identifier is required', 400, 'MISSING_IDENTIFIER');
    }

    const qrCode = await QRCodeService.scanQRCode(identifier, req.user?.id);
    
    res.json({
      success: true,
      data: qrCode,
      message: 'QR code scanned successfully'
    });
  })
);

/**
 * POST /api/qr-codes/allocate
 * Allocate multiple QR codes to a farm
 */
router.post('/allocate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { qr_ids, farm_id } = req.body;
    
    if (!qr_ids || !Array.isArray(qr_ids) || qr_ids.length === 0) {
      throw new AppError('QR code IDs array is required', 400, 'MISSING_QR_IDS');
    }

    if (!farm_id) {
      throw new AppError('Farm ID is required', 400, 'MISSING_FARM_ID');
    }

    const result = await QRCodeService.allocateQRsToFarm(
      qr_ids,
      farm_id,
      req.user?.id
    );

    res.json({
      success: true,
      data: result,
      message: 'QR codes allocation completed'
    });
  })
);

/**
 * POST /api/qr-codes/bulk-update
 * Bulk update QR code statuses
 */
router.post('/bulk-update',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { qr_ids, status } = req.body;
    
    if (!qr_ids || !Array.isArray(qr_ids) || qr_ids.length === 0) {
      throw new AppError('QR code IDs array is required', 400, 'MISSING_QR_IDS');
    }

    if (!status) {
      throw new AppError('Status is required', 400, 'MISSING_STATUS');
    }

    const result = await QRCodeService.bulkUpdateStatus(
      qr_ids,
      status,
      req.user?.id
    );

    res.json({
      success: true,
      data: result,
      message: 'Bulk update completed'
    });
  })
);

// Production Batch Routes

/**
 * GET /api/qr-codes/batches
 * Get all production batches
 */
router.get('/batches',
  validatePagination,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      search = '',
      status = null,
      supplier = null,
      date_from = null,
      date_to = null
    } = req.query;

    const result = await ProductionBatchClient.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order,
      search,
      status,
      supplier,
      date_from,
      date_to
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * POST /api/qr-codes/batches
 * Create production batch
 */
router.post('/batches',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    console.log('Received batch creation request:', req.body);
    
    const { quantity, supplier_id, notes } = req.body;
    
    if (!quantity || quantity <= 0 || quantity > 100) {
      throw new AppError('Quantity must be between 1 and 100', 400, 'INVALID_QUANTITY');
    }

    if (!supplier_id) {
      throw new AppError('Supplier ID is required', 400, 'MISSING_SUPPLIER');
    }

    const result = await ProductionBatchClient.create({
      quantity: parseInt(quantity),
      supplier_id,
      notes: notes || ''
    }, req.user.id);

    res.status(201).json({
      success: true,
      data: result,
      message: result.message
    });
  })
);

/**
 * GET /api/qr-codes/batches/stats/overview
 * Get production batch statistics
 */
router.get('/batches/stats/overview',
  asyncHandler(async (req, res) => {
    const statistics = await ProductionBatchClient.getStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  })
);

/**
 * GET /api/qr-codes/suppliers
 * Get list of suppliers
 */
router.get('/suppliers',
  verifyToken,
  requireAuth,
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = '', sort = 'name', order = 'asc' } = req.query;
    
    const result = await QRSupplierService.getAllSuppliers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      sort,
      order
    });
    
    if (!result.success) {
      throw new AppError(result.error.message, 500);
    }
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

// Delivery Request Routes

/**
 * GET /api/qr-codes/delivery-requests
 * Get all delivery requests
 */
router.get('/delivery-requests',
  validatePagination,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      search = '',
      status = null,
      farm_id = null,
      requested_by = null,
      date_from = null,
      date_to = null
    } = req.query;

    const result = await DeliveryRequestClient.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order,
      search,
      status,
      farm_id,
      requested_by,
      date_from,
      date_to
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

/**
 * POST /api/qr-codes/delivery-requests
 * Create delivery request
 */
router.post('/delivery-requests',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { farm_id, qr_count, notes } = req.body;
    
    if (!farm_id) {
      throw new AppError('Farm ID is required', 400, 'MISSING_FARM_ID');
    }

    if (!qr_count || qr_count <= 0) {
      throw new AppError('Valid QR count is required', 400, 'INVALID_QR_COUNT');
    }

    const deliveryRequest = await QRCodeService.createDeliveryRequest({
      farm_id,
      qr_count: parseInt(qr_count),
      notes
    }, req.user?.id);

    res.status(201).json({
      success: true,
      data: deliveryRequest,
      message: 'Delivery request created successfully'
    });
  })
);

/**
 * GET /api/qr-codes/delivery-requests/stats/overview
 * Get delivery request statistics
 */
router.get('/delivery-requests/stats/overview',
  asyncHandler(async (req, res) => {
    const statistics = await DeliveryRequestClient.getStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  })
);

// Analytics Routes

/**
 * GET /api/qr-codes/analytics
 * Get comprehensive QR analytics
 */
router.get('/analytics',
  asyncHandler(async (req, res) => {
    const { time_range = '30d' } = req.query;
    
    const analytics = await QRCodeService.getAnalytics(time_range);
    
    res.json({
      success: true,
      data: analytics
    });
  })
);

/**
 * GET /api/qr-codes/analytics/distribution
 * Get asset type distribution
 */
router.get('/analytics/distribution',
  asyncHandler(async (req, res) => {
    const distribution = await QRCodeClient.getAssetTypeDistribution();
    
    res.json({
      success: true,
      data: distribution
    });
  })
);

// Individual QR Code Routes (with ID parameter - must come after specific routes)

/**
 * GET /api/qr-codes/:id
 * Get QR code details by ID
 */
router.get('/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const qrCode = await QRCodeClient.findById(req.params.id);
    
    res.json({
      success: true,
      data: qrCode
    });
  })
);

/**
 * PUT /api/qr-codes/:id
 * Update QR code
 */
router.put('/:id',
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const { farm_id, asset_type, asset_id, status, metadata } = req.body;
    
    const qrCode = await QRCodeClient.update(req.params.id, {
      farm_id,
      asset_type,
      asset_id,
      status,
      metadata
    });

    res.json({
      success: true,
      data: qrCode,
      message: 'QR code updated successfully'
    });
  })
);

/**
 * DELETE /api/qr-codes/:id
 * Delete QR code
 */
router.delete('/:id',
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    await QRCodeClient.delete(req.params.id);
    
    res.json({
      success: true,
      message: 'QR code deleted successfully'
    });
  })
);

/**
 * POST /api/qr-codes/:id/bind
 * Bind QR code to asset
 */
router.post('/:id/bind',
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const { asset_type, asset_id, farm_id } = req.body;
    
    if (!asset_type || !asset_id) {
      throw new AppError('Asset type and asset ID are required', 400, 'MISSING_ASSET_INFO');
    }

    const qrCode = await QRCodeService.bindQRToAsset(
      req.params.id,
      asset_type,
      asset_id,
      farm_id
    );

    res.json({
      success: true,
      data: qrCode,
      message: 'QR code bound to asset successfully'
    });
  })
);

/**
 * POST /api/qr-codes/:id/unbind
 * Unbind QR code from asset
 */
router.post('/:id/unbind',
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const qrCode = await QRCodeService.unbindQRFromAsset(req.params.id);

    res.json({
      success: true,
      data: qrCode,
      message: 'QR code unbound from asset successfully'
    });
  })
);

// Batch-specific routes with ID parameter

/**
 * GET /api/qr-codes/batches/:id
 * Get production batch details
 */
router.get('/batches/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const batch = await ProductionBatchClient.findById(req.params.id);
    
    res.json({
      success: true,
      data: batch
    });
  })
);

/**
 * PUT /api/qr-codes/batches/:id
 * Update production batch
 */
router.put('/batches/:id',
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const { quantity, supplier_name, notes, status, metadata } = req.body;
    
    const batch = await ProductionBatchClient.update(req.params.id, {
      quantity,
      supplier_name,
      notes,
      status,
      metadata
    });

    res.json({
      success: true,
      data: batch,
      message: 'Production batch updated successfully'
    });
  })
);

/**
 * PUT /api/qr-codes/batches/:id/status
 * Update production batch status
 */
router.put('/batches/:id/status',
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const { status, notes = '', defective_info = {} } = req.body;
    
    if (!status) {
      throw new AppError('Status is required', 400, 'MISSING_STATUS');
    }

    const result = await ProductionBatchClient.updateStatus(
      req.params.id, 
      status, 
      req.user?.id, 
      notes, 
      defective_info
    );

    res.json({
      success: true,
      data: result,
      message: result.message
    });
  })
);

/**
 * GET /api/qr-codes/batches/:id/qr-codes
 * Get QR codes for a specific batch
 */
router.get('/batches/:id/qr-codes',
  validateId,
  validatePagination,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, sort = 'print_position', order = 'asc' } = req.query;
    
    const result = await ProductionBatchClient.getQRCodes(req.params.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

// Delivery Request routes with ID parameter

/**
 * GET /api/qr-codes/delivery-requests/:id
 * Get delivery request details
 */
router.get('/delivery-requests/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const request = await DeliveryRequestClient.findById(req.params.id);
    
    res.json({
      success: true,
      data: request
    });
  })
);

/**
 * PUT /api/qr-codes/delivery-requests/:id
 * Update delivery request
 */
router.put('/delivery-requests/:id',
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const { qr_count, notes, status, metadata } = req.body;
    
    const request = await DeliveryRequestClient.update(req.params.id, {
      qr_count,
      notes,
      status,
      metadata
    });

    res.json({
      success: true,
      data: request,
      message: 'Delivery request updated successfully'
    });
  })
);

/**
 * POST /api/qr-codes/delivery-requests/:id/approve
 * Approve delivery request and allocate QR codes
 */
router.post('/delivery-requests/:id/approve',
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const request = await QRCodeService.processDeliveryRequest(
      req.params.id,
      req.user?.id
    );

    res.json({
      success: true,
      data: request,
      message: 'Delivery request approved and QR codes allocated'
    });
  })
);

/**
 * POST /api/qr-codes/delivery-requests/:id/cancel
 * Cancel delivery request
 */
router.post('/delivery-requests/:id/cancel',
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    
    const request = await DeliveryRequestClient.cancel(
      req.params.id,
      req.user?.id,
      reason
    );

    res.json({
      success: true,
      data: request,
      message: 'Delivery request cancelled successfully'
    });
  })
);

/**
 * POST /api/qr-codes/delivery-requests/:id/deliver
 * Mark delivery request as delivered
 */
router.post('/delivery-requests/:id/deliver',
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const { tracking_number } = req.body;
    
    const request = await DeliveryRequestClient.markDelivered(
      req.params.id,
      req.user?.id,
      tracking_number
    );

    res.json({
      success: true,
      data: request,
      message: 'Delivery request marked as delivered'
    });
  })
);

/**
 * GET /api/qr-codes/suppliers
 * Get all QR suppliers
 */
router.get('/suppliers',
  requireAuth,
  validatePagination,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      search = '',
      sort = 'name',
      order = 'asc'
    } = req.query;

    const result = await QRSupplierService.getAllSuppliers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      sort,
      order
    });

    if (!result.success) {
      throw new AppError(result.error.message, 500);
    }

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

module.exports = router;