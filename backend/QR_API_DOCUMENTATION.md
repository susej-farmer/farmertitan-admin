# QR System API Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Error Handling](#error-handling)
5. [Status Codes](#status-codes)
6. [Parameter Conventions](#parameter-conventions)

---

## Architecture Overview

### Layer Architecture

```
┌──────────────────┐
│   Client App     │  (Mobile/Web)
└────────┬─────────┘
         │
    ┌────▼────┐
    │ API Gateway │  (Rate limiting, CORS, Auth validation)
    └────┬────┘
         │
┌────────▼──────────┐
│ Controller Layer  │  (Route handlers, input validation, HTTP logic)
└────────┬──────────┘
         │
┌────────▼──────────┐
│  Service Layer    │  (Business logic, parameter transformation)
└────────┬──────────┘
         │
┌────────▼──────────┐
│ Repository Layer  │  (Supabase RPC calls, data access)
└────────┬──────────┘
         │
┌────────▼──────────┐
│  Database Layer   │  (PostgreSQL Functions)
└───────────────────┘
```

### Responsibilities

**Controller Layer:**
- Validate request format (body, params, query)
- Extract authentication tokens
- Call service layer
- Transform responses to HTTP format

**Service Layer:**
- Business logic validation
- Transform camelCase → snake_case
- Handle business rules
- Error mapping

**Repository Layer:**
- Execute Supabase RPC calls
- Map database responses
- Handle connection errors

**Database Layer:**
- Execute PL/pgSQL functions
- Data validation and integrity
- Audit logging

---

## Authentication

All endpoints require authentication except `GET /api/v1/qr/bindings/:qrIdentifier`.

### Authentication Header
```http
Authorization: Bearer <JWT_TOKEN>
```

### Permission Levels
- **super_admin**: All operations
- **admin**: Farm-specific operations
- **user**: Read-only operations

---

## API Endpoints

### Base URL
```
https://api.farmertitan.com/api/v1/qr
```

---

## 1. Production Batches

### 1.1 Create Production Batch

Creates a new production batch with QR codes.

**Endpoint:**
```http
POST /api/v1/qr/production-batches
```

**Required Permission:** `super_admin`

**Request Body:**
```json
{
  "quantity": 100,
  "supplierId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "81c321af-696b-4375-b256-a7f1826cb5e0",
  "notes": "Q1 2024 batch"
}
```

**Parameters:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| quantity | integer | Yes | 1-1000 | Number of QR codes to generate |
| supplierId | string (UUID) | Yes | Valid UUID | Supplier ID |
| userId | string (UUID) | Yes | Valid UUID | User creating the batch |
| notes | string | No | Max 500 chars | Additional notes |

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "batch-uuid",
      "batchCode": "PRINT-2024-1234567890",
      "quantity": 100,
      "status": "ordered",
      "supplierId": "supplier-uuid",
      "createdBy": "user-uuid",
      "createdAt": "2024-01-01T10:00:00Z"
    },
    "qrCodesCreated": 100,
    "qrCodes": [
      {
        "id": "qr-uuid-1",
        "shortCode": "FT-ABC123",
        "printPosition": 1
      }
    ]
  },
  "message": "Production batch PRINT-2024-1234567890 created successfully with 100 QR codes"
}
```

**Error Responses:**

**400 Bad Request - Invalid Quantity:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUANTITY",
    "message": "Quantity must be between 1 and 1000, got: 1500"
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Only super_admin users can create production batches"
  }
}
```

**404 Not Found - Supplier:**
```json
{
  "success": false,
  "error": {
    "code": "SUPPLIER_NOT_FOUND",
    "message": "Supplier not found: supplier-uuid"
  }
}
```

---

### 1.2 Get Production Batch

Retrieves production batch details.

**Endpoint:**
```http
GET /api/v1/qr/production-batches/:batchId
```

**Required Permission:** `admin`, `super_admin`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| batchId | UUID | Production batch ID |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "batch-uuid",
    "batchCode": "PRINT-2024-1234567890",
    "quantity": 100,
    "status": "ordered",
    "supplierId": "supplier-uuid",
    "createdBy": "user-uuid",
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-01T10:00:00Z"
  }
}
```

---

### 1.3 Update Production Batch Status

Updates production batch status.

**Endpoint:**
```http
PATCH /api/v1/qr/production-batches/:batchId/status
```

**Required Permission:** `super_admin`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| batchId | UUID | Production batch ID |

**Request Body:**
```json
{
  "status": "printed",
  "userId": "user-uuid",
  "notes": "Batch printed and ready"
}
```

**Valid Status Transitions:**
- `ordered` → `printed`
- `ordered` → `cancelled`
- `printed` → `received`
- `printed` → `cancelled`
- `received` → `partial`
- `partial` → `completed`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "batch-uuid",
    "batchCode": "PRINT-2024-1234567890",
    "previousStatus": "ordered",
    "newStatus": "printed",
    "updatedAt": "2024-01-01T11:00:00Z"
  },
  "message": "Production batch status updated successfully"
}
```

