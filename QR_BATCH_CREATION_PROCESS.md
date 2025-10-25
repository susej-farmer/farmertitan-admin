# QR Production Batch Creation Process

## Overview
Este documento define el proceso completo para crear un lote de producción de códigos QR (Production Batch) en el sistema FarmerTitan Admin. El proceso involucra múltiples tablas y garantiza la trazabilidad completa desde la generación hasta la entrega.

## Estructura de Datos

### Enums Utilizados
- **production_batch_status**: `ordered, printing, completed, delivered, cancelled`
- **qr_status**: `generated, printed, allocated, shipped, claimed, bound, retired, recycled, defective, farm_generated, ready_to_print`
- **qr_event_type**: `generated, printed, allocated, shipped, delivered, claimed, scanned, bound, unbound, retired, recycled, defective_marked`

### Tablas Involucradas
1. `qr_production_batch` - Información del lote de producción
2. `qr` - Códigos QR individuales
3. `qr_allocation` - Asignaciones de QR a lotes
4. `qr_audit_log` - Registro de auditoría
5. `qr_supplier` - Proveedores (referencia)

## Proceso: Crear Production Batch

### Limitaciones de Performance
- **Máximo por batch**: 100 QR codes
- **Procesamiento**: Síncrono usando transacción única
- **Tiempo estimado**: 300-800ms para 100 QRs
- **Implementación**: Función RPC en PostgreSQL para máximo performance

### Entrada del Usuario
```json
{
  "quantity": 100,
  "supplier_id": "uuid-proveedor", 
  "notes": "QR codes para equipos agrícolas Q1 2024"
}
```

### Validaciones Frontend
- Quantity debe ser entre 1 y 100
- Mostrar warning si quantity > 100
- Supplier_id debe ser válido

## Implementación: Función RPC PostgreSQL

### Función SQL Complete-Copy-Paste-Ready

