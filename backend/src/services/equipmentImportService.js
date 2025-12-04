const fs = require('fs');
const csv = require('csv-parser');
const FarmService = require('./farmService');
const EquipmentService = require('./equipmentService');
const EquipmentCatalogService = require('./equipmentCatalogService');
const EquipmentTypeService = require('./equipmentTypeService');
const EquipmentMakeService = require('./equipmentMakeService');
const EquipmentModelService = require('./equipmentModelService');
const TaskService = require('./taskService');
const { AppError } = require('../middleware/errorHandler');

/**
 * Servicio para importar equipos desde archivos CSV
 */
class EquipmentImportService {
  /**
   * Columnas requeridas en el CSV
   */
  static REQUIRED_COLUMNS = [
    'equipment_name',
    'equipment_type_id',
    'make_id',
    'equipment_model_id',
    'serial_number',
    'license_number',
    'equipment_year',
    'year_purchased',
    'lease_owned',
    'warranty_time',
    'warranty_details'
  ];

  /**
   * Convierte un valor a boolean
   * Soporta: "1", "TRUE", "true", 1, true → true
   *          "0", "FALSE", "false", 0, false, null, undefined → false
   * @param {*} value - Valor a convertir
   * @returns {boolean}
   */
  static parseBoolean(value) {
    if (value === null || value === undefined || value === '') {
      return false;
    }

    // Si ya es boolean, retornarlo
    if (typeof value === 'boolean') {
      return value;
    }

    // Si es string, normalizar y comparar
    if (typeof value === 'string') {
      const normalized = value.trim().toUpperCase();
      return normalized === 'TRUE' || normalized === '1' || normalized === 'YES';
    }

    // Si es número, 0 = false, cualquier otro = true
    if (typeof value === 'number') {
      return value !== 0;
    }

    // Por defecto, false
    return false;
  }