---

## 2. Delivery Batches

### 2.1 Create Delivery Batch

Creates a new delivery batch for a farm.

**Endpoint:**
```http
POST /api/v1/qr/delivery-batches
```

**Required Permission:** `super_admin`

**Request Body:**
```json
{
  "farmId": "farm-uuid",
  "requestedQuantity": 100,
  "userId": "user-uuid",
  "metadata": {
    "priority": "high",
    "season": "spring"
  }
}
```

**Parameters:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| farmId | string (UUID) | Yes | Valid UUID | Farm requesting QRs |
| requestedQuantity | integer | Yes | > 0 | Number of QR codes requested |
| userId | string (UUID) | Yes | Valid UUID | User creating the batch |
| metadata | object | No | JSON object | Additional metadata |

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "deliveryBatch": {
      "id": "delivery-batch-uuid",
      "deliveryCode": "DEL-FARM001-001",
      "farmId": "farm-uuid",
      "requestedQuantity": 100,
      "allocatedQuantity": 0,
      "shippedQuantity": 0,
      "deliveredQuantity": 0,
      "status": "requested",
      "createdBy": "user-uuid",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    }
  },
  "message": "Delivery batch DEL-FARM001-001 created successfully for 100 QR codes"
}
```

**Error Responses:**

**400 Bad Request - Invalid Quantity:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUANTITY",
    "message": "Requested quantity must be greater than 0"
  }
}
```

**404 Not Found - Farm:**
```json
{
  "success": false,
  "error": {
    "code": "FARM_NOT_FOUND",
    "message": "Farm not found: farm-uuid"
  }
}
```

---

### 2.2 Allocate QRs to Delivery Batch

Allocates QR codes to a delivery batch.

**Endpoint:**
```http
POST /api/v1/qr/delivery-batches/:batchId/allocate
```

**Required Permission:** `super_admin`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| batchId | UUID | Delivery batch ID |

**Request Body:**
```json
{
  "quantityToAllocate": 50,
  "userId": "user-uuid"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| quantityToAllocate | integer | Yes | Number of QRs to allocate |
| userId | string (UUID) | Yes | User performing allocation |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "allocation": {
      "deliveryBatchId": "batch-uuid",
      "deliveryCode": "DEL-FARM001-001",
      "allocatedQuantity": 50,
      "totalAllocated": 50,
      "requestedQuantity": 100,
      "newStatus": "partial"
    },
    "qrAllocations": {
      "allocatedCount": 50,
      "productionBatchesUpdated": 2
    }
  },
  "message": "Successfully allocated 50 QR codes to delivery batch DEL-FARM001-001"
}
```

**Error Responses:**

**400 Bad Request - Exceeds Available:**
```json
{
  "success": false,
  "error": {
    "code": "EXCEEDS_AVAILABLE_QUANTITY",
    "message": "Cannot allocate 150 QRs. Only 50 remaining (requested: 200, already allocated: 150)"
  }
}
```

