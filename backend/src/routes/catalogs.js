const express = require('express');
const router = express.Router();

const EquipmentTypeClient = require('../clients/equipmentTypeClient');
const EquipmentMakeClient = require('../clients/equipmentMakeClient');
const EquipmentModelClient = require('../clients/equipmentModelClient');
const EquipmentTrimClient = require('../clients/equipmentTrimClient');
const EquipmentCatalogClient = require('../clients/equipmentCatalogClient');
const PartTypeClient = require('../clients/partTypeClient');
const ConsumableTypeClient = require('../clients/consumableTypeClient');

const {
  asyncHandler,
  AppError
} = require('../middleware/errorHandler');

const { verifyToken, requireAuth, optionalAuth } = require('../middleware/auth');

const {
  validateEquipmentType,
  validateEquipmentMake,
  validateEquipmentModel,
  validateId,
  validateMakeId,
  validateMakeAndModelIds,
  validatePagination,
  validateSearch,
  validatePaginatedQuery,
  validateEquipmentTypesQuery,
  validateEquipmentModelsQuery,
  validateEquipmentTrimsQuery
} = require('../middleware/validation');

// Equipment Types Routes
router.get('/equipment-types', 
  validateEquipmentTypesQuery,
  asyncHandler(async (req, res) => {
    const result = await EquipmentTypeClient.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/equipment-types/dropdown',
  asyncHandler(async (req, res) => {
    const types = await EquipmentTypeClient.findForDropdown();
    res.json({
      success: true,
      data: types
    });
  })
);

router.get('/equipment-types/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const type = await EquipmentTypeClient.findById(req.params.id);
    res.json({
      success: true,
      data: type
    });
  })
);

router.post('/equipment-types',
  optionalAuth,
  asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Equipment type name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Check name uniqueness
    const isUnique = await EquipmentTypeClient.checkNameUnique(name);
    if (!isUnique) {
      throw new AppError('Equipment type name already exists', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    // Add user information to the request body if user is authenticated
    const equipmentTypeData = {
      ...req.body,
      created_by: req.user?.id || null,
      created_in: req.user?.farm_roles?.[0]?.farm?.id || null
    };
    
    const type = await EquipmentTypeClient.create(equipmentTypeData);
    res.status(201).json({
      success: true,
      data: type,
      message: 'Equipment type created successfully'
    });
  })
);

router.put('/equipment-types/:id',
  validateId,
  asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Equipment type name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Check name uniqueness excluding current record
    const isUnique = await EquipmentTypeClient.checkNameUnique(name, req.params.id);
    if (!isUnique) {
      throw new AppError('Equipment type name already exists', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const type = await EquipmentTypeClient.update(req.params.id, req.body);
    res.json({
      success: true,
      data: type,
      message: 'Equipment type updated successfully'
    });
  })
);

router.delete('/equipment-types/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const type = await EquipmentTypeClient.delete(req.params.id);
    res.json({
      success: true,
      data: type,
      message: 'Equipment type deleted successfully'
    });
  })
);

router.get('/equipment-types/statistics',
  asyncHandler(async (req, res) => {
    const stats = await EquipmentTypeClient.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  })
);

// Equipment Makes Routes
router.get('/equipment-makes',
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const result = await EquipmentMakeClient.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/equipment-makes/dropdown',
  asyncHandler(async (req, res) => {
    const makes = await EquipmentMakeClient.findForDropdown();
    res.json({
      success: true,
      data: makes
    });
  })
);

router.get('/equipment-makes/dropdown-with-models',
  asyncHandler(async (req, res) => {
    const makes = await EquipmentMakeClient.findForDropdownWithModels();
    res.json({
      success: true,
      data: makes
    });
  })
);

router.get('/equipment-makes/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const make = await EquipmentMakeClient.findById(req.params.id);
    res.json({
      success: true,
      data: make
    });
  })
);

router.get('/equipment-makes/:id/models',
  validateId,
  asyncHandler(async (req, res) => {
    const models = await EquipmentMakeClient.findModelsForMake(req.params.id);
    res.json({
      success: true,
      data: models
    });
  })
);

router.post('/equipment-makes',
  optionalAuth,
  asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Equipment make name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Check name uniqueness
    const isUnique = await EquipmentMakeClient.checkNameUnique(name);
    if (!isUnique) {
      throw new AppError('Equipment make name already exists', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    // Add user information to the request body if user is authenticated
    const equipmentMakeData = {
      ...req.body,
      created_by: req.user?.id || null,
      created_in: req.user?.farm_roles?.[0]?.farm?.id || null
    };
    
    const make = await EquipmentMakeClient.create(equipmentMakeData);
    res.status(201).json({
      success: true,
      data: make,
      message: 'Equipment make created successfully'
    });
  })
);

