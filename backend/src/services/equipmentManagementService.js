const EquipmentClient = require('../clients/equipmentClient');
const EquipmentService = require('./equipmentService'); // For catalog operations
const TaskSeriesClient = require('../clients/taskSeriesClient');
const TaskClient = require('../clients/taskClient');
const TimeClient = require('../clients/timeClient');
const { AppError } = require('../middleware/errorHandler');

class EquipmentManagementService {
  static async findAll(options = {}) {
    try {
      // Validate and sanitize input options
      const validatedOptions = this.validateFindAllOptions(options);
      
      // Call the client to get data
      const result = await EquipmentClient.findAll(validatedOptions);
      
      // Apply any business logic transformations here if needed
      return result;
    } catch (error) {
      console.error('Error in EquipmentManagementService.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      // Validate ID
      if (!id) {
        throw new AppError('Equipment ID is required', 400, 'MISSING_ID');
      }

      const equipment = await EquipmentClient.findById(id);
      
      // Apply any business logic transformations here if needed
      return equipment;
    } catch (error) {
      console.error('Error in EquipmentManagementService.findById:', error);
      throw error;
    }
  }

  static async getEquipmentWithMaintenanceStatus(options = {}) {
    try {
      // Validate and sanitize input options
      const validatedOptions = this.validateFindAllOptions(options);
      
      // Get equipment data
      const result = await EquipmentClient.findAll(validatedOptions);
      
      // Enhance each equipment with maintenance status
      const equipmentWithStatus = await Promise.all(
        result.data.map(async (equipment) => {
          const maintenanceCount = await this.getMaintenanceCountForEquipment(equipment.id);
          return {
            ...equipment,
            maintenance_count: maintenanceCount,
            has_maintenance: maintenanceCount > 0
          };
        })
      );
      
      return {
        data: equipmentWithStatus,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error in EquipmentManagementService.getEquipmentWithMaintenanceStatus:', error);
      throw error;
    }
  }

  static async getMaintenanceCountForEquipment(equipmentId) {
    try {
      const maintenanceTemplates = await TaskSeriesClient.findByEquipment(equipmentId);
      return maintenanceTemplates ? maintenanceTemplates.length : 0;
    } catch (error) {
      console.error('Error getting maintenance count:', error);
      return 0;
    }
  }

  static async getMaintenanceTemplatesForEquipment(equipmentId) {
    try {
      // Validate ID
      if (!equipmentId) {
        throw new AppError('Equipment ID is required', 400, 'MISSING_EQUIPMENT_ID');
      }

      // First verify equipment exists
      await EquipmentClient.findById(equipmentId);

      const result = await TaskClient.findTemplates({ equipment: equipmentId });
      
      // Enhance each template with schedule information
      const enhancedTemplates = [];
      
      for (const template of result.data) {
        try {
          // Get task series to find schedule information
          const taskSeries = await TaskSeriesClient.findByTaskTemplate(template.id);
          let scheduleInfo = null;
          
          if (taskSeries && taskSeries.length > 0) {
            const timeRecord = await TimeClient.findById(taskSeries[0].schedule);
            scheduleInfo = {
              interval: timeRecord.value,
              schedule_type: timeRecord.type === 'schedule:hours' ? 'Hours' : 'Distance',
              time_type: timeRecord.type
            };
          }
          
          enhancedTemplates.push({
            ...template,
            schedule_info: scheduleInfo,
            maintenance_category: template._part_type ? 'Part' : 'Consumable',
            part_or_consumable_name: template._part_type?.name || template._consumable_type?.name
          });
        } catch (err) {
          console.error('Error enhancing template:', err);
          // Include template without enhancement if there's an error
          enhancedTemplates.push({
            ...template,
            schedule_info: null,
            maintenance_category: template._part_type ? 'Part' : 'Consumable',
            part_or_consumable_name: template._part_type?.name || template._consumable_type?.name
          });
        }
      }
      
      return enhancedTemplates;
    } catch (error) {
      console.error('Error in EquipmentManagementService.getMaintenanceTemplatesForEquipment:', error);
      throw error;
    }
  }

  static async create(equipmentData) {
    try {
      // Validate input data
      this.validateCreateData(equipmentData);
      
      // Check business rules
      await this.checkBusinessRulesForCreate(equipmentData);
      
      const newEquipment = await EquipmentClient.create(equipmentData);
      
      // Apply any post-creation business logic here if needed
      return newEquipment;
    } catch (error) {
      console.error('Error in EquipmentManagementService.create:', error);
      throw error;
    }
  }

  static async createEquipmentWithMaintenance(data) {
    try {
      const { equipment, maintenanceTemplates } = data;
      
      // Validate input
      this.validateCreateEquipmentWithMaintenanceData(data);
      
      console.log('Creating equipment with maintenance templates...');
      
      // Step 1: Create physical equipment
      const equipmentRecord = await this.create(equipment);
      
      // Step 2: Create maintenance templates
      // Note: This would need access to MaintenanceTemplateService
      // For now, we'll return the equipment and let the maintenance service handle templates
      
      return {
        equipment: equipmentRecord,
        maintenance_templates: [], // To be implemented with proper maintenance template creation
        success: true,
        message: `Created equipment successfully. Maintenance templates need to be created separately.`
      };
      
    } catch (error) {
      console.error('Error in EquipmentManagementService.createEquipmentWithMaintenance:', error);
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
      
      const updatedEquipment = await EquipmentClient.update(id, updateData);
      
      // Apply any post-update business logic here if needed
      return updatedEquipment;
    } catch (error) {
      console.error('Error in EquipmentManagementService.update:', error);
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
      
      const result = await EquipmentClient.delete(id);
      
      // Apply any post-deletion business logic here if needed
      return result;
    } catch (error) {
      console.error('Error in EquipmentManagementService.delete:', error);
      throw error;
    }
  }

  static async findByFarm(farmId, options = {}) {
    try {
      if (!farmId) {
        throw new AppError('Farm ID is required', 400, 'MISSING_FARM_ID');
      }

      const validatedOptions = this.validateFindAllOptions(options);
      
      return await EquipmentClient.findByFarm(farmId, validatedOptions);
    } catch (error) {
      console.error('Error in EquipmentManagementService.findByFarm:', error);
      throw error;
    }
  }

  static async getStatistics(farmId = null) {
    try {
      return await EquipmentClient.getStatistics(farmId);
    } catch (error) {
      console.error('Error in EquipmentManagementService.getStatistics:', error);
      throw error;
    }
  }

  // Private validation methods
  static validateFindAllOptions(options) {
    const {
      page = 1,
      limit = 20,
      search = '',
      farm_id = null,
      status = null,
      equipment_type = null
    } = options;

    // Validate page and limit
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 items per page

    // Validate search (sanitize)
    const validatedSearch = typeof search === 'string' ? search.trim().substring(0, 100) : '';

    // Validate filter values
    const validatedFarmId = farm_id && !isNaN(farm_id) ? parseInt(farm_id) : null;
    const validStatuses = ['active', 'inactive', 'maintenance', 'retired'];
    const validatedStatus = validStatuses.includes(status) ? status : null;
    const validatedEquipmentType = equipment_type && !isNaN(equipment_type) ? parseInt(equipment_type) : null;

    return {
      page: validatedPage,
      limit: validatedLimit,
      search: validatedSearch,
      farm_id: validatedFarmId,
      status: validatedStatus,
      equipment_type: validatedEquipmentType
    };
  }

  static validateCreateData(equipmentData) {
    if (!equipmentData) {
      throw new AppError('Equipment data is required', 400, 'MISSING_DATA');
    }

    const { _equipment, farm_id } = equipmentData;

    if (!_equipment) {
      throw new AppError('Equipment catalog reference is required', 400, 'MISSING_EQUIPMENT_CATALOG');
    }

    if (!farm_id) {
      throw new AppError('Farm ID is required', 400, 'MISSING_FARM_ID');
    }

    // Validate serial number if provided
    if (equipmentData.serial_number && equipmentData.serial_number.length > 100) {
      throw new AppError('Serial number must be 100 characters or less', 400, 'SERIAL_NUMBER_TOO_LONG');
    }

    // Validate status if provided
    const validStatuses = ['active', 'inactive', 'maintenance', 'retired'];
    if (equipmentData.status && !validStatuses.includes(equipmentData.status)) {
      throw new AppError('Invalid status. Must be one of: ' + validStatuses.join(', '), 400, 'INVALID_STATUS');
    }
  }

  static validateUpdateData(updateData) {
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError('Update data is required', 400, 'MISSING_DATA');
    }

    // Validate serial number if provided
    if (updateData.serial_number && updateData.serial_number.length > 100) {
      throw new AppError('Serial number must be 100 characters or less', 400, 'SERIAL_NUMBER_TOO_LONG');
    }

    // Validate status if provided
    const validStatuses = ['active', 'inactive', 'maintenance', 'retired'];
    if (updateData.status && !validStatuses.includes(updateData.status)) {
      throw new AppError('Invalid status. Must be one of: ' + validStatuses.join(', '), 400, 'INVALID_STATUS');
    }
  }

  static validateCreateEquipmentWithMaintenanceData(data) {
    if (!data) {
      throw new AppError('Data is required', 400, 'MISSING_DATA');
    }

    const { equipment, maintenanceTemplates } = data;

    if (!equipment) {
      throw new AppError('Equipment data is required', 400, 'MISSING_EQUIPMENT_DATA');
    }

    if (!maintenanceTemplates || !Array.isArray(maintenanceTemplates) || maintenanceTemplates.length === 0) {
      throw new AppError('At least one maintenance template is required', 400, 'MISSING_MAINTENANCE_TEMPLATES');
    }

    // Validate equipment data
    this.validateCreateData(equipment);

    // Validate each maintenance template
    for (const template of maintenanceTemplates) {
      if (!template.interval || !template.schedule_type || !template.maintenance_name || 
          !template.maintenance_category || !template.part_or_consumable) {
        throw new AppError('All maintenance template fields are required', 400, 'INVALID_MAINTENANCE_TEMPLATE');
      }
    }
  }

  static async checkBusinessRulesForCreate(equipmentData) {
    // Check if catalog entry exists
    try {
      await EquipmentService.findById(equipmentData._equipment);
    } catch (error) {
      throw new AppError('Referenced equipment catalog entry not found', 400, 'INVALID_CATALOG_REFERENCE');
    }

    // Additional business rules can be added here
  }

  static async checkBusinessRulesForUpdate(id, updateData) {
    // Check if equipment exists first
    await EquipmentClient.findById(id);
    
    // Additional business rules can be added here
  }

  static async checkBusinessRulesForDelete(id) {
    // Check if equipment exists first
    await EquipmentClient.findById(id);
    
    // Check for active maintenance records, tasks, etc.
    const maintenanceCount = await this.getMaintenanceCountForEquipment(id);
    if (maintenanceCount > 0) {
      throw new AppError('Cannot delete equipment with active maintenance templates', 409, 'EQUIPMENT_HAS_MAINTENANCE');
    }
  }
}

module.exports = EquipmentManagementService;