**409 Conflict - Invalid Status:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DELIVERY_BATCH_STATUS",
    "message": "Delivery batch must be in 'requested' or 'partial' status"
  }
}
```

**404 Not Found - No QRs Available:**
```json
{
  "success": false,
  "error": {
    "code": "NO_QRS_AVAILABLE",
    "message": "No QR codes available for allocation"
  }
}
```

---

### 2.3 Update Delivery Batch Status

Updates delivery batch status (ship, deliver, cancel).

**Endpoint:**
```http
PATCH /api/v1/qr/delivery-batches/:batchId/status
```

**Required Permission:** `super_admin`, `admin` (for delivered status)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| batchId | UUID | Delivery batch ID |

**Request Body:**
```json
{
  "newStatus": "shipped",
  "userId": "user-uuid",
  "notes": "Shipped via courier XYZ"
}
```

**Valid Status Values:**
- `shipped` - Batch has been shipped
- `delivered` - Batch has been received by farm
- `cancelled` - Batch has been cancelled

**Valid Status Transitions:**
- `allocated`/`partial` → `shipped`
- `shipped` → `delivered`
- Any status → `cancelled` (if no QRs bound)

**Success Response (200 OK) - Shipped:**
```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "batch-uuid",
      "deliveryCode": "DEL-FARM001-001",
      "previousStatus": "allocated",
      "newStatus": "shipped",
      "updatedAt": "2024-01-01T10:00:00Z",
      "shippedAt": "2024-01-01T10:00:00Z",
      "shippedBy": "user-uuid"
    },
    "qrUpdates": {
      "shippedCount": 100
    }
  },
  "message": "Delivery batch DEL-FARM001-001 status updated from allocated to shipped. 100 QR codes marked shipped."
}
```

**Success Response (200 OK) - Delivered:**
```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "batch-uuid",
      "deliveryCode": "DEL-FARM001-001",
      "previousStatus": "shipped",
      "newStatus": "delivered",
      "updatedAt": "2024-01-01T10:00:00Z",
      "deliveredAt": "2024-01-01T10:00:00Z",
      "confirmedBy": "user-uuid"
    },
    "qrUpdates": {
      "claimedCount": 100
    }
  },
  "message": "Delivery batch DEL-FARM001-001 status updated from shipped to delivered. 100 QR codes marked claimed."
}
```

**Success Response (200 OK) - Cancelled:**
```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "batch-uuid",
      "deliveryCode": "DEL-FARM001-001",
      "previousStatus": "allocated",
      "newStatus": "cancelled",
      "cancelledAt": "2024-01-01T10:00:00Z"
    },
    "qrUpdates": {
      "retiredCount": 100
    }
  },
  "message": "Delivery batch DEL-FARM001-001 cancelled. 100 QR codes marked retired."
}
```

**Error Responses:**

**400 Bad Request - Invalid Status:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_VALUE",
    "message": "Invalid status: invalid_status. Valid values are: shipped, delivered, cancelled"
  }
}
```

**409 Conflict - Invalid Transition:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot change from requested to shipped. Allowed transitions: allocated/partial → shipped"
  }
}
```

**409 Conflict - Bound QRs:**
```json
{
  "success": false,
  "error": {
    "code": "BATCH_HAS_BOUND_QRS",
    "message": "Cannot cancel delivery batch: 5 QR codes are already bound to equipment"
  }
}
```

---

### 2.4 Mark Batch as Received

Marks a shipped delivery batch as received/delivered by the farm.

**Endpoint:**
```http
POST /api/v1/qr/delivery-batches/:batchId/receive
```

**Required Permission:** `admin`, `super_admin`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| batchId | UUID | Delivery batch ID |

**Request Body:**
```json
{
  "userId": "user-uuid",
  "notes": "Received and verified"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "batch-uuid",
      "deliveryCode": "DEL-FARM001-001",
      "status": "delivered",
      "deliveredAt": "2024-01-01T12:00:00Z",
      "confirmedBy": "user-uuid"
    }
  },
  "message": "Delivery batch marked as received"
}
```

---

### 2.5 Get Delivery Batch

Retrieves delivery batch details.

**Endpoint:**
```http
GET /api/v1/qr/delivery-batches/:batchId
```

**Required Permission:** `admin`, `super_admin`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| batchId | UUID | Delivery batch ID |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "delivery-batch-uuid",
    "deliveryCode": "DEL-FARM001-001",
    "farmId": "farm-uuid",
    "requestedQuantity": 100,
    "allocatedQuantity": 100,
    "shippedQuantity": 100,
    "deliveredQuantity": 100,
    "status": "delivered",
    "createdBy": "user-uuid",
    "createdAt": "2024-01-01T10:00:00Z",
    "allocatedAt": "2024-01-01T10:30:00Z",
    "shippedAt": "2024-01-01T11:00:00Z",
    "deliveredAt": "2024-01-01T12:00:00Z"
  }
}
```

---

## 3. QR Bindings

### 3.1 Bind QR to Equipment

Creates a binding between a QR code and equipment.

**Endpoint:**
```http
POST /api/v1/qr/bindings
```

**Required Permission:** `admin`, `super_admin`

