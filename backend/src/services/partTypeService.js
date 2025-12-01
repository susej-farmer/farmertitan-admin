const PartTypeClient = require('../clients/partTypeClient');
const { AppError } = require('../middleware/errorHandler');

class PartTypeService {
  static async findAll(options = {}) {
    try {
      // Validate and sanitize input options
      const validatedOptions = this.validateFindAllOptions(options);
      
      // Call the client to get data
      const result = await PartTypeClient.findAll(validatedOptions);
      
      // Apply any business logic transformations here if needed
      return result;
    } catch (error) {
      console.error('Error in PartTypeService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      // Validate ID
      if (!id) {
        throw new AppError('Part type ID is required', 400, 'MISSING_ID');
      }

      const partType = await PartTypeClient.findById(id);
      
      // Apply any business logic transformations here if needed
      return partType;
    } catch (error) {
      console.error('Error in PartTypeService.findById:', error);
      throw error;
    }
  }

  static async findForDropdown() {
    try {
      const partTypes = await PartTypeClient.findForDropdown();
      
      // Apply any business logic transformations here if needed
      return partTypes;
    } catch (error) {
      console.error('Error in PartTypeService.findForDropdown:', error);
      throw error;
    }
  }

  static async create(partTypeData, userContext = {}) {
    try {
      // Validate input data
      this.validateCreateData(partTypeData);
      
      // Apply business logic
      const enrichedData = {
        ...partTypeData,
        created_by: userContext.userId || null,
        created_in: userContext.farmId || null
      };
      
      // Check business rules
      await this.checkBusinessRulesForCreate(enrichedData);
      
      const newPartType = await PartTypeClient.create(enrichedData);
      
      // Apply any post-creation business logic here if needed
      return newPartType;
    } catch (error) {
      console.error('Error in PartTypeService.create:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Part type ID is required', 400, 'MISSING_ID');
      }
      
      this.validateUpdateData(updateData);
      
      // Check business rules
      await this.checkBusinessRulesForUpdate(id, updateData);
      
      const updatedPartType = await PartTypeClient.update(id, updateData);
      
      // Apply any post-update business logic here if needed
      return updatedPartType;
    } catch (error) {
      console.error('Error in PartTypeService.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Part type ID is required', 400, 'MISSING_ID');
      }
      
      // Check business rules for deletion
      await this.checkBusinessRulesForDelete(id);
      
      const deletedPartType = await PartTypeClient.delete(id);
      
      // Apply any post-deletion business logic here if needed
      return deletedPartType;
    } catch (error) {
      console.error('Error in PartTypeService.delete:', error);
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null) {
    try {
      if (!name || !name.trim()) {
        throw new AppError('Name is required for uniqueness check', 400, 'MISSING_NAME');
      }
      
      return await PartTypeClient.checkNameUnique(name.trim(), excludeId);
    } catch (error) {
      console.error('Error in PartTypeService.checkNameUnique:', error);
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

  static validateCreateData(partTypeData) {
    if (!partTypeData) {
      throw new AppError('Part type data is required', 400, 'MISSING_DATA');
    }

    const { name, description } = partTypeData;

    if (!name || !name.trim()) {
      throw new AppError('Part type name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    if (name.trim().length > 100) {
      throw new AppError('Part type name must be 100 characters or less', 400, 'NAME_TOO_LONG');
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
        throw new AppError('Part type name cannot be empty', 400, 'INVALID_NAME');
      }

      if (name.trim().length > 100) {
        throw new AppError('Part type name must be 100 characters or less', 400, 'NAME_TOO_LONG');
      }
    }

    if (description !== undefined && description && description.length > 500) {
      throw new AppError('Description must be 500 characters or less', 400, 'DESCRIPTION_TOO_LONG');
    }
  }

  static async checkBusinessRulesForCreate(partTypeData) {
    // Check name uniqueness
    const isUnique = await PartTypeClient.checkNameUnique(partTypeData.name);
    if (!isUnique) {
      throw new AppError('Part type name already exists', 409, 'DUPLICATE_NAME');
    }
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    // Check name uniqueness if name is being updated
    if (updateData.name) {
      const isUnique = await PartTypeClient.checkNameUnique(updateData.name, id);
      if (!isUnique) {
        throw new AppError('Part type name already exists', 409, 'DUPLICATE_NAME');
      }
    }
  }

  static async checkBusinessRulesForDelete(id) {
    // The client already handles dependency checks, but we could add additional business rules here
    // For example: check user permissions, audit logging, etc.
    // Check if part type is being used in maintenance templates, parts inventory, etc.
  }
}

module.exports = PartTypeService;