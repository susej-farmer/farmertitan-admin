const fs = require('fs');
const csv = require('csv-parser');
const { AppError } = require('../middleware/errorHandler');
const DefaultTaskClient = require('../clients/defaultTaskClient');

class DefaultTaskImportService {
  /**
   * Import default tasks from CSV file
   * @param {string} csvFilePath - Path to CSV file
   * @returns {Promise<Object>} Import results with success and failed records
   */
  static async importDefaultTasksFromCSV(csvFilePath) {
    try {
      // Read and parse CSV
      const rows = await this.parseCSV(csvFilePath);

      if (rows.length === 0) {
        throw new AppError(
          'CSV file is empty or contains no valid data rows',
          400,
          'EMPTY_CSV_FILE'
        );
      }

      // Process each row
      const results = {
        total: rows.length,
        successful: [],
        failed: []
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // +2 because row 1 is header and array is 0-indexed

        try {
          // Validate and normalize row data
          const taskData = this.validateAndNormalizeRow(row, rowNumber);

          // Call the database function to create the task
          const result = await DefaultTaskClient.create(taskData);

          // Check if the function returned success
          if (result.success) {
            results.successful.push({
              row: rowNumber,
              task_name: taskData.task_name,
              data: result.data
            });
          } else {
            // Function returned an error in the response
            results.failed.push({
              row: rowNumber,
              task_name: taskData.task_name || 'N/A',
              error_code: result.error_code,
              error_message: result.error_message
            });
          }
        } catch (error) {
          // Validation or unexpected error
          results.failed.push({
            row: rowNumber,
            task_name: row.task_name || 'N/A',
            error_code: error.code || 'VALIDATION_ERROR',
            error_message: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error importing default tasks from CSV:', error);
      throw error;
    }
  }

  /**
   * Parse CSV file and return array of row objects
   * @param {string} csvFilePath - Path to CSV file
   * @returns {Promise<Array>} Array of row objects
   */
  static parseCSV(csvFilePath) {
    return new Promise((resolve, reject) => {
      const rows = [];
      const stream = fs.createReadStream(csvFilePath)
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim(),
          skipEmptyLines: true,
          trim: true
        }));

      stream.on('data', (row) => {
        rows.push(row);
      });

      stream.on('end', () => {
        resolve(rows);
      });

      stream.on('error', (error) => {
        reject(new AppError(
          `Failed to parse CSV file: ${error.message}`,
          400,
          'CSV_PARSE_ERROR'
        ));
      });
    });
  }

  /**
   * Validate and normalize a CSV row into task data
   * @param {Object} row - CSV row object
   * @param {number} rowNumber - Row number for error messages
   * @returns {Object} Normalized task data
   */
  static validateAndNormalizeRow(row, rowNumber) {
    const errors = [];

    // Required fields validation
    if (!row._equipment_type || row._equipment_type.trim() === '') {
      errors.push('_equipment_type is required');
    }

    if (!row.task_name || row.task_name.trim() === '') {
      errors.push('task_name is required');
    }

    if (!row.task_description || row.task_description.trim() === '') {
      errors.push('task_description is required');
    }

    if (!row.time_type || row.time_type.trim() === '') {
      errors.push('time_type is required');
    }

    if (!row.time_interval || row.time_interval.trim() === '') {
      errors.push('time_interval is required');
    }

    // time_type validation
    if (row.time_type && !['schedule:hours', 'schedule:distance'].includes(row.time_type.trim())) {
      errors.push('time_type must be either "schedule:hours" or "schedule:distance"');
    }

    // time_interval validation (must be numeric)
    if (row.time_interval && isNaN(row.time_interval.trim())) {
      errors.push('time_interval must be a valid numeric value');
    }

    // UUID validation helper
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validateUUID = (value, fieldName) => {
      if (value && value.trim() !== '' && !uuidRegex.test(value.trim())) {
        errors.push(`${fieldName} must be a valid UUID`);
        return false;
      }
      return true;
    };

    // Validate UUIDs
    validateUUID(row._equipment_type, '_equipment_type');
    validateUUID(row._equipment_make, '_equipment_make');
    validateUUID(row._equipment_model, '_equipment_model');
    validateUUID(row._equipment_trim, '_equipment_trim');
    validateUUID(row._part_type, '_part_type');
    validateUUID(row._consumable_type, '_consumable_type');

    // equipment_year validation (must be integer if provided)
    if (row._equipment_year && row._equipment_year.trim() !== '') {
      const year = parseInt(row._equipment_year.trim());
      if (isNaN(year) || year < 1900 || year > 2100) {
        errors.push('_equipment_year must be a valid year between 1900 and 2100');
      }
    }

    // If there are errors, throw them
    if (errors.length > 0) {
      throw new AppError(
        `Row ${rowNumber}: ${errors.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Normalize data
    return {
      equipment_type_id: row._equipment_type.trim(),
      task_name: row.task_name.trim(),
      task_description: row.task_description.trim(),
      time_type: row.time_type.trim(),
      time_interval: row.time_interval.trim(),
      equipment_make_id: row._equipment_make && row._equipment_make.trim() !== '' ? row._equipment_make.trim() : null,
      equipment_model_id: row._equipment_model && row._equipment_model.trim() !== '' ? row._equipment_model.trim() : null,
      equipment_trim_id: row._equipment_trim && row._equipment_trim.trim() !== '' ? row._equipment_trim.trim() : null,
      equipment_year: row._equipment_year && row._equipment_year.trim() !== '' ? parseInt(row._equipment_year.trim()) : null,
      part_type_id: row._part_type && row._part_type.trim() !== '' ? row._part_type.trim() : null,
      consumable_type_id: row._consumable_type && row._consumable_type.trim() !== '' ? row._consumable_type.trim() : null
    };
  }
}

module.exports = DefaultTaskImportService;
