const express = require('express');
const router = express.Router();
const jsPDF = require('jspdf');
const QRCode = require('qrcode');

const QRCodeClient = require('../clients/qrCodeClient');
const ProductionBatchClient = require('../clients/productionBatchClient');
const QRDeliveryBatchClient = require('../clients/qrDeliveryBatchClient');
const QRCodeService = require('../services/qrCodeService');
const QRSupplierService = require('../services/qrSupplierService');
const ProductionBatchService = require('../services/productionBatchService');
const QRDeliveryBatchService = require('../services/qrDeliveryBatchService');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

const { verifyToken, requireAuth } = require('../middleware/auth');
const {
  validatePaginatedQuery,
  validateId
} = require('../middleware/validation');

// QR Code Management Routes

/**
 * GET /api/qr-codes
 * Get all QR codes with filtering and pagination
 */
router.get('/', 
  validatePaginatedQuery,
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
  verifyToken,
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
  verifyToken,
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
  validatePaginatedQuery,
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

    const result = await QRCodeService.getProductionBatches({
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

    const result = await QRCodeService.createProductionBatch({
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
  validatePaginatedQuery,
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

// QR Delivery Request Management Routes - MUST come before generic /:id route

/**
 * GET /api/qr-codes/requests
 * Get all QR delivery requests with filtering and pagination
 */
router.get('/requests',
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      search = '',
      status = null,
      farm_id = null,
      date_from = null,
      date_to = null
    } = req.query;

    const result = await QRDeliveryBatchService.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order,
      search,
      status,
      farm_id,
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
 * POST /api/qr-codes/requests
 * Create a new QR delivery request
 */
router.post('/requests',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    console.log('Received delivery request creation:', req.body);
    
    const { farm_id, requested_quantity, metadata } = req.body;
    
    const result = await QRDeliveryBatchService.create({
      farm_id,
      requested_quantity,
      metadata: metadata || {}
    }, { userId: req.user.id });

    res.status(201).json({
      success: true,
      data: result.data,
      message: result.message
    });
  })
);

/**
 * GET /api/qr-codes/requests/stats/overview
 * Get delivery request statistics
 */
router.get('/requests/stats/overview',
  asyncHandler(async (req, res) => {
    const statistics = await QRDeliveryBatchService.getStatistics();
    
    res.json({
      success: true,
      data: statistics
    });
  })
);

/**
 * GET /api/qr-codes/requests/code/:deliveryCode
 * Get delivery request details by delivery code
 */
router.get('/requests/code/:deliveryCode',
  asyncHandler(async (req, res) => {
    const { deliveryCode } = req.params;
    
    if (!deliveryCode || deliveryCode.trim().length === 0) {
      throw new AppError('Delivery code is required', 400, 'MISSING_DELIVERY_CODE');
    }
    
    const deliveryRequest = await QRDeliveryBatchService.findByDeliveryCode(deliveryCode);
    
    res.json({
      success: true,
      data: deliveryRequest
    });
  })
);

/**
 * GET /api/qr-codes/requests/:id
 * Get delivery request details by ID
 */
router.get('/requests/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const deliveryRequest = await QRDeliveryBatchService.findById(req.params.id);
    
    res.json({
      success: true,
      data: deliveryRequest
    });
  })
);

/**
 * PUT /api/qr-codes/requests/:id
 * Update delivery request
 */
router.put('/requests/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const { delivery_code, farm_id, requested_quantity, metadata } = req.body;
    
    const result = await QRDeliveryBatchService.update(req.params.id, {
      delivery_code,
      farm_id,
      requested_quantity,
      metadata
    }, { userId: req.user.id });

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });
  })
);

/**
 * PUT /api/qr-codes/requests/:id/status
 * Update delivery request status
 */
router.put('/requests/:id/status',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const { status, notes = '' } = req.body;
    
    const result = await QRDeliveryBatchService.updateStatus(
      req.params.id,
      { status, notes },
      { userId: req.user.id }
    );

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });
  })
);

/**
 * DELETE /api/qr-codes/requests/:id
 * Delete delivery request
 */
