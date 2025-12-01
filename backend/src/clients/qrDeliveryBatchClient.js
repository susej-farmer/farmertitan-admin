const dbConnection = require('../database/connection');

class QRDeliveryBatchClient {
  static async create(data) {
    try {
      const { farm_id, requested_quantity, created_by, metadata } = data;
      
      const supabase = dbConnection.getClient();
      
      // Call the stored procedure
      const { data: result, error } = await supabase.rpc('create_delivery_request', {
        p_farm_id: farm_id,
        p_quantity: requested_quantity,
        p_requested_by: created_by,
        p_notes: metadata?.notes || null
      });
        
      if (error) {
        console.error('Failed to create delivery request via stored procedure:', error);
        throw error;
      }
      
      // Handle stored procedure response
      if (!result.success) {
        const appError = new Error(result.error_message);
        appError.code = result.error_code;
        appError.statusCode = this.getHttpStatusFromErrorCode(result.error_code);
        appError.metadata = result.metadata;
        throw appError;
      }
      
      return result.data;
    } catch (error) {
      console.error('Failed to create delivery request', error);
      throw error;
    }
  }

  // Helper method to map stored procedure error codes to HTTP status codes
  static getHttpStatusFromErrorCode(errorCode) {
    const statusMap = {
      'FARM_NOT_FOUND': 404,
      'USER_NOT_FOUND': 404,
      'VALIDATION_ERROR': 400,
      'DUPLICATE_ERROR': 409,
      'FOREIGN_KEY_ERROR': 400,
      'UNEXPECTED_ERROR': 500
    };
    return statusMap[errorCode] || 400;
  }

  static async update(id, data) {
    try {
      const supabase = dbConnection.getClient();
      
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      if (data.delivery_code !== undefined) updateData.delivery_code = data.delivery_code;
      if (data.farm_id !== undefined) updateData.farm_id = data.farm_id;
      if (data.requested_quantity !== undefined) updateData.requested_quantity = data.requested_quantity;
      if (data.current_status !== undefined) updateData.current_status = data.current_status;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;
      
      const { data: deliveryBatch, error } = await supabase
        .from('qr_delivery_batch')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to update QR delivery batch:', error);
        throw error;
      }
      
      return deliveryBatch;
    } catch (error) {
      console.error('Failed to update QR delivery batch', error);
      throw error;
    }
  }

  static async get(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data: deliveryBatch, error } = await supabase
        .from('qr_delivery_batch')
        .select(`
          *,
          farm:farm_id(id, name)
        `)
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Failed to get QR delivery batch:', error);
        throw error;
      }
      
      return deliveryBatch;
    } catch (error) {
      console.error('Failed to get QR delivery batch', error);
      throw error;
    }
  }

  static async getByDeliveryCode(deliveryCode) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data: deliveryBatch, error } = await supabase
        .from('qr_delivery_batch')
        .select(`
          *,
          farm:farm_id(id, name)
        `)
        .eq('delivery_code', deliveryCode)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Failed to get QR delivery batch by delivery code:', error);
        throw error;
      }
      
      return deliveryBatch;
    } catch (error) {
      console.error('Failed to get QR delivery batch by delivery code', error);
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
        status = '',
        farm_id = '',
        sort = 'created_at',
        order = 'desc'
      } = options;
      
      // Map sort types to database fields
      const sortMapping = {
        'farm': { field: 'name', foreignTable: 'farm' },
        'created': { field: 'created_at' },
        'status': { field: 'current_status' },
        'quantity': { field: 'requested_quantity' },
        'delivery_code': { field: 'delivery_code' }
      };
      
      // Get sort configuration
      const sortConfig = sortMapping[sort] || { field: 'created_at' };
      
      let query = supabase
        .from('qr_delivery_batch')
        .select(`
          *,
          farm:farm_id(id, name)
        `, { count: 'exact' });
      
      if (search) {
        query = query.or(`delivery_code.ilike.%${search}%,metadata->>notes.ilike.%${search}%`);
      }
      
      if (status) {
        query = query.eq('current_status', status);
      }
      
      if (farm_id) {
        query = query.eq('farm_id', farm_id);
      }
      
      // For farm sorting, we'll do it manually after getting the data
      // due to Supabase limitations with foreign table ordering
      const needsManualSort = sort === 'farm';
      
      if (!needsManualSort) {
        // Apply normal sorting for non-foreign fields
        const ascending = order.toLowerCase() === 'asc';
        console.log(`Using local table sorting: ${sortConfig.field}, ascending: ${ascending}`);
        query = query.order(sortConfig.field, { ascending });
      } else {
        // For farm sorting, just get all data first, then sort manually
        console.log('Using manual sorting for farm field');
      }
      
      const { data: allData, error, count } = await query;
      
      if (error) {
        console.error('Failed to get QR delivery batches:', error);
        throw error;
      }
      
      let sortedData = allData || [];
      
      // Manual sorting for farm field
      if (needsManualSort && sortedData.length > 0) {
        const ascending = order.toLowerCase() === 'asc';
        console.log(`Manual sorting by farm name, ascending: ${ascending}`);
        
        sortedData.sort((a, b) => {
          const nameA = a.farm?.name || '';
          const nameB = b.farm?.name || '';
          const comparison = nameA.localeCompare(nameB);
          return ascending ? comparison : -comparison;
        });
      }
      
      // Apply pagination after sorting
      const from = (page - 1) * limit;
      const paginatedData = sortedData.slice(from, from + limit);
      
      const totalPages = Math.ceil((count || 0) / limit);
      
      return {
        data: paginatedData || [],
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
      console.error('Failed to get QR delivery batches', error);
      throw error;
    }
  }

  static async updateStatus(id, status, userId = null, notes = '') {
    try {
      const supabase = dbConnection.getClient();
      
      const updateData = {
        current_status: status,
        updated_at: new Date().toISOString(),
        last_transition_at: new Date().toISOString()
      };
      
      // Add notes to metadata if provided
      if (notes) {
        // Get current metadata first
        const { data: currentBatch } = await supabase
          .from('qr_delivery_batch')
          .select('metadata')
          .eq('id', id)
          .single();
          
        const currentMetadata = currentBatch?.metadata || {};
        updateData.metadata = {
          ...currentMetadata,
          notes,
          last_updated_by: userId
        };
      }

      const { data, error } = await supabase
        .from('qr_delivery_batch')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to update QR delivery batch status:', error);
        throw error;
      }
      
      console.log('QR delivery batch status updated successfully', {
        id,
        status,
        updated_by: userId
      });
      
      return data;
    } catch (error) {
      console.error('Failed to update QR delivery batch status', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { error } = await supabase
        .from('qr_delivery_batch')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Failed to delete QR delivery batch:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete QR delivery batch', error);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const supabase = dbConnection.getClient();
      
      // Get total counts by status
      const { data: statusCounts, error: statusError } = await supabase
        .from('qr_delivery_batch')
        .select('current_status');
        
      if (statusError) {
        console.error('Failed to get delivery batch statistics:', statusError);
        throw statusError;
      }
      
      const stats = {
        total: statusCounts.length,
        requested: 0,
        in_progress: 0,
        delivered: 0,
        cancelled: 0
      };
      
      statusCounts.forEach(batch => {
        if (batch.current_status in stats) {
          stats[batch.current_status]++;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Failed to get QR delivery batch statistics', error);
      throw error;
    }
  }
}

module.exports = QRDeliveryBatchClient;