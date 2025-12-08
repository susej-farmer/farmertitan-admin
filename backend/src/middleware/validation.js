const Joi = require('joi');
const { AppError } = require('./errorHandler');

// Common validation schemas
const commonSchemas = {
  uuid: Joi.string().uuid({ version: 'uuidv4' }),
  id: Joi.alternatives().try(
    Joi.string().uuid({ version: 'uuidv4' }),
    Joi.number().integer().positive()
  ),
  pagination: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sort: Joi.string(),
    order: Joi.string().valid('asc', 'desc'),
    search: Joi.string().allow('', null).max(100),
    is_active: Joi.boolean().allow(null),
    user_id: Joi.string().uuid().allow(null)
  }).options({ stripUnknown: false }),
  search: Joi.object({
    query: Joi.string().min(1).max(255),
    field: Joi.string().default('name')
  })
};

// Equipment validation schemas
const equipmentSchemas = {
  equipmentType: Joi.object({
    name: Joi.string().required().min(1).max(255).trim(),
    description: Joi.string().allow('', null).max(1000).trim()
  }),
  
  equipmentMake: Joi.object({
    name: Joi.string().required().min(1).max(255).trim()
  }),
  
  equipmentModel: Joi.object({
    name: Joi.string().required().min(1).max(255).trim(),
    make: commonSchemas.uuid.required()
  }),
  
  equipmentTrim: Joi.object({
    name: Joi.string().required().min(1).max(255).trim(),
    make: commonSchemas.uuid.required(),
    model: commonSchemas.uuid.required()
  }),
  
  equipmentCatalog: Joi.object({
    type: commonSchemas.uuid.required(),
    make: commonSchemas.uuid.required(),
    model: commonSchemas.uuid.required(),
    trim: commonSchemas.uuid.allow(null),
    year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 5),
    metadata: Joi.object().default({})
  }),
  
  equipment: Joi.object({
    name: Joi.string().required().min(1).max(255).trim(),
    _equipment: commonSchemas.uuid.required(),
    initial_usage_value: Joi.number().min(0).required(),
    initial_usage_type: Joi.string().valid('Hours', 'Kilometers', 'Miles').required(),
    serial_number: Joi.string().max(255).trim(),
    year_purchased: Joi.number().integer().min(1900).max(new Date().getFullYear()),
    metadata: Joi.object().default({})
  })
};

// Parts and consumables schemas
const partsSchemas = {
  partType: Joi.object({
    name: Joi.string().required().min(1).max(255).trim(),
    description: Joi.string().allow('', null).max(1000).trim()
  }),
  
  consumableType: Joi.object({
    name: Joi.string().required().min(1).max(255).trim(),
    description: Joi.string().allow('', null).max(1000).trim()
  })
};

// Maintenance template schemas
const maintenanceSchemas = {
  maintenanceTemplate: Joi.object({
    interval: Joi.number().integer().min(1).required(),
    schedule_type: Joi.string().valid('Hours', 'Kilometers').required(),
    equipment_type: commonSchemas.uuid.required(),
    maintenance_name: Joi.string().required().min(1).max(255).trim(),
    maintenance_description: Joi.string().required().min(1).max(1000).trim(),
    maintenance_category: Joi.string().valid('Part', 'Consumable').required(),
    part_or_consumable: commonSchemas.uuid.required(),
    specific_equipment: commonSchemas.uuid.allow(null),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium')
  })
};

// Farm schemas
const farmSchemas = {
  farm: Joi.object({
    name: Joi.string().required().min(1).max(255).trim(),
    acres: Joi.number().positive().precision(2).required(),
    metadata: Joi.object().default({}),
    active: Joi.boolean().default(true)
  }),
  
  farmUser: Joi.object({
    user: commonSchemas.uuid.required(),
    role: Joi.string().valid('admin', 'manager', 'worker').default('admin')
  }),
  
  farmUpdate: Joi.object({
    name: Joi.string().min(1).max(255).trim(),
    acres: Joi.number().positive().precision(2),
    metadata: Joi.object(),
    active: Joi.boolean()
  }).min(1) // At least one field must be provided
};

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      return next(error);
    }

    // Replace the original data with validated/sanitized data
    req[source] = value;
    next();
  };
};

// Validation middleware for different sources
const validateBody = (schema) => validate(schema, 'body');
const validateQuery = (schema) => validate(schema, 'query');
const validateParams = (schema) => validate(schema, 'params');

// Common parameter validations
const validateId = validateParams(Joi.object({
  id: commonSchemas.id.required()
}));

const validateMakeId = validateParams(Joi.object({
  makeId: commonSchemas.id.required()
}));

