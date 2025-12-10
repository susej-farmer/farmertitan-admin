# Bulk Import Maintenance Templates Endpoint

## Overview

This document describes the bulk import endpoint for maintenance templates (default tasks), implemented on 2025-12-08. The endpoint allows mass creation of maintenance task templates from CSV files.

## Endpoint Details

**URL**: `POST /api/import/maintenance-templates`

**Authentication**: Required (verifyToken + requireAuth)

**Content-Type**: `multipart/form-data`

**Parameters**:
- `csvFile` (File, required): CSV file containing maintenance templates

## Architecture

The implementation follows the layered architecture pattern:

```
Route (import.js)
  ↓
Service (defaultTaskImportService.js)
  ↓
Client (defaultTaskClient.js)
  ↓
PostgreSQL Function (create_default_task)
```

### Layer Responsibilities

1. **Route Layer** (`src/routes/import.js`):
   - Handles HTTP request/response
   - File upload using multer
   - Authentication middleware
   - Temporary file cleanup

2. **Service Layer** (`src/services/defaultTaskImportService.js`):
   - CSV parsing using csv-parser library
   - Row-by-row validation
   - Batch processing logic
   - Result aggregation (successful/failed)

3. **Client Layer** (`src/clients/defaultTaskClient.js`):
   - Database communication via Supabase
   - Calls PostgreSQL RPC function `create_default_task()`
   - Returns structured JSONB response

## CSV Structure

### Required Columns

| Column | Type | Description | Validation |
|--------|------|-------------|------------|
| `_equipment_type` | UUID | Equipment type ID | Required, valid UUID v4 |
| `task_name` | text | Task name | Required, non-empty |
| `task_description` | text | Task description | Required, non-empty |
| `time_type` | text | Schedule type | Required, must be 'schedule:hours' or 'schedule:distance' |
| `time_interval` | numeric | Interval value | Required, must be numeric |

### Optional Columns

| Column | Type | Description | Validation |
|--------|------|-------------|------------|
| `_equipment_make` | UUID | Equipment make ID | Optional, valid UUID v4 if provided |
| `_equipment_model` | UUID | Equipment model ID | Optional, valid UUID v4 if provided |
| `_equipment_trim` | UUID | Equipment trim ID | Optional, valid UUID v4 if provided |
| `_equipment_year` | smallint | Equipment year | Optional, 1900-2100 if provided |
| `_part_type` | UUID | Part type ID | Optional, valid UUID v4 if provided |
| `_consumable_type` | UUID | Consumable type ID | Optional, valid UUID v4 if provided |

### CSV Example

```csv
_equipment_type,_equipment_make,_equipment_model,_equipment_trim,_equipment_year,_part_type,_consumable_type,task_name,task_description,time_type,time_interval
550e8400-e29b-41d4-a716-446655440000,,,,,,,Oil Change,Change engine oil,schedule:hours,250
550e8400-e29b-41d4-a716-446655440000,660e8400-e29b-41d4-a716-446655440001,,,,,,Tire Rotation,Rotate all tires,schedule:distance,10000
```

## Validation Rules

### Field-Level Validation

