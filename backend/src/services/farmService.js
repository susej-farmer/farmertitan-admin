const FarmClient = require('../clients/farmClient');
const { AppError } = require('../middleware/errorHandler');

class FarmService {
  static async findAll(options = {}) {
    try {
      // Validate and sanitize input options
      const validatedOptions = this.validateFindAllOptions(options);

      // Call the client to get data
      const result = await FarmClient.getAll(validatedOptions);

      // Apply any business logic transformations here if needed
      return result;
    } catch (error) {
      console.error('Error in FarmService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      // Validate ID
      if (!id) {
        throw new AppError('Farm ID is required', 400, 'MISSING_ID');
      }

      const farm = await FarmClient.findById(id);

      // Obtener conteos adicionales en paralelo
      const [farmUsers, equipmentCount] = await Promise.all([
        FarmClient.getFarmUsers(id),
        FarmClient.getEquipmentCount(id)
      ]);

      // Agregar conteos al objeto farm
      const farmWithCounts = {
        ...farm,
        user_count: farmUsers.length,
        equipment_count: equipmentCount
      };

      return farmWithCounts;
    } catch (error) {
      console.error('Error in FarmService.findById:', error);
      throw error;
    }
  }

  static async create(farmData) {
    try {
      // Validate input data
      this.validateCreateData(farmData);

      // Check business rules
      await this.checkBusinessRulesForCreate(farmData);

      const newFarm = await FarmClient.create(farmData);

      // Apply any post-creation business logic here if needed
      return newFarm;
    } catch (error) {
      console.error('Error in FarmService.create:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Farm ID is required', 400, 'MISSING_ID');
      }

      this.validateUpdateData(updateData);

      // Check business rules
      await this.checkBusinessRulesForUpdate(id, updateData);

      const updatedFarm = await FarmClient.update(id, updateData);

      // Apply any post-update business logic here if needed
      return updatedFarm;
    } catch (error) {
      console.error('Error in FarmService.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Farm ID is required', 400, 'MISSING_ID');
      }

      // Check business rules for deletion
      await this.checkBusinessRulesForDelete(id);

      const result = await FarmClient.delete(id);

      // Apply any post-deletion business logic here if needed
      return result;
    } catch (error) {
      console.error('Error in FarmService.delete:', error);
      throw error;
    }
  }

  static async activate(id) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Farm ID is required', 400, 'MISSING_ID');
      }

      // Check business rules for activation
      await this.checkBusinessRulesForActivation(id);

      const activatedFarm = await FarmClient.activate(id);

      // Apply any post-activation business logic here if needed
      return activatedFarm;
    } catch (error) {
      console.error('Error in FarmService.activate:', error);
      throw error;
    }
  }

  static async deactivate(id) {
    try {
      // Validate input
      if (!id) {
        throw new AppError('Farm ID is required', 400, 'MISSING_ID');
      }

      // Check business rules for deactivation
      await this.checkBusinessRulesForDeactivation(id);

      const deactivatedFarm = await FarmClient.deactivate(id);

      // Apply any post-deactivation business logic here if needed
      return deactivatedFarm;
    } catch (error) {
      console.error('Error in FarmService.deactivate:', error);
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null) {
    try {
      if (!name || !name.trim()) {
        throw new AppError('Name is required for uniqueness check', 400, 'MISSING_NAME');
      }

      return await FarmClient.checkNameUnique(name.trim(), excludeId);
    } catch (error) {
      console.error('Error in FarmService.checkNameUnique:', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const stats = await FarmClient.getStatistics();

      // Apply any business logic transformations to statistics here if needed
      return stats;
    } catch (error) {
      console.error('Error in FarmService.getStatistics:', error);
      throw error;
    }
  }

  // Private validation methods
  static validateFindAllOptions(options) {
    const {
      page = 1,
      limit = 20,
      search = '',
      is_active = null,
      user_id = null
    } = options;

    // Validate page and limit
    const validatedPage = Math.max(1, parseInt(page) || 1);
    // Limit must be between 1 and 100 (as per function constraint)
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    // Validate search (sanitize)
    const validatedSearch = typeof search === 'string' && search.trim() !== ''
      ? search.trim().substring(0, 100)
      : null;

    // Validate is_active (boolean or null)
    let validatedIsActive = null;
    if (is_active === 'true' || is_active === true) {
      validatedIsActive = true;
    } else if (is_active === 'false' || is_active === false) {
      validatedIsActive = false;
    }

    // Validate user_id (UUID or null)
    const validatedUserId = user_id && typeof user_id === 'string' ? user_id : null;

    return {
      page: validatedPage,
      limit: validatedLimit,
      search: validatedSearch,
      is_active: validatedIsActive,
      user_id: validatedUserId
    };
  }

  static validateCreateData(farmData) {
    if (!farmData) {
      throw new AppError('Farm data is required', 400, 'MISSING_DATA');
    }

    const { name, acres } = farmData;

    if (!name || !name.trim()) {
      throw new AppError('Farm name is required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    if (name.trim().length > 255) {
      throw new AppError('Farm name must be 255 characters or less', 400, 'NAME_TOO_LONG');
    }

    if (acres !== undefined) {
      if (typeof acres !== 'number' || acres < 0) {
        throw new AppError('Acres must be a positive number', 400, 'INVALID_ACRES');
      }
      if (acres > 1000000) {
        throw new AppError('Acres cannot exceed 1,000,000', 400, 'ACRES_TOO_LARGE');
      }
    }
  }

  static validateUpdateData(updateData) {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError('Update data is required', 400, 'MISSING_DATA');
    }

    const { name, acres } = updateData;

    if (name !== undefined) {
      if (!name || !name.trim()) {
        throw new AppError('Farm name cannot be empty', 400, 'INVALID_NAME');
      }

      if (name.trim().length > 255) {
        throw new AppError('Farm name must be 255 characters or less', 400, 'NAME_TOO_LONG');
      }
    }

    if (acres !== undefined) {
      if (typeof acres !== 'number' || acres < 0) {
        throw new AppError('Acres must be a positive number', 400, 'INVALID_ACRES');
      }
      if (acres > 1000000) {
        throw new AppError('Acres cannot exceed 1,000,000', 400, 'ACRES_TOO_LARGE');
      }
    }
  }

  static async checkBusinessRulesForCreate(farmData) {
    // Check name uniqueness
    const isUnique = await FarmClient.checkNameUnique(farmData.name, null);
    if (!isUnique) {
      throw new AppError('Farm name already exists', 409, 'DUPLICATE_NAME');
    }
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    // Check name uniqueness if name is being updated
    if (updateData.name) {
      const isUnique = await FarmClient.checkNameUnique(updateData.name, id);
      if (!isUnique) {
        throw new AppError('Farm name already exists', 409, 'DUPLICATE_NAME');
      }
    }
  }

  static async checkBusinessRulesForDelete(id) {
    // Check if farm exists first
    await FarmClient.findById(id);

    // Add business rules for deletion here if needed
    // For example: check if farm has active equipment, users, etc.
  }

  static async checkBusinessRulesForActivation(id) {
    // Check if farm exists first
    const farm = await FarmClient.findById(id);

    // Add business rules for activation here if needed
    // For example: check if farm has required data before activation
  }

  static async checkBusinessRulesForDeactivation(id) {
    // Check if farm exists first
    const farm = await FarmClient.findById(id);

    // Add business rules for deactivation here if needed
    // For example: check if farm has active operations before deactivation
  }
}

module.exports = FarmService;