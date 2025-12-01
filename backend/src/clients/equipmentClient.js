const dbConnection = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class EquipmentClient {
  static async create(equipmentData) {
    try {
      const { _equipment, serial_number, purchase_date, status = 'active', farm_id, notes } = equipmentData;
      
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          _equipment,
          serial_number,
          purchase_date,
          status,
          farm_id,
          notes,
          created_at: new Date().toISOString()
        })
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
          )
        `)
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Physical equipment created successfully', { id: data.id });
      
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
      const optionsWithFarm = {
        ...options,
        farm_id: farmId
      };
      
      return await this.findAll(optionsWithFarm);
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
}

module.exports = EquipmentClient;