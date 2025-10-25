const TransactionManager = require('../database/transactions');
const MaintenanceTemplateService = require('./maintenanceTemplateService');
const logger = require('../database/logger');
const { AppError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

class EquipmentCreationService {
  static async createEquipmentWithUsage(equipmentData, farmId, createdBy = null) {
    const {
      name,
      _equipment: equipmentCatalogId,
      initial_usage_value,
      initial_usage_type,
      serial_number = null,
      year_purchased = null,
      metadata = {}
    } = equipmentData;

    try {
      // Validate references first
      await this.validateReferences(equipmentCatalogId, farmId, serial_number);

      const operations = [];
      const equipmentId = uuidv4();
      const timeId = uuidv4();

      // 1. Create equipment record
      operations.push({
        name: 'create_equipment',
        query: `
          INSERT INTO equipment (id, name, _equipment, farm, serial_number, year_purchased, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `,
        params: [
          equipmentId,
          name,
          equipmentCatalogId,
          farmId,
          serial_number,
          year_purchased,
          JSON.stringify(metadata)
        ]
      });

      // 2. Create _time record for initial usage
      const usageTypeMapping = {
        'Hours': 'usage:hours',
        'Kilometers': 'usage:distance:km',
        'Miles': 'usage:distance:miles'
      };

      const timeType = usageTypeMapping[initial_usage_type] || 'usage:hours';
      const timeMetadata = {
        usage_type: initial_usage_type,
        equipment_id: equipmentId,
        initial_value: true
      };

      operations.push({
        name: 'create_time_record',
        query: `
          INSERT INTO _time (id, type, value, metadata, created_at)
          VALUES ($1, $2, $3, $4, NOW())
        `,
        params: [timeId, timeType, initial_usage_value, JSON.stringify(timeMetadata)]
      });

      // 3. Create equipment_usage_type association
      operations.push({
        name: 'create_usage_type_association',
        query: `
          INSERT INTO equipment_usage_type (equipment_id, usage_time_id)
          VALUES ($1, $2)
        `,
        params: [equipmentId, timeId]
      });

      // 4. Create initial equipment_usage_log entry
      operations.push({
        name: 'create_initial_usage_log',
        query: `
          INSERT INTO equipment_usage_log (id, equipment_id, usage_time_id, value, previous_value, reason, created_by, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `,
        params: [
          uuidv4(),
          equipmentId,
          timeId,
          initial_usage_value,
          0,
          'Initial equipment setup',
          createdBy
        ]
      });

      // Execute all operations in a transaction
      const result = await TransactionManager.executeTransaction(operations, {
        operation: 'create_equipment_with_usage',
        equipment_name: name,
        farm_id: farmId,
        initial_usage: `${initial_usage_value} ${initial_usage_type}`
      });

      // Apply maintenance templates to the new equipment
      try {
        const maintenanceResult = await MaintenanceTemplateService.applyTemplatesToEquipment(equipmentId);
        logger.info('Applied maintenance templates to new equipment', {
          equipment_id: equipmentId,
          templates_applied: maintenanceResult.templates_applied
        });
      } catch (maintenanceError) {
        logger.warn('Failed to apply maintenance templates to new equipment', {
          equipment_id: equipmentId,
          error: maintenanceError.message
        });
        // Don't fail the equipment creation if maintenance template application fails
      }

      // Return the created equipment with full details
      return await this.getEquipmentById(equipmentId);

    } catch (error) {
      logger.error('Failed to create equipment with usage', {
        error: error.message,
        equipmentData,
        farmId,
        stack: error.stack
      });
      throw error;
    }
  }

  static async validateReferences(equipmentCatalogId, farmId, serialNumber = null) {
    const dbConnection = require('../database/connection');

    // Validate equipment catalog exists
    const catalogQuery = `
      SELECT e.id, e.type, et.name as type_name, em.name as make_name, emod.name as model_name
      FROM _equipment e
      JOIN _equipment_type et ON e.type = et.id
      JOIN _equipment_make em ON e.make = em.id
      JOIN _equipment_model emod ON e.model = emod.id
      WHERE e.id = $1
    `;
    
    const catalogResult = await dbConnection.query(catalogQuery, [equipmentCatalogId]);
    
    if (catalogResult.rows.length === 0) {
      throw new AppError('Equipment catalog entry not found', 400, 'INVALID_EQUIPMENT_CATALOG');
    }

    // Validate farm exists and is active
    const farmQuery = 'SELECT id, name, active FROM farm WHERE id = $1';
    const farmResult = await dbConnection.query(farmQuery, [farmId]);
    
    if (farmResult.rows.length === 0) {
      throw new AppError('Farm not found', 400, 'INVALID_FARM');
    }
    
    if (!farmResult.rows[0].active) {
      throw new AppError('Cannot add equipment to inactive farm', 400, 'FARM_INACTIVE');
    }

    // Validate serial number uniqueness within the farm (if provided)
    if (serialNumber) {
      const serialQuery = `
        SELECT id, name 
        FROM equipment 
        WHERE farm = $1 AND serial_number = $2
      `;
      
      const serialResult = await dbConnection.query(serialQuery, [farmId, serialNumber]);
      
      if (serialResult.rows.length > 0) {
        throw new AppError(
          'Serial number already exists for this farm', 
          409, 
          'DUPLICATE_SERIAL_NUMBER',
          {
            existing_equipment: serialResult.rows[0].name,
            serial_number: serialNumber
          }
        );
      }
    }

    return catalogResult.rows[0];
  }

  static async getEquipmentById(equipmentId) {
    try {
      const dbConnection = require('../database/connection');
      
      const query = `
        SELECT 
          e.id,
          e.name,
          e.serial_number,
          e.year_purchased,
          e.metadata,
          e.created_at,
          f.id as farm_id,
          f.name as farm_name,
          ec.id as catalog_id,
          et.id as equipment_type_id,
          et.name as equipment_type_name,
          em.id as make_id,
          em.name as make_name,
          emod.id as model_id,
          emod.name as model_name,
          etrim.id as trim_id,
          etrim.name as trim_name,
          ec.year as catalog_year,
          ec.metadata as catalog_metadata,
          tm.id as usage_time_id,
          tm.type as usage_type_raw,
          tm.value as current_usage_value,
          CASE 
            WHEN tm.type = 'usage:hours' THEN 'Hours'
            WHEN tm.type = 'usage:distance:km' THEN 'Kilometers'
            WHEN tm.type = 'usage:distance:miles' THEN 'Miles'
            ELSE tm.type
          END as usage_type,
          COUNT(DISTINCT t.id) as total_tasks,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pending') as pending_tasks,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks
        FROM equipment e
        JOIN farm f ON e.farm = f.id
        JOIN _equipment ec ON e._equipment = ec.id
        JOIN _equipment_type et ON ec.type = et.id
        JOIN _equipment_make em ON ec.make = em.id
        JOIN _equipment_model emod ON ec.model = emod.id
        LEFT JOIN _equipment_trim etrim ON ec.trim = etrim.id
        LEFT JOIN equipment_usage_type eut ON e.id = eut.equipment_id
        LEFT JOIN _time tm ON eut.usage_time_id = tm.id
        LEFT JOIN task t ON e.id = t._equipment
        WHERE e.id = $1
        GROUP BY e.id, e.name, e.serial_number, e.year_purchased, e.metadata, e.created_at,
                 f.id, f.name, ec.id, et.id, et.name, em.id, em.name, emod.id, emod.name,
                 etrim.id, etrim.name, ec.year, ec.metadata, tm.id, tm.type, tm.value
      `;
      
      const result = await dbConnection.query(query, [equipmentId]);
      
      if (result.rows.length === 0) {
        throw new AppError('Equipment not found', 404, 'EQUIPMENT_NOT_FOUND');
      }
      
      const equipment = result.rows[0];
      
      return {
        id: equipment.id,
        name: equipment.name,
        serial_number: equipment.serial_number,
        year_purchased: equipment.year_purchased,
        metadata: equipment.metadata,
        created_at: equipment.created_at,
        farm: {
          id: equipment.farm_id,
          name: equipment.farm_name
        },
        catalog: {
          id: equipment.catalog_id,
          year: equipment.catalog_year,
          metadata: equipment.catalog_metadata,
          equipment_type: {
            id: equipment.equipment_type_id,
            name: equipment.equipment_type_name
          },
          make: {
            id: equipment.make_id,
            name: equipment.make_name
          },
          model: {
            id: equipment.model_id,
            name: equipment.model_name
          },
          trim: equipment.trim_id ? {
            id: equipment.trim_id,
            name: equipment.trim_name
          } : null
        },
        current_usage: equipment.usage_time_id ? {
          time_id: equipment.usage_time_id,
          type: equipment.usage_type,
          value: parseFloat(equipment.current_usage_value)
        } : null,
        task_summary: {
          total: parseInt(equipment.total_tasks),
          pending: parseInt(equipment.pending_tasks),
          completed: parseInt(equipment.completed_tasks)
        }
      };
      
    } catch (error) {
      if (error.isOperational) throw error;
      logger.error('Failed to get equipment by ID', {
        error: error.message,
        equipmentId,
        stack: error.stack
      });
      throw error;
    }
  }

  static async updateEquipmentUsage(equipmentId, newUsageValue, reason, createdBy = null) {
    try {
      const equipment = await this.getEquipmentById(equipmentId);
      
      if (!equipment.current_usage) {
        throw new AppError('Equipment has no usage tracking setup', 400, 'NO_USAGE_TRACKING');
      }

      const currentValue = equipment.current_usage.value;
      
      if (newUsageValue < currentValue) {
        throw new AppError(
          'New usage value cannot be less than current value',
          400,
          'INVALID_USAGE_VALUE',
          { current: currentValue, new: newUsageValue }
        );
      }

      const operations = [
        // Update the time record
        {
          name: 'update_usage_time',
          query: `
            UPDATE _time 
            SET value = $1, metadata = metadata || $2
            WHERE id = $3
          `,
          params: [
            newUsageValue,
            JSON.stringify({ last_updated: new Date().toISOString() }),
            equipment.current_usage.time_id
          ]
        },
        // Create usage log entry
        {
          name: 'create_usage_log',
          query: `
            INSERT INTO equipment_usage_log (id, equipment_id, usage_time_id, value, previous_value, reason, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `,
          params: [
            uuidv4(),
            equipmentId,
            equipment.current_usage.time_id,
            newUsageValue,
            currentValue,
            reason,
            createdBy
          ]
        }
      ];

      await TransactionManager.executeTransaction(operations, {
        operation: 'update_equipment_usage',
        equipment_id: equipmentId,
        previous_value: currentValue,
        new_value: newUsageValue,
        reason
      });

      return await this.getEquipmentById(equipmentId);

    } catch (error) {
      if (error.isOperational) throw error;
      logger.error('Failed to update equipment usage', {
        error: error.message,
        equipmentId,
        newUsageValue,
        reason,
        stack: error.stack
      });
      throw error;
    }
  }

  static async getEquipmentUsageHistory(equipmentId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;
      
      const dbConnection = require('../database/connection');
      
      const query = `
        SELECT 
          eul.id,
          eul.value,
          eul.previous_value,
          eul.reason,
          eul.created_by,
          eul.created_at,
          eul.is_correction,
          t.name as related_task_name
        FROM equipment_usage_log eul
        LEFT JOIN task t ON eul.task_id = t.id
        WHERE eul.equipment_id = $1
        ORDER BY eul.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total
        FROM equipment_usage_log
        WHERE equipment_id = $1
      `;
      
      const [dataResult, countResult] = await Promise.all([
        dbConnection.query(query, [equipmentId, limit, offset]),
        dbConnection.query(countQuery, [equipmentId])
      ]);
      
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: dataResult.rows.map(row => ({
          ...row,
          value: parseFloat(row.value),
          previous_value: parseFloat(row.previous_value)
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
      
    } catch (error) {
      logger.error('Failed to get equipment usage history', {
        error: error.message,
        equipmentId,
        options,
        stack: error.stack
      });
      throw error;
    }
  }

  static async deleteEquipment(equipmentId) {
    try {
      const equipment = await this.getEquipmentById(equipmentId);
      
      // Check for active tasks
      const dbConnection = require('../database/connection');
      const activeTasksQuery = `
        SELECT COUNT(*) as count
        FROM task
        WHERE _equipment = $1 AND status NOT IN ('completed', 'cancelled')
      `;
      
      const activeTasksResult = await dbConnection.query(activeTasksQuery, [equipmentId]);
      const activeTasksCount = parseInt(activeTasksResult.rows[0].count);
      
      if (activeTasksCount > 0) {
        throw new AppError(
          'Cannot delete equipment with active tasks',
          409,
          'EQUIPMENT_HAS_ACTIVE_TASKS',
          { active_tasks: activeTasksCount }
        );
      }

      const operations = [
        // Delete usage logs
        {
          name: 'delete_usage_logs',
          query: 'DELETE FROM equipment_usage_log WHERE equipment_id = $1',
          params: [equipmentId]
        },
        // Delete usage type associations
        {
          name: 'delete_usage_type_associations',
          query: 'DELETE FROM equipment_usage_type WHERE equipment_id = $1',
          params: [equipmentId]
        },
        // Delete the equipment
        {
          name: 'delete_equipment',
          query: 'DELETE FROM equipment WHERE id = $1',
          params: [equipmentId]
        }
      ];

      // If equipment has usage tracking, also delete the time record
      if (equipment.current_usage) {
        operations.splice(2, 0, {
          name: 'delete_usage_time',
          query: 'DELETE FROM _time WHERE id = $1',
          params: [equipment.current_usage.time_id]
        });
      }

      await TransactionManager.executeTransaction(operations, {
        operation: 'delete_equipment',
        equipment_id: equipmentId,
        equipment_name: equipment.name
      });

      return equipment;

    } catch (error) {
      if (error.isOperational) throw error;
      logger.error('Failed to delete equipment', {
        error: error.message,
        equipmentId,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = EquipmentCreationService;