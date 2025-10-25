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
      
      // Get ALL QR codes for this batch
      const { data: allData, error, count } = await supabase
        .from('qr_allocation')
        .select(`
          qr:qr_id (
            id,
            short_code,
            status,
            created_at,
            bound_at,
            print_position,
            metadata,
            farm:farm(id, name)
          ),
          allocated_at,
          notes
        `, { count: 'exact' })
        .eq('production_batch_id', batchId);
        
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log(`Got ${allData?.length || 0} total records from database`);
      
      if (allData && allData.length > 0) {
        console.log('Raw data sample:', JSON.stringify(allData[0], null, 2));
        console.log('First QR print_position:', allData[0]?.qr?.print_position);
        console.log('All QR print_positions:', allData.slice(0, 5).map(a => a?.qr?.print_position));
        console.log('Farm names:', allData.slice(0, 5).map(a => a?.qr?.farm?.name));
      }
      
      // Transform data
      const qrData = (allData || []).map(allocation => {
        if (!allocation.qr) {
          console.log('ERROR: allocation.qr is null!', allocation);
          return null;
        }
        
        console.log(`Transforming QR ID ${allocation.qr.id}, print_position: ${allocation.qr.print_position}, farm: ${allocation.qr.farm?.name}`);
        
        const transformed = {
          ...allocation.qr,
          allocated_at: allocation.allocated_at,
          allocation_notes: allocation.notes
        };
        
        if (!transformed.print_position) {
          console.log(`ERROR: Missing print_position for QR ${allocation.qr.id}:`, JSON.stringify(allocation.qr, null, 2));
        }
        
        return transformed;
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