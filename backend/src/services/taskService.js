const TaskClient = require('../clients/taskClient');
const { AppError } = require('../middleware/errorHandler');

/**
 * Servicio para gestionar tareas (tabla: task)
 */
class TaskService {
  /**
   * Crea una nueva tarea
   * @param {Object} taskData - Datos de la tarea
   * @returns {Promise<Object>} Tarea creada
   */
  static async create(taskData) {
    try {
      // Validar datos requeridos
      if (!taskData.type) {
        throw new AppError('Task type is required', 400, 'MISSING_TYPE');
      }

      if (!taskData.name) {
        throw new AppError('Task name is required', 400, 'MISSING_NAME');
      }

      return await TaskClient.create(taskData);
    } catch (error) {
      console.error('Error in TaskService.create:', error);
      throw error;
    }
  }

  /**
   * Busca una tarea por ID
   * @param {string} id - ID de la tarea
   * @returns {Promise<Object>} Tarea encontrada
   */
  static async findById(id) {
    try {
      if (!id) {
        throw new AppError('Task ID is required', 400, 'MISSING_ID');
      }

      return await TaskClient.findById(id);
    } catch (error) {
      console.error('Error in TaskService.findById:', error);
      throw error;
    }
  }

  /**
   * Actualiza una tarea
   * @param {string} id - ID de la tarea
   * @param {Object} taskData - Datos a actualizar
   * @returns {Promise<Object>} Tarea actualizada
   */
  static async update(id, taskData) {
    try {
      if (!id) {
        throw new AppError('Task ID is required', 400, 'MISSING_ID');
      }

      return await TaskClient.update(id, taskData);
    } catch (error) {
      console.error('Error in TaskService.update:', error);
      throw error;
    }
  }

  /**
   * Elimina una tarea
   * @param {string} id - ID de la tarea
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  static async delete(id) {
    try {
      if (!id) {
        throw new AppError('Task ID is required', 400, 'MISSING_ID');
      }

      return await TaskClient.delete(id);
    } catch (error) {
      console.error('Error in TaskService.delete:', error);
      throw error;
    }
  }

  /**
   * Busca templates de tareas
   * @param {Object} options - Opciones de búsqueda
   * @returns {Promise<Object>} Templates encontrados con paginación
   */
  static async findTemplates(options = {}) {
    try {
      return await TaskClient.findTemplates(options);
    } catch (error) {
      console.error('Error in TaskService.findTemplates:', error);
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
    try {
      // Validar parámetros requeridos
      if (!equipmentId) {
        throw new AppError('Equipment ID is required', 400, 'MISSING_EQUIPMENT_ID');
      }

      if (!equipmentTypeId) {
        throw new AppError('Equipment type ID is required', 400, 'MISSING_EQUIPMENT_TYPE_ID');
      }

      return await TaskClient.listDefaultTasks(equipmentId, equipmentTypeId);
    } catch (error) {
      console.error('Error in TaskService.listDefaultTasks:', error);
      throw error;
    }
  }
}

module.exports = TaskService;
