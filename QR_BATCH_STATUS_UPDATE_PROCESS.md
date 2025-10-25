# QR Production Batch Status Update Process

## Overview
Este documento define el proceso completo para actualizar el estado de los lotes de producción de códigos QR y las acciones que se deben tomar en cada cambio de estado.

## Enum Actualizado

### production_batch_status
```
ordered, printing, completed, received, cancelled, partial
```

**Cambio importante**: Se cambió `delivered` por `received` para mayor claridad semántica.

## Flujo de Estados

### Flujo Principal:
```
ordered → printing → received → partial → completed
    ↓         ↓         ↓         ↓         ↓
cancelled cancelled cancelled cancelled cancelled
```

### Significado de Estados:

1. **`ordered`** - Batch creado, listo para enviar a imprenta
2. **`printing`** - Enviado a imprenta (estado informativo)
3. **`received`** - Recibimos los QR codes impresos del proveedor
4. **`partial`** - Algunos QRs asignados a granjas, otros disponibles
5. **`completed`** - Todos los QRs asignados a granjas
6. **`cancelled`** - Batch cancelado en cualquier momento

## Acciones por Estado

### Estado `ordered`:
**Acciones Disponibles:**
- ✅ **Mark as Printing** → `printing`
- ✅ **Cancel Batch** → `cancelled`

**Información requerida:**
- **Mark as Printing**: Solo confirmación
- **Cancel**: Razón de cancelación (opcional)

### Estado `printing`:
**Acciones Disponibles:**
- ✅ **Mark as Received** → `received`
- ✅ **Cancel Batch** → `cancelled`

**Información requerida:**
- **Mark as Received**: 
  - Cantidad de QRs defectuosos (opcional, default: 0)
  - Notas de recepción (opcional)
- **Cancel**: Razón de cancelación

### Estado `received`:
**Acciones Disponibles:**
- ✅ **Mark as Partial** → `partial` (cuando se asignan algunos QRs)
- ✅ **Mark as Completed** → `completed` (cuando se asignan todos)
- ✅ **Cancel Batch** → `cancelled`

**Información requerida:**
- Estas transiciones se hacen automáticamente cuando se crean delivery_batches
- **Cancel**: Razón de cancelación

### Estado `partial`:
**Acciones Disponibles:**
- ✅ **Mark as Completed** → `completed` (cuando se asignan QRs restantes)
- ✅ **Cancel Batch** → `cancelled`

### Estados Finales:
- **`completed`**: No hay acciones disponibles
- **`cancelled`**: No hay acciones disponibles

## Cambios en QR Codes por Transición

### `ordered` → `printing`:
- **QR codes**: Sin cambios (siguen en `generated`)

### `printing` → `received`:
- **QR codes válidos**: `generated` → `printed`
- **QR codes defectuosos**: `generated` → `defective`
- **Actualizar**: `defective_count` en el batch

### `received` → `partial`:
- **QR codes**: Los asignados cambian de `printed` → `allocated`
- **Automático**: Cuando se crea un delivery_batch

### `partial` → `completed`:
- **QR codes**: Los QRs restantes se asignan y cambian a `allocated`
- **Automático**: Cuando todos los QRs están asignados

### Cualquier estado → `cancelled`:
- **QR codes**: Todos cambian a `retired`
- **Cleanup**: Limpiar allocations pendientes

## Frontend Implementation

### Ubicación en ProductionBatches.vue