**Request Body:**
```json
{
  "equipmentId": "equipment-uuid",
  "qrIdentifier": "FT-84A878",
  "userId": "user-uuid"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| equipmentId | string (UUID) | Yes | Equipment ID to bind |
| qrIdentifier | string | Yes | QR UUID or short code (e.g., "FT-84A878") |
| userId | string (UUID) | Yes | User performing the binding |

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "farm": {
      "name": "Katie's Farm",
      "acres": 10000
    },
    "equipment": {
      "id": "equipment-uuid",
      "name": "John Deere Tractor",
      "type": "TRACTORS",
      "make": "John Deere",
      "model": "1023E"
    },
    "qr": {
      "id": "qr-uuid",
      "shortCode": "FT-84A878"
    }
  },
  "message": "QR code successfully bound to equipment"
}
```

**Error Responses:**

**400 Bad Request - Invalid Input:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "All parameters (equipmentId, qrIdentifier, userId) are required"
  }
}
```

**404 Not Found - Equipment:**
```json
{
  "success": false,
  "error": {
    "code": "EQUIPMENT_NOT_FOUND",
    "message": "Equipment not found or inactive"
  }
}
```

**404 Not Found - QR:**
```json
{
  "success": false,
  "error": {
    "code": "QR_NOT_FOUND",
    "message": "QR code not found"
  }
}
```

**409 Conflict - QR Not Available:**
```json
{
  "success": false,
  "error": {
    "code": "QR_NOT_AVAILABLE",
    "message": "QR code must be in claimed status to be bound"
  }
}
```

**409 Conflict - Already Bound:**
```json
{
  "success": false,
  "error": {
    "code": "QR_ALREADY_BOUND",
    "message": "QR code already bound to equipment"
  }
}
```

**409 Conflict - Farm Mismatch:**
```json
{
  "success": false,
  "error": {
    "code": "FARM_MISMATCH",
    "message": "Equipment farm does not match delivery batch farm"
  }
}
```

---

### 3.2 Get QR Binding

Retrieves binding information for a QR code (public endpoint for QR scanning).

**Endpoint:**
```http
GET /api/v1/qr/bindings/:qrIdentifier
```

**Required Permission:** None (Public)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| qrIdentifier | string | QR UUID or short code (e.g., "FT-84A878") |

**Success Response (200 OK) - Equipment Binding:**
```json
{
  "success": true,
  "data": {
    "farm": {
      "name": "Katie's Farm",
      "acres": 10000
    },
    "equipment": {
      "id": "equipment-uuid",
      "name": "John Deere Tractor",
      "type": "TRACTORS",
      "make": "John Deere",
      "model": "1023E"
    },
    "qr": {
      "id": "qr-uuid",
      "shortCode": "FT-84A878"
    }
  }
}
```

**Success Response (200 OK) - Other Binding:**
```json
{
  "success": true,
  "data": {
    "qrId": "qr-uuid",
    "qrShortCode": "FT-84A878",
    "bindableType": "location",
    "bindableId": "location-uuid"
  }
}
```

**Error Responses:**

**400 Bad Request - Empty Identifier:**
```json
{
  "success": false,
  "error": {
    "code": "EMPTY_IDENTIFIER",
    "message": "QR identifier cannot be empty"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "QR_NOT_FOUND",
    "message": "Invalid or unavailable QR code"
  }
}
```

---

### 3.3 Unbind QR

Removes binding from a QR code (sets binding as inactive).

**Endpoint:**
```http
DELETE /api/v1/qr/bindings/:qrIdentifier
```

**Required Permission:** `admin`, `super_admin`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| qrIdentifier | string | QR UUID or short code |

**Request Body:**
```json
{
  "userId": "user-uuid",
  "reason": "Equipment sold"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "QR code unbound successfully"
}
```

---

## 4. QR Availability

### 4.1 Check QR Availability

Checks if enough QR codes are available for allocation.

**Endpoint:**
```http
GET /api/v1/qr/availability?quantity=100
```

**Required Permission:** `admin`, `super_admin`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| quantity | integer | No | Check for specific quantity (default: all available) |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "available": true,
    "availableQuantity": 250,
    "requestedQuantity": 100,
    "productionBatches": [
      {
        "batchId": "batch-uuid-1",
        "batchCode": "PRINT-2024-001",
        "availableQrs": 150
      },
      {
        "batchId": "batch-uuid-2",
        "batchCode": "PRINT-2024-002",
        "availableQrs": 100
      }
    ]
  }
}
```

---

## Error Handling

