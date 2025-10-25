const dbConnection = require('../database/connection');

class QRSupplierClient {
  static async create(data) {
    try {
      const { name, metadata } = data;
      
      const supabase = dbConnection.getClient();
      
      const insertData = {
        name,
        metadata: metadata || null
      };
      
      const { data: supplier, error } = await supabase
        .from('qr_supplier')
        .insert(insertData)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to create QR supplier:', error);
        throw error;
      }
      
      return supplier;
    } catch (error) {
      console.error('Failed to create QR supplier', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const supabase = dbConnection.getClient();
      
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;
      
      const { data: supplier, error } = await supabase
        .from('qr_supplier')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to update QR supplier:', error);
        throw error;
      }
      
      return supplier;
    } catch (error) {
      console.error('Failed to update QR supplier', error);
      throw error;
    }
  }

  static async get(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data: supplier, error } = await supabase
        .from('qr_supplier')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Failed to get QR supplier:', error);
        throw error;
      }
      
      return supplier;
    } catch (error) {
      console.error('Failed to get QR supplier', error);
      throw error;
    }
  }

  static async getAll(options = {}) {
    try {
      const supabase = dbConnection.getClient();
      
      const {
        page = 1,
        limit = 10,
        search = '',
        sort = 'name',
        order = 'asc'
      } = options;
      
      let query = supabase
        .from('qr_supplier')
        .select('*', { count: 'exact' });
      
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      
      // Validate sort column exists in qr_supplier table
      const validSortColumns = ['id', 'name'];
      const sortColumn = validSortColumns.includes(sort) ? sort : 'name';
      
      const ascending = order.toLowerCase() === 'asc';
      query = query.order(sortColumn, { ascending });
      
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Failed to get QR suppliers:', error);
        throw error;
      }
      
      const totalPages = Math.ceil((count || 0) / limit);
      
      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Failed to get QR suppliers', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { error } = await supabase
        .from('qr_supplier')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Failed to delete QR supplier:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete QR supplier', error);
      throw error;
    }
  }
}

module.exports = QRSupplierClient;