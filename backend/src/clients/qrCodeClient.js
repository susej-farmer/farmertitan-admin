const dbConnection = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

class QRCodeClient {
  static async create(qrData) {
    try {
      const { 
        farm_id = null, 
        asset_type = null, 
        asset_id = null, 
        batch_id = null,
        metadata = {},
        status = 'available'
      } = qrData;
      
      const supabase = dbConnection.getClient();
      
      // Generate QR code UUID and short code
      const qr_uuid = uuidv4();
      const short_code = this.generateShortCode();
      
      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          uuid: qr_uuid,
          short_code,
          farm_id,
          asset_type,
          asset_id,
          batch_id,
          status,
          metadata,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('QR code created successfully', { id: data.id, short_code: data.short_code });
      
      return data;
    } catch (error) {
      console.error('Failed to create QR code', error, { qrData });
      throw error;
    }
  }

  static async findById(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('qr_codes')
        .select(`
          *,
          farm:farm_id(id, name),
          production_batch:batch_id(id, batch_code, supplier_name, status)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('QR code not found', 404, 'QR_NOT_FOUND');
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find QR code by ID', error, { id });
      throw error;
    }
  }

  static async findByShortCode(shortCode) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('qr_codes')
        .select(`
          *,
          farm:farm_id(id, name),
          production_batch:batch_id(id, batch_code, supplier_name, status)
        `)
        .eq('short_code', shortCode)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('QR code not found', 404, 'QR_NOT_FOUND');
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find QR code by short code', error, { shortCode });
      throw error;
    }
  }

  static async findByUUID(uuid) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('qr_codes')
        .select(`
          *,
          farm:farm_id(id, name),
          production_batch:batch_id(id, batch_code, supplier_name, status)
        `)
        .eq('uuid', uuid)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('QR code not found', 404, 'QR_NOT_FOUND');
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find QR code by UUID', error, { uuid });
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
        asset_type = null,
        batch_id = null,
        date_from = null,
        date_to = null
      } = options;
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('qr_codes')
        .select(`
          *,
          farm:farm_id(id, name),
          production_batch:batch_id(id, batch_code, supplier_name, status)
        `, { count: 'exact' });
      
      // Apply filters
      if (search) {
        query = query.or(`short_code.ilike.%${search}%,uuid.ilike.%${search}%`);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (farm_id) {
        query = query.eq('farm_id', farm_id);
      }
      
      if (asset_type) {
        query = query.eq('asset_type', asset_type);
      }
      
      if (batch_id) {
        query = query.eq('batch_id', batch_id);
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
      console.error('Failed to find all QR codes', error, { options });
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const qrCode = await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      const allowedFields = ['farm_id', 'asset_type', 'asset_id', 'status', 'metadata'];
      const updateObject = {};
      
      for (const [field, value] of Object.entries(updateData)) {
        if (allowedFields.includes(field) && value !== undefined) {
          updateObject[field] = value;
        }
      }
      
      if (Object.keys(updateObject).length === 0) {
        return qrCode;
      }
      
      updateObject.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('qr_codes')
        .update(updateObject)
        .eq('id', id)
        .select(`
          *,
          farm:farm_id(id, name),
          production_batch:batch_id(id, batch_code, supplier_name, status)
        `)
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('QR code updated successfully', { id, fields: Object.keys(updateObject) });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to update QR code', error, { id, updateData });
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Check if QR code exists
      await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('qr_codes')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('QR code deleted successfully', { id });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to delete QR code', error, { id });
      throw error;
    }
  }

  static async bindToAsset(qrId, assetType, assetId) {
    try {
      const updateData = {
        asset_type: assetType,
        asset_id: assetId,
        status: 'bound'
      };
      
      return await this.update(qrId, updateData);
    } catch (error) {
      console.error('Failed to bind QR code to asset', error, { qrId, assetType, assetId });
      throw error;
    }
  }

  static async unbindFromAsset(qrId) {
    try {
      const updateData = {
        asset_type: null,
        asset_id: null,
        status: 'available'
      };
      
      return await this.update(qrId, updateData);
    } catch (error) {
      console.error('Failed to unbind QR code from asset', error, { qrId });
      throw error;
    }
  }

  static async allocateToFarm(qrId, farmId) {
    try {
      const updateData = {
        farm_id: farmId,
        status: 'allocated'
      };
      
      return await this.update(qrId, updateData);
    } catch (error) {
      console.error('Failed to allocate QR code to farm', error, { qrId, farmId });
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const supabase = dbConnection.getClient();
      
      // Get basic QR code counts by status
      const { count: totalQRs } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true });
      
      const { count: availableQRs } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');
      
      const { count: boundQRs } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'bound');
      
      const { count: allocatedQRs } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'allocated');
      
      const { count: deliveredQRs } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered');
      
      // Get QR codes created today
      const today = new Date().toISOString().split('T')[0];
      const { count: todayQRs } = await supabase
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);
      
      return {
        total_qrs: totalQRs || 0,
        available_qrs: availableQRs || 0,
        bound_qrs: boundQRs || 0,
        allocated_qrs: allocatedQRs || 0,
        delivered_qrs: deliveredQRs || 0,
        today_generated: todayQRs || 0
      };
    } catch (error) {
      console.error('Failed to get QR code statistics', error);
      throw error;
    }
  }

  static async getAssetTypeDistribution() {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('qr_codes')
        .select('asset_type')
        .not('asset_type', 'is', null);
      
      if (error) {
        throw error;
      }
      
      const distribution = {};
      data.forEach(item => {
        distribution[item.asset_type] = (distribution[item.asset_type] || 0) + 1;
      });
      
      return distribution;
    } catch (error) {
      console.error('Failed to get asset type distribution', error);
      throw error;
    }
  }

  static generateShortCode() {
    const prefix = 'FT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
  }

  static async checkShortCodeUnique(shortCode) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('qr_codes')
        .select('id')
        .eq('short_code', shortCode);
      
      if (error) {
        throw error;
      }
      
      return data.length === 0;
    } catch (error) {
      console.error('Failed to check short code uniqueness', error, { shortCode });
      throw error;
    }
  }

  static async createBatch(qrCodes) {
    const supabase = dbConnection.getClient();
    
    try {
      // Start transaction
      const { data, error } = await supabase
        .from('qr_codes')
        .insert(qrCodes)
        .select();
      
      if (error) {
        throw error;
      }
      
      console.log('QR code batch created successfully', { count: data.length });
      
      return data;
    } catch (error) {
      console.error('Failed to create QR code batch', error, { count: qrCodes.length });
      throw error;
    }
  }

  static async getQrByProductionBatch(productionBatchId, options = {}) {
    try {
      const { 
        sort = 'status', 
        order = 'desc'
      } = options;
      
      const supabase = dbConnection.getClient();
      
      // Build the select query with joins using Supabase
      let query = supabase
        .from('qr_allocation')
        .select(`
          qr_id,
          allocated_at,
          notes,
          qr:qr_id (
            id,
            short_code,
            status,
            created_at,
            bound_at,
            print_position,
            metadata,
            farm:farm (
              id,
              name
            )
          )
        `)
        .eq('production_batch_id', productionBatchId);
      
      // Apply sorting based on the sort parameter
      const ascending = order.toLowerCase() === 'asc';
      
      switch (sort) {
        case 'status':
          query = query.order('status', { ascending, foreignTable: 'qr' });
          break;
        case 'farm':
          query = query.order('name', { ascending, foreignTable: 'qr.farm' });
          break;
        case 'bound':
          query = query.order('bound_at', { ascending, foreignTable: 'qr' });
          break;
        case 'position':
          query = query.order('print_position', { ascending, foreignTable: 'qr' });
          break;
        case 'short_code':
          query = query.order('short_code', { ascending, foreignTable: 'qr' });
          break;
        default:
          query = query.order('status', { ascending, foreignTable: 'qr' });
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Failed to get QR codes by production batch:', error);
        throw error;
      }
      
      // Transform the data to flatten the structure
      const transformedData = (data || []).map(allocation => ({
        ...allocation.qr,
        farm_name: allocation.qr?.farm?.name || null,
        allocated_at: allocation.allocated_at,
        allocation_notes: allocation.notes
      })).filter(qr => qr.id); // Filter out any null QR codes
      
      return transformedData;
    } catch (error) {
      console.error('Failed to get QR codes by production batch', error);
      throw error;
    }
  }
}

module.exports = QRCodeClient;