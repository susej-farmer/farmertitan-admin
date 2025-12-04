const { AppError } = require('../middleware/errorHandler');

/**
 * Servicio para gestionar equipos físicos (tabla: equipment)
 * Para operaciones del catálogo de equipos, usar EquipmentCatalogService
 */
class EquipmentService {
  /**
   * Mapea schedule.type a usage type para initial_usage
   * @param {string} scheduleType - Tipo de schedule (schedule:hours, schedule:distance, schedule:cron)
   * @returns {string|null} Tipo de usage (hour, distance, datetime) o null
   */
  static mapScheduleTypeToUsageType(scheduleType) {
    const mapping = {
      'schedule:hours': 'hour',
      'schedule:distance': 'distance',
      'schedule:cron': 'datetime'
    };
    return mapping[scheduleType] || null;
  }

  /**
   * Crear un nuevo equipment físico
   * @param {Object} equipmentData - Datos del equipment
   * @param {string} equipmentData.name - Nombre del equipment
   * @param {string} equipmentData.serial_number - Número de serie
   * @param {string} equipmentData.license_number - Número de licencia
   * @param {number} equipmentData.equipment_year - Año del equipo
   * @param {number} equipmentData.year_purchased - Año de compra
   * @param {boolean} equipmentData.lease_owned - Si es propio o arrendado
   * @param {string} equipmentData.warranty_time - Tiempo de garantía
   * @param {string} equipmentData.warranty_details - Detalles de garantía
   * @param {string} equipmentData._equipment - ID del catálogo _equipment
   * @param {string} equipmentData.farm_id - ID de la granja
   * @param {Array} [equipmentData.default_task] - Tareas por defecto (opcional)
   * @returns {Promise<Object>} Equipment creado
   */
  static async create(equipmentData) {
    try {
      const EquipmentClient = require('../clients/equipmentClient');

      // Validaciones básicas
      if (!equipmentData.name || !equipmentData.farm_id) {
        throw new AppError('Equipment name and farm_id are required', 400, 'MISSING_REQUIRED_FIELDS');
      }

      // Preparar maintenance_items desde default_task
      let maintenance_items = [];
      if (equipmentData.default_task && Array.isArray(equipmentData.default_task)) {
        maintenance_items = equipmentData.default_task.map(task => ({
          id: task.id,
          schedule: {
            type: task.schedule?.type || null,
            value: task.schedule?.value || null,
            metadata: task.schedule?.metadata || {}
          },
          name: task.name,
          description: task.description,
          maintenance_type: task.maintenance_type
        }));
      }

      // Preparar initial_usage desde default_task (un objeto por cada schedule.type único)
      let initial_usage = [];
      if (equipmentData.default_task && Array.isArray(equipmentData.default_task)) {
        const scheduleTypesMap = new Map();

        equipmentData.default_task.forEach(task => {
          if (task.schedule?.type && !scheduleTypesMap.has(task.schedule.type)) {
            scheduleTypesMap.set(task.schedule.type, task.schedule.metadata || {});
          }
        });

        initial_usage = Array.from(scheduleTypesMap.entries())
          .map(([scheduleType, metadata]) => {
            const usageType = this.mapScheduleTypeToUsageType(scheduleType);
            if (!usageType) return null;

            return {
              type: usageType,
              value: "0",
              metadata: metadata
            };
          })
          .filter(item => item !== null);
      }

      // Preparar datos para el RPC
      const rpcData = {
        name: equipmentData.name,
        equipment_model_id: equipmentData.equipment_model_id || null,
        make_id: equipmentData.make_id || null,
        equipment_type_id: equipmentData.equipment_type_id || null,
        farm_id: equipmentData.farm_id,
        maintenance_items: maintenance_items,
        initial_usage: initial_usage,
        created_by: equipmentData.created_by || null,
        serial_number: equipmentData.serial_number || null,

        // Asegurar que year_purchased sea integer o null
        year_purchased: equipmentData.year_purchased ? parseInt(equipmentData.year_purchased, 10) : null,

        // Asegurar que lease_owned sea boolean
        lease_owned: typeof equipmentData.lease_owned === 'boolean'
          ? equipmentData.lease_owned
          : Boolean(equipmentData.lease_owned),

        warranty_time: equipmentData.warranty_time || null,
        warranty_details: equipmentData.warranty_details || null
      };

      // Llamar al client para crear el equipment
      const createdEquipment = await EquipmentClient.create(rpcData);

      // Verificar que el equipo se creó exitosamente
      if (!createdEquipment || !createdEquipment.id) {
        // Si el RPC retornó algo pero sin ID, puede ser un error no capturado
        console.error('Equipment creation returned unexpected result:', createdEquipment);
        throw new AppError(
          'Equipment creation failed: No ID returned from database',
          500,
          'EQUIPMENT_CREATION_FAILED'
        );
      }

      console.log('Equipment created successfully in service layer', {
        equipmentId: createdEquipment.id
      });

      return createdEquipment;
    } catch (error) {
      console.error('Error in EquipmentService.create:', error);
      throw error;
    }
  }

  /**
   * Buscar equipment por número de serie (global)
   * @param {string} serialNumber - Número de serie
   * @returns {Promise<Object|null>} Equipment encontrado o null
   */
  static async findBySerialNumber(serialNumber) {
    try {
      const EquipmentClient = require('../clients/equipmentClient');
      return await EquipmentClient.findBySerialNumber(serialNumber);
    } catch (error) {
      console.error('Error in EquipmentService.findBySerialNumber:', error);
      throw error;
    }
  }

  /**
   * Buscar equipment por nombre y granja
   * @param {string} equipmentName - Nombre del equipment
   * @param {string} farmId - UUID de la granja
   * @returns {Promise<Object|null>} Equipment encontrado o null
   */
  static async findByNameAndFarm(equipmentName, farmId) {
    try {
      const EquipmentClient = require('../clients/equipmentClient');
      return await EquipmentClient.findByNameAndFarm(equipmentName, farmId);
    } catch (error) {
      console.error('Error in EquipmentService.findByNameAndFarm:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los equipments de una granja con relaciones completas
   * Incluye: farm, _equipment details, usage_tracking, y maintenance tasks
   * @param {string} farmId - UUID de la granja
   * @param {Object} options - Opciones de filtrado y paginación
   * @param {number} [options.page=1] - Número de página
   * @param {number} [options.limit=20] - Registros por página
   * @param {string} [options.search=''] - Búsqueda por nombre o serial
   * @param {string} [options.status=null] - Filtrar por estado
   * @param {string} [options.equipment_type=null] - Filtrar por tipo de equipo
   * @returns {Promise<Object>} { data: Array, pagination: Object }
   */
  static async findByFarm(farmId, options = {}) {
    try {
      // Validar farmId
      if (!farmId) {
        throw new AppError('Farm ID is required', 400, 'MISSING_FARM_ID');
      }

      const EquipmentClient = require('../clients/equipmentClient');
      const result = await EquipmentClient.findByFarm(farmId, options);

      return result;
    } catch (error) {
      console.error('Error in EquipmentService.findByFarm:', error);
      throw error;
    }
  }
}

module.exports = EquipmentService;
