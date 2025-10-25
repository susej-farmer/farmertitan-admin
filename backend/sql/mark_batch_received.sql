-- Función RPC: Marcar Batch como Recibido
-- Archivo: mark_batch_received.sql
-- Descripción: Función para recibir batch e incluir QRs defectuosos

CREATE OR REPLACE FUNCTION mark_batch_as_received(
  p_batch_id UUID,
  p_defective_count INTEGER DEFAULT 0,
  p_user_id UUID,
  p_notes TEXT DEFAULT ''
) RETURNS JSON AS $$
DECLARE
  v_batch RECORD;
  v_qr_ids UUID[];
  v_valid_count INTEGER;
  v_updated_qrs INTEGER;
  v_defective_qrs INTEGER;
  v_result JSON;
BEGIN
  -- Verificar que el batch existe y está en printing
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
  
  IF v_batch.status != 'printing' THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Cannot mark batch as received. Current status: %s', v_batch.status),
      'error_code', 'INVALID_STATUS_FOR_RECEPTION'
    );
  END IF;
  
  -- Validar defective_count
  IF p_defective_count < 0 OR p_defective_count > v_batch.quantity THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Defective count must be between 0 and %s', v_batch.quantity),
      'error_code', 'INVALID_DEFECTIVE_COUNT'
    );
  END IF;
  
  v_valid_count := v_batch.quantity - p_defective_count;
  
  -- Obtener QR codes del batch ordenados por print_position
  SELECT array_agg(id ORDER BY print_position) INTO v_qr_ids
  FROM qr 
  WHERE metadata->>'production_batch_id' = p_batch_id::text
    AND status = 'generated';
  
  IF array_length(v_qr_ids, 1) != v_batch.quantity THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Expected %s QR codes, found %s', v_batch.quantity, COALESCE(array_length(v_qr_ids, 1), 0)),
      'error_code', 'QR_COUNT_MISMATCH'
    );
  END IF;
  
  -- Actualizar QR codes válidos (primeros N) a 'printed'
  IF v_valid_count > 0 THEN
    UPDATE qr 
    SET status = 'printed', 
        metadata = metadata || json_build_object(
          'received_at', NOW(),
          'received_by', p_user_id,
          'batch_reception_notes', p_notes
        )::jsonb
    WHERE id = ANY(v_qr_ids[1:v_valid_count]);
    
    GET DIAGNOSTICS v_updated_qrs = ROW_COUNT;
  ELSE
    v_updated_qrs := 0;
  END IF;
  
  -- Actualizar QR codes defectuosos (últimos N) a 'defective'
  IF p_defective_count > 0 THEN
    UPDATE qr 
    SET status = 'defective',
        metadata = metadata || json_build_object(
          'marked_defective_at', NOW(),
          'marked_defective_by', p_user_id,
          'defective_reason', 'printing_defect',
          'batch_reception_notes', p_notes
        )::jsonb
    WHERE id = ANY(v_qr_ids[v_valid_count + 1:v_batch.quantity]);
    
    GET DIAGNOSTICS v_defective_qrs = ROW_COUNT;
  ELSE
    v_defective_qrs := 0;
  END IF;
  
  -- Actualizar batch
  UPDATE qr_production_batch 
  SET 
    status = 'received',
    defective_count = p_defective_count,
    updated_at = NOW(),
    updated_by = p_user_id,
    metadata = COALESCE(metadata, '{}'::jsonb) || 
               json_build_object(
                 'received_at', NOW(),
                 'received_by', p_user_id,
                 'reception_notes', p_notes,
                 'valid_qrs', v_valid_count,
                 'defective_qrs', p_defective_count,
                 'previous_status', v_batch.status
               )::jsonb
  WHERE id = p_batch_id;
  
  -- Registrar audit logs para QRs válidos
  IF v_updated_qrs > 0 THEN
    INSERT INTO qr_audit_log (
      id, qr_id, event_type, event_data, user_id, created_at
    )
    SELECT 
      gen_random_uuid(),
      id,
      'printed',
      json_build_object(
        'batch_id', p_batch_id,
        'batch_code', v_batch.batch_code,
        'reception_notes', p_notes,
        'valid_qr', true
      ),
      p_user_id,
      NOW()
    FROM qr 
    WHERE id = ANY(v_qr_ids[1:v_valid_count]);
  END IF;
  
  -- Registrar audit logs para QRs defectuosos
  IF v_defective_qrs > 0 THEN
    INSERT INTO qr_audit_log (
      id, qr_id, event_type, event_data, user_id, created_at
    )
    SELECT 
      gen_random_uuid(),
      id,
      'defective_marked',
      json_build_object(
        'batch_id', p_batch_id,
        'batch_code', v_batch.batch_code,
        'defective_reason', 'printing_defect',
        'reception_notes', p_notes
      ),
      p_user_id,
      NOW()
    FROM qr 
    WHERE id = ANY(v_qr_ids[v_valid_count + 1:v_batch.quantity]);
  END IF;
  
  -- Construir resultado detallado
  v_result := json_build_object(
    'success', true,
    'batch', json_build_object(
      'id', v_batch.id,
      'batch_code', v_batch.batch_code,
      'status', 'received',
      'total_quantity', v_batch.quantity,
      'valid_qrs', v_valid_count,
      'defective_qrs', p_defective_count,
      'received_at', NOW(),
      'received_by', p_user_id,
      'reception_notes', p_notes
    ),
    'qr_updates', json_build_object(
      'printed_count', v_updated_qrs,
      'defective_count', v_defective_qrs,
      'total_processed', v_updated_qrs + v_defective_qrs
    ),
    'available_for_allocation', v_valid_count,
    'message', format('Batch %s received: %s valid, %s defective QR codes', 
                     v_batch.batch_code, v_valid_count, p_defective_count)
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'context', format('Processing batch %s with %s defective QRs', 
                       COALESCE(v_batch.batch_code, 'UNKNOWN'), p_defective_count)
    );
END;
$$ LANGUAGE plpgsql;