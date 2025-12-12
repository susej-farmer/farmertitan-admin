const express = require('express');
const router = express.Router();

const EquipmentTypeService = require('../services/equipmentTypeService');
const EquipmentMakeService = require('../services/equipmentMakeService');
const EquipmentModelService = require('../services/equipmentModelService');
const EquipmentTrimService = require('../services/equipmentTrimService');
const EquipmentCatalogService = require('../services/equipmentCatalogService');
const PartTypeService = require('../services/partTypeService');
const ConsumableTypeService = require('../services/consumableTypeService');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

const { verifyToken, requireAuth } = require('../middleware/auth');

const {
  validateEquipmentType,
  validateEquipmentMake,
  validateEquipmentModel,
  validateId,
  validateMakeId,
  validateMakeAndModelIds,
  validatePaginatedQuery,
  validateEquipmentTypesQuery,
  validateEquipmentModelsQuery,
  validateEquipmentTrimsQuery
} = require('../middleware/validation');

// Equipment Types Routes
router.get('/equipment-types',
  verifyToken,
  requireAuth,
  validateEquipmentTypesQuery,
  asyncHandler(async (req, res) => {
    const result = await EquipmentTypeService.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/equipment-types/dropdown',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const types = await EquipmentTypeService.findForDropdown();
    res.json({
      success: true,
      data: types
    });
  })
);

router.get('/equipment-types/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const type = await EquipmentTypeService.findById(req.params.id);
    res.json({
      success: true,
      data: type
    });
  })
);

router.post('/equipment-types',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    // Prepare user context
    const userContext = {
      userId: req.user.id,
      farmId: req.user.farm_roles?.[0]?.farm?.id || null
    };

    const type = await EquipmentTypeService.create(req.body, userContext);
    res.status(201).json({
      success: true,
      data: type,
      message: 'Equipment type created successfully'
    });
  })
);

router.put('/equipment-types/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const type = await EquipmentTypeService.update(req.params.id, req.body);
    res.json({
      success: true,
      data: type,
      message: 'Equipment type updated successfully'
    });
  })
);

router.delete('/equipment-types/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const type = await EquipmentTypeService.delete(req.params.id);
    res.json({
      success: true,
      data: type,
      message: 'Equipment type deleted successfully'
    });
  })
);

router.get('/equipment-types/statistics',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const stats = await EquipmentTypeService.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  })
);

// Equipment Makes Routes
router.get('/equipment-makes',
  verifyToken,
  requireAuth,
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const result = await EquipmentMakeService.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/equipment-makes/dropdown',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const makes = await EquipmentMakeService.findForDropdown();
    res.json({
      success: true,
      data: makes
    });
  })
);

router.get('/equipment-makes/dropdown-with-models',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const makes = await EquipmentMakeService.findForDropdownWithModels();
    res.json({
      success: true,
      data: makes
    });
  })
);

router.get('/equipment-makes/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const make = await EquipmentMakeService.findById(req.params.id);
    res.json({
      success: true,
      data: make
    });
  })
);

router.get('/equipment-makes/:id/models',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const models = await EquipmentMakeService.findModelsForMake(req.params.id);
    res.json({
      success: true,
      data: models
    });
  })
);

router.post('/equipment-makes',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    // Prepare user context
    const userContext = {
      userId: req.user.id,
      farmId: req.user.farm_roles?.[0]?.farm?.id || null
    };

    const make = await EquipmentMakeService.create(req.body, userContext);
    res.status(201).json({
      success: true,
      data: make,
      message: 'Equipment make created successfully'
    });
  })
);

router.put('/equipment-makes/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const make = await EquipmentMakeService.update(req.params.id, req.body);
    res.json({
      success: true,
      data: make,
      message: 'Equipment make updated successfully'
    });
  })
);

router.delete('/equipment-makes/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const make = await EquipmentMakeService.delete(req.params.id);
    res.json({
      success: true,
      data: make,
      message: 'Equipment make deleted successfully'
    });
  })
);

// Equipment Models Routes
router.get('/equipment-models',
  verifyToken,
  requireAuth,
  validateEquipmentModelsQuery,
  asyncHandler(async (req, res) => {
    console.log('DEBUG: Equipment models route - req.query:', req.query);
    const result = await EquipmentModelService.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/equipment-models/by-make/:makeId',
  verifyToken,
  requireAuth,
  validateMakeId,
  asyncHandler(async (req, res) => {
    const models = await EquipmentModelService.findByMake(req.params.makeId);
    res.json({
      success: true,
      data: models
    });
  })
);

router.get('/equipment-models/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const model = await EquipmentModelService.findById(req.params.id);
    res.json({
      success: true,
      data: model
    });
  })
);

router.post('/equipment-models',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    // Prepare user context
    const userContext = {
      userId: req.user.id,
      farmId: req.user.farm_roles?.[0]?.farm?.id || null
    };

    const model = await EquipmentModelService.create(req.body, userContext);
    res.status(201).json({
      success: true,
      data: model,
      message: 'Equipment model created successfully'
    });
  })
);

router.put('/equipment-models/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const model = await EquipmentModelService.update(req.params.id, req.body);
    res.json({
      success: true,
      data: model,
      message: 'Equipment model updated successfully'
    });
  })
);

router.delete('/equipment-models/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const model = await EquipmentModelService.delete(req.params.id);
    res.json({
      success: true,
      data: model,
      message: 'Equipment model deleted successfully'
    });
  })
);