#### Columna Actions - Dropdown Menu:
```vue
<template>
  <div class="relative">
    <!-- Dropdown trigger -->
    <button @click="toggleDropdown(batch.id)" class="actions-btn">
      <svg>...</svg> <!-- 3 dots icon -->
    </button>
    
    <!-- Dropdown menu -->
    <div v-if="activeDropdown === batch.id" class="dropdown-menu">
      
      <!-- Status update options based on current status -->
      <template v-if="batch.status === 'ordered'">
        <button @click="updateStatus(batch, 'printing')" class="dropdown-item">
          🖨️ Mark as Printing
        </button>
        <button @click="cancelBatch(batch)" class="dropdown-item text-red-600">
          ❌ Cancel Batch
        </button>
      </template>
      
      <template v-if="batch.status === 'printing'">
        <button @click="markAsReceived(batch)" class="dropdown-item">
          📦 Mark as Received
        </button>
        <button @click="cancelBatch(batch)" class="dropdown-item text-red-600">
          ❌ Cancel Batch
        </button>
      </template>
      
      <template v-if="batch.status === 'received'">
        <button @click="viewAssignments(batch)" class="dropdown-item">
          👁️ View Assignments
        </button>
        <button @click="cancelBatch(batch)" class="dropdown-item text-red-600">
          ❌ Cancel Batch
        </button>
      </template>
      
      <template v-if="batch.status === 'partial'">
        <button @click="viewAssignments(batch)" class="dropdown-item">
          👁️ View Assignments
        </button>
        <button @click="cancelBatch(batch)" class="dropdown-item text-red-600">
          ❌ Cancel Batch
        </button>
      </template>
      
      <!-- Common actions for all statuses -->
      <hr class="dropdown-divider" />
      <button @click="viewBatchDetails(batch)" class="dropdown-item">
        📋 View Details
      </button>
    </div>
  </div>
</template>
```

#### Modales Específicos:

##### 1. Modal: Mark as Received
```vue
<template>
  <div class="modal">
    <h3>Mark Batch as Received</h3>
    <p>Batch: {{ batch.batch_code }} ({{ batch.quantity }} QR codes)</p>
    
    <div class="form-group">
      <label>Defective QR Codes</label>
      <input 
        v-model.number="receivedForm.defective_count" 
        type="number" 
        min="0" 
        :max="batch.quantity"
        placeholder="0"
      />
      <small>Number of QR codes that came out defective</small>
    </div>
    
    <div class="form-group">
      <label>Reception Notes</label>
      <textarea 
        v-model="receivedForm.notes" 
        placeholder="Any notes about the received batch..."
      ></textarea>
    </div>
    
    <div class="summary">
      <p><strong>Valid QR codes:</strong> {{ batch.quantity - receivedForm.defective_count }}</p>
      <p><strong>Defective QR codes:</strong> {{ receivedForm.defective_count }}</p>
    </div>
    
    <div class="modal-actions">
      <button @click="confirmReceived" class="btn btn-green">Confirm Reception</button>
      <button @click="closeModal" class="btn btn-gray">Cancel</button>
    </div>
  </div>
</template>
```

##### 2. Modal: Cancel Batch
```vue
<template>
  <div class="modal">
    <h3>Cancel Production Batch</h3>
    <p class="text-red-600">
      ⚠️ This action will cancel batch {{ batch.batch_code }} and retire all associated QR codes.
    </p>
    
    <div class="form-group">
      <label>Cancellation Reason</label>
      <textarea 
        v-model="cancelForm.reason" 
        placeholder="Reason for cancelling this batch..."
        required
      ></textarea>
    </div>
    
    <div class="modal-actions">
      <button @click="confirmCancel" class="btn btn-red">Cancel Batch</button>
      <button @click="closeModal" class="btn btn-gray">Keep Batch</button>
    </div>
  </div>
</template>
```

### JavaScript Methods:

