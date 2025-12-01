const EquipmentTypeClient = require('../clients/equipmentTypeClient');
const { AppError } = require('../middleware/errorHandler');

class EquipmentTypeService {
  static async findAll(options = {}) {
    try {
      // Validate and sanitize input options
      const validatedOptions = this.validateFindAllOptions(options);
      
      // Call the client to get data
      const result = await EquipmentTypeClient.findAll(validatedOptions);
      
      // Apply any business logic transformations here if needed
      return result;
    } catch (error) {
      console.error('Error in EquipmentTypeService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      // Validate ID
      if (!id) {
        throw new AppError('Equipment type ID is required', 400, 'MISSING_ID');
      }

      const equipmentType = await EquipmentTypeClient.findById(id);
      
      // Apply any business logic transformations here if needed
      return equipmentType;
    } catch (error) {
      console.error('Error in EquipmentTypeService.findById:', error);
      throw error;
    }
  }

  static async findForDropdown() {
    try {
      const equipmentTypes = await EquipmentTypeClient.findForDropdown();
      
      // Apply any business logic transformations here if needed
      return equipmentTypes;
    } catch (error) {
      console.error('Error in EquipmentTypeService.findForDropdown:', error);
      throw error;
    }
  }

  static async create(typeData, userContext = {}) {
    try {
      // Validate input data
      this.validateCreateData(typeData);
      
      // Apply business logic
      const enrichedData = {
        ...typeData,
        created_by: userContext.userId || null,
        created_in: userContext.farmId || null
      };
      
      // Check business rules
      await this.checkBusinessRulesForCreate(enrichedData);
      
      const newEquipmentType = await EquipmentTypeClient.create(enrichedData);
      
      // Apply any post-creation business logic here if needed
      return newEquipmentType;
    } catch (error) {
      console.error('Error in EquipmentTypeService.create:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Equipment type ID is required', 400, 'MISSING_ID');
      }
      
      this.validateUpdateData(updateData);
      
      // Check business rules
      await this.checkBusinessRulesForUpdate(id, updateData);
      
      const updatedEquipmentType = await EquipmentTypeClient.update(id, updateData);
      
      // Apply any post-update business logic here if needed
      return updatedEquipmentType;
    } catch (error) {
      console.error('Error in EquipmentTypeService.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Equipment type ID is required', 400, 'MISSING_ID');
      }
      
      // Check business rules for deletion
      await this.checkBusinessRulesForDelete(id);
      
      const deletedEquipmentType = await EquipmentTypeClient.delete(id);
      
      // Apply any post-deletion business logic here if needed
      return deletedEquipmentType;
    } catch (error) {
      console.error('Error in EquipmentTypeService.delete:', error);
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null) {
    try {
      if (!name || !name.trim()) {
        throw new AppError('Name is required for uniqueness check', 400, 'MISSING_NAME');
      }
      
      return await EquipmentTypeClient.checkNameUnique(name.trim(), excludeId);
    } catch (error) {
      console.error('Error in EquipmentTypeService.checkNameUnique:', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const stats = await EquipmentTypeClient.getStatistics();
      
      // Apply any business logic transformations to statistics here if needed
      return stats;
    } catch (error) {
      console.error('Error in EquipmentTypeService.getStatistics:', error);
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

  static validateCreateData(typeData) {
    if (!typeData) {
      throw new AppError('Equipment type data is required', 400, 'MISSING_DATA');
    }

    const { name, description } = typeData;

    if (!name || !name.trim()) {
      throw new AppError('Equipment type name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    if (name.trim().length > 100) {
      throw new AppError('Equipment type name must be 100 characters or less', 400, 'NAME_TOO_LONG');
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
        throw new AppError('Equipment type name cannot be empty', 400, 'INVALID_NAME');
      }

      if (name.trim().length > 100) {
        throw new AppError('Equipment type name must be 100 characters or less', 400, 'NAME_TOO_LONG');
      }
    }

    if (description !== undefined && description && description.length > 500) {
      throw new AppError('Description must be 500 characters or less', 400, 'DESCRIPTION_TOO_LONG');
    }
  }

  static async checkBusinessRulesForCreate(typeData) {
    // Check name uniqueness
    const isUnique = await EquipmentTypeClient.checkNameUnique(typeData.name);
    if (!isUnique) {
      throw new AppError('Equipment type name already exists', 409, 'DUPLICATE_NAME');
    }
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    // Check name uniqueness if name is being updated
    if (updateData.name) {
      const isUnique = await EquipmentTypeClient.checkNameUnique(updateData.name, id);
      if (!isUnique) {
        throw new AppError('Equipment type name already exists', 409, 'DUPLICATE_NAME');
      }
    }
  }

  static async checkBusinessRulesForDelete(id) {
    // The client already handles dependency checks, but we could add additional business rules here
    // For example: check user permissions, audit logging, etc.
  }
}

module.exports = EquipmentTypeService;