router.delete('/requests/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const result = await QRDeliveryBatchService.delete(req.params.id, { userId: req.user.id });

    res.json({
      success: result.success,
      message: result.message
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
  verifyToken,
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
  verifyToken,
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
  verifyToken,
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
  verifyToken,
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
  verifyToken,
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
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const { status, notes = '', defective_info = {} } = req.body;
    
    const statusData = { status, notes, defective_info };
    const userContext = { userId: req.user?.id };
    
    const result = await ProductionBatchService.updateStatus(
      req.params.id,
      statusData,
      userContext
    );

    res.json({
      success: true,
      data: result.data,
      message: result.message
    });
  })
);

/**
 * GET /api/qr-codes/batches/:id/qr-codes
 * Get QR codes for a specific batch
 */
router.get('/batches/:id/qr-codes',
  verifyToken,
  requireAuth,
  validateId,
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, sort = 'print_position', order = 'asc' } = req.query;
    
    const result = await QRCodeService.getBatchQRCodes(req.params.id, {
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

/**
 * GET /api/qr-codes/batches/:id/pdf
 * Generate PDF with QR codes for a specific batch
 */
router.get('/batches/:id/pdf',
  validateId,
  asyncHandler(async (req, res) => {
    const batchId = req.params.id;
    
    // Get batch info
    const batch = await ProductionBatchClient.get(batchId);
    if (!batch) {
      throw new AppError('Production batch not found', 404);
    }
    
    // Get all QR codes for this batch (no pagination)
    const result = await QRCodeService.getBatchQRCodes(batchId, {
      page: 1,
      limit: 100,
      sort: 'print_position',
      order: 'asc'
    });
    
    const qrCodes = result.data;
    
    if (qrCodes.length === 0) {
      throw new AppError('No QR codes found for this batch', 404);
    }
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait, millimeters, A4
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    
    // Layout configuration
    const margin = 15;
    const qrSize = 40; // QR code size in mm
    const spacing = 10; // Space between QR codes
    const textHeight = 8; // Height for short_code text
    const itemWidth = qrSize + spacing;
    const itemHeight = qrSize + textHeight + spacing;
    
    // Calculate positions (3 columns)
    const cols = 3;
    const startX = margin;
    const startY = margin;
    const colWidth = (pageWidth - 2 * margin) / cols;
    
    // Items per page: 3 cols x 3 rows = 9
    const itemsPerPage = 9;
    let currentPage = 1;
    
    // Add title
    pdf.setFontSize(16);
    pdf.text(`Production Batch: ${batch.batch_code}`, pageWidth / 2, startY, { align: 'center' });
    
    let currentY = startY + 15; // Start below title
    
    for (let i = 0; i < qrCodes.length; i++) {
      const qr = qrCodes[i];
      const col = i % cols;
      const row = Math.floor((i % itemsPerPage) / cols);
      
      // Check if we need a new page (after 9 items)
      if (i > 0 && i % itemsPerPage === 0) {
        pdf.addPage();
        currentPage++;
        currentY = startY; // Reset Y position for new page
      }
      
      // Calculate position
      const x = startX + col * colWidth + (colWidth - qrSize) / 2;
      const y = currentY + row * itemHeight;
      
      // Generate QR code URL
      const qrUrl = `https://app.farmertitan.com/qr?code=${qr.id}`;
      
      try {
        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // Add QR code to PDF
        pdf.addImage(qrDataUrl, 'PNG', x, y, qrSize, qrSize);
        
        // Add short_code below QR code
        pdf.setFontSize(10);
        pdf.text(qr.short_code || qr.id.substring(0, 8), x + qrSize / 2, y + qrSize + 5, { align: 'center' });
        
      } catch (error) {
        console.error(`Error generating QR code for ${qr.id}:`, error);
        // Add placeholder text if QR generation fails
        pdf.setFontSize(8);
        pdf.text('QR Error', x + qrSize / 2, y + qrSize / 2, { align: 'center' });
        pdf.text(qr.short_code || qr.id.substring(0, 8), x + qrSize / 2, y + qrSize + 5, { align: 'center' });
      }
    }
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="batch-${batch.batch_code}-qr-codes.pdf"`);
    
    // Send PDF
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    res.send(pdfBuffer);
  })
);

// Delivery Request routes with ID parameter








module.exports = router;