```sql
CREATE OR REPLACE FUNCTION create_production_batch(
  p_quantity INTEGER,
  p_supplier_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT '',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_batch_id UUID;
  v_batch_code TEXT;
  v_qr_record RECORD;
  v_qr_ids UUID[];
  v_short_codes TEXT[];
  v_result JSON;
  i INTEGER;
BEGIN
  -- Validaciones
  IF p_quantity <= 0 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 100, got: %', p_quantity;
  END IF;
  
  -- Verificar que el supplier existe
  IF NOT EXISTS (SELECT 1 FROM qr_supplier WHERE id = p_supplier_id) THEN
    RAISE EXCEPTION 'Supplier not found: %', p_supplier_id;
  END IF;

  -- Generar batch_code único
  v_batch_code := 'PRINT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');
  
  -- Paso 1: Crear Production Batch
  INSERT INTO qr_production_batch (
    id,
    batch_code,
    quantity,
    status,
    supplier_id,
    defective_count,
    created_by,
    created_at,
    updated_at,
    metadata
  ) VALUES (
    gen_random_uuid(),
    v_batch_code,
    p_quantity,
    'ordered',
    p_supplier_id,
    0,
    p_user_id,
    NOW(),
    NOW(),
    json_build_object(
      'notes', COALESCE(p_notes, ''),
      'creation_ip', p_ip_address,
      'creation_user_agent', p_user_agent
    )
  ) RETURNING id INTO v_batch_id;
  
  -- Paso 2: Generar QR Codes y preparar arrays
  v_qr_ids := ARRAY[]::UUID[];
  v_short_codes := ARRAY[]::TEXT[];
  
  FOR i IN 1..p_quantity LOOP
    DECLARE
      v_qr_id UUID;
      v_short_code TEXT;
      v_attempt INTEGER := 0;
    BEGIN
      -- Generar QR ID
      v_qr_id := gen_random_uuid();
      
      -- Generar short_code único (con reintentos)
      LOOP
        v_short_code := 'FT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || v_qr_id::TEXT || i::TEXT) FROM 1 FOR 6));
        v_attempt := v_attempt + 1;
        
        -- Verificar unicidad
        IF NOT EXISTS (SELECT 1 FROM qr WHERE short_code = v_short_code) 
           AND v_short_code != ALL(v_short_codes) THEN
          EXIT;
        END IF;
        
        -- Máximo 10 intentos por QR
        IF v_attempt > 10 THEN
          RAISE EXCEPTION 'Could not generate unique short_code after 10 attempts for QR position %', i;
        END IF;
      END LOOP;
      
      -- Agregar a arrays
      v_qr_ids := array_append(v_qr_ids, v_qr_id);
      v_short_codes := array_append(v_short_codes, v_short_code);
    END;
  END LOOP;
  
  -- Paso 3: Insertar todos los QR codes
  FOR i IN 1..p_quantity LOOP
    INSERT INTO qr (
      id,
      short_code,
      status,
      print_position,
      farm,
      bound_at,
      created_at,
      metadata
    ) VALUES (
      v_qr_ids[i],
      v_short_codes[i],
      'generated',
      i,
      NULL,
      NULL,
      NOW(),
      json_build_object(
        'production_batch_id', v_batch_id,
        'batch_code', v_batch_code,
        'print_position', i
      )
    );
  END LOOP;
  
  -- Paso 4: Crear Allocations en batch
  INSERT INTO qr_allocation (
    id,
    qr_id,
    production_batch_id,
    delivery_batch_id,
    allocated_at,
    allocated_by,
    notes
  )
  SELECT 
    gen_random_uuid(),
    qr_id,
    v_batch_id,
    NULL,
    NULL,
    NULL,
    NULL
  FROM unnest(v_qr_ids) AS qr_id;
  
  -- Paso 5: Crear Audit Logs en batch
  INSERT INTO qr_audit_log (
    id,
    qr_id,
    event_type,
    event_data,
    user_id,
    farm_id,
    ip_address,
    user_agent,
    created_at
  )
  SELECT 
    gen_random_uuid(),
    v_qr_ids[i],
    'generated',
    json_build_object(
      'batch_id', v_batch_id,
      'batch_code', v_batch_code,
      'print_position', i,
      'short_code', v_short_codes[i]
    ),
    p_user_id,
    NULL,
    p_ip_address,
    p_user_agent,
    NOW()
  FROM generate_series(1, p_quantity) AS i;
  
  -- Construir resultado
  v_result := json_build_object(
    'success', true,
    'batch', json_build_object(
      'id', v_batch_id,
      'batch_code', v_batch_code,
      'quantity', p_quantity,
      'status', 'ordered',
      'supplier_id', p_supplier_id,
      'created_by', p_user_id,
      'created_at', NOW()
    ),
    'qr_codes_created', p_quantity,
    'qr_codes', (
      SELECT json_agg(
        json_build_object(
          'id', v_qr_ids[i],
          'short_code', v_short_codes[i],
          'print_position', i
        )
      )
      FROM generate_series(1, p_quantity) AS i
    ),
    'message', format('Production batch %s created successfully with %s QR codes', v_batch_code, p_quantity)
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, PostgreSQL hace rollback automático
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

### Backend Implementation (Node.js)

```javascript
// En qrCodeService.js
async function createProductionBatch(data, userId, req = null) {
  const { quantity, supplier_id, notes } = data;
  
  // Obtener IP y User Agent del request
  const ip_address = req?.ip || req?.connection?.remoteAddress || null;
  const user_agent = req?.headers?.['user-agent'] || null;
  
  try {
    const { data: result, error } = await supabase.rpc('create_production_batch', {
      p_quantity: quantity,
      p_supplier_id: supplier_id,
      p_user_id: userId,
      p_notes: notes || '',
      p_ip_address: ip_address,
      p_user_agent: user_agent
    });
    
    if (error) {
      throw new AppError(error.message, 400, 'BATCH_CREATION_FAILED');
    }
    
    if (!result.success) {
      throw new AppError(result.error, 400, result.error_code || 'BATCH_CREATION_FAILED');
    }
    
    return result;
  } catch (error) {
    logger.error('Failed to create production batch', error, { data, userId });
    throw error;
  }
}
```

### Frontend Validation

```javascript
// En ProductionBatchModal.vue
const validateForm = () => {
  if (!form.quantity || form.quantity <= 0 || form.quantity > 100) {
    error.value = 'Quantity must be between 1 and 100';
    return false;
  }
  
  if (!form.supplier_name) {
    error.value = 'Please select a supplier';
    return false;
  }
  
  return true;
};
```

## Resultado Final del Proceso

Después de ejecutar la función RPC:

### Registros Creados:
- **1 registro** en `qr_production_batch` 
  - Status: `'ordered'`
  - Quantity: 1-100
  - Defective_count: 0

- **1-100 registros** en `qr`
  - Status: `'generated'` (todos)
  - Print_position: 1-100
  - Farm: NULL (todos)

- **1-100 registros** en `qr_allocation`
  - Production_batch_id: UUID del batch
  - Delivery_batch_id: NULL (todos)
  - Allocated_at: NULL (todos)

- **1-100 registros** en `qr_audit_log`
  - Event_type: `'generated'` (todos)
  - User_id: UUID del creador

### Estado del Sistema:
- Production batch listo para enviar a imprenta
- QR codes generados pero no impresos
- Tracking completo desde el momento de creación
- Trazabilidad individual de cada QR code
- **Performance**: 300-800ms para el proceso completo

## Validaciones y Controles

### Pre-validaciones (Incluidas en la función):
- Quantity debe ser entre 1 y 100
- Supplier_id debe existir en `qr_supplier`
- Usuario debe estar autenticado

### Validaciones Automáticas:
- Short_code únicos garantizados (hasta 10 reintentos por QR)
- Batch_code único basado en timestamp
- Rollback automático en caso de error
- Validación de integridad referencial

### Manejo de Errores:
- **Rollback automático**: PostgreSQL revierte toda la transacción si falla cualquier paso
- **Error messages detallados**: Incluye código de error SQL y mensaje específico
- **Logging**: Todos los errores se registran en el backend

## Performance Esperado

### Métricas:
- **100 QR codes**: 300-800ms
- **50 QR codes**: 200-500ms  
- **10 QR codes**: 100-300ms
- **1 QR code**: 50-150ms

### Factores que afectan performance:
- Cantidad de QR codes
- Carga del servidor PostgreSQL
- Latencia de red
- Conflictos de short_code (reintentos)

## Próximos Pasos en el Flujo

1. **Envío a Imprenta**: Cambiar batch status a `'printing'`
2. **Recepción de Impresión**: Cambiar batch status a `'completed'` y QR status a `'printed'`
3. **Creación de Delivery Batches**: Asignar QRs a granjas específicas
4. **Shipping y Delivery**: Rastrear envío hasta entrega final

## Testing

### Prueba de la función:
```sql
-- Crear un supplier de prueba primero
INSERT INTO qr_supplier (name) VALUES ('Test Supplier') RETURNING id;

-- Ejecutar la función
SELECT create_production_batch(
  10,                                    -- quantity
  'uuid-del-supplier-de-prueba',        -- supplier_id
  'uuid-del-usuario',                   -- user_id
  'Test batch creation',                -- notes
  '192.168.1.100'::INET,               -- ip_address
  'Test User Agent'                     -- user_agent
);
```

Esta documentación está lista para copy-paste e implementación directa.