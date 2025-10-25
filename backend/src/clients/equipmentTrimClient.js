const dbConnection = require('../database/connection');
const { AppError } = require('../middleware/errorHandler');

class EquipmentTrimClient {
  static async create(trimData) {
    try {
      const { name, make = null, model = null, created_by = null, created_in = null } = trimData;
      
      console.log('DEBUG: create called with name:', name);
      
      // Check if name already exists for this make/model combination
      const isUnique = await this.checkNameUniqueForMakeModel(name, make, model);
      console.log('DEBUG: create - isUnique result:', isUnique);
      
      if (!isUnique) {
        console.log('DEBUG: create - throwing duplicate name error');
        throw new AppError('Equipment trim name already exists for this make/model', 409, 'DUPLICATE_NAME');
      }
      
      const supabase = dbConnection.getClient();
      
      // Include all fields that exist in the table
      const insertData = {
        name,
        created_at: new Date().toISOString()
      };
      
      // Add optional fields if they have values
      if (make) insertData.make = make;
      if (model) insertData.model = model;
      if (created_by) insertData.created_by = created_by;
      if (created_in) insertData.created_in = created_in;
      
      console.log('Inserting equipment trim data:', insertData);
      
      const { data, error } = await supabase
        .from('_equipment_trim')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      console.log('Equipment trim created successfully', { id: data.id, name: data.name });
      
      return data;
    } catch (error) {
      console.error('Failed to create equipment trim', error, { trimData });
      throw error;
    }
  }

