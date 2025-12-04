const EquipmentModelClient = require('../clients/equipmentModelClient');
const EquipmentMakeService = require('./equipmentMakeService');
const { AppError } = require('../middleware/errorHandler');

class EquipmentModelService {
  static async findAll(options = {}) {
    try {
      // Validate and sanitize input options
      const validatedOptions = this.validateFindAllOptions(options);
      
      // Call the client to get data
      const result = await EquipmentModelClient.findAll(validatedOptions);
      
      // Apply any business logic transformations here if needed
      return result;
    } catch (error) {
      console.error('Error in EquipmentModelService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      // Validate ID
      if (!id) {
        throw new AppError('Equipment model ID is required', 400, 'MISSING_ID');
      }

      const equipmentModel = await EquipmentModelClient.findById(id);

      // Apply any business logic transformations here if needed
      return equipmentModel;
    } catch (error) {
      // Solo imprimir si no es error operacional
      if (!error.isOperational) {
        console.error('Error in EquipmentModelService.findById:', error);
      }
      throw error;
    }
  }

  static async findByMake(makeId) {
    try {
      // Validate ID
      if (!makeId) {
        throw new AppError('Make ID is required', 400, 'MISSING_MAKE_ID');
      }

      // Verify make exists
      await EquipmentMakeService.findById(makeId);

      const models = await EquipmentModelClient.findByMake(makeId);
      
      // Apply any business logic transformations here if needed
      return models;
    } catch (error) {
      console.error('Error in EquipmentModelService.findByMake:', error);
      throw error;
    }
  }

  static async create(modelData, userContext = {}) {
    try {
      // Validate input data
      this.validateCreateData(modelData);
      
      // Apply business logic
      const enrichedData = {
        ...modelData,
        created_by: userContext.userId || null,
        created_in: userContext.farmId || null
      };
      
      // Check business rules
      await this.checkBusinessRulesForCreate(enrichedData);
      
      const newEquipmentModel = await EquipmentModelClient.create(enrichedData);
      
      // Apply any post-creation business logic here if needed
      return newEquipmentModel;
    } catch (error) {
      console.error('Error in EquipmentModelService.create:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Equipment model ID is required', 400, 'MISSING_ID');
      }
      
      this.validateUpdateData(updateData);
      
      // Check business rules
      await this.checkBusinessRulesForUpdate(id, updateData);
      
      const updatedEquipmentModel = await EquipmentModelClient.update(id, updateData);
      
      // Apply any post-update business logic here if needed
      return updatedEquipmentModel;
    } catch (error) {
      console.error('Error in EquipmentModelService.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Equipment model ID is required', 400, 'MISSING_ID');
      }
      
      // Check business rules for deletion
      await this.checkBusinessRulesForDelete(id);
      
      const deletedEquipmentModel = await EquipmentModelClient.delete(id);
      
      // Apply any post-deletion business logic here if needed
      return deletedEquipmentModel;
    } catch (error) {
      console.error('Error in EquipmentModelService.delete:', error);
      throw error;
    }
  }

  static async findOrCreateUnknown(makeId, userId = null) {
    try {
      // Validate makeId
      if (!makeId) {
        throw new AppError('Make ID is required', 400, 'MISSING_MAKE_ID');
      }

      // Try to find existing "UNKNOWN" equipment model for this make
      let unknownModel = await EquipmentModelClient.findByNameAndMake('UNKNOWN', makeId);

      if (unknownModel) {
        console.log('Found existing UNKNOWN equipment model for make:', makeId, '- Model ID:', unknownModel.id);
        return unknownModel;
      }

      // If not found, create it
      console.log('Creating UNKNOWN equipment model for make:', makeId);
      unknownModel = await EquipmentModelClient.create({
        name: 'UNKNOWN',
        make: makeId,
        created_by: userId,
        created_in: null
      });

      console.log('Created UNKNOWN equipment model:', unknownModel.id);
      return unknownModel;
    } catch (error) {
      console.error('Error in EquipmentModelService.findOrCreateUnknown:', error);
      throw error;
    }
  }

  static async checkNameUniqueForMake(name, makeId, excludeId = null) {
    try {
      if (!name || !name.trim()) {
        throw new AppError('Name is required for uniqueness check', 400, 'MISSING_NAME');
      }

      if (!makeId) {
        throw new AppError('Make ID is required for uniqueness check', 400, 'MISSING_MAKE_ID');
      }

      return await EquipmentModelClient.checkNameUniqueForMake(name.trim(), makeId, excludeId);
    } catch (error) {
      console.error('Error in EquipmentModelService.checkNameUniqueForMake:', error);
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
      make = null
    } = options;

    // Validate page and limit
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 items per page

    // Validate sort field (whitelist approach)
    const allowedSortFields = ['id', 'name', 'created_at', 'make'];
    const validatedSort = allowedSortFields.includes(sort) ? sort : 'created_at';

    // Validate order
    const validatedOrder = ['asc', 'desc'].includes(order?.toLowerCase()) ? order.toLowerCase() : 'desc';

    // Validate search (sanitize)
    const validatedSearch = typeof search === 'string' ? search.trim().substring(0, 100) : '';

    // Validate make filter
    const validatedMake = make && !isNaN(make) ? parseInt(make) : null;

    return {
      page: validatedPage,
      limit: validatedLimit,
      sort: validatedSort,
      order: validatedOrder,
      search: validatedSearch,
      make: validatedMake
    };
  }

  static validateCreateData(modelData) {
    if (!modelData) {
      throw new AppError('Equipment model data is required', 400, 'MISSING_DATA');
    }

    const { name, make } = modelData;

    if (!name || !name.trim()) {
      throw new AppError('Equipment model name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    if (!make) {
      throw new AppError('Equipment make is required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    if (name.trim().length > 100) {
      throw new AppError('Equipment model name must be 100 characters or less', 400, 'NAME_TOO_LONG');
    }

    if (modelData.description && modelData.description.length > 500) {
      throw new AppError('Description must be 500 characters or less', 400, 'DESCRIPTION_TOO_LONG');
    }
  }

  static validateUpdateData(updateData) {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError('Update data is required', 400, 'MISSING_DATA');
    }

    const { name, make } = updateData;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new AppError('Equipment model name cannot be empty', 400, 'INVALID_NAME');
      }

      if (name.trim().length > 100) {
        throw new AppError('Equipment model name must be 100 characters or less', 400, 'NAME_TOO_LONG');
      }
    }

    if (make !== undefined && !make) {
      throw new AppError('Equipment make cannot be empty', 400, 'INVALID_MAKE');
    }

    if (updateData.description !== undefined && updateData.description && updateData.description.length > 500) {
      throw new AppError('Description must be 500 characters or less', 400, 'DESCRIPTION_TOO_LONG');
    }
  }

  static async checkBusinessRulesForCreate(modelData) {
    // Validate that the make exists
    try {
      await EquipmentMakeService.findById(modelData.make);
    } catch (error) {
      throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
    }

    // Check name uniqueness for this make
    const isUnique = await EquipmentModelClient.checkNameUniqueForMake(modelData.name, modelData.make);
    if (!isUnique) {
      throw new AppError('Equipment model name already exists for this make', 409, 'DUPLICATE_NAME');
    }
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    // Validate that the make exists if being updated
    if (updateData.make) {
      try {
        await EquipmentMakeService.findById(updateData.make);
      } catch (error) {
        throw new AppError('Referenced equipment make not found', 400, 'INVALID_MAKE_REFERENCE');
      }
    }

    // Check name uniqueness for this make if name or make is being updated
    if (updateData.name || updateData.make) {
      // Get current data to determine make ID for uniqueness check
      const currentModel = await EquipmentModelClient.findById(id);
      const makeIdForCheck = updateData.make || currentModel.make;
      const nameForCheck = updateData.name || currentModel.name;
      
      const isUnique = await EquipmentModelClient.checkNameUniqueForMake(nameForCheck, makeIdForCheck, id);
      if (!isUnique) {
        throw new AppError('Equipment model name already exists for this make', 409, 'DUPLICATE_NAME');
      }
    }
  }

  static async checkBusinessRulesForDelete(id) {
    // The client already handles dependency checks, but we could add additional business rules here
    // For example: check user permissions, audit logging, etc.
  }
}

module.exports = EquipmentModelService;