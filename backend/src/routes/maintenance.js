const express = require('express');
const router = express.Router();

const MaintenanceTemplateService = require('../services/maintenanceTemplateService');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

const {
  validateMaintenanceTemplate,
  validateId,
  validatePagination,
  validateSearch
} = require('../middleware/validation');

// Get all maintenance templates
router.get('/templates',
  validatePagination,
  validateSearch,
  asyncHandler(async (req, res) => {
    const result = await MaintenanceTemplateService.getTemplates(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

// Get specific maintenance template
router.get('/templates/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const template = await MaintenanceTemplateService.getTemplateById(req.params.id);
    res.json({
      success: true,
      data: template
    });
  })
);

// Create new maintenance template
router.post('/templates',
  asyncHandler(async (req, res, next) => {
    const { 
      interval, 
      schedule_type, 
      equipment_type, 
      maintenance_name, 
      maintenance_category, 
      part_or_consumable 
    } = req.body;
    
    // Validate required fields
    if (!interval || !schedule_type || !equipment_type || !maintenance_name || !maintenance_category || !part_or_consumable) {
      throw new AppError('Missing required fields for maintenance template creation', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Validate interval is positive
    if (interval <= 0) {
      throw new AppError('Interval must be a positive number', 400, 'INVALID_INTERVAL');
    }
    
    // Validate schedule type
    if (!['Hours', 'Kilometers'].includes(schedule_type)) {
      throw new AppError('Schedule type must be "Hours" or "Kilometers"', 400, 'INVALID_SCHEDULE_TYPE');
    }
    
    // Validate maintenance category
    if (!['Part', 'Consumable'].includes(maintenance_category)) {
      throw new AppError('Maintenance category must be "Part" or "Consumable"', 400, 'INVALID_MAINTENANCE_CATEGORY');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const template = await MaintenanceTemplateService.createTemplate(req.body);
    res.status(201).json({
      success: true,
      data: template,
      message: 'Maintenance template created successfully'
    });
  })
);

// Delete maintenance template
router.delete('/templates/:id',
  validateId,
  asyncHandler(async (req, res) => {
    await MaintenanceTemplateService.deleteTemplate(req.params.id);
    res.json({
      success: true,
      message: 'Maintenance template deleted successfully'
    });
  })
);

// Apply templates to specific equipment
router.post('/templates/apply/:equipmentId',
  validateId,
  asyncHandler(async (req, res) => {
    const result = await MaintenanceTemplateService.applyTemplatesToEquipment(req.params.equipmentId);
    res.json({
      success: true,
      data: result,
      message: `Applied ${result.templates_applied} maintenance templates to equipment`
    });
  })
);

module.exports = router;