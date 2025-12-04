const EquipmentMakeClient = require('../clients/equipmentMakeClient');
const { AppError } = require('../middleware/errorHandler');

class EquipmentMakeService {
  static async findAll(options = {}) {
    try {
      // Validate and sanitize input options
      const validatedOptions = this.validateFindAllOptions(options);
      
      // Call the client to get data
      const result = await EquipmentMakeClient.findAll(validatedOptions);
      
      // Apply any business logic transformations here if needed
      return result;
    } catch (error) {
      console.error('Error in EquipmentMakeService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      // Validate ID
      if (!id) {
        throw new AppError('Equipment make ID is required', 400, 'MISSING_ID');
      }

      const equipmentMake = await EquipmentMakeClient.findById(id);

      // Apply any business logic transformations here if needed
      return equipmentMake;
    } catch (error) {
      // Solo imprimir si no es error operacional
      if (!error.isOperational) {
        console.error('Error in EquipmentMakeService.findById:', error);
      }
      throw error;
    }
  }

  static async findForDropdown() {
    try {
      const equipmentMakes = await EquipmentMakeClient.findForDropdown();
      
      // Apply any business logic transformations here if needed
      return equipmentMakes;
    } catch (error) {
      console.error('Error in EquipmentMakeService.findForDropdown:', error);
      throw error;
    }
  }

  static async findForDropdownWithModels() {
    try {
      const equipmentMakes = await EquipmentMakeClient.findForDropdownWithModels();
      
      // Apply any business logic transformations here if needed
      return equipmentMakes;
    } catch (error) {
      console.error('Error in EquipmentMakeService.findForDropdownWithModels:', error);
      throw error;
    }
  }

  static async findModelsForMake(makeId) {
    try {
      // Validate ID
      if (!makeId) {
        throw new AppError('Make ID is required', 400, 'MISSING_MAKE_ID');
      }

      const models = await EquipmentMakeClient.findModelsForMake(makeId);
      
      // Apply any business logic transformations here if needed
      return models;
    } catch (error) {
      console.error('Error in EquipmentMakeService.findModelsForMake:', error);
      throw error;
    }
  }

  static async create(makeData, userContext = {}) {
    try {
      // Validate input data
      this.validateCreateData(makeData);
      
      // Apply business logic
      const enrichedData = {
        ...makeData,
        created_by: userContext.userId || null,
        created_in: userContext.farmId || null
      };
      
      // Check business rules
      await this.checkBusinessRulesForCreate(enrichedData);
      
      const newEquipmentMake = await EquipmentMakeClient.create(enrichedData);
      
      // Apply any post-creation business logic here if needed
      return newEquipmentMake;
    } catch (error) {
      console.error('Error in EquipmentMakeService.create:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Equipment make ID is required', 400, 'MISSING_ID');
      }
      
      this.validateUpdateData(updateData);
      
      // Check business rules
      await this.checkBusinessRulesForUpdate(id, updateData);
      
      const updatedEquipmentMake = await EquipmentMakeClient.update(id, updateData);
      
      // Apply any post-update business logic here if needed
      return updatedEquipmentMake;
    } catch (error) {
      console.error('Error in EquipmentMakeService.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Equipment make ID is required', 400, 'MISSING_ID');
      }
      
      // Check business rules for deletion
      await this.checkBusinessRulesForDelete(id);
      
      const deletedEquipmentMake = await EquipmentMakeClient.delete(id);
      
      // Apply any post-deletion business logic here if needed
      return deletedEquipmentMake;
    } catch (error) {
      console.error('Error in EquipmentMakeService.delete:', error);
      throw error;
    }
  }

  static async findOrCreateUnknown(userId = null) {
    try {
      // Try to find existing "UNKNOWN" equipment make
      let unknownMake = await EquipmentMakeClient.findByName('UNKNOWN');

      if (unknownMake) {
        console.log('Found existing UNKNOWN equipment make:', unknownMake.id);
        return unknownMake;
      }

      // If not found, create it
      console.log('Creating UNKNOWN equipment make...');
      unknownMake = await EquipmentMakeClient.create({
        name: 'UNKNOWN',
        created_by: userId,
        created_in: null
      });

      console.log('Created UNKNOWN equipment make:', unknownMake.id);
      return unknownMake;
    } catch (error) {
      console.error('Error in EquipmentMakeService.findOrCreateUnknown:', error);
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null) {
    try {
      if (!name || !name.trim()) {
        throw new AppError('Name is required for uniqueness check', 400, 'MISSING_NAME');
      }

      return await EquipmentMakeClient.checkNameUnique(name.trim(), excludeId);
    } catch (error) {
      console.error('Error in EquipmentMakeService.checkNameUnique:', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const stats = await EquipmentMakeClient.getStatistics();
      
      // Apply any business logic transformations to statistics here if needed
      return stats;
    } catch (error) {
      console.error('Error in EquipmentMakeService.getStatistics:', error);
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
    const allowedSortFields = ['id', 'name', 'created_at'];
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

  static validateCreateData(makeData) {
    if (!makeData) {
      throw new AppError('Equipment make data is required', 400, 'MISSING_DATA');
    }

    const { name } = makeData;

    if (!name || !name.trim()) {
      throw new AppError('Equipment make name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    if (name.trim().length > 100) {
      throw new AppError('Equipment make name must be 100 characters or less', 400, 'NAME_TOO_LONG');
    }
  }

  static validateUpdateData(updateData) {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError('Update data is required', 400, 'MISSING_DATA');
    }

    const { name } = updateData;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new AppError('Equipment make name cannot be empty', 400, 'INVALID_NAME');
      }

      if (name.trim().length > 100) {
        throw new AppError('Equipment make name must be 100 characters or less', 400, 'NAME_TOO_LONG');
      }
    }
  }

  static async checkBusinessRulesForCreate(makeData) {
    // Check name uniqueness
    const isUnique = await EquipmentMakeClient.checkNameUnique(makeData.name);
    if (!isUnique) {
      throw new AppError('Equipment make name already exists', 409, 'DUPLICATE_NAME');
    }
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    // Check name uniqueness if name is being updated
    if (updateData.name) {
      const isUnique = await EquipmentMakeClient.checkNameUnique(updateData.name, id);
      if (!isUnique) {
        throw new AppError('Equipment make name already exists', 409, 'DUPLICATE_NAME');
      }
    }
  }

  static async checkBusinessRulesForDelete(id) {
    // The client already handles dependency checks, but we could add additional business rules here
    // For example: check user permissions, audit logging, etc.
  }
}

module.exports = EquipmentMakeService;