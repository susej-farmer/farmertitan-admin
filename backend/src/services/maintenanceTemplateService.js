const TimeClient = require('../clients/timeClient');
const TaskClient = require('../clients/taskClient');
const TaskSeriesClient = require('../clients/taskSeriesClient');
const EquipmentTypeClient = require('../clients/equipmentTypeClient');
const EquipmentCatalogClient = require('../clients/equipmentCatalogClient');
const PartTypeClient = require('../clients/partTypeClient');
const ConsumableTypeClient = require('../clients/consumableTypeClient');
const { createClient } = require('@supabase/supabase-js');

class MaintenanceTemplateService {
  
  // =====================================================================================
  // QUERY METHODS FOR MAINTENANCE VIEW
  // =====================================================================================
  
  /**
   * Get all equipment types and equipment that have maintenance templates
   */
  static async getEquipmentWithMaintenanceTemplates(filters = {}) {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    try {
      // Single optimized query with LEFT JOINs to get all data at once
      let query = supabase
        .from('_task_series')
        .select(`
          id,
          _equipment_type,
          _equipment,
          created_at,
          _equipment_type!left(
            id,
            name
          ),
          _equipment!left(
            id,
            year,
            _equipment_model!left(
              id,
              name,
              _equipment_make!left(
                id,
                name
              )
            ),
            _equipment_trim!left(
              id,
              name
            )
          )
        `)
        .eq('type', 'template:maintenance');
      
      // Apply filters
      if (filters.equipment_type) {
        query = query.eq('_equipment_type', filters.equipment_type);
      }
      
      const { data: taskSeriesData, error: taskSeriesError } = await query;
      
      if (taskSeriesError) throw taskSeriesError;
      
      // Group and aggregate data in JavaScript
      const equipmentMap = new Map();
      
      taskSeriesData.forEach(item => {
        // Use the actual IDs for grouping, not the full objects
        const equipmentTypeId = typeof item._equipment_type === 'object' ? item._equipment_type?.id : item._equipment_type;
        const equipmentId = typeof item._equipment === 'object' ? item._equipment?.id : item._equipment;
        
        const key = `${equipmentTypeId || 'null'}-${equipmentId || 'null'}`;
        
        if (!equipmentMap.has(key)) {
          // Access the relationship data correctly
          const equipmentTypeData = typeof item._equipment_type === 'object' ? item._equipment_type : null;
          const equipmentData = typeof item._equipment === 'object' ? item._equipment : null;
          
          equipmentMap.set(key, {
            _equipment_type_id: equipmentTypeId,
            _equipment_id: equipmentId,
            equipment_type_name: equipmentTypeData?.name || null,
            equipment_make_name: equipmentData?._equipment_model?._equipment_make?.name || null,
            equipment_model_name: equipmentData?._equipment_model?.name || null,
            equipment_trim_name: equipmentData?._equipment_trim?.name || null,
            equipment_year: equipmentData?.year || null,
            created_at: item.created_at,
            task_series_ids: [],
            count: 0
          });
        }
        
        equipmentMap.get(key).count++;
        equipmentMap.get(key).task_series_ids.push(item.id);
      });
      
      // Convert map to array
      const results = Array.from(equipmentMap.values()).map(item => ({
        _equipment_type_id: typeof item._equipment_type_id === 'object' ? item._equipment_type_id?.id : item._equipment_type_id,
        _equipment_id: typeof item._equipment_id === 'object' ? item._equipment_id?.id : item._equipment_id,
        equipment_type_name: item.equipment_type_name,
        equipment_make_name: item.equipment_make_name,
        equipment_model_name: item.equipment_model_name,
        equipment_trim_name: item.equipment_trim_name,
        equipment_year: item.equipment_year,
        created_at: item.created_at,
        maintenance_count: item.count,
        task_series_ids: item.task_series_ids
      }));
      
      // Sort results
      return results.sort((a, b) => {
        if (a.equipment_type_name !== b.equipment_type_name) {
          return (a.equipment_type_name || '').localeCompare(b.equipment_type_name || '');
        }
        if (a.equipment_make_name !== b.equipment_make_name) {
          return (a.equipment_make_name || '').localeCompare(b.equipment_make_name || '');
        }
        if (a.equipment_model_name !== b.equipment_model_name) {
          return (a.equipment_model_name || '').localeCompare(b.equipment_model_name || '');
        }
        if (a.equipment_trim_name !== b.equipment_trim_name) {
          return (a.equipment_trim_name || '').localeCompare(b.equipment_trim_name || '');
        }
        return (a.equipment_year || 0) - (b.equipment_year || 0);
      });
      
    } catch (error) {
      console.error('Error getting equipment with maintenance templates:', error);
      throw error;
    }
  }
  
