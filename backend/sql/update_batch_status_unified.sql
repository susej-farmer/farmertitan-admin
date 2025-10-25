-- Función RPC: Actualizar Status de Production Batch (Unificada)
-- Archivo: update_batch_status_unified.sql
-- Descripción: Función única que maneja todas las transiciones de status
--
-- FORMAS DE USO:
--
-- 1. Transiciones Simples:
-- SELECT update_batch_status('batch-uuid', 'printing', 'user-uuid', 'Sent to printer');
-- SELECT update_batch_status('batch-uuid', 'partial', 'user-uuid', 'Some QRs allocated');
-- SELECT update_batch_status('batch-uuid', 'completed', 'user-uuid', 'All QRs allocated');
--
-- 2. Recepción con Defectuosos:
-- SELECT update_batch_status('batch-uuid', 'received', 'user-uuid', 'Perfect batch', '{}');
-- SELECT update_batch_status('batch-uuid', 'received', 'user-uuid', 'Some defective', '{"positions": [2,5,8]}');
-- SELECT update_batch_status('batch-uuid', 'received', 'user-uuid', 'Defective codes', '{"short_codes": ["FT-ABC123", "FT-DEF456"]}');
-- SELECT update_batch_status('batch-uuid', 'received', 'user-uuid', 'Mixed defective', '{"positions": [2], "short_codes": ["FT-ABC123"]}');
--
-- 3. Cancelaciones (desde cualquier status):
-- SELECT update_batch_status('batch-uuid', 'cancelled', 'user-uuid', 'Quality issues detected');
-- SELECT update_batch_status('batch-uuid', 'cancelled', 'user-uuid', 'Supplier delayed');
--
-- 4. Estados Válidos: ordered, printing, completed, received, cancelled, partial
-- 5. Transiciones Permitidas:
--    ordered → printing, cancelled
--    printing → received, cancelled
--    received → partial, completed, cancelled
--    partial → completed, cancelled
--    completed/cancelled → FINAL (no cambios permitidos)
--
-- 6. Validaciones Automáticas:
--    - Solo usuarios admin/super_admin pueden actualizar
--    - Validación de transiciones de estado
--    - Para 'received': validación de QRs defectuosos por posición o short_code
--    - Para 'cancelled': verificación de QRs no asignados a deliveries
--
-- 7. Formato para QRs Defectuosos (solo para status 'received'):
--    - Sin defectuosos: '{}' o no enviar el parámetro
--    - Por posiciones: '{"positions": [2,5,8]}' (posición en el lote)
--    - Por códigos: '{"short_codes": ["FT-ABC123", "FT-DEF456"]}'
--    - Mixto: '{"positions": [2], "short_codes": ["FT-ABC123"]}'

