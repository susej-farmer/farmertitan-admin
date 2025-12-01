const dbConnection = require('../database/connection');

class ProductionBatchClient {
  static async create(data) {
    try {
      const { quantity, supplier_id, user_id, notes = '' } = data;
      
      const supabase = dbConnection.getClient();
      
      // Call the PostgreSQL function instead of direct insert
      const { data: result, error } = await supabase.rpc('create_production_batch', {
        p_quantity: quantity,
        p_supplier_id: supplier_id,
        p_user_id: user_id,
        p_notes: notes
      });
        
      if (error) {
        console.error('Failed to create production batch:', error);
        throw error;
      }
      
      return result;
    } catch (error) {
      console.error('Failed to create production batch', error);
      throw error;
    }
  }


  static async get(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data: batch, error } = await supabase
        .from('qr_production_batch')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Failed to get production batch:', error);
        throw error;
      }
      
      return batch;
    } catch (error) {
      console.error('Failed to get production batch', error);
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
        sort = 'created_at',
        order = 'desc'
      } = options;
      
      // Map sort types to database fields
      const sortMapping = {
        'supplier': { field: 'name', foreignTable: 'supplier' },
        'created': { field: 'created_at' },
        'status': { field: 'status' },
        'quantity': { field: 'quantity' },
        'defective': { field: 'defective_count' }
      };
      
      // Get sort configuration
      const sortConfig = sortMapping[sort] || { field: 'created_at' };
      
      let query = supabase
        .from('qr_production_batch')
        .select(`
          *,
          supplier:supplier_id(id, name)
        `, { count: 'exact' });
      
      if (search) {
        query = query.or(`batch_code.ilike.%${search}%,metadata->>notes.ilike.%${search}%`);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      // For supplier sorting, we'll do it manually after getting the data
      // due to Supabase limitations with foreign table ordering
      const needsManualSort = sort === 'supplier';
      
      if (!needsManualSort) {
        // Apply normal sorting for non-foreign fields
        const ascending = order.toLowerCase() === 'asc';
        console.log(`Using local table sorting: ${sortConfig.field}, ascending: ${ascending}`);
        query = query.order(sortConfig.field, { ascending });
      } else {
        // For supplier sorting, just get all data first, then sort manually
        console.log('Using manual sorting for supplier field');
      }
      
      const { data: allData, error, count } = await query;
      
      if (error) {
        console.error('Failed to get production batches:', error);
        throw error;
      }
      
      let sortedData = allData || [];
      
      // Manual sorting for supplier field
      if (needsManualSort && sortedData.length > 0) {
        const ascending = order.toLowerCase() === 'asc';
        console.log(`Manual sorting by supplier name, ascending: ${ascending}`);
        
        sortedData.sort((a, b) => {
          const nameA = a.supplier?.name || '';
          const nameB = b.supplier?.name || '';
          const comparison = nameA.localeCompare(nameB);
          return ascending ? comparison : -comparison;
        });
      }
      
      // Apply pagination after sorting
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const paginatedData = sortedData.slice(from, from + limit);
      
      const data = paginatedData;
      
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
      console.error('Failed to get production batches', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { error } = await supabase
        .from('qr_production_batch')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Failed to delete production batch:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete production batch', error);
      throw error;
    }
  }

  static async updateStatusWithFunction(id, status, userId = null, notes = '', defectiveInfo = {}) {
    try {
      const supabase = dbConnection.getClient();
      
      // Call the Supabase function
      const { data, error } = await supabase.rpc('update_batch_status', {
        p_batch_id: id,
        p_new_status: status,
        p_user_id: userId,
        p_notes: notes || '',
        p_defective_info: defectiveInfo
      });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Failed to update batch status: ${error.message}`);
      }
      
      return {
        success: true,
        message: data?.message || 'Batch status updated successfully',
        data: data
      };
    } catch (error) {
      console.error('Failed to update production batch status via function:', error);
      throw error;
    }
  }

  static async updateStatus(id, status, userId = null, notes = '', defectiveInfo = {}) {
    try {
      const supabase = dbConnection.getClient();
      
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };
      
      // Handle defective information for 'received' status
      if (status === 'received' && defectiveInfo.defectiveCount > 0) {
        updateData.defective_count = defectiveInfo.defectiveCount;
        if (defectiveInfo.defectiveItems) {
          updateData.defective_items = defectiveInfo.defectiveItems;
        }
      }
      
      // Add notes if provided
      if (notes) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('qr_production_batch')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Failed to update production batch status:', error);
        throw error;
      }
      
      console.log('Production batch status updated successfully', {
        id,
        status,
        defective_count: updateData.defective_count || 0,
        updated_by: userId
      });
      
      return data;
    } catch (error) {
      console.error('Failed to update production batch status', error);
      throw error;
    }
  }

  static async getQRCodes(batchId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10,
        sort = 'print_position',
        order = 'asc'
      } = options;
      
      const supabase = dbConnection.getClient();
      
      console.log(`SORTING: ${sort}, ORDER: ${order}`);
      
      // Get ALL QR codes for this batch directly from qr table
      const { data: allData, error, count } = await supabase
        .from('qr')
        .select(`
          id,
          short_code,
          status,
          created_at,
          bound_at,
          print_position,
          metadata,
          farm:farm(id, name)
        `, { count: 'exact' })
        .eq('metadata->>production_batch_id', batchId);
        
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log(`Got ${allData?.length || 0} total records from database`);
      
      if (allData && allData.length > 0) {
        console.log('Raw data sample:', JSON.stringify(allData[0], null, 2));
        console.log('First QR print_position:', allData[0]?.print_position);
        console.log('All QR print_positions:', allData.slice(0, 5).map(qr => qr?.print_position));
        console.log('Farm names:', allData.slice(0, 5).map(qr => qr?.farm?.name));
        console.log('QR statuses:', allData.slice(0, 5).map(qr => qr?.status));
      }
      
      // Transform data - no need to transform since we're querying qr table directly
      const qrData = (allData || []).map(qr => {
        if (!qr) {
          console.log('ERROR: qr is null!', qr);
          return null;
        }
        
        console.log(`QR ID ${qr.id}, print_position: ${qr.print_position}, status: ${qr.status}, farm: ${qr.farm?.name}`);
        
        if (!qr.print_position) {
          console.log(`ERROR: Missing print_position for QR ${qr.id}:`, JSON.stringify(qr, null, 2));
        }
        
        return qr;
      }).filter(Boolean);
      
      // Manual sort
      const ascending = order.toLowerCase() === 'asc';
      qrData.sort((a, b) => {
        let aVal, bVal;
        
        // Get values based on sort field
        if (sort === 'print_position') {
          aVal = a.print_position || 0;
          bVal = b.print_position || 0;
          // For numbers, use numeric comparison
          return ascending ? aVal - bVal : bVal - aVal;
        } else if (sort === 'status') {
          aVal = a.status || '';
          bVal = b.status || '';
          // For strings, use localeCompare
          return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else if (sort === 'bound_at') {
          aVal = a.bound_at || '';
          bVal = b.bound_at || '';
          // For dates, use string comparison (ISO format)
          return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else if (sort === 'farm') {
          aVal = a.farm?.name || '';
          bVal = b.farm?.name || '';
          // For farm names, use string comparison
          return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
          // Default fallback to print_position
          aVal = a.print_position || 0;
          bVal = b.print_position || 0;
          return ascending ? aVal - bVal : bVal - aVal;
        }
      });
      
      console.log(`After sort by ${sort} (${ascending ? 'ASC' : 'DESC'}):`, qrData.slice(0, 5).map(q => ({ 
        id: q.id, 
        [sort]: sort === 'print_position' ? q.print_position : 
                sort === 'status' ? q.status : 
                sort === 'bound_at' ? q.bound_at : 
                sort === 'farm' ? q.farm?.name : q.print_position 
      })));
      
      // Apply pagination
      const offset = (page - 1) * limit;
      console.log(`Paginating: offset=${offset}, limit=${limit}, qrData.length=${qrData.length}`);
      
      const finalData = qrData.slice(offset, offset + limit);
      
      console.log(`Final data length: ${finalData.length}`);
      console.log(`Page ${page}: positions`, finalData.map(q => q?.print_position || 'undefined'));
      
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);
      
      return {
        data: finalData,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (err) {
      console.error('Failed to get QR codes for batch', err, { batchId, options });
      throw err;
    }
  }
}

module.exports = ProductionBatchClient;