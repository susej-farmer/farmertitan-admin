const dbConnection = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class FarmClient {
  static async create(farmData) {
    try {
      const { name, acres, metadata = {}, active = true } = farmData;
      
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('farm')
        .insert({
          name,
          acres,
          metadata,
          active,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Farm created successfully', { id: data.id, name: data.name });
      
      return data;
    } catch (error) {
      console.error('Failed to create farm', error, { farmData });
      throw error;
    }
  }

  static async findById(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('farm')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Farm not found', 404, 'FARM_NOT_FOUND');
        }
        throw error;
      }
      
      // Add computed counts (simplified for now)
      data.equipment_count = 0;
      data.user_count = 0;
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find farm by ID', error, { id });
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
        active = null
      } = options;
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('farm')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      
      if (active !== null) {
        query = query.eq('active', active);
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
      
      // Add computed counts (simplified for now)
      const dataWithCounts = data.map(item => ({
        ...item,
        equipment_count: 0,
        user_count: 0
      }));
      
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: dataWithCounts,
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
      console.error('Failed to find all farms', error, { options });
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const farm = await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      const allowedFields = ['name', 'acres', 'metadata', 'active'];
      const updateObject = {};
      
      for (const [field, value] of Object.entries(updateData)) {
        if (allowedFields.includes(field) && value !== undefined) {
          updateObject[field] = value;
        }
      }
      
      if (Object.keys(updateObject).length === 0) {
        return farm;
      }
      
      updateObject.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('farm')
        .update(updateObject)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Farm updated successfully', { id, fields: Object.keys(updateObject) });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to update farm', error, { id, updateData });
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Check if farm exists
      await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      // Check for dependencies
      const { count: equipmentCount } = await supabase
        .from('_equipment')
        .select('*', { count: 'exact', head: true })
        .eq('farm', id);
      
      const { count: userCount } = await supabase
        .from('_farm_user')
        .select('*', { count: 'exact', head: true })
        .eq('farm', id);
      
      if ((equipmentCount || 0) > 0 || (userCount || 0) > 0) {
        throw new AppError(
          'Cannot delete farm with associated equipment or users',
          409,
          'FARM_HAS_DEPENDENCIES',
          {
            equipment_count: equipmentCount || 0,
            user_count: userCount || 0
          }
        );
      }
      
      const { data, error } = await supabase
        .from('farm')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Farm deleted successfully', { id });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to delete farm', error, { id });
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null) {
    try {
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('farm')
        .select('id')
        .ilike('name', name);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data.length === 0;
    } catch (error) {
      console.error('Failed to check farm name uniqueness', error, { name, excludeId });
      throw error;
    }
  }

  static async activate(id) {
    return await this.update(id, { active: true });
  }

  static async deactivate(id) {
    return await this.update(id, { active: false });
  }

  static async getStatistics() {
    try {
      const supabase = dbConnection.getClient();
      
      // Get basic farm counts and totals
      const { count: totalFarms } = await supabase
        .from('farm')
        .select('*', { count: 'exact', head: true });
      
      const { count: activeFarms } = await supabase
        .from('farm')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);
      
      const { data: farmData } = await supabase
        .from('farm')
        .select('acres');
      
      const totalAcres = farmData?.reduce((sum, farm) => sum + (farm.acres || 0), 0) || 0;
      const averageAcres = totalFarms > 0 ? totalAcres / totalFarms : 0;
      
      return {
        total_farms: totalFarms || 0,
        active_farms: activeFarms || 0,
        inactive_farms: (totalFarms || 0) - (activeFarms || 0),
        total_equipment: 0,
        total_users: 0,
        average_acres: averageAcres,
        total_acres: totalAcres
      };
    } catch (error) {
      console.error('Failed to get farm statistics', error);
      throw error;
    }
  }
}

module.exports = FarmClient;