CREATE OR REPLACE FUNCTION update_batch_status(
  p_batch_id UUID,
  p_new_status TEXT,
  p_user_id UUID,
  p_notes TEXT DEFAULT '',
  p_defective_info JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  v_batch RECORD;
  v_result JSON;
  v_new_status_enum production_batch_status;
BEGIN
  -- Validar y convertir status de TEXT a enum
  BEGIN
    v_new_status_enum := p_new_status::production_batch_status;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN json_build_object(
        'success', false,
        'error', format('Invalid status: %s. Valid values are: ordered, printing, completed, received, cancelled, partial', p_new_status),
        'error_code', 'INVALID_STATUS_VALUE'
      );
  END;
  -- Verificar que el usuario existe y tiene permisos de admin
  IF NOT EXISTS (
    SELECT 1 FROM public."user" 
    WHERE id = p_user_id 
      AND global_role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'User not found or insufficient permissions. Only admin and super_admin users can update production batches: %', p_user_id;
  END IF;
  
  -- Verificar que el batch existe
  SELECT * INTO v_batch 
  FROM qr_production_batch 
  WHERE id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Production batch not found',
      'error_code', 'BATCH_NOT_FOUND'
    );
  END IF;
  
  -- Validar transición de estado
  IF v_batch.status = v_new_status_enum THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Batch is already in %s status', v_new_status_enum),
      'error_code', 'INVALID_STATUS_TRANSITION'
    );
  END IF;
  
  -- Validar transiciones permitidas y ejecutar lógica específica
  CASE v_batch.status
    WHEN 'ordered' THEN
      IF v_new_status_enum NOT IN ('printing', 'cancelled') THEN
        RETURN json_build_object(
          'success', false,
          'error', format('Cannot change from %s to %s', v_batch.status, v_new_status_enum),
          'error_code', 'INVALID_STATUS_TRANSITION'
        );
      END IF;
      
      -- Transición simple: ordered -> printing
      IF v_new_status_enum = 'printing' THEN
        v_result := perform_simple_status_update(p_batch_id, v_new_status_enum, p_user_id, p_notes, v_batch);
      END IF;
      
      -- Cancelación: ordered -> cancelled  
      IF v_new_status_enum = 'cancelled' THEN
        v_result := perform_batch_cancellation(p_batch_id, p_notes, p_user_id, v_batch);
      END IF;
      
    WHEN 'printing' THEN
      IF v_new_status_enum NOT IN ('received', 'cancelled') THEN
        RETURN json_build_object(
          'success', false,
          'error', format('Cannot change from %s to %s', v_batch.status, v_new_status_enum),
          'error_code', 'INVALID_STATUS_TRANSITION'
        );
      END IF;
      
      -- Recepción: printing -> received (con manejo de defectuosos)
      IF v_new_status_enum = 'received' THEN
        v_result := perform_batch_reception(p_batch_id, p_defective_info, p_user_id, p_notes, v_batch);
      END IF;
      
      -- Cancelación: printing -> cancelled
      IF v_new_status_enum = 'cancelled' THEN
        v_result := perform_batch_cancellation(p_batch_id, p_notes, p_user_id, v_batch);
      END IF;
      
    WHEN 'received' THEN
      IF v_new_status_enum NOT IN ('partial', 'completed', 'cancelled') THEN
        RETURN json_build_object(
          'success', false,
          'error', format('Cannot change from %s to %s', v_batch.status, v_new_status_enum),
          'error_code', 'INVALID_STATUS_TRANSITION'
        );
      END IF;
      
      -- Estas transiciones son automáticas cuando se crean delivery_batches
      IF v_new_status_enum IN ('partial', 'completed') THEN
        v_result := perform_simple_status_update(p_batch_id, v_new_status_enum, p_user_id, p_notes, v_batch);
      END IF;
      
      -- Cancelación: received -> cancelled
      IF v_new_status_enum = 'cancelled' THEN
        v_result := perform_batch_cancellation(p_batch_id, p_notes, p_user_id, v_batch);
      END IF;
      
    WHEN 'partial' THEN
      IF v_new_status_enum NOT IN ('completed', 'cancelled') THEN
        RETURN json_build_object(
          'success', false,
          'error', format('Cannot change from %s to %s', v_batch.status, v_new_status_enum),
          'error_code', 'INVALID_STATUS_TRANSITION'
        );
      END IF;
      
      -- Transición automática: partial -> completed
      IF v_new_status_enum = 'completed' THEN
        v_result := perform_simple_status_update(p_batch_id, v_new_status_enum, p_user_id, p_notes, v_batch);
      END IF;
      
      -- Cancelación: partial -> cancelled
      IF v_new_status_enum = 'cancelled' THEN
        v_result := perform_batch_cancellation(p_batch_id, p_notes, p_user_id, v_batch);
      END IF;
      
    WHEN 'completed', 'cancelled' THEN
      RETURN json_build_object(
        'success', false,
        'error', format('Cannot change status from final state: %s', v_batch.status),
        'error_code', 'FINAL_STATUS_IMMUTABLE'
      );
  END CASE;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- FUNCIONES INTERNAS (HELPER FUNCTIONS)
-- ==========================================

-- Función interna: Actualización simple de status
CREATE OR REPLACE FUNCTION perform_simple_status_update(
  p_batch_id UUID,
  p_new_status production_batch_status,
  p_user_id UUID,
  p_notes TEXT,
  p_batch RECORD
) RETURNS JSON AS $$
BEGIN
  -- Actualizar batch
  UPDATE qr_production_batch 
  SET 
    status = p_new_status,
    updated_at = NOW(),
    updated_by = p_user_id,
    metadata = COALESCE(metadata, '{}'::jsonb) || 
               json_build_object(
                 'status_updated_at', NOW(),
                 'status_updated_by', p_user_id,
                 'status_notes', p_notes,
                 'previous_status', p_batch.status
               )::jsonb
  WHERE id = p_batch_id;
  
  -- NO crear audit logs para transiciones simples
  -- Los QR codes no cambian de status en estas transiciones:
  -- - ordered -> printing (QRs siguen en 'generated')
  -- - received -> partial (QRs siguen en 'printed', solo algunos se asignan)
  -- - partial -> completed (QRs siguen en 'printed', se asignan los restantes)
  
  -- Construir resultado
  RETURN json_build_object(
    'success', true,
    'batch', json_build_object(
      'id', p_batch.id,
      'batch_code', p_batch.batch_code,
      'previous_status', p_batch.status,
      'new_status', p_new_status,
      'updated_at', NOW(),
      'updated_by', p_user_id
    ),
    'message', format('Batch %s status updated from %s to %s', 
                     p_batch.batch_code, p_batch.status, p_new_status)
  );
