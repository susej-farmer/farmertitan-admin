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
        limit = 20,
        search = null,
        is_active = null,
        user_id = null
      } = options;

      const supabase = dbConnection.getClient();

      // Call the PostgreSQL function get_farms_with_context
      const { data, error } = await supabase.rpc('get_farms_with_context', {
        p_page: page,
        p_limit: limit,
        p_search: search || null,
        p_is_active: is_active,
        p_user_id: user_id
      });

      if (error) {
        console.error('Failed to get farms:', error);
        throw error;
      }

      // The function returns a JSONB object with success, data, pagination, metadata
      if (!data || !data.success) {
        const errorMsg = data?.error_message || 'Unknown error from get_farms_with_context';
        const errorCode = data?.error_code || 'UNKNOWN_ERROR';
        console.error('get_farms_with_context returned error:', errorCode, errorMsg);

        const { AppError } = require('../middleware/errorHandler');
        throw new AppError(errorMsg, 400, errorCode);
      }

      return {
        data: data.data || [],
        pagination: data.pagination || {
          page,
          limit,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        },
        metadata: data.metadata
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