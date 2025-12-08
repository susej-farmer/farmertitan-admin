const dbConnection = require('../database/connection');

class MaintenanceTemplateClient {
  /**
   * Get all maintenance templates using PostgreSQL function
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @param {string} options.search - Search term
   * @param {string} options.type_id - Equipment type filter
   * @param {string} options.make_id - Equipment make filter
   * @param {string} options.model_id - Equipment model filter
   * @param {number} options.year - Equipment year filter
   * @param {string} options.sort - Sort field
   * @param {string} options.order - Sort order
   * @returns {Promise<Object>} Templates with pagination
   */
  static async getAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 25,
        search = null,
        type_id = null,
        make_id = null,
        model_id = null,
        year = null,
        sort = 'created_at',
        order = 'DESC'
      } = options;

      const supabase = dbConnection.getClient();

      // Call the PostgreSQL function get_maintenance_templates
      const { data, error } = await supabase.rpc('get_maintenance_templates', {
        p_page: page,
        p_limit: limit,
        p_search: search,
        p_type_id: type_id,
        p_make_id: make_id,
        p_model_id: model_id,
        p_year: year,
        p_sort: sort,
        p_order: order.toUpperCase()
      });

      if (error) {
        console.error('Failed to get maintenance templates:', error);
        throw error;
      }

      if (!data || !data.success) {
        const errorMsg = data?.error_message || 'Unknown error from get_maintenance_templates';
        const errorCode = data?.error_code || 'UNEXPECTED_ERROR';
        const { AppError } = require('../middleware/errorHandler');
        throw new AppError(errorMsg, 400, errorCode);
      }

      return {
        data: data.data || [],
        pagination: data.pagination || {
          page,
          limit,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        },
        metadata: data.metadata
      };
    } catch (error) {
      console.error('Failed to get maintenance templates', error);
      throw error;
    }
  }

  /**
   * Get maintenance template by ID
   * @param {string} id - Template ID
   * @returns {Promise<Object>} Template data
   */
  static async findById(id) {
    try {
      const supabase = dbConnection.getClient();

      const { data, error } = await supabase
        .from('_task_series')
        .select('*')
        .eq('id', id)
        .eq('type', 'template:maintenance')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { AppError } = require('../middleware/errorHandler');
          throw new AppError('Maintenance template not found', 404, 'TEMPLATE_NOT_FOUND');
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to find maintenance template by ID', error);
      throw error;
    }
  }

  /**
   * Create maintenance template
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Created template
   */
  static async create(templateData) {
    try {
      const supabase = dbConnection.getClient();

      const { data, error } = await supabase
        .from('_task_series')
        .insert({
          type: 'template:maintenance',
          ...templateData
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create maintenance template', error);
      throw error;
    }
  }

  /**
   * Delete maintenance template
   * @param {string} id - Template ID
   * @returns {Promise<void>}
   */
  static async delete(id) {
    try {
      const supabase = dbConnection.getClient();

      const { error } = await supabase
        .from('_task_series')
        .delete()
        .eq('id', id)
        .eq('type', 'template:maintenance');

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete maintenance template', error);
      throw error;
    }
  }
}

module.exports = MaintenanceTemplateClient;