router.put('/equipment-makes/:id',
  validateId,
  asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Equipment make name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Check name uniqueness excluding current record
    const isUnique = await EquipmentMakeClient.checkNameUnique(name, req.params.id);
    if (!isUnique) {
      throw new AppError('Equipment make name already exists', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const make = await EquipmentMakeClient.update(req.params.id, req.body);
    res.json({
      success: true,
      data: make,
      message: 'Equipment make updated successfully'
    });
  })
);

router.delete('/equipment-makes/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const make = await EquipmentMakeClient.delete(req.params.id);
    res.json({
      success: true,
      data: make,
      message: 'Equipment make deleted successfully'
    });
  })
);

// Equipment Models Routes
router.get('/equipment-models',
  validateEquipmentModelsQuery,
  asyncHandler(async (req, res) => {
    console.log('DEBUG: Equipment models route - req.query:', req.query);
    const result = await EquipmentModelClient.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/equipment-models/by-make/:makeId',
  validateMakeId,
  asyncHandler(async (req, res) => {
    const models = await EquipmentModelClient.findByMake(req.params.makeId);
    res.json({
      success: true,
      data: models
    });
  })
);

router.get('/equipment-models/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const model = await EquipmentModelClient.findById(req.params.id);
    res.json({
      success: true,
      data: model
    });
  })
);

