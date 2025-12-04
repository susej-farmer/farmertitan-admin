const dbConnection = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class EquipmentClient {
  static async create(equipmentData) {
    try {
      const {
        name,
        equipment_model_id,
        make_id,
        equipment_type_id,
        farm_id,
        maintenance_items,
        initial_usage,
        created_by,
        serial_number,
        year_purchased,
        lease_owned,
        warranty_time,
        warranty_details
      } = equipmentData;

      const supabase = dbConnection.getClient();

      // Preparar parámetros para el RPC
      const rpcParams = {
        equipment_name: name,
        equipment_model_id: equipment_model_id,
        make_id: make_id,
        equipment_type_id: equipment_type_id,
        farm_id: farm_id,
        maintenance_items: maintenance_items,
        initial_usage: initial_usage,
        created_by_user_id: created_by,
        serial_number: serial_number,
        year_purchased: year_purchased,
        lease_owned: lease_owned,
        warranty_time: warranty_time,
        warranty_details: warranty_details,
        custom_checklists: [] // Array vacío para custom checklists
      };

      // Log de parámetros que se envían al stored procedure
      console.log('\n🔵 [CREATE_EQUIPMENT RPC] Calling stored procedure with params:', JSON.stringify(rpcParams, null, 2));

      // Llamar a la función create_equipment de PostgreSQL
      const { data, error } = await supabase.rpc('create_equipment', rpcParams);

      // Log de respuesta del stored procedure
      console.log('\n🟢 [CREATE_EQUIPMENT RPC] Response from database:', {
        hasError: !!error,
        dataType: typeof data,
        dataIsArray: Array.isArray(data),
        data: JSON.stringify(data, null, 2)
      });

      // Verificar errores de Supabase
      if (error) {
        console.error('❌ [CREATE_EQUIPMENT RPC] Error calling create_equipment RPC:', error);
        throw error;
      }

      // Verificar si el stored procedure retornó success: false
      if (data && data.success === false) {
        const errorMsg = data.error_message || 'Unknown database error';
        const errorCode = data.error_code || 'UNKNOWN_ERROR';

        console.error('❌ [CREATE_EQUIPMENT RPC] Equipment creation failed (business logic):', {
          error_code: errorCode,
          error_message: errorMsg,
          metadata: data.metadata
        });

        // Lanzar error con el mensaje del stored procedure
        const error = new Error(errorMsg);
        error.code = errorCode;
        error.metadata = data.metadata;
        throw error;
      }

      // Log detallado del resultado exitoso
      console.log('✅ [CREATE_EQUIPMENT RPC] Equipment created successfully');
      console.log('   - Data structure:', {
        hasIdField: 'id' in (data || {}),
        dataKeys: data ? Object.keys(data) : [],
        idValue: data?.id,
        fullData: data
      });

      // El stored procedure retorna { data: {...}, success: true, metadata: {...} }
      // Extraer solo el objeto 'data' que contiene el equipment creado
      if (data && data.success === true && data.data) {
        console.log('✅ [CREATE_EQUIPMENT RPC] Returning equipment object with ID:', data.data.id);
        return data.data; // ← Retornar solo el equipment, no el wrapper
      }

      // Si la estructura es diferente, retornar tal cual (fallback)
      return data;
    } catch (error) {
      console.error('Failed to create physical equipment', error, { equipmentData });
      throw error;
    }
  }

  static async findById(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          *,
          _equipment!inner(
            id,
            type,
            make,
            model,
            trim,
            year,
            _equipment_type!inner(name),
            _equipment_make!inner(name),
            _equipment_model!inner(name),
            _equipment_trim(name)
          ),
          farm!inner(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Equipment not found', 404, 'EQUIPMENT_NOT_FOUND');
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find equipment by ID', error, { id });
      throw error;
    }
  }

  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search = '',
        farm_id = null,
        status = null,
        equipment_type = null
      } = options;
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('equipment')
        .select(`
          *,
          _equipment!inner(
            id,
            type,
            make,
            model,
            trim,
            year,
            _equipment_type!inner(name),
            _equipment_make!inner(name),
            _equipment_model!inner(name),
            _equipment_trim(name)
          ),
          farm!inner(name)
        `, { count: 'exact' });
      
      // Apply search filter
      if (search) {
        query = query.or(`serial_number.ilike.%${search}%,_equipment._equipment_type.name.ilike.%${search}%,_equipment._equipment_make.name.ilike.%${search}%,_equipment._equipment_model.name.ilike.%${search}%`);
      }
      
      // Apply filters
      if (farm_id) {
        query = query.eq('farm_id', farm_id);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (equipment_type) {
        query = query.eq('_equipment.type', equipment_type);
      }
      
      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: data || [],
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
      console.error('Failed to find all equipment', error, { options });
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Check if equipment exists
      await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      const allowedFields = ['serial_number', 'purchase_date', 'status', 'farm_id', 'notes'];
      const updateObject = {};
      
      for (const [field, value] of Object.entries(updateData)) {
        if (allowedFields.includes(field) && value !== undefined) {
          updateObject[field] = value;
        }
      }
      
      if (Object.keys(updateObject).length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_FIELDS_TO_UPDATE');
      }
      
      const { data, error } = await supabase
        .from('equipment')
        .update(updateObject)
        .eq('id', id)
        .select(`
          *,
          _equipment!inner(
            id,
            type,
            make,
            model,
            trim,
            year,
            _equipment_type!inner(name),
            _equipment_make!inner(name),
            _equipment_model!inner(name),
            _equipment_trim(name)
          ),
          farm!inner(name)
        `)
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment updated successfully', { id, fields: Object.keys(updateObject) });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to update equipment', error, { id, updateData });
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Check if equipment exists
      await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      // Check for dependencies (maintenance records, tasks, etc.)
      // Add dependency checks here if needed
      
      const { data, error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment deleted successfully', { id });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to delete equipment', error, { id });
      throw error;
    }
  }

  static async findByFarm(farmId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status = null,
        equipment_type = null
      } = options;

      const supabase = dbConnection.getClient();

      // Build query with all required relationships
      let query = supabase
        .from('equipment')
        .select(`
          *,
          farm!inner(id, name),
          _equipment!inner(
            id,
            _equipment_type!inner(id, name),
            _equipment_make!inner(id, name),
            _equipment_model!inner(id, name)
          ),
          equipment_usage_type(
            _time!usage_time_id(id, type, value, metadata)
          )
        `, { count: 'exact' })
        .eq('farm', farmId);

      // Apply search filter
      if (search) {
        query = query.or(`name.ilike.%${search}%,serial_number.ilike.%${search}%`);
      }

      // Apply status filter
      if (status) {
        query = query.eq('status', status);
      }

      // Apply equipment type filter
      if (equipment_type) {
        query = query.eq('_equipment._equipment_type.id', equipment_type);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Import TaskClient to get maintenance tasks
      const TaskClient = require('./taskClient');

      // Post-process each equipment to add maintenance tasks
      const equipmentWithTasks = await Promise.all((data || []).map(async (equipment) => {
        try {
          // Get maintenance tasks for this equipment
          const maintenanceTasks = await TaskClient.findByEquipmentAndType(
            equipment.id,
            'template:maintenance'
          );

          return {
            ...equipment,
            maintenance_tasks: {
              count: maintenanceTasks.length,
              tasks: maintenanceTasks
            }
          };
        } catch (taskError) {
          console.error('Failed to fetch tasks for equipment', taskError, { equipmentId: equipment.id });
          // Continue with empty tasks if fetch fails
          return {
            ...equipment,
            maintenance_tasks: {
              count: 0,
              tasks: []
            }
          };
        }
      }));

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: equipmentWithTasks,
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
      console.error('Failed to find equipment by farm', error, { farmId, options });
      throw error;
    }
  }

  static async findByCatalogEntry(catalogId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20 
      } = options;
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('equipment')
        .select(`
          *,
          _equipment!inner(
            id,
            type,
            make,
            model,
            trim,
            year,
            _equipment_type!inner(name),
            _equipment_make!inner(name),
            _equipment_model!inner(name),
            _equipment_trim(name)
          ),
          farm!inner(name)
        `, { count: 'exact' })
        .eq('_equipment', catalogId);
      
      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: data || [],
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
      console.error('Failed to find equipment by catalog entry', error, { catalogId, options });
      throw error;
    }
  }

  static async getStatistics(farmId = null) {
    try {
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true });
      
      if (farmId) {
        query = query.eq('farm_id', farmId);
      }
      
      const { count: totalEquipment } = await query;
      
      // Get active equipment count
      let activeQuery = supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      if (farmId) {
        activeQuery = activeQuery.eq('farm_id', farmId);
      }
      
      const { count: activeEquipment } = await activeQuery;
      
      return {
        total_equipment: totalEquipment || 0,
        active_equipment: activeEquipment || 0,
        inactive_equipment: (totalEquipment || 0) - (activeEquipment || 0)
      };
    } catch (error) {
      console.error('Failed to get equipment statistics', error);
      throw error;
    }
  }

  /**
   * Buscar equipment por serial number (global, en todas las granjas)
   * @param {string} serialNumber - Número de serie del equipment
   * @returns {Promise<Object|null>} Equipment encontrado o null
   */
  static async findBySerialNumber(serialNumber) {
    try {
      if (!serialNumber) {
        return null;
      }

      const supabase = dbConnection.getClient();

      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, serial_number, farm, status')
        .eq('serial_number', serialNumber)
        .single();

      if (error) {
        // Si no encuentra nada, Supabase devuelve error PGRST116
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to find equipment by serial number', error);
      throw error;
    }
  }

  /**
   * Buscar equipment por nombre dentro de una granja específica
   * @param {string} equipmentName - Nombre del equipment
   * @param {string} farmId - UUID de la granja
   * @returns {Promise<Object|null>} Equipment encontrado o null
   */
  static async findByNameAndFarm(equipmentName, farmId) {
    try {
      if (!equipmentName || !farmId) {
        return null;
      }

      const supabase = dbConnection.getClient();

      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, serial_number, farm, status')
        .eq('name', equipmentName)
        .eq('farm', farmId)
        .single();

      if (error) {
        // Si no encuentra nada, Supabase devuelve error PGRST116
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to find equipment by name and farm', error);
      throw error;
    }
  }
}

module.exports = EquipmentClient;