  static async findById(id) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_trim')
        .select(`
          *,
          _equipment_make:make(id, name),
          _equipment_model:model(id, name),
          _equipment(count)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Equipment trim not found', 404, 'EQUIPMENT_TRIM_NOT_FOUND');
        }
        throw error;
      }
      
      // Add computed counts
      data.equipment_count = data._equipment?.[0]?.count || 0;
      
      // Clean up the joined data
      delete data._equipment;
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to find equipment trim by ID', error, { id });
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
        make = null,
        model = null
      } = options;
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('_equipment_trim')
        .select(`
          *,
          _equipment_make:make(id, name),
          _equipment_model:model(id, name)
        `, { count: 'exact' });
      
      // Apply search filter
      if (search) {
        query = query.or(`name.ilike.%${search}%`);
      }
      
      // Apply make filter
      if (make) {
        console.log('DEBUG: Applying make filter:', make);
        query = query.eq('make', make);
      }
      
      // Apply model filter
      if (model) {
        console.log('DEBUG: Applying model filter:', model);
        query = query.eq('model', model);
      }
      
      console.log('DEBUG: Final query params - make:', make, 'model:', model, 'search:', search);
      
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
      
      // For each equipment trim, get user and farm names
      const dataWithRelations = await Promise.all(data.map(async (item) => {
        let created_by_name = null;
        let created_in_name = null;
        
        // Get user email if created_by exists
        if (item.created_by) {
          try {
            console.log('DEBUG: Fetching user for created_by:', item.created_by);
            const { data: userData, error: userError } = await supabase
              .from('user_profiles')
              .select('email')
              .eq('id', item.created_by)
              .single();
            console.log('DEBUG: User query result:', { userData, userError });
            created_by_name = userData?.email || item.created_by; // Fallback to UUID if no email
          } catch (err) {
            console.warn('Failed to fetch user email for id:', item.created_by, err);
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
          equipment_count: 0, // Will be updated with actual counts later
          make_name: item._equipment_make?.name || null,
          model_name: item._equipment_model?.name || null,
          created_by_name,
          created_in_name
        };
      }));
      
      const dataWithCounts = dataWithRelations;
      
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
      console.error('Failed to find all equipment trims', error, { options });
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      // Check if equipment trim exists
      await this.findById(id);
      
      // Check if name is unique for the make/model combination (excluding current record)
      if (updateData.name) {
        const isUnique = await this.checkNameUniqueForMakeModel(updateData.name, updateData.make, updateData.model, id);
        if (!isUnique) {
          throw new AppError('Equipment trim name already exists for this make/model', 409, 'DUPLICATE_NAME');
        }
      }
      
      const supabase = dbConnection.getClient();
      
      const allowedFields = ['name', 'make', 'model', 'description'];
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
        .from('_equipment_trim')
        .update(updateObject)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment trim updated successfully', { id, fields: Object.keys(updateObject) });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to update equipment trim', error, { id, updateData });
      throw error;
    }
  }

  static async delete(id) {
    try {
      // Check if equipment trim exists
      await this.findById(id);
      
      const supabase = dbConnection.getClient();
      
      // Check for dependencies
      const { count: equipmentCount } = await supabase
        .from('_equipment')
        .select('*', { count: 'exact', head: true })
        .eq('trim', id);
      
      if ((equipmentCount || 0) > 0) {
        throw new AppError(
          'Cannot delete equipment trim with associated equipment',
          409,
          'EQUIPMENT_TRIM_HAS_DEPENDENCIES',
          {
            equipment_count: equipmentCount || 0
          }
        );
      }
      
      const { data, error } = await supabase
        .from('_equipment_trim')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('Equipment trim deleted successfully', { id });
      
      return data;
    } catch (error) {
      if (error.isOperational) throw error;
      console.error('Failed to delete equipment trim', error, { id });
      throw error;
    }
  }

  static async checkNameUnique(name, excludeId = null, make = null, model = null) {
    try {
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('_equipment_trim')
        .select('id')
        .ilike('name', name);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      // Check uniqueness within the same make/model combination
      if (make) {
        query = query.eq('make', make);
      }
      
      if (model) {
        query = query.eq('model', model);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data.length === 0;
    } catch (error) {
      console.error('Failed to check equipment trim name uniqueness', error, { name, excludeId, make, model });
      throw error;
    }
  }

  static async findForDropdown(makeId = null, modelId = null) {
    try {
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('_equipment_trim')
        .select('id, name, make, model')
        .order('name', { ascending: true });
      
      if (makeId) {
        query = query.eq('make', makeId);
      }
      
      if (modelId) {
        query = query.eq('model', modelId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to find equipment trims for dropdown', error, { makeId, modelId });
      throw error;
    }
  }

  static async findByMakeAndModel(makeId, modelId) {
    try {
      const supabase = dbConnection.getClient();
      
      const { data, error } = await supabase
        .from('_equipment_trim')
        .select(`
          *,
          _equipment_make:make(id, name),
          _equipment_model:model(id, name)
        `)
        .eq('make', makeId)
        .eq('model', modelId)
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to find equipment trims by make and model', error, { makeId, modelId });
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const supabase = dbConnection.getClient();
      
      // Get basic count
      const { count: totalTrims } = await supabase
        .from('_equipment_trim')
        .select('*', { count: 'exact', head: true });
      
      // For now, return simplified statistics
      return {
        total_trims: totalTrims || 0,
        total_equipment: 0,
        avg_equipment_per_trim: 0
      };
    } catch (error) {
      console.error('Failed to get equipment trim statistics', error);
      throw error;
    }
  }

  static async checkNameUniqueForMakeModel(name, makeId = null, modelId = null, excludeId = null) {
    try {
      console.log('DEBUG: checkNameUniqueForMakeModel called with:', { name, makeId, modelId, excludeId });
      
      const supabase = dbConnection.getClient();
      
      let query = supabase
        .from('_equipment_trim')
        .select('id')
        .eq('name', name); // Changed from ilike to eq for exact match
      
      // Add make/model filters if provided
      if (makeId) {
        query = query.eq('make', makeId);
      }
      
      if (modelId) {
        query = query.eq('model', modelId);
      }
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      console.log('DEBUG: checkNameUniqueForMakeModel found existing records:', data.length);
      const isUnique = data.length === 0;
      console.log('DEBUG: checkNameUniqueForMakeModel result - isUnique:', isUnique);
      
      return isUnique;
    } catch (error) {
      console.error('Failed to check equipment trim name uniqueness for make/model', error, { name, makeId, modelId, excludeId });
      throw error;
    }
  }
}

module.exports = EquipmentTrimClient;