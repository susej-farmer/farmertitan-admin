const EquipmentTrimClient = require('../clients/equipmentTrimClient');
const EquipmentMakeService = require('./equipmentMakeService');
const EquipmentModelService = require('./equipmentModelService');
const { AppError } = require('../middleware/errorHandler');

class EquipmentTrimService {
  static async findAll(options = {}) {
    try {
      // Validate and sanitize input options
      const validatedOptions = this.validateFindAllOptions(options);
      
      // Call the client to get data
      const result = await EquipmentTrimClient.findAll(validatedOptions);
      
      // Apply any business logic transformations here if needed
      return result;
    } catch (error) {
      console.error('Error in EquipmentTrimService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      // Validate ID
      if (!id) {
        throw new AppError('Equipment trim ID is required', 400, 'MISSING_ID');
      }

      const equipmentTrim = await EquipmentTrimClient.findById(id);
      
      // Apply any business logic transformations here if needed
      return equipmentTrim;
    } catch (error) {
      console.error('Error in EquipmentTrimService.findById:', error);
      throw error;
    }
  }

  static async findForDropdown(makeId = null, modelId = null) {
    try {
      // Validate references if provided
      if (makeId) {
        await EquipmentMakeService.findById(makeId);
      }
      
      if (modelId) {
        await EquipmentModelService.findById(modelId);
      }

      const trims = await EquipmentTrimClient.findForDropdown(makeId, modelId);
      
      // Apply any business logic transformations here if needed
      return trims;
    } catch (error) {
      console.error('Error in EquipmentTrimService.findForDropdown:', error);
      throw error;
    }
  }

  static async findByMakeAndModel(makeId, modelId) {
    try {
      // Validate IDs
      if (!makeId || !modelId) {
        throw new AppError('Make ID and Model ID are required', 400, 'MISSING_IDS');
      }

      // Verify make and model exist
      await EquipmentMakeService.findById(makeId);
      await EquipmentModelService.findById(modelId);

      const trims = await EquipmentTrimClient.findByMakeAndModel(makeId, modelId);
      
      // Apply any business logic transformations here if needed
      return trims;
    } catch (error) {
      console.error('Error in EquipmentTrimService.findByMakeAndModel:', error);
      throw error;
    }
  }

  static async create(trimData, userContext = {}) {
    try {
      // Validate input data
      this.validateCreateData(trimData);
      
      // Apply business logic
      const enrichedData = {
        ...trimData,
        created_by: userContext.userId || null,
        created_in: userContext.farmId || null
      };
      
      // Check business rules
      await this.checkBusinessRulesForCreate(enrichedData);
      
      const newEquipmentTrim = await EquipmentTrimClient.create(enrichedData);
      
      // Apply any post-creation business logic here if needed
      return newEquipmentTrim;
    } catch (error) {
      console.error('Error in EquipmentTrimService.create:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Equipment trim ID is required', 400, 'MISSING_ID');
      }
      
      this.validateUpdateData(updateData);
      
      // Check business rules
      await this.checkBusinessRulesForUpdate(id, updateData);
      
      const updatedEquipmentTrim = await EquipmentTrimClient.update(id, updateData);
      
      // Apply any post-update business logic here if needed
      return updatedEquipmentTrim;
    } catch (error) {
      console.error('Error in EquipmentTrimService.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Equipment trim ID is required', 400, 'MISSING_ID');
      }
      
      // Check business rules for deletion
      await this.checkBusinessRulesForDelete(id);
      
      const deletedEquipmentTrim = await EquipmentTrimClient.delete(id);
      
      // Apply any post-deletion business logic here if needed
      return deletedEquipmentTrim;
    } catch (error) {
      console.error('Error in EquipmentTrimService.delete:', error);
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null, make = null, model = null) {
    try {
      if (!name || !name.trim()) {
        throw new AppError('Name is required for uniqueness check', 400, 'MISSING_NAME');
      }
      
      return await EquipmentTrimClient.checkNameUnique(name.trim(), excludeId, make, model);
    } catch (error) {
      console.error('Error in EquipmentTrimService.checkNameUnique:', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const stats = await EquipmentTrimClient.getStatistics();
      
      // Apply any business logic transformations to statistics here if needed
      return stats;
    } catch (error) {
      console.error('Error in EquipmentTrimService.getStatistics:', error);
      throw error;
    }
  }

  // Private validation methods
  static validateFindAllOptions(options) {
    const {
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc',
      search = '',
      make = null,
      model = null
    } = options;

    // Validate page and limit
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 items per page

    // Validate sort field (whitelist approach)
    const allowedSortFields = ['id', 'name', 'created_at', 'make', 'model'];
    const validatedSort = allowedSortFields.includes(sort) ? sort : 'created_at';

    // Validate order
    const validatedOrder = ['asc', 'desc'].includes(order?.toLowerCase()) ? order.toLowerCase() : 'desc';

    // Validate search (sanitize)
    const validatedSearch = typeof search === 'string' ? search.trim().substring(0, 100) : '';

    // Validate filters
    const validatedMake = make && !isNaN(make) ? parseInt(make) : null;
    const validatedModel = model && !isNaN(model) ? parseInt(model) : null;

    return {
      page: validatedPage,
      limit: validatedLimit,
      sort: validatedSort,
      order: validatedOrder,
      search: validatedSearch,
      make: validatedMake,
      model: validatedModel
    };
  }

  static validateCreateData(trimData) {
    if (!trimData) {
      throw new AppError('Equipment trim data is required', 400, 'MISSING_DATA');
    }

    const { name } = trimData;

    if (!name || !name.trim()) {
      throw new AppError('Equipment trim name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    if (name.trim().length > 100) {
      throw new AppError('Equipment trim name must be 100 characters or less', 400, 'NAME_TOO_LONG');
    }

    if (trimData.description && trimData.description.length > 500) {
      throw new AppError('Description must be 500 characters or less', 400, 'DESCRIPTION_TOO_LONG');
    }
  }

  static validateUpdateData(updateData) {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError('Update data is required', 400, 'MISSING_DATA');
    }

    const { name } = updateData;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new AppError('Equipment trim name cannot be empty', 400, 'INVALID_NAME');
      }

      if (name.trim().length > 100) {
        throw new AppError('Equipment trim name must be 100 characters or less', 400, 'NAME_TOO_LONG');
      }
    }

