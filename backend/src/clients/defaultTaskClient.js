const dbConnection = require('../database/connection');

class DefaultTaskClient {
  /**
   * Create a default maintenance task template
   * Calls the PostgreSQL function create_default_task()
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task data or error
   */
  static async create(taskData) {
    try {
      const {
        equipment_type_id,
        task_name,
        time_type,
        time_interval,
        equipment_make_id = null,
        equipment_model_id = null,
        equipment_trim_id = null,
        equipment_year = null,
        part_type_id = null,
        consumable_type_id = null,
        task_description = null
      } = taskData;

      const supabase = dbConnection.getClient();

      // Call the PostgreSQL function create_default_task
      const { data, error } = await supabase.rpc('create_default_task', {
        p_equipment_type_id: equipment_type_id,
        p_task_name: task_name,
        p_time_type: time_type,
        p_time_interval: time_interval,
        p_equipment_make_id: equipment_make_id,
        p_equipment_model_id: equipment_model_id,
        p_equipment_trim_id: equipment_trim_id,
        p_equipment_year: equipment_year,
        p_part_type_id: part_type_id,
        p_consumable_type_id: consumable_type_id,
        p_task_description: task_description
      });

      if (error) {
        console.error('Failed to create default task:', error);
        throw error;
      }

      // The function returns a JSONB object with success, data, metadata, or error
      return data;
    } catch (error) {
      console.error('Failed to create default task', error);
      throw error;
    }
  }
}

module.exports = DefaultTaskClient;