// Equipment Trims Routes
router.get('/equipment-trims',
  verifyToken,
  requireAuth,
  validateEquipmentTrimsQuery,
  asyncHandler(async (req, res) => {
    const result = await EquipmentTrimService.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/equipment-trims/dropdown',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { make, model } = req.query;
    const trims = await EquipmentTrimService.findForDropdown(make, model);
    res.json({
      success: true,
      data: trims
    });
  })
);

router.get('/equipment-trims/by-make-model/:makeId/:modelId',
  verifyToken,
  requireAuth,
  validateMakeAndModelIds,
  asyncHandler(async (req, res) => {
    const trims = await EquipmentTrimService.findByMakeAndModel(req.params.makeId, req.params.modelId);
    res.json({
      success: true,
      data: trims
    });
  })
);

router.get('/equipment-trims/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const trim = await EquipmentTrimService.findById(req.params.id);
    res.json({
      success: true,
      data: trim
    });
  })
);

router.post('/equipment-trims',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    // Prepare user context
    const userContext = {
      userId: req.user.id,
      farmId: req.user.farm_roles?.[0]?.farm?.id || null
    };

    const trim = await EquipmentTrimService.create(req.body, userContext);
    res.status(201).json({
      success: true,
      data: trim,
      message: 'Equipment trim created successfully'
    });
  })
);

router.put('/equipment-trims/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const trim = await EquipmentTrimService.update(req.params.id, req.body);
    res.json({
      success: true,
      data: trim,
      message: 'Equipment trim updated successfully'
    });
  })
);

router.delete('/equipment-trims/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const trim = await EquipmentTrimService.delete(req.params.id);
    res.json({
      success: true,
      data: trim,
      message: 'Equipment trim deleted successfully'
    });
  })
);

// Equipment Catalog Routes (_equipment table)
router.get('/equipment-catalog',
  verifyToken,
  requireAuth,
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const result = await EquipmentCatalogService.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/equipment-catalog/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const equipment = await EquipmentCatalogService.findById(req.params.id);
    res.json({
      success: true,
      data: equipment
    });
  })
);

router.get('/equipment-models/:makeId/:modelId/trims',
  verifyToken,
  requireAuth,
  validateMakeAndModelIds,
  asyncHandler(async (req, res) => {
    const trims = await EquipmentCatalogService.findTrimsForModel(req.params.makeId, req.params.modelId);
    res.json({
      success: true,
      data: trims
    });
  })
);

router.post('/equipment-catalog',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const equipment = await EquipmentCatalogService.create(req.body);
    res.status(201).json({
      success: true,
      data: equipment,
      message: 'Equipment catalog entry created successfully'
    });
  })
);

router.put('/equipment-catalog/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const equipment = await EquipmentCatalogService.update(req.params.id, req.body);
    res.json({
      success: true,
      data: equipment,
      message: 'Equipment catalog entry updated successfully'
    });
  })
);

router.delete('/equipment-catalog/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    await EquipmentCatalogService.delete(req.params.id);
    res.json({
      success: true,
      message: 'Equipment catalog entry deleted successfully'
    });
  })
);

// Part Types Routes
router.get('/part-types',
  verifyToken,
  requireAuth,
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const result = await PartTypeService.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/part-types/dropdown',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const partTypes = await PartTypeService.findForDropdown();
    res.json({
      success: true,
      data: partTypes
    });
  })
);

router.get('/part-types/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const partType = await PartTypeService.findById(req.params.id);
    res.json({
      success: true,
      data: partType
    });
  })
);

router.post('/part-types',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    // Prepare user context
    const userContext = {
      userId: req.user.id,
      farmId: req.user.farm_roles?.[0]?.farm?.id || null
    };

    const partType = await PartTypeService.create(req.body, userContext);
    res.status(201).json({
      success: true,
      data: partType,
      message: 'Part type created successfully'
    });
  })
);

router.put('/part-types/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const partType = await PartTypeService.update(req.params.id, req.body);
    res.json({
      success: true,
      data: partType,
      message: 'Part type updated successfully'
    });
  })
);

router.delete('/part-types/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    await PartTypeService.delete(req.params.id);
    res.json({
      success: true,
      message: 'Part type deleted successfully'
    });
  })
);

// Consumable Types Routes
router.get('/consumable-types',
  verifyToken,
  requireAuth,
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const result = await ConsumableTypeService.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/consumable-types/dropdown',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    const consumableTypes = await ConsumableTypeService.findForDropdown();
    res.json({
      success: true,
      data: consumableTypes
    });
  })
);

router.get('/consumable-types/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const consumableType = await ConsumableTypeService.findById(req.params.id);
    res.json({
      success: true,
      data: consumableType
    });
  })
);

router.post('/consumable-types',
  verifyToken,
  requireAuth,
  asyncHandler(async (req, res) => {
    // Prepare user context
    const userContext = {
      userId: req.user.id,
      farmId: req.user.farm_roles?.[0]?.farm?.id || null
    };

    const consumableType = await ConsumableTypeService.create(req.body, userContext);
    res.status(201).json({
      success: true,
      data: consumableType,
      message: 'Consumable type created successfully'
    });
  })
);

router.put('/consumable-types/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    const consumableType = await ConsumableTypeService.update(req.params.id, req.body);
    res.json({
      success: true,
      data: consumableType,
      message: 'Consumable type updated successfully'
    });
  })
);

router.delete('/consumable-types/:id',
  verifyToken,
  requireAuth,
  validateId,
  asyncHandler(async (req, res) => {
    await ConsumableTypeService.delete(req.params.id);
    res.json({
      success: true,
      message: 'Consumable type deleted successfully'
    });
  })
);

module.exports = router;