    if (updateData.description !== undefined && updateData.description && updateData.description.length > 500) {
      throw new AppError('Description must be 500 characters or less', 400, 'DESCRIPTION_TOO_LONG');
    }
  }

  static async checkBusinessRulesForCreate(trimData) {
    const { name, make, model } = trimData;

    // Validate references exist if provided
    if (make) {
      try {
        await EquipmentMakeService.findById(make);
      } catch (error) {
        throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
      }
    }

    if (model) {
      try {
        const modelData = await EquipmentModelService.findById(model);
        
        // Validate model belongs to make if both are provided
        if (make && modelData.make !== make) {
          throw new AppError('Selected model does not belong to the selected make', 400, 'INVALID_MODEL_MAKE_COMBINATION');
        }
      } catch (error) {
        if (error.isOperational) throw error;
        throw new AppError('Referenced equipment model not found', 400, 'INVALID_MODEL_REFERENCE');
      }
    }

    // Check name uniqueness within make/model combination
    const isUnique = await EquipmentTrimClient.checkNameUnique(name, null, make, model);
    if (!isUnique) {
      throw new AppError('Equipment trim name already exists for this make/model combination', 409, 'DUPLICATE_NAME');
    }
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    const { name, make, model } = updateData;

    // Validate references exist if provided and being updated
    if (make) {
      try {
        await EquipmentMakeService.findById(make);
      } catch (error) {
        throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
      }
    }

    if (model) {
      try {
        const modelData = await EquipmentModelService.findById(model);
        
        // Validate model belongs to make if both are provided
        if (make && modelData.make !== make) {
          throw new AppError('Selected model does not belong to the selected make', 400, 'INVALID_MODEL_MAKE_COMBINATION');
        }
      } catch (error) {
        if (error.isOperational) throw error;
        throw new AppError('Referenced equipment model not found', 400, 'INVALID_MODEL_REFERENCE');
      }
    }

    // Check name uniqueness within make/model combination if relevant fields are being updated
    if (name || make || model) {
      // Get current data to fill in missing values for uniqueness check
      const currentTrim = await EquipmentTrimClient.findById(id);
      const nameForCheck = name || currentTrim.name;
      const makeForCheck = make !== undefined ? make : currentTrim.make;
      const modelForCheck = model !== undefined ? model : currentTrim.model;
      
      const isUnique = await EquipmentTrimClient.checkNameUnique(nameForCheck, id, makeForCheck, modelForCheck);
      if (!isUnique) {
        throw new AppError('Equipment trim name already exists for this make/model combination', 409, 'DUPLICATE_NAME');
      }
    }
  }

  static async checkBusinessRulesForDelete(id) {
    // The client already handles dependency checks, but we could add additional business rules here
    // For example: check user permissions, audit logging, etc.
  }
}

module.exports = EquipmentTrimService;