router.post('/equipment-models',
  optionalAuth,
  asyncHandler(async (req, res, next) => {
    const { name, make } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Equipment model name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    if (!make) {
      throw new AppError('Equipment make is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Validate that the make exists
    const makeExists = await EquipmentMakeClient.findById(make);
    if (!makeExists) {
      throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
    }
    
    // Check name uniqueness for this make
    const isUnique = await EquipmentModelClient.checkNameUniqueForMake(name, make);
    if (!isUnique) {
      throw new AppError('Equipment model name already exists for this make', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    // Add user information to the request body if user is authenticated
    const equipmentModelData = {
      ...req.body,
      created_by: req.user?.id || null,
      created_in: req.user?.farm_roles?.[0]?.farm?.id || null
    };
    
    const model = await EquipmentModelClient.create(equipmentModelData);
    res.status(201).json({
      success: true,
      data: model,
      message: 'Equipment model created successfully'
    });
  })
);

router.put('/equipment-models/:id',
  validateId,
  asyncHandler(async (req, res, next) => {
    const { name, make } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Equipment model name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    if (!make) {
      throw new AppError('Equipment make is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Validate that the make exists
    const makeExists = await EquipmentMakeClient.findById(make);
    if (!makeExists) {
      throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
    }
    
    // Check name uniqueness for this make excluding current record
    const isUnique = await EquipmentModelClient.checkNameUniqueForMake(name, make, req.params.id);
    if (!isUnique) {
      throw new AppError('Equipment model name already exists for this make', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const model = await EquipmentModelClient.update(req.params.id, req.body);
    res.json({
      success: true,
      data: model,
      message: 'Equipment model updated successfully'
    });
  })
);

router.delete('/equipment-models/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const model = await EquipmentModelClient.delete(req.params.id);
    res.json({
      success: true,
      data: model,
      message: 'Equipment model deleted successfully'
    });
  })
);

// Equipment Trims Routes
router.get('/equipment-trims',
  validateEquipmentTrimsQuery,
  asyncHandler(async (req, res) => {
    const result = await EquipmentTrimClient.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/equipment-trims/dropdown',
  asyncHandler(async (req, res) => {
    const { make, model } = req.query;
    const trims = await EquipmentTrimClient.findForDropdown(make, model);
    res.json({
      success: true,
      data: trims
    });
  })
);

router.get('/equipment-trims/by-make-model/:makeId/:modelId',
  validateMakeAndModelIds,
  asyncHandler(async (req, res) => {
    const trims = await EquipmentTrimClient.findByMakeAndModel(req.params.makeId, req.params.modelId);
    res.json({
      success: true,
      data: trims
    });
  })
);

router.get('/equipment-trims/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const trim = await EquipmentTrimClient.findById(req.params.id);
    res.json({
      success: true,
      data: trim
    });
  })
);

router.post('/equipment-trims',
  optionalAuth,
  asyncHandler(async (req, res, next) => {
    const { name, make, model } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Equipment trim name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Validate references exist if provided
    if (make) {
      const makeExists = await EquipmentMakeClient.findById(make);
      if (!makeExists) {
        throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
      }
    }
    
    if (model) {
      const modelExists = await EquipmentModelClient.findById(model);
      if (!modelExists) {
        throw new AppError('Referenced equipment model not found', 400, 'INVALID_MODEL_REFERENCE');
      }
      
      // Validate model belongs to make if both are provided
      if (make && modelExists.make !== make) {
        throw new AppError('Selected model does not belong to the selected make', 400, 'INVALID_MODEL_MAKE_COMBINATION');
      }
    }
    
    // Check name uniqueness within make/model combination
    const isUnique = await EquipmentTrimClient.checkNameUnique(name, null, make, model);
    if (!isUnique) {
      throw new AppError('Equipment trim name already exists for this make/model combination', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    // Add user information to the request body if user is authenticated
    const equipmentTrimData = {
      ...req.body,
      created_by: req.user?.id || null,
      created_in: req.user?.farm_roles?.[0]?.farm?.id || null
    };
    
    const trim = await EquipmentTrimClient.create(equipmentTrimData);
    res.status(201).json({
      success: true,
      data: trim,
      message: 'Equipment trim created successfully'
    });
  })
);

router.put('/equipment-trims/:id',
  validateId,
  asyncHandler(async (req, res, next) => {
    const { name, make, model } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Equipment trim name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Validate references exist if provided
    if (make) {
      const makeExists = await EquipmentMakeClient.findById(make);
      if (!makeExists) {
        throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
      }
    }
    
    if (model) {
      const modelExists = await EquipmentModelClient.findById(model);
      if (!modelExists) {
        throw new AppError('Referenced equipment model not found', 400, 'INVALID_MODEL_REFERENCE');
      }
      
      // Validate model belongs to make if both are provided
      if (make && modelExists.make !== make) {
        throw new AppError('Selected model does not belong to the selected make', 400, 'INVALID_MODEL_MAKE_COMBINATION');
      }
    }
    
    // Check name uniqueness within make/model combination excluding current record
    const isUnique = await EquipmentTrimClient.checkNameUnique(name, req.params.id, make, model);
    if (!isUnique) {
      throw new AppError('Equipment trim name already exists for this make/model combination', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const trim = await EquipmentTrimClient.update(req.params.id, req.body);
    res.json({
      success: true,
      data: trim,
      message: 'Equipment trim updated successfully'
    });
  })
);

router.delete('/equipment-trims/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const trim = await EquipmentTrimClient.delete(req.params.id);
    res.json({
      success: true,
      data: trim,
      message: 'Equipment trim deleted successfully'
    });
  })
);

// Equipment Catalog Routes (_equipment table)
router.get('/equipment-catalog',
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const result = await EquipmentCatalogClient.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/equipment-catalog/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const equipment = await EquipmentCatalogClient.findById(req.params.id);
    res.json({
      success: true,
      data: equipment
    });
  })
);

router.get('/equipment-models/:makeId/:modelId/trims',
  validateMakeAndModelIds,
  asyncHandler(async (req, res) => {
    const trims = await EquipmentCatalogClient.findTrimsForModel(req.params.makeId, req.params.modelId);
    res.json({
      success: true,
      data: trims
    });
  })
);

router.post('/equipment-catalog',
  // Validate equipment catalog creation
  asyncHandler(async (req, res, next) => {
    const { type, make, model, trim, year } = req.body;
    
    // Validate required fields
    if (!type || !make || !model) {
      throw new AppError('Type, make, and model are required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Validate references exist
    const [typeExists, makeExists, modelExists] = await Promise.all([
      EquipmentTypeClient.findById(type),
      EquipmentMakeClient.findById(make),
      EquipmentModelClient.findById(model)
    ]);
    
    if (!typeExists) {
      throw new AppError('Referenced equipment type not found', 400, 'INVALID_TYPE_REFERENCE');
    }
    if (!makeExists) {
      throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
    }
    if (!modelExists) {
      throw new AppError('Referenced equipment model not found', 400, 'INVALID_MODEL_REFERENCE');
    }
    
    // Validate model belongs to make
    if (modelExists.make !== make) {
      throw new AppError('Selected model does not belong to the selected make', 400, 'INVALID_MODEL_MAKE_COMBINATION');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const equipment = await EquipmentCatalogClient.create(req.body);
    res.status(201).json({
      success: true,
      data: equipment,
      message: 'Equipment catalog entry created successfully'
    });
  })
);

router.put('/equipment-catalog/:id',
  validateId,
  asyncHandler(async (req, res, next) => {
    const { type, make, model, trim, year } = req.body;
    
    // Validate required fields
    if (!type || !make || !model) {
      throw new AppError('Type, make, and model are required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Validate references exist
    const [typeExists, makeExists, modelExists] = await Promise.all([
      EquipmentTypeClient.findById(type),
      EquipmentMakeClient.findById(make),
      EquipmentModelClient.findById(model)
    ]);
    
    if (!typeExists) {
      throw new AppError('Referenced equipment type not found', 400, 'INVALID_TYPE_REFERENCE');
    }
    if (!makeExists) {
      throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
    }
    if (!modelExists) {
      throw new AppError('Referenced equipment model not found', 400, 'INVALID_MODEL_REFERENCE');
    }
    
    // Validate model belongs to make
    if (modelExists.make !== make) {
      throw new AppError('Selected model does not belong to the selected make', 400, 'INVALID_MODEL_MAKE_COMBINATION');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const equipment = await EquipmentCatalogClient.update(req.params.id, req.body);
    res.json({
      success: true,
      data: equipment,
      message: 'Equipment catalog entry updated successfully'
    });
  })
);

router.delete('/equipment-catalog/:id',
  validateId,
  asyncHandler(async (req, res) => {
    await EquipmentCatalogClient.delete(req.params.id);
    res.json({
      success: true,
      message: 'Equipment catalog entry deleted successfully'
    });
  })
);

// Part Types Routes
router.get('/part-types',
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const result = await PartTypeClient.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/part-types/dropdown',
  asyncHandler(async (req, res) => {
    const partTypes = await PartTypeClient.findForDropdown();
    res.json({
      success: true,
      data: partTypes
    });
  })
);

router.get('/part-types/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const partType = await PartTypeClient.findById(req.params.id);
    res.json({
      success: true,
      data: partType
    });
  })
);

router.post('/part-types',
  optionalAuth,
  asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Part type name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Check name uniqueness
    const isUnique = await PartTypeClient.checkNameUnique(name);
    if (!isUnique) {
      throw new AppError('Part type name already exists', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    // Add user information to the request body if user is authenticated
    const partTypeData = {
      ...req.body,
      created_by: req.user?.id || null,
      created_in: req.user?.farm_roles?.[0]?.farm?.id || null
    };
    
    const partType = await PartTypeClient.create(partTypeData);
    res.status(201).json({
      success: true,
      data: partType,
      message: 'Part type created successfully'
    });
  })
);

router.put('/part-types/:id',
  validateId,
  asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Part type name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Check name uniqueness excluding current record
    const isUnique = await PartTypeClient.checkNameUnique(name, req.params.id);
    if (!isUnique) {
      throw new AppError('Part type name already exists', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const partType = await PartTypeClient.update(req.params.id, req.body);
    res.json({
      success: true,
      data: partType,
      message: 'Part type updated successfully'
    });
  })
);

router.delete('/part-types/:id',
  validateId,
  asyncHandler(async (req, res) => {
    await PartTypeClient.delete(req.params.id);
    res.json({
      success: true,
      message: 'Part type deleted successfully'
    });
  })
);

// Consumable Types Routes
router.get('/consumable-types',
  validatePaginatedQuery,
  asyncHandler(async (req, res) => {
    const result = await ConsumableTypeClient.findAll(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  })
);

router.get('/consumable-types/dropdown',
  asyncHandler(async (req, res) => {
    const consumableTypes = await ConsumableTypeClient.findForDropdown();
    res.json({
      success: true,
      data: consumableTypes
    });
  })
);

router.get('/consumable-types/:id',
  validateId,
  asyncHandler(async (req, res) => {
    const consumableType = await ConsumableTypeClient.findById(req.params.id);
    res.json({
      success: true,
      data: consumableType
    });
  })
);

router.post('/consumable-types',
  optionalAuth,
  asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Consumable type name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Check name uniqueness
    const isUnique = await ConsumableTypeClient.checkNameUnique(name);
    if (!isUnique) {
      throw new AppError('Consumable type name already exists', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    // Add user information to the request body if user is authenticated
    const consumableTypeData = {
      ...req.body,
      created_by: req.user?.id || null,
      created_in: req.user?.farm_roles?.[0]?.farm?.id || null
    };
    
    const consumableType = await ConsumableTypeClient.create(consumableTypeData);
    res.status(201).json({
      success: true,
      data: consumableType,
      message: 'Consumable type created successfully'
    });
  })
);

router.put('/consumable-types/:id',
  validateId,
  asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      throw new AppError('Consumable type name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }
    
    // Check name uniqueness excluding current record
    const isUnique = await ConsumableTypeClient.checkNameUnique(name, req.params.id);
    if (!isUnique) {
      throw new AppError('Consumable type name already exists', 409, 'DUPLICATE_NAME');
    }
    
    next();
  }),
  asyncHandler(async (req, res) => {
    const consumableType = await ConsumableTypeClient.update(req.params.id, req.body);
    res.json({
      success: true,
      data: consumableType,
      message: 'Consumable type updated successfully'
    });
  })
);

router.delete('/consumable-types/:id',
  validateId,
  asyncHandler(async (req, res) => {
    await ConsumableTypeClient.delete(req.params.id);
    res.json({
      success: true,
      message: 'Consumable type deleted successfully'
    });
  })
);

module.exports = router;