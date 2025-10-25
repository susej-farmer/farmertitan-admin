const dbConnection = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class EquipmentMakeClient {
  static async create(makeData) {
    try {
      const { name, created_by = null, created_in = null } = makeData;
      
      console.log('DEBUG: create called with name:', name);
      
      // Check if name already exists
      const isUnique = await this.checkNameUnique(name);
      console.log('DEBUG: create - isUnique result:', isUnique);
      
      if (!isUnique) {
        console.log('DEBUG: create - throwing duplicate name error');
        throw new AppError('Equipment make name already exists', 409, 'DUPLICATE_NAME');
      }
      
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_make')
        .insert({
          name,
          created_by,
          created_in,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment make created successfully', { id: data.id, name: data.name });
      
      return data;
    } catch (error) {
      console.error('Failed to create equipment make', error, { makeData });
      throw error;
    }
  }

  static async findById(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_make')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Equipment make not found', 404, 'EQUIPMENT_MAKE_NOT_FOUND');
        }
        throw error;
      }
      
      // Get related user and farm names if IDs exist
      if (data.created_by) {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', data.created_by)
          .single();
        data.created_by_name = userData?.email || null;
      }
      
      if (data.created_in) {
        const { data: farmData } = await supabase
          .from('farm')
          .select('name')
          .eq('id', data.created_in)
          .single();
        data.created_in_name = farmData?.name || null;
      }
      
      // Add computed counts (simplified for now)
      data.model_count = 0;
      data.equipment_count = 0;
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find equipment make by ID', error, { id });
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
        search = ''
      } = options;
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('_equipment_make')
        .select('*', { count: 'exact' });
      
      // Apply search filter
      if (search) {
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
      
      // For each equipment make, get user and farm names
      const dataWithRelations = await Promise.all(data.map(async (item) => {
        let created_by_name = null;
        let created_in_name = null;
        
        // Get user email if created_by exists
        if (item.created_by) {
          try {
            console.log('DEBUG: Fetching user for created_by:', item.created_by);
            const { data: userData, error: userError } = await supabase
              .from('user_profiles')
              .select('email')
              .eq('id', item.created_by)
              .single();
            console.log('DEBUG: User query result:', { userData, userError });
            created_by_name = userData?.email || item.created_by; // Fallback to UUID if no email
          } catch (err) {
            console.warn('Failed to fetch user email for id:', item.created_by, err);
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
          model_count: 0, // Will be updated with actual counts later if needed
          equipment_count: 0,
          created_by_name,
          created_in_name
        };
      }));
      
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: dataWithRelations,
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
      console.error('Failed to find all equipment makes', error, { options });
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Check if equipment make exists
      await this.findById(id);
      
      // Check if name is unique (excluding current record)
      if (updateData.name) {
        const isUnique = await this.checkNameUnique(updateData.name, id);
        if (!isUnique) {
          throw new AppError('Equipment make name already exists', 409, 'DUPLICATE_NAME');
        }
      }
      
      const supabase = dbConnection.getClient();
      
      const allowedFields = ['name'];
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
        .from('_equipment_make')
        .update(updateObject)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment make updated successfully', { id, fields: Object.keys(updateObject) });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to update equipment make', error, { id, updateData });
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Check if equipment make exists
      await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      // Check for dependencies
      const { count: modelCount } = await supabase
        .from('_equipment_model')
        .select('*', { count: 'exact', head: true })
        .eq('make', id);
      
      const { count: equipmentCount } = await supabase
        .from('_equipment')
        .select('*', { count: 'exact', head: true })
        .eq('make', id);
      
      if ((modelCount || 0) > 0 || (equipmentCount || 0) > 0) {
        throw new AppError(
          'Cannot delete equipment make with associated models or equipment',
          409,
          'EQUIPMENT_MAKE_HAS_DEPENDENCIES',
          {
            model_count: modelCount || 0,
            equipment_count: equipmentCount || 0
          }
        );
      }
      
      const { data, error } = await supabase
        .from('_equipment_make')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment make deleted successfully', { id });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to delete equipment make', error, { id });
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null) {
    try {
      console.log('DEBUG: checkNameUnique called with:', { name, excludeId });
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('_equipment_make')
        .select('id')
        .eq('name', name); // Changed from ilike to eq for exact match
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      console.log('DEBUG: checkNameUnique found existing records:', data.length);
      const isUnique = data.length === 0;
      console.log('DEBUG: checkNameUnique result - isUnique:', isUnique);
      
      return isUnique;
    } catch (error) {
      console.error('Failed to check equipment make name uniqueness', error, { name, excludeId });
      throw error;
    }
  }

  static async findForDropdown() {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_make')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to find equipment makes for dropdown', error);
      throw error;
    }
  }

  static async findForDropdownWithModels() {
    try {
      const supabase = dbConnection.getClient();
      
      // Get only makes that have at least one model associated
      const { data, error } = await supabase
        .from('_equipment_make')
        .select(`
          id, 
          name,
          _equipment_model!inner(id)
        `)
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      // Clean up the data to only return id and name
      const cleanedData = data.map(item => ({
        id: item.id,
        name: item.name
      }));
      
      // Remove duplicates (in case a make has multiple models)
      const uniqueMakes = cleanedData.filter((make, index, self) =>
        index === self.findIndex(m => m.id === make.id)
      );
      
      return uniqueMakes;
    } catch (error) {
      console.error('Failed to find equipment makes with models for dropdown', error);
      throw error;
    }
  }

  static async findModelsForMake(makeId) {
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
      console.error('Failed to find models for make', error, { makeId });
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const supabase = dbConnection.getClient();
      
      // Get basic count
      const { count: totalMakes } = await supabase
        .from('_equipment_make')
        .select('*', { count: 'exact', head: true });
      
      // For now, return simplified statistics
      return {
        total_makes: totalMakes || 0,
        total_models: 0,
        total_equipment: 0,
        avg_models_per_make: 0
      };
    } catch (error) {
      console.error('Failed to get equipment make statistics', error);
      throw error;
    }
  }
}

module.exports = EquipmentMakeClient;