const validateMakeAndModelIds = validateParams(Joi.object({
  makeId: commonSchemas.id.required(),
  modelId: commonSchemas.id.required()
}));

// Universal query validation combining pagination and search
const validatePaginatedQuery = validateQuery(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().min(1).max(255).allow(''),
  is_active: Joi.boolean().allow(null),
  user_id: Joi.string().uuid().allow(null),
  status: Joi.string().allow(null),
  equipment_type: Joi.string().uuid().allow(null),
  equipment_make: Joi.string().uuid().allow(null),
  equipment_model: Joi.string().uuid().allow(null),
  equipment_trim: Joi.string().uuid().allow(null),
  type_id: Joi.string().uuid().allow(null),
  make_id: Joi.string().uuid().allow(null),
  model_id: Joi.string().uuid().allow(null),
  year: Joi.number().integer().allow(null)
}));

// Custom validation for equipment types with search (alias for backward compatibility)
const validateEquipmentTypesQuery = validatePaginatedQuery;

// Custom validation for equipment models with filtering
const validateEquipmentModelsQuery = validateQuery(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().min(1).max(255).allow(''),
  makeId: commonSchemas.uuid.allow('').allow(null),
  equipment_make_id: commonSchemas.uuid.allow('').allow(null),
  equipment_make: commonSchemas.uuid.allow('').allow(null)
}));

// Custom validation for equipment trims with filtering
const validateEquipmentTrimsQuery = validateQuery(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default('created_at'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().min(1).max(255).allow(''),
  make: commonSchemas.uuid.allow(''),
  model: commonSchemas.uuid.allow('')
}));

// Equipment validations
const validateEquipmentType = validateBody(equipmentSchemas.equipmentType);
const validateEquipmentMake = validateBody(equipmentSchemas.equipmentMake);
const validateEquipmentModel = validateBody(equipmentSchemas.equipmentModel);
const validateEquipmentTrim = validateBody(equipmentSchemas.equipmentTrim);
const validateEquipmentCatalog = validateBody(equipmentSchemas.equipmentCatalog);
const validateEquipment = validateBody(equipmentSchemas.equipment);

// Parts validations
const validatePartType = validateBody(partsSchemas.partType);
const validateConsumableType = validateBody(partsSchemas.consumableType);

// Maintenance validations
const validateMaintenanceTemplate = validateBody(maintenanceSchemas.maintenanceTemplate);

// Farm validations
const validateFarm = validateBody(farmSchemas.farm);
const validateFarmUser = validateBody(farmSchemas.farmUser);
const validateFarmUpdate = validateBody(farmSchemas.farmUpdate);

// Custom validation helpers
const validateUniqueField = (tableName, fieldName, excludeId = null) => {
  return async (req, res, next) => {
    try {
      const db = require('../database/connection');
      const value = req.body[fieldName];
      
      if (!value) {
        return next();
      }

      let query = `SELECT id FROM ${tableName} WHERE ${fieldName} = $1`;
      const params = [value];

      if (excludeId) {
        query += ' AND id != $2';
        params.push(excludeId);
      }

      const result = await db.query(query, params);

      if (result.rows.length > 0) {
        return next(new AppError(
          `${fieldName} already exists`,
          409,
          'DUPLICATE_FIELD',
          { field: fieldName, value }
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

const validateForeignKey = (tableName, fieldName, foreignTable, foreignField = 'id') => {
  return async (req, res, next) => {
    try {
      const db = require('../database/connection');
      const value = req.body[fieldName];

      if (!value) {
        return next();
      }

      const query = `SELECT ${foreignField} FROM ${foreignTable} WHERE ${foreignField} = $1`;
      const result = await db.query(query, [value]);

      if (result.rows.length === 0) {
        return next(new AppError(
          `Invalid ${fieldName}: referenced ${foreignTable} does not exist`,
          400,
          'INVALID_FOREIGN_KEY',
          { field: fieldName, value, foreignTable }
        ));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateId,
  validateMakeId,
  validateMakeAndModelIds,
  validatePaginatedQuery,
  validateEquipmentTypesQuery,
  validateEquipmentModelsQuery,
  validateEquipmentTrimsQuery,
  validateEquipmentType,
  validateEquipmentMake,
  validateEquipmentModel,
  validateEquipmentTrim,
  validateEquipmentCatalog,
  validateEquipment,
  validatePartType,
  validateConsumableType,
  validateMaintenanceTemplate,
  validateFarm,
  validateFarmUser,
  validateFarmUpdate,
  validateUniqueField,
  validateForeignKey,
  schemas: {
    common: commonSchemas,
    equipment: equipmentSchemas,
    parts: partsSchemas,
    maintenance: maintenanceSchemas,
    farm: farmSchemas
  }
};