const dbConnection = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class EquipmentTypeClient {
  static async create(typeData) {
    try {
      const { name, description = null, created_by = null, created_in = null } = typeData;
      
      console.log('DEBUG: create called with name:', name);
      
      // Check if name already exists
      const isUnique = await this.checkNameUnique(name);
      console.log('DEBUG: create - isUnique result:', isUnique);
      
      if (!isUnique) {
        console.log('DEBUG: create - throwing duplicate name error');
        throw new AppError('Equipment type name already exists', 409, 'DUPLICATE_NAME');
      }
      
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_type')
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
      
      console.log('Equipment type created successfully', { id: data.id, name: data.name });
      
      return data;
    } catch (error) {
      console.error('Failed to create equipment type', error, { typeData });
      throw error;
    }
  }

  static async findById(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_type')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Equipment type not found', 404, 'EQUIPMENT_TYPE_NOT_FOUND');
        }
        throw error;
      }
      
      // Get counts separately
      const { count: equipmentCount } = await supabase
        .from('_equipment')
        .select('*', { count: 'exact', head: true })
        .eq('type', id);
      
      const { count: templateCount } = await supabase
        .from('_task_series')
        .select('*', { count: 'exact', head: true })
        .eq('_equipment_type', id);
      
      // Add computed counts
      data.equipment_count = equipmentCount || 0;
      data.template_count = templateCount || 0;
      
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
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find equipment type by ID', error, { id });
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
        .from('_equipment_type')
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
      
      // For each equipment type, get user and farm names
      const dataWithRelations = await Promise.all(data.map(async (item) => {
        let created_by_name = null;
        let created_in_name = null;
        
        // Get user email if created_by exists
        if (item.created_by) {
          try {
            const { data: userData, error: userError } = await supabase
              .from('user_profiles')
              .select('email')
              .eq('id', item.created_by)
              .single();
            created_by_name = userData?.email || item.created_by; // Fallback to UUID if no email
          } catch (err) {
            console.warn('Failed to fetch user email for id:', item.created_by, err);
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
          equipment_count: 0, // Will be updated with actual counts later if needed
          template_count: 0,
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
      console.error('Failed to find all equipment types', error, { options });
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Check if equipment type exists
      await this.findById(id);
      
      // Check if name is unique (excluding current record)
      if (updateData.name) {
        const isUnique = await this.checkNameUnique(updateData.name, id);
        if (!isUnique) {
          throw new AppError('Equipment type name already exists', 409, 'DUPLICATE_NAME');
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
        .from('_equipment_type')
        .update(updateObject)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment type updated successfully', { id, fields: Object.keys(updateObject) });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to update equipment type', error, { id, updateData });
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Check if equipment type exists
      await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      // Check for dependencies (simplified for now)
      const { count: equipmentCount } = await supabase
        .from('_equipment')
        .select('*', { count: 'exact', head: true })
        .eq('type', id);
      
      const { count: templateCount } = await supabase
        .from('_task_series')
        .select('*', { count: 'exact', head: true })
        .eq('_equipment_type', id);
      
      if ((equipmentCount || 0) > 0 || (templateCount || 0) > 0) {
        throw new AppError(
          'Cannot delete equipment type with associated equipment or maintenance templates',
          409,
          'EQUIPMENT_TYPE_HAS_DEPENDENCIES',
          {
            equipment_count: equipmentCount || 0,
            template_count: templateCount || 0
          }
        );
      }
      
      const { data, error } = await supabase
        .from('_equipment_type')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment type deleted successfully', { id });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to delete equipment type', error, { id });
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null) {
    try {
      console.log('DEBUG: checkNameUnique called with:', { name, excludeId });
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('_equipment_type')
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
      console.error('Failed to check equipment type name uniqueness', error, { name, excludeId });
      throw error;
    }
  }

  static async findForDropdown() {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_type')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to find equipment types for dropdown', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const supabase = dbConnection.getClient();
      
      // Get basic count
      const { count: totalTypes } = await supabase
        .from('_equipment_type')
        .select('*', { count: 'exact', head: true });
      
      // For now, return simplified statistics
      return {
        total_types: totalTypes || 0,
        total_equipment: 0,
        total_templates: 0,
        avg_equipment_per_type: 0
      };
    } catch (error) {
      console.error('Failed to get equipment type statistics', error);
      throw error;
    }
  }
}

module.exports = EquipmentTypeClient;