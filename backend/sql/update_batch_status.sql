-- Función RPC: Actualizar Status de Production Batch
-- Archivo: update_batch_status.sql
-- Descripción: Función para cambios simples de status sin modificar QR codes

CREATE OR REPLACE FUNCTION update_batch_status(
  p_batch_id UUID,
  p_new_status production_batch_status,
  p_user_id UUID,
  p_notes TEXT DEFAULT ''
) RETURNS JSON AS $$
DECLARE
  v_batch RECORD;
  v_result JSON;
BEGIN
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
  IF v_batch.status = p_new_status THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Batch is already in %s status', p_new_status),
      'error_code', 'INVALID_STATUS_TRANSITION'
    );
  END IF;
  
  -- Validar transiciones permitidas
  CASE v_batch.status
    WHEN 'ordered' THEN
      IF p_new_status NOT IN ('printing', 'cancelled') THEN
        RETURN json_build_object(
          'success', false,
          'error', format('Cannot change from %s to %s', v_batch.status, p_new_status),
          'error_code', 'INVALID_STATUS_TRANSITION'
        );
      END IF;
    WHEN 'printing' THEN
      IF p_new_status NOT IN ('received', 'cancelled') THEN
        RETURN json_build_object(
          'success', false,
          'error', format('Cannot change from %s to %s', v_batch.status, p_new_status),
          'error_code', 'INVALID_STATUS_TRANSITION'
        );
      END IF;
    WHEN 'received' THEN
      IF p_new_status NOT IN ('partial', 'completed', 'cancelled') THEN
        RETURN json_build_object(
          'success', false,
          'error', format('Cannot change from %s to %s', v_batch.status, p_new_status),
          'error_code', 'INVALID_STATUS_TRANSITION'
        );
      END IF;
    WHEN 'partial' THEN
      IF p_new_status NOT IN ('completed', 'cancelled') THEN
        RETURN json_build_object(
          'success', false,
          'error', format('Cannot change from %s to %s', v_batch.status, p_new_status),
          'error_code', 'INVALID_STATUS_TRANSITION'
        );
      END IF;
    WHEN 'completed', 'cancelled' THEN
      RETURN json_build_object(
        'success', false,
        'error', format('Cannot change status from final state: %s', v_batch.status),
        'error_code', 'FINAL_STATUS_IMMUTABLE'
      );
  END CASE;
  
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
                 'previous_status', v_batch.status
               )::jsonb
  WHERE id = p_batch_id;
  
  -- Crear audit log para el batch
  INSERT INTO qr_audit_log (
    id,
    qr_id,
    event_type,
    event_data,
    user_id,
    created_at
  )
  SELECT 
    gen_random_uuid(),
    qr.id,
    CASE p_new_status
      WHEN 'printing' THEN 'shipped'::qr_event_type
      WHEN 'cancelled' THEN 'retired'::qr_event_type
      ELSE 'allocated'::qr_event_type
    END,
    json_build_object(
      'batch_id', p_batch_id,
      'batch_code', v_batch.batch_code,
      'status_change', format('%s -> %s', v_batch.status, p_new_status),
      'notes', p_notes
    ),
    p_user_id,
    NOW()
  FROM qr 
  WHERE metadata->>'production_batch_id' = p_batch_id::text;
  
  -- Construir resultado
  v_result := json_build_object(
    'success', true,
    'batch', json_build_object(
      'id', v_batch.id,
      'batch_code', v_batch.batch_code,
      'previous_status', v_batch.status,
      'new_status', p_new_status,
      'updated_at', NOW(),
      'updated_by', p_user_id
    ),
    'message', format('Batch %s status updated from %s to %s', 
                     v_batch.batch_code, v_batch.status, p_new_status)
  );
  
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