  /**
   * Get maintenance tasks for a specific equipment or equipment type
   */
  static async getMaintenanceTasksForEquipment(equipmentId = null, equipmentTypeId = null) {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    try {
      // Optimized single query with JOINs - equivalent to:
      // SELECT ts.task_template, t.type, t.metadata, t.value, ta.name, ta.created_at
      // FROM _task_series ts
      // LEFT JOIN _time t ON ts.schedule=t.id
      // LEFT JOIN task ta ON ts.task_template=ta.id
      // WHERE ts._equipment_type='...' AND ts._equipment is null AND ts.type='template:maintenance'
      
      let query = supabase
        .from('_task_series')
        .select('task_template, schedule')
        .eq('type', 'template:maintenance');
      
      // Filter by specific equipment or equipment type
      if (equipmentId) {
        query = query.eq('_equipment', equipmentId);
      } else if (equipmentTypeId) {
        query = query.eq('_equipment_type', equipmentTypeId).is('_equipment', null);
      } else {
        throw new Error('Either equipmentId or equipmentTypeId must be provided');
      }
      
      const { data: results, error } = await query;
      
      if (error) throw error;
      
      if (!results || results.length === 0) {
        return [];
      }
      
      // Now fetch related data efficiently using batched queries
      const taskTemplateIds = [...new Set(results.map(r => r.task_template).filter(Boolean))];
      const scheduleIds = [...new Set(results.map(r => r.schedule).filter(Boolean))];
      
      // Batch fetch task data
      const taskData = new Map();
      if (taskTemplateIds.length > 0) {
        const { data: tasks } = await supabase
          .from('task')
          .select('id, name, description, created_at')
          .in('id', taskTemplateIds);
        
        tasks?.forEach(task => taskData.set(task.id, task));
      }
      
      // Batch fetch schedule data
      const scheduleData = new Map();
      if (scheduleIds.length > 0) {
        const { data: schedules } = await supabase
          .from('_time')
          .select('id, type, value, metadata')
          .in('id', scheduleIds);
        
        schedules?.forEach(schedule => scheduleData.set(schedule.id, schedule));
      }
      
      // Transform the data to match expected format
      return results.map(item => {
        const task = taskData.get(item.task_template);
        const schedule = scheduleData.get(item.schedule);
        
        return {
          task_template: item.task_template,
          task_id: task?.id || null,
          schedule_id: item.schedule,
          name: task?.name || 'Unknown Task',
          description: task?.description || '',
          created_at: task?.created_at || null,
          schedule_type: schedule?.type || 'Unknown',
          schedule_value: schedule?.value || 0,
          schedule_metadata: schedule?.metadata || null
        };
      });
      
    } catch (error) {
      console.error('Error getting maintenance tasks for equipment:', error);
      throw error;
    }
  }

