const express = require('express');
const router = express.Router();

const MaintenanceTemplateService = require('../services/maintenanceTemplateService');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

const {
  validateId,
  validatePagination,
  validateSearch
} = require('../middleware/validation');

// =====================================================================================
// EQUIPMENT WITH MAINTENANCE STATUS ROUTES
// =====================================================================================

// Get all equipment with maintenance templates
router.get('/equipment-templates',
  asyncHandler(async (req, res) => {
    const filters = {
      equipment_type: req.query.equipment_type,
      equipment_make: req.query.equipment_make,
      equipment_model: req.query.equipment_model,
      equipment_trim: req.query.equipment_trim
    };
    
    // Remove null/undefined filters
    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
    
    const result = await MaintenanceTemplateService.getEquipmentWithMaintenanceTemplates(filters);
    res.json({
      success: true,
      data: result
    });
  })
);

// Get maintenance tasks for specific equipment
router.get('/equipment-tasks/:equipmentId',
  asyncHandler(async (req, res) => {
    const { equipmentId } = req.params;
    const result = await MaintenanceTemplateService.getMaintenanceTasksForEquipment(equipmentId);
    res.json({
      success: true,
      data: result
    });
  })
);

// Get maintenance tasks for equipment type
router.get('/equipment-type-tasks/:equipmentTypeId',
  asyncHandler(async (req, res) => {
    const { equipmentTypeId } = req.params;
    const result = await MaintenanceTemplateService.getMaintenanceTasksForEquipment(null, equipmentTypeId);
    res.json({
      success: true,
      data: result
    });
  })
);

// Get all equipment with maintenance status (legacy)
router.get('/equipment',
  validatePagination,
  validateSearch,
  asyncHandler(async (req, res) => {
    const result = await MaintenanceTemplateService.getEquipmentWithMaintenanceStatus(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

// Get maintenance templates for specific equipment
router.get('/equipment/:id/maintenance',
  validateId,
  asyncHandler(async (req, res) => {
    const templates = await MaintenanceTemplateService.getMaintenanceTemplatesForEquipment(req.params.id);
    res.json({
      success: true,
      data: templates
    });
  })
);

// =====================================================================================
// EQUIPMENT VALIDATION AND UPDATE ROUTES
// =====================================================================================

// Validate and update equipment in task series
router.put('/validate-equipment-update/:taskSeriesId',
  asyncHandler(async (req, res) => {
    const { taskSeriesId } = req.params;
    const { equipment_type_name, equipment_make_name, equipment_model_name, equipment_trim_name, equipment_year } = req.body;
    
    // Validate taskSeriesId
    if (!taskSeriesId) {
      throw new AppError('Valid task series ID is required', 400, 'INVALID_TASK_SERIES_ID');
    }
    
    // Validate required fields
    if (!equipment_type_name || !equipment_make_name || !equipment_model_name) {
      throw new AppError('Equipment type, make, and model are required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    const result = await MaintenanceTemplateService.validateAndUpdateEquipment(
      taskSeriesId,
      { equipment_type_name, equipment_make_name, equipment_model_name, equipment_trim_name, equipment_year }
    );
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
  })
);

// =====================================================================================
// COMBINED OPERATIONS ROUTES
// =====================================================================================

// Create equipment with maintenance templates
router.post('/equipment-with-maintenance',
  asyncHandler(async (req, res, next) => {
    const { equipment, maintenanceTemplates } = req.body;
    
    // Validate required fields
    if (!equipment || !equipment.type || !equipment.make || !equipment.model) {
      throw new AppError('Equipment type, make, and model are required', 400, 'MISSING_EQUIPMENT_DATA');
    }
    
    if (!maintenanceTemplates || !Array.isArray(maintenanceTemplates) || maintenanceTemplates.length === 0) {
      throw new AppError('At least one maintenance template is required', 400, 'MISSING_MAINTENANCE_TEMPLATES');
    }
    
    // Validate each maintenance template
    for (const template of maintenanceTemplates) {
      if (!template.interval || !template.schedule_type || !template.maintenance_name || 
          !template.maintenance_category || !template.part_or_consumable) {
        throw new AppError('All maintenance template fields are required', 400, 'INVALID_MAINTENANCE_TEMPLATE');
      }
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const result = await MaintenanceTemplateService.createEquipmentWithMaintenance(req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: result.message
    });
  })
);

// =====================================================================================
// INDIVIDUAL MAINTENANCE TEMPLATE ROUTES
// =====================================================================================

// Create individual maintenance template
router.post('/maintenance-template',
  asyncHandler(async (req, res, next) => {
    const {
      interval,
      schedule_type,
      equipment_type,
      equipment_id,
      maintenance_name,
      maintenance_category,
      part_or_consumable
    } = req.body;
    
    // Validate required fields
    if (!interval || !schedule_type || !equipment_type || !maintenance_name || 
        !maintenance_category || !part_or_consumable) {
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
    const template = await MaintenanceTemplateService.createMaintenanceTemplate(req.body);
    res.status(201).json({
      success: true,
      data: template,
      message: 'Maintenance template created successfully'
    });
  })
);

// Delete maintenance template
router.delete('/maintenance-template/:id',
  validateId,
  asyncHandler(async (req, res) => {
    await MaintenanceTemplateService.deleteTemplate(req.params.id);
    res.json({
      success: true,
      message: 'Maintenance template deleted successfully'
    });
  })
);

// Get available time types for schedule selection
router.get('/time-types',
  asyncHandler(async (req, res) => {
    const result = await MaintenanceTemplateService.getTimeTypes();
    res.json({
      success: true,
      data: result
    });
  })
);

// Update maintenance task template
router.put('/task/:taskId/schedule/:scheduleId',
  asyncHandler(async (req, res) => {
    const { taskId, scheduleId } = req.params;
    const updateData = req.body;
    
    const result = await MaintenanceTemplateService.updateMaintenanceTask(taskId, scheduleId, updateData);
    res.json({
      success: true,
      data: result,
      message: 'Maintenance task updated successfully'
    });
  })
);

module.exports = router;