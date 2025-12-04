const dbConnection = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class EquipmentModelClient {
  static async create(modelData) {
    try {
      const { name, make, created_by = null, created_in = null } = modelData;
      
      console.log('DEBUG: create called with name:', name);
      
      // Check if name already exists for this make
      const isUnique = await this.checkNameUniqueForMake(name, make);
      console.log('DEBUG: create - isUnique result:', isUnique);
      
      if (!isUnique) {
        console.log('DEBUG: create - throwing duplicate name error');
        throw new AppError('Equipment model name already exists for this make', 409, 'DUPLICATE_NAME');
      }
      
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_model')
        .insert({
          name,
          make,
          created_by,
          created_in,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment model created successfully', { id: data.id, name: data.name });
      
      return data;
    } catch (error) {
      console.error('Failed to create equipment model', error, { modelData });
      throw error;
    }
  }

  static async findById(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_model')
        .select(`
          *,
          _equipment_make!inner(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Equipment model not found', 404, 'EQUIPMENT_MODEL_NOT_FOUND');
        }
        throw error;
      }
      
      // Flatten the make data
      data.make_name = data._equipment_make?.name || '';
      delete data._equipment_make;
      
      // Add computed counts (simplified for now)
      data.trim_count = 0;
      data.equipment_count = 0;
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find equipment model by ID', error, { id });
      throw error;
    }
  }

  static async findAll(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        sort = 'created_at', 
        order = 'desc',
        search = '',
        makeId = null
      } = options;
      
      console.log('DEBUG: EquipmentModelClient.findAll options:', { page, limit, sort, order, search, makeId });
      
      const supabase = dbConnection.getClient();
      
      // Start with base query including select
      let query = supabase
        .from('_equipment_model')
        .select(`
          *,
          _equipment_make!inner(name)
        `, { count: 'exact' });
      
      // Apply makeId filter if provided
      if (makeId) {
        console.log('DEBUG: Applying makeId filter:', makeId);
        query = query.eq('make', makeId);
      }
      
      if (search) {
        // Only search model names to avoid join syntax issues
        query = query.ilike('name', `%${search}%`);
      }
      
      // Apply sorting
      const ascending = order.toLowerCase() === 'asc';
      query = query.order(sort, { ascending });
      
      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      // For each equipment model, get user and farm names
      const dataWithRelations = await Promise.all(data.map(async (item) => {
        let created_by_name = null;
        let created_in_name = null;
        
        // Get user info if created_by exists
        if (item.created_by) {
          try {
            const { data: userResult } = await supabase
              .rpc('get_user_profile', { p_user_id: item.created_by });

            if (userResult?.success && userResult?.data) {
              created_by_name = userResult.data.display_name || userResult.data.email || item.created_by;
            } else {
              created_by_name = item.created_by; // Fallback to UUID
            }
          } catch (err) {
            console.warn('Failed to fetch user info for id:', item.created_by, err);
            created_by_name = item.created_by; // Fallback to UUID
          }
        }
        
        // Get farm name if created_in exists
        if (item.created_in) {
          try {
            const { data: farmData } = await supabase
              .from('farm')
              .select('name')
              .eq('id', item.created_in)
              .single();
            created_in_name = farmData?.name || null;
          } catch (err) {
            console.warn('Failed to fetch farm name for id:', item.created_in);
          }
        }
        
        return {
          ...item,
          make_name: item._equipment_make?.name || '',
          created_by_name,
          created_in_name,
          trim_count: 0,
          equipment_count: 0
        };
      }));
      
      // Clean up the joined data
      const processedData = dataWithRelations.map(item => {
        const cleaned = { ...item };
        delete cleaned._equipment_make;
        return cleaned;
      });
      
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: processedData,
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
      console.error('Failed to find all equipment models', error, { options });
      throw error;
    }
  }

  static async findByMake(makeId) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_model')
        .select('id, name')
        .eq('make', makeId)
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to find models by make', error, { makeId });
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      await this.findById(id);
      
      // Check if name is unique for the make (excluding current record)
      if (updateData.name && updateData.make) {
        const isUnique = await this.checkNameUniqueForMake(updateData.name, updateData.make, id);
        if (!isUnique) {
          throw new AppError('Equipment model name already exists for this make', 409, 'DUPLICATE_NAME');
        }
      }
      
      const supabase = dbConnection.getClient();
      
      const allowedFields = ['name', 'make'];
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
        .from('_equipment_model')
        .update(updateObject)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment model updated successfully', { id, fields: Object.keys(updateObject) });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to update equipment model', error, { id, updateData });
      throw error;
    }
  }

  static async delete(id) {
    try {
      await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      // Check for dependencies
      const { count: equipmentCount } = await supabase
        .from('_equipment')
        .select('*', { count: 'exact', head: true })
        .eq('model', id);
      
      if ((equipmentCount || 0) > 0) {
        throw new AppError(
          'Cannot delete equipment model with associated equipment',
          409,
          'EQUIPMENT_MODEL_HAS_DEPENDENCIES',
          {
            trim_count: 0,
            equipment_count: equipmentCount || 0
          }
        );
      }
      
      const { data, error } = await supabase
        .from('_equipment_model')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment model deleted successfully', { id });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to delete equipment model', error, { id });
      throw error;
    }
  }

  static async checkNameUniqueForMake(name, makeId, excludeId = null) {
    try {
      console.log('DEBUG: checkNameUniqueForMake called with:', { name, makeId, excludeId });
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('_equipment_model')
        .select('id')
        .eq('name', name)
        .eq('make', makeId);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      console.log('DEBUG: checkNameUniqueForMake found existing records:', data.length);
      const isUnique = data.length === 0;
      console.log('DEBUG: checkNameUniqueForMake result - isUnique:', isUnique);

      return isUnique;
    } catch (error) {
      console.error('Failed to check equipment model name uniqueness for make', error, { name, makeId, excludeId });
      throw error;
    }
  }

  static async findByNameAndMake(name, makeId) {
    try {
      const supabase = dbConnection.getClient();

      const { data, error } = await supabase
        .from('_equipment_model')
        .select('*')
        .eq('name', name)
        .eq('make', makeId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle not found gracefully

      if (error) {
        throw error;
      }

      return data; // Returns null if not found
    } catch (error) {
      console.error('Failed to find equipment model by name and make', error, { name, makeId });
      throw error;
    }
  }
}

module.exports = EquipmentModelClient;