  /**
   * Get available time types for schedule selection
   */
  static async getTimeTypes() {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    try {
      // Get distinct time types from _time table
      const { data, error } = await supabase
        .from('_time')
        .select('type')
        .not('type', 'is', null);
      
      if (error) throw error;
      
      // Get unique time types from database
      const dbTypes = [...new Set(data.map(item => item.type))];
      
      // Add any missing schedule types that should be available
      const allScheduleTypes = [
        'schedule:cron',
        'schedule:hours', 
        'schedule:distance',
        // Add existing non-schedule types for completeness
        ...dbTypes.filter(type => !type.startsWith('schedule:'))
      ];
      
      // Combine and deduplicate
      const allTypes = [...new Set([...dbTypes, ...allScheduleTypes])];
      
      return allTypes.sort();
      
    } catch (error) {
      console.error('Error getting time types:', error);
      throw error;
    }
  }

  /**
   * Update maintenance task template
   */
  static async updateMaintenanceTask(taskId, scheduleId, updateData) {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    try {
      const promises = [];
      
      // Update task table if task fields are provided
      if (updateData.name !== undefined || updateData.description !== undefined) {
        const taskUpdate = {};
        if (updateData.name !== undefined) taskUpdate.name = updateData.name;
        if (updateData.description !== undefined) taskUpdate.description = updateData.description;
        
        promises.push(
          supabase
            .from('task')
            .update(taskUpdate)
            .eq('id', taskId)
        );
      }
      
      // Update _time table if schedule fields are provided
      if (updateData.schedule_type !== undefined || updateData.schedule_value !== undefined || updateData.metadata_value !== undefined) {
        const timeUpdate = {};
        if (updateData.schedule_type !== undefined) timeUpdate.type = updateData.schedule_type;
        if (updateData.schedule_value !== undefined) timeUpdate.value = updateData.schedule_value;
        
        // Handle metadata - convert simple value to JSON format based on schedule_type
        if (updateData.metadata_value !== undefined) {
          if (updateData.metadata_value && updateData.schedule_type) {
            let metadata = {};
            
            if (updateData.schedule_type.includes('distance')) {
              metadata = { unit: updateData.metadata_value }; // km, miles
            } else if (updateData.schedule_type.includes('hour')) {
              metadata = { source: updateData.metadata_value }; // engine_hours, hours
            } else if (updateData.schedule_type.includes('cron')) {
              metadata = { period: updateData.metadata_value }; // daily, monthly, yearly
            } else {
              metadata = { value: updateData.metadata_value }; // fallback genérico
            }
            
            timeUpdate.metadata = metadata;
          } else {
            timeUpdate.metadata = null;
          }
        }
        
        promises.push(
          supabase
            .from('_time')
            .update(timeUpdate)
            .eq('id', scheduleId)
        );
      }
      
      // Execute all updates in parallel
      const results = await Promise.all(promises);
      
      // Check for errors
      for (const result of results) {
        if (result.error) throw result.error;
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating maintenance task:', error);
      throw error;
    }
  }
  
  // =====================================================================================
  // EQUIPMENT MANAGEMENT
  // =====================================================================================
  
  /**
   * Create or get existing _equipment record
   * Single responsibility: Manage _equipment creation with validation
   */
  static async createOrGetEquipment(equipmentData) {
    const { type, make, model, trim, year } = equipmentData;
    
    try {
      // Validate required fields
      if (!type || !make || !model) {
        throw new Error('Equipment Type, Make, and Model are required');
      }
      
      // Check if equipment combination already exists
      const existingEquipment = await EquipmentCatalogClient.findByTypeModelTrim(type, make, model, trim, year);
      if (existingEquipment) {
        return existingEquipment;
      }
      
      // Create new equipment
      const equipment = await EquipmentCatalogClient.create({
        type,
        make, 
        model,
        trim: trim || null,
        year: year || null
      });
      
      console.log('Equipment created:', equipment.id);
      return equipment;
      
    } catch (error) {
      console.error('Error creating equipment:', error);
      throw error;
    }
  }
  
  /**
   * Get all equipment with maintenance status
   * Returns equipment with indicator if they have maintenance templates
   */
  static async getEquipmentWithMaintenanceStatus(options = {}) {
    try {
      const equipment = await EquipmentCatalogClient.findAll(options);
      
      // Enhance each equipment with maintenance status
      const equipmentWithStatus = await Promise.all(
        equipment.data.map(async (item) => {
          const maintenanceCount = await this.getMaintenanceCountForEquipment(item.id);
          return {
            ...item,
            maintenance_count: maintenanceCount,
            has_maintenance: maintenanceCount > 0
          };
        })
      );
      
      return {
        data: equipmentWithStatus,
        pagination: equipment.pagination
      };
    } catch (error) {
      console.error('Error getting equipment with maintenance status:', error);
      throw error;
    }
  }
  
  /**
   * Get maintenance count for specific equipment
   */
  static async getMaintenanceCountForEquipment(equipmentId) {
    try {
      const maintenanceTemplates = await TaskSeriesClient.findByEquipment(equipmentId);
      return maintenanceTemplates ? maintenanceTemplates.length : 0;
    } catch (error) {
      console.error('Error getting maintenance count:', error);
      return 0;
    }
  }
  
  // =====================================================================================
  // MAINTENANCE TEMPLATE MANAGEMENT  
  // =====================================================================================
  
  /**
   * Create a maintenance template (task_template)
   * Single responsibility: Create task + _task_series + _time
   */
  static async createMaintenanceTemplate(templateData) {
    const {
      interval,
      schedule_type,
      equipment_type,
      equipment_id,
      maintenance_name,
      maintenance_description,
      maintenance_category,
      part_or_consumable,
      priority
    } = templateData;

    try {
      // Validate required fields
      if (!interval || !schedule_type || !equipment_type || !maintenance_name || !maintenance_category || !part_or_consumable) {
        throw new Error('Missing required fields for maintenance template creation');
      }

      // Validate interval is positive
      if (interval <= 0) {
        throw new Error('Interval must be a positive number');
      }

      // Validate schedule type
      if (!['Hours', 'Kilometers'].includes(schedule_type)) {
        throw new Error('Schedule type must be "Hours" or "Kilometers"');
      }

      // Validate maintenance category
      if (!['Part', 'Consumable'].includes(maintenance_category)) {
        throw new Error('Maintenance category must be "Part" or "Consumable"');
      }

      // Validate equipment type exists
      const equipmentTypeExists = await EquipmentTypeClient.findById(equipment_type);
      if (!equipmentTypeExists) {
        throw new Error('Referenced equipment type not found');
      }

      // Validate part or consumable exists
      let partTypeId = null;
      let consumableTypeId = null;
      
      if (maintenance_category === 'Part') {
        const partTypeExists = await PartTypeClient.findById(part_or_consumable);
        if (!partTypeExists) {
          throw new Error('Referenced part type not found');
        }
        partTypeId = part_or_consumable;
      } else if (maintenance_category === 'Consumable') {
        const consumableTypeExists = await ConsumableTypeClient.findById(part_or_consumable);
        if (!consumableTypeExists) {
          throw new Error('Referenced consumable type not found');
        }
        consumableTypeId = part_or_consumable;
      }

      // Check for duplicate maintenance template
      if (equipment_id) {
        const existingTemplate = await this.findDuplicateTemplate(equipment_id, partTypeId, consumableTypeId);
        if (existingTemplate) {
          throw new Error('A maintenance template for this equipment and part/consumable already exists');
        }
      }

      // Determine time type based on schedule_type
      const timeType = schedule_type === 'Hours' ? 'schedule:hours' : 'schedule:distance';
      
      // Create metadata for time record
      const timeMetadata = {
        schedule_type,
        maintenance_template: true,
        created_for: 'maintenance_template'
      };

      // Step 1: Create _time record
      console.log('Creating time record...');
      const timeRecord = await TimeClient.create({
        type: timeType,
        value: interval,
        metadata: timeMetadata
      });

      console.log('Time record created:', timeRecord.id);

      // Step 2: Create task record
      console.log('Creating task record...');
      const taskRecord = await TaskClient.create({
        type: 'template:maintenance',
        name: maintenance_name,
        description: maintenance_description || '',
        _equipment_type: equipment_type,
        _equipment: equipment_id || null,
        _part_type: partTypeId,
        _consumable_type: consumableTypeId,
        priority: priority || null,
        status: 'template'
      });

      console.log('Task record created:', taskRecord.id);

      // Step 3: Create _task_series record
      console.log('Creating task series record...');
      const taskSeriesRecord = await TaskSeriesClient.create({
        schedule: timeRecord.id,
        type: 'template:maintenance',
        task_template: taskRecord.id,
        _equipment_type: equipment_type,
        _equipment: equipment_id || null,
        _part_type: partTypeId,
        _consumable_type: consumableTypeId
      });

      console.log('Task series record created:', taskSeriesRecord.id);

      // Return the complete template information
      return {
        id: taskRecord.id,
        name: taskRecord.name,
        description: taskRecord.description,
        equipment_type,
        equipment_id,
        maintenance_category,
        part_or_consumable,
        priority,
        interval,
        schedule_type,
        time_record_id: timeRecord.id,
        task_series_id: taskSeriesRecord.id,
        created_at: taskRecord.created_at
      };

    } catch (error) {
      console.error('Error creating maintenance template:', error);
      throw error;
    }
  }
  
  /**
   * Check for duplicate maintenance template
   */
  static async findDuplicateTemplate(equipmentId, partTypeId, consumableTypeId) {
    try {
      const tasks = await TaskClient.findTemplates({
        equipment: equipmentId,
        part_type: partTypeId,
        consumable_type: consumableTypeId
      });
      return tasks.data.length > 0 ? tasks.data[0] : null;
    } catch (error) {
      console.error('Error checking for duplicate template:', error);
      return null;
    }
  }
  
  /**
   * Get maintenance templates for specific equipment
   */
  static async getMaintenanceTemplatesForEquipment(equipmentId) {
    try {
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
          enhancedTemplates.push(template);
        }
      }
      
      return enhancedTemplates;
    } catch (error) {
      console.error('Error getting maintenance templates for equipment:', error);
      throw error;
    }
  }
  
  // =====================================================================================
  // EQUIPMENT VALIDATION AND UPDATE
  // =====================================================================================
  
  /**
   * Validate and update equipment for a task series
   * Implements three validation scenarios:
   * 1. Equipment doesn't exist - create it and link to task series
   * 2. Equipment exists but has no task series - link this task series to it
   * 3. Equipment exists and has task series - prevent edit with error message
   */
  static async validateAndUpdateEquipment(taskSeriesId, equipmentData) {
    const { equipment_type_name, equipment_make_name, equipment_model_name, equipment_trim_name, equipment_year } = equipmentData;
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    try {
      // Step 1: Find the task series record to update
      const { data: taskSeries, error: taskSeriesError } = await supabase
        .from('_task_series')
        .select('*')
        .eq('id', taskSeriesId)
        .single();
        
      if (taskSeriesError) throw new Error('Task series not found');
      
      // Step 2: Get equipment type ID by name
      const { data: equipmentType, error: equipmentTypeError } = await supabase
        .from('_equipment_type')
        .select('id')
        .eq('name', equipment_type_name)
        .single();
        
      if (equipmentTypeError) throw new Error('Equipment type not found');
      
      // Step 3: Get equipment make ID by name
      const { data: equipmentMake, error: equipmentMakeError } = await supabase
        .from('_equipment_make')
        .select('id')
        .eq('name', equipment_make_name)
        .single();
        
      if (equipmentMakeError) throw new Error('Equipment make not found');
      
      // Step 4: Get equipment model ID by name and make
      const { data: equipmentModel, error: equipmentModelError } = await supabase
        .from('_equipment_model')
        .select('id')
        .eq('name', equipment_model_name)
        .eq('_equipment_make', equipmentMake.id)
        .single();
        
      if (equipmentModelError) throw new Error('Equipment model not found for the specified make');
      
      // Step 5: Get equipment trim ID by name (if provided)
      let equipmentTrimId = null;
      if (equipment_trim_name) {
        const { data: equipmentTrim } = await supabase
          .from('_equipment_trim')
          .select('id')
          .eq('name', equipment_trim_name)
          .single();
          
        if (equipmentTrim) {
          equipmentTrimId = equipmentTrim.id;
        }
      }
      
      // Step 6: Check if equipment combination exists in _equipment table
      let equipmentQuery = supabase
        .from('_equipment')
        .select('id')
        .eq('_equipment_model', equipmentModel.id);
        
      if (equipmentTrimId) {
        equipmentQuery = equipmentQuery.eq('_equipment_trim', equipmentTrimId);
      } else {
        equipmentQuery = equipmentQuery.is('_equipment_trim', null);
      }
      
      if (equipment_year) {
        equipmentQuery = equipmentQuery.eq('year', equipment_year);
      } else {
        equipmentQuery = equipmentQuery.is('year', null);
      }
      
      const { data: existingEquipment } = await equipmentQuery.single();
      
      // SCENARIO 1: Equipment doesn't exist - create it and link to task series
      if (!existingEquipment) {
        console.log('Scenario 1: Creating new equipment and linking to task series');
        
        // Create new equipment record
        const { data: newEquipment, error: createEquipmentError } = await supabase
          .from('_equipment')
          .insert({
            _equipment_model: equipmentModel.id,
            _equipment_trim: equipmentTrimId || null,
            year: equipment_year || null
          })
          .select('id')
          .single();
          
        if (createEquipmentError) throw createEquipmentError;
        
        // Update task series to link to new equipment
        const { error: updateTaskSeriesError } = await supabase
          .from('_task_series')
          .update({
            _equipment: newEquipment.id,
            _equipment_type: equipmentType.id
          })
          .eq('id', taskSeriesId);
          
        if (updateTaskSeriesError) throw updateTaskSeriesError;
        
        return {
          action: 'created_and_linked',
          equipment_id: newEquipment.id,
          message: 'Equipment created and linked to maintenance template successfully'
        };
      }
      
      // SCENARIO 2 & 3: Equipment exists - check if it has any other task series records
      const { data: existingTaskSeries, error: taskSeriesCheckError } = await supabase
        .from('_task_series')
        .select('id')
        .eq('_equipment', existingEquipment.id)
        .eq('type', 'template:maintenance')
        .neq('id', taskSeriesId); // Exclude the current task series
        
      if (taskSeriesCheckError) throw taskSeriesCheckError;
      
      // SCENARIO 3: Equipment exists and has OTHER maintenance records - prevent edit
      if (existingTaskSeries && existingTaskSeries.length > 0) {
        console.log('Scenario 3: Equipment has existing maintenance records - preventing edit');
        throw new Error('Equipment already has maintenance records. You cannot edit this combination. Please modify the existing equipment or add tasks to it instead.');
      }
      
      // SCENARIO 2: Equipment exists but has no OTHER task series - link this task series to it
      console.log('Scenario 2: Linking task series to existing equipment');
      
      const { error: linkTaskSeriesError } = await supabase
        .from('_task_series')
        .update({
          _equipment: existingEquipment.id,
          _equipment_type: equipmentType.id
        })
        .eq('id', taskSeriesId);
        
      if (linkTaskSeriesError) throw linkTaskSeriesError;
      
      return {
        action: 'linked_existing',
        equipment_id: existingEquipment.id,
        message: 'Task series linked to existing equipment successfully'
      };
      
    } catch (error) {
      console.error('Error validating and updating equipment:', error);
      throw error;
    }
  }

  // =====================================================================================
  // COMBINED OPERATIONS
  // =====================================================================================
  
  /**
   * Create equipment with default maintenance templates
   * Coordinates both equipment creation and maintenance template creation
   */
  static async createEquipmentWithMaintenance(data) {
    const { equipment, maintenanceTemplates } = data;
    
    try {
      console.log('Creating equipment with maintenance templates...');
      
      // Step 1: Create or get equipment
      const equipmentRecord = await this.createOrGetEquipment(equipment);
      
      // Step 2: Create maintenance templates
      const createdTemplates = [];
      
      for (const template of maintenanceTemplates) {
        try {
          const templateData = {
            ...template,
            equipment_type: equipment.type,
            equipment_id: equipmentRecord.id
          };
          
          const createdTemplate = await this.createMaintenanceTemplate(templateData);
          createdTemplates.push(createdTemplate);
        } catch (err) {
          console.error('Error creating maintenance template:', err);
          // Continue with other templates even if one fails
        }
      }
      
      return {
        equipment: equipmentRecord,
        maintenance_templates: createdTemplates,
        success: true,
        message: `Created equipment with ${createdTemplates.length} maintenance templates`
      };
      
    } catch (error) {
      console.error('Error creating equipment with maintenance:', error);
      throw error;
    }
  }
  
  // =====================================================================================
  // LEGACY METHODS (for backward compatibility)
  // =====================================================================================
  
  /**
   * Legacy method - redirects to new structure
   * @deprecated Use createMaintenanceTemplate instead
   */
  static async createTemplate(templateData) {
    return this.createMaintenanceTemplate(templateData);
  }
  
  /**
   * Get all maintenance templates with pagination and filtering
   */
  static async getTemplates(options = {}) {
    try {
      const result = await TaskClient.findTemplates(options);
      
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
          enhancedTemplates.push(template);
        }
      }
      
      return {
        data: enhancedTemplates,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error getting maintenance templates:', error);
      throw error;
    }
  }

  /**
   * Get a single maintenance template by ID with full details
   */
  static async getTemplateById(id) {
    try {
      const template = await TaskClient.findById(id);
      
      if (!template || template.type !== 'template:maintenance') {
        throw new Error('Maintenance template not found');
      }
      
      // Get task series information
      const taskSeries = await TaskSeriesClient.findByTaskTemplate(id);
      let scheduleInfo = null;
      
      if (taskSeries && taskSeries.length > 0) {
        const timeRecord = await TimeClient.findById(taskSeries[0].schedule);
        scheduleInfo = {
          interval: timeRecord.value,
          schedule_type: timeRecord.type === 'schedule:hours' ? 'Hours' : 'Distance',
          time_type: timeRecord.type,
          time_record_id: timeRecord.id,
          task_series_id: taskSeries[0].id
        };
      }
      
      return {
        ...template,
        schedule_info: scheduleInfo,
        maintenance_category: template._part_type ? 'Part' : 'Consumable',
        part_or_consumable_id: template._part_type ? template._part_type.id : template._consumable_type.id,
        part_or_consumable_name: template._part_type?.name || template._consumable_type?.name
      };
    } catch (error) {
      console.error('Error getting maintenance template by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a maintenance template and all related records
   */
  static async deleteTemplate(id) {
    try {
      const template = await this.getTemplateById(id);
      
      // Delete task series first
      await TaskSeriesClient.deleteByTaskTemplate(id);
      
      // Delete time record if it exists
      if (template.schedule_info?.time_record_id) {
        await TimeClient.delete(template.schedule_info.time_record_id);
      }
      
      // Delete task record
      await TaskClient.delete(id);
      
      return true;
    } catch (error) {
      console.error('Error deleting maintenance template:', error);
      throw error;
    }
  }
}

module.exports = MaintenanceTemplateService;