1. **UUID Fields**: Must match UUID v4 format (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`)
2. **time_type**: Only accepts 'schedule:hours' or 'schedule:distance'
3. **time_interval**: Must be a valid numeric value
4. **_equipment_year**: Must be integer between 1900-2100

### Business Logic Validation

The PostgreSQL function `create_default_task()` performs additional validation:
- Verifies referenced entities exist (equipment_type, make, model, etc.)
- Checks for duplicate task templates
- Validates time_interval is positive
- Ensures proper foreign key relationships

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 10,
      "successful": 8,
      "failed": 2
    },
    "successful": [
      {
        "row": 2,
        "task_name": "Oil Change",
        "data": {
          "equipment_id": "uuid",
          "task_id": "uuid",
          "task_series_id": "uuid",
          "time_id": "uuid"
        }
      }
    ],
    "failed": [
      {
        "row": 3,
        "task_name": "Tire Rotation",
        "error_code": "EQUIPMENT_TYPE_NOT_FOUND",
        "error_message": "Equipment type with ID '...' does not exist"
      }
    ]
  },
  "message": "Processed 10 rows: 8 successful, 2 failed"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "MISSING_FILE",
    "message": "CSV file is required"
  }
}
```

## Error Codes

### Validation Errors

- `MISSING_FILE`: No CSV file uploaded
- `EMPTY_CSV_FILE`: CSV contains no data rows
- `VALIDATION_ERROR`: Row validation failed (missing required fields, invalid format, etc.)
- `CSV_PARSE_ERROR`: Failed to parse CSV file

### Database Function Errors

- `EQUIPMENT_TYPE_NOT_FOUND`: Referenced equipment type doesn't exist
- `EQUIPMENT_MAKE_NOT_FOUND`: Referenced equipment make doesn't exist
- `EQUIPMENT_MODEL_NOT_FOUND`: Referenced equipment model doesn't exist
- `EQUIPMENT_TRIM_NOT_FOUND`: Referenced equipment trim doesn't exist
- `PART_TYPE_NOT_FOUND`: Referenced part type doesn't exist
- `CONSUMABLE_TYPE_NOT_FOUND`: Referenced consumable type doesn't exist
- `INVALID_TIME_TYPE`: time_type not recognized
- `INVALID_TIME_INTERVAL`: time_interval must be positive
- `DUPLICATE_TASK_TEMPLATE`: Task template already exists for this equipment configuration

## Implementation Details

### CSV Processing Strategy

The service processes CSV files row-by-row:

1. Parse entire CSV into memory using csv-parser
2. Validate each row independently
3. Call PostgreSQL function for each valid row
4. Accumulate results (successful/failed) without stopping on errors
5. Return complete results showing which rows succeeded and which failed

### Error Handling

Two types of errors are handled differently:

1. **Validation Errors** (service-level):
   - Caught during `validateAndNormalizeRow()`
   - Added to failed array with VALIDATION_ERROR code
   - Processing continues to next row

2. **Database Function Errors**:
   - PostgreSQL function returns JSONB with success=false
   - Added to failed array with specific error_code from function
   - Processing continues to next row

### File Management

- Uses multer for file uploads with 10MB size limit
- Temporary files stored in `uploads/temp/`
- Files cleaned up in finally block regardless of success/failure
- Only accepts .csv file extensions

### Database Migration

The endpoint requires the `get_maintenance_templates` function, added in migration `20251208210000_add_get_maintenance_templates.sql`. This function:

- Retrieves maintenance templates with pagination
- Supports filtering by type_id, make_id, model_id, year
- Supports sorting by task_count, created_at, type_name
- Returns aggregated task data with intervals
- Includes comprehensive validation and error handling

## Testing

### Manual Test with curl

```bash
curl -X POST http://localhost:3000/api/import/maintenance-templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "csvFile=@/path/to/templates.csv"
```

### Test Cases

1. **Valid CSV**: All rows valid, should return all successful
2. **Mixed Valid/Invalid**: Some rows fail validation, should return partial success
3. **Empty CSV**: Should return EMPTY_CSV_FILE error
4. **Missing File**: Should return MISSING_FILE error
5. **Invalid UUID**: Should fail validation for that row
6. **Invalid time_type**: Should fail validation
7. **Non-existent Equipment Type**: Function should return EQUIPMENT_TYPE_NOT_FOUND
8. **Duplicate Template**: Function should return DUPLICATE_TASK_TEMPLATE

## Key Design Decisions

1. **Batch Processing with Partial Success**: Instead of failing the entire import on first error, we process all rows and report successes/failures separately. This allows users to fix only the problematic rows.

2. **Row Number Tracking**: We track row numbers (i + 2, accounting for 0-index and header) to help users identify which CSV rows failed.

3. **Code Reuse**: Reused multer configuration, error handling middleware, and file cleanup patterns from the existing equipment import endpoint.

4. **Layered Architecture**: Maintained separation of concerns with distinct Client, Service, and Route layers.

5. **Structured Error Responses**: Both validation errors and database function errors return consistent error_code and error_message fields for easy debugging.

## Related Files

- `backend/src/routes/import.js` - Route definition
- `backend/src/services/defaultTaskImportService.js` - Business logic
- `backend/src/clients/defaultTaskClient.js` - Database client
- `supabase/migrations/20251208210000_add_get_maintenance_templates.sql` - Migration
- `frontend/public/templates/maintenance_template.csv` - CSV template for users

## Future Improvements

1. **Async Processing**: For very large CSV files (1000+ rows), consider queue-based processing with job status tracking
2. **Validation Preview**: Add endpoint to validate CSV without creating records
3. **Batch Database Calls**: Instead of calling create_default_task() per row, create a batch function
4. **CSV Template Download**: Add endpoint to generate CSV template with proper headers
5. **Import History**: Track import operations with timestamp, user, results
