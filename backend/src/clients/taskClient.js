const { createClient } = require('@supabase/supabase-js');

class TaskClient {
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

  static async create(taskData) {
    const client = new TaskClient();
    
    try {
      const { data, error } = await client.supabase
        .from('task')
        .insert([{
          type: taskData.type,
          name: taskData.name,
          description: taskData.description,
          _equipment_type: taskData._equipment_type,
          _equipment: taskData._equipment || null,
          _part_type: taskData._part_type || null,
          _consumable_type: taskData._consumable_type || null,
          priority: taskData.priority || null,
          status: taskData.status || 'pending'
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Task creation error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in TaskClient.create:', error);
      throw error;
    }
  }

  static async findById(id) {
    const client = new TaskClient();
    
    try {
      const { data, error } = await client.supabase
        .from('task')
        .select(`
          *,
          _equipment_type!inner(name),
          _part_type(name),
          _consumable_type(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Task findById error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in TaskClient.findById:', error);
      throw error;
    }
  }

  static async update(id, taskData) {
    const client = new TaskClient();
    
    try {
      const { data, error } = await client.supabase
        .from('task')
        .update({
          type: taskData.type,
          name: taskData.name,
          description: taskData.description,
          _equipment_type: taskData._equipment_type,
          _equipment: taskData._equipment || null,
          _part_type: taskData._part_type || null,
          _consumable_type: taskData._consumable_type || null,
          priority: taskData.priority || null,
          status: taskData.status || 'pending'
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Task update error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in TaskClient.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    const client = new TaskClient();
    
    try {
      const { error } = await client.supabase
        .from('task')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Task deletion error:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in TaskClient.delete:', error);
      throw error;
    }
  }

  static async findTemplates(options = {}) {
    const client = new TaskClient();
    const { page = 1, limit = 20, search = '', equipmentType = null } = options;
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    try {
      let query = client.supabase
        .from('task')
        .select(`
          *,
          _equipment_type!inner(name),
          _part_type(name),
          _consumable_type(name)
        `, { count: 'exact' })
        .eq('type', 'template:maintenance');
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      
      if (equipmentType) {
        query = query.eq('_equipment_type', equipmentType);
      }
      
      query = query.range(from, to).order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Task templates query error:', error);
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
      console.error('Error in TaskClient.findTemplates:', error);
      throw error;
    }
  }
}

module.exports = TaskClient;