END;
$$ LANGUAGE plpgsql;

-- Función interna: Recepción de batch con defectuosos
CREATE OR REPLACE FUNCTION perform_batch_reception(
  p_batch_id UUID,
  p_defective_info JSONB,
  p_user_id UUID,
  p_notes TEXT,
  p_batch RECORD
) RETURNS JSON AS $$
DECLARE
  v_defective_positions INTEGER[];
  v_defective_short_codes TEXT[];
  v_defective_qr_ids UUID[];
  v_valid_qr_ids UUID[];
  v_updated_qrs INTEGER;
  v_defective_qrs INTEGER;
  v_defective_count INTEGER;
  v_valid_count INTEGER;
BEGIN
  -- Extraer información de defectuosos del JSONB
  -- Manejar positions (pueden ser números o texto)
  IF p_defective_info ? 'positions' THEN
    -- Intentar como números primero
    BEGIN
      v_defective_positions := ARRAY(SELECT (jsonb_array_elements(p_defective_info->'positions'))::INTEGER);
    EXCEPTION
      WHEN OTHERS THEN
        -- Si falla, son códigos en el campo positions, moverlos a short_codes
        v_defective_short_codes := ARRAY(SELECT jsonb_array_elements_text(p_defective_info->'positions'));
        v_defective_positions := ARRAY[]::INTEGER[];
    END;
  ELSE
    v_defective_positions := ARRAY[]::INTEGER[];
  END IF;
  
  -- Manejar short_codes
  IF p_defective_info ? 'short_codes' THEN
    v_defective_short_codes := COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(p_defective_info->'short_codes')),
      COALESCE(v_defective_short_codes, ARRAY[]::TEXT[])
    );
  ELSE
    v_defective_short_codes := COALESCE(v_defective_short_codes, ARRAY[]::TEXT[]);
  END IF;
  
  -- Obtener QR IDs defectuosos por posición
  IF array_length(v_defective_positions, 1) > 0 THEN
    SELECT array_agg(id) INTO v_defective_qr_ids
    FROM qr 
    WHERE metadata->>'production_batch_id' = p_batch_id::text
      AND status = 'generated'
      AND print_position = ANY(v_defective_positions);
    
    -- Validar que todas las posiciones existen
    IF array_length(v_defective_qr_ids, 1) != array_length(v_defective_positions, 1) THEN
      RETURN json_build_object(
        'success', false,
        'error', format('Some positions not found. Expected %s, found %s', 
                       array_length(v_defective_positions, 1), 
                       COALESCE(array_length(v_defective_qr_ids, 1), 0)),
        'error_code', 'INVALID_POSITIONS'
      );
    END IF;
  END IF;
  
  -- Obtener QR IDs defectuosos adicionales por short_code
  IF array_length(v_defective_short_codes, 1) > 0 THEN
    SELECT array_agg(id) INTO v_defective_qr_ids
    FROM (
      SELECT id FROM qr 
      WHERE metadata->>'production_batch_id' = p_batch_id::text
        AND status = 'generated'
        AND (id = ANY(COALESCE(v_defective_qr_ids, ARRAY[]::UUID[])) OR short_code = ANY(v_defective_short_codes))
    ) combined;
    
    -- Validar que todos los short_codes existen
    SELECT COUNT(*) INTO v_defective_count
    FROM qr
    WHERE metadata->>'production_batch_id' = p_batch_id::text
      AND status = 'generated'
      AND short_code = ANY(v_defective_short_codes);
      
    IF v_defective_count != array_length(v_defective_short_codes, 1) THEN
      RETURN json_build_object(
        'success', false,
        'error', format('Some short codes not found. Expected %s, found %s',
                       array_length(v_defective_short_codes, 1), v_defective_count),
        'error_code', 'INVALID_SHORT_CODES'
      );
    END IF;
  END IF;
  
  -- Si no hay defectuosos especificados, inicializar array vacío
  v_defective_qr_ids := COALESCE(v_defective_qr_ids, ARRAY[]::UUID[]);
  v_defective_count := array_length(v_defective_qr_ids, 1);
  v_defective_count := COALESCE(v_defective_count, 0);
  
  -- Validar que no hay duplicados ni cantidad excesiva
  IF v_defective_count > p_batch.quantity THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Too many defective QRs specified: %s (batch size: %s)', v_defective_count, p_batch.quantity),
      'error_code', 'TOO_MANY_DEFECTIVE'
    );
  END IF;
  
  -- Obtener QR IDs válidos (todos menos los defectuosos)
  SELECT array_agg(id) INTO v_valid_qr_ids
  FROM qr 
  WHERE metadata->>'production_batch_id' = p_batch_id::text
    AND status = 'generated'
    AND NOT (id = ANY(v_defective_qr_ids));
    
  v_valid_count := COALESCE(array_length(v_valid_qr_ids, 1), 0);
  
  -- Verificar que tenemos todos los QRs del batch
  IF (v_valid_count + v_defective_count) != p_batch.quantity THEN
    RETURN json_build_object(
      'success', false,
      'error', format('QR count mismatch. Expected %s, found %s valid + %s defective = %s', 
                     p_batch.quantity, v_valid_count, v_defective_count, v_valid_count + v_defective_count),
      'error_code', 'QR_COUNT_MISMATCH'
    );
  END IF;
  
  -- Actualizar QR codes válidos a 'printed'
  IF v_valid_count > 0 THEN
    UPDATE qr 
    SET status = 'printed', 
        metadata = metadata || json_build_object(
          'received_at', NOW(),
          'received_by', p_user_id,
          'batch_reception_notes', p_notes
        )::jsonb
    WHERE id = ANY(v_valid_qr_ids);
    
    GET DIAGNOSTICS v_updated_qrs = ROW_COUNT;
  ELSE
    v_updated_qrs := 0;
  END IF;
  
  -- Actualizar QR codes defectuosos a 'defective'
  IF v_defective_count > 0 THEN
    UPDATE qr 
    SET status = 'defective',
        metadata = metadata || json_build_object(
          'marked_defective_at', NOW(),
          'marked_defective_by', p_user_id,
          'defective_reason', 'printing_defect',
          'batch_reception_notes', p_notes
        )::jsonb
    WHERE id = ANY(v_defective_qr_ids);
    
    GET DIAGNOSTICS v_defective_qrs = ROW_COUNT;
  ELSE
    v_defective_qrs := 0;
  END IF;
  
  -- Actualizar batch
  UPDATE qr_production_batch 
  SET 
    status = 'received',
    defective_count = v_defective_count,
    updated_at = NOW(),
    updated_by = p_user_id,
    metadata = COALESCE(metadata, '{}'::jsonb) || 
               json_build_object(
                 'received_at', NOW(),
                 'received_by', p_user_id,
                 'reception_notes', p_notes,
                 'valid_qrs', v_valid_count,
                 'defective_qrs', v_defective_count,
                 'defective_positions', v_defective_positions,
                 'defective_short_codes', v_defective_short_codes,
                 'previous_status', p_batch.status
               )::jsonb
  WHERE id = p_batch_id;
  
  -- Registrar audit logs para QRs válidos
  IF v_updated_qrs > 0 THEN
    INSERT INTO qr_audit_log (id, qr_id, event_type, event_data, user_id, created_at)
    SELECT 
      gen_random_uuid(), id, 'printed'::qr_event_type,
      json_build_object(
        'batch_id', p_batch_id, 
        'batch_code', p_batch.batch_code, 
        'reception_notes', p_notes, 
        'valid_qr', true
      ),
      p_user_id, NOW()
    FROM qr WHERE id = ANY(v_valid_qr_ids);
  END IF;
  
  -- Registrar audit logs para QRs defectuosos
  IF v_defective_qrs > 0 THEN
    INSERT INTO qr_audit_log (id, qr_id, event_type, event_data, user_id, created_at)
    SELECT 
      gen_random_uuid(), id, 'defective_marked'::qr_event_type,
      json_build_object(
        'batch_id', p_batch_id, 
        'batch_code', p_batch.batch_code, 
        'defective_reason', 'printing_defect',
        'reception_notes', p_notes,
        'qr_position', qr.print_position,
        'qr_short_code', qr.short_code
      ),
      p_user_id, NOW()
    FROM qr 
    WHERE id = ANY(v_defective_qr_ids);
  END IF;
  
  -- Construir resultado
  RETURN json_build_object(
    'success', true,
    'batch', json_build_object(
      'id', p_batch.id,
      'batch_code', p_batch.batch_code,
      'status', 'received',
      'total_quantity', p_batch.quantity,
      'valid_qrs', v_valid_count,
      'defective_qrs', v_defective_count,
      'received_at', NOW()
    ),
    'qr_updates', json_build_object(
      'printed_count', v_updated_qrs,
      'defective_count', v_defective_qrs
    ),
    'available_for_allocation', v_valid_count,
    'defective_details', json_build_object(
      'positions', v_defective_positions,
      'short_codes', v_defective_short_codes,
      'total_defective', v_defective_count
    ),
    'message', format('Batch %s received: %s valid, %s defective QR codes', 
                     p_batch.batch_code, v_valid_count, v_defective_count)
  );
