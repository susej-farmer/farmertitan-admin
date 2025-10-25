const express = require('express');
const router = express.Router();

const FarmClient = require('../clients/farmClient');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

const {
  validateFarm,
  validateFarmUpdate,
  validateId,
  validatePagination,
  validateSearch
} = require('../middleware/validation');

// Get all farms
router.get('/',
  validatePagination,
  validateSearch,
  asyncHandler(async (req, res) => {
    const result = await FarmClient.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

// Get farm by ID
router.get('/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const farm = await FarmClient.findById(req.params.id);
    res.json({
      success: true,
      data: farm
    });
  })
);

// Create new farm
router.post('/',
  validateFarm,
  asyncHandler(async (req, res, next) => {
    // Check name uniqueness
    const isNameUnique = await FarmClient.checkNameUnique(req.body.name);
    if (!isNameUnique) {
      throw new AppError('Farm name already exists', 409, 'DUPLICATE_FARM_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const farm = await FarmClient.create(req.body);
    res.status(201).json({
      success: true,
      data: farm,
      message: 'Farm created successfully'
    });
  })
);

// Update farm
router.put('/:id',
  validateId,
  validateFarmUpdate,
  asyncHandler(async (req, res, next) => {
    // Check name uniqueness if name is being updated
    if (req.body.name) {
      const isNameUnique = await FarmClient.checkNameUnique(req.body.name, req.params.id);
      if (!isNameUnique) {
        throw new AppError('Farm name already exists', 409, 'DUPLICATE_FARM_NAME');
      }
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const farm = await FarmClient.update(req.params.id, req.body);
    res.json({
      success: true,
      data: farm,
      message: 'Farm updated successfully'
    });
  })
);

// Delete farm
router.delete('/:id',
  validateId,
  asyncHandler(async (req, res) => {
    await FarmClient.delete(req.params.id);
    res.json({
      success: true,
      message: 'Farm deleted successfully'
    });
  })
);

// Activate farm
router.patch('/:id/activate',
  validateId,
  asyncHandler(async (req, res) => {
    const farm = await FarmClient.activate(req.params.id);
    res.json({
      success: true,
      data: farm,
      message: 'Farm activated successfully'
    });
  })
);

// Deactivate farm
router.patch('/:id/deactivate',
  validateId,
  asyncHandler(async (req, res) => {
    const farm = await FarmClient.deactivate(req.params.id);
    res.json({
      success: true,
      data: farm,
      message: 'Farm deactivated successfully'
    });
  })
);

// Get farm statistics
router.get('/stats/overview',
  asyncHandler(async (req, res) => {
    const stats = await FarmClient.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  })
);

module.exports = router;
