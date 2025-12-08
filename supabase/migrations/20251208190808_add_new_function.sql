drop function if exists "public"."bind_equipment_qr"(equipment_id uuid, qr_identifier text, user_id uuid);

drop function if exists "public"."get_qr_binding"(p_identifier text);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_farms_with_context(p_page integer DEFAULT 1, p_limit integer DEFAULT 20, p_search text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_data JSON;
  v_result JSON;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_limit;

  -- Get total count with filters
  SELECT COUNT(DISTINCT f.id)
  INTO v_total
  FROM farm f
  LEFT JOIN _farm_user fu ON f.id = fu.farm
  WHERE
    (p_search IS NULL OR f.name ILIKE '%' || p_search || '%')
    AND (p_user_id IS NULL OR fu.user = p_user_id)
    AND (p_is_active IS NULL OR COALESCE(f.status, true) = p_is_active);

  -- Get paginated data with counts
  SELECT json_agg(farm_data ORDER BY farm_data.created_at DESC)
  INTO v_data
  FROM (
    SELECT
      f.id,
      f.created_at,
      f.name,
      f.acres,
      f.metadata,
      f.status,
      -- Count of equipment for this farm
      (
        SELECT COUNT(*)
        FROM equipment e
        WHERE e.farm = f.id
      )::INTEGER as equipment_count,
      -- Count of users for this farm
      (
        SELECT COUNT(*)
        FROM _farm_user fu
        WHERE fu.farm = f.id
      )::INTEGER as user_count
    FROM farm f
    LEFT JOIN _farm_user fu ON f.id = fu.farm
    WHERE
      (p_search IS NULL OR f.name ILIKE '%' || p_search || '%')
      AND (p_user_id IS NULL OR fu.user = p_user_id)
      AND (p_is_active IS NULL OR COALESCE(f.status, true) = p_is_active)
    GROUP BY f.id, f.created_at, f.name, f.acres, f.metadata, f.status
    ORDER BY f.created_at DESC
    LIMIT p_limit
    OFFSET v_offset
  ) farm_data;

  -- Build result with pagination metadata
  v_result := json_build_object(
    'data', COALESCE(v_data, '[]'::json),
    'pagination', json_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', v_total,
      'totalPages', CEIL(v_total::DECIMAL / p_limit),
      'hasNext', (p_page * p_limit) < v_total,
      'hasPrev', p_page > 1
    ),
    'success', true
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert new user into public.user table only if it doesn't exist
    -- ON CONFLICT DO NOTHING ensures existing users are left unchanged
    INSERT INTO public.user (id, created_at, global_role)
    VALUES (
        NEW.id,
        NOW(),
        'regular_user'::global_user_role
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log any unexpected errors but don't prevent user creation in auth.users
        RAISE WARNING 'Error creating public.user record for auth.users.id %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.qr_bind_equipment(equipment_id uuid, qr_identifier text, user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

DECLARE
    v_qr_id UUID;
    v_qr_short_code TEXT;
    v_qr_status TEXT;
    v_qr_farm_id UUID;
    v_validation_result TEXT;
    v_is_uuid BOOLEAN := false;
    v_equipment_farm_id UUID;
    v_binding_id UUID;
    v_equipment_name TEXT;
    v_equipment_metadata JSONB;
    v_equipment_type TEXT;
    v_equipment_make TEXT;
    v_equipment_model TEXT;
    v_farm_name TEXT;
    v_farm_acres DECIMAL;
BEGIN
    -- Input parameter validation
    IF equipment_id IS NULL OR qr_identifier IS NULL OR user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'INVALID_INPUT',
                'message', 'All parameters (equipment_id, qr_identifier, user_id) are required'
            )
        );
    END IF;
    
    IF TRIM(qr_identifier) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'INVALID_INPUT',
                'message', 'QR identifier cannot be empty'
            )
        );
    END IF;

    -- Validate user exists
    IF NOT EXISTS(SELECT 1 FROM public.user WHERE id = user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'USER_NOT_FOUND',
                'message', 'User not found'
            )
        );
    END IF;

    -- Validate equipment exists and is active, get farm_id and equipment details
    SELECT
        e.farm,
        e.name,
        e.metadata,
        et.name,
        em.name,
        emodel.name
    INTO
        v_equipment_farm_id,
        v_equipment_name,
        v_equipment_metadata,
        v_equipment_type,
        v_equipment_make,
        v_equipment_model
    FROM equipment e
    LEFT JOIN _equipment eq ON e._equipment = eq.id
    LEFT JOIN _equipment_type et ON eq.type = et.id
    LEFT JOIN _equipment_make em ON eq.make = em.id
    LEFT JOIN _equipment_model emodel ON eq.model = emodel.id
    WHERE e.id = equipment_id AND e.status = 'active';

    IF v_equipment_farm_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'EQUIPMENT_NOT_FOUND',
                'message', 'Equipment not found or inactive'
            )
        );
    END IF;

    -- Get farm details
    SELECT name, acres
    INTO v_farm_name, v_farm_acres
    FROM farm
    WHERE id = v_equipment_farm_id;

    -- Check if QR identifier is UUID format
    BEGIN
        v_qr_id := qr_identifier::UUID;
        v_is_uuid := true;
    EXCEPTION
        WHEN invalid_text_representation THEN
            v_is_uuid := false;
            -- Validate short code length (max 9 characters)
            IF LENGTH(TRIM(qr_identifier)) > 9 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', jsonb_build_object(
                        'code', 'INVALID_FORMAT',
                        'message', 'Invalid QR code format'
                    )
                );
            END IF;
    END;

    -- Comprehensive QR validation in single query
    IF v_is_uuid THEN
        -- Query by UUID
        SELECT 
            qr.id,
            qr.short_code,
            qr.status,
            qr.farm,
            CASE 
                WHEN qr.id IS NULL THEN 'QR_NOT_FOUND'
                WHEN qr.status IN ('bound') THEN 'QR_ALREADY_BOUND'
                WHEN qr_binding.id IS NOT NULL THEN 'QR_ALREADY_BOUND'
                ELSE 'VALID'
            END AS validation_result
        INTO v_qr_id, v_qr_short_code, v_qr_status, v_qr_farm_id, v_validation_result
        FROM qr
        LEFT JOIN qr_binding ON qr.id = qr_binding.qr_id 
            AND qr_binding.is_active = true
        WHERE qr.id = v_qr_id;
    ELSE
        -- Query by short_code
        SELECT 
            qr.id,
            qr.short_code,
            qr.status,
            qr.farm,
            CASE 
                WHEN qr.id IS NULL THEN 'QR_NOT_FOUND'
                WHEN qr.status NOT IN ('bound') THEN 'QR_ALREADY_BOUND'
                WHEN qr_binding.id IS NOT NULL THEN 'QR_ALREADY_BOUND'
                ELSE 'VALID'
            END AS validation_result
        INTO v_qr_id, v_qr_short_code, v_qr_status, v_qr_farm_id, v_validation_result
        FROM qr
        LEFT JOIN qr_binding ON qr.id = qr_binding.qr_id 
            AND qr_binding.is_active = true
        WHERE qr.short_code = UPPER(TRIM(qr_identifier));
    END IF;

    -- Handle validation results
    IF v_validation_result = 'QR_NOT_FOUND' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'QR_NOT_FOUND',
                'message', 'QR code not found'
            )
        );
    ELSIF v_validation_result = 'QR_ALREADY_BOUND' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'QR_ALREADY_BOUND',
                'message', 'QR code already bound to equipment'
            )
        );
    END IF;

    -- All validations passed, perform binding using helper function
    BEGIN
        DECLARE
            v_qr_production_batch_id UUID;
            v_prod_batch_quantity INTEGER;
            v_prod_batch_allocated INTEGER;
        BEGIN
            -- Use internal helper to create binding
            v_binding_id := qr_create_binding_internal(
                p_qr_id := v_qr_id,
                p_bindable_type := 'equipment'::bindable_type,
                p_bindable_id := equipment_id,
                p_user_id := user_id,
                p_metadata := jsonb_build_object('source', 'first_binding'),
                p_audit_event_type := 'bound'
            );

            -- ===================================================================
            -- UPDATE PRODUCTION BATCH COUNTERS
            -- ===================================================================

            -- Get production_batch_id and current counters
            SELECT qr_production_batch_id INTO v_qr_production_batch_id
            FROM qr WHERE id = v_qr_id;

            IF v_qr_production_batch_id IS NOT NULL THEN
                -- Increment allocated_quantity in production_batch
                UPDATE qr_production_batch
                SET allocated_quantity = allocated_quantity + 1,
                    updated_at = NOW(),
                    updated_by = user_id
                WHERE id = v_qr_production_batch_id
                RETURNING quantity, allocated_quantity
                INTO v_prod_batch_quantity, v_prod_batch_allocated;

                -- If all QRs are now allocated, mark batch as completed
                IF v_prod_batch_allocated = v_prod_batch_quantity THEN
                    UPDATE qr_production_batch
                    SET status = 'completed',
                        updated_at = NOW()
                    WHERE id = v_qr_production_batch_id;
                END IF;
            END IF;
        END;

        -- Return success response with farm id and equipment metadata
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'farm', jsonb_build_object(
                    'id', v_equipment_farm_id,
                    'name', v_farm_name,
                    'acres', v_farm_acres
                ),
                'equipment', jsonb_build_object(
                    'id', equipment_id,
                    'name', v_equipment_name,
                    'type', v_equipment_type,
                    'make', v_equipment_make,
                    'model', v_equipment_model,
                    'metadata', COALESCE(v_equipment_metadata, '{}'::jsonb)
                ),
                'qr', jsonb_build_object(
                    'id', v_qr_id,
                    'short_code', v_qr_short_code
                )
            )
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback will happen automatically
            RETURN jsonb_build_object(
                'success', false,
                'error', jsonb_build_object(
                    'code', 'BINDING_FAILED',
                    'message', 'Failed to create binding: ' || SQLERRM
                )
            );
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.qr_create_binding_internal(p_qr_id uuid, p_bindable_type public.bindable_type, p_bindable_id uuid, p_user_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb, p_audit_event_type text DEFAULT 'bound'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_binding_id UUID;
    v_entity_farm_id UUID;
BEGIN
    -- Generate new binding ID
    v_binding_id := gen_random_uuid();

    -- Get entity's farm_id (only for equipment type)
    IF p_bindable_type = 'equipment' THEN
        SELECT farm INTO v_entity_farm_id
        FROM equipment
        WHERE id = p_bindable_id;

        -- If farm_id is NULL, equipment doesn't exist (defensive check)
        IF v_entity_farm_id IS NULL THEN
            RAISE EXCEPTION 'INTERNAL_ERROR: Equipment % not found in qr_create_binding_internal', p_bindable_id;
        END IF;
    END IF;

    -- Create new binding record
    INSERT INTO qr_binding (
        id,
        qr_id,
        bindable_type,
        bindable_id,
        is_active,
        bound_at,
        bound_by,
        metadata
    ) VALUES (
        v_binding_id,
        p_qr_id,
        p_bindable_type,
        p_bindable_id,
        true,
        NOW(),
        p_user_id,
        p_metadata
    );

    -- Update QR code status and farm using helper function
    IF NOT qr_update_status_with_audit(
        p_qr_id := p_qr_id,
        p_new_status := 'bound',
        p_user_id := p_user_id,
        p_event_data := jsonb_build_object(
            'bindable_id', p_bindable_id,
            'bindable_type', p_bindable_type,
            'binding_id', v_binding_id
        ) || p_metadata,  -- Merge with provided metadata
        p_bound_at := NOW(),
        p_farm_id := v_entity_farm_id
    ) THEN
        RAISE EXCEPTION 'Failed to update QR status to bound for QR ID: %', p_qr_id;
    END IF;
    
    -- Return the new binding ID
    RETURN v_binding_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Re-raise exception with context
        RAISE EXCEPTION 'qr_create_binding_internal failed: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.qr_create_del_batch(p_farm_id uuid, p_requested_quantity integer, p_user_id uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_delivery_batch_id UUID;
  v_delivery_code TEXT;
  v_result JSON;
BEGIN
  -- Validations
  IF p_requested_quantity <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Requested quantity must be greater than 0, got: %s', p_requested_quantity),
      'error_code', 'INVALID_QUANTITY'
    );
  END IF;
  
  -- Verify user exists and has admin permissions
  IF NOT validate_global_user_permissions(p_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'User not found or insufficient permissions. Only super_admin users can create delivery batches: %', p_user_id;
  END IF;
  
  -- Verify farm exists
  IF NOT EXISTS (SELECT 1 FROM public.farm WHERE id = p_farm_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Farm not found: %s', p_farm_id),
      'error_code', 'FARM_NOT_FOUND'
    );
  END IF;

  -- Generate unique delivery code
  v_delivery_code := qr_generate_del_code(p_farm_id);
  
  -- Create delivery batch (simplified - purely administrative record)
  INSERT INTO qr_delivery_batch (
    id,
    delivery_code,
    farm_id,
    requested_quantity,
    created_at,
    updated_at,
    created_by,
    metadata
  ) VALUES (
    gen_random_uuid(),
    v_delivery_code,
    p_farm_id,
    p_requested_quantity,
    NOW(),
    NOW(),
    p_user_id,
    COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_delivery_batch_id;
  
  -- Build result (simplified - no status or counters)
  v_result := json_build_object(
    'success', true,
    'delivery_batch', json_build_object(
      'id', v_delivery_batch_id,
      'delivery_code', v_delivery_code,
      'farm_id', p_farm_id,
      'requested_quantity', p_requested_quantity,
      'created_by', p_user_id,
      'created_at', NOW(),
      'updated_at', NOW()
    ),
    'message', format('Delivery batch %s created successfully - %s QR codes requested', v_delivery_code, p_requested_quantity)
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
$function$
;

CREATE OR REPLACE FUNCTION public.qr_create_prod_batch(p_quantity integer, p_supplier_id uuid, p_user_id uuid, p_generated_by text DEFAULT 'super_admin'::text, p_notes text DEFAULT ''::text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_batch_id UUID;
  v_batch_code TEXT;
  v_qr_record RECORD;
  v_qr_ids UUID[];
  v_short_codes TEXT[];
  v_result JSON;
  i INTEGER;
BEGIN
  -- Validations
  IF p_quantity <= 0 OR p_quantity > 1000 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 1000, got: %', p_quantity;
  END IF;

  -- Validate generated_by
  IF p_generated_by NOT IN ('farm', 'super_admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', format('generated_by must be ''farm'' or ''super_admin'', got: %s', p_generated_by),
      'error_code', 'INVALID_GENERATED_BY'
    );
  END IF;

  -- Verify user exists and has admin permissions
  IF NOT validate_global_user_permissions(p_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'User not found or insufficient permissions. Only super_admin users can create production batches: %', p_user_id;
  END IF;

  -- Verify supplier exists
  IF NOT EXISTS (SELECT 1 FROM qr_supplier WHERE id = p_supplier_id) THEN
    RAISE EXCEPTION 'Supplier not found: %', p_supplier_id;
  END IF;

  -- Generate unique batch_code
  v_batch_code := 'PRINT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');

  -- Step 1: Create Production Batch
  INSERT INTO qr_production_batch (
    id,
    batch_code,
    quantity,
    status,
    supplier_id,
    generated_by,
    allocated_quantity,
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
    p_generated_by,
    0,
    p_user_id,
    NOW(),
    NOW(),
    json_build_object(
      'notes', COALESCE(p_notes, '')
    )
  ) RETURNING id INTO v_batch_id;

  -- Step 2: Generate QR Codes and prepare arrays
  v_qr_ids := ARRAY[]::UUID[];
  v_short_codes := ARRAY[]::TEXT[];

  FOR i IN 1..p_quantity LOOP
    DECLARE
      v_qr_id UUID;
      v_short_code TEXT;
      v_attempt INTEGER := 0;
    BEGIN
      -- Generate QR ID
      v_qr_id := gen_random_uuid();

      -- Generate unique short_code (with retries)
      LOOP
        v_short_code := 'FT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || v_qr_id::TEXT || i::TEXT) FROM 1 FOR 6));
        v_attempt := v_attempt + 1;

        -- Check uniqueness
        IF NOT EXISTS (SELECT 1 FROM qr WHERE short_code = v_short_code)
           AND v_short_code != ALL(v_short_codes) THEN
          EXIT;
        END IF;

        -- Maximum 10 attempts per QR
        IF v_attempt > 10 THEN
          RAISE EXCEPTION 'Could not generate unique short_code after 10 attempts for QR position %', i;
        END IF;
      END LOOP;

      -- Add to arrays
      v_qr_ids := array_append(v_qr_ids, v_qr_id);
      v_short_codes := array_append(v_short_codes, v_short_code);
    END;
  END LOOP;

  -- Step 3: Insert all QR codes with FK to production_batch
  FOR i IN 1..p_quantity LOOP
    INSERT INTO qr (
      id,
      short_code,
      status,
      print_position,
      farm,
      bound_at,
      qr_production_batch_id,
      created_at,
      metadata
    ) VALUES (
      v_qr_ids[i],
      v_short_codes[i],
      'generated',
      i,
      NULL,
      NULL,
      v_batch_id,
      NOW(),
      json_build_object(
        'batch_code', v_batch_code,
        'print_position', i
      )
    );
  END LOOP;

  -- Step 4: Create Audit Logs in batch
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
      'short_code', v_short_codes[audit_i],
      'generated_by', p_generated_by
    ),
    p_user_id,
    NULL,
    NOW()
  FROM generate_series(1, p_quantity) AS audit_i;

  -- Build result
  v_result := json_build_object(
    'success', true,
    'batch', json_build_object(
      'id', v_batch_id,
      'batch_code', v_batch_code,
      'quantity', p_quantity,
      'status', 'ordered',
      'generated_by', p_generated_by,
      'allocated_quantity', 0,
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
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.qr_generate_del_code(p_farm_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_farm_code TEXT;
    v_sequence_num INTEGER;
    v_delivery_code TEXT;
BEGIN
    -- Get farm code from name (or generate a simple one)
    SELECT COALESCE(
      UPPER(REGEXP_REPLACE(SUBSTRING(name FROM 1 FOR 8), '[^A-Za-z0-9]', '', 'g')),
      'FARM' || LPAD(EXTRACT(DAY FROM NOW())::TEXT, 3, '0')
    )
    INTO v_farm_code
    FROM farm 
    WHERE id = p_farm_id;
    
    -- If farm doesn't exist, raise error
    IF v_farm_code IS NULL THEN
        RAISE EXCEPTION 'Farm not found with ID: %', p_farm_id;
    END IF;
    
    -- Get next sequential number for this farm
    SELECT COALESCE(MAX(
        CASE 
            WHEN delivery_code ~ ('^DEL-' || v_farm_code || '-[0-9]+$') 
            THEN CAST(SPLIT_PART(delivery_code, '-', 3) AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO v_sequence_num
    FROM qr_delivery_batch
    WHERE farm_id = p_farm_id;
    
    -- Generate unique delivery code
    v_delivery_code := 'DEL-' || v_farm_code || '-' || LPAD(v_sequence_num::TEXT, 3, '0');
    
    RETURN v_delivery_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.qr_get_available_count()
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'total_available', (
      SELECT COUNT(*) FROM qr WHERE status = 'generated'
    ),
    'by_production_batch', (
      SELECT jsonb_agg(batch_data ORDER BY (batch_data->>'created_at'))
      FROM (
        SELECT jsonb_build_object(
          'batch_id', pb.id,
          'batch_code', pb.batch_code,
          'generated_by', pb.generated_by,
          'total_quantity', pb.quantity,
          'allocated_quantity', pb.allocated_quantity,
          'available_quantity', pb.quantity - pb.allocated_quantity,
          'status', pb.status,
          'created_at', pb.created_at
        ) AS batch_data
        FROM qr_production_batch pb
        WHERE pb.status = 'ordered'
      ) batches
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.qr_get_binding(p_identifier text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_qr_id UUID;
    v_qr_short_code TEXT;
    v_qr_status TEXT;
    v_bindable_type TEXT;
    v_bindable_id UUID;
    v_binding_id UUID;
    v_binding_is_active BOOLEAN;
    v_is_uuid BOOLEAN := false;
    v_equipment_data RECORD;
BEGIN
    -- Validate input parameter
    IF p_identifier IS NULL OR TRIM(p_identifier) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'EMPTY_IDENTIFIER',
                'message', 'QR identifier cannot be empty'
            )
        );
    END IF;
    
    -- Check if parameter is a valid UUID format
    BEGIN
        v_qr_id := p_identifier::UUID;
        v_is_uuid := true;
    EXCEPTION
        WHEN invalid_text_representation THEN
            v_is_uuid := false;
            -- Validate short code length (max 9 characters)
            IF LENGTH(TRIM(p_identifier)) > 9 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', jsonb_build_object(
                        'code', 'INVALID_FORMAT',
                        'message', 'Invalid QR code format'
                    )
                );
            END IF;
    END;
    
    -- Step 1: Check if QR code exists and get its status
    IF v_is_uuid THEN
        -- Query by UUID
        SELECT qr.id, qr.short_code, qr.status
        INTO v_qr_id, v_qr_short_code, v_qr_status
        FROM qr
        WHERE qr.id = v_qr_id;
    ELSE
        -- Query by short_code
        SELECT qr.id, qr.short_code, qr.status
        INTO v_qr_id, v_qr_short_code, v_qr_status
        FROM qr
        WHERE qr.short_code = UPPER(TRIM(p_identifier));
    END IF;

    -- Step 2: If QR code not found, return error
    IF v_qr_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'QR_NOT_FOUND',
                'message', 'QR code not found'
            )
        );
    END IF;

    -- Step 3: If QR code status is not 'bound', return only QR info
    IF v_qr_status != 'bound' THEN
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'qr', jsonb_build_object(
                    'id', v_qr_id,
                    'short_code', v_qr_short_code,
                    'status', v_qr_status
                )
            )
        );
    END IF;

    -- Step 4: Query qr_binding without join and without is_active filter
    SELECT qr_binding.id, qr_binding.bindable_type, qr_binding.bindable_id, qr_binding.is_active
    INTO v_binding_id, v_bindable_type, v_bindable_id, v_binding_is_active
    FROM qr_binding
    WHERE qr_binding.qr_id = v_qr_id;

    -- If no binding found, return error
    IF v_bindable_type IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'QR_BINDING_NOT_FOUND',
                'message', 'QR code binding not found'
            )
        );
    END IF;
    
    -- Handle equipment-specific binding
    IF v_bindable_type = 'equipment' THEN
        -- Get equipment details with optimized single query
        SELECT
            e.name as equipment_name,
            e.metadata as metadata,
            _em.name as make,
            _emo.name as model,
            _et.name as type,
            f.id as farm_id,
            f.name as farm,
            f.acres as acres
        INTO v_equipment_data
        FROM equipment e
        LEFT JOIN _equipment _e ON e._equipment = _e.id
        LEFT JOIN _equipment_make _em ON _e.make = _em.id
        LEFT JOIN _equipment_model _emo ON _e.model = _emo.id
        LEFT JOIN _equipment_type _et ON _e.type = _et.id
        LEFT JOIN farm f ON e.farm = f.id
        WHERE e.id = v_bindable_id
          AND e.status = 'active';
        
        -- Check if equipment was found
        IF v_equipment_data IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', jsonb_build_object(
                    'code', 'EQUIPMENT_NOT_FOUND',
                    'message', 'Equipment not found or inactive'
                )
            );
        END IF;
        
        -- Return complete equipment information with organized structure
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'qr', jsonb_build_object(
                    'id', v_qr_id,
                    'short_code', v_qr_short_code,
                    'status', v_qr_status
                ),
                'binding', jsonb_build_object(
                    'id', v_binding_id,
                    'type', v_bindable_type,
                    'is_active', v_binding_is_active
                ),
                'farm', jsonb_build_object(
                    'id', v_equipment_data.farm_id,
                    'name', v_equipment_data.farm,
                    'acres', v_equipment_data.acres
                ),
                'equipment', jsonb_build_object(
                    'id', v_bindable_id,
                    'name', v_equipment_data.equipment_name,
                    'type', v_equipment_data.type,
                    'make', v_equipment_data.make,
                    'model', v_equipment_data.model,
                    'metadata', COALESCE(v_equipment_data.metadata, '{}'::jsonb)
                )
            )
        );
    ELSE
        -- Return basic binding information for non-equipment types
        RETURN jsonb_build_object(
            'success', true,
            'data', jsonb_build_object(
                'qr', jsonb_build_object(
                    'id', v_qr_id,
                    'short_code', v_qr_short_code,
                    'status', v_qr_status
                ),
                'binding', jsonb_build_object(
                    'id', v_binding_id,
                    'type', v_bindable_type,
                    'is_active', v_binding_is_active
                )
            )
        );
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.qr_get_stats(p_farm_id uuid DEFAULT NULL::uuid, p_equipment_id uuid DEFAULT NULL::uuid, p_production_batch_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_qrs JSONB;
  v_count INTEGER;
BEGIN
  -- Validate at least one parameter
  IF p_farm_id IS NULL AND p_equipment_id IS NULL AND p_production_batch_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'At least one filter parameter required'
    );
  END IF;

  -- Query by production_batch
  IF p_production_batch_id IS NOT NULL THEN
    SELECT
      COUNT(*),
      jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'short_code', q.short_code,
          'status', q.status,
          'bindable_type', qb.bindable_type,
          'bindable_id', qb.bindable_id,
          'bound_at', q.bound_at
        )
      )
    INTO v_count, v_qrs
    FROM qr q
    LEFT JOIN qr_binding qb ON q.id = qb.qr_id AND qb.is_active = true
    WHERE q.qr_production_batch_id = p_production_batch_id;

  -- Query by equipment
  ELSIF p_equipment_id IS NOT NULL THEN
    SELECT
      COUNT(*),
      jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'short_code', q.short_code,
          'status', q.status,
          'bindable_type', 'equipment',
          'bindable_id', p_equipment_id,
          'bound_at', q.bound_at
        )
      )
    INTO v_count, v_qrs
    FROM qr q
    JOIN qr_binding qb ON q.id = qb.qr_id AND qb.is_active = true
    WHERE qb.bindable_id = p_equipment_id
      AND qb.bindable_type = 'equipment';

  -- Query by farm
  ELSIF p_farm_id IS NOT NULL THEN
    SELECT
      COUNT(*),
      jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'short_code', q.short_code,
          'status', q.status,
          'bindable_type', qb.bindable_type,
          'bindable_id', qb.bindable_id,
          'bound_at', q.bound_at
        )
      )
    INTO v_count, v_qrs
    FROM qr q
    LEFT JOIN qr_binding qb ON q.id = qb.qr_id AND qb.is_active = true
    WHERE q.farm = p_farm_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'quantity', COALESCE(v_count, 0),
    'qrs', COALESCE(v_qrs, '[]'::jsonb)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.qr_mark_as_defective(p_qr_identifier text, p_user_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_qr_id UUID;
  v_qr_record RECORD;
  v_is_uuid BOOLEAN;
BEGIN
  -- Validations
  IF p_qr_identifier IS NULL OR p_user_id IS NULL OR TRIM(p_reason) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', jsonb_build_object(
        'code', 'INVALID_INPUT',
        'message', 'All parameters required'
      )
    );
  END IF;

  -- Validate user
  IF NOT EXISTS(SELECT 1 FROM "user" WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', jsonb_build_object(
        'code', 'USER_NOT_FOUND',
        'message', 'User not found'
      )
    );
  END IF;

  -- Detect format (UUID vs short_code)
  BEGIN
    v_qr_id := p_qr_identifier::UUID;
    v_is_uuid := true;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_is_uuid := false;
  END;

  -- Find QR
  IF v_is_uuid THEN
    SELECT id, short_code, status, qr_production_batch_id
    INTO v_qr_record
    FROM qr WHERE id = v_qr_id;
  ELSE
    SELECT id, short_code, status, qr_production_batch_id
    INTO v_qr_record
    FROM qr WHERE short_code = UPPER(TRIM(p_qr_identifier));
  END IF;

  IF v_qr_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', jsonb_build_object(
        'code', 'QR_NOT_FOUND',
        'message', 'QR code not found'
      )
    );
  END IF;

  -- Already defective?
  IF v_qr_record.status = 'defective' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', jsonb_build_object(
        'code', 'ALREADY_DEFECTIVE',
        'message', 'QR is already marked as defective'
      )
    );
  END IF;

  -- Update QR to defective
  UPDATE qr
  SET status = 'defective',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'marked_defective_at', NOW(),
        'marked_defective_by', p_user_id,
        'defective_reason', p_reason,
        'previous_status', v_qr_record.status
      )
  WHERE id = v_qr_record.id;

  -- Create audit log
  INSERT INTO qr_audit_log (
    id, qr_id, event_type, event_data, user_id, created_at
  ) VALUES (
    gen_random_uuid(),
    v_qr_record.id,
    'defective',
    jsonb_build_object(
      'reason', p_reason,
      'previous_status', v_qr_record.status,
      'short_code', v_qr_record.short_code,
      'production_batch_id', v_qr_record.qr_production_batch_id
    ),
    p_user_id,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'qr_id', v_qr_record.id,
      'short_code', v_qr_record.short_code,
      'previous_status', v_qr_record.status,
      'new_status', 'defective',
      'reason', p_reason
    ),
    'message', 'QR marked as defective successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', jsonb_build_object(
        'code', 'OPERATION_FAILED',
        'message', SQLERRM
      )
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.qr_reassign_equipment(qr_identifier text, new_equipment_id uuid, user_id uuid, reason text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_qr_id UUID;
    v_qr_short_code TEXT;
    v_qr_status TEXT;
    v_qr_farm_id UUID;
    v_is_uuid BOOLEAN := false;
    
    -- Current binding info
    v_old_binding_id UUID;
    v_old_equipment_id UUID;
    v_old_equipment_name TEXT;
    
    -- New equipment info
    v_new_equipment_farm_id UUID;
    v_new_equipment_name TEXT;
    v_new_equipment_type TEXT;
    v_new_equipment_make TEXT;
    v_new_equipment_model TEXT;
    
    -- New binding
    v_new_binding_id UUID;
    
    -- Farm name for response
    v_farm_name TEXT;
    
    -- Timestamps
    v_reassigned_at TIMESTAMPTZ := NOW();
BEGIN
    -- ==================================================================================
    -- VALIDATION 1: Input Parameters
    -- ==================================================================================
    
    IF qr_identifier IS NULL OR new_equipment_id IS NULL OR user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'INVALID_INPUT',
                'message', 'All parameters (qr_identifier, new_equipment_id, user_id) are required'
            )
        );
    END IF;
    
    IF TRIM(qr_identifier) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'INVALID_INPUT',
                'message', 'QR identifier cannot be empty'
            )
        );
    END IF;
    
    -- ==================================================================================
    -- VALIDATION 2: User Exists
    -- ==================================================================================
    
    IF NOT EXISTS(SELECT 1 FROM public.user WHERE id = user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'USER_NOT_FOUND',
                'message', 'User not found'
            )
        );
    END IF;
    
    -- ==================================================================================
    -- VALIDATION 3: QR Exists and is Currently Bound
    -- ==================================================================================
    
    -- Detect if QR identifier is UUID or short_code
    BEGIN
        v_qr_id := qr_identifier::UUID;
        v_is_uuid := true;
    EXCEPTION
        WHEN invalid_text_representation THEN
            v_is_uuid := false;
            -- Validate short code format
            IF LENGTH(TRIM(qr_identifier)) > 9 THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', jsonb_build_object(
                        'code', 'INVALID_FORMAT',
                        'message', 'Invalid QR code format'
                    )
                );
            END IF;
    END;
    
    -- Get QR info and current binding in single query
    IF v_is_uuid THEN
        SELECT 
            qr.id,
            qr.short_code,
            qr.status,
            qr.farm,
            qb.id,
            qb.bindable_id
        INTO 
            v_qr_id,
            v_qr_short_code,
            v_qr_status,
            v_qr_farm_id,
            v_old_binding_id,
            v_old_equipment_id
        FROM qr
        LEFT JOIN qr_binding qb ON qr.id = qb.qr_id AND qb.is_active = true
        WHERE qr.id = v_qr_id;
    ELSE
        SELECT 
            qr.id,
            qr.short_code,
            qr.status,
            qr.farm,
            qb.id,
            qb.bindable_id
        INTO 
            v_qr_id,
            v_qr_short_code,
            v_qr_status,
            v_qr_farm_id,
            v_old_binding_id,
            v_old_equipment_id
        FROM qr
        LEFT JOIN qr_binding qb ON qr.id = qb.qr_id AND qb.is_active = true
        WHERE qr.short_code = UPPER(TRIM(qr_identifier));
    END IF;
    
    -- Check QR exists
    IF v_qr_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'QR_NOT_FOUND',
                'message', 'QR code not found'
            )
        );
    END IF;
    
    -- Check QR is bound
    IF v_qr_status != 'bound' OR v_old_binding_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'QR_NOT_BOUND',
                'message', 'QR code is not currently bound to any equipment. Use bind_equipment_qr for first-time binding.'
            )
        );
    END IF;
    
    -- Get old equipment name for response
    SELECT name INTO v_old_equipment_name
    FROM equipment
    WHERE id = v_old_equipment_id;
    
    -- ==================================================================================
    -- VALIDATION 4: New Equipment Exists and is Active
    -- ==================================================================================
    
    SELECT 
        e.farm,
        e.name,
        ee.type,
        ee.make,
        ee.model
    INTO 
        v_new_equipment_farm_id,
        v_new_equipment_name,
        v_new_equipment_type,
        v_new_equipment_make,
        v_new_equipment_model
    FROM equipment e
    INNER JOIN _equipment ee ON e._equipment = ee.id
    WHERE e.id = new_equipment_id AND e.status = 'active';
    
    IF v_new_equipment_farm_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'EQUIPMENT_NOT_FOUND',
                'message', 'New equipment not found or inactive'
            )
        );
    END IF;
    
    -- ==================================================================================
    -- VALIDATION 5: Farm Matching
    -- ==================================================================================
    
    IF v_qr_farm_id != v_new_equipment_farm_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'FARM_MISMATCH',
                'message', 'Cannot reassign QR to equipment from a different farm'
            )
        );
    END IF;
    
    -- ==================================================================================
    -- VALIDATION 6: Not Reassigning to Same Equipment
    -- ==================================================================================
    
    IF v_old_equipment_id = new_equipment_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', jsonb_build_object(
                'code', 'SAME_EQUIPMENT',
                'message', 'QR is already bound to this equipment'
            )
        );
    END IF;
    
    -- Get farm name for response
    SELECT name INTO v_farm_name
    FROM farm
    WHERE id = v_qr_farm_id;
    
    -- ==================================================================================
    -- OPERATION: Reassignment Transaction
    -- ==================================================================================
    
    BEGIN
        -- Step 1: Unbind from previous equipment (soft delete)
        UPDATE qr_binding
        SET 
            is_active = false,
            unbound_at = v_reassigned_at,
            unbound_by = user_id,
            unbound_reason = reason,
            metadata = COALESCE(metadata, '{}'::jsonb) || 
                       jsonb_build_object(
                           'reassigned_to', new_equipment_id,
                           'reassigned_at', v_reassigned_at
                       )
        WHERE id = v_old_binding_id;
        
        -- Step 2: Create unbind audit log
        INSERT INTO qr_audit_log (
            qr_id,
            event_type,
            event_data,
            user_id,
            farm_id
        ) VALUES (
            v_qr_id,
            'unbound',
            jsonb_build_object(
                'previous_equipment_id', v_old_equipment_id,
                'previous_equipment_name', v_old_equipment_name,
                'previous_binding_id', v_old_binding_id,
                'reason', reason,
                'reassignment', true,
                'new_equipment_id', new_equipment_id
            ),
            user_id,
            v_qr_farm_id
        );
        
        -- Step 3: Create new binding using helper function
        v_new_binding_id := qr_create_binding_internal(
            p_qr_id := v_qr_id,
            p_bindable_type := 'equipment'::bindable_type,
            p_bindable_id := new_equipment_id,
            p_user_id := user_id,
            p_metadata := jsonb_build_object(
                'source', 'reassignment',
                'previous_equipment_id', v_old_equipment_id,
                'previous_equipment_name', v_old_equipment_name,
                'previous_binding_id', v_old_binding_id,
                'reason', reason
            ),
            p_audit_event_type := 'reassigned'
        );
        
        -- Step 4: Build and return success response
        RETURN jsonb_build_object(
            'success', true,
            'message', 'QR code successfully reassigned',
            'data', jsonb_build_object(
                'qr', jsonb_build_object(
                    'id', v_qr_id,
                    'shortCode', v_qr_short_code
                ),
                'previousEquipment', jsonb_build_object(
                    'id', v_old_equipment_id,
                    'name', v_old_equipment_name,
                    'bindingId', v_old_binding_id
                ),
                'newEquipment', jsonb_build_object(
                    'id', new_equipment_id,
                    'name', v_new_equipment_name,
                    'type', v_new_equipment_type,
                    'make', v_new_equipment_make,
                    'model', v_new_equipment_model,
                    'bindingId', v_new_binding_id
                ),
                'farm', jsonb_build_object(
                    'id', v_qr_farm_id,
                    'name', v_farm_name
                ),
                'reassignmentDetails', jsonb_build_object(
                    'reason', reason,
                    'reassignedBy', user_id,
                    'reassignedAt', v_reassigned_at
                )
            )
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback happens automatically
            RETURN jsonb_build_object(
                'success', false,
                'error', jsonb_build_object(
                    'code', 'REASSIGNMENT_FAILED',
                    'message', 'Failed to reassign QR code: ' || SQLERRM
                )
            );
    END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.qr_update_status_with_audit(p_qr_id uuid, p_new_status text, p_user_id uuid, p_event_data jsonb DEFAULT '{}'::jsonb, p_bound_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_farm_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_previous_status TEXT;
  v_qr_record RECORD;
  v_event_type TEXT;
BEGIN
  -- Validate inputs
  IF p_qr_id IS NULL OR p_new_status IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get current QR information
  SELECT status, short_code, print_position, farm
  INTO v_qr_record
  FROM qr
  WHERE id = p_qr_id;
  
  -- Check if QR exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  v_previous_status := v_qr_record.status;
  
  -- Map QR status to event type (for audit log)
  v_event_type := CASE p_new_status
    WHEN 'allocated' THEN 'allocated'
    WHEN 'shipped' THEN 'shipped'
    WHEN 'delivered' THEN 'delivered'
    WHEN 'retired' THEN 'retired'
    WHEN 'defective' THEN 'defective_marked'
    WHEN 'printed' THEN 'printed'
    WHEN 'ready_to_print' THEN 'ready_to_print'
    WHEN 'bound' THEN 'bound'
    WHEN 'unbound' THEN 'unbound'
    WHEN 'scanned' THEN 'scanned'
    WHEN 'recycled' THEN 'recycled'
    ELSE 'scanned' -- Default fallback
  END;
  
  -- Update QR status
  -- When status is 'bound', also update bound_at and farm if provided
  UPDATE qr
  SET 
    status = p_new_status::qr_status,
    bound_at = CASE 
      WHEN p_new_status = 'bound' AND p_bound_at IS NOT NULL THEN p_bound_at
      WHEN p_new_status = 'bound' AND p_bound_at IS NULL THEN NOW()
      ELSE bound_at
    END,
    farm = CASE 
      WHEN p_new_status = 'bound' AND p_farm_id IS NOT NULL THEN p_farm_id
      WHEN p_new_status = 'allocated' AND p_farm_id IS NOT NULL THEN p_farm_id
      ELSE farm
    END,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'status_updated_at', NOW(),
      'status_updated_by', p_user_id,
      'previous_status', v_previous_status
    )
  WHERE id = p_qr_id;
  
  -- Insert audit log
  -- Use p_farm_id if provided (for bound status), otherwise use existing QR farm
  INSERT INTO qr_audit_log (
    id,
    qr_id,
    event_type,
    event_data,
    user_id,
    farm_id,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_qr_id,
    v_event_type::qr_audit_event_type,
    COALESCE(p_event_data, '{}'::jsonb) || jsonb_build_object(
      'previous_status', v_previous_status,
      'new_status', p_new_status,
      'qr_short_code', v_qr_record.short_code,
      'qr_position', v_qr_record.print_position
    ),
    p_user_id,
    COALESCE(p_farm_id, v_qr_record.farm),
    NOW()
  );
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_global_user_permissions(p_user_id uuid, p_required_role text DEFAULT 'super_admin'::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Validate user_id is not NULL
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permissions based on required role
  CASE p_required_role
    WHEN 'super_admin' THEN
      RETURN EXISTS (
        SELECT 1 
        FROM public."user" 
        WHERE id = p_user_id
          AND global_role = 'super_admin'
          AND id IS NOT NULL  -- Prevent access with NULL user
      );
    
    WHEN 'admin' THEN
      RETURN EXISTS (
        SELECT 1 
        FROM public."user" 
        WHERE id = p_user_id
          AND global_role = 'admin'
          AND id IS NOT NULL  -- Prevent access with NULL user
      );
    
    WHEN 'regular_user' THEN
      RETURN EXISTS (
        SELECT 1 
        FROM public."user" 
        WHERE id = p_user_id
          AND global_role = 'regular_user'
          AND id IS NOT NULL  -- Prevent access with NULL user
      );
    
    ELSE
      -- Invalid role specified
      RETURN FALSE;
  END CASE;
END;
$function$
;


