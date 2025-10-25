-- Función RPC: Cancelar Production Batch
-- Archivo: cancel_batch.sql
-- Descripción: Función para cancelar batch y retirar todos los QR codes

CREATE OR REPLACE FUNCTION cancel_batch(
  p_batch_id UUID,
  p_reason TEXT,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_batch RECORD;
  v_qr_count INTEGER;
  v_allocation_count INTEGER;
  v_result JSON;
BEGIN
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
  
  -- Verificar que no esté ya cancelado o completado
  IF v_batch.status IN ('cancelled', 'completed') THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Cannot cancel batch with status: %s', v_batch.status),
      'error_code', 'INVALID_STATUS_FOR_CANCELLATION'
    );
  END IF;
  
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
                 'previous_status', v_batch.status
               )::jsonb
  WHERE id = p_batch_id;
  
  -- Registrar audit logs para QRs retirados
  INSERT INTO qr_audit_log (
    id, qr_id, event_type, event_data, user_id, created_at
  )
  SELECT 
    gen_random_uuid(),
    qr.id,
    'retired',
    json_build_object(
      'batch_id', p_batch_id,
      'batch_code', v_batch.batch_code,
      'retirement_reason', 'batch_cancelled',
      'cancellation_reason', p_reason,
      'original_qr_status', qr.metadata->>'original_status'
    ),
    p_user_id,
    NOW()
  FROM qr 
  WHERE metadata->>'production_batch_id' = p_batch_id::text
    AND status = 'retired';
  
  -- Audit log para el batch
  INSERT INTO qr_audit_log (
    id, qr_id, event_type, event_data, user_id, created_at
  )
  SELECT 
    gen_random_uuid(),
    qr.id,
    'cancelled',
    json_build_object(
      'batch_id', p_batch_id,
      'batch_code', v_batch.batch_code,
      'batch_cancelled', true,
      'cancellation_reason', p_reason,
      'previous_batch_status', v_batch.status
    ),
    p_user_id,
    NOW()
  FROM qr 
  WHERE metadata->>'production_batch_id' = p_batch_id::text
  LIMIT 1; -- Solo un log por batch
  
  -- Construir resultado
  v_result := json_build_object(
    'success', true,
    'batch', json_build_object(
      'id', v_batch.id,
      'batch_code', v_batch.batch_code,
      'previous_status', v_batch.status,
      'new_status', 'cancelled',
      'cancelled_at', NOW(),
      'cancelled_by', p_user_id,
      'cancellation_reason', p_reason
    ),
    'qr_updates', json_build_object(
      'retired_count', v_qr_count,
      'allocations_cleaned', true
    ),
    'impact', json_build_object(
      'total_qrs_affected', v_qr_count,
      'delivery_allocations_affected', 0
    ),
    'message', format('Batch %s cancelled. %s QR codes retired. Reason: %s', 
                     v_batch.batch_code, v_qr_count, p_reason)
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'context', format('Cancelling batch %s', COALESCE(v_batch.batch_code, 'UNKNOWN'))
    );
END;
$$ LANGUAGE plpgsql;