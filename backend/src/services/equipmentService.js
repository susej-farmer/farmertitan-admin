const EquipmentCatalogClient = require('../clients/equipmentCatalogClient');
const EquipmentTypeService = require('./equipmentTypeService');
const EquipmentMakeService = require('./equipmentMakeService');
const { AppError } = require('../middleware/errorHandler');

class EquipmentService {
  static async findAll(options = {}) {
    try {
      // Validate and sanitize input options
      const validatedOptions = this.validateFindAllOptions(options);
      
      // Call the client to get data
      const result = await EquipmentCatalogClient.findAll(validatedOptions);
      
      // Apply any business logic transformations here if needed
      return result;
    } catch (error) {
      console.error('Error in EquipmentService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      // Validate ID
      if (!id) {
        throw new AppError('Equipment ID is required', 400, 'MISSING_ID');
      }

      const equipment = await EquipmentCatalogClient.findById(id);
      
      // Apply any business logic transformations here if needed
      return equipment;
    } catch (error) {
      console.error('Error in EquipmentService.findById:', error);
      throw error;
    }
  }

  static async findTrimsForModel(makeId, modelId) {
    try {
      // Validate IDs
      if (!makeId || !modelId) {
        throw new AppError('Make ID and Model ID are required', 400, 'MISSING_IDS');
      }

      const trims = await EquipmentCatalogClient.findTrimsForModel(makeId, modelId);
      
      // Apply any business logic transformations here if needed
      return trims;
    } catch (error) {
      console.error('Error in EquipmentService.findTrimsForModel:', error);
      throw error;
    }
  }

  static async create(equipmentData) {
    try {
      // Validate input data
      this.validateCreateData(equipmentData);
      
      // Check business rules
      await this.checkBusinessRulesForCreate(equipmentData);
      
      const newEquipment = await EquipmentCatalogClient.create(equipmentData);
      
      // Apply any post-creation business logic here if needed
      return newEquipment;
    } catch (error) {
      console.error('Error in EquipmentService.create:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Equipment ID is required', 400, 'MISSING_ID');
      }
      
      this.validateUpdateData(updateData);
      
      // Check business rules
      await this.checkBusinessRulesForUpdate(id, updateData);
      
      const updatedEquipment = await EquipmentCatalogClient.update(id, updateData);
      
      // Apply any post-update business logic here if needed
      return updatedEquipment;
    } catch (error) {
      console.error('Error in EquipmentService.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Equipment ID is required', 400, 'MISSING_ID');
      }
      
      // Check business rules for deletion
      await this.checkBusinessRulesForDelete(id);
      
      const result = await EquipmentCatalogClient.delete(id);
      
      // Apply any post-deletion business logic here if needed
      return result;
    } catch (error) {
      console.error('Error in EquipmentService.delete:', error);
      throw error;
    }
  }

  static async findByTypeModelTrim(type, make, model, trim = null, year = null) {
    try {
      // Validate required parameters
      if (!type || !make || !model) {
        throw new AppError('Type, make, and model are required', 400, 'MISSING_REQUIRED_PARAMS');
      }

      const equipment = await EquipmentCatalogClient.findByTypeModelTrim(type, make, model, trim, year);
      
      // Apply any business logic transformations here if needed
      return equipment;
    } catch (error) {
      console.error('Error in EquipmentService.findByTypeModelTrim:', error);
      throw error;
    }
  }

  // Private validation methods
  static validateFindAllOptions(options) {
    const {
      page = 1,
      limit = 20,
      search = '',
      typeId = null,
      makeId = null,
      modelId = null
    } = options;

    // Validate page and limit
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 items per page

    // Validate search (sanitize)
    const validatedSearch = typeof search === 'string' ? search.trim().substring(0, 100) : '';

    // Validate filter IDs
    const validatedTypeId = typeId && !isNaN(typeId) ? parseInt(typeId) : null;
    const validatedMakeId = makeId && !isNaN(makeId) ? parseInt(makeId) : null;
    const validatedModelId = modelId && !isNaN(modelId) ? parseInt(modelId) : null;

    return {
      page: validatedPage,
      limit: validatedLimit,
      search: validatedSearch,
      typeId: validatedTypeId,
      makeId: validatedMakeId,
      modelId: validatedModelId
    };
  }

  static validateCreateData(equipmentData) {
    if (!equipmentData) {
      throw new AppError('Equipment data is required', 400, 'MISSING_DATA');
    }

    const { type, make, model } = equipmentData;

    if (!type) {
      throw new AppError('Equipment type is required', 400, 'MISSING_TYPE');
    }

    if (!make) {
      throw new AppError('Equipment make is required', 400, 'MISSING_MAKE');
    }

    if (!model) {
      throw new AppError('Equipment model is required', 400, 'MISSING_MODEL');
    }

    // Validate year if provided
    if (equipmentData.year !== undefined) {
      const year = parseInt(equipmentData.year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 2) {
        throw new AppError('Year must be between 1900 and ' + (currentYear + 2), 400, 'INVALID_YEAR');
      }
    }
  }

  static validateUpdateData(updateData) {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError('Update data is required', 400, 'MISSING_DATA');
    }

    const { type, make, model } = updateData;

    if (type !== undefined && !type) {
      throw new AppError('Equipment type cannot be empty', 400, 'INVALID_TYPE');
    }

    if (make !== undefined && !make) {
      throw new AppError('Equipment make cannot be empty', 400, 'INVALID_MAKE');
    }

    if (model !== undefined && !model) {
      throw new AppError('Equipment model cannot be empty', 400, 'INVALID_MODEL');
    }

    // Validate year if provided
    if (updateData.year !== undefined) {
      const year = parseInt(updateData.year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 2) {
        throw new AppError('Year must be between 1900 and ' + (currentYear + 2), 400, 'INVALID_YEAR');
      }
    }
  }

  static async checkBusinessRulesForCreate(equipmentData) {
    const { type, make, model } = equipmentData;

    // Validate that referenced entities exist
    try {
      await EquipmentTypeService.findById(type);
    } catch (error) {
      throw new AppError('Referenced equipment type not found', 400, 'INVALID_TYPE_REFERENCE');
    }

    try {
      await EquipmentMakeService.findById(make);
    } catch (error) {
      throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
    }

    // Additional validation could include checking if model belongs to make, etc.
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    // Check if equipment exists first
    await EquipmentCatalogClient.findById(id);

    const { type, make, model } = updateData;

    // Validate that referenced entities exist if being updated
    if (type) {
      try {
        await EquipmentTypeService.findById(type);
      } catch (error) {
        throw new AppError('Referenced equipment type not found', 400, 'INVALID_TYPE_REFERENCE');
      }
    }

    if (make) {
      try {
        await EquipmentMakeService.findById(make);
      } catch (error) {
        throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
      }
    }
  }

  static async checkBusinessRulesForDelete(id) {
    // Check if equipment exists first
    await EquipmentCatalogClient.findById(id);
    
    // Add business rules for deletion here if needed
    // For example: check if equipment is currently in use, has maintenance records, etc.
  }
}

module.exports = EquipmentService;