-- Función RPC: Crear Production Batch
-- Archivo: create_production_batch.sql
-- Descripción: Función completa para crear un lote de producción con todos sus QR codes

CREATE OR REPLACE FUNCTION create_production_batch(
  p_quantity INTEGER,
  p_supplier_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT ''
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
  
  -- Verificar que el usuario existe y tiene permisos de admin
  IF NOT EXISTS (
    SELECT 1 FROM public."user" 
    WHERE id = p_user_id 
      AND global_role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'User not found or insufficient permissions. Only admin and super_admin users can create production batches: %', p_user_id;
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
      'notes', COALESCE(p_notes, '')
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
    created_at
  )
  SELECT 
    gen_random_uuid(),
    v_qr_ids[audit_i],
    'generated',
    json_build_object(
      'batch_id', v_batch_id,
      'batch_code', v_batch_code,
      'print_position', audit_i,
      'short_code', v_short_codes[audit_i]
    ),
    p_user_id,
    NULL,
    NOW()
  FROM generate_series(1, p_quantity) AS audit_i;
  
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
          'id', v_qr_ids[series_i],
          'short_code', v_short_codes[series_i],
          'print_position', series_i
        )
      )
      FROM generate_series(1, p_quantity) AS series_i
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