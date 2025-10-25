const { createClient } = require('@supabase/supabase-js');

class TimeClient {
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

  static async create(timeData) {
    const client = new TimeClient();
    
    try {
      const { data, error } = await client.supabase
        .from('_time')
        .insert([{
          type: timeData.type,
          value: timeData.value,
          metadata: timeData.metadata || {}
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Time creation error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in TimeClient.create:', error);
      throw error;
    }
  }

  static async findById(id) {
    const client = new TimeClient();
    
    try {
      const { data, error } = await client.supabase
        .from('_time')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Time findById error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in TimeClient.findById:', error);
      throw error;
    }
  }

  static async update(id, timeData) {
    const client = new TimeClient();
    
    try {
      const { data, error } = await client.supabase
        .from('_time')
        .update({
          type: timeData.type,
          value: timeData.value,
          metadata: timeData.metadata || {}
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Time update error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in TimeClient.update:', error);
      throw error;
    }
  }

  static async delete(id) {
    const client = new TimeClient();
    
    try {
      const { error } = await client.supabase
        .from('_time')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Time deletion error:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error in TimeClient.delete:', error);
      throw error;
    }
  }
}

module.exports = TimeClient;