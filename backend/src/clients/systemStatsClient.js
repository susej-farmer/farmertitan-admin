const dbConnection = require('../database/connection');

class SystemStatsClient {
  /**
   * Get system-wide statistics by calling the PostgreSQL function get_system_stats
   * @returns {Promise<Object>} System statistics
   */
  static async getSystemStats() {
    try {
      const supabase = dbConnection.getClient();

      // Call the PostgreSQL function get_system_stats
      const { data, error } = await supabase.rpc('get_system_stats');

      if (error) {
        console.error('Failed to get system stats:', error);
        throw error;
      }

      // The function returns a JSONB object with success, data, metadata
      if (!data || !data.success) {
        const errorMsg = data?.error_message || 'Unknown error from get_system_stats';
        const errorCode = data?.error_code || 'UNKNOWN_ERROR';
        console.error('get_system_stats returned error:', errorCode, errorMsg);

        const { AppError } = require('../middleware/errorHandler');
        throw new AppError(errorMsg, 400, errorCode);
      }

      return data;
    } catch (error) {
      console.error('Failed to get system stats', error);
      throw error;
    }
  }
}

module.exports = SystemStatsClient;
