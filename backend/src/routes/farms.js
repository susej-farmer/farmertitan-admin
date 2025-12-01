const express = require('express');
const router = express.Router();

const FarmService = require('../services/farmService');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

const { verifyToken, requireAuth } = require('../middleware/auth');
const {
  validateFarm,
  validateFarmUpdate,
  validateId,
  validatePagination,
  validateSearch
} = require('../middleware/validation');

// Get all farms
router.get('/',
  verifyToken,
  requireAuth,
  validatePagination,
  validateSearch,
  asyncHandler(async (req, res) => {
    const result = await FarmService.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

// Get farm by ID
router.get('/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const farm = await FarmService.findById(req.params.id);
    res.json({
      success: true,
      data: farm
    });
  })
);

// Create new farm
router.post('/',
  verifyToken,
  requireAuth,
  validateFarm,
  asyncHandler(async (req, res) => {
    const farm = await FarmService.create(req.body);
    res.status(201).json({
      success: true,
      data: farm,
      message: 'Farm created successfully'
    });
  })
);

// Update farm
router.put('/:id',
  verifyToken,
  requireAuth,
  validateId,
  validateFarmUpdate,
  asyncHandler(async (req, res) => {
    const farm = await FarmService.update(req.params.id, req.body);
    res.json({
      success: true,
      data: farm,
      message: 'Farm updated successfully'
    });
  })
);

// Delete farm
router.delete('/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    await FarmService.delete(req.params.id);
    res.json({
      success: true,
      message: 'Farm deleted successfully'
    });
  })
);

// Activate farm
router.patch('/:id/activate',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const farm = await FarmService.activate(req.params.id);
    res.json({
      success: true,
      data: farm,
      message: 'Farm activated successfully'
    });
  })
);

// Deactivate farm
router.patch('/:id/deactivate',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const farm = await FarmService.deactivate(req.params.id);
    res.json({
      success: true,
      data: farm,
      message: 'Farm deactivated successfully'
    });
  })
);

// Get farm statistics
router.get('/stats/overview',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const stats = await FarmService.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  })
);

module.exports = router;