### Standard Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Invalid request parameters |
| `INVALID_QUANTITY` | Quantity out of allowed range |
| `INVALID_STATUS_VALUE` | Invalid status value provided |
| `INVALID_STATUS_TRANSITION` | Status transition not allowed |
| `UNAUTHORIZED` | Missing or invalid authentication |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `FARM_NOT_FOUND` | Farm ID not found |
| `SUPPLIER_NOT_FOUND` | Supplier ID not found |
| `EQUIPMENT_NOT_FOUND` | Equipment ID not found |
| `QR_NOT_FOUND` | QR code not found |
| `QR_NOT_AVAILABLE` | QR code not in correct status |
| `QR_ALREADY_BOUND` | QR code already bound to equipment |
| `FARM_MISMATCH` | Farm IDs don't match |
| `BATCH_NOT_FOUND` | Batch ID not found |
| `BATCH_HAS_BOUND_QRS` | Cannot cancel - QRs are bound |
| `NO_QRS_AVAILABLE` | No QR codes available for allocation |
| `EXCEEDS_AVAILABLE_QUANTITY` | Requested more than available |

---

## Status Codes

| HTTP Status | Usage |
|-------------|-------|
| 200 OK | Successful GET, PATCH, DELETE |
| 201 Created | Successful POST (resource created) |
| 400 Bad Request | Invalid request parameters |
| 401 Unauthorized | Missing/invalid authentication |
| 403 Forbidden | Insufficient permissions |
| 404 Not Found | Resource not found |
| 409 Conflict | Business logic conflict (already exists, invalid state) |
| 500 Internal Server Error | Database or server errors |

---

## Parameter Conventions

### Naming Convention

**API Layer (Client → Server):** camelCase
```json
{
  "farmId": "uuid",
  "requestedQuantity": 100,
  "userId": "uuid"
}
```

**Database Layer (Internal):** snake_case
```sql
p_farm_id UUID,
p_requested_quantity INTEGER,
p_user_id UUID
```

### Parameter Transformation

The service layer transforms parameters between conventions:

```javascript
// API → Database
{
  farmId: 'uuid'           → p_farm_id: 'uuid'
  requestedQuantity: 100   → p_requested_quantity: 100
  userId: 'uuid'           → p_user_id: 'uuid'
  qrIdentifier: 'FT-001'   → qr_identifier: 'FT-001'
  equipmentId: 'uuid'      → equipment_id: 'uuid'
  supplierId: 'uuid'       → p_supplier_id: 'uuid'
  batchId: 'uuid'          → p_batch_id: 'uuid'
  newStatus: 'shipped'     → p_new_status: 'shipped'
}
```

### Response Transformation

Database responses are transformed from snake_case to camelCase:

```javascript
// Database → API
{
  delivery_code: 'DEL-001'     → deliveryCode: 'DEL-001'
  requested_quantity: 100      → requestedQuantity: 100
  allocated_quantity: 50       → allocatedQuantity: 50
  created_at: '2024-01-01'     → createdAt: '2024-01-01'
  updated_at: '2024-01-01'     → updatedAt: '2024-01-01'
}
```

---

## Request Examples

### Using cURL

**Create Delivery Batch:**
```bash
curl -X POST https://api.farmertitan.com/api/v1/qr/delivery-batches \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "farmId": "farm-uuid",
    "requestedQuantity": 100,
    "userId": "user-uuid"
  }'
```

**Bind QR to Equipment:**
```bash
curl -X POST https://api.farmertitan.com/api/v1/qr/bindings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipmentId": "equipment-uuid",
    "qrIdentifier": "FT-84A878",
    "userId": "user-uuid"
  }'
```

**Get QR Binding (Public):**
```bash
curl -X GET https://api.farmertitan.com/api/v1/qr/bindings/FT-84A878
```

### Using JavaScript/Fetch

```javascript
// Create Delivery Batch
const response = await fetch('https://api.farmertitan.com/api/v1/qr/delivery-batches', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    farmId: 'farm-uuid',
    requestedQuantity: 100,
    userId: 'user-uuid'
  })
});

const result = await response.json();
```

---

## Rate Limiting

- **Rate Limit:** 1000 requests per hour per API key
- **Headers:** 
  - `X-RateLimit-Limit`: Maximum requests per hour
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## Versioning

API version is included in the URL path: `/api/v1/`

Breaking changes will result in a new version: `/api/v2/`

---

## Support

For API support, contact: dev@farmertitan.com

---

**Last Updated:** 2024
**Version:** 1.0.0

