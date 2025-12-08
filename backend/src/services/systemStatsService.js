const SystemStatsClient = require('../clients/systemStatsClient');

class SystemStatsService {
  /**
   * Get system-wide statistics
   * @returns {Promise<Object>} System statistics with data and metadata
   */
  static async getSystemStats() {
    try {
      const result = await SystemStatsClient.getSystemStats();

      // Apply any business logic transformations here if needed
      return result;
    } catch (error) {
      console.error('Error in SystemStatsService.getSystemStats:', error);
      throw error;
    }
  }
}

module.exports = SystemStatsService;
