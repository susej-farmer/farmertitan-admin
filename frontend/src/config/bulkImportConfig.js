/**
 * Bulk Import Configuration
 * Defines expected CSV structure for different bulk import types
 */

export const BULK_IMPORT_CONFIGS = {
  // Farm Equipment Bulk Import
  FARM_EQUIPMENT: {
    name: 'Farm Equipment',
    templatePath: '/templates/equipment_template.csv',
    templateFileName: 'equipment_template.csv',
    maxRows: 500,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    // Columns in exact order they must appear
    columns: [
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
    ],
    requiredColumns: [
      'equipment_name',
      'equipment_type_id',
      'make_id',
      'equipment_model_id',
      'serial_number'
    ],
    validateOrder: true, // Must be in exact order
    columnDescriptions: {
      equipment_name: 'Equipment name',
      equipment_type_id: 'Equipment type ID (UUID)',
      make_id: 'Make ID (UUID)',
      equipment_model_id: 'Model ID (UUID)',
      serial_number: 'Serial number',
      license_number: 'License/plate number',
      equipment_year: 'Equipment year',
      year_purchased: 'Year purchased',
      lease_owned: 'Lease/Owned (true/false)',
      warranty_time: 'Warranty time',
      warranty_details: 'Warranty details'
    }
  },

  // Maintenance Templates Bulk Import
  MAINTENANCE_TEMPLATES: {
    name: 'Maintenance Templates',
    templatePath: '/templates/maintenance_template.csv',
    templateFileName: 'maintenance_template.csv',
    maxRows: 500,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    // Columns in exact order they must appear
    columns: [
      '_equipment_type',
      '_equipment_make',
      '_equipment_model',
      '_equipment_trim',
      '_equipment_year',
      '_part_type',
      '_consumable_type',
      'task_name',
      'task_description',
      'time_type',
      'time_interval'
    ],
    requiredColumns: [
      '_equipment_type',
      '_equipment_make',
      '_equipment_model',
      '_equipment_trim',
      '_equipment_year',
      '_part_type',
      '_consumable_type',
      'task_name',
      'task_description',
      'time_type',
      'time_interval'
    ],
    validateOrder: true, // Must be in exact order
    columnDescriptions: {
      _equipment_type: 'Equipment type ID (UUID)',
      _equipment_make: 'Equipment make ID (UUID)',
      _equipment_model: 'Equipment model ID (UUID)',
      _equipment_year: 'Equipment year',
      _equipment_trim: 'Equipment trim ID (UUID)',
      _part_type: 'Part type ID (UUID)',
      _consumable_type: 'Consumable type ID (UUID)',
      task_name: 'Task name',
      task_description: 'Task description',
      time_type: 'Time interval type (hours, months, years)',
      time_interval: 'Time interval value'
    }
  }
}

/**
 * Get bulk import configuration by type
 * @param {string} type - Import type key
 * @returns {object} Configuration object
 */
export function getBulkImportConfig(type) {
  const config = BULK_IMPORT_CONFIGS[type]
  if (!config) {
    throw new Error(`Unknown bulk import type: ${type}`)
  }
  return config
}

/**
 * Validate CSV headers against expected configuration
 * @param {Array<string>} headers - CSV headers from file
 * @param {string} type - Import type key
 * @returns {object} Validation result { valid: boolean, missingColumns: [], extraColumns: [], orderErrors: [] }
 */
export function validateCSVHeaders(headers, type) {
  const config = getBulkImportConfig(type)
  const normalizedHeaders = headers.map(h => h.trim())

  const errors = []
  const warnings = []

  // Validate column count
  if (config.validateOrder && normalizedHeaders.length !== config.columns.length) {
    errors.push(`Expected ${config.columns.length} columns, but found ${normalizedHeaders.length}`)
  }

  // Check for missing required columns
  const missingColumns = config.requiredColumns.filter(
    col => !normalizedHeaders.includes(col)
  )

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`)
  }

  // Validate column order if required
  if (config.validateOrder) {
    const orderErrors = []

    for (let i = 0; i < config.columns.length; i++) {
      const expected = config.columns[i]
      const actual = normalizedHeaders[i]

      if (expected !== actual) {
        orderErrors.push({
          position: i + 1,
          expected,
          actual
        })
      }
    }

    if (orderErrors.length > 0) {
      errors.push(`Column order is incorrect. Expected order: ${config.columns.join(', ')}`)

      // Show first few mismatches for clarity
      const details = orderErrors.slice(0, 3).map(err =>
        `Position ${err.position}: expected "${err.expected}", found "${err.actual}"`
      ).join('; ')

      if (orderErrors.length > 3) {
        errors.push(`${details}... and ${orderErrors.length - 3} more`)
      } else {
        errors.push(details)
      }
    }
  } else {
    // If order is not strict, check for extra columns
    const allExpectedColumns = config.columns
    const extraColumns = normalizedHeaders.filter(
      header => header && !allExpectedColumns.includes(header)
    )

    if (extraColumns.length > 0) {
      warnings.push(`Unknown columns will be ignored: ${extraColumns.join(', ')}`)
    }
  }

  return {
    valid: errors.length === 0,
    missingColumns,
    errors,
    warnings
  }
}

/**
 * Format validation errors for display
 * @param {object} validation - Validation result from validateCSVHeaders
 * @returns {string} Formatted error message
 */
export function formatValidationError(validation) {
  if (validation.valid) {
    return null
  }

  // Join all errors with line breaks
  return validation.errors.join('\n')
}
