const dbConnection = require('../database/connection');

class FarmClient {
  static async create(data) {
    try {
      const { name, acres, metadata } = data;
      
      const supabase = dbConnection.getClient();
      
      const insertData = {
        name,
        acres,
        metadata: metadata || null
      };
      
      const { data: farm, error } = await supabase
        .from('farm')
        .insert(insertData)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to create farm:', error);
        throw error;
      }
      
      return farm;
    } catch (error) {
      console.error('Failed to create farm', error);
      throw error;
    }
  }

  static async get(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data: farm, error } = await supabase
        .from('farm')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Failed to get farm:', error);
        throw error;
      }
      
      return farm;
    } catch (error) {
      console.error('Failed to get farm', error);
      throw error;
    }
  }

  static async getAll(options = {}) {
    try {
      const {
        page = 1,
        limit = null,
        search = '',
        sort = 'name',
        order = 'asc'
      } = options;
      
      const supabase = dbConnection.getClient();
      
      // Validate sort column exists in farm table
      const validSortColumns = ['id', 'name', 'acres', 'created_at'];
      const sortColumn = validSortColumns.includes(sort) ? sort : 'name';
      
      let query = supabase
        .from('farm')
        .select('*', { count: 'exact' });
      
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      
      const ascending = order.toLowerCase() === 'asc';
      query = query.order(sortColumn, { ascending });
      
      // Only apply pagination if limit is provided
      if (limit) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
      }
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Failed to get farms:', error);
        throw error;
      }
      
      const totalPages = limit ? Math.ceil((count || 0) / limit) : 1;
      
      return {
        data: data || [],
        pagination: {
          page: limit ? page : 1,
          limit: limit,
          total: count || 0,
          totalPages,
          hasNext: limit ? page < totalPages : false,
          hasPrev: limit ? page > 1 : false
        }
      };
    } catch (error) {
      console.error('Failed to get farms', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const supabase = dbConnection.getClient();
      
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.acres !== undefined) updateData.acres = data.acres;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;
      
      const { data: farm, error } = await supabase
        .from('farm')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to update farm:', error);
        throw error;
      }
      
      return farm;
    } catch (error) {
      console.error('Failed to update farm', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { error } = await supabase
        .from('farm')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Failed to delete farm:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete farm', error);
      throw error;
    }
  }

  // Alias methods to match route expectations
  static async findAll(options = {}) {
    return this.getAll(options);
  }

  static async findById(id) {
    const farm = await this.get(id);
    if (!farm) {
      const { AppError } = require('../middleware/errorHandler');
      throw new AppError('Farm not found', 404, 'FARM_NOT_FOUND');
    }
    return farm;
  }

  static async checkNameUnique(name, excludeId = null) {
    try {
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('farm')
        .select('id')
        .eq('name', name);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data.length === 0;
    } catch (error) {
      console.error('Failed to check farm name uniqueness', error);
      throw error;
    }
  }

  static async activate(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data: farm, error } = await supabase
        .from('farm')
        .update({ status: 'active' })
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to activate farm:', error);
        throw error;
      }
      
      return farm;
    } catch (error) {
      console.error('Failed to activate farm', error);
      throw error;
    }
  }

  static async deactivate(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data: farm, error } = await supabase
        .from('farm')
        .update({ status: 'inactive' })
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to deactivate farm:', error);
        throw error;
      }
      
      return farm;
    } catch (error) {
      console.error('Failed to deactivate farm', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const supabase = dbConnection.getClient();

      const { count: totalFarms } = await supabase
        .from('farm')
        .select('*', { count: 'exact', head: true });

      const { count: activeFarms } = await supabase
        .from('farm')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { data: totalAcres } = await supabase
        .from('farm')
        .select('acres');

      const totalAcresSum = totalAcres?.reduce((sum, farm) => sum + (farm.acres || 0), 0) || 0;

      return {
        total_farms: totalFarms || 0,
        active_farms: activeFarms || 0,
        inactive_farms: (totalFarms || 0) - (activeFarms || 0),
        total_acres: totalAcresSum,
        avg_acres_per_farm: totalFarms > 0 ? totalAcresSum / totalFarms : 0
      };
    } catch (error) {
      console.error('Failed to get farm statistics', error);
      throw error;
    }
  }

  /**
   * Obtener usuarios de una granja usando la función SQL get_farm_users
   * @param {string} farmId - UUID de la granja
   * @returns {Promise<Array>} Array de usuarios de la granja
   */
  static async getFarmUsers(farmId) {
    try {
      const supabase = dbConnection.getClient();

      const { data, error } = await supabase.rpc('get_farm_users', {
        p_farm_id: farmId
      });

      if (error) {
        console.error('Failed to get farm users:', error);
        throw error;
      }

      // La función retorna { data: [...], success: true }
      if (data && data.success === true && Array.isArray(data.data)) {
        return data.data;
      }

      // Fallback si la estructura es diferente
      return data || [];
    } catch (error) {
      console.error('Failed to get farm users', error, { farmId });
      throw error;
    }
  }

  /**
   * Obtener cantidad de equipos de una granja
   * @param {string} farmId - UUID de la granja
   * @returns {Promise<number>} Cantidad de equipos
   */
  static async getEquipmentCount(farmId) {
    try {
      const supabase = dbConnection.getClient();

      const { count, error } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('farm', farmId);

      if (error) {
        console.error('Failed to get equipment count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get equipment count', error, { farmId });
      throw error;
    }
  }

}

module.exports = FarmClient;