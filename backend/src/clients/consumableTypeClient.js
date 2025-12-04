const dbConnection = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class ConsumableTypeClient {

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
        .from('_consumable_type')
        .select('*', { count: 'exact' });
      
      // Apply search filter
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
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
      
      // For each consumable type, get user and farm names
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
      console.error('Failed to find all consumable types', error, { options });
      throw error;
    }
  }

  static async findById(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_consumable_type')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Consumable type not found', 404, 'CONSUMABLE_TYPE_NOT_FOUND');
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find consumable type by ID', error, { id });
      throw error;
    }
  }

  static async findForDropdown() {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_consumable_type')
        .select('id, name')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Failed to find consumable types for dropdown', error);
      throw error;
    }
  }

  static async create(consumableTypeData) {
    try {
      const { name, description = null, created_by = null, created_in = null } = consumableTypeData;
      
      console.log('DEBUG: create called with name:', name);
      
      // Check if name already exists
      const isUnique = await this.checkNameUnique(name);
      console.log('DEBUG: create - isUnique result:', isUnique);
      
      if (!isUnique) {
        console.log('DEBUG: create - throwing duplicate name error');
        throw new AppError('Consumable type name already exists', 409, 'DUPLICATE_NAME');
      }
      
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_consumable_type')
        .insert({
          name,
          description,
          created_by,
          created_in,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Consumable type created successfully', { id: data.id, name: data.name });
      
      return data;
    } catch (error) {
      console.error('Failed to create consumable type', error, { consumableTypeData });
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Check if consumable type exists
      await this.findById(id);
      
      // Check if name is unique (excluding current record)
      if (updateData.name) {
        const isUnique = await this.checkNameUnique(updateData.name, id);
        if (!isUnique) {
          throw new AppError('Consumable type name already exists', 409, 'DUPLICATE_NAME');
        }
      }
      
      const supabase = dbConnection.getClient();
      
      const allowedFields = ['name', 'description'];
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
        .from('_consumable_type')
        .update(updateObject)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Consumable type updated successfully', { id, fields: Object.keys(updateObject) });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to update consumable type', error, { id, updateData });
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Check if consumable type exists
      await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      // Check for dependencies
      const { count: taskCount } = await supabase
        .from('task')
        .select('*', { count: 'exact', head: true })
        .eq('_consumable_type', id);
      
      if ((taskCount || 0) > 0) {
        throw new AppError(
          'Cannot delete consumable type with associated tasks',
          409,
          'CONSUMABLE_TYPE_HAS_DEPENDENCIES',
          {
            task_count: taskCount || 0
          }
        );
      }
      
      const { data, error } = await supabase
        .from('_consumable_type')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Consumable type deleted successfully', { id });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to delete consumable type', error, { id });
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null) {
    try {
      console.log('DEBUG: checkNameUnique called with:', { name, excludeId });
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('_consumable_type')
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
      console.error('Error checking consumable type name uniqueness:', error);
      return false;
    }
  }
}

module.exports = ConsumableTypeClient;