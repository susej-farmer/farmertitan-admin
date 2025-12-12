# Authentication Changes Summary

## Overview
Added Bearer token authentication to all API endpoints that were previously unprotected.

## Changes Made

### 1. `/api/catalogs` Routes (src/routes/catalogs.js)
**Status:** ✅ All routes now require authentication

Protected endpoints:
- **Equipment Types:**
  - `GET /equipment-types` - List all equipment types
  - `GET /equipment-types/dropdown` - Get dropdown list
  - `GET /equipment-types/:id` - Get specific type
  - `GET /equipment-types/statistics` - Get statistics
  - `POST /equipment-types` - Create new type
  - `PUT /equipment-types/:id` - Update type
  - `DELETE /equipment-types/:id` - Delete type

- **Equipment Makes:**
  - `GET /equipment-makes` - List all makes
  - `GET /equipment-makes/dropdown` - Get dropdown list
  - `GET /equipment-makes/dropdown-with-models` - Get with models
  - `GET /equipment-makes/:id` - Get specific make
  - `GET /equipment-makes/:id/models` - Get models for make
  - `POST /equipment-makes` - Create new make
  - `PUT /equipment-makes/:id` - Update make
  - `DELETE /equipment-makes/:id` - Delete make

- **Equipment Models:**
  - `GET /equipment-models` - List all models
  - `GET /equipment-models/by-make/:makeId` - Get by make
  - `GET /equipment-models/:id` - Get specific model
  - `POST /equipment-models` - Create new model
  - `PUT /equipment-models/:id` - Update model
  - `DELETE /equipment-models/:id` - Delete model

- **Equipment Trims:**
  - `GET /equipment-trims` - List all trims
  - `GET /equipment-trims/dropdown` - Get dropdown list
  - `GET /equipment-trims/by-make-model/:makeId/:modelId` - Get by make/model
  - `GET /equipment-trims/:id` - Get specific trim
  - `POST /equipment-trims` - Create new trim
  - `PUT /equipment-trims/:id` - Update trim
  - `DELETE /equipment-trims/:id` - Delete trim

- **Equipment Catalog:**
  - `GET /equipment-catalog` - List catalog
  - `GET /equipment-catalog/:id` - Get specific entry
  - `GET /equipment-models/:makeId/:modelId/trims` - Get trims for model
  - `POST /equipment-catalog` - Create catalog entry
  - `PUT /equipment-catalog/:id` - Update catalog entry
  - `DELETE /equipment-catalog/:id` - Delete catalog entry

- **Part Types:**
  - `GET /part-types` - List all part types
  - `GET /part-types/dropdown` - Get dropdown list
  - `GET /part-types/:id` - Get specific part type
  - `POST /part-types` - Create new part type
  - `PUT /part-types/:id` - Update part type
  - `DELETE /part-types/:id` - Delete part type

- **Consumable Types:**
  - `GET /consumable-types` - List all consumable types
  - `GET /consumable-types/dropdown` - Get dropdown list
  - `GET /consumable-types/:id` - Get specific consumable type
  - `POST /consumable-types` - Create new consumable type
  - `PUT /consumable-types/:id` - Update consumable type
  - `DELETE /consumable-types/:id` - Delete consumable type

**Changes:**
- Removed `optionalAuth` middleware
- Added `verifyToken` and `requireAuth` to all routes
- Updated user context to use `req.user.id` instead of `req.user?.id || null`

### 2. `/api/maintenance` Routes (src/routes/maintenance.js)
**Status:** ✅ All routes now require authentication

Protected endpoints:
- `GET /templates` - List all maintenance templates
- `GET /templates/:id` - Get specific template
- `POST /templates` - Create new template
- `DELETE /templates/:id` - Delete template
- `POST /templates/apply/:equipmentId` - Apply templates to equipment

**Changes:**
- Added `verifyToken` and `requireAuth` to all routes

### 3. `/api/maintenance-system` Routes (src/routes/maintenanceSystem.js)
**Status:** ✅ All routes now require authentication

Protected endpoints:
- `GET /equipment-templates` - Get equipment with templates
- `GET /equipment-tasks/:equipmentId` - Get tasks for equipment
- `GET /equipment-type-tasks/:equipmentTypeId` - Get tasks for equipment type
- `GET /equipment` - List all equipment with maintenance status
- `GET /equipment/:id` - Get specific equipment
- `GET /equipment/:id/maintenance` - Get maintenance templates for equipment
- `GET /equipment-stats` - Get equipment statistics
- `POST /equipment` - Create physical equipment
- `PUT /equipment/:id` - Update physical equipment
- `DELETE /equipment/:id` - Delete physical equipment
- `PUT /validate-equipment-update/:taskSeriesId` - Validate and update equipment
- `POST /equipment-with-maintenance` - Create equipment with maintenance
- `POST /maintenance-template` - Create maintenance template
- `DELETE /maintenance-template/:id` - Delete maintenance template
- `GET /time-types` - Get available time types
- `PUT /task/:taskId/schedule/:scheduleId` - Update maintenance task

**Changes:**
- Added `verifyToken` and `requireAuth` to all routes

## Endpoints That Remain Public

The following endpoints remain public as intended:
- `POST /api/auth/login` - User login (must remain public)
- `POST /api/auth/refresh` - Token refresh (must remain public)
- `POST /api/auth/logout` - User logout (public for convenience)
- `GET /health` - Health check endpoint
- `GET /api-docs` - API documentation

## Already Protected Endpoints

These endpoints already had authentication:
- ✅ `/api/auth/me` - Get current user profile
- ✅ `/api/auth/profile` - Update user profile
- ✅ `/api/auth/change-password` - Change password
- ✅ `/api/farms/*` - All farm routes
- ✅ `/api/reports/*` - All report routes
- ✅ `/api/qr-codes/*` - All QR code routes
- ✅ `/api/import/*` - All import routes

## Authentication Flow

All protected endpoints now require:

1. **Authorization Header:**
   ```
   Authorization: Bearer <JWT_TOKEN>
   ```

2. **Valid JWT Token:**
   - Token must be obtained from `/api/auth/login`
   - Token is verified using Supabase authentication
   - User information is attached to `req.user`

3. **Error Responses:**
   - `401 Unauthorized` - Missing or invalid token
   - `403 Forbidden` - Insufficient permissions

## Testing Requirements

After deployment, test the following:

1. **Public endpoints** - Should work without token:
   - `POST /api/auth/login`
   - `GET /health`

2. **Protected endpoints** - Should return 401 without token:
   - Try any catalog endpoint without Authorization header
   - Verify error message: "Authorization token required"

3. **With valid token** - Should work normally:
   - Login to get token
   - Use token in Authorization header
   - All endpoints should work as before

## Migration Notes

- Frontend applications must now include the Bearer token in all requests to the modified endpoints
- Any scripts or tools accessing these endpoints must be updated to include authentication
- The user context in POST requests now uses `req.user.id` directly instead of optional chaining

## Security Benefits

1. **Prevents unauthorized access** to sensitive catalog and maintenance data
2. **Tracks user actions** through user context in create/update operations
3. **Consistent security model** across all API endpoints
4. **Audit trail support** through user ID tracking in all operations