  /**
   * Convierte un valor a number (integer)
   * @param {*} value - Valor a convertir
   * @returns {number|null}
   */
  static parseInteger(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Procesa un registro individual del CSV e inserta el equipment en la BD
   * @param {Object} validatedData - Datos validados del equipment
   * @param {string} farmId - UUID de la granja
   * @param {string} userId - UUID del usuario que realiza la importación
   * @returns {Promise<Object>} Equipment creado
   */
  static async procesarRegistros(validatedData, farmId, userId) {
    try {
      // Preparar datos para crear el equipo físico
      const equipmentData = {
        name: validatedData.name,
        serial_number: validatedData.serial_number,
        license_number: validatedData.license_number,
        equipment_year: validatedData.equipment_year,
        year_purchased: validatedData.year_purchased,
        lease_owned: validatedData.lease_owned,
        warranty_time: validatedData.warranty_time,
        warranty_details: validatedData.warranty_details,
        equipment_model_id: validatedData.model?.id || null,
        make_id: validatedData.make?.id || null,
        equipment_type_id: validatedData.equipment_type?.id || null,
        _equipment: validatedData._equipment?.id || null,
        farm_id: farmId,
        default_task: validatedData.default_task || [],
        created_by: userId
      };

      // Crear el equipo usando el servicio
      const createdEquipment = await EquipmentService.create(equipmentData);

      return createdEquipment;
    } catch (error) {
      console.error('Error creating equipment:', error.message);
      throw error;
    }
  }

  /**
   * Valida que el CSV tenga todas las columnas requeridas
   * @param {Array<string>} headers - Headers del CSV
   * @throws {AppError} Si faltan columnas requeridas
   */
  static validateCSVStructure(headers) {
    const missingColumns = this.REQUIRED_COLUMNS.filter(
      col => !headers.includes(col)
    );

    if (missingColumns.length > 0) {
      throw new AppError(
        `CSV structure is invalid. Missing columns: ${missingColumns.join(', ')}`,
        400,
        'INVALID_CSV_STRUCTURE',
        { missingColumns, requiredColumns: this.REQUIRED_COLUMNS }
      );
    }

  }

  /**
   * Valida si un registro de equipment puede ser procesado
   * @param {Object} registro - Fila del CSV
   * @param {string} farmId - UUID de la granja
   * @param {string} userId - ID del usuario que realiza la importación
   * @returns {Promise<Object>} { isValid: boolean, reason: string, data: Object }
   */
  static async validarEquipment(registro, farmId, userId = null) {
    try {
      const validatedData = {};

      // 1. Validar si el serial_number ya existe (globalmente)
      if (registro.serial_number && registro.serial_number.trim() !== '') {
        const existingBySerial = await EquipmentService.findBySerialNumber(
          registro.serial_number
        );

        if (existingBySerial) {
          return {
            isValid: false,
            reason: `Serial number '${registro.serial_number}' already exists in the system (Equipment: ${existingBySerial.name})`,
            data: null
          };
        }
      }

      // 2. Validar si el nombre ya existe en esta granja
      if (registro.equipment_name && registro.equipment_name.trim() !== '') {
        const existingByName = await EquipmentService.findByNameAndFarm(
          registro.equipment_name,
          farmId
        );

        if (existingByName) {
          return {
            isValid: false,
            reason: `Equipment name '${registro.equipment_name}' already exists in this farm`,
            data: null
          };
        }
      }

      // 3. Validar o crear equipment_type_id (ahora opcional)
      if (!registro.equipment_type_id || registro.equipment_type_id.trim() === '') {
        // Si está vacío, usar o crear "UNKNOWN"
        try {
          const unknownType = await EquipmentTypeService.findOrCreateUnknown(userId);
          validatedData.equipment_type = {
            id: unknownType.id,
            name: unknownType.name
          };
        } catch (error) {
          return {
            isValid: false,
            reason: `Failed to create/find UNKNOWN equipment type: ${error.message}`,
            data: null
          };
        }
      } else {
        // Si tiene valor, validar que existe
        try {
          const equipmentType = await EquipmentTypeService.findById(registro.equipment_type_id);
          validatedData.equipment_type = {
            id: equipmentType.id,
            name: equipmentType.name
          };
        } catch (error) {
          return {
            isValid: false,
            reason: `Equipment type ID '${registro.equipment_type_id}' not found`,
            data: null
          };
        }
      }

      // 4. Validar o crear make_id (ahora opcional)
      if (!registro.make_id || registro.make_id.trim() === '') {
        // Si está vacío, usar o crear "UNKNOWN"
        try {
          const unknownMake = await EquipmentMakeService.findOrCreateUnknown(userId);
          validatedData.make = {
            id: unknownMake.id,
            name: unknownMake.name
          };
        } catch (error) {
          return {
            isValid: false,
            reason: `Failed to create/find UNKNOWN equipment make: ${error.message}`,
            data: null
          };
        }
      } else {
        // Si tiene valor, validar que existe
        try {
          const make = await EquipmentMakeService.findById(registro.make_id);
          validatedData.make = {
            id: make.id,
            name: make.name
          };
        } catch (error) {
          return {
            isValid: false,
            reason: `Make ID '${registro.make_id}' not found`,
            data: null
          };
        }
      }

      // 5. Validar o crear equipment_model_id (ahora opcional)
      if (!registro.equipment_model_id || registro.equipment_model_id.trim() === '') {
        // Si está vacío, usar o crear "UNKNOWN" para el make ya obtenido
        try {
          const unknownModel = await EquipmentModelService.findOrCreateUnknown(validatedData.make.id, userId);
          validatedData.model = {
            id: unknownModel.id,
            name: unknownModel.name
          };
        } catch (error) {
          return {
            isValid: false,
            reason: `Failed to create/find UNKNOWN equipment model: ${error.message}`,
            data: null
          };
        }
      } else {
        // Si tiene valor, validar que existe
        try {
          const model = await EquipmentModelService.findById(registro.equipment_model_id);
          validatedData.model = {
            id: model.id,
            name: model.name
          };
        } catch (error) {
          return {
            isValid: false,
            reason: `Equipment model ID '${registro.equipment_model_id}' not found`,
            data: null
          };
        }
      }

      // 6. Buscar o crear _equipment correspondiente en el catálogo
      try {
        const attributesToSearch = {
          type: validatedData.equipment_type.id,
          make: validatedData.make.id
        };

        // Solo incluir model si existe
        if (validatedData.model) {
          attributesToSearch.model = validatedData.model.id;
        }

        let catalogEquipment = await EquipmentCatalogService.findByAttributes(attributesToSearch);

        // Si no existe, crear uno nuevo
        if (!catalogEquipment) {
          const newEquipmentData = {
            type: validatedData.equipment_type.id,
            make: validatedData.make.id,
            model: validatedData.model?.id || null,
            // Pasar undefined en lugar de null para que salte la validación de año
            year: validatedData.equipment_year || undefined,
            trim: null,
            metadata: null,
            created_by: userId,
            created_in: null
          };

          catalogEquipment = await EquipmentCatalogService.create(newEquipmentData);
        }

        // Agregar al validatedData
        validatedData._equipment = {
          id: catalogEquipment.id,
          type: catalogEquipment._equipment_type,
          make: catalogEquipment._equipment_make,
          model: catalogEquipment._equipment_model,
          trim: catalogEquipment._equipment_trim,
          year: catalogEquipment.year
        };

        // 7. Obtener tareas por defecto para este equipo
        try {
          const defaultTasks = await TaskService.listDefaultTasks(
            catalogEquipment.id,
            validatedData.equipment_type.id
          );

          // Validar que las tareas no tengan schedule:distance y schedule:hours juntas
          // schedule:cron puede combinarse con cualquiera de los otros dos
          if (defaultTasks && defaultTasks.length > 0) {
            const scheduleTypes = defaultTasks.map(task => task.schedule?.type).filter(Boolean);
            const uniqueScheduleTypes = [...new Set(scheduleTypes)];

            // Revisar si existen ambos schedule:distance y schedule:hours (combinación no válida)
            const hasDistance = uniqueScheduleTypes.includes('schedule:distance');
            const hasHours = uniqueScheduleTypes.includes('schedule:hours');

            if (hasDistance && hasHours) {
              return {
                isValid: false,
                reason: 'Default tasks cannot have both schedule:distance and schedule:hours types together. Only one of these can exist (schedule:cron can be combined with either).',
                data: null
              };
            }
          }

          validatedData.default_task = defaultTasks;
        } catch (error) {
          console.error('Error fetching default tasks:', error.message);
          validatedData.default_task = [];
        }
      } catch (error) {
        // Si hay error buscando/creando _equipment, continuar sin establecerlo
        console.error('Error handling _equipment:', error.message);
        validatedData._equipment = null;
        validatedData.default_task = [];
      }

      // Si pasa todas las validaciones, construir el JSON completo
      validatedData.name = registro.equipment_name;
      validatedData.serial_number = registro.serial_number || null;
      validatedData.license_number = registro.license_number || null;

      // Convertir equipment_year a integer (o undefined si vacío/null/espacios)
      const equipmentYear = registro.equipment_year?.trim();
      validatedData.equipment_year = equipmentYear ? this.parseInteger(equipmentYear) : undefined;

      // Convertir year_purchased a integer
      validatedData.year_purchased = this.parseInteger(registro.year_purchased);

      // Convertir lease_owned a boolean
      validatedData.lease_owned = this.parseBoolean(registro.lease_owned);

      // Limpiar espacios en blanco y convertir vacío a null
      validatedData.warranty_time = registro.warranty_time?.trim() || null;
      validatedData.warranty_details = registro.warranty_details?.trim() || null;

      return {
        isValid: true,
        reason: null,
        data: validatedData
      };

    } catch (error) {
      // En caso de error inesperado, mejor no procesar para evitar inconsistencias
      return {
        isValid: false,
        reason: `Validation error: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Importa equipos desde un archivo CSV
   * @param {string} farmId - UUID de la granja
   * @param {string} csvFilePath - Ruta del archivo CSV temporal
   * @param {string} userId - ID del usuario que realiza la importación
   * @returns {Promise<Object>} Resultado de la importación
   */
  static async importEquipmentFromCSV(farmId, csvFilePath, userId = null) {
    try {
      // 1. Validar que la granja existe
      const farm = await FarmService.findById(farmId);

      if (!farm) {
        throw new AppError(
          `Farm with ID ${farmId} not found`,
          404,
          'FARM_NOT_FOUND',
          { farmId }
        );
      }


      // 2. Leer y procesar el CSV
      return new Promise((resolve, reject) => {
        const registrosProcesados = [];
        const registrosNoProcesados = [];
        const allRows = []; // Almacenar todas las filas primero
        let headers = [];

        const stream = fs.createReadStream(csvFilePath)
          .pipe(csv({ skipEmptyLines: true })) // Saltar líneas vacías explícitamente
          .on('headers', (csvHeaders) => {
            headers = csvHeaders;

            // Validar estructura del CSV
            try {
              this.validateCSVStructure(headers);
            } catch (error) {
              reject(error);
            }
          })
          .on('data', (row) => {
            // Solo acumular las filas, no procesar aún
            allRows.push(row);
          })
          .on('end', async () => {
            try {
              console.log(`\n📥 CSV loaded: ${allRows.length} rows found`);

              // Ahora procesar todas las filas secuencialmente
              let lineNumber = 1; // Línea 1 es el header

              for (const row of allRows) {
                lineNumber++;

                try {
                  // Validar si el registro puede ser procesado
                  const validacion = await this.validarEquipment(row, farmId, userId);

                  if (validacion.isValid) {
                    // Si es válido, procesar con los datos validados
                    try {
                      const createdEquipment = await this.procesarRegistros(validacion.data, farmId, userId);

                      // Verificar que realmente se creó el equipo
                      if (!createdEquipment || !createdEquipment.id) {
                        throw new Error('Equipment creation failed: No ID returned from database');
                      }

                      // Solo incluir datos esenciales en la respuesta para facilitar identificación
                      registrosProcesados.push({
                        line: lineNumber,
                        created_equipment_id: createdEquipment.id,
                        name: validacion.data.name,
                        serial_number: validacion.data.serial_number,
                        license_number: validacion.data.license_number,
                        equipment_type: validacion.data.equipment_type?.name || null,
                        make: validacion.data.make?.name || null,
                        model: validacion.data.model?.name || null,
                        year_purchased: validacion.data.year_purchased,
                        lease_owned: validacion.data.lease_owned,
                        tasks_created: validacion.data.default_task?.length || 0
                      });
                    } catch (createError) {
                      // Si falla la creación, agregar a skipped con el error específico
                      console.error(`Error creating equipment on line ${lineNumber}:`, createError.message);
                      registrosNoProcesados.push({
                        line: lineNumber,
                        data: row,
                        reason: `Creation error: ${createError.message || 'Unknown error during equipment creation'}`
                      });
                    }
                  } else {
                    // Si no es válido, agregar a registros no procesados
                    registrosNoProcesados.push({
                      line: lineNumber,
                      data: row,
                      reason: validacion.reason
                    });
                  }
                } catch (error) {
                  console.error(`Error processing line ${lineNumber}:`, error.message);
                  registrosNoProcesados.push({
                    line: lineNumber,
                    data: row,
                    reason: `Processing error: ${error.message}`
                  });
                }
              }

              // Todos los registros procesados, generar respuesta
              const totalRecords = registrosProcesados.length + registrosNoProcesados.length;

              // Log para diagnóstico
              console.log('\n🔍 CSV Processing Debug:', {
                totalRowsInCSV: allRows.length,
                successfullyCreated: registrosProcesados.length,
                skipped: registrosNoProcesados.length,
                totalProcessed: totalRecords,
                lastLineNumber: lineNumber - 1
              });

              // Extraer solo los IDs de equipos creados para fácil referencia
              const createdEquipmentIds = registrosProcesados
                .map(item => item.created_equipment_id)
                .filter(id => id); // Filtrar nulls/undefined por si acaso

              const response = {
                success: true,
                summary: {
                  farmId,
                  farmName: farm.name,
                  totalRecords,
                  successfullyCreated: registrosProcesados.length,
                  skipped: registrosNoProcesados.length,
                  createdEquipmentIds // Array de UUIDs de equipos creados
                },
                processed: registrosProcesados, // Array simplificado con datos esenciales
                skipped: registrosNoProcesados,
                message: `Import completed: ${registrosProcesados.length} equipment(s) created successfully, ${registrosNoProcesados.length} skipped`
              };

              console.log('\n📊 Import Response Summary:', {
                farm: farm.name,
                created: registrosProcesados.length,
                skipped: registrosNoProcesados.length,
                equipment_ids: createdEquipmentIds
              });

              resolve(response);
            } catch (error) {
              console.error('Error processing CSV rows:', error);
              reject(error);
            }
          })
          .on('error', (error) => {
            console.error('Error reading CSV file:', error.message);

            reject(new AppError(
              'Failed to read CSV file',
              400,
              'CSV_READ_ERROR',
              { error: error.message }
            ));
          });
      });

    } catch (error) {
      console.error('Failed to import equipment from CSV:', error.message);
      throw error;
    }
  }
}

module.exports = EquipmentImportService;
