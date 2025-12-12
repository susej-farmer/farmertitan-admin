import { ref } from 'vue'
import { getBulkImportConfig, validateCSVHeaders, formatValidationError } from '@/config/bulkImportConfig'

export function useBulkImport(options = {}) {
  const {
    importType = null, // New: import type key (e.g., 'FARM_EQUIPMENT', 'MAINTENANCE_TEMPLATES')
    maxRows = 500,
    requiredColumns = [] // Fallback if importType not provided
  } = options

  const previewData = ref([])
  const previewHeaders = ref([])
  const totalRows = ref(0)
  const validationError = ref('')
  const validationWarnings = ref([])

  // Get configuration if importType is provided
  const config = importType ? getBulkImportConfig(importType) : null

  /**
   * Parse CSV line handling quotes and commas
   */
  const parseCSVLine = (line) => {
    const values = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    values.push(current.trim())
    return values
  }

  /**
   * Parse and preview CSV file
   */
  const parseAndPreview = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const text = e.target.result
          // Split by newline and filter empty lines (only whitespace)
          const allLines = text.split('\n')
          const lines = allLines.filter(line => line.trim().length > 0)

          if (lines.length < 2) {
            validationError.value = 'CSV file must have at least a header row and one data row'
            reject(new Error('Empty CSV'))
            return
          }

          // Parse header
          const headers = lines[0].split(',').map(h => h.trim())
          previewHeaders.value = headers

          // Validate headers using config or fallback to requiredColumns
          if (config) {
            // Use configuration-based validation
            const validation = validateCSVHeaders(headers, importType)

            if (!validation.valid) {
              validationError.value = formatValidationError(validation)
              reject(new Error('Invalid headers'))
              return
            }

            // Store warnings for display
            validationWarnings.value = validation.warnings || []
          } else if (requiredColumns.length > 0) {
            // Fallback to old validation method
            const missingColumns = requiredColumns.filter(col => !headers.includes(col))

            if (missingColumns.length > 0) {
              validationError.value = `Missing required columns: ${missingColumns.join(', ')}`
              reject(new Error('Missing columns'))
              return
            }
          }

          // Parse data rows (everything after header)
          const dataLines = lines.slice(1)
          totalRows.value = dataLines.length

          // Validate maximum rows using config or fallback to maxRows
          const maxRowsLimit = config ? config.maxRows : maxRows
          if (dataLines.length > maxRowsLimit) {
            validationError.value = `File contains ${dataLines.length} data rows. Maximum allowed is ${maxRowsLimit} rows (excluding header)`
            reject(new Error('Too many rows'))
            return
          }

          // Create preview (first 5 rows)
          const preview = dataLines.slice(0, 5).map(line => {
            const values = parseCSVLine(line)
            const row = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || ''
            })
            return row
          })

          previewData.value = preview
          validationError.value = ''
          resolve()
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }

      reader.readAsText(file)
    })
  }

  /**
   * Generate CSV content from data
   */
  const generateCSV = (headers, rows) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in CSV
        const escaped = String(cell).replace(/"/g, '""')
        return escaped.includes(',') ? `"${escaped}"` : escaped
      }).join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * Download CSV file
   */
  const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Reset state
   */
  const reset = () => {
    previewData.value = []
    previewHeaders.value = []
    totalRows.value = 0
    validationError.value = ''
    validationWarnings.value = []
  }

  return {
    previewData,
    previewHeaders,
    totalRows,
    validationError,
    validationWarnings,
    config, // Expose config for component use
    parseAndPreview,
    generateCSV,
    downloadCSV,
    reset
  }
}
