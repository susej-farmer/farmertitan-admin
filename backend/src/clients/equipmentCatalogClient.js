const { createClient } = require('@supabase/supabase-js');

class EquipmentCatalogClient {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  static async findAll(options = {}) {
    const client = new EquipmentCatalogClient();
    const { page = 1, limit = 20, search = '', typeId = null, makeId = null, modelId = null } = options;
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    try {
      let query = client.supabase
        .from('_equipment')
        .select(`
          *,
          _equipment_type!inner(name),
          _equipment_make!inner(name),
          _equipment_model!inner(name),
          _equipment_trim(name)
        `, { count: 'exact' });
      
      // Apply filters
      if (search) {
        query = query.or(`_equipment_type.name.ilike.%${search}%,_equipment_make.name.ilike.%${search}%,_equipment_model.name.ilike.%${search}%`);
      }
      
      if (typeId) {
        query = query.eq('type', typeId);
      }
      
      if (makeId) {
        query = query.eq('make', makeId);
      }
      
      if (modelId) {
        query = query.eq('model', modelId);
      }
      
      query = query.range(from, to).order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Equipment catalog query error:', error);
        throw error;
      }
      
      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: (page * limit) < (count || 0),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in EquipmentCatalogClient.findAll:', error);
      throw error;
    }
  }

  static async findById(id) {
    const client = new EquipmentCatalogClient();
    
    try {
      const { data, error } = await client.supabase
        .from('_equipment')
        .select(`
          *,
          _equipment_type!inner(name),
          _equipment_make!inner(name),
          _equipment_model!inner(name),
          _equipment_trim(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Equipment catalog findById error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in EquipmentCatalogClient.findById:', error);
      throw error;
    }
  }

  static async create(equipmentData) {
    const client = new EquipmentCatalogClient();
    
    try {
      // Check if combination already exists
      const existingQuery = client.supabase
        .from('_equipment')
        .select('id')
        .eq('type', equipmentData.type)
        .eq('make', equipmentData.make)
        .eq('model', equipmentData.model);
      
      if (equipmentData.trim) {
        existingQuery.eq('trim', equipmentData.trim);
      } else {
        existingQuery.is('trim', null);
      }
      
      const { data: existing } = await existingQuery;
      
      if (existing && existing.length > 0) {
        throw new Error('This equipment combination already exists in the catalog');
      }
      
      const { data, error } = await client.supabase
        .from('_equipment')
        .insert([{
          type: equipmentData.type,
          make: equipmentData.make,
          model: equipmentData.model,
          trim: equipmentData.trim || null,
          year: equipmentData.year || null,
          metadata: equipmentData.metadata || {}
        }])
        .select(`
          *,
          _equipment_type!inner(name),
          _equipment_make!inner(name),
          _equipment_model!inner(name),
          _equipment_trim(name)
        `)
        .single();
      
      if (error) {
        console.error('Equipment catalog creation error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in EquipmentCatalogClient.create:', error);
      throw error;
    }
  }

  static async update(id, equipmentData) {
    const client = new EquipmentCatalogClient();
    
    try {
      // Check if combination already exists (excluding current record)
      const existingQuery = client.supabase
        .from('_equipment')
        .select('id')
        .eq('type', equipmentData.type)
        .eq('make', equipmentData.make)
        .eq('model', equipmentData.model)
        .neq('id', id);
      
      if (equipmentData.trim) {
        existingQuery.eq('trim', equipmentData.trim);
      } else {
        existingQuery.is('trim', null);
      }
      
      const { data: existing } = await existingQuery;
      
      if (existing && existing.length > 0) {
        throw new Error('This equipment combination already exists in the catalog');
      }
      
      const { data, error } = await client.supabase
        .from('_equipment')
        .update({
          type: equipmentData.type,
          make: equipmentData.make,
          model: equipmentData.model,
          trim: equipmentData.trim || null,
          year: equipmentData.year || null,
          metadata: equipmentData.metadata || {}
        })
        .eq('id', id)
        .select(`
          *,
          _equipment_type!inner(name),
          _equipment_make!inner(name),
          _equipment_model!inner(name),
          _equipment_trim(name)
        `)
        .single();
      
      if (error) {
        console.error('Equipment catalog update error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in EquipmentCatalogClient.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    const client = new EquipmentCatalogClient();
    
    try {
      // Check if this equipment catalog entry is being used by any physical equipment
      const { data: usageCheck } = await client.supabase
        .from('equipment')
        .select('id')
        .eq('_equipment', id)
        .limit(1);
      
      if (usageCheck && usageCheck.length > 0) {
        throw new Error('Cannot delete equipment catalog entry that is being used by existing equipment');
      }
      
      const { error } = await client.supabase
        .from('_equipment')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Equipment catalog deletion error:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in EquipmentCatalogClient.delete:', error);
      throw error;
    }
  }

  static async findByTypeModelTrim(type, make, model, trim = null, year = null) {
    const client = new EquipmentCatalogClient();
    
    try {
      let query = client.supabase
        .from('_equipment')
        .select(`
          *,
          _equipment_type!inner(name),
          _equipment_make!inner(name),
          _equipment_model!inner(name),
          _equipment_trim(name)
        `)
        .eq('type', type)
        .eq('make', make)
        .eq('model', model);
      
      if (trim) {
        query = query.eq('trim', trim);
      } else {
        query = query.is('trim', null);
      }
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) {
        console.error('Equipment findByTypeModelTrim error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in EquipmentCatalogClient.findByTypeModelTrim:', error);
      throw error;
    }
  }

  static async findTrimsForModel(makeId, modelId) {
    const client = new EquipmentCatalogClient();
    
    try {
      const { data, error } = await client.supabase
        .from('_equipment_trim')
        .select('id, name')
        .eq('make', makeId)
        .eq('model', modelId)
        .order('name');
      
      if (error) {
        console.error('Equipment trims query error:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in EquipmentCatalogClient.findTrimsForModel:', error);
      throw error;
    }
  }
}

module.exports = EquipmentCatalogClient;