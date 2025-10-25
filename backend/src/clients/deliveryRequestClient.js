const dbConnection = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class DeliveryRequestClient {
  static async create(requestData) {
    try {
      const { 
        farm_id,
        qr_count,
        notes = '',
        requested_by,
        metadata = {},
        status = 'pending'
      } = requestData;
      
      const supabase = dbConnection.getClient();
      
      // Generate request ID
      const request_id = this.generateRequestId();
      
      const { data, error } = await supabase
        .from('delivery_requests')
        .insert({
          request_id,
          farm_id,
          qr_count,
          notes,
          requested_by,
          status,
          metadata,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Delivery request created successfully', { 
        id: data.id, 
        request_id: data.request_id,
        farm_id: data.farm_id,
        qr_count: data.qr_count 
      });
      
      return data;
    } catch (error) {
      console.error('Failed to create delivery request', error, { requestData });
      throw error;
    }
  }

  static async findById(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('delivery_requests')
        .select(`
          *,
          farm:farm_id(id, name),
          requested_by_user:requested_by(id, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Delivery request not found', 404, 'REQUEST_NOT_FOUND');
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find delivery request by ID', error, { id });
      throw error;
    }
  }

  static async findByRequestId(requestId) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('delivery_requests')
        .select(`
          *,
          farm:farm_id(id, name),
          requested_by_user:requested_by(id, email)
        `)
        .eq('request_id', requestId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Delivery request not found', 404, 'REQUEST_NOT_FOUND');
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find delivery request by request ID', error, { requestId });
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
        status = null,
        farm_id = null,
        requested_by = null,
        date_from = null,
        date_to = null
      } = options;
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('delivery_requests')
        .select(`
          *,
          farm:farm_id(id, name),
          requested_by_user:requested_by(id, email)
        `, { count: 'exact' });
      
      // Apply filters
      if (search) {
        query = query.or(`request_id.ilike.%${search}%,notes.ilike.%${search}%`);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (farm_id) {
        query = query.eq('farm_id', farm_id);
      }
      
      if (requested_by) {
        query = query.eq('requested_by', requested_by);
      }
      
      if (date_from) {
        query = query.gte('created_at', date_from);
      }
      
      if (date_to) {
        query = query.lte('created_at', date_to);
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
      console.error('Failed to find all delivery requests', error, { options });
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const request = await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      const allowedFields = ['qr_count', 'notes', 'status', 'metadata', 'delivered_at', 'shipped_at'];
      const updateObject = {};
      
      for (const [field, value] of Object.entries(updateData)) {
        if (allowedFields.includes(field) && value !== undefined) {
          updateObject[field] = value;
        }
      }
      
      if (Object.keys(updateObject).length === 0) {
        return request;
      }
      
      updateObject.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('delivery_requests')
        .update(updateObject)
        .eq('id', id)
        .select(`
          *,
          farm:farm_id(id, name),
          requested_by_user:requested_by(id, email)
        `)
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Delivery request updated successfully', { 
        id, 
        fields: Object.keys(updateObject) 
      });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to update delivery request', error, { id, updateData });
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Check if request exists
      await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('delivery_requests')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Delivery request deleted successfully', { id });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to delete delivery request', error, { id });
      throw error;
    }
  }

  static async updateStatus(id, newStatus, additionalData = {}) {
    try {
      const validStatuses = ['pending', 'approved', 'in_transit', 'delivered', 'cancelled'];
      
      if (!validStatuses.includes(newStatus)) {
        throw new AppError(
          'Invalid status value',
          400,
          'INVALID_STATUS',
          { validStatuses }
        );
      }
      
      const updateData = { status: newStatus, ...additionalData };
      
      // Add timestamps for status changes
      if (newStatus === 'in_transit' && !additionalData.shipped_at) {
        updateData.shipped_at = new Date().toISOString();
      }
      
      if (newStatus === 'delivered' && !additionalData.delivered_at) {
        updateData.delivered_at = new Date().toISOString();
      }
      
      return await this.update(id, updateData);
    } catch (error) {
      console.error('Failed to update delivery request status', error, { id, newStatus });
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const supabase = dbConnection.getClient();
      
      // Get request counts by status
      const { count: totalRequests } = await supabase
        .from('delivery_requests')
        .select('*', { count: 'exact', head: true });
      
      const { count: pendingRequests } = await supabase
        .from('delivery_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: approvedRequests } = await supabase
        .from('delivery_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      
      const { count: inTransitRequests } = await supabase
        .from('delivery_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_transit');
      
      const { count: deliveredRequests } = await supabase
        .from('delivery_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered');
      
      const { count: cancelledRequests } = await supabase
        .from('delivery_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled');
      
      // Get total QR codes requested
      const { data: requestData } = await supabase
        .from('delivery_requests')
        .select('qr_count, status');
      
      const totalQRsRequested = requestData?.reduce((sum, req) => sum + (req.qr_count || 0), 0) || 0;
      const deliveredQRs = requestData?.filter(req => req.status === 'delivered')
        .reduce((sum, req) => sum + (req.qr_count || 0), 0) || 0;
      
      // Get requests created today
      const today = new Date().toISOString().split('T')[0];
      const { count: todayRequests } = await supabase
        .from('delivery_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);
      
      return {
        total_requests: totalRequests || 0,
        pending_requests: pendingRequests || 0,
        approved_requests: approvedRequests || 0,
        in_transit_requests: inTransitRequests || 0,
        delivered_requests: deliveredRequests || 0,
        cancelled_requests: cancelledRequests || 0,
        total_qrs_requested: totalQRsRequested,
        delivered_qrs: deliveredQRs,
        today_requests: todayRequests || 0
      };
    } catch (error) {
      console.error('Failed to get delivery request statistics', error);
      throw error;
    }
  }

  static async getFarmRequests(farmId, options = {}) {
    try {
      const farmOptions = { ...options, farm_id: farmId };
      return await this.findAll(farmOptions);
    } catch (error) {
      console.error('Failed to get farm delivery requests', error, { farmId, options });
      throw error;
    }
  }

  static async getUserRequests(userId, options = {}) {
    try {
      const userOptions = { ...options, requested_by: userId };
      return await this.findAll(userOptions);
    } catch (error) {
      console.error('Failed to get user delivery requests', error, { userId, options });
      throw error;
    }
  }

  static generateRequestId() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 3).toUpperCase();
    return `DEL-${year}-${timestamp}${random}`;
  }

  static async checkRequestIdUnique(requestId) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('delivery_requests')
        .select('id')
        .eq('request_id', requestId);
      
      if (error) {
        throw error;
      }
      
      return data.length === 0;
    } catch (error) {
      console.error('Failed to check request ID uniqueness', error, { requestId });
      throw error;
    }
  }

  static async approve(id, approvedBy) {
    try {
      return await this.updateStatus(id, 'approved', {
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to approve delivery request', error, { id, approvedBy });
      throw error;
    }
  }

  static async cancel(id, cancelledBy, reason = '') {
    try {
      return await this.updateStatus(id, 'cancelled', {
        cancelled_by: cancelledBy,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      });
    } catch (error) {
      console.error('Failed to cancel delivery request', error, { id, cancelledBy, reason });
      throw error;
    }
  }

  static async markDelivered(id, deliveredBy, trackingNumber = '') {
    try {
      return await this.updateStatus(id, 'delivered', {
        delivered_by: deliveredBy,
        delivered_at: new Date().toISOString(),
        tracking_number: trackingNumber
      });
    } catch (error) {
      console.error('Failed to mark delivery request as delivered', error, { id, deliveredBy });
      throw error;
    }
  }
}

module.exports = DeliveryRequestClient;