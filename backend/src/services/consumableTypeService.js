const ConsumableTypeClient = require('../clients/consumableTypeClient');
const { AppError } = require('../middleware/errorHandler');

class ConsumableTypeService {
  static async findAll(options = {}) {
    try {
      // Validate and sanitize input options
      const validatedOptions = this.validateFindAllOptions(options);
      
      // Call the client to get data
      const result = await ConsumableTypeClient.findAll(validatedOptions);
      
      // Apply any business logic transformations here if needed
      return result;
    } catch (error) {
      console.error('Error in ConsumableTypeService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      // Validate ID
      if (!id) {
        throw new AppError('Consumable type ID is required', 400, 'MISSING_ID');
      }

      const consumableType = await ConsumableTypeClient.findById(id);
      
      // Apply any business logic transformations here if needed
      return consumableType;
    } catch (error) {
      console.error('Error in ConsumableTypeService.findById:', error);
      throw error;
    }
  }

  static async findForDropdown() {
    try {
      const consumableTypes = await ConsumableTypeClient.findForDropdown();
      
      // Apply any business logic transformations here if needed
      return consumableTypes;
    } catch (error) {
      console.error('Error in ConsumableTypeService.findForDropdown:', error);
      throw error;
    }
  }

  static async create(consumableTypeData, userContext = {}) {
    try {
      // Validate input data
      this.validateCreateData(consumableTypeData);
      
      // Apply business logic
      const enrichedData = {
        ...consumableTypeData,
        created_by: userContext.userId || null,
        created_in: userContext.farmId || null
      };
      
      // Check business rules
      await this.checkBusinessRulesForCreate(enrichedData);
      
      const newConsumableType = await ConsumableTypeClient.create(enrichedData);
      
      // Apply any post-creation business logic here if needed
      return newConsumableType;
    } catch (error) {
      console.error('Error in ConsumableTypeService.create:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Consumable type ID is required', 400, 'MISSING_ID');
      }
      
      this.validateUpdateData(updateData);
      
      // Check business rules
      await this.checkBusinessRulesForUpdate(id, updateData);
      
      const updatedConsumableType = await ConsumableTypeClient.update(id, updateData);
      
      // Apply any post-update business logic here if needed
      return updatedConsumableType;
    } catch (error) {
      console.error('Error in ConsumableTypeService.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Consumable type ID is required', 400, 'MISSING_ID');
      }
      
      // Check business rules for deletion
      await this.checkBusinessRulesForDelete(id);
      
      const deletedConsumableType = await ConsumableTypeClient.delete(id);
      
      // Apply any post-deletion business logic here if needed
      return deletedConsumableType;
    } catch (error) {
      console.error('Error in ConsumableTypeService.delete:', error);
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null) {
    try {
      if (!name || !name.trim()) {
        throw new AppError('Name is required for uniqueness check', 400, 'MISSING_NAME');
      }
      
      return await ConsumableTypeClient.checkNameUnique(name.trim(), excludeId);
    } catch (error) {
      console.error('Error in ConsumableTypeService.checkNameUnique:', error);
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
      search = ''
    } = options;

    // Validate page and limit
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 items per page

    // Validate sort field (whitelist approach)
    const allowedSortFields = ['id', 'name', 'description', 'created_at'];
    const validatedSort = allowedSortFields.includes(sort) ? sort : 'created_at';

    // Validate order
    const validatedOrder = ['asc', 'desc'].includes(order?.toLowerCase()) ? order.toLowerCase() : 'desc';

    // Validate search (sanitize)
    const validatedSearch = typeof search === 'string' ? search.trim().substring(0, 100) : '';

    return {
      page: validatedPage,
      limit: validatedLimit,
      sort: validatedSort,
      order: validatedOrder,
      search: validatedSearch
    };
  }

  static validateCreateData(consumableTypeData) {
    if (!consumableTypeData) {
      throw new AppError('Consumable type data is required', 400, 'MISSING_DATA');
    }

    const { name, description } = consumableTypeData;

    if (!name || !name.trim()) {
      throw new AppError('Consumable type name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    if (name.trim().length > 100) {
      throw new AppError('Consumable type name must be 100 characters or less', 400, 'NAME_TOO_LONG');
    }

    if (description && description.length > 500) {
      throw new AppError('Description must be 500 characters or less', 400, 'DESCRIPTION_TOO_LONG');
    }
  }

  static validateUpdateData(updateData) {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError('Update data is required', 400, 'MISSING_DATA');
    }

    const { name, description } = updateData;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new AppError('Consumable type name cannot be empty', 400, 'INVALID_NAME');
      }

      if (name.trim().length > 100) {
        throw new AppError('Consumable type name must be 100 characters or less', 400, 'NAME_TOO_LONG');
      }
    }

    if (description !== undefined && description && description.length > 500) {
      throw new AppError('Description must be 500 characters or less', 400, 'DESCRIPTION_TOO_LONG');
    }
  }

  static async checkBusinessRulesForCreate(consumableTypeData) {
    // Check name uniqueness
    const isUnique = await ConsumableTypeClient.checkNameUnique(consumableTypeData.name);
    if (!isUnique) {
      throw new AppError('Consumable type name already exists', 409, 'DUPLICATE_NAME');
    }
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    // Check name uniqueness if name is being updated
    if (updateData.name) {
      const isUnique = await ConsumableTypeClient.checkNameUnique(updateData.name, id);
      if (!isUnique) {
        throw new AppError('Consumable type name already exists', 409, 'DUPLICATE_NAME');
      }
    }
  }

  static async checkBusinessRulesForDelete(id) {
    // The client already handles dependency checks, but we could add additional business rules here
    // For example: check user permissions, audit logging, etc.
    // Check if consumable type is being used in maintenance templates, consumables inventory, etc.
  }
}

module.exports = ConsumableTypeService;