END;
$$ LANGUAGE plpgsql;

-- Función interna: Cancelación de batch
CREATE OR REPLACE FUNCTION perform_batch_cancellation(
  p_batch_id UUID,
  p_reason TEXT,
  p_user_id UUID,
  p_batch RECORD
) RETURNS JSON AS $$
DECLARE
  v_qr_count INTEGER;
  v_allocation_count INTEGER;
BEGIN
  -- Verificar si hay QRs ya asignados a delivery batches
  SELECT COUNT(*) INTO v_allocation_count
  FROM qr_allocation qa
  WHERE qa.production_batch_id = p_batch_id 
    AND qa.delivery_batch_id IS NOT NULL;
  
  IF v_allocation_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Cannot cancel batch: %s QR codes are already allocated to deliveries', v_allocation_count),
      'error_code', 'BATCH_HAS_ALLOCATIONS'
    );
  END IF;
  
  -- Retirar todos los QR codes del batch
  UPDATE qr 
  SET status = 'retired',
      metadata = metadata || json_build_object(
        'retired_at', NOW(),
        'retired_by', p_user_id,
        'retirement_reason', 'batch_cancelled',
        'original_status', status,
        'cancellation_reason', p_reason
      )::jsonb
  WHERE metadata->>'production_batch_id' = p_batch_id::text
    AND status IN ('generated', 'printed', 'defective');
  
  GET DIAGNOSTICS v_qr_count = ROW_COUNT;
  
  -- Limpiar allocations sin delivery asignado
  DELETE FROM qr_allocation 
  WHERE production_batch_id = p_batch_id 
    AND delivery_batch_id IS NULL;
  
  -- Actualizar batch
  UPDATE qr_production_batch 
  SET 
    status = 'cancelled',
    updated_at = NOW(),
    updated_by = p_user_id,
    metadata = COALESCE(metadata, '{}'::jsonb) || 
               json_build_object(
                 'cancelled_at', NOW(),
                 'cancelled_by', p_user_id,
                 'cancellation_reason', p_reason,
                 'qrs_retired', v_qr_count,
                 'previous_status', p_batch.status
               )::jsonb
  WHERE id = p_batch_id;
  
  -- Registrar audit logs
  INSERT INTO qr_audit_log (id, qr_id, event_type, event_data, user_id, created_at)
  SELECT 
    gen_random_uuid(), qr.id, 'retired'::qr_event_type,
    json_build_object('batch_id', p_batch_id, 'batch_code', p_batch.batch_code, 'retirement_reason', 'batch_cancelled', 'cancellation_reason', p_reason),
    p_user_id, NOW()
  FROM qr 
  WHERE metadata->>'production_batch_id' = p_batch_id::text AND status = 'retired';
  
  -- Construir resultado
  RETURN json_build_object(
    'success', true,
    'batch', json_build_object(
      'id', p_batch.id,
      'batch_code', p_batch.batch_code,
      'previous_status', p_batch.status,
      'new_status', 'cancelled',
      'cancelled_at', NOW(),
      'cancellation_reason', p_reason
    ),
    'qr_updates', json_build_object('retired_count', v_qr_count),
    'message', format('Batch %s cancelled. %s QR codes retired. Reason: %s', 
                     p_batch.batch_code, v_qr_count, p_reason)
  );
END;
$$ LANGUAGE plpgsql;