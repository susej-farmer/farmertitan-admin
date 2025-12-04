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

  /**
   * Lista las tareas por defecto para un equipo específico
   * @param {string} equipmentId - UUID del _equipment
   * @param {string} equipmentTypeId - UUID del _equipment_type
   * @returns {Promise<Array>} Array de tareas por defecto
   */
  static async listDefaultTasks(equipmentId, equipmentTypeId) {
    const client = new TaskClient();

    try {
      const { data, error } = await client.supabase
        .rpc('list_default_tasks', {
          p_equipment_id: equipmentId,
          p_equipment_type_id: equipmentTypeId
        });

      if (error) {
        console.error('List default tasks error:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in TaskClient.listDefaultTasks:', error);
      throw error;
    }
  }

  /**
   * Find tasks by equipment ID and type
   * @param {string} equipmentId - Equipment UUID
   * @param {string} type - Task type (e.g., 'template:maintenance')
   * @returns {Promise<Array>} Array of tasks
   */
  static async findByEquipmentAndType(equipmentId, type = 'template:maintenance') {
    const client = new TaskClient();

    try {
      const { data, error } = await client.supabase
        .from('task')
        .select('id, name, description, status, priority, metadata')
        .eq('equipment', equipmentId)
        .eq('type', type)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error finding tasks by equipment and type:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in TaskClient.findByEquipmentAndType:', error);
      throw error;
    }
  }
}

module.exports = TaskClient;