```javascript
// En ProductionBatches.vue
const methods = {
  async updateStatus(batch, newStatus) {
    try {
      const result = await qrApi.updateBatchStatus(batch.id, newStatus);
      if (result.success) {
        // Refresh batch list
        await loadBatches();
        showSuccessMessage(`Batch ${batch.batch_code} updated to ${newStatus}`);
      }
    } catch (error) {
      showErrorMessage(error.message);
    }
  },
  
  async markAsReceived(batch) {
    // Show modal for defective count
    this.selectedBatch = batch;
    this.showReceivedModal = true;
  },
  
  async confirmReceived() {
    try {
      const result = await qrApi.markBatchAsReceived(
        this.selectedBatch.id, 
        this.receivedForm
      );
      
      if (result.success) {
        this.showReceivedModal = false;
        await loadBatches();
        showSuccessMessage(
          `Batch received: ${result.valid_qrs} valid, ${result.defective_qrs} defective`
        );
      }
    } catch (error) {
      showErrorMessage(error.message);
    }
  },
  
  async cancelBatch(batch) {
    this.selectedBatch = batch;
    this.showCancelModal = true;
  },
  
  async confirmCancel() {
    try {
      const result = await qrApi.cancelBatch(
        this.selectedBatch.id,
        this.cancelForm.reason
      );
      
      if (result.success) {
        this.showCancelModal = false;
        await loadBatches();
        showSuccessMessage(`Batch ${this.selectedBatch.batch_code} cancelled`);
      }
    } catch (error) {
      showErrorMessage(error.message);
    }
  }
};
```

## Backend Requirements

### Buscar y Actualizar Enums Existentes:

**⚠️ IMPORTANTE**: Buscar en el código backend actual estas referencias y actualizarlas:

1. **Archivos a revisar**:
   - `backend/src/clients/productionBatchClient.js`
   - `backend/src/services/qrCodeService.js` 
   - `backend/src/routes/qrCodes.js`
   - `backend/create-qr-tables.sql`

2. **Buscar y reemplazar**:
   ```javascript
   // BUSCAR estas validaciones:
   const validStatuses = ['ordered', 'printing', 'shipped', 'delivered', 'cancelled'];
   
   // REEMPLAZAR por:
   const validStatuses = ['ordered', 'printing', 'completed', 'received', 'cancelled', 'partial'];
   ```

### Nuevas Funciones RPC Necesarias:

#### 1. Función: Update Batch Status Simple
```sql
CREATE OR REPLACE FUNCTION update_batch_status(
  p_batch_id UUID,
  p_new_status production_batch_status,
  p_user_id UUID,
  p_notes TEXT DEFAULT ''
) RETURNS JSON AS $$
-- Actualización simple de status sin cambios en QRs
$$;
```

#### 2. Función: Mark Batch as Received
```sql
CREATE OR REPLACE FUNCTION mark_batch_as_received(
  p_batch_id UUID,
  p_defective_count INTEGER DEFAULT 0,
  p_user_id UUID,
  p_notes TEXT DEFAULT ''
) RETURNS JSON AS $$
-- Cambiar status a 'received' y actualizar QRs:
-- - QRs válidos: generated → printed
-- - QRs defectuosos: generated → defective
$$;
```

#### 3. Función: Cancel Batch
```sql
CREATE OR REPLACE FUNCTION cancel_batch(
  p_batch_id UUID,
  p_reason TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
-- Cambiar status a 'cancelled' y QRs a 'retired'
$$;
```

## API Endpoints Necesarios:

```javascript
// En qrApi.js
export const qrApi = {
  // Status updates
  async updateBatchStatus(batchId, newStatus, notes = '') {
    const response = await api.put(`/qr-codes/batches/${batchId}/status`, {
      status: newStatus,
      notes
    });
    return response.data;
  },
  
  async markBatchAsReceived(batchId, data) {
    const response = await api.post(`/qr-codes/batches/${batchId}/received`, {
      defective_count: data.defective_count || 0,
      notes: data.notes || ''
    });
    return response.data;
  },
  
  async cancelBatch(batchId, reason) {
    const response = await api.post(`/qr-codes/batches/${batchId}/cancel`, {
      reason
    });
    return response.data;
  }
};
```

## Next Steps

1. **Backend**: Crear las funciones RPC documentadas
2. **Backend**: Actualizar enums existentes 
3. **Frontend**: Implementar dropdown de acciones
4. **Frontend**: Crear modales específicos
5. **Testing**: Probar cada transición de estado

Esta documentación proporciona la estructura completa para implementar el sistema de actualización de estados de production batches.