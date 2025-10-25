const { createClient } = require('@supabase/supabase-js');

class TaskSeriesClient {
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

  static async create(taskSeriesData) {
    const client = new TaskSeriesClient();
    
    try {
      const { data, error } = await client.supabase
        .from('_task_series')
        .insert([{
          schedule: taskSeriesData.schedule,
          type: taskSeriesData.type,
          task_template: taskSeriesData.task_template,
          _equipment_type: taskSeriesData._equipment_type,
          _equipment: taskSeriesData._equipment || null,
          _part_type: taskSeriesData._part_type || null,
          _consumable_type: taskSeriesData._consumable_type || null
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Task series creation error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in TaskSeriesClient.create:', error);
      throw error;
    }
  }

  static async findById(id) {
    const client = new TaskSeriesClient();
    
    try {
      const { data, error } = await client.supabase
        .from('_task_series')
        .select(`
          *,
          _time!schedule(type, value, metadata),
          task!task_template(name, description, priority),
          _equipment_type!inner(name),
          _equipment(id, name),
          _part_type(name),
          _consumable_type(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Task series findById error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in TaskSeriesClient.findById:', error);
      throw error;
    }
  }

  static async findByTaskTemplate(taskTemplateId) {
    const client = new TaskSeriesClient();
    
    try {
      const { data, error } = await client.supabase
        .from('_task_series')
        .select(`
          *,
          _time!schedule(type, value, metadata)
        `)
        .eq('task_template', taskTemplateId);
      
      if (error) {
        console.error('Task series findByTaskTemplate error:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in TaskSeriesClient.findByTaskTemplate:', error);
      throw error;
    }
  }

  static async update(id, taskSeriesData) {
    const client = new TaskSeriesClient();
    
    try {
      const { data, error } = await client.supabase
        .from('_task_series')
        .update({
          schedule: taskSeriesData.schedule,
          type: taskSeriesData.type,
          task_template: taskSeriesData.task_template,
          _equipment_type: taskSeriesData._equipment_type,
          _equipment: taskSeriesData._equipment || null,
          _part_type: taskSeriesData._part_type || null,
          _consumable_type: taskSeriesData._consumable_type || null
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Task series update error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in TaskSeriesClient.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    const client = new TaskSeriesClient();
    
    try {
      const { error } = await client.supabase
        .from('_task_series')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Task series deletion error:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in TaskSeriesClient.delete:', error);
      throw error;
    }
  }

  static async deleteByTaskTemplate(taskTemplateId) {
    const client = new TaskSeriesClient();
    
    try {
      const { error } = await client.supabase
        .from('_task_series')
        .delete()
        .eq('task_template', taskTemplateId);
      
      if (error) {
        console.error('Task series deleteByTaskTemplate error:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in TaskSeriesClient.deleteByTaskTemplate:', error);
      throw error;
    }
  }

  static async findByEquipment(equipmentId) {
    const client = new TaskSeriesClient();
    
    try {
      const { data, error } = await client.supabase
        .from('_task_series')
        .select(`
          *,
          _time!schedule(type, value, metadata),
          task!task_template(name, description, priority),
          _equipment_type!inner(name),
          _part_type(name),
          _consumable_type(name)
        `)
        .eq('_equipment', equipmentId);
      
      if (error) {
        console.error('Task series findByEquipment error:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in TaskSeriesClient.findByEquipment:', error);
      throw error;
    }
  }
}

module.exports = TaskSeriesClient;