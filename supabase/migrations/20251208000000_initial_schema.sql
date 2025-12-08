


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_hashids" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."bindable_type" AS ENUM (
    'equipment',
    'part',
    'consumable'
);


ALTER TYPE "public"."bindable_type" OWNER TO "postgres";


CREATE TYPE "public"."delivery_batch_status" AS ENUM (
    'requested',
    'allocated',
    'partial',
    'cancelled'
);


ALTER TYPE "public"."delivery_batch_status" OWNER TO "postgres";


CREATE TYPE "public"."file_type_enum" AS ENUM (
    'image',
    'video',
    'document',
    'audio'
);


ALTER TYPE "public"."file_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."global_user_role" AS ENUM (
    'super_admin',
    'admin',
    'regular_user'
);


ALTER TYPE "public"."global_user_role" OWNER TO "postgres";


CREATE TYPE "public"."note_type" AS ENUM (
    'task',
    '_task_series',
    'equipment',
    'part',
    'consumable'
);


ALTER TYPE "public"."note_type" OWNER TO "postgres";


CREATE TYPE "public"."production_batch_status" AS ENUM (
    'ordered',
    'completed'
);


ALTER TYPE "public"."production_batch_status" OWNER TO "postgres";


CREATE TYPE "public"."qr_audit_event_type" AS ENUM (
    'generated',
    'bound',
    'unbound',
    'defective'
);


ALTER TYPE "public"."qr_audit_event_type" OWNER TO "postgres";


CREATE TYPE "public"."qr_status" AS ENUM (
    'generated',
    'bound',
    'defective'
);


ALTER TYPE "public"."qr_status" OWNER TO "postgres";


CREATE TYPE "public"."task_status_type" AS ENUM (
    'open',
    'close'
);


ALTER TYPE "public"."task_status_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."task_status_type" IS 'Status on task';



CREATE TYPE "public"."task_type" AS ENUM (
    'template:maintenance',
    'template:repair',
    'template:todo',
    'maintenance',
    'repair',
    'todo',
    'grouping'
);


ALTER TYPE "public"."task_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."task_type" IS 'Types of work order/task (e.g. repair, maintenance, todo)';



CREATE TYPE "public"."time_type" AS ENUM (
    'schedule:cron',
    'schedule:hours',
    'schedule:distance',
    'datetime',
    'hour',
    'distance'
);


ALTER TYPE "public"."time_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."time_type" IS 'FarmerTitan time units (e.g. hours, miles, etc.)';



CREATE TYPE "public"."user_farm_role" AS ENUM (
    'owner',
    'admin',
    'user',
    'guest'
);


ALTER TYPE "public"."user_farm_role" OWNER TO "postgres";


COMMENT ON TYPE "public"."user_farm_role" IS 'Role of a user in a farm';



CREATE OR REPLACE FUNCTION "public"."add_user_to_farm"("p_user_id" "uuid", "p_farm_id" "uuid", "p_role" "text") RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Validate required parameters
    IF p_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'user_id is required'
        );
    END IF;
    
    IF p_farm_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'farm_id is required'
        );
    END IF;
    
    IF p_role IS NULL OR trim(p_role) = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'role is required'
        );
    END IF;

    -- Validate user exists in user_profiles view
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_user_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User does not exist in user_profiles'
        );
    END IF;

    -- Validate farm exists
    IF NOT EXISTS (SELECT 1 FROM public.farm WHERE id = p_farm_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Farm does not exist'
        );
    END IF;

    -- Validate role is a valid enum value
    IF p_role::TEXT NOT IN ('owner', 'admin', 'user', 'guest') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid role. Valid roles are: owner, admin, user, guest'
        );
    END IF;

    -- Insert into user table (if not exists)
    INSERT INTO public.user (id, global_role)
    VALUES (p_user_id, 'regular_user'::public.global_user_role)
    ON CONFLICT (id) DO NOTHING;

    -- Insert into _farm_user table
    INSERT INTO public._farm_user (farm, "user", role)
    VALUES (p_farm_id, p_user_id, p_role::public.user_farm_role);

    RETURN json_build_object(
        'success', true,
        'message', 'User successfully added to farm',
        'data', json_build_object(
            'user_id', p_user_id,
            'farm_id', p_farm_id,
            'role', p_role
        )
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User is already assigned to this farm'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'An unexpected error occurred: ' || SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."add_user_to_farm"("p_user_id" "uuid", "p_farm_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_work_order"("parent_task_id" "uuid", "completion_date" "date", "created_by_user_id" "uuid", "metadata" "jsonb" DEFAULT NULL::"jsonb", "equipment" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  parent_task RECORD;
  completion_time_id UUID;
  completion_timestamp TIMESTAMP WITH TIME ZONE;
  updated_children_count INTEGER := 0;
  final_metadata JSONB;
  equipment_usage_item RECORD;
  usage_result JSONB;
BEGIN
  -- Convert date to timestamp (start of day in UTC)
  completion_timestamp := completion_date::TIMESTAMP WITH TIME ZONE;

  -- Get parent task and validate it exists
  SELECT * INTO parent_task
  FROM task
  WHERE id = parent_task_id
    AND task.parent_task IS NULL  -- Must be a parent task
    AND type IN ('repair', 'todo');  -- Must be a work order

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work order not found with ID: %. Must be a parent task of type repair or todo.', parent_task_id;
  END IF;

  -- Check if already closed
  IF parent_task.status = 'close' THEN
    RAISE EXCEPTION 'Work order is already closed. Current status: %', parent_task.status;
  END IF;

  -- Create completion time record with custom date
  completion_time_id := create_date_time_record(completion_timestamp, 'task_completion');

  -- Merge existing metadata with new metadata
  final_metadata := COALESCE(parent_task.metadata, '{}'::JSONB);
  IF metadata IS NOT NULL THEN
    final_metadata := final_metadata || metadata;
  END IF;

  -- Update parent task to closed status
  UPDATE task
  SET
    status = 'close'::public.task_status_type,
    completed_at = completion_time_id,
    metadata = final_metadata
  WHERE id = parent_task_id;

  -- Update all child tasks to closed status
  UPDATE task
  SET
    status = 'close'::public.task_status_type,
    completed_at = completion_time_id
  WHERE task.parent_task = parent_task_id;

  -- Get count of updated children
  GET DIAGNOSTICS updated_children_count = ROW_COUNT;

  -- =====================================================================================
  -- STEP 3: UPDATE EQUIPMENT USAGE (if equipment data provided)
  -- =====================================================================================

  IF equipment IS NOT NULL AND equipment ? 'equipment_usage' AND
     jsonb_array_length(equipment->'equipment_usage') > 0 THEN

    FOR equipment_usage_item IN
      SELECT jsonb_array_elements(equipment->'equipment_usage') AS item
    LOOP
      -- Use upsert_equipment_usage to update equipment usage
      SELECT upsert_equipment_usage(
        parent_task.equipment,                      -- p_equipment_id (from parent task)
        (equipment_usage_item.item->>'value')::numeric, -- p_value
        created_by_user_id,                         -- p_user_id
        (equipment_usage_item.item->>'id')::UUID,   -- p_time_id (existing usage_time_id)
        NULL,                                       -- p_type (not needed for existing)
        NULL,                                       -- p_time_metadata (not needed for existing)
        COALESCE(
          equipment_usage_item.item->>'reason',
          'Equipment usage updated from work order closure'
        ),                                          -- p_reason
        NULL,                                       -- p_is_correction (auto-detect)
        NULL,                                       -- p_corrected_log_id
        parent_task_id,                             -- p_task_id (link to work order)
        NULL                                        -- p_log_metadata
      ) INTO usage_result;

      -- Check if usage update was successful
      IF NOT (usage_result->>'success')::boolean THEN
        RAISE EXCEPTION 'Failed to update equipment usage: %', usage_result->>'error_message';
      END IF;
    END LOOP;
  END IF;

  -- Return structured response
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'parent_task_id', parent_task_id,
      'completion_date', completion_date,
      'completion_time_id', completion_time_id,
      'updated_children_count', updated_children_count,
      'previous_status', parent_task.status,
      'new_status', 'close'
    ),
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'close_work_order',
      'completion_timestamp', completion_timestamp
    )
  );
END;
$$;


ALTER FUNCTION "public"."close_work_order"("parent_task_id" "uuid", "completion_date" "date", "created_by_user_id" "uuid", "metadata" "jsonb", "equipment" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_maintenance_task"("task_id" "uuid", "completion_value" "text", "parent_task_id" "uuid", "created_by_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_task RECORD;
  current_schedule_time RECORD;
  completed_time_id UUID;
  new_maintenance_task_id UUID;
  new_task_result JSONB;
  usage_result JSONB;
  equipment_time_id UUID;
BEGIN
  -- Validate required parameters
  IF task_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_TASK_ID',
      'error_message', 'Task ID is required. Please provide a valid task ID.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task'
      )
    );
  END IF;

  IF completion_value IS NULL OR TRIM(completion_value) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_COMPLETION_VALUE',
      'error_message', 'Completion value is required. Please provide a valid completion value.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', task_id
      )
    );
  END IF;

  IF created_by_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_USER_ID',
      'error_message', 'User ID is required. Please provide a valid user ID.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', task_id
      )
    );
  END IF;

  -- Validate that user exists
  IF NOT EXISTS (SELECT 1 FROM "user" WHERE id = created_by_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'USER_NOT_FOUND',
      'error_message', 'User not found. Please verify the user ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', task_id,
        'created_by_user_id', created_by_user_id
      )
    );
  END IF;

  -- Get current task information with task series details
  SELECT 
    t.*,
    ts.id as task_series_id,
    ts.equipment as series_equipment,
    ts.schedule,
    ts._part_type as series_part_type,
    ts._consumable_type as series_consumable_type,
    ts.task_template as series_task_template
  INTO current_task
  FROM task t
  JOIN _task_series ts ON t._task_series = ts.id
  WHERE t.id = complete_maintenance_task.task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TASK_NOT_FOUND',
      'error_message', 'Task not found. Please verify the task ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', complete_maintenance_task.task_id
      )
    );
  END IF;

  -- Get current schedule information
  SELECT * INTO current_schedule_time
  FROM _time 
  WHERE id = current_task.schedule;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SCHEDULE_NOT_FOUND',
      'error_message', 'Task configuration error: schedule not found. Please contact support.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', complete_maintenance_task.task_id
      )
    );
  END IF;

  -- Create equipment usage log entry and get the _time_id for completed_at
  -- Get equipment usage time_id for this equipment
  SELECT eut.usage_time_id 
  INTO equipment_time_id
  FROM equipment_usage_type eut
  WHERE eut.equipment_id = current_task.series_equipment;
  
  IF equipment_time_id IS NULL THEN
    RAISE EXCEPTION 'Equipment usage type not found for equipment: %', current_task.series_equipment;
  END IF;
  
  -- Try to call upsert_equipment_usage and capture any errors
  BEGIN
    SELECT upsert_equipment_usage(
      current_task.series_equipment,           -- p_equipment_id
      completion_value::NUMERIC,               -- p_value
      created_by_user_id,                      -- p_user_id
      equipment_time_id,                       -- p_time_id (existing)
      NULL,                                    -- p_type (not needed)
      NULL,                                    -- p_time_metadata (not needed)
      'Maintenance completed',                 -- p_reason
      NULL,                                    -- p_is_correction
      NULL,                                    -- p_corrected_log_id
      complete_maintenance_task.task_id,       -- p_task_id
      NULL,                                    -- p_log_metadata
      FALSE                                    -- p_is_parent_task (CASO 2B)
    ) INTO usage_result;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UPSERT_EQUIPMENT_USAGE_ERROR',
        'error_message', 'Equipment usage update failed. Please try again or contact support.',
        'error_state', SQLSTATE,
        'debug_info', jsonb_build_object(
          'equipment_id', current_task.series_equipment,
          'completion_value', completion_value,
          'time_id', equipment_time_id,
          'task_id', complete_maintenance_task.task_id
        ),
        'metadata', jsonb_build_object(
          'timestamp', NOW(),
          'operation', 'complete_maintenance_task'
        )
      );
  END;
  
  -- Check if usage update was successful
  IF NOT (usage_result->>'success')::boolean THEN
    RAISE EXCEPTION 'Failed to create equipment usage log: %', usage_result->>'error_message';
  END IF;
  
  -- Get the time_id from the result for completed_at
  completed_time_id := (usage_result->'data'->>'time_id')::UUID;

  -- Update current task: close it and associate with grouping
  UPDATE task 
  SET 
    status = 'close',
    completed_at = completed_time_id,
    parent_task = parent_task_id
  WHERE id = complete_maintenance_task.task_id;

  -- Create new maintenance task (next cycle) using template name/description/part_type
  SELECT create_maintenance_task_instance(
    current_task.task_series_id,
    current_task.series_equipment,
    current_task.name,
    current_task.description,
    current_task.series_part_type,
    current_task.series_consumable_type,
    current_task.part_number  -- Use current task part_type, fallback to template
  ) INTO new_task_result;

  -- Check if task creation was successful and extract the new task ID
  IF NOT (new_task_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TASK_CREATION_FAILED',
      'error_message', 'Failed to create next maintenance task: ' || (new_task_result->>'error_message'),
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', complete_maintenance_task.task_id
      )
    );
  END IF;

  -- Extract the new task ID from the result
  new_maintenance_task_id := (new_task_result->'data'->>'id')::UUID;

  -- Return structured success result
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'completed_task_id', complete_maintenance_task.task_id,
      'new_task_id', new_maintenance_task_id,
      'completion_value', completion_value::NUMERIC
    ),
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'complete_maintenance_task',
      'version', '2.0'
    )
  );

EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', complete_maintenance_task.task_id
      )
    );
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FOREIGN_KEY_ERROR',
      'error_message', 'Invalid reference data provided. Please check your input and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', complete_maintenance_task.task_id
      )
    );
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_ERROR',
      'error_message', 'Duplicate task detected. A task with these parameters already exists.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', complete_maintenance_task.task_id
      )
    );
  WHEN not_null_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NULL_VALUE_ERROR',
      'error_message', 'Required field cannot be null. Please check your input and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', complete_maintenance_task.task_id
      )
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNEXPECTED_ERROR',
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'complete_maintenance_task',
        'task_id', complete_maintenance_task.task_id
      )
    );
END;
$$;


ALTER FUNCTION "public"."complete_maintenance_task"("task_id" "uuid", "completion_value" "text", "parent_task_id" "uuid", "created_by_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_date_time_record"("date_time" timestamp with time zone DEFAULT NULL::timestamp with time zone, "purpose" "text" DEFAULT 'task_completion'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  time_id UUID;
  final_date_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Use provided time or current time
  final_date_time := COALESCE(date_time, NOW());
  
  INSERT INTO _time (
    type,
    value,
    metadata
  ) VALUES (
    'datetime'::public.time_type,
    final_date_time::TEXT,
    jsonb_build_object('created_for', purpose)
  ) RETURNING id INTO time_id;
  
  RETURN time_id;
END;
$$;


ALTER FUNCTION "public"."create_date_time_record"("date_time" timestamp with time zone, "purpose" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_task"("p_equipment_type_id" "uuid", "p_task_name" "text", "p_time_type" "text", "p_time_interval" "text", "p_equipment_make_id" "uuid" DEFAULT NULL::"uuid", "p_equipment_model_id" "uuid" DEFAULT NULL::"uuid", "p_part_type_id" "uuid" DEFAULT NULL::"uuid", "p_consumable_type_id" "uuid" DEFAULT NULL::"uuid", "p_task_description" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_equipment_id UUID;
  v_time_id UUID;
  v_task_template_id UUID;
  v_task_series_id UUID;
  v_metadata_time JSONB;
  v_task_name_slug TEXT;
  v_interval_numeric NUMERIC;
BEGIN
  -- =====================================================================================
  -- STEP 1: VALIDATE REQUIRED PARAMETERS
  -- =====================================================================================

  IF p_equipment_type_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_EQUIPMENT_TYPE',
      'error_message', '_equipment_type_id is required and cannot be NULL',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task'
      )
    );
  END IF;

  IF p_task_name IS NULL OR TRIM(p_task_name) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_TASK_NAME',
      'error_message', 'task_name is required and cannot be empty',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id
      )
    );
  END IF;

  IF p_time_type IS NULL OR TRIM(p_time_type) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_TIME_TYPE',
      'error_message', 'time_type is required and cannot be empty',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id
      )
    );
  END IF;

  IF p_time_interval IS NULL OR TRIM(p_time_interval) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_TIME_INTERVAL',
      'error_message', 'time_interval is required and cannot be empty',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id
      )
    );
  END IF;

  -- =====================================================================================
  -- STEP 2: VALIDATE time_type (must be schedule:hours or schedule:distance)
  -- =====================================================================================

  IF p_time_type NOT IN ('schedule:hours', 'schedule:distance') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TIME_TYPE',
      'error_message', 'time_type must be either "schedule:hours" or "schedule:distance"',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id,
        'provided_time_type', p_time_type
      )
    );
  END IF;

  -- Build metadata_time based on time_type
  IF p_time_type = 'schedule:distance' THEN
    v_metadata_time := '{"units": "kilometers"}'::JSONB;
  ELSE -- schedule:hours
    v_metadata_time := '{"source": "engine_hours"}'::JSONB;
  END IF;

  -- =====================================================================================
  -- STEP 3: VALIDATE time_interval is numeric
  -- =====================================================================================

  BEGIN
    v_interval_numeric := p_time_interval::NUMERIC;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_TIME_INTERVAL',
        'error_message', 'time_interval must be a valid numeric value',
        'metadata', jsonb_build_object(
          'timestamp', NOW(),
          'operation', 'create_default_task',
          '_equipment_type_id', p_equipment_type_id,
          'provided_time_interval', p_time_interval
        )
      );
  END;

  -- =====================================================================================
  -- STEP 4: VALIDATE FOREIGN KEY REFERENCES
  -- =====================================================================================

  -- Validate _equipment_type exists
  IF NOT EXISTS (SELECT 1 FROM _equipment_type WHERE id = p_equipment_type_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EQUIPMENT_TYPE_NOT_FOUND',
      'error_message', '_equipment_type_id does not exist in catalog',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id
      )
    );
  END IF;

  -- Validate _equipment_make exists if provided
  IF p_equipment_make_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM _equipment_make WHERE id = p_equipment_make_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EQUIPMENT_MAKE_NOT_FOUND',
      'error_message', '_equipment_make_id does not exist in catalog',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id,
        '_equipment_make_id', p_equipment_make_id
      )
    );
  END IF;

  -- Validate _equipment_model exists if provided
  IF p_equipment_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM _equipment_model WHERE id = p_equipment_model_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EQUIPMENT_MODEL_NOT_FOUND',
      'error_message', '_equipment_model_id does not exist in catalog',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id,
        '_equipment_model_id', p_equipment_model_id
      )
    );
  END IF;

  -- Validate _part_type exists if provided
  IF p_part_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM _part_type WHERE id = p_part_type_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PART_TYPE_NOT_FOUND',
      'error_message', '_part_type_id does not exist in catalog',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id,
        '_part_type_id', p_part_type_id
      )
    );
  END IF;

  -- Validate _consumable_type exists if provided
  IF p_consumable_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM _consumable_type WHERE id = p_consumable_type_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONSUMABLE_TYPE_NOT_FOUND',
      'error_message', '_consumable_type_id does not exist in catalog',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id,
        '_consumable_type_id', p_consumable_type_id
      )
    );
  END IF;

  -- =====================================================================================
  -- STEP 5: GET OR CREATE _equipment CATALOG ENTRY (if make/model provided)
  -- =====================================================================================

  IF p_equipment_make_id IS NOT NULL OR p_equipment_model_id IS NOT NULL THEN
    -- Call upsert_equipment_catalog to get or create _equipment
    BEGIN
      v_equipment_id := upsert_equipment_catalog(
        p_equipment_type_id := p_equipment_type_id,
        p_equipment_make_id := p_equipment_make_id,
        p_equipment_model_id := p_equipment_model_id
      );
    EXCEPTION
      WHEN OTHERS THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'EQUIPMENT_UPSERT_FAILED',
          'error_message', 'Failed to get or create _equipment catalog entry: ' || SQLERRM,
          'metadata', jsonb_build_object(
            'timestamp', NOW(),
            'operation', 'create_default_task',
            '_equipment_type_id', p_equipment_type_id,
            '_equipment_make_id', p_equipment_make_id,
            '_equipment_model_id', p_equipment_model_id
          )
        );
    END;
  ELSE
    v_equipment_id := NULL;
  END IF;

  -- =====================================================================================
  -- STEP 6: CREATE RECORDS (_time, task template, _task_series)
  -- =====================================================================================

  -- 6.1: Create _time record
  INSERT INTO _time (
    created_at,
    type,
    metadata,
    value
  ) VALUES (
    NOW(),
    p_time_type::public.time_type,
    v_metadata_time,
    p_time_interval
  )
  RETURNING id INTO v_time_id;

  -- Generate task name slug (uppercase with underscores)
  v_task_name_slug := UPPER(REPLACE(TRIM(p_task_name), ' ', '_'));

  -- 6.2: Create task template
  INSERT INTO task (
    created_at,
    type,
    name,
    description,
    metadata,
    _equipment,
    _equipment_type,
    _part_type,
    _consumable_type
  ) VALUES (
    NOW(),
    'template:maintenance',
    v_task_name_slug,
    COALESCE(p_task_description, p_task_name),
    '{"is_initial_task": true}'::JSONB,
    v_equipment_id,
    p_equipment_type_id,
    p_part_type_id,
    p_consumable_type_id
  )
  RETURNING id INTO v_task_template_id;

  -- 6.3: Create _task_series
  INSERT INTO _task_series (
    created_at,
    schedule,
    type,
    task_template,
    _equipment_type,
    _equipment,
    _part_type,
    _consumable_type
  ) VALUES (
    NOW(),
    v_time_id,
    'template:maintenance',
    v_task_template_id,
    p_equipment_type_id,
    v_equipment_id,
    p_part_type_id,
    p_consumable_type_id
  )
  RETURNING id INTO v_task_series_id;

  -- =====================================================================================
  -- STEP 7: RETURN SUCCESS RESPONSE
  -- =====================================================================================

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      '_time_id', v_time_id,
      'task_template_id', v_task_template_id,
      'task_series_id', v_task_series_id,
      '_equipment_id', v_equipment_id,
      'task_name_slug', v_task_name_slug,
      'time_metadata', v_metadata_time
    ),
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'create_default_task',
      'version', '1.0',
      'input_parameters', jsonb_build_object(
        '_equipment_type_id', p_equipment_type_id,
        '_equipment_make_id', p_equipment_make_id,
        '_equipment_model_id', p_equipment_model_id,
        '_part_type_id', p_part_type_id,
        '_consumable_type_id', p_consumable_type_id,
        'task_name', p_task_name,
        'time_type', p_time_type,
        'time_interval', p_time_interval
      )
    )
  );

EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FOREIGN_KEY_ERROR',
      'error_message', 'Invalid reference data provided: ' || SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id
      )
    );
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_ERROR',
      'error_message', 'Duplicate default task detected: ' || SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id
      )
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNEXPECTED_ERROR',
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_default_task',
        '_equipment_type_id', p_equipment_type_id
      )
    );
END;
$$;


ALTER FUNCTION "public"."create_default_task"("p_equipment_type_id" "uuid", "p_task_name" "text", "p_time_type" "text", "p_time_interval" "text", "p_equipment_make_id" "uuid", "p_equipment_model_id" "uuid", "p_part_type_id" "uuid", "p_consumable_type_id" "uuid", "p_task_description" "text") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."create_equipment"("equipment_name" "text", "equipment_model_id" "uuid", "make_id" "uuid", "equipment_type_id" "uuid", "farm_id" "uuid", "maintenance_items" "jsonb", "initial_usage" "jsonb", "created_by_user_id" "uuid", "serial_number" "text" DEFAULT NULL::"text", "year_purchased" smallint DEFAULT NULL::smallint, "lease_owned" boolean DEFAULT NULL::boolean, "warranty_time" "text" DEFAULT NULL::"text", "warranty_details" "text" DEFAULT NULL::"text", "custom_checklists" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$

DECLARE
  validated_equipment_id UUID;
  new_equipment_id UUID;
  new_equipment RECORD;
  maintenance_item JSONB;
  maintenance_id UUID;
  maintenance_type TEXT;
  maintenance_name TEXT;
  maintenance_description TEXT;
  maintenance_part_number TEXT;
  task_series_id UUID;
  initial_template_task_id UUID;
  initial_task_id UUID;
  usage_time_id UUID;
BEGIN
  -- 1. Validate equipment lookup using type, make, and model
  SELECT validate_equipment_combination(
    equipment_model_id,
    make_id,
    equipment_type_id
  ) INTO validated_equipment_id;
  
  IF validated_equipment_id IS NULL THEN
    RAISE EXCEPTION 'Invalid equipment combination - Model: %, Make: %, Type: %', 
      equipment_model_id, make_id, equipment_type_id;
  END IF;

  -- 1.1. Validate warranty requirements when lease_owned is true
  IF lease_owned = true THEN
    IF warranty_time IS NULL OR warranty_time = '' THEN
      RAISE EXCEPTION 'warranty_time is required when lease_owned is true';
    END IF;
    
    IF warranty_details IS NULL OR warranty_details = '' THEN
      RAISE EXCEPTION 'warranty_details is required when lease_owned is true';
    END IF;
  END IF;

  -- 2. Create equipment record
  INSERT INTO equipment (
    name,
    serial_number,
    year_purchased,
    _equipment,
    farm,
    metadata
  ) VALUES (
    equipment_name,
    serial_number,
    year_purchased,
    validated_equipment_id,
    farm_id,
    jsonb_build_object(
      'lease_owned', lease_owned,
      'warranty_time', warranty_time,
      'warranty_details', warranty_details,
      'custom_checklists', custom_checklists,
      'equipment_type_id', equipment_type_id,
      'make_id', make_id,
      'equipment_model_id', equipment_model_id
    )
  )
  RETURNING equipment.id, equipment.name, equipment.serial_number, equipment.year_purchased,
           equipment.farm, equipment.created_at, equipment.metadata
  INTO new_equipment;

  -- Get the new equipment ID for maintenance records
  new_equipment_id := new_equipment.id;

  -- 3. Create initial usage tracking for multiple usage types
  DECLARE
    usage_result JSONB;
    usage_item JSONB;
  BEGIN
    -- Loop through initial_usage array
    IF initial_usage IS NOT NULL AND jsonb_array_length(initial_usage) > 0 THEN
      FOR usage_item IN SELECT * FROM jsonb_array_elements(initial_usage)
      LOOP
        SELECT upsert_equipment_usage(
          new_equipment_id,                        -- p_equipment_id
          (usage_item->>'value')::numeric,         -- p_value  
          created_by_user_id,                      -- p_user_id
          NULL,                                    -- p_time_id (NULL for new equipment)
          usage_item->>'type',                     -- p_type (hour, kilometer, etc.)
          generate_initial_usage_metadata(usage_item->>'type'), -- p_time_metadata (standardized)
          'Initial equipment setup'                -- p_reason
        ) INTO usage_result;
        
        -- Check if usage creation was successful
        IF NOT (usage_result->>'success')::boolean THEN
          RAISE EXCEPTION 'Failed to create equipment usage (type: %): %', 
            usage_item->>'type', usage_result->>'error_message';
        END IF;
      END LOOP;
    END IF;
  END;

  -- 6. Create maintenance schedules for each selected item
  IF jsonb_array_length(maintenance_items) > 0 THEN
    FOR maintenance_item IN SELECT * FROM jsonb_array_elements(maintenance_items)
    LOOP
      -- Extract maintenance data from JSONB
      -- Only use maintenance_id if BOTH id and maintenance_type exist
      maintenance_id := CASE 
        WHEN (maintenance_item->>'id') IS NOT NULL 
         AND (maintenance_item->>'maintenance_type') IS NOT NULL 
        THEN (maintenance_item->>'id')::UUID 
        ELSE NULL 
      END;
      
      maintenance_type := CASE 
        WHEN (maintenance_item->>'id') IS NOT NULL 
         AND (maintenance_item->>'maintenance_type') IS NOT NULL 
        THEN maintenance_item->>'maintenance_type'
        ELSE NULL 
      END;
      
      maintenance_name := maintenance_item->>'name';
      maintenance_description := maintenance_item->>'description';
      maintenance_part_number := maintenance_item->>'part_number';

      -- Create template, series and initial task using extracted functions
      DECLARE
        template_result JSONB;
      BEGIN
        SELECT create_task_template_with_series(
          new_equipment_id,
          farm_id,
          maintenance_description,
          maintenance_item->'schedule',
          created_by_user_id,
          CASE WHEN maintenance_type = 'part_type' THEN maintenance_id ELSE NULL END,
          CASE WHEN maintenance_type = 'consumable_type' THEN maintenance_id ELSE NULL END,
          maintenance_part_number
        ) INTO template_result;

        -- Check if template creation was successful
        IF NOT (template_result->>'success')::boolean THEN
          RAISE EXCEPTION 'Failed to create task template for maintenance item "%": %', 
            COALESCE(maintenance_name, maintenance_description), template_result->>'error_message';
        END IF;

        -- Extract IDs from the result
        initial_template_task_id := (template_result->'data'->>'template_id')::UUID;
        task_series_id := (template_result->'data'->>'series_id')::UUID;
        
      EXCEPTION
        WHEN OTHERS THEN
          -- Re-raise with more context about which maintenance item failed
          RAISE EXCEPTION 'Error creating template for maintenance item "%" (type: %): %',
            COALESCE(maintenance_name, maintenance_description),
            COALESCE(maintenance_type, 'unknown'),
            SQLERRM;
      END;

      -- Create initial maintenance task instance
      DECLARE
        task_result JSONB;
      BEGIN
        SELECT create_maintenance_task_instance(
          task_series_id,
          new_equipment_id,
          COALESCE(maintenance_name, UPPER(REPLACE(maintenance_description, ' ', '_'))),
          maintenance_description,
          CASE WHEN maintenance_type = 'part_type' THEN maintenance_id ELSE NULL END,
          CASE WHEN maintenance_type = 'consumable_type' THEN maintenance_id ELSE NULL END,
          maintenance_part_number
        ) INTO task_result;

        -- Check if task creation was successful
        IF NOT (task_result->>'success')::boolean THEN
          RAISE EXCEPTION 'Failed to create maintenance task instance for "%": %', 
            COALESCE(maintenance_name, maintenance_description), task_result->>'error_message';
        END IF;

        -- Extract the task ID from the result
        initial_task_id := (task_result->'data'->>'id')::UUID;
        
      EXCEPTION
        WHEN OTHERS THEN
          -- Re-raise with more context about which maintenance item failed
          RAISE EXCEPTION 'Error creating task instance for maintenance item "%" (type: %): %',
            COALESCE(maintenance_name, maintenance_description),
            COALESCE(maintenance_type, 'unknown'),
            SQLERRM;
      END;
    END LOOP;
  END IF;

  -- 7. Return structured success result
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', new_equipment.id,
      'name', new_equipment.name,
      'serial_number', new_equipment.serial_number,
      'year_purchased', new_equipment.year_purchased,
      'farm_id', new_equipment.farm,
      'created_at', new_equipment.created_at,
      'metadata', new_equipment.metadata,
      'maintenance_tasks_created', CASE 
        WHEN maintenance_items IS NOT NULL AND jsonb_array_length(maintenance_items) > 0 
        THEN jsonb_array_length(maintenance_items) 
        ELSE 0 
      END
    ),
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'create_equipment',
      'version', '2.0'
    )
  );

EXCEPTION
  WHEN SQLSTATE 'P0001' THEN  -- Custom exceptions (RAISE EXCEPTION)
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'BUSINESS_LOGIC_ERROR',
      'error_message', SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_equipment',
        'equipment_name', equipment_name,
        'lease_owned', lease_owned,
        'warranty_time', warranty_time,
        'warranty_details', warranty_details
      )
    );
  WHEN check_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_equipment',
        'equipment_name', equipment_name
      )
    );
  WHEN invalid_text_representation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_USAGE_TYPE',
      'error_message', 'Invalid usage type in initial_usage. Valid values are: hour, day, month, year, kilometer, mile',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_equipment',
        'equipment_name', equipment_name,
        'initial_usage', initial_usage
      )
    );
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FOREIGN_KEY_ERROR',
      'error_message', 'Referenced record not found - check model_id, make_id, type_id, or farm_id',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_equipment',
        'equipment_name', equipment_name,
        'model_id', equipment_model_id,
        'make_id', make_id,
        'type_id', equipment_type_id,
        'farm_id', farm_id
      )
    );
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_ERROR',
      'error_message', 'Equipment with this serial number already exists',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_equipment',
        'equipment_name', equipment_name,
        'serial_number', serial_number
      )
    );
  WHEN not_null_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NULL_VALUE_ERROR',
      'error_message', 'Required field cannot be null: ' || SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_equipment',
        'equipment_name', equipment_name
      )
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNEXPECTED_ERROR',
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_equipment',
        'equipment_name', equipment_name
      )
    );
END;
$$;


ALTER FUNCTION "public"."create_equipment"("equipment_name" "text", "equipment_model_id" "uuid", "make_id" "uuid", "equipment_type_id" "uuid", "farm_id" "uuid", "maintenance_items" "jsonb", "initial_usage" "jsonb", "created_by_user_id" "uuid", "serial_number" "text", "year_purchased" smallint, "lease_owned" boolean, "warranty_time" "text", "warranty_details" "text", "custom_checklists" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_farm_with_user"("farm_name" "text", "acres" integer, "user_id" "uuid", "role" "text" DEFAULT 'owner'::"text", "metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "record"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_farm_id UUID;
  farm_record RECORD;
BEGIN
  INSERT INTO farm (name, acres, metadata, created_at)
    VALUES (farm_name, acres, metadata, NOW())
    RETURNING id INTO new_farm_id;

  INSERT INTO _farm_user (farm, "user", role, created_at)
    VALUES (new_farm_id, user_id, role::user_farm_role, NOW());

  SELECT farm.id, farm.name, farm.acres, farm.metadata, farm.created_at
    INTO farm_record
    FROM farm
    WHERE farm.id = new_farm_id;

  RETURN farm_record;
END;
$$;


ALTER FUNCTION "public"."create_farm_with_user"("farm_name" "text", "acres" integer, "user_id" "uuid", "role" "text", "metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation_with_shortcode"("p_farm_id" "uuid", "p_role" "text", "p_expires_at" timestamp with time zone) RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_new_id uuid;
  v_short_code text;
  v_result record;
BEGIN
  -- Validate farm exists
  IF NOT EXISTS (SELECT 1 FROM farm WHERE id = p_farm_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Farm not found'
    );
  END IF;

  -- Validate role
  IF p_role NOT IN ('owner', 'admin', 'user', 'guest') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid role. Must be: owner, admin, user, or guest'
    );
  END IF;

  -- Generate new invitation ID
  v_new_id := gen_random_uuid();
  
  -- Generate short_code using pg_hashids
  -- Uses farm_id + invitation_id combination for uniqueness
  v_short_code := id_encode(
    ('x' || md5(p_farm_id::text || v_new_id::text))::bit(64)::bigint,
    'farmInvite2025',
    8
  );
  
  -- Insert invitation with short_code
  INSERT INTO invitation (
    id,
    farm,
    role,
    expires_at,
    short_code,
    created_at
  ) VALUES (
    v_new_id,
    p_farm_id,
    p_role::user_farm_role,
    p_expires_at,
    v_short_code,
    NOW()
  );
  
  -- Get full invitation with farm details
  SELECT 
    i.id,
    i.farm,
    i.role,
    i.expires_at,
    i.short_code,
    i.created_at,
    f.name as farm_name
  INTO v_result
  FROM invitation i
  JOIN farm f ON i.farm = f.id
  WHERE i.id = v_new_id;
  
  -- Return success with invitation data
  RETURN json_build_object(
    'success', true,
    'data', row_to_json(v_result)
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Duplicate short_code generated. Please try again.'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."create_invitation_with_shortcode"("p_farm_id" "uuid", "p_role" "text", "p_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_maintenance_task_instance"("task_series_id" "uuid", "equipment_id" "uuid", "task_name" "text", "task_description" "text", "part_type_id" "uuid" DEFAULT NULL::"uuid", "consumable_type_id" "uuid" DEFAULT NULL::"uuid", "part_number" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_task_id UUID;
  created_task RECORD;
BEGIN
  -- Validate required parameters
  IF task_series_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_TASK_SERIES_ID',
      'error_message', 'Task series ID is required. Please provide a valid task series ID.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_maintenance_task_instance'
      )
    );
  END IF;

  IF equipment_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_EQUIPMENT_ID',
      'error_message', 'Equipment ID is required. Please provide a valid equipment ID.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_maintenance_task_instance',
        'task_series_id', task_series_id
      )
    );
  END IF;

  IF task_name IS NULL OR TRIM(task_name) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', 'Task name cannot be empty. Please provide a valid task name.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_maintenance_task_instance',
        'task_series_id', task_series_id,
        'equipment_id', equipment_id
      )
    );
  END IF;

  IF task_description IS NULL OR TRIM(task_description) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', 'Task description cannot be empty. Please provide a valid task description.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_maintenance_task_instance',
        'task_series_id', task_series_id,
        'equipment_id', equipment_id
      )
    );
  END IF;

  -- Validate that task_series exists
  IF NOT EXISTS (SELECT 1 FROM _task_series WHERE id = task_series_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TASK_SERIES_NOT_FOUND',
      'error_message', 'Task series not found. Please verify the task series ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_maintenance_task_instance',
        'task_series_id', task_series_id,
        'equipment_id', equipment_id
      )
    );
  END IF;

  -- Validate that equipment exists
  IF NOT EXISTS (SELECT 1 FROM equipment WHERE id = equipment_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EQUIPMENT_NOT_FOUND',
      'error_message', 'Equipment not found. Please verify the equipment ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_maintenance_task_instance',
        'task_series_id', task_series_id,
        'equipment_id', equipment_id
      )
    );
  END IF;

  -- Generate UUID for new task
  new_task_id := gen_random_uuid();
  
  -- Create maintenance task instance
  INSERT INTO task (
    id,
    _task_series,
    equipment,
    priority,
    status,
    metadata,
    type,
    name,
    description,
    _part_type,
    _consumable_type,
    part_number
  ) VALUES (
    new_task_id,
    task_series_id,
    equipment_id,
    'low',                    -- Default priority
    'open',                   -- Status 'open'
    NULL,                     -- metadata NULL
    'maintenance',
    task_name,
    task_description,
    part_type_id,
    consumable_type_id,
    part_number
  );

  -- Get the created task record
  SELECT * INTO created_task
  FROM task 
  WHERE id = new_task_id;

  -- Return success response with complete task data
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', created_task.id,
      'name', created_task.name,
      'description', created_task.description,
      'type', created_task.type,
      'status', created_task.status,
      'priority', created_task.priority,
      'part_number', created_task.part_number,
      'created_at', created_task.created_at,
      '_task_series', created_task._task_series,
      'equipment', created_task.equipment,
      '_part_type', created_task._part_type,
      '_consumable_type', created_task._consumable_type
    ),
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'create_maintenance_task_instance',
      'version', '2.0',
      'task_series_id', task_series_id,
      'equipment_id', equipment_id,
      'created_fields', jsonb_build_object(
        'task_name', task_name IS NOT NULL,
        'task_description', task_description IS NOT NULL,
        'part_type_id', part_type_id IS NOT NULL,
        'consumable_type_id', consumable_type_id IS NOT NULL,
        'part_number', part_number IS NOT NULL
      )
    )
  );

EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FOREIGN_KEY_ERROR',
      'error_message', 'Invalid reference data provided. Please check your input and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_maintenance_task_instance',
        'task_series_id', task_series_id,
        'equipment_id', equipment_id
      )
    );
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_ERROR',
      'error_message', 'Duplicate task detected. A task with these parameters already exists.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_maintenance_task_instance',
        'task_series_id', task_series_id,
        'equipment_id', equipment_id
      )
    );
  WHEN check_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_maintenance_task_instance',
        'task_series_id', task_series_id,
        'equipment_id', equipment_id
      )
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNEXPECTED_ERROR',
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_maintenance_task_instance',
        'task_series_id', task_series_id,
        'equipment_id', equipment_id
      )
    );
END;
$$;


ALTER FUNCTION "public"."create_maintenance_task_instance"("task_series_id" "uuid", "equipment_id" "uuid", "task_name" "text", "task_description" "text", "part_type_id" "uuid", "consumable_type_id" "uuid", "part_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_production_batch"("p_quantity" integer, "p_supplier_id" "uuid", "p_user_id" "uuid", "p_notes" "text" DEFAULT ''::"text") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."create_production_batch"("p_quantity" integer, "p_supplier_id" "uuid", "p_user_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_task_template_with_series"("equipment_id" "uuid", "farm_id" "uuid", "task_description" "text", "schedule_data" "jsonb", "created_by_user_id" "uuid", "part_type_id" "uuid" DEFAULT NULL::"uuid", "consumable_type_id" "uuid" DEFAULT NULL::"uuid", "template_part_number" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_template_id UUID;
  new_series_id UUID;
  new_time_record_id UUID;
  task_name TEXT;
BEGIN
  -- Validate required parameters
  IF equipment_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_EQUIPMENT_ID',
      'error_message', 'Equipment ID is required. Please provide a valid equipment ID.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series'
      )
    );
  END IF;

  IF farm_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_FARM_ID',
      'error_message', 'Farm ID is required. Please provide a valid farm ID.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id
      )
    );
  END IF;

  IF task_description IS NULL OR TRIM(task_description) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', 'Task description cannot be empty. Please provide a valid task description.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id
      )
    );
  END IF;

  IF schedule_data IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_SCHEDULE_DATA',
      'error_message', 'Schedule data is required. Please provide valid schedule information.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id
      )
    );
  END IF;

  IF created_by_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_USER_ID',
      'error_message', 'User ID is required. Please provide a valid user ID.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id
      )
    );
  END IF;

  -- Validate that equipment exists
  IF NOT EXISTS (SELECT 1 FROM equipment WHERE id = equipment_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EQUIPMENT_NOT_FOUND',
      'error_message', 'Equipment not found. Please verify the equipment ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id
      )
    );
  END IF;

  -- Validate that farm exists
  IF NOT EXISTS (SELECT 1 FROM farm WHERE id = farm_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FARM_NOT_FOUND',
      'error_message', 'Farm not found. Please verify the farm ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id
      )
    );
  END IF;

  -- Validate that user exists
  IF NOT EXISTS (SELECT 1 FROM "user" WHERE id = created_by_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'USER_NOT_FOUND',
      'error_message', 'User not found. Please verify the user ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id,
        'created_by_user_id', created_by_user_id
      )
    );
  END IF;

  -- Validate that part_type exists if provided
  IF part_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM _part_type WHERE id = part_type_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PART_TYPE_NOT_FOUND',
      'error_message', 'Part type not found. Please verify the part type ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id,
        'part_type_id', part_type_id
      )
    );
  END IF;

  -- Validate that consumable_type exists if provided
  IF consumable_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM _consumable_type WHERE id = consumable_type_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CONSUMABLE_TYPE_NOT_FOUND',
      'error_message', 'Consumable type not found. Please verify the consumable type ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id,
        'consumable_type_id', consumable_type_id
      )
    );
  END IF;

  -- Generate UUIDs
  new_template_id := gen_random_uuid();
  new_series_id := gen_random_uuid();
  new_time_record_id := gen_random_uuid();
  
  -- Generate task name (slug format: uppercase with underscores)
  task_name := UPPER(REPLACE(task_description, ' ', '_'));

  -- Create _time record for schedule
  INSERT INTO _time (
    id,
    type,
    value,
    metadata
  ) VALUES (
    new_time_record_id,
    (schedule_data->>'type')::public.time_type,
    schedule_data->>'value',
    (schedule_data->'metadata')::JSONB
  );

  -- Create task template
  INSERT INTO task (
    id,
    equipment,
    metadata,
    type,
    name,
    description,
    _part_type,
    _consumable_type,
    part_number
  ) VALUES (
    new_template_id,
    equipment_id,
    jsonb_build_object('is_initial_task', true),
    'template:maintenance',
    task_name,
    task_description,
    part_type_id,
    consumable_type_id,
    template_part_number
  );

  -- Create task series
  INSERT INTO _task_series (
    id,
    schedule,
    type,
    equipment,
    created_in,
    task_template,
    _part_type,
    _consumable_type,
    created_by
  ) VALUES (
    new_series_id,
    new_time_record_id,
    'maintenance',
    equipment_id,
    farm_id,
    new_template_id,
    part_type_id,
    consumable_type_id,
    created_by_user_id
  );

  -- Return success response with complete data
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'template_id', new_template_id,
      'series_id', new_series_id,
      'time_record_id', new_time_record_id,
      'task_name', task_name,
      'task_description', task_description,
      'schedule_data', schedule_data
    ),
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'create_task_template_with_series',
      'version', '2.0',
      'equipment_id', equipment_id,
      'farm_id', farm_id,
      'created_by_user_id', created_by_user_id,
      'created_fields', jsonb_build_object(
        'template_part_number', template_part_number IS NOT NULL,
        'part_type_id', part_type_id IS NOT NULL,
        'consumable_type_id', consumable_type_id IS NOT NULL
      )
    )
  );

EXCEPTION
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FOREIGN_KEY_ERROR',
      'error_message', 'Invalid reference data provided. Please check your input and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id
      )
    );
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_ERROR',
      'error_message', 'Duplicate template detected. A template with these parameters already exists.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id
      )
    );
  WHEN check_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id
      )
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNEXPECTED_ERROR',
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'create_task_template_with_series',
        'equipment_id', equipment_id,
        'farm_id', farm_id
      )
    );
END;
$$;


ALTER FUNCTION "public"."create_task_template_with_series"("equipment_id" "uuid", "farm_id" "uuid", "task_description" "text", "schedule_data" "jsonb", "created_by_user_id" "uuid", "part_type_id" "uuid", "consumable_type_id" "uuid", "template_part_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_work_order"("equipment_id" "uuid", "type" "text", "items" "jsonb", "status" "text", "created_by_user_id" "uuid", "name" "text" DEFAULT NULL::"text", "description" "text" DEFAULT NULL::"text", "priority" "text" DEFAULT NULL::"text", "assigned_to" "uuid" DEFAULT NULL::"uuid", "due_date" "text" DEFAULT NULL::"text", "equipment" "jsonb" DEFAULT NULL::"jsonb", "attachments" "jsonb" DEFAULT NULL::"jsonb", "metadata" "jsonb" DEFAULT NULL::"jsonb", "completion_date" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  parent_id UUID := gen_random_uuid();
  child_id UUID;
  child_ids UUID[] := ARRAY[]::UUID[];
  parent_task RECORD;
  item JSONB;
  completed_time_id UUID := NULL;
  due_time_id UUID := NULL;
  metadata_obj JSONB;
  attachment_item JSONB;
  equipment_usage_item RECORD;
  usage_result JSONB;
BEGIN
  -- Validate type
  IF type NOT IN ('repair', 'todo') THEN
    RAISE EXCEPTION 'Invalid type: %. Must be ''repair'' or ''todo''', type;
  END IF;
  
  -- Validate completion_date when status is close
  IF status::public.task_status_type = 'close' AND completion_date IS NULL THEN
    RAISE EXCEPTION 'completion_date is required when status is ''close''';
  END IF;
  
  -- Ignore equipment and completion_date when status is open
  IF status::public.task_status_type = 'open' THEN
    equipment := NULL;
    completion_date := NULL;
  END IF;

  -- Create completion time record if status is close
  IF status::public.task_status_type = 'close' THEN
    completed_time_id := create_date_time_record(completion_date::TIMESTAMP WITH TIME ZONE, 'task_completion');
  END IF;
  
  -- Create due date time record if due_date is provided
  IF due_date IS NOT NULL THEN
    due_time_id := create_date_time_record(due_date::TIMESTAMP WITH TIME ZONE, 'due_date');
  END IF;

  -- Initialize metadata with custom metadata or empty object
  metadata_obj := COALESCE(metadata, '{}'::JSONB);

  -- Insert parent task
  INSERT INTO task (
    id,
    type,
    name,
    description,
    priority,
    status,
    equipment,
    metadata,
    completed_at,
    due_at
  ) VALUES (
    parent_id,
    type::public.task_type,
    name,
    description,
    priority,
    status::public.task_status_type,
    equipment_id,
    metadata_obj,
    completed_time_id,
    due_time_id
  ) RETURNING * INTO parent_task;

  -- Insert child tasks for each item
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    child_id := gen_random_uuid();
    
    INSERT INTO task (
      id,
      type,
      name,
      description,
      priority,
      status,
      equipment,
      parent_task,
      completed_at,
      due_at
    ) VALUES (
      child_id,
      type::public.task_type,
      CASE WHEN item ? 'name' THEN item->>'name' ELSE NULL END,
      item->>'description',
      priority,
      status::public.task_status_type,
      equipment_id,
      parent_id,
      completed_time_id,
      due_time_id
    );
    
    child_ids := array_append(child_ids, child_id);
  END LOOP;

  -- Process attachments if provided
  IF attachments IS NOT NULL AND jsonb_array_length(attachments) > 0 THEN
    FOR attachment_item IN SELECT * FROM jsonb_array_elements(attachments)
    LOOP
      INSERT INTO attachment (
        task,
        type,
        url,
        "order",
        created_by
      ) VALUES (
        parent_id,
        (attachment_item->>'type')::file_type_enum,
        attachment_item->>'url',
        COALESCE((attachment_item->>'order')::INTEGER, 0),
        created_by_user_id
      );
    END LOOP;
  END IF;
  
  -- Create task-user assignment if assigned_to is provided
  IF assigned_to IS NOT NULL THEN
    INSERT INTO _task_user (
      task,
      "user",
      relationship
    ) VALUES (
      parent_id,
      assigned_to,
      'assigned_to'
    );
  END IF;

  -- =====================================================================================
  -- STEP 3: UPDATE EQUIPMENT USAGE (when status is 'close' and equipment data provided)
  -- =====================================================================================
  
  IF status::public.task_status_type = 'close' AND equipment IS NOT NULL AND 
     equipment ? 'equipment_usage' AND jsonb_array_length(equipment->'equipment_usage') > 0 THEN
    
    FOR equipment_usage_item IN 
      SELECT jsonb_array_elements(equipment->'equipment_usage') AS item
    LOOP
      -- Use upsert_equipment_usage to update equipment usage
      SELECT upsert_equipment_usage(
        equipment_id,                                -- p_equipment_id
        (equipment_usage_item.item->>'value')::numeric, -- p_value
        created_by_user_id,                         -- p_user_id
        (equipment_usage_item.item->>'id')::UUID,   -- p_time_id (existing usage_time_id)
        NULL,                                       -- p_type (not needed for existing)
        NULL,                                       -- p_time_metadata (not needed for existing)
        COALESCE(
          equipment_usage_item.item->>'reason',
          'Equipment usage updated from work order completion'
        ),                                          -- p_reason
        NULL,                                       -- p_is_correction (auto-detect)
        NULL,                                       -- p_corrected_log_id
        parent_id,                                  -- p_task_id (link to work order)
        NULL                                        -- p_log_metadata
      ) INTO usage_result;
      
      -- Check if usage update was successful
      IF NOT (usage_result->>'success')::boolean THEN
        RAISE EXCEPTION 'Failed to update equipment usage: %', usage_result->>'error_message';
      END IF;
    END LOOP;
  END IF;

  -- Return structured response
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'parent_task_id', parent_id,
      'child_task_ids', array_to_json(child_ids),
      'work_order_name', name,
      'work_order_type', type,
      'equipment_id', equipment_id,
      'status', status,
      'attachments_count', COALESCE(jsonb_array_length(attachments), 0)
    ),
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'create_work_order_1',
      'created_by', created_by_user_id
    )
  );
END;$$;


ALTER FUNCTION "public"."create_work_order"("equipment_id" "uuid", "type" "text", "items" "jsonb", "status" "text", "created_by_user_id" "uuid", "name" "text", "description" "text", "priority" "text", "assigned_to" "uuid", "due_date" "text", "equipment" "jsonb", "attachments" "jsonb", "metadata" "jsonb", "completion_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."edit_maintenance_task"("task_id" "uuid", "new_name" "text" DEFAULT NULL::"text", "new_description" "text" DEFAULT NULL::"text", "new_schedule_value" "text" DEFAULT NULL::"text", "new_part_number" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    task_record record;
    template_task_id uuid;
    schedule_time_id uuid;
    result_json jsonb;
BEGIN
    -- Validate required parameters
    IF task_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'MISSING_TASK_ID',
            'error_message', 'Task ID is required. Please provide a valid task ID.',
            'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'edit_maintenance_task'
            )
        );
    END IF;

    -- Validate that the task exists, is maintenance type, and is open
    SELECT t.id, t.name, t.description, t.type, t.status, t._task_series
    INTO task_record
    FROM task t
    WHERE t.id = task_id;
    
    -- Check if task exists
    IF task_record.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'TASK_NOT_FOUND',
            'error_message', 'Task not found. Please verify the task ID and try again.',
            'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'edit_maintenance_task',
                'task_id', task_id
            )
        );
    END IF;
    
    -- Check if task is maintenance type
    IF task_record.type != 'maintenance' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'INVALID_TASK_TYPE',
            'error_message', 'This function can only edit maintenance tasks. Please use the appropriate function for other task types.',
            'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'edit_maintenance_task',
                'task_id', task_id,
                'task_type', task_record.type
            )
        );
    END IF;
    
    -- Check if task is open (not closed)
    IF task_record.status != 'open' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'TASK_CLOSED',
            'error_message', 'This task is closed and cannot be modified. Only open tasks can be edited.',
            'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'edit_maintenance_task',
                'task_id', task_id,
                'task_status', task_record.status
            )
        );
    END IF;
    
    -- Check if task has _task_series
    IF task_record._task_series IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'NO_TASK_SERIES',
            'error_message', 'Task configuration error: missing task series association. Please contact support.',
            'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'edit_maintenance_task',
                'task_id', task_id
            )
        );
    END IF;
    
    -- Get the template task and schedule info
    SELECT ts.task_template, ts.schedule
    INTO template_task_id, schedule_time_id
    FROM _task_series ts
    WHERE ts.id = task_record._task_series;
    
    -- Validate template task exists
    IF template_task_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'TEMPLATE_NOT_FOUND',
            'error_message', 'Task configuration error: template not found. Please contact support.',
            'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'edit_maintenance_task',
                'task_id', task_id,
                'task_series_id', task_record._task_series
            )
        );
    END IF;
    
    -- Update current task and template task name/description/part_number if provided
    IF new_name IS NOT NULL OR new_description IS NOT NULL OR new_part_number IS NOT NULL THEN
        UPDATE task 
        SET 
            name = COALESCE(new_name, name),
            description = COALESCE(new_description, description),
            part_number = COALESCE(new_part_number, part_number)
        WHERE id IN (task_id, template_task_id);
    END IF;
    
    -- Update schedule value if provided
    IF new_schedule_value IS NOT NULL AND schedule_time_id IS NOT NULL THEN
        UPDATE _time 
        SET 
            value = new_schedule_value
        WHERE id = schedule_time_id;
    END IF;
    
    -- Get updated task record
    SELECT t.*, ts.schedule as schedule_id
    INTO task_record
    FROM task t
    LEFT JOIN _task_series ts ON t._task_series = ts.id
    WHERE t.id = task_id;
    
    -- Return success response with updated info
    SELECT jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'description', t.description,
            'type', t.type,
            'status', t.status,
            'part_number', t.part_number,
            'created_at', t.created_at,
            '_task_series', t._task_series,
            'schedule', CASE 
                WHEN tm.id IS NOT NULL THEN jsonb_build_object(
                    'type', tm.type,
                    'value', tm.value,
                    'metadata', tm.metadata
                )
                ELSE NULL
            END
        ),
        'metadata', jsonb_build_object(
            'timestamp', NOW(),
            'operation', 'edit_maintenance_task',
            'version', '2.0',
            'task_id', task_id,
            'updated_fields', jsonb_build_object(
                'name', new_name IS NOT NULL,
                'description', new_description IS NOT NULL,
                'part_number', new_part_number IS NOT NULL,
                'schedule_value', new_schedule_value IS NOT NULL
            )
        )
    )
    INTO result_json
    FROM task t
    LEFT JOIN _task_series ts ON t._task_series = ts.id
    LEFT JOIN _time tm ON ts.schedule = tm.id
    WHERE t.id = task_id;
    
    RETURN result_json;

EXCEPTION
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'FOREIGN_KEY_ERROR',
            'error_message', 'Invalid reference data provided. Please check your input and try again.',
            'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'edit_maintenance_task',
                'task_id', task_id
            )
        );
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DUPLICATE_ERROR',
            'error_message', 'Duplicate task detected. A task with these parameters already exists.',
            'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'edit_maintenance_task',
                'task_id', task_id
            )
        );
    WHEN check_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'VALIDATION_ERROR',
            'error_message', SQLERRM,
            'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'edit_maintenance_task',
                'task_id', task_id
            )
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'UNEXPECTED_ERROR',
            'error_message', SQLERRM,
            'error_state', SQLSTATE,
            'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'edit_maintenance_task',
                'task_id', task_id
            )
        );
END;
$$;


ALTER FUNCTION "public"."edit_maintenance_task"("task_id" "uuid", "new_name" "text", "new_description" "text", "new_schedule_value" "text", "new_part_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_initial_usage_metadata"("p_type" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN CASE 
    -- Hour-based tracking (most common for equipment)
    WHEN p_type = 'hour' THEN 
      jsonb_build_object('source', 'engine_hours')
    
    -- Distance-based tracking (kilometers)
    WHEN p_type IN ('distance', 'kilometer') THEN
      jsonb_build_object('units', 'kilometers')
    
    -- Distance-based tracking (miles)
    WHEN p_type = 'mile' THEN
      jsonb_build_object('units', 'miles')
    
    -- Time-based tracking (calendar)
    WHEN p_type IN ('day', 'month', 'year') THEN
      jsonb_build_object('source', 'calendar')
    
    -- Schedule types (for maintenance intervals)
    WHEN p_type LIKE 'schedule:%' THEN
      jsonb_build_object('source', REPLACE(p_type, 'schedule:', ''))
    
    -- Default fallback
    ELSE
      jsonb_build_object('source', 'system')
  END;
END;
$$;


ALTER FUNCTION "public"."generate_initial_usage_metadata"("p_type" "text") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."generate_short_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := 'FT-';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_short_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_equipment_activity_log"("equipment_id" "uuid", "created_at_order" "text" DEFAULT 'DESC'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_equipment_info RECORD;
BEGIN
  -- Validate created_at_order parameter
  IF created_at_order NOT IN ('DESC', 'ASC') THEN
    RAISE EXCEPTION 'Invalid created_at_order. Only "DESC" or "ASC" are allowed.';
  END IF;

  -- Get equipment info once (optimization)
  SELECT id, name, serial_number INTO v_equipment_info
  FROM equipment
  WHERE id = get_equipment_activity_log.equipment_id;

  -- Return null if equipment doesn't exist
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT jsonb_agg(event_data ORDER BY
      CASE
        WHEN created_at_order = 'DESC' THEN event_timestamp
      END DESC,
      CASE
        WHEN created_at_order = 'ASC' THEN event_timestamp
      END ASC
    )
    FROM (
      -- ========================================================================
      -- 1. UPSERT_EQUIPMENT_USAGE: Equipment usage changes
      -- ========================================================================
      SELECT
        jsonb_build_object(
          'id', eul.id,
          'type', CASE
            WHEN ut.type = 'hour' THEN 'hour_change'
            WHEN ut.type = 'distance' THEN 'distance_change'
            WHEN ut.type = 'schedule:hours' THEN 'schedule_hours_change'
            WHEN ut.type = 'schedule:distance' THEN 'schedule_distance_change'
            WHEN ut.type = 'schedule:cron' THEN 'schedule_cron_change'
            WHEN ut.type = 'datetime' THEN 'datetime_change'
            ELSE ut.type::text || '_change'
          END,
          'name', CASE
            WHEN ut.type = 'hour' THEN 'Hours Updated'
            WHEN ut.type = 'distance' THEN 'Distance Updated'
            WHEN ut.type = 'schedule:hours' THEN 'Schedule Hours Updated'
            WHEN ut.type = 'schedule:distance' THEN 'Schedule Distance Updated'
            WHEN ut.type = 'schedule:cron' THEN 'Schedule Updated'
            WHEN ut.type = 'datetime' THEN 'DateTime Updated'
            ELSE replace(initcap(ut.type::text), ':', ' ') || ' Updated'
          END,
          'change_to', jsonb_build_object(
            'type', ut.type,
            'value', ut.value,
            'metadata', jsonb_build_object(
              'at', al.executed_at,
              'source', CASE
                WHEN al.input_payload->'time_metadata'->>'source' = 'initial_setup' THEN 'initial_setup'
                WHEN al.output_result->>'scenario' = 'existing_equipment' THEN 'existing_equipment'
                ELSE COALESCE(al.input_payload->'time_metadata'->>'source', 'unknown')
              END
            )
          ),
          'changed_by', jsonb_build_object(
            'user_id', al.executed_by,
            'closed_at', al.executed_at,
            'user_email', COALESCE(up.email, 'Unknown'),
            'function_used', al.function_name,
            'execution_duration_ms', al.execution_duration_ms
          ),
          'equipment', jsonb_build_object(
            'id', v_equipment_info.id,
            'name', v_equipment_info.name,
            'serial_number', v_equipment_info.serial_number
          )
        ) as event_data,
        al.executed_at as event_timestamp
      FROM activity_log al
      -- Get usage_time_id from output_result (initial_setup or existing_equipment)
      INNER JOIN _time ut ON ut.id = COALESCE(
        (al.output_result->>'audit_time_id')::uuid,
        (al.output_result->>'equipment_time_id')::uuid
      )
      INNER JOIN equipment_usage_log eul ON eul.usage_time_id = ut.id
      LEFT JOIN user_profiles up ON up.id = al.executed_by
      WHERE al.function_name = 'upsert_equipment_usage'
        AND al.equipment_id = get_equipment_activity_log.equipment_id
        AND al.execution_status = 'success'

      UNION ALL

      -- ========================================================================
      -- 2. CLOSE_WORK_ORDER: Closed repair/todo tasks
      -- ========================================================================
      SELECT
        jsonb_build_object(
          'id', (al.output_result->'data'->>'parent_task_id')::uuid,
          'type', t.type,
          'name', t.name,
          'description', t.description,
          'priority', t.priority,
          'status', t.status,
          'created_at', t.created_at,
          'due_at', CASE
            WHEN t_due.id IS NOT NULL THEN
              jsonb_build_object(
                'type', t_due.type,
                'value', t_due.value,
                'metadata', COALESCE(t_due.metadata, '{}'::jsonb)
              )
            ELSE '{}'::jsonb
          END,
          'completed_at', CASE
            WHEN t_comp.id IS NOT NULL THEN
              jsonb_build_object(
                'type', t_comp.type,
                'value', t_comp.value,
                'metadata', COALESCE(t_comp.metadata, '{}'::jsonb)
              )
            ELSE '{}'::jsonb
          END,
          'metadata', COALESCE(t.metadata, '{}'::jsonb),
          'equipment', jsonb_build_object(
            'id', v_equipment_info.id,
            'name', v_equipment_info.name,
            'serial_number', v_equipment_info.serial_number
          ),
          'interval', '{}'::jsonb,
          'closed_by', jsonb_build_object(
            'user_id', al.executed_by,
            'user_email', COALESCE(up.email, 'Unknown'),
            'closed_at', al.executed_at,
            'execution_duration_ms', al.execution_duration_ms,
            'function_used', al.function_name
          ),
          'child_task', COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'id', ct.id,
                'name', ct.name,
                'description', ct.description,
                'status', ct.status,
                'due_at', CASE
                  WHEN ct_due.id IS NOT NULL THEN
                    jsonb_build_object(
                      'type', ct_due.type,
                      'value', ct_due.value,
                      'metadata', COALESCE(ct_due.metadata, '{}'::jsonb)
                    )
                  ELSE '{}'::jsonb
                END,
                'completed_at', CASE
                  WHEN ct_comp.id IS NOT NULL THEN
                    jsonb_build_object(
                      'type', ct_comp.type,
                      'value', ct_comp.value,
                      'metadata', COALESCE(ct_comp.metadata, '{}'::jsonb)
                    )
                  ELSE '{}'::jsonb
                END
              )
            )
            FROM task ct
            LEFT JOIN _time ct_due ON ct.due_at = ct_due.id
            LEFT JOIN _time ct_comp ON ct.completed_at = ct_comp.id
            WHERE ct.parent_task = t.id
            ), '[]'::jsonb
          )
        ) as event_data,
        al.executed_at as event_timestamp
      FROM activity_log al
      INNER JOIN task t ON t.id = (al.output_result->'data'->>'parent_task_id')::uuid
      LEFT JOIN _time t_due ON t.due_at = t_due.id
      LEFT JOIN _time t_comp ON t.completed_at = t_comp.id
      LEFT JOIN user_profiles up ON up.id = al.executed_by
      WHERE al.function_name = 'close_work_order'
        AND al.equipment_id = get_equipment_activity_log.equipment_id
        AND al.execution_status = 'success'

      UNION ALL

      -- ========================================================================
      -- 3. PROCESS_EQUIPMENT_MAINTENANCE_BATCH: Maintenance tasks
      -- ========================================================================
      SELECT
        jsonb_build_object(
          'id', (al.output_result->'data'->>'parent_task_id')::uuid,
          'type', t.type,
          'name', t.name,
          'description', t.description,
          'priority', t.priority,
          'status', t.status,
          'created_at', al.executed_at,
          'due_at', '{}'::jsonb,
          'completed_at', '{}'::jsonb,
          'metadata', COALESCE(t.metadata, '{}'::jsonb),
          'equipment', jsonb_build_object(
            'id', v_equipment_info.id,
            'name', v_equipment_info.name,
            'serial_number', v_equipment_info.serial_number
          ),
          'interval', '{}'::jsonb,
          'closed_by', jsonb_build_object(
            'user_id', al.executed_by,
            'user_email', COALESCE(up.email, 'Unknown'),
            'closed_at', al.executed_at,
            'execution_duration_ms', al.execution_duration_ms,
            'function_used', al.function_name
          ),
          'child_task', COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'id', ct.id,
                'name', ct.name,
                'description', ct.description,
                'status', ct.status,
                'due_at', CASE
                  WHEN ct_due.id IS NOT NULL THEN
                    jsonb_build_object(
                      'type', ct_due.type,
                      'value', ct_due.value,
                      'metadata', COALESCE(ct_due.metadata, '{}'::jsonb)
                    )
                  ELSE '{}'::jsonb
                END,
                'completed_at', CASE
                  WHEN ct_comp.id IS NOT NULL THEN
                    jsonb_build_object(
                      'type', ct_comp.type,
                      'value', ct_comp.value,
                      'metadata', COALESCE(ct_comp.metadata, '{}'::jsonb)
                    )
                  ELSE '{}'::jsonb
                END,
                'interval', CASE
                  WHEN ct_interval.id IS NOT NULL THEN
                    jsonb_build_object(
                      'type', ct_interval.type,
                      'value', ct_interval.value,
                      'metadata', COALESCE(ct_interval.metadata, '{}'::jsonb)
                    )
                  ELSE '{}'::jsonb
                END
              )
            )
            FROM task ct
            LEFT JOIN _task_series cts ON ct._task_series = cts.id
            LEFT JOIN _time ct_due ON ct.due_at = ct_due.id
            LEFT JOIN _time ct_comp ON ct.completed_at = ct_comp.id
            LEFT JOIN _time ct_interval ON cts.schedule = ct_interval.id
            WHERE ct.parent_task = t.id
            ), '[]'::jsonb
          )
        ) as event_data,
        al.executed_at as event_timestamp
      FROM activity_log al
      INNER JOIN task t ON t.id = (al.output_result->'data'->>'parent_task_id')::uuid
      LEFT JOIN user_profiles up ON up.id = al.executed_by
      WHERE al.function_name = 'process_equipment_maintenance_batch'
        AND al.equipment_id = get_equipment_activity_log.equipment_id
        AND al.execution_status = 'success'

      UNION ALL

      -- ========================================================================
      -- 4. CREATE_WORK_ORDER: Created work orders with status='close'
      -- ========================================================================
      SELECT
        jsonb_build_object(
          'id', (al.output_result->'data'->>'parent_task_id')::uuid,
          'type', t.type,
          'name', t.name,
          'description', t.description,
          'priority', t.priority,
          'status', t.status,
          'created_at', t.created_at,
          'due_at', CASE
            WHEN t_due.id IS NOT NULL THEN
              jsonb_build_object(
                'type', t_due.type,
                'value', t_due.value,
                'metadata', COALESCE(t_due.metadata, '{}'::jsonb)
              )
            ELSE '{}'::jsonb
          END,
          'completed_at', CASE
            WHEN t_comp.id IS NOT NULL THEN
              jsonb_build_object(
                'type', t_comp.type,
                'value', t_comp.value,
                'metadata', COALESCE(t_comp.metadata, '{}'::jsonb)
              )
            ELSE '{}'::jsonb
          END,
          'metadata', COALESCE(t.metadata, '{}'::jsonb),
          'equipment', jsonb_build_object(
            'id', v_equipment_info.id,
            'name', v_equipment_info.name,
            'serial_number', v_equipment_info.serial_number
          ),
          'interval', '{}'::jsonb,
          'closed_by', jsonb_build_object(
            'user_id', al.executed_by,
            'user_email', COALESCE(up.email, 'Unknown'),
            'closed_at', al.executed_at,
            'execution_duration_ms', al.execution_duration_ms,
            'function_used', al.function_name
          ),
          'child_task', COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'id', ct.id,
                'name', ct.name,
                'description', ct.description,
                'status', ct.status,
                'due_at', CASE
                  WHEN ct_due.id IS NOT NULL THEN
                    jsonb_build_object(
                      'type', ct_due.type,
                      'value', ct_due.value,
                      'metadata', COALESCE(ct_due.metadata, '{}'::jsonb)
                    )
                  ELSE '{}'::jsonb
                END,
                'completed_at', CASE
                  WHEN ct_comp.id IS NOT NULL THEN
                    jsonb_build_object(
                      'type', ct_comp.type,
                      'value', ct_comp.value,
                      'metadata', COALESCE(ct_comp.metadata, '{}'::jsonb)
                    )
                  ELSE '{}'::jsonb
                END
              )
            )
            FROM task ct
            LEFT JOIN _time ct_due ON ct.due_at = ct_due.id
            LEFT JOIN _time ct_comp ON ct.completed_at = ct_comp.id
            WHERE ct.parent_task = t.id
            ), '[]'::jsonb
          )
        ) as event_data,
        al.executed_at as event_timestamp
      FROM activity_log al
      INNER JOIN task t ON t.id = (al.output_result->'data'->>'parent_task_id')::uuid
      LEFT JOIN _time t_due ON t.due_at = t_due.id
      LEFT JOIN _time t_comp ON t.completed_at = t_comp.id
      LEFT JOIN user_profiles up ON up.id = al.executed_by
      WHERE al.function_name = 'create_work_order'
        AND al.equipment_id = get_equipment_activity_log.equipment_id
        AND al.execution_status = 'success'
    ) ordered_events
  );
END;
$$;


ALTER FUNCTION "public"."get_equipment_activity_log"("equipment_id" "uuid", "created_at_order" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_farm_equipment"("p_farm_id" "uuid", "p_page" integer DEFAULT 1, "p_limit" integer DEFAULT 20, "p_search" "text" DEFAULT NULL::"text", "p_equipment_status" boolean DEFAULT NULL::boolean, "p_equipment_type" "uuid" DEFAULT NULL::"uuid", "p_equipment_make" "uuid" DEFAULT NULL::"uuid", "p_equipment_model" "uuid" DEFAULT NULL::"uuid") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
  DECLARE
    v_offset INTEGER;
    v_total INTEGER;
    v_data JSON;
    v_result JSON;
  BEGIN
    -- Calculate offset
    v_offset := (p_page - 1) * p_limit;

    -- Get total count
    SELECT COUNT(*)
    INTO v_total
    FROM equipment e
    INNER JOIN _equipment eq ON e._equipment = eq.id
    WHERE e.farm = p_farm_id
      AND (p_search IS NULL OR e.name ILIKE '%' || p_search || '%' OR e.serial_number ILIKE '%' || p_search || '%')
      AND (p_equipment_status IS NULL OR
           (p_equipment_status = true AND e.status = 'active') OR
           (p_equipment_status = false AND e.status != 'active'))
      AND (p_equipment_type IS NULL OR eq.type = p_equipment_type)
      AND (p_equipment_make IS NULL OR eq.make = p_equipment_make)
      AND (p_equipment_model IS NULL OR eq.model = p_equipment_model);

    -- Get paginated data with all joins
    SELECT json_agg(equipment_data)
    INTO v_data
    FROM (
      SELECT
        e.*,
        json_build_object('id', f.id, 'name', f.name) as farm,
        json_build_object(
          'id', eq.id,
          'type', eq.type,
          'make', eq.make,
          'model', eq.model,
          '_equipment_type', json_build_object('id', et.id, 'name', et.name),
          '_equipment_make', json_build_object('id', em.id, 'name', em.name),
          '_equipment_model', json_build_object('id', emod.id, 'name', emod.name)
        ) as "_equipment",
        (
          SELECT json_agg(
            json_build_object(
              '_time', json_build_object(
                'id', t.id,
                'type', t.type,
                'value', t.value,
                'metadata', t.metadata
              )
            )
          )
          FROM equipment_usage_type eut
          LEFT JOIN _time t ON eut.usage_time_id = t.id
          WHERE eut.equipment_id = e.id
        ) as equipment_usage_type
      FROM equipment e
      INNER JOIN farm f ON e.farm = f.id
      INNER JOIN _equipment eq ON e._equipment = eq.id
      INNER JOIN _equipment_type et ON eq.type = et.id
      INNER JOIN _equipment_make em ON eq.make = em.id
      INNER JOIN _equipment_model emod ON eq.model = emod.id
      WHERE e.farm = p_farm_id
        AND (p_search IS NULL OR e.name ILIKE '%' || p_search || '%' OR e.serial_number ILIKE '%' || p_search || '%')
        AND (p_equipment_status IS NULL OR
             (p_equipment_status = true AND e.status = 'active') OR
             (p_equipment_status = false AND e.status != 'active'))
        AND (p_equipment_type IS NULL OR eq.type = p_equipment_type)
        AND (p_equipment_make IS NULL OR eq.make = p_equipment_make)
        AND (p_equipment_model IS NULL OR eq.model = p_equipment_model)
      ORDER BY e.created_at DESC
      LIMIT p_limit
      OFFSET v_offset
    ) equipment_data;

    -- Build result with pagination
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
  $$;


ALTER FUNCTION "public"."get_farm_equipment"("p_farm_id" "uuid", "p_page" integer, "p_limit" integer, "p_search" "text", "p_equipment_status" boolean, "p_equipment_type" "uuid", "p_equipment_make" "uuid", "p_equipment_model" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."get_farm_tasks"("farm_id" "uuid", "status_filter" "text" DEFAULT NULL::"text", "created_at_order" "text" DEFAULT 'DESC'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Validate status_filter parameter
  IF status_filter IS NOT NULL AND status_filter NOT IN ('open', 'close') THEN
    RAISE EXCEPTION 'Invalid status filter. Only "open" or "close" are allowed.';
  END IF;
  
  -- Validate created_at_order parameter
  IF created_at_order NOT IN ('DESC', 'ASC') THEN
    RAISE EXCEPTION 'Invalid created_at_order. Only "DESC" or "ASC" are allowed.';
  END IF;
  RETURN (
    SELECT jsonb_agg(task_data ORDER BY 
      CASE 
        WHEN created_at_order = 'DESC' THEN created_at 
      END DESC,
      CASE 
        WHEN created_at_order = 'ASC' THEN created_at 
      END ASC
    )
    FROM (
      SELECT 
        jsonb_build_object(
          'id', t.id,
          'type', t.type,
          'priority', t.priority,
          'status', t.status,
          'created_at', t.created_at,
          'due_at', CASE 
            WHEN dt.id IS NOT NULL THEN 
              jsonb_build_object(
                'type', dt.type,
                'metadata', COALESCE(dt.metadata, '{}'::jsonb),
                'value', dt.value
              )
            ELSE '{}'::jsonb
          END,
          'completed_at', CASE 
            WHEN ct.id IS NOT NULL THEN 
              jsonb_build_object(
                'type', ct.type,
                'metadata', COALESCE(ct.metadata, '{}'::jsonb),
                'value', ct.value
              )
            ELSE '{}'::jsonb
          END,
          'metadata', COALESCE(t.metadata, '{}'::jsonb),
          'equipment', jsonb_build_object(
            'id', e.id,
            'name', e.name,
            'serial_number', e.serial_number
          ),
          'interval', CASE 
            WHEN t.type = 'maintenance' AND interval_time.id IS NOT NULL THEN 
              jsonb_build_object(
                'type', interval_time.type,
                'metadata', COALESCE(interval_time.metadata, '{}'::jsonb),
                'value', interval_time.value
              )
            ELSE '{}'::jsonb
          END,
          'last_completion', CASE 
            WHEN t.type = 'maintenance' AND t.status = 'open' THEN 
              COALESCE(get_last_completion_by_task_series(t.id, t.equipment), '{}'::jsonb)
            ELSE '{}'::jsonb
          END,
          'child_task', COALESCE(child_tasks.children, '[]'::jsonb)
        ) as task_data,
        t.created_at
      FROM task t
      INNER JOIN equipment e ON t.equipment = e.id
      LEFT JOIN _time dt ON t.due_at = dt.id
      LEFT JOIN _time ct ON t.completed_at = ct.id
      LEFT JOIN _task_series ts ON t._task_series = ts.id AND t.type = 'maintenance'
      LEFT JOIN _time interval_time ON ts.schedule = interval_time.id AND t.type = 'maintenance'
      LEFT JOIN (
        SELECT 
          parent_task,
          jsonb_agg(
            jsonb_build_object(
              'id', ct.id,
              'name', ct.name,
              'description', ct.description,
              'status', ct.status,
              'due_at', CASE 
                WHEN due_time.id IS NOT NULL THEN 
                  jsonb_build_object(
                    'type', due_time.type,
                    'metadata', COALESCE(due_time.metadata, '{}'::jsonb),
                    'value', due_time.value
                  )
                ELSE '{}'::jsonb
              END,
              'completed_at', CASE 
                WHEN comp_time.id IS NOT NULL THEN 
                  jsonb_build_object(
                    'type', comp_time.type,
                    'metadata', COALESCE(comp_time.metadata, '{}'::jsonb),
                    'value', comp_time.value
                  )
                ELSE '{}'::jsonb
              END
            )
          ) as children
        FROM task ct
        LEFT JOIN _time due_time ON ct.due_at = due_time.id
        LEFT JOIN _time comp_time ON ct.completed_at = comp_time.id
        WHERE ct.parent_task IS NOT NULL
        GROUP BY parent_task
      ) child_tasks ON t.id = child_tasks.parent_task
      WHERE e.farm = farm_id
        AND t.type IN ('todo', 'repair', 'maintenance')
        AND t.parent_task IS NULL
        AND (status_filter IS NULL OR t.status = status_filter::public.task_status_type)
    ) ordered_tasks
  );
END;
$$;


ALTER FUNCTION "public"."get_farm_tasks"("farm_id" "uuid", "status_filter" "text", "created_at_order" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_farm_users"("p_farm_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_users JSONB;
BEGIN
    -- Validate required parameter
    IF p_farm_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'farm_id is required'
        );
    END IF;

    -- Validate farm exists
    IF NOT EXISTS (SELECT 1 FROM public.farm WHERE id = p_farm_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Farm does not exist'
        );
    END IF;

    -- Get all users for the farm with their auth data
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', fu.user,
            'farm_id', fu.farm,
            'role', fu.role,
            'display_name', COALESCE(
                NULLIF(TRIM(au.raw_user_meta_data->>'display_name'), ''),
                au.email
            ),
            'email', au.email,
            'phone', au.phone,
            'raw_user_meta_data', au.raw_user_meta_data
        )
    )
    INTO v_users
    FROM public._farm_user fu
    INNER JOIN auth.users au ON fu.user = au.id
    WHERE fu.farm = p_farm_id;

    -- Return success with data
    RETURN jsonb_build_object(
        'success', true,
        'data', COALESCE(v_users, '[]'::jsonb)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'An unexpected error occurred: ' || SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."get_farm_users"("p_farm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_last_completion_by_task_series"("task_id" "uuid", "equipment_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    last_completion_result jsonb;
    current_task_series_id uuid;
BEGIN
    -- Get task_series from the provided task and validate equipment matches
    SELECT _task_series 
    INTO current_task_series_id
    FROM task 
    WHERE id = task_id AND equipment = equipment_id;
    
    -- If no task found or missing task_series, return null
    IF current_task_series_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Find the completion with the highest value for this equipment + task_series
    -- For hour/distance: highest value, for schedule:cron: most recent task
    SELECT 
        jsonb_build_object(
            'type', tm.type,
            'metadata', COALESCE(tm.metadata, '{}'::jsonb),
            'value', tm.value
        )
    INTO last_completion_result
    FROM task t
    INNER JOIN _time tm ON t.completed_at = tm.id
    WHERE t.equipment = equipment_id
        AND t._task_series = current_task_series_id
        AND t.type = 'maintenance'
        AND t.status = 'close'
        AND t.completed_at IS NOT NULL
    ORDER BY 
        CASE 
            WHEN tm.type IN ('hour', 'distance') THEN tm.value::bigint
            ELSE NULL
        END DESC NULLS LAST,
        CASE 
            WHEN tm.type = 'schedule:cron' THEN EXTRACT(EPOCH FROM t.created_at)
            ELSE NULL
        END DESC NULLS LAST
    LIMIT 1;
    
    RETURN last_completion_result;
END;
$$;


ALTER FUNCTION "public"."get_last_completion_by_task_series"("task_id" "uuid", "equipment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_default_farm"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
    SELECT farm 
    FROM _farm_user 
    WHERE "user" = user_id 
    LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_default_farm"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_farms"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "uuid"[]
    LANGUAGE "sql" STABLE
    AS $$
    SELECT ARRAY(
        SELECT farm 
        FROM _farm_user 
        WHERE "user" = user_id
    );
$$;


ALTER FUNCTION "public"."get_user_farms"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_profile"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Validate required parameter
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'user_id is required'
        );
    END IF;

    -- Get user profile data
    SELECT jsonb_build_object(
        'email', a.email,
        'display_name', a.raw_user_meta_data->>'display_name',
        'user_id', u.id
    )
    INTO v_result
    FROM public.user u
    INNER JOIN auth.users a ON u.id = a.id
    WHERE u.id = p_user_id;

    -- Check if user was found
    IF v_result IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;

    -- Return success with data
    RETURN jsonb_build_object(
        'success', true,
        'data', v_result
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'An unexpected error occurred: ' || SQLERRM
        );
END;
$$;


ALTER FUNCTION "public"."get_user_profile"("p_user_id" "uuid") OWNER TO "supabase_admin";


COMMENT ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") IS 'Retrieves user profile information (email and display name) by joining public.user with auth.users. Requires SECURITY DEFINER to access auth schema.';



CREATE OR REPLACE FUNCTION "public"."is_super_admin"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM "user" 
        WHERE id = COALESCE(user_id, auth.uid())
        AND global_role = 'super_admin'
        AND id IS NOT NULL  -- Prevent access with NULL user
    );
$$;


ALTER FUNCTION "public"."is_super_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_default_tasks"("p_equipment_id" "uuid", "p_equipment_type_id" "uuid") RETURNS "json"
    LANGUAGE "sql"
    AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', _maintenance_id,
      'task_series_id', task_series_id,
      'schedule', jsonb_build_object(
        'id', schedule_id,
        'value', schedule_value,
        'type', schedule_type,
        'metadata', schedule_metadata
      ),
      'name', maintenance_name,
      'description', maintenance_description,
      'maintenance_type', maintenance_type
    )
  )::JSON
  FROM equipment_default_tasks
  WHERE (
    _equipment_id = p_equipment_id
    OR (
      _equipment_id IS NULL
      AND _equipment_type_id = p_equipment_type_id
      AND NOT EXISTS (
        SELECT 1 FROM equipment_default_tasks emv2
        WHERE emv2._equipment_id = p_equipment_id
      )
    )
  );
$$;


ALTER FUNCTION "public"."list_default_tasks"("p_equipment_id" "uuid", "p_equipment_type_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_open_tasks"("p_equipment_id" "uuid") RETURNS "json"
    LANGUAGE "sql"
    AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'task_id', task_id,
      'maintenance_id', maintenance_id,
      'maintenance_name', maintenance_name,
      'maintenance_description', maintenance_description,
      'maintenance_type', maintenance_type,
      'part_number', part_number,
      'schedule', schedule,
      'last_completion', last_service
    )
  )::JSON
  FROM open_maintenance_tasks
  WHERE equipment_id = p_equipment_id;
$$;


ALTER FUNCTION "public"."list_open_tasks"("p_equipment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity"("p_function_name" "text", "p_input_payload" "jsonb", "p_output_result" "jsonb", "p_equipment_id" "uuid", "p_task_ids" "uuid"[], "p_executed_by" "uuid", "p_execution_duration_ms" integer, "p_time_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_execution_status" "text" DEFAULT 'success'::"text", "p_error_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  log_id UUID;
BEGIN
  -- Insert execution log record
  INSERT INTO activity_log (
    function_name,
    input_payload,
    output_result,
    equipment_id,
    task_ids,
    time_ids,
    executed_by,
    execution_duration_ms,
    execution_status,
    error_details
  ) VALUES (
    p_function_name,
    p_input_payload,
    p_output_result,
    p_equipment_id,
    p_task_ids,
    p_time_ids,
    p_executed_by,
    p_execution_duration_ms,
    p_execution_status,
    p_error_details
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;


ALTER FUNCTION "public"."log_activity"("p_function_name" "text", "p_input_payload" "jsonb", "p_output_result" "jsonb", "p_equipment_id" "uuid", "p_task_ids" "uuid"[], "p_executed_by" "uuid", "p_execution_duration_ms" integer, "p_time_ids" "uuid"[], "p_execution_status" "text", "p_error_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_equipment_usage"("target_equipment_id" "uuid", "usage_value" numeric, "reason" "text", "created_by_user_id" "uuid", "task_id" "uuid" DEFAULT NULL::"uuid", "maintenance_part_type" "uuid" DEFAULT NULL::"uuid", "maintenance_consumable_type" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  log_time_id UUID;
  prev_value NUMERIC;
  equipment_usage_time_id UUID;
  usage_time_type public.time_type;
  usage_time_metadata JSONB;
BEGIN
  -- Get equipment usage type information
  SELECT eut.usage_time_id, t.type, t.metadata
  INTO equipment_usage_time_id, usage_time_type, usage_time_metadata
  FROM equipment_usage_type eut
  JOIN _time t ON eut.usage_time_id = t.id
  WHERE eut.equipment_id = target_equipment_id;
  
  IF equipment_usage_time_id IS NULL THEN
    RAISE EXCEPTION 'Equipment usage type not found for equipment: %', target_equipment_id;
  END IF;

  -- DEBUG: Starting previous value lookup
  -- RAISE EXCEPTION 'DEBUG: log_equipment_usage called with equipment: %, task_id: %, value: %', 
  --   target_equipment_id, log_equipment_usage.task_id, usage_value;

  -- Get previous value based on whether this is a task-specific log or general equipment log
  IF log_equipment_usage.task_id IS NOT NULL AND (maintenance_part_type IS NOT NULL OR maintenance_consumable_type IS NOT NULL) THEN
    -- For maintenance tasks: get last value from the most recent closed task of the same maintenance type
    SELECT eul.value INTO prev_value
    FROM equipment_usage_log eul 
    WHERE eul.task_id = (
      SELECT task_table.id
      FROM task task_table
      WHERE task_table.equipment = target_equipment_id 
        AND task_table.type = 'maintenance'
        AND task_table.status = 'close'
        AND (
          (maintenance_part_type IS NOT NULL AND task_table._part_type = maintenance_part_type) OR
          (maintenance_consumable_type IS NOT NULL AND task_table._consumable_type = maintenance_consumable_type)
        )
      ORDER BY task_table.created_at DESC
      LIMIT 1
    );
    
  ELSIF log_equipment_usage.task_id IS NOT NULL THEN
    -- For non-maintenance tasks: get last value when THIS SAME task was executed (legacy behavior)
    SELECT eul.value INTO prev_value
    FROM equipment_usage_log eul 
    WHERE eul.equipment_id = target_equipment_id
      AND eul.task_id = log_equipment_usage.task_id
    ORDER BY eul.created_at DESC 
    LIMIT 1;
    
  ELSE
    -- For general equipment logs: get last general equipment value (task_id IS NULL)
    SELECT eul.value INTO prev_value
    FROM equipment_usage_log eul 
    WHERE eul.equipment_id = target_equipment_id
      AND eul.task_id IS NULL
    ORDER BY eul.created_at DESC 
    LIMIT 1;
  END IF;
  
  -- If no previous value found, default to 0
  IF prev_value IS NULL THEN
    prev_value := 0;
  END IF;

  -- Create new _time record for this log entry
  log_time_id := gen_random_uuid();
  INSERT INTO _time (
    id,
    type,
    value,
    metadata
  ) VALUES (
    log_time_id,
    usage_time_type,
    usage_value::TEXT,
    usage_time_metadata
  );

  -- Create equipment_usage_log entry
  INSERT INTO equipment_usage_log (
    equipment_id,
    usage_time_id,
    value,
    previous_value,
    reason,
    created_by,
    is_correction,
    corrected_log_id,
    task_id,
    metadata
  ) VALUES (
    target_equipment_id,
    log_time_id,
    usage_value,
    prev_value,                    -- NULL for first entry, actual value for subsequent
    reason,
    created_by_user_id,
    FALSE,                         -- is_correction
    NULL,                          -- corrected_log_id
    log_equipment_usage.task_id,                       -- NULL for initial setup, actual task_id for maintenance
    NULL                           -- metadata
  );

  RETURN log_time_id;
END;
$$;


ALTER FUNCTION "public"."log_equipment_usage"("target_equipment_id" "uuid", "usage_value" numeric, "reason" "text", "created_by_user_id" "uuid", "task_id" "uuid", "maintenance_part_type" "uuid", "maintenance_consumable_type" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_equipment_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
    -- Only broadcast equipment-related events
    IF NEW.type LIKE 'equipment:%' THEN
        PERFORM realtime.broadcast_changes(
            'equipment:' || (NEW.metadata->>'local_equipment_id')::text,  -- Topic: equipment:${localUUID}
            TG_OP,                                                        -- event: INSERT
            TG_OP,                                                        -- operation: INSERT  
            TG_TABLE_NAME,                                                -- table: events
            TG_TABLE_SCHEMA,                                              -- schema: public
            NEW,                                                          -- new record
            OLD                                                           -- old record (NULL for INSERT)
        );
    END IF;
    RETURN NULL;
END;
$_$;


ALTER FUNCTION "public"."notify_equipment_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."perform_batch_cancellation"("p_batch_id" "uuid", "p_reason" "text", "p_user_id" "uuid", "p_batch" "record") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."perform_batch_cancellation"("p_batch_id" "uuid", "p_reason" "text", "p_user_id" "uuid", "p_batch" "record") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."perform_batch_reception"("p_batch_id" "uuid", "p_defective_info" "jsonb", "p_user_id" "uuid", "p_notes" "text", "p_batch" "record") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."perform_batch_reception"("p_batch_id" "uuid", "p_defective_info" "jsonb", "p_user_id" "uuid", "p_notes" "text", "p_batch" "record") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_equipment_maintenance_batch"("maintenance_data" "jsonb", "created_by_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  target_equipment_id UUID;
  target_farm_id UUID;
  equipment_usage_item RECORD;
  task_new_item JSONB;
  task_completed_item JSONB;
  parent_task_id UUID;
  parent_metadata JSONB;
  temp_id_map JSONB := '{}';
  grouping_metadata JSONB;
  equipment_usage_time_id UUID := NULL;  -- To store time_id from upsert_equipment_usage
  
  -- Variables for task_new
  new_task_template_id UUID;
  new_task_series_id UUID;
  new_task_maintenance_id UUID;
  
  -- Variables for task_completed
  current_task_id UUID;
  current_task RECORD;
  new_maintenance_task_id UUID;
  
  -- Counters
  new_tasks_count INTEGER := 0;
  completed_tasks_count INTEGER := 0;
BEGIN
  -- Extract target_equipment_id from JSON
  target_equipment_id := (maintenance_data->'equipment'->>'id')::UUID;

  IF target_equipment_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_EQUIPMENT_ID',
      'error_message', 'Equipment ID is required in maintenance_data.equipment.id',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'process_equipment_maintenance_batch'
      )
    );
  END IF;

  -- Get farm_id from equipment
  SELECT farm INTO target_farm_id
  FROM equipment 
  WHERE id = target_equipment_id;

  IF target_farm_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EQUIPMENT_NOT_FOUND_OR_NO_FARM',
      'error_message', 'Equipment not found or has no associated farm',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'process_equipment_maintenance_batch',
        'equipment_id', target_equipment_id
      )
    );
  END IF;

  -- Validate that task_completed is mandatory and not empty
  IF NOT (maintenance_data ? 'task_completed') OR 
     maintenance_data->'task_completed' IS NULL OR
     jsonb_array_length(maintenance_data->'task_completed') = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MISSING_COMPLETED_TASKS',
      'error_message', 'At least one completed task is required in maintenance_data.task_completed',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'process_equipment_maintenance_batch',
        'equipment_id', target_equipment_id
      )
    );
  END IF;

  -- Equipment usage validation moved to upsert_equipment_usage function

  -- Start transaction
  BEGIN
    
    -- =====================================================================================
    -- STEP 1: CREATE NEW TASKS (task_new)
    -- =====================================================================================
    
    IF maintenance_data ? 'task_new' AND jsonb_array_length(maintenance_data->'task_new') > 0 THEN
      FOR task_new_item IN SELECT * FROM jsonb_array_elements(maintenance_data->'task_new')
      LOOP
        -- Create template, series and initial task using extracted functions
        DECLARE
          template_result JSONB;
        BEGIN
          SELECT create_task_template_with_series(
            target_equipment_id,
            target_farm_id, -- Use the farm_id obtained from equipment
            task_new_item->>'description',
            task_new_item->'schedule',
            created_by_user_id,
            NULL, -- No part_type association for generic tasks
            NULL, -- No consumable_type association for generic tasks
            task_new_item->>'part_number' -- Extract part_number from JSON
          ) INTO template_result;
          
          -- Check if template creation was successful
          IF NOT (template_result->>'success')::boolean THEN
            RETURN jsonb_build_object(
              'success', false,
              'error_code', 'TEMPLATE_CREATION_FAILED',
              'error_message', template_result->>'error_message',
              'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'process_equipment_maintenance_batch',
                'equipment_id', target_equipment_id
              )
            );
          END IF;
          
          -- Extract template_id and series_id from the response
          new_task_template_id := (template_result->'data'->>'template_id')::UUID;
          new_task_series_id := (template_result->'data'->>'series_id')::UUID;
        END;

        -- Create initial maintenance task instance
        new_task_maintenance_id := create_maintenance_task_instance(
          new_task_series_id,
          target_equipment_id,
          UPPER(REPLACE(task_new_item->>'description', ' ', '_')),
          task_new_item->>'description',
          NULL, -- No part_type association
          NULL, -- No consumable_type association
          task_new_item->>'part_number' -- Extract part_number from JSON
        );

        -- Map temp_id to real task_id
        temp_id_map := temp_id_map || jsonb_build_object(
          task_new_item->>'id', 
          new_task_maintenance_id::TEXT
        );
        
        new_tasks_count := new_tasks_count + 1;
      END LOOP;
    END IF;

    -- =====================================================================================  
    -- STEP 2: CREATE SINGLE MAINTENANCE TASK GROUPING
    -- =====================================================================================
    
    IF maintenance_data ? 'task_completed' AND jsonb_array_length(maintenance_data->'task_completed') > 0 THEN
      -- Generate parent_task_id (will be used later after getting equipment_usage_time_id)
      parent_task_id := gen_random_uuid();
      
      -- Build metadata with comment and additional metadata from JSON
      parent_metadata := jsonb_build_object(
        'comment', COALESCE(maintenance_data->>'comment', 'Maintenance completed')
      ) || COALESCE(maintenance_data->'metadata', '{}'::jsonb);

      -- =====================================================================================
      -- STEP 3: CREATE PARENT TASK FIRST
      -- =====================================================================================
      
      INSERT INTO task (
        id,
        equipment,
        type,
        name,
        description,
        metadata,
        status,
        completed_at
      ) VALUES (
        parent_task_id,
        target_equipment_id,
        'maintenance'::public.task_type,
        'PARENT_TASK',
        'PARENT TASK',
        parent_metadata,
        'close',
        NULL  -- Will be updated after equipment usage update
      );

      -- =====================================================================================
      -- STEP 3.5: UPDATE EQUIPMENT USAGE (after parent task exists)
      -- =====================================================================================
      
      -- Update equipment usage with parent_task_id for audit trail
      IF maintenance_data ? 'equipment' AND maintenance_data->'equipment' ? 'equipment_usage' AND 
         jsonb_array_length(maintenance_data->'equipment'->'equipment_usage') > 0 THEN
        DECLARE
          usage_result JSONB;
        BEGIN
          FOR equipment_usage_item IN 
            SELECT jsonb_array_elements(maintenance_data->'equipment'->'equipment_usage') AS item
          LOOP
            
            -- Use upsert_equipment_usage instead of direct UPDATE
            SELECT upsert_equipment_usage(
              target_equipment_id,                     -- p_equipment_id
              (equipment_usage_item.item->>'value')::numeric, -- p_value
              created_by_user_id,                      -- p_user_id
              (equipment_usage_item.item->>'id')::UUID,     -- p_time_id (from JSON - current usage_time_id)
              NULL,                                    -- p_type (not needed for existing)
              NULL,                                    -- p_time_metadata (not needed for existing)
              COALESCE(
                equipment_usage_item.item->>'reason',
                'Equipment usage updated during maintenance'
              ),                                       -- p_reason
              NULL,                                    -- p_is_correction (auto-detect)
              NULL,                                    -- p_corrected_log_id
              parent_task_id,                          -- p_task_id (THE GROUPING TASK!)
              NULL,                                    -- p_log_metadata
              TRUE                                     -- p_is_parent_task (parent task behavior)
            ) INTO usage_result;
            
            -- Check if usage update was successful
            IF NOT (usage_result->>'success')::boolean THEN
              RAISE EXCEPTION 'Failed to update equipment usage: %', usage_result->>'error_message';
            END IF;
            
            -- Capture the time_id for completed_at (use the first equipment usage time_id)
            IF equipment_usage_time_id IS NULL THEN
              equipment_usage_time_id := (usage_result->'data'->>'time_id')::UUID;
            END IF;
          END LOOP;
          
          -- Update parent task with the equipment_usage_time_id as completed_at
          IF equipment_usage_time_id IS NOT NULL THEN
            UPDATE task 
            SET completed_at = equipment_usage_time_id 
            WHERE id = parent_task_id;
          END IF;
        END;
      END IF;

      -- =====================================================================================
      -- STEP 4: PROCESS ATTACHMENTS (photos, videos, documents)
      -- =====================================================================================
      
      -- Process attachments if provided
      IF maintenance_data ? 'attachments' AND jsonb_array_length(maintenance_data->'attachments') > 0 THEN
        DECLARE
          attachment_item RECORD;
        BEGIN
          FOR attachment_item IN 
            SELECT value AS item FROM jsonb_array_elements(maintenance_data->'attachments') AS value
          LOOP
            -- Validate required fields
            IF NOT (attachment_item.item ? 'url' AND attachment_item.item ? 'type') THEN
              CONTINUE; -- Skip invalid attachments
            END IF;
            
            -- Insert attachment
            INSERT INTO attachment (
              task,
              type,
              url,
              description,
              metadata,
              created_by
            ) VALUES (
              parent_task_id,
              (attachment_item.item->>'type')::file_type_enum,
              attachment_item.item->>'url',
              attachment_item.item->>'description',
              attachment_item.item->'metadata',
              created_by_user_id
            );
          END LOOP;
        END;
      END IF;

      -- =====================================================================================
      -- STEP 5: PROCESS COMPLETED TASKS
      -- =====================================================================================
      
      -- RAISE EXCEPTION 'DEBUG: STEP 4 - About to process task_completed items';
      
      FOR task_completed_item IN SELECT * FROM jsonb_array_elements(maintenance_data->'task_completed')
      LOOP
        -- Determine task_id (either direct task_id or map from temp_id)
        IF task_completed_item ? 'task_id' THEN
          current_task_id := (task_completed_item->>'task_id')::UUID;
        ELSIF task_completed_item ? 'id' THEN
          current_task_id := (temp_id_map->>(task_completed_item->>'id'))::UUID;
        ELSE
          CONTINUE; -- Skip if no valid identifier
        END IF;

        -- Complete maintenance task using extracted function (handles task validation internally)
        DECLARE
          complete_result JSONB;
        BEGIN
          -- Debug: Check for NULL task_id
          IF current_task_id IS NULL THEN
            RETURN jsonb_build_object(
              'success', false,
              'error_code', 'NULL_TASK_ID_ERROR',
              'error_message', 'current_task_id is NULL',
              'debug_info', jsonb_build_object(
                'task_completed_item', task_completed_item,
                'temp_id_map', temp_id_map,
                'equipment_id', target_equipment_id
              ),
              'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'process_equipment_maintenance_batch'
              )
            );
          END IF;
          
          SELECT complete_maintenance_task(
            current_task_id,
            task_completed_item->>'value',
            parent_task_id,
            created_by_user_id
          ) INTO complete_result;
          
          -- Check if task completion was successful
          IF complete_result IS NULL THEN
            RETURN jsonb_build_object(
              'success', false,
              'error_code', 'COMPLETE_TASK_NULL_RESULT',
              'error_message', 'complete_maintenance_task returned NULL',
              'debug_info', jsonb_build_object(
                'task_id_sent', current_task_id,
                'value_sent', task_completed_item->>'value',
                'parent_task_sent', parent_task_id,
                'user_id_sent', created_by_user_id,
                'task_completed_item', task_completed_item,
                'temp_id_map', temp_id_map
              ),
              'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'process_equipment_maintenance_batch'
              )
            );
          END IF;
          
          IF NOT (complete_result->>'success')::boolean THEN
            RETURN jsonb_build_object(
              'success', false,
              'error_code', 'COMPLETE_TASK_FAILED',
              'error_message', complete_result->>'error_message',
              'debug_info', jsonb_build_object(
                'task_id_sent', current_task_id,
                'value_sent', task_completed_item->>'value',
                'parent_task_sent', parent_task_id,
                'user_id_sent', created_by_user_id,
                'complete_result', complete_result,
                'task_completed_item', task_completed_item,
                'temp_id_map', temp_id_map
              ),
              'metadata', jsonb_build_object(
                'timestamp', NOW(),
                'operation', 'process_equipment_maintenance_batch'
              )
            );
          END IF;
          
          -- Extract new_task_id for any future use
          new_maintenance_task_id := (complete_result->'data'->>'new_task_id')::UUID;
        END;

        completed_tasks_count := completed_tasks_count + 1;
      END LOOP;
    END IF;

    -- Return structured success result with debug info
    RETURN jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'equipment_id', target_equipment_id,
        'parent_task_id', parent_task_id,
        'new_tasks_created', new_tasks_count,
        'tasks_completed', completed_tasks_count
      ),
      'debug', jsonb_build_object(
        'temp_id_map', temp_id_map,
        'task_completed_processed', completed_tasks_count,
        'equipment_usage_time_id', equipment_usage_time_id
      ),
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'process_equipment_maintenance_batch',
        'version', '2.0'
      )
    );

  EXCEPTION 
    WHEN check_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'VALIDATION_ERROR',
        'error_message', SQLERRM,
        'metadata', jsonb_build_object(
          'timestamp', NOW(),
          'operation', 'process_equipment_maintenance_batch',
          'equipment_id', target_equipment_id
        )
      );
    WHEN foreign_key_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'FOREIGN_KEY_ERROR',
        'error_message', 'Referenced record not found - check equipment_id, user_id, or task IDs',
        'metadata', jsonb_build_object(
          'timestamp', NOW(),
          'operation', 'process_equipment_maintenance_batch',
          'equipment_id', target_equipment_id
        )
      );
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'DUPLICATE_ERROR',
        'error_message', 'Duplicate record detected',
        'metadata', jsonb_build_object(
          'timestamp', NOW(),
          'operation', 'process_equipment_maintenance_batch',
          'equipment_id', target_equipment_id
        )
      );
    WHEN not_null_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'NULL_VALUE_ERROR',
        'error_message', 'Required field cannot be null: ' || SQLERRM,
        'metadata', jsonb_build_object(
          'timestamp', NOW(),
          'operation', 'process_equipment_maintenance_batch',
          'equipment_id', target_equipment_id
        )
      );
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'UNEXPECTED_ERROR',
        'error_message', 'Error processing maintenance: ' || SQLERRM,
        'error_state', SQLSTATE,
        'metadata', jsonb_build_object(
          'timestamp', NOW(),
          'operation', 'process_equipment_maintenance_batch',
          'equipment_id', target_equipment_id
        )
      );
  END;

END;
$$;


ALTER FUNCTION "public"."process_equipment_maintenance_batch"("maintenance_data" "jsonb", "created_by_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."qr_bind_equipment"("equipment_id" "uuid", "qr_identifier" "text", "user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$

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
$$;


ALTER FUNCTION "public"."qr_bind_equipment"("equipment_id" "uuid", "qr_identifier" "text", "user_id" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."qr_create_binding_internal"("p_qr_id" "uuid", "p_bindable_type" "public"."bindable_type", "p_bindable_id" "uuid", "p_user_id" "uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_audit_event_type" "text" DEFAULT 'bound'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."qr_create_binding_internal"("p_qr_id" "uuid", "p_bindable_type" "public"."bindable_type", "p_bindable_id" "uuid", "p_user_id" "uuid", "p_metadata" "jsonb", "p_audit_event_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."qr_create_del_batch"("p_farm_id" "uuid", "p_requested_quantity" integer, "p_user_id" "uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."qr_create_del_batch"("p_farm_id" "uuid", "p_requested_quantity" integer, "p_user_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."qr_create_prod_batch"("p_quantity" integer, "p_supplier_id" "uuid", "p_user_id" "uuid", "p_generated_by" "text" DEFAULT 'super_admin'::"text", "p_notes" "text" DEFAULT ''::"text") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."qr_create_prod_batch"("p_quantity" integer, "p_supplier_id" "uuid", "p_user_id" "uuid", "p_generated_by" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."qr_generate_del_code"("p_farm_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
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
$_$;


ALTER FUNCTION "public"."qr_generate_del_code"("p_farm_id" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."qr_get_available_count"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."qr_get_available_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."qr_get_binding"("p_identifier" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
            _em.name as make,
            _emo.name as model,
            _et.name as type,
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
                    'name', v_equipment_data.farm,
                    'acres', v_equipment_data.acres
                ),
                'equipment', jsonb_build_object(
                    'id', v_bindable_id,
                    'name', v_equipment_data.equipment_name,
                    'type', v_equipment_data.type,
                    'make', v_equipment_data.make,
                    'model', v_equipment_data.model
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
$$;


ALTER FUNCTION "public"."qr_get_binding"("p_identifier" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."qr_get_stats"("p_farm_id" "uuid" DEFAULT NULL::"uuid", "p_equipment_id" "uuid" DEFAULT NULL::"uuid", "p_production_batch_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."qr_get_stats"("p_farm_id" "uuid", "p_equipment_id" "uuid", "p_production_batch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."qr_mark_as_defective"("p_qr_identifier" "text", "p_user_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."qr_mark_as_defective"("p_qr_identifier" "text", "p_user_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."qr_update_status_with_audit"("p_qr_id" "uuid", "p_new_status" "text", "p_user_id" "uuid", "p_event_data" "jsonb" DEFAULT '{}'::"jsonb", "p_bound_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_farm_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_previous_status TEXT;
  v_qr_record RECORD;
BEGIN
  IF p_qr_id IS NULL OR p_new_status IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT status, short_code, print_position, farm
  INTO v_qr_record
  FROM qr WHERE id = p_qr_id;
  
  IF NOT FOUND THEN RETURN FALSE; END IF;
  
  v_previous_status := v_qr_record.status;
  
  -- Update QR status
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
      ELSE farm
    END,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'status_updated_at', NOW(),
      'status_updated_by', p_user_id,
      'previous_status', v_previous_status
    )
  WHERE id = p_qr_id;
  
  -- Insert audit log (simplified - matches qr_status directly)
  INSERT INTO qr_audit_log (
    id, qr_id, event_type, event_data, user_id, farm_id, created_at
  ) VALUES (
    gen_random_uuid(),
    p_qr_id,
    p_new_status::qr_audit_event_type,
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
  WHEN OTHERS THEN RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."qr_update_status_with_audit"("p_qr_id" "uuid", "p_new_status" "text", "p_user_id" "uuid", "p_event_data" "jsonb", "p_bound_at" timestamp with time zone, "p_farm_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_batch_status"("p_batch_id" "uuid", "p_new_status" "text", "p_user_id" "uuid", "p_notes" "text" DEFAULT ''::"text", "p_defective_info" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_batch_status"("p_batch_id" "uuid", "p_new_status" "text", "p_user_id" "uuid", "p_notes" "text", "p_defective_info" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_equipment"("equipment_id" "uuid", "updated_by_user_id" "uuid", "equipment_name" "text" DEFAULT NULL::"text", "serial_number" "text" DEFAULT NULL::"text", "year_purchased" smallint DEFAULT NULL::smallint, "metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_equipment RECORD;
  final_metadata JSONB;
  param_serial_number TEXT;
  param_year_purchased SMALLINT;
BEGIN
  -- Assign parameters to local variables to avoid ambiguity
  param_serial_number := serial_number;
  param_year_purchased := year_purchased;
  
  -- Validate that at least one field is provided for update
  IF equipment_name IS NULL AND serial_number IS NULL AND year_purchased IS NULL AND metadata IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', 'At least one field must be provided for update. Please provide name, serial_number, year_purchased, or metadata.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'update_equipment',
        'equipment_id', equipment_id
      )
    );
  END IF;

  -- Validate that user exists
  IF NOT EXISTS (SELECT 1 FROM "user" WHERE id = updated_by_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'USER_NOT_FOUND',
      'error_message', 'User not found. Please verify the user ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'update_equipment',
        'equipment_id', equipment_id,
        'user_id', updated_by_user_id
      )
    );
  END IF;
  
  -- Get current equipment data
  SELECT * INTO current_equipment
  FROM equipment 
  WHERE id = equipment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EQUIPMENT_NOT_FOUND',
      'error_message', 'Equipment not found. Please check the equipment ID and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'update_equipment',
        'equipment_id', equipment_id
      )
    );
  END IF;

  -- Validate non-empty values when provided
  IF equipment_name IS NOT NULL AND TRIM(equipment_name) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', 'Equipment name cannot be empty. Please provide a valid name.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'update_equipment',
        'equipment_id', equipment_id
      )
    );
  END IF;

  IF serial_number IS NOT NULL AND TRIM(serial_number) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', 'Serial number cannot be empty. Please provide a valid serial number.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'update_equipment',
        'equipment_id', equipment_id
      )
    );
  END IF;

  -- Validate year_purchased range
  IF year_purchased IS NOT NULL AND (year_purchased < 1800 OR year_purchased > EXTRACT(YEAR FROM NOW()) + 1) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', 'Year purchased must be between 1800 and ' || (EXTRACT(YEAR FROM NOW()) + 1) || '. Please enter a valid year.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'update_equipment',
        'equipment_id', equipment_id
      )
    );
  END IF;

  -- Validate serial_number uniqueness if provided and different from current
  IF serial_number IS NOT NULL AND serial_number != COALESCE(current_equipment.serial_number, '') THEN
    IF EXISTS (SELECT 1 FROM equipment e WHERE e.serial_number = param_serial_number AND e.id != equipment_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'DUPLICATE_SERIAL_NUMBER',
        'error_message', 'This serial number is already in use by another equipment. Please use a different serial number.',
        'metadata', jsonb_build_object(
          'timestamp', NOW(),
          'operation', 'update_equipment',
          'equipment_id', equipment_id
        )
      );
    END IF;
  END IF;

  -- Handle metadata: use provided metadata or keep existing, add audit fields
  final_metadata := COALESCE(metadata, current_equipment.metadata, '{}'::jsonb) ||
    jsonb_build_object(
      'updated_at', NOW(),
      'updated_by', updated_by_user_id
    );

  -- Update equipment record
  UPDATE equipment e
  SET 
    name = COALESCE(equipment_name, e.name),
    serial_number = COALESCE(param_serial_number, e.serial_number),
    year_purchased = COALESCE(param_year_purchased, e.year_purchased),
    metadata = final_metadata
  WHERE e.id = equipment_id;

  -- Get updated equipment record
  SELECT * INTO current_equipment
  FROM equipment 
  WHERE id = equipment_id;

  -- Return complete equipment record
  RETURN jsonb_build_object(
    'success', true,
    'data', row_to_json(current_equipment)::jsonb,
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'update_equipment',
      'version', '2.1',
      'updated_fields', jsonb_build_object(
        'name', equipment_name IS NOT NULL,
        'serial_number', serial_number IS NOT NULL,
        'year_purchased', year_purchased IS NOT NULL,
        'metadata', metadata IS NOT NULL
      )
    )
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_ERROR',
      'error_message', 'This serial number is already in use by another equipment. Please use a different serial number.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'update_equipment',
        'equipment_id', equipment_id
      )
    );
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FOREIGN_KEY_ERROR',
      'error_message', 'Invalid reference data provided. Please check your input and try again.',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'update_equipment',
        'equipment_id', equipment_id
      )
    );
  WHEN check_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'update_equipment',
        'equipment_id', equipment_id
      )
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNEXPECTED_ERROR',
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'update_equipment',
        'equipment_id', equipment_id
      )
    );
END;
$$;


ALTER FUNCTION "public"."update_equipment"("equipment_id" "uuid", "updated_by_user_id" "uuid", "equipment_name" "text", "serial_number" "text", "year_purchased" smallint, "metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_equipment_catalog"("p_equipment_type_id" "uuid", "p_equipment_make_id" "uuid" DEFAULT NULL::"uuid", "p_equipment_model_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_equipment_id UUID;
BEGIN
  -- Validate that equipment_type_id is provided
  IF p_equipment_type_id IS NULL THEN
    RAISE EXCEPTION 'equipment_type_id is required and cannot be NULL';
  END IF;

  -- Try to find existing _equipment record
  -- Build WHERE clause dynamically based on provided parameters
  IF p_equipment_make_id IS NOT NULL AND p_equipment_model_id IS NOT NULL THEN
    -- Search by type, make, and model
    SELECT id INTO v_equipment_id
    FROM _equipment
    WHERE type = p_equipment_type_id
      AND make = p_equipment_make_id
      AND model = p_equipment_model_id;
  ELSIF p_equipment_make_id IS NOT NULL AND p_equipment_model_id IS NULL THEN
    -- Search by type and make only
    SELECT id INTO v_equipment_id
    FROM _equipment
    WHERE type = p_equipment_type_id
      AND make = p_equipment_make_id
      AND model IS NULL;
  ELSIF p_equipment_make_id IS NULL AND p_equipment_model_id IS NOT NULL THEN
    -- Search by type and model only (unusual case, but handle it)
    SELECT id INTO v_equipment_id
    FROM _equipment
    WHERE type = p_equipment_type_id
      AND make IS NULL
      AND model = p_equipment_model_id;
  ELSE
    -- Search by type only
    SELECT id INTO v_equipment_id
    FROM _equipment
    WHERE type = p_equipment_type_id
      AND make IS NULL
      AND model IS NULL;
  END IF;

  -- If not found, create new _equipment record
  IF v_equipment_id IS NULL THEN
    INSERT INTO _equipment (
      type,
      make,
      model,
      year,
      trim,
      metadata,
      created_by,
      created_in
    ) VALUES (
      p_equipment_type_id,
      p_equipment_make_id,
      p_equipment_model_id,
      NULL,  -- year not provided
      NULL,  -- trim not provided
      NULL,  -- metadata not provided
      NULL,  -- created_by not provided
      NULL   -- created_in not provided
    )
    RETURNING id INTO v_equipment_id;
  END IF;

  RETURN v_equipment_id;

EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Invalid reference: equipment_type_id, equipment_make_id, or equipment_model_id does not exist in catalog tables';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Unexpected error in upsert_equipment_catalog: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;


ALTER FUNCTION "public"."upsert_equipment_catalog"("p_equipment_type_id" "uuid", "p_equipment_make_id" "uuid", "p_equipment_model_id" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."upsert_equipment_usage"("p_equipment_id" "uuid", "p_value" numeric, "p_user_id" "uuid", "p_time_id" "uuid" DEFAULT NULL::"uuid", "p_type" "text" DEFAULT NULL::"text", "p_time_metadata" "jsonb" DEFAULT NULL::"jsonb", "p_reason" "text" DEFAULT NULL::"text", "p_is_correction" boolean DEFAULT NULL::boolean, "p_corrected_log_id" "uuid" DEFAULT NULL::"uuid", "p_task_id" "uuid" DEFAULT NULL::"uuid", "p_log_metadata" "jsonb" DEFAULT NULL::"jsonb", "p_is_parent_task" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$

DECLARE
  v_new_time_id UUID;
  v_previous_value NUMERIC := 0;
  v_is_correction BOOLEAN := FALSE;
  v_log_id UUID;
  v_current_type public.time_type;
  v_current_metadata JSONB;
  v_validated_type public.time_type;
  v_activity_log_id UUID;
  v_log_start_time BIGINT := extract(epoch from clock_timestamp()) * 1000;
BEGIN
  -- =====================================================================================
  -- PARAMETER VALIDATION
  -- =====================================================================================
  
  -- CASE 1: Upsert equipment without task (p_time_id IS NULL OR task_id IS NULL)
  -- CASE 2: Update with task (p_time_id IS NOT NULL AND task_id IS NOT NULL)
  -- Both cases are valid - no additional validation needed here

  -- =====================================================================================
  -- CASE 1: UPSERT EQUIPMENT WITHOUT TASK (p_time_id IS NULL)
  -- =====================================================================================
  
  IF p_time_id IS NULL THEN
    -- Validate required parameters for new equipment
    IF p_type IS NULL THEN
      RAISE EXCEPTION 'Time type is required';
    END IF;
    
    IF p_time_metadata IS NULL THEN
      RAISE EXCEPTION 'Time metadata is required';
    END IF;
    
    -- Validate and convert p_type from TEXT to time_type enum
    BEGIN
      v_validated_type := p_type::public.time_type;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid time type: "%"', p_type;
    END;
    
    -- Create TWO identical _time records (one for equipment_usage_type, one for log)
    
    -- 1. Time record for equipment_usage_type (master record)
    DECLARE
      v_equipment_time_id UUID := gen_random_uuid();
    BEGIN
      INSERT INTO _time (
        id,
        type,
        value,
        metadata
      ) VALUES (
        v_equipment_time_id,
        v_validated_type,
        p_value::TEXT,
        p_time_metadata
      );
      
      -- Create equipment_usage_type association
      INSERT INTO equipment_usage_type (
        equipment_id,
        usage_time_id
      ) VALUES (
        p_equipment_id,
        v_equipment_time_id
      );
      
      -- Log activity for equipment time record creation
      v_new_time_id := gen_random_uuid();
      SELECT log_activity(
        'upsert_equipment_usage'::TEXT,                        -- p_function_name
        jsonb_build_object(                                     -- p_input_payload
          'equipment_id', p_equipment_id,
          'value', p_value,
          'user_id', p_user_id,
          'time_id', p_time_id,
          'type', p_type,
          'time_metadata', p_time_metadata,
          'reason', p_reason,
          'is_correction', p_is_correction,
          'corrected_log_id', p_corrected_log_id,
          'task_id', p_task_id,
          'log_metadata', p_log_metadata,
          'is_parent_task', p_is_parent_task
        ),
        jsonb_build_object(                                     -- p_output_result
          'success', true,
          'equipment_time_id', v_equipment_time_id,
          'audit_time_id', v_new_time_id,
          'value', p_value,
          'scenario', 'new_equipment'
        ),
        p_equipment_id,                                         -- p_equipment_id
        CASE WHEN p_task_id IS NOT NULL 
             THEN ARRAY[p_task_id] 
             ELSE NULL END,                                     -- p_task_ids
        p_user_id,                                             -- p_executed_by
        ((extract(epoch from clock_timestamp()) * 1000)::BIGINT - v_log_start_time)::INTEGER, -- p_execution_duration_ms
        ARRAY[v_new_time_id]                                   -- p_time_ids (audit time, not master)
      ) INTO v_activity_log_id;
    END;
    
    -- 2. Time record for equipment_usage_log (log record)
    
    INSERT INTO _time (
      id,
      type,
      value,
      metadata
    ) VALUES (
      v_new_time_id,
      v_validated_type,
      p_value::TEXT,
      p_time_metadata
    );
    
    -- Set previous_value to 0 for new equipment (no task history)
    v_previous_value := 0;
    
  -- =====================================================================================
  -- CASE 2: UPDATE WITH TASK (p_time_id IS NOT NULL)
  -- =====================================================================================
  
  ELSE
    -- Get current _time record details (this is the master time record)
    SELECT 
      t.type,
      t.metadata
    INTO v_current_type, v_current_metadata
    FROM _time t
    WHERE t.id = p_time_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Time record not found for ID: %', p_time_id;
    END IF;
    
    -- UNIFIED PREVIOUS_VALUE LOGIC:
    -- CASE 1: No task_id (NULL) - Get last value (by created_at) for same equipment and same type
    -- CASE 2A: task_id provided AND is_parent_task = TRUE - Same as CASE 1 
    -- CASE 2B: task_id provided AND is_parent_task = FALSE - Get last value for same _task_series
    
    IF p_task_id IS NULL OR p_is_parent_task = TRUE THEN
      -- CASE 1 & 2A: Get last value (by created_at) for same equipment and same type (hour, distance, etc.)
      SELECT eul.value 
      INTO v_previous_value
      FROM equipment_usage_log eul
      JOIN _time t ON eul.usage_time_id = t.id
      WHERE eul.equipment_id = p_equipment_id 
        AND t.type = v_current_type
      ORDER BY eul.created_at DESC
      LIMIT 1;
    ELSE
      -- CASE 2B: Get last value for same _task_series (same type of recurrent work)
      SELECT eul.value 
      INTO v_previous_value
      FROM equipment_usage_log eul
      JOIN task t ON eul.task_id = t.id
      WHERE eul.equipment_id = p_equipment_id 
        AND t._task_series = (
          SELECT _task_series 
          FROM task 
          WHERE id = p_task_id
        )
        AND t.status = 'close'
        AND t.id != p_task_id  -- Exclude current task
      ORDER BY eul.created_at DESC
      LIMIT 1;
    END IF;
    
    -- If no previous entry found, use 0
    IF v_previous_value IS NULL THEN
      v_previous_value := 0;
    END IF;
    
    -- Check if this is a correction (decrease in value)
    IF p_value < v_previous_value THEN
      v_is_correction := TRUE;
    END IF;
    
    -- Use manual correction flag if provided
    IF p_is_correction IS NOT NULL THEN
      v_is_correction := p_is_correction;
    END IF;
    
    -- Validate that corrections have a reason
    IF v_is_correction AND (p_reason IS NULL OR trim(p_reason) = '') THEN
      RAISE EXCEPTION 'Reason is required when decreasing usage value or when is_correction is true';
    END IF;
    
    -- Create new _time record for the log entry
    v_new_time_id := gen_random_uuid();
    INSERT INTO _time (
      id,
      type,
      value,
      metadata
    ) VALUES (
      v_new_time_id,
      v_current_type,
      p_value::TEXT,
      v_current_metadata
    );
    
    -- UPDATE the master _time record value (equipment_usage_type keeps same reference)
    RAISE NOTICE 'About to UPDATE _time with id: % to value: %', p_time_id, p_value;
    
    UPDATE _time 
    SET value = p_value::TEXT
    WHERE id = p_time_id;
    
    -- Debug: verify the update worked
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Failed to update _time record with id: %', p_time_id;
    ELSE
      RAISE NOTICE 'Successfully updated _time record with id: %', p_time_id;
    END IF;
    
    -- Log activity for equipment time record update
    IF p_is_parent_task = TRUE OR (p_time_id IS NOT NULL AND p_task_id IS NULL) THEN
      SELECT log_activity(
        'upsert_equipment_usage'::TEXT,                        -- p_function_name
        jsonb_build_object(                                     -- p_input_payload
          'equipment_id', p_equipment_id,
          'value', p_value,
          'user_id', p_user_id,
          'time_id', p_time_id,
          'type', p_type,
          'time_metadata', p_time_metadata,
          'reason', p_reason,
          'is_correction', p_is_correction,
          'corrected_log_id', p_corrected_log_id,
          'task_id', p_task_id,
          'log_metadata', p_log_metadata,
          'is_parent_task', p_is_parent_task
        ),
        jsonb_build_object(                                     -- p_output_result
          'success', true,
          'updated_time_id', p_time_id,
          'audit_time_id', v_new_time_id,
          'previous_value', v_previous_value,
          'new_value', p_value,
          'is_correction', v_is_correction,
          'scenario', 'existing_equipment'
        ),
        p_equipment_id,                                         -- p_equipment_id
        CASE WHEN p_task_id IS NOT NULL 
            THEN ARRAY[p_task_id] 
            ELSE NULL END,                                     -- p_task_ids
        p_user_id,                                             -- p_executed_by
        ((extract(epoch from clock_timestamp()) * 1000)::BIGINT - v_log_start_time)::INTEGER, -- p_execution_duration_ms
        ARRAY[v_new_time_id]                                   -- p_time_ids (audit time, not master)
      ) INTO v_activity_log_id;
    END IF;
      
  END IF;
  
  -- =====================================================================================
  -- CREATE EQUIPMENT_USAGE_LOG ENTRY (BOTH CASES)
  -- =====================================================================================
  
  INSERT INTO equipment_usage_log (
    equipment_id,
    usage_time_id,
    value,
    previous_value,
    reason,
    created_by,
    is_correction,
    corrected_log_id,
    task_id,
    metadata
  ) VALUES (
    p_equipment_id,
    v_new_time_id,
    p_value,
    v_previous_value,
    p_reason,
    p_user_id,
    v_is_correction,
    p_corrected_log_id,
    p_task_id,
    p_log_metadata
  )
  RETURNING id INTO v_log_id;
  
  -- =====================================================================================
  -- RETURN STRUCTURED RESULT
  -- =====================================================================================
  
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'log_id', v_log_id,
      'time_id', v_new_time_id,
      'previous_value', v_previous_value,
      'new_value', p_value,
      'is_correction', v_is_correction,
      'scenario', CASE WHEN p_time_id IS NULL THEN 'new_equipment' ELSE 'existing_equipment' END
    ),
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'upsert_equipment_usage',
      'version', '2.0'
    )
  );
  
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_USAGE_TYPE',
      'error_message', 'Invalid usage_type: "' || p_type || '". Valid values are: hour, day, month, year, kilometer, mile',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'upsert_equipment_usage',
        'equipment_id', p_equipment_id,
        'invalid_usage_type', p_type
      )
    );
  WHEN check_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VALIDATION_ERROR',
      'error_message', SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'upsert_equipment_usage',
        'equipment_id', p_equipment_id
      )
    );
  WHEN foreign_key_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FOREIGN_KEY_ERROR',
      'error_message', 'Referenced record not found - check equipment_id, user_id, or time_id',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'upsert_equipment_usage',
        'equipment_id', p_equipment_id
      )
    );
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_ERROR',
      'error_message', 'Duplicate record detected',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'upsert_equipment_usage',
        'equipment_id', p_equipment_id
      )
    );
  WHEN not_null_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NULL_VALUE_ERROR',
      'error_message', 'Required field cannot be null: ' || SQLERRM,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'upsert_equipment_usage',
        'equipment_id', p_equipment_id
      )
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNEXPECTED_ERROR',
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'upsert_equipment_usage',
        'equipment_id', p_equipment_id
      )
    );
END;
$$;


ALTER FUNCTION "public"."upsert_equipment_usage"("p_equipment_id" "uuid", "p_value" numeric, "p_user_id" "uuid", "p_time_id" "uuid", "p_type" "text", "p_time_metadata" "jsonb", "p_reason" "text", "p_is_correction" boolean, "p_corrected_log_id" "uuid", "p_task_id" "uuid", "p_log_metadata" "jsonb", "p_is_parent_task" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_equipment_combination"("equipment_model_id" "uuid", "make_id" "uuid", "equipment_type_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE PARALLEL SAFE
    AS $$
DECLARE
  validated_equipment_id UUID;
BEGIN
  -- Validate equipment lookup using type, make, and model
  SELECT e.id INTO validated_equipment_id
  FROM _equipment e
  JOIN _equipment_model em ON e.model = em.id
  WHERE em.id = equipment_model_id
    AND e.make = make_id
    AND e.type = equipment_type_id;
  
  -- Return the validated equipment ID (NULL if not found)
  RETURN validated_equipment_id;
END;
$$;


ALTER FUNCTION "public"."validate_equipment_combination"("equipment_model_id" "uuid", "make_id" "uuid", "equipment_type_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_global_user_permissions"("p_user_id" "uuid", "p_required_role" "text" DEFAULT 'super_admin'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_global_user_permissions"("p_user_id" "uuid", "p_required_role" "text") OWNER TO "supabase_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."_address" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "address_lines" "text"[] NOT NULL,
    "province" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "country" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_address" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_consumable" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_consumable" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_consumable_type" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_in" "uuid"
);


ALTER TABLE "public"."_consumable_type" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_email" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_email" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "year" smallint,
    "make" "uuid",
    "model" "uuid",
    "trim" "uuid",
    "type" "uuid",
    "metadata" "jsonb",
    "created_by" "uuid",
    "created_in" "uuid"
);


ALTER TABLE "public"."_equipment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_equipment_make" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "created_in" "uuid"
);


ALTER TABLE "public"."_equipment_make" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_equipment_model" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "created_in" "uuid",
    "make" "uuid"
);


ALTER TABLE "public"."_equipment_model" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_equipment_trim" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "created_in" "uuid",
    "make" "uuid",
    "model" "uuid"
);


ALTER TABLE "public"."_equipment_trim" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_equipment_type" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "created_in" "uuid",
    "description" "text"
);


ALTER TABLE "public"."_equipment_type" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_farm_crop" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "farm" "uuid",
    "crop" "uuid"
);


ALTER TABLE "public"."_farm_crop" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_farm_user" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "farm" "uuid",
    "user" "uuid",
    "role" "public"."user_farm_role",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_farm_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_part" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_part" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_part_type" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_in" "uuid"
);


ALTER TABLE "public"."_part_type" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_phone" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "country_code" "text",
    "phone_number" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."_phone" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_task_series" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "schedule" "uuid" NOT NULL,
    "type" "public"."task_type" NOT NULL,
    "task_template" "uuid",
    "_equipment_type" "uuid",
    "_equipment" "uuid",
    "equipment" "uuid",
    "_part_type" "uuid",
    "_part" "uuid",
    "part" "uuid",
    "_consumable_type" "uuid",
    "_consumable" "uuid",
    "created_by" "uuid",
    "created_in" "uuid"
);


ALTER TABLE "public"."_task_series" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_task_user" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user" "uuid" NOT NULL,
    "task" "uuid" NOT NULL,
    "relationship" "text" NOT NULL
);


ALTER TABLE "public"."_task_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_time" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."time_type" NOT NULL,
    "metadata" "jsonb",
    "value" "text" NOT NULL
);


ALTER TABLE "public"."_time" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "function_name" "text" NOT NULL,
    "input_payload" "jsonb" NOT NULL,
    "output_result" "jsonb",
    "equipment_id" "uuid",
    "task_ids" "uuid"[],
    "time_ids" "uuid"[],
    "executed_by" "uuid" NOT NULL,
    "executed_at" timestamp with time zone DEFAULT "now"(),
    "execution_duration_ms" integer,
    "execution_status" "text" DEFAULT 'success'::"text",
    "error_details" "jsonb"
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attachment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task" "uuid",
    "type" "public"."file_type_enum" NOT NULL,
    "url" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb",
    "order" smallint DEFAULT '0'::smallint,
    "equipment" "uuid",
    "_equipment" "uuid",
    "_part" "uuid",
    "part" "uuid",
    "_consumable" "uuid",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "attachment_url_not_empty" CHECK ((TRIM(BOTH FROM "url") <> ''::"text")),
    CONSTRAINT "attachment_url_valid" CHECK (("url" ~* '^https?://.*'::"text"))
);


ALTER TABLE "public"."attachment" OWNER TO "postgres";


COMMENT ON TABLE "public"."attachment" IS 'File attachments associated with tasks, equipment, parts, consumables (photos, videos, documents, audio)';



COMMENT ON COLUMN "public"."attachment"."type" IS 'File type: image, video, document, audio';



COMMENT ON COLUMN "public"."attachment"."url" IS 'Complete URL of the stored file';



COMMENT ON COLUMN "public"."attachment"."metadata" IS 'Specific metadata like dimensions, duration, size, format, etc.';



COMMENT ON COLUMN "public"."attachment"."order" IS 'Display order for attachments (0 = first)';



COMMENT ON COLUMN "public"."attachment"."equipment" IS 'Equipment ID if attachment is related to equipment';



COMMENT ON COLUMN "public"."attachment"."created_by" IS 'User who uploaded the file';



CREATE TABLE IF NOT EXISTS "public"."crop" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "metadata" "jsonb",
    "created_by" "uuid",
    "created_in" "uuid"
);


ALTER TABLE "public"."crop" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "year_purchased" smallint,
    "serial_number" "text",
    "_equipment" "uuid",
    "metadata" "jsonb",
    "farm" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "last_scanned_at" timestamp with time zone,
    "last_scanned_by" "uuid"
);


ALTER TABLE "public"."equipment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."task_type",
    "_task_series" "uuid",
    "name" "text",
    "description" "text",
    "metadata" "jsonb",
    "priority" "text",
    "status" "public"."task_status_type",
    "part" "uuid",
    "equipment" "uuid",
    "parent_task" "uuid",
    "_equipment" "uuid",
    "_equipment_type" "uuid",
    "_part" "uuid",
    "_part_type" "uuid",
    "_consumable_type" "uuid",
    "_consumable" "uuid",
    "completed_at" "uuid",
    "due_at" "uuid",
    "part_number" "text"
);


ALTER TABLE "public"."task" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."equipment_default_tasks" WITH ("security_invoker"='on') AS
 WITH "_equipment_maintenance" AS (
         SELECT "ts"."_equipment" AS "_equipment_id",
            "ts"."_equipment_type" AS "_equipment_type_id",
            COALESCE("ts"."_part_type", "ts"."_consumable_type") AS "_maintenance_id",
            "ts"."id" AS "task_series_id",
            "ts"."_part_type",
            "ts"."_consumable_type",
            "t"."name" AS "maintenance_name",
            "t"."description" AS "maintenance_description",
            "tm"."id" AS "schedule_id",
            "tm"."value" AS "schedule_value",
            "tm"."type" AS "schedule_type",
            "tm"."metadata" AS "schedule_metadata",
            '_equipment_maintenance'::"text" AS "maintenance_level"
           FROM (("public"."_task_series" "ts"
             JOIN "public"."task" "t" ON ((("ts"."task_template" = "t"."id") AND ("t"."type" = 'template:maintenance'::"public"."task_type"))))
             JOIN "public"."_time" "tm" ON (("ts"."schedule" = "tm"."id")))
          WHERE ("ts"."_equipment" IS NOT NULL)
        ), "_equipment_type_maintenance" AS (
         SELECT NULL::"uuid" AS "_equipment_id",
            "ts"."_equipment_type" AS "_equipment_type_id",
            COALESCE("ts"."_part_type", "ts"."_consumable_type") AS "_maintenance_id",
            "ts"."id" AS "task_series_id",
            "ts"."_part_type",
            "ts"."_consumable_type",
            "t"."name" AS "maintenance_name",
            "t"."description" AS "maintenance_description",
            "tm"."id" AS "schedule_id",
            "tm"."value" AS "schedule_value",
            "tm"."type" AS "schedule_type",
            "tm"."metadata" AS "schedule_metadata",
            '_equipment_type_maintenance'::"text" AS "maintenance_level"
           FROM (("public"."_task_series" "ts"
             JOIN "public"."task" "t" ON ((("ts"."task_template" = "t"."id") AND ("t"."type" = 'template:maintenance'::"public"."task_type"))))
             JOIN "public"."_time" "tm" ON (("ts"."schedule" = "tm"."id")))
          WHERE (("ts"."_equipment" IS NULL) AND ("ts"."_equipment_type" IS NOT NULL))
        )
 SELECT "_equipment_maintenance"."_equipment_id",
    "_equipment_maintenance"."_equipment_type_id",
    "_equipment_maintenance"."_maintenance_id",
    "_equipment_maintenance"."task_series_id",
    "_equipment_maintenance"."schedule_id",
    "_equipment_maintenance"."schedule_value",
    "_equipment_maintenance"."schedule_type",
    "_equipment_maintenance"."schedule_metadata",
    "_equipment_maintenance"."maintenance_name",
    "_equipment_maintenance"."maintenance_description",
    "_equipment_maintenance"."maintenance_level",
        CASE
            WHEN ("_equipment_maintenance"."_part_type" IS NOT NULL) THEN 'part_type'::"text"
            WHEN ("_equipment_maintenance"."_consumable_type" IS NOT NULL) THEN 'consumable_type'::"text"
            ELSE NULL::"text"
        END AS "maintenance_type"
   FROM "_equipment_maintenance"
UNION ALL
 SELECT "_equipment_type_maintenance"."_equipment_id",
    "_equipment_type_maintenance"."_equipment_type_id",
    "_equipment_type_maintenance"."_maintenance_id",
    "_equipment_type_maintenance"."task_series_id",
    "_equipment_type_maintenance"."schedule_id",
    "_equipment_type_maintenance"."schedule_value",
    "_equipment_type_maintenance"."schedule_type",
    "_equipment_type_maintenance"."schedule_metadata",
    "_equipment_type_maintenance"."maintenance_name",
    "_equipment_type_maintenance"."maintenance_description",
    "_equipment_type_maintenance"."maintenance_level",
        CASE
            WHEN ("_equipment_type_maintenance"."_part_type" IS NOT NULL) THEN 'part_type'::"text"
            WHEN ("_equipment_type_maintenance"."_consumable_type" IS NOT NULL) THEN 'consumable_type'::"text"
            ELSE NULL::"text"
        END AS "maintenance_type"
   FROM "_equipment_type_maintenance";


ALTER VIEW "public"."equipment_default_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_usage_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "usage_time_id" "uuid" NOT NULL,
    "value" numeric NOT NULL,
    "previous_value" numeric,
    "reason" "text",
    "created_by" "uuid" NOT NULL,
    "is_correction" boolean DEFAULT false,
    "corrected_log_id" "uuid",
    "task_id" "uuid",
    "metadata" "jsonb"
);


ALTER TABLE "public"."equipment_usage_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_usage_type" (
    "equipment_id" "uuid" NOT NULL,
    "usage_time_id" "uuid" NOT NULL
);


ALTER TABLE "public"."equipment_usage_type" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qr" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "short_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "bound_at" timestamp with time zone,
    "farm" "uuid",
    "print_position" integer,
    "metadata" "jsonb",
    "qr_production_batch_id" "uuid",
    "status" "public"."qr_status" DEFAULT 'generated'::"public"."qr_status" NOT NULL
);


ALTER TABLE "public"."qr" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qr_binding" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "qr_id" "uuid" NOT NULL,
    "bindable_type" "public"."bindable_type" NOT NULL,
    "bindable_id" "uuid" NOT NULL,
    "bound_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bound_by" "uuid",
    "unbound_at" timestamp with time zone,
    "unbound_by" "uuid",
    "unbound_reason" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb"
);


ALTER TABLE "public"."qr_binding" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."equipment_with_current_usage" WITH ("security_invoker"='on') AS
 SELECT "e"."id",
    "e"."created_at",
    "e"."name",
    "e"."year_purchased",
    "e"."serial_number",
    "e"."metadata",
    ( SELECT COALESCE("jsonb_agg"("jsonb_build_object"('id', "a"."id", 'url', "a"."url", 'description', "a"."description", 'metadata', "a"."metadata", 'created_at', "a"."created_at") ORDER BY "a"."created_at" DESC), '[]'::"jsonb") AS "coalesce"
           FROM "public"."attachment" "a"
          WHERE ("a"."equipment" = "e"."id")) AS "attachments",
    "e"."_equipment",
    "e"."farm",
    "eq"."year",
    "eq"."type",
    "eq"."make",
    "eq"."model",
    "eq"."trim",
    "emk"."id" AS "equipment_make_id",
    "emk"."name" AS "equipment_make_name",
    "emd"."id" AS "equipment_model_id",
    "emd"."name" AS "equipment_model_name",
    "et"."id" AS "equipment_type_id",
    "et"."name" AS "equipment_type_name",
    "et"."description" AS "equipment_type_description",
    COALESCE(( SELECT "json_agg"("json_build_object"('usage_time_id', "t"."id", 'usage_type', "t"."type", 'usage_current_value',
                CASE
                    WHEN ("t"."type" = ANY (ARRAY['hour'::"public"."time_type", 'distance'::"public"."time_type"])) THEN ((("t"."value")::numeric)::integer)::"text"
                    ELSE "t"."value"
                END, 'usage_last_updated', "t"."created_at", 'metadata', "t"."metadata")) AS "json_agg"
           FROM ("public"."equipment_usage_type" "eut"
             LEFT JOIN "public"."_time" "t" ON (("eut"."usage_time_id" = "t"."id")))
          WHERE ("eut"."equipment_id" = "e"."id")), '[]'::"json") AS "usage_types",
    ( SELECT
                CASE
                    WHEN ("count"(*) = 0) THEN NULL::"jsonb"
                    ELSE "jsonb_agg"("jsonb_build_object"('qr_id', "qr"."id", 'short_code', "qr"."short_code", 'status', "qr"."status", 'bound_at', "qrb"."bound_at", 'bound_by', "qrb"."bound_by", 'binding_id', "qrb"."id", 'binding_metadata', COALESCE("qrb"."metadata", '{}'::"jsonb")) ORDER BY "qrb"."bound_at" DESC)
                END AS "jsonb_agg"
           FROM ("public"."qr_binding" "qrb"
             JOIN "public"."qr" "qr" ON (("qr"."id" = "qrb"."qr_id")))
          WHERE (("qrb"."bindable_id" = "e"."id") AND ("qrb"."bindable_type" = 'equipment'::"public"."bindable_type") AND ("qrb"."is_active" = true))) AS "qr_codes"
   FROM (((("public"."equipment" "e"
     LEFT JOIN "public"."_equipment" "eq" ON (("eq"."id" = "e"."_equipment")))
     LEFT JOIN "public"."_equipment_make" "emk" ON (("emk"."id" = "eq"."make")))
     LEFT JOIN "public"."_equipment_model" "emd" ON (("emd"."id" = "eq"."model")))
     LEFT JOIN "public"."_equipment_type" "et" ON (("et"."id" = "eq"."type")));


ALTER VIEW "public"."equipment_with_current_usage" OWNER TO "supabase_admin";


COMMENT ON VIEW "public"."equipment_with_current_usage" IS 'Equipment view with current usage tracking and QR code binding information. 
Includes all equipment details, usage types, attachments, and active QR bindings.
New fields: 
  - qr_codes: NULL if no QR codes, or JSONB array of bound QR codes
  
QR codes array structure (when not NULL):
  [{
    qr_id: uuid,
    short_code: text,
    status: text,
    bound_at: timestamp,
    bound_by: uuid,
    binding_id: uuid,
    binding_metadata: jsonb
  }, ...]';



CREATE TABLE IF NOT EXISTS "public"."farm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb",
    "acres" real NOT NULL,
    "name" "text" NOT NULL,
    "status" boolean DEFAULT true
);


ALTER TABLE "public"."farm" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "farm" "uuid",
    "expires_at" timestamp without time zone DEFAULT ("now"() + '00:15:00'::interval),
    "role" "public"."user_farm_role" DEFAULT 'guest'::"public"."user_farm_role" NOT NULL,
    "phone" "uuid",
    "email" "uuid",
    "address" "uuid",
    "short_code" "text",
    CONSTRAINT "only_one_contact_method" CHECK (("num_nonnulls"("phone", "email", "address") <= 1))
);


ALTER TABLE "public"."invitation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."note" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reference_table" "public"."note_type",
    "reference_table_id" "uuid" DEFAULT "gen_random_uuid"(),
    "parent_id" "uuid" DEFAULT "gen_random_uuid"(),
    "created_by" "uuid" DEFAULT "gen_random_uuid"(),
    "note" "text"
);


ALTER TABLE "public"."note" OWNER TO "postgres";


ALTER TABLE "public"."note" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."note_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."open_maintenance_tasks" WITH ("security_invoker"='true') AS
 WITH "open_maintenance_tasks" AS (
         SELECT "t_1"."id" AS "task_id",
            "t_1"."equipment" AS "equipment_id",
            "t_1"."_task_series",
                CASE
                    WHEN ("t_1"."_part_type" IS NOT NULL) THEN "t_1"."_part_type"
                    WHEN ("t_1"."_consumable_type" IS NOT NULL) THEN "t_1"."_consumable_type"
                    ELSE NULL::"uuid"
                END AS "maintenance_id",
                CASE
                    WHEN ("t_1"."_part_type" IS NOT NULL) THEN 'part_type'::"text"
                    WHEN ("t_1"."_consumable_type" IS NOT NULL) THEN 'consumable_type'::"text"
                    ELSE NULL::"text"
                END AS "maintenance_type"
           FROM "public"."task" "t_1"
          WHERE (("t_1"."type" = 'maintenance'::"public"."task_type") AND ("t_1"."status" = 'open'::"public"."task_status_type") AND ("t_1"."equipment" IS NOT NULL))
        ), "maintenance_schedules" AS (
         SELECT "ts"."id" AS "task_series_id",
            "jsonb_build_object"('type', "tm"."type", 'metadata', "tm"."metadata", 'value', "tm"."value") AS "schedule_info"
           FROM ("public"."_task_series" "ts"
             JOIN "public"."_time" "tm" ON (("ts"."schedule" = "tm"."id")))
          WHERE ("ts"."type" = 'maintenance'::"public"."task_type")
        ), "maintenance_descriptions" AS (
         SELECT "pt"."id" AS "maintenance_id",
            'part_type'::"text" AS "maintenance_type",
            "pt"."description" AS "maintenance_description"
           FROM "public"."_part_type" "pt"
        UNION ALL
         SELECT "ct"."id" AS "maintenance_id",
            'consumable_type'::"text" AS "maintenance_type",
            "ct"."description" AS "maintenance_description"
           FROM "public"."_consumable_type" "ct"
        )
 SELECT "omt"."task_id",
    "omt"."equipment_id",
    "omt"."maintenance_id",
    "t"."name" AS "maintenance_name",
    "t"."description" AS "maintenance_description",
    "omt"."maintenance_type",
    "t"."part_number",
    "ms"."schedule_info" AS "schedule",
    "public"."get_last_completion_by_task_series"("omt"."task_id", "omt"."equipment_id") AS "last_service"
   FROM ((("open_maintenance_tasks" "omt"
     LEFT JOIN "public"."task" "t" ON (("omt"."task_id" = "t"."id")))
     LEFT JOIN "maintenance_schedules" "ms" ON (("omt"."_task_series" = "ms"."task_series_id")))
     LEFT JOIN "maintenance_descriptions" "md" ON ((("omt"."maintenance_id" = "md"."maintenance_id") AND ("omt"."maintenance_type" = "md"."maintenance_type"))));


ALTER VIEW "public"."open_maintenance_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."part" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."part" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qr_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "qr_id" "uuid" NOT NULL,
    "event_data" "jsonb",
    "user_id" "uuid",
    "farm_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_type" "public"."qr_audit_event_type" NOT NULL
);


ALTER TABLE "public"."qr_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qr_delivery_batch" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "delivery_code" "text" NOT NULL,
    "farm_id" "uuid" NOT NULL,
    "requested_quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "allocated_at" timestamp with time zone,
    "created_by" "uuid",
    "metadata" "jsonb"
);


ALTER TABLE "public"."qr_delivery_batch" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."qr_delivery_batch_sequence"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."qr_delivery_batch_sequence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qr_production_batch" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_code" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "supplier_id" "uuid",
    "metadata" "jsonb",
    "generated_by" "text",
    "allocated_quantity" integer DEFAULT 0,
    "status" "public"."production_batch_status" DEFAULT 'ordered'::"public"."production_batch_status" NOT NULL,
    CONSTRAINT "qr_production_batch_generated_by_check" CHECK (("generated_by" = ANY (ARRAY['farm'::"text", 'super_admin'::"text"])))
);


ALTER TABLE "public"."qr_production_batch" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."qr_production_batch_sequence"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."qr_production_batch_sequence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qr_supplier" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "metadata" "jsonb"
);


ALTER TABLE "public"."qr_supplier" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "global_role" "public"."global_user_role" DEFAULT 'regular_user'::"public"."global_user_role"
);


ALTER TABLE "public"."user" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_profiles" WITH ("security_invoker"='on') AS
 SELECT "users"."id",
    "users"."email",
    "users"."created_at"
   FROM "auth"."users";


ALTER VIEW "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."_address"
    ADD CONSTRAINT "_address_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_consumable"
    ADD CONSTRAINT "_consumable_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_consumable_type"
    ADD CONSTRAINT "_consumable_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_equipment_make"
    ADD CONSTRAINT "_equipment_make_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_equipment_model"
    ADD CONSTRAINT "_equipment_model_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_equipment"
    ADD CONSTRAINT "_equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_equipment_trim"
    ADD CONSTRAINT "_equipment_trim_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_equipment_type"
    ADD CONSTRAINT "_equipment_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_farm_crop"
    ADD CONSTRAINT "_farm_crop_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_farm_user"
    ADD CONSTRAINT "_farm_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_part"
    ADD CONSTRAINT "_part_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_part_type"
    ADD CONSTRAINT "_part_type_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_phone"
    ADD CONSTRAINT "_phone_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_task_user"
    ADD CONSTRAINT "_task_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_time"
    ADD CONSTRAINT "_time_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attachment"
    ADD CONSTRAINT "attachment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crop"
    ADD CONSTRAINT "crop_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_email"
    ADD CONSTRAINT "email_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_usage_log"
    ADD CONSTRAINT "equipment_usage_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_usage_type"
    ADD CONSTRAINT "equipment_usage_type_pkey" PRIMARY KEY ("equipment_id", "usage_time_id");



ALTER TABLE ONLY "public"."farm"
    ADD CONSTRAINT "farm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation"
    ADD CONSTRAINT "invitation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation"
    ADD CONSTRAINT "invitation_short_code_key" UNIQUE ("short_code");



ALTER TABLE ONLY "public"."note"
    ADD CONSTRAINT "note_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."part"
    ADD CONSTRAINT "part_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_audit_log"
    ADD CONSTRAINT "qr_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_binding"
    ADD CONSTRAINT "qr_binding_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_delivery_batch"
    ADD CONSTRAINT "qr_delivery_batch_delivery_code_key" UNIQUE ("delivery_code");



ALTER TABLE ONLY "public"."qr_delivery_batch"
    ADD CONSTRAINT "qr_delivery_batch_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr"
    ADD CONSTRAINT "qr_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_production_batch"
    ADD CONSTRAINT "qr_production_batch_batch_code_key" UNIQUE ("batch_code");



ALTER TABLE ONLY "public"."qr_production_batch"
    ADD CONSTRAINT "qr_production_batch_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr"
    ADD CONSTRAINT "qr_short_code_key" UNIQUE ("short_code");



ALTER TABLE ONLY "public"."qr_supplier"
    ADD CONSTRAINT "qr_supplier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");



CREATE INDEX "equipment_usage_log_created_at_idx" ON "public"."equipment_usage_log" USING "btree" ("created_at");



CREATE INDEX "equipment_usage_log_equipment_id_idx" ON "public"."equipment_usage_log" USING "btree" ("equipment_id");



CREATE INDEX "equipment_usage_log_usage_time_id_idx" ON "public"."equipment_usage_log" USING "btree" ("usage_time_id");



CREATE INDEX "idx_activity_log_equipment_date" ON "public"."activity_log" USING "btree" ("equipment_id", "executed_at" DESC);



CREATE INDEX "idx_activity_log_equipment_id" ON "public"."activity_log" USING "btree" ("equipment_id");



CREATE INDEX "idx_activity_log_executed_at" ON "public"."activity_log" USING "btree" ("executed_at" DESC);



CREATE INDEX "idx_activity_log_executed_by" ON "public"."activity_log" USING "btree" ("executed_by");



CREATE INDEX "idx_activity_log_execution_status" ON "public"."activity_log" USING "btree" ("execution_status");



CREATE INDEX "idx_activity_log_function_date" ON "public"."activity_log" USING "btree" ("function_name", "executed_at" DESC);



CREATE INDEX "idx_activity_log_function_name" ON "public"."activity_log" USING "btree" ("function_name");



CREATE INDEX "idx_activity_log_input_payload_gin" ON "public"."activity_log" USING "gin" ("input_payload");



CREATE INDEX "idx_activity_log_output_result_gin" ON "public"."activity_log" USING "gin" ("output_result");



CREATE INDEX "idx_activity_log_task_ids_gin" ON "public"."activity_log" USING "gin" ("task_ids");



CREATE INDEX "idx_activity_log_time_ids_gin" ON "public"."activity_log" USING "gin" ("time_ids");



CREATE INDEX "idx_attachment_created_at" ON "public"."attachment" USING "btree" ("created_at");



CREATE INDEX "idx_attachment_created_by" ON "public"."attachment" USING "btree" ("created_by");



CREATE INDEX "idx_attachment_equipment" ON "public"."attachment" USING "btree" ("equipment");



CREATE INDEX "idx_attachment_order" ON "public"."attachment" USING "btree" ("order");



CREATE INDEX "idx_attachment_task" ON "public"."attachment" USING "btree" ("task");



CREATE INDEX "idx_attachment_type" ON "public"."attachment" USING "btree" ("type");



CREATE INDEX "idx_invitation_short_code" ON "public"."invitation" USING "btree" ("short_code");



CREATE INDEX "idx_qr_audit_log_farm" ON "public"."qr_audit_log" USING "btree" ("farm_id");



CREATE INDEX "idx_qr_audit_log_qr" ON "public"."qr_audit_log" USING "btree" ("qr_id");



CREATE INDEX "idx_qr_audit_log_time" ON "public"."qr_audit_log" USING "btree" ("created_at");



CREATE INDEX "idx_qr_audit_log_user" ON "public"."qr_audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_qr_binding_active" ON "public"."qr_binding" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_qr_binding_bindable" ON "public"."qr_binding" USING "btree" ("bindable_type", "bindable_id");



CREATE INDEX "idx_qr_binding_qr" ON "public"."qr_binding" USING "btree" ("qr_id");



CREATE UNIQUE INDEX "idx_qr_binding_unique_active" ON "public"."qr_binding" USING "btree" ("qr_id") WHERE ("is_active" = true);



CREATE INDEX "idx_qr_delivery_batch_farm" ON "public"."qr_delivery_batch" USING "btree" ("farm_id");



CREATE INDEX "idx_qr_farm" ON "public"."qr" USING "btree" ("farm");



CREATE INDEX "idx_qr_production_batch" ON "public"."qr" USING "btree" ("qr_production_batch_id");



CREATE INDEX "idx_qr_short_code" ON "public"."qr" USING "btree" ("short_code");



CREATE INDEX "idx_task_series_equipment" ON "public"."_task_series" USING "btree" ("_equipment") WHERE ("_equipment" IS NOT NULL);



CREATE INDEX "idx_task_series_equipment_type" ON "public"."_task_series" USING "btree" ("_equipment_type") WHERE (("_equipment" IS NULL) AND ("_equipment_type" IS NOT NULL));



CREATE INDEX "idx_task_series_maintenance_types" ON "public"."_task_series" USING "btree" ("_part_type", "_consumable_type") WHERE (("_part_type" IS NOT NULL) OR ("_consumable_type" IS NOT NULL));



CREATE INDEX "idx_task_template_maintenance" ON "public"."task" USING "btree" ("id", "type", "name") WHERE ("type" = 'template:maintenance'::"public"."task_type");



ALTER TABLE ONLY "public"."_consumable_type"
    ADD CONSTRAINT "_consumable_type_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."_consumable_type"
    ADD CONSTRAINT "_consumable_type_created_in_fkey" FOREIGN KEY ("created_in") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."_equipment"
    ADD CONSTRAINT "_equipment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment"
    ADD CONSTRAINT "_equipment_created_in_fkey" FOREIGN KEY ("created_in") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_make"
    ADD CONSTRAINT "_equipment_make_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_make"
    ADD CONSTRAINT "_equipment_make_created_in_fkey" FOREIGN KEY ("created_in") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment"
    ADD CONSTRAINT "_equipment_make_fkey" FOREIGN KEY ("make") REFERENCES "public"."_equipment_make"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_model"
    ADD CONSTRAINT "_equipment_model_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_model"
    ADD CONSTRAINT "_equipment_model_created_in_fkey" FOREIGN KEY ("created_in") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment"
    ADD CONSTRAINT "_equipment_model_fkey" FOREIGN KEY ("model") REFERENCES "public"."_equipment_model"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_model"
    ADD CONSTRAINT "_equipment_model_make_fkey" FOREIGN KEY ("make") REFERENCES "public"."_equipment_make"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_trim"
    ADD CONSTRAINT "_equipment_trim_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_trim"
    ADD CONSTRAINT "_equipment_trim_created_in_fkey" FOREIGN KEY ("created_in") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment"
    ADD CONSTRAINT "_equipment_trim_fkey" FOREIGN KEY ("trim") REFERENCES "public"."_equipment_trim"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_trim"
    ADD CONSTRAINT "_equipment_trim_make_fkey" FOREIGN KEY ("make") REFERENCES "public"."_equipment_make"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_trim"
    ADD CONSTRAINT "_equipment_trim_model_fkey" FOREIGN KEY ("model") REFERENCES "public"."_equipment_model"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_type"
    ADD CONSTRAINT "_equipment_type_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment_type"
    ADD CONSTRAINT "_equipment_type_created_in_fkey" FOREIGN KEY ("created_in") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_equipment"
    ADD CONSTRAINT "_equipment_type_fkey" FOREIGN KEY ("type") REFERENCES "public"."_equipment_type"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_farm_crop"
    ADD CONSTRAINT "_farm_crop_crop_fkey" FOREIGN KEY ("crop") REFERENCES "public"."crop"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_farm_crop"
    ADD CONSTRAINT "_farm_crop_farm_fkey" FOREIGN KEY ("farm") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_farm_user"
    ADD CONSTRAINT "_farm_user_farm_fkey" FOREIGN KEY ("farm") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_farm_user"
    ADD CONSTRAINT "_farm_user_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_part_type"
    ADD CONSTRAINT "_part_type_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."_part_type"
    ADD CONSTRAINT "_part_type_created_in_fkey" FOREIGN KEY ("created_in") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series__consumable_fkey" FOREIGN KEY ("_consumable") REFERENCES "public"."_consumable"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series__consumable_type_fkey" FOREIGN KEY ("_consumable_type") REFERENCES "public"."_consumable_type"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series__equipment_fkey" FOREIGN KEY ("_equipment") REFERENCES "public"."_equipment"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series__equipment_type_fkey" FOREIGN KEY ("_equipment_type") REFERENCES "public"."_equipment_type"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series__part_fkey" FOREIGN KEY ("_part") REFERENCES "public"."_part"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series__part_type_fkey" FOREIGN KEY ("_part_type") REFERENCES "public"."_part_type"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series_created_in_fkey" FOREIGN KEY ("created_in") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series_equipment_fkey" FOREIGN KEY ("equipment") REFERENCES "public"."equipment"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series_part_fkey" FOREIGN KEY ("part") REFERENCES "public"."part"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series_schedule_fkey" FOREIGN KEY ("schedule") REFERENCES "public"."_time"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_series"
    ADD CONSTRAINT "_task_series_task_template_fkey" FOREIGN KEY ("task_template") REFERENCES "public"."task"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_user"
    ADD CONSTRAINT "_task_user_task_fkey" FOREIGN KEY ("task") REFERENCES "public"."task"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."_task_user"
    ADD CONSTRAINT "_task_user_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."attachment"
    ADD CONSTRAINT "attachment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."attachment"
    ADD CONSTRAINT "attachment_equipment_fkey" FOREIGN KEY ("equipment") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attachment"
    ADD CONSTRAINT "attachment_task_fkey" FOREIGN KEY ("task") REFERENCES "public"."task"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crop"
    ADD CONSTRAINT "crop_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."crop"
    ADD CONSTRAINT "crop_created_in_fkey" FOREIGN KEY ("created_in") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment__equipment_fkey" FOREIGN KEY ("_equipment") REFERENCES "public"."_equipment"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_farm_fkey" FOREIGN KEY ("farm") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_last_scanned_by_fkey" FOREIGN KEY ("last_scanned_by") REFERENCES "public"."user"("id");



ALTER TABLE ONLY "public"."equipment_usage_log"
    ADD CONSTRAINT "equipment_usage_log_corrected_log_id_fkey" FOREIGN KEY ("corrected_log_id") REFERENCES "public"."equipment_usage_log"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_usage_log"
    ADD CONSTRAINT "equipment_usage_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."equipment_usage_log"
    ADD CONSTRAINT "equipment_usage_log_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_usage_log"
    ADD CONSTRAINT "equipment_usage_log_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_usage_log"
    ADD CONSTRAINT "equipment_usage_log_usage_time_id_fkey" FOREIGN KEY ("usage_time_id") REFERENCES "public"."_time"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."equipment_usage_type"
    ADD CONSTRAINT "equipment_usage_type_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_usage_type"
    ADD CONSTRAINT "equipment_usage_type_usage_time_id_fkey" FOREIGN KEY ("usage_time_id") REFERENCES "public"."_time"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "fk_equipment_id" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id");



ALTER TABLE ONLY "public"."invitation"
    ADD CONSTRAINT "invitation_address_fkey" FOREIGN KEY ("address") REFERENCES "public"."_address"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."invitation"
    ADD CONSTRAINT "invitation_email_fkey" FOREIGN KEY ("email") REFERENCES "public"."_email"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."invitation"
    ADD CONSTRAINT "invitation_farm_fkey" FOREIGN KEY ("farm") REFERENCES "public"."farm"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."invitation"
    ADD CONSTRAINT "invitation_phone_fkey" FOREIGN KEY ("phone") REFERENCES "public"."_phone"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."qr_audit_log"
    ADD CONSTRAINT "qr_audit_log_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");



ALTER TABLE ONLY "public"."qr_audit_log"
    ADD CONSTRAINT "qr_audit_log_qr_id_fkey" FOREIGN KEY ("qr_id") REFERENCES "public"."qr"("id");



ALTER TABLE ONLY "public"."qr_audit_log"
    ADD CONSTRAINT "qr_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id");



ALTER TABLE ONLY "public"."qr_binding"
    ADD CONSTRAINT "qr_binding_bound_by_fkey" FOREIGN KEY ("bound_by") REFERENCES "public"."user"("id");



ALTER TABLE ONLY "public"."qr_binding"
    ADD CONSTRAINT "qr_binding_qr_id_fkey" FOREIGN KEY ("qr_id") REFERENCES "public"."qr"("id");



ALTER TABLE ONLY "public"."qr_binding"
    ADD CONSTRAINT "qr_binding_unbound_by_fkey" FOREIGN KEY ("unbound_by") REFERENCES "public"."user"("id");



ALTER TABLE ONLY "public"."qr_delivery_batch"
    ADD CONSTRAINT "qr_delivery_batch_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id");



ALTER TABLE ONLY "public"."qr_delivery_batch"
    ADD CONSTRAINT "qr_delivery_batch_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "public"."farm"("id");



ALTER TABLE ONLY "public"."qr"
    ADD CONSTRAINT "qr_farm_fkey" FOREIGN KEY ("farm") REFERENCES "public"."farm"("id");



ALTER TABLE ONLY "public"."qr_production_batch"
    ADD CONSTRAINT "qr_production_batch_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id");



ALTER TABLE ONLY "public"."qr_production_batch"
    ADD CONSTRAINT "qr_production_batch_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."qr_supplier"("id");



ALTER TABLE ONLY "public"."qr_production_batch"
    ADD CONSTRAINT "qr_production_batch_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id");



ALTER TABLE ONLY "public"."qr"
    ADD CONSTRAINT "qr_qr_production_batch_id_fkey" FOREIGN KEY ("qr_production_batch_id") REFERENCES "public"."qr_production_batch"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task__consumable_fkey" FOREIGN KEY ("_consumable") REFERENCES "public"."_consumable"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task__consumable_type_fkey" FOREIGN KEY ("_consumable_type") REFERENCES "public"."_consumable_type"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task__equipment_fkey" FOREIGN KEY ("_equipment") REFERENCES "public"."_equipment"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task__equipment_type_fkey" FOREIGN KEY ("_equipment_type") REFERENCES "public"."_equipment_type"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task__part_fkey" FOREIGN KEY ("_part") REFERENCES "public"."_part"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task__part_type_fkey" FOREIGN KEY ("_part_type") REFERENCES "public"."_part_type"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task__task_series_fkey" FOREIGN KEY ("_task_series") REFERENCES "public"."_task_series"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_completed_at_fkey" FOREIGN KEY ("completed_at") REFERENCES "public"."_time"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_due_at_fkey" FOREIGN KEY ("due_at") REFERENCES "public"."_time"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_equipment_fkey" FOREIGN KEY ("equipment") REFERENCES "public"."equipment"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_parent_task_fkey" FOREIGN KEY ("parent_task") REFERENCES "public"."task"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."task"
    ADD CONSTRAINT "task_part_fkey" FOREIGN KEY ("part") REFERENCES "public"."part"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE SET DEFAULT;



ALTER TABLE "public"."_address" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_address_authenticated_delete" ON "public"."_address" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_address_authenticated_insert" ON "public"."_address" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_address_authenticated_select" ON "public"."_address" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_address_authenticated_update" ON "public"."_address" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_consumable" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_consumable_authenticated_delete" ON "public"."_consumable" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_consumable_authenticated_insert" ON "public"."_consumable" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_consumable_authenticated_select" ON "public"."_consumable" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_consumable_authenticated_update" ON "public"."_consumable" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_consumable_type" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_consumable_type_authenticated_delete" ON "public"."_consumable_type" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_consumable_type_authenticated_insert" ON "public"."_consumable_type" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_consumable_type_authenticated_select" ON "public"."_consumable_type" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_consumable_type_authenticated_update" ON "public"."_consumable_type" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_email" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_email_authenticated_delete" ON "public"."_email" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_email_authenticated_insert" ON "public"."_email" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_email_authenticated_select" ON "public"."_email" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_email_authenticated_update" ON "public"."_email" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_equipment" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_equipment_anon_select" ON "public"."_equipment" FOR SELECT TO "anon" USING (true);



CREATE POLICY "_equipment_authenticated_delete" ON "public"."_equipment" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_authenticated_insert" ON "public"."_equipment" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_authenticated_select" ON "public"."_equipment" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_authenticated_update" ON "public"."_equipment" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_equipment_make" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_equipment_make_anon_select" ON "public"."_equipment_make" FOR SELECT TO "anon" USING (true);



CREATE POLICY "_equipment_make_authenticated_delete" ON "public"."_equipment_make" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_make_authenticated_insert" ON "public"."_equipment_make" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_make_authenticated_select" ON "public"."_equipment_make" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_make_authenticated_update" ON "public"."_equipment_make" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_equipment_model" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_equipment_model_anon_select" ON "public"."_equipment_model" FOR SELECT TO "anon" USING (true);



CREATE POLICY "_equipment_model_authenticated_delete" ON "public"."_equipment_model" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_model_authenticated_insert" ON "public"."_equipment_model" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_model_authenticated_select" ON "public"."_equipment_model" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_model_authenticated_update" ON "public"."_equipment_model" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_equipment_trim" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_equipment_trim_authenticated_delete" ON "public"."_equipment_trim" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_trim_authenticated_insert" ON "public"."_equipment_trim" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_trim_authenticated_select" ON "public"."_equipment_trim" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_trim_authenticated_update" ON "public"."_equipment_trim" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_equipment_type" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_equipment_type_anon_select" ON "public"."_equipment_type" FOR SELECT TO "anon" USING (true);



CREATE POLICY "_equipment_type_authenticated_delete" ON "public"."_equipment_type" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_type_authenticated_insert" ON "public"."_equipment_type" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_type_authenticated_select" ON "public"."_equipment_type" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_equipment_type_authenticated_update" ON "public"."_equipment_type" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_farm_crop" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_farm_crop_authenticated_delete" ON "public"."_farm_crop" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_farm_crop_authenticated_insert" ON "public"."_farm_crop" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_farm_crop_authenticated_select" ON "public"."_farm_crop" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_farm_crop_authenticated_update" ON "public"."_farm_crop" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_farm_user" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_farm_user_authenticated_delete" ON "public"."_farm_user" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_farm_user_authenticated_insert" ON "public"."_farm_user" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_farm_user_authenticated_select" ON "public"."_farm_user" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_farm_user_authenticated_update" ON "public"."_farm_user" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_part" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_part_authenticated_delete" ON "public"."_part" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_part_authenticated_insert" ON "public"."_part" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_part_authenticated_select" ON "public"."_part" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_part_authenticated_update" ON "public"."_part" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_part_type" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_part_type_authenticated_delete" ON "public"."_part_type" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_part_type_authenticated_insert" ON "public"."_part_type" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_part_type_authenticated_select" ON "public"."_part_type" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_part_type_authenticated_update" ON "public"."_part_type" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_phone" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_phone_authenticated_delete" ON "public"."_phone" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_phone_authenticated_insert" ON "public"."_phone" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_phone_authenticated_select" ON "public"."_phone" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_phone_authenticated_update" ON "public"."_phone" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_task_series" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_task_series_authenticated_delete" ON "public"."_task_series" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_task_series_authenticated_insert" ON "public"."_task_series" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_task_series_authenticated_select" ON "public"."_task_series" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_task_series_authenticated_update" ON "public"."_task_series" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_task_user" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_task_user_authenticated_delete" ON "public"."_task_user" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_task_user_authenticated_insert" ON "public"."_task_user" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_task_user_authenticated_select" ON "public"."_task_user" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_task_user_authenticated_update" ON "public"."_task_user" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."_time" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "_time_authenticated_delete" ON "public"."_time" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_time_authenticated_insert" ON "public"."_time" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_time_authenticated_select" ON "public"."_time" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "_time_authenticated_update" ON "public"."_time" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attachment" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attachment_authenticated_delete" ON "public"."attachment" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "attachment_authenticated_insert" ON "public"."attachment" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "attachment_authenticated_select" ON "public"."attachment" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "attachment_authenticated_update" ON "public"."attachment" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."crop" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "crop_authenticated_delete" ON "public"."crop" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "crop_authenticated_insert" ON "public"."crop" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "crop_authenticated_select" ON "public"."crop" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "crop_authenticated_update" ON "public"."crop" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."equipment" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_anon_select" ON "public"."equipment" FOR SELECT TO "anon" USING (true);



CREATE POLICY "equipment_authenticated_delete" ON "public"."equipment" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "equipment_authenticated_insert" ON "public"."equipment" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "equipment_authenticated_select" ON "public"."equipment" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "equipment_authenticated_update" ON "public"."equipment" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."equipment_usage_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_usage_log_authenticated_delete" ON "public"."equipment_usage_log" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "equipment_usage_log_authenticated_insert" ON "public"."equipment_usage_log" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "equipment_usage_log_authenticated_select" ON "public"."equipment_usage_log" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "equipment_usage_log_authenticated_update" ON "public"."equipment_usage_log" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."equipment_usage_type" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_usage_type_authenticated_delete" ON "public"."equipment_usage_type" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "equipment_usage_type_authenticated_insert" ON "public"."equipment_usage_type" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "equipment_usage_type_authenticated_select" ON "public"."equipment_usage_type" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "equipment_usage_type_authenticated_update" ON "public"."equipment_usage_type" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."farm" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "farm_anon_select" ON "public"."farm" FOR SELECT TO "anon" USING (true);



CREATE POLICY "farm_authenticated_delete" ON "public"."farm" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "farm_authenticated_insert" ON "public"."farm" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "farm_authenticated_select" ON "public"."farm" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "farm_authenticated_update" ON "public"."farm" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."invitation" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitation_anon_select" ON "public"."invitation" FOR SELECT TO "anon" USING (true);



CREATE POLICY "invitation_authenticated_delete" ON "public"."invitation" FOR DELETE TO "authenticated" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "invitation_authenticated_insert" ON "public"."invitation" FOR INSERT TO "authenticated" WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "invitation_authenticated_select" ON "public"."invitation" FOR SELECT TO "authenticated" USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."note" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "note_authenticated_delete" ON "public"."note" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "note_authenticated_insert" ON "public"."note" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "note_authenticated_select" ON "public"."note" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "note_authenticated_update" ON "public"."note" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."part" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "part_authenticated_delete" ON "public"."part" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "part_authenticated_insert" ON "public"."part" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "part_authenticated_select" ON "public"."part" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "part_authenticated_update" ON "public"."part" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."qr" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qr_anon_select" ON "public"."qr" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."qr_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qr_audit_log_delete" ON "public"."qr_audit_log" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_audit_log_insert" ON "public"."qr_audit_log" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_audit_log_select" ON "public"."qr_audit_log" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_audit_log_update" ON "public"."qr_audit_log" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."qr_binding" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qr_binding_anon_select" ON "public"."attachment" FOR SELECT TO "anon" USING (true);



CREATE POLICY "qr_binding_anon_select" ON "public"."qr_binding" FOR SELECT TO "anon" USING (true);



CREATE POLICY "qr_binding_delete" ON "public"."qr_binding" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_binding_insert" ON "public"."qr_binding" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_binding_select" ON "public"."qr_binding" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_binding_update" ON "public"."qr_binding" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_delete" ON "public"."qr" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."qr_delivery_batch" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qr_delivery_batch_delete" ON "public"."qr_delivery_batch" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_delivery_batch_insert" ON "public"."qr_delivery_batch" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_delivery_batch_select" ON "public"."qr_delivery_batch" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_delivery_batch_update" ON "public"."qr_delivery_batch" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "qr_insert" ON "public"."qr" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."qr_production_batch" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qr_production_batch_delete" ON "public"."qr_production_batch" FOR DELETE USING ("public"."is_super_admin"());



CREATE POLICY "qr_production_batch_insert" ON "public"."qr_production_batch" FOR INSERT WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "qr_production_batch_select" ON "public"."qr_production_batch" FOR SELECT USING ("public"."is_super_admin"());



CREATE POLICY "qr_production_batch_update" ON "public"."qr_production_batch" FOR UPDATE USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "qr_select" ON "public"."qr" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."qr_supplier" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qr_supplier_delete" ON "public"."qr_supplier" FOR DELETE USING ("public"."is_super_admin"());



CREATE POLICY "qr_supplier_insert" ON "public"."qr_supplier" FOR INSERT WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "qr_supplier_select" ON "public"."qr_supplier" FOR SELECT USING ("public"."is_super_admin"());



CREATE POLICY "qr_supplier_update" ON "public"."qr_supplier" FOR UPDATE USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "qr_update" ON "public"."qr" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."task" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_authenticated_delete" ON "public"."task" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "task_authenticated_insert" ON "public"."task" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "task_authenticated_select" ON "public"."task" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "task_authenticated_update" ON "public"."task" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_authenticated_delete" ON "public"."user" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "user_authenticated_insert" ON "public"."user" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "user_authenticated_select" ON "public"."user" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "user_authenticated_update" ON "public"."user" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";













































































































































































































































GRANT ALL ON FUNCTION "public"."add_user_to_farm"("p_user_id" "uuid", "p_farm_id" "uuid", "p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_user_to_farm"("p_user_id" "uuid", "p_farm_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_user_to_farm"("p_user_id" "uuid", "p_farm_id" "uuid", "p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."close_work_order"("parent_task_id" "uuid", "completion_date" "date", "created_by_user_id" "uuid", "metadata" "jsonb", "equipment" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."close_work_order"("parent_task_id" "uuid", "completion_date" "date", "created_by_user_id" "uuid", "metadata" "jsonb", "equipment" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_work_order"("parent_task_id" "uuid", "completion_date" "date", "created_by_user_id" "uuid", "metadata" "jsonb", "equipment" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_maintenance_task"("task_id" "uuid", "completion_value" "text", "parent_task_id" "uuid", "created_by_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_maintenance_task"("task_id" "uuid", "completion_value" "text", "parent_task_id" "uuid", "created_by_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_maintenance_task"("task_id" "uuid", "completion_value" "text", "parent_task_id" "uuid", "created_by_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_date_time_record"("date_time" timestamp with time zone, "purpose" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_date_time_record"("date_time" timestamp with time zone, "purpose" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_date_time_record"("date_time" timestamp with time zone, "purpose" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_task"("p_equipment_type_id" "uuid", "p_task_name" "text", "p_time_type" "text", "p_time_interval" "text", "p_equipment_make_id" "uuid", "p_equipment_model_id" "uuid", "p_part_type_id" "uuid", "p_consumable_type_id" "uuid", "p_task_description" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."create_default_task"("p_equipment_type_id" "uuid", "p_task_name" "text", "p_time_type" "text", "p_time_interval" "text", "p_equipment_make_id" "uuid", "p_equipment_model_id" "uuid", "p_part_type_id" "uuid", "p_consumable_type_id" "uuid", "p_task_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_task"("p_equipment_type_id" "uuid", "p_task_name" "text", "p_time_type" "text", "p_time_interval" "text", "p_equipment_make_id" "uuid", "p_equipment_model_id" "uuid", "p_part_type_id" "uuid", "p_consumable_type_id" "uuid", "p_task_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_task"("p_equipment_type_id" "uuid", "p_task_name" "text", "p_time_type" "text", "p_time_interval" "text", "p_equipment_make_id" "uuid", "p_equipment_model_id" "uuid", "p_part_type_id" "uuid", "p_consumable_type_id" "uuid", "p_task_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_equipment"("equipment_name" "text", "equipment_model_id" "uuid", "make_id" "uuid", "equipment_type_id" "uuid", "farm_id" "uuid", "maintenance_items" "jsonb", "initial_usage" "jsonb", "created_by_user_id" "uuid", "serial_number" "text", "year_purchased" smallint, "lease_owned" boolean, "warranty_time" "text", "warranty_details" "text", "custom_checklists" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_equipment"("equipment_name" "text", "equipment_model_id" "uuid", "make_id" "uuid", "equipment_type_id" "uuid", "farm_id" "uuid", "maintenance_items" "jsonb", "initial_usage" "jsonb", "created_by_user_id" "uuid", "serial_number" "text", "year_purchased" smallint, "lease_owned" boolean, "warranty_time" "text", "warranty_details" "text", "custom_checklists" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_equipment"("equipment_name" "text", "equipment_model_id" "uuid", "make_id" "uuid", "equipment_type_id" "uuid", "farm_id" "uuid", "maintenance_items" "jsonb", "initial_usage" "jsonb", "created_by_user_id" "uuid", "serial_number" "text", "year_purchased" smallint, "lease_owned" boolean, "warranty_time" "text", "warranty_details" "text", "custom_checklists" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_farm_with_user"("farm_name" "text", "acres" integer, "user_id" "uuid", "role" "text", "metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_farm_with_user"("farm_name" "text", "acres" integer, "user_id" "uuid", "role" "text", "metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_farm_with_user"("farm_name" "text", "acres" integer, "user_id" "uuid", "role" "text", "metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation_with_shortcode"("p_farm_id" "uuid", "p_role" "text", "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation_with_shortcode"("p_farm_id" "uuid", "p_role" "text", "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation_with_shortcode"("p_farm_id" "uuid", "p_role" "text", "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_maintenance_task_instance"("task_series_id" "uuid", "equipment_id" "uuid", "task_name" "text", "task_description" "text", "part_type_id" "uuid", "consumable_type_id" "uuid", "part_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_maintenance_task_instance"("task_series_id" "uuid", "equipment_id" "uuid", "task_name" "text", "task_description" "text", "part_type_id" "uuid", "consumable_type_id" "uuid", "part_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_maintenance_task_instance"("task_series_id" "uuid", "equipment_id" "uuid", "task_name" "text", "task_description" "text", "part_type_id" "uuid", "consumable_type_id" "uuid", "part_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_production_batch"("p_quantity" integer, "p_supplier_id" "uuid", "p_user_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_production_batch"("p_quantity" integer, "p_supplier_id" "uuid", "p_user_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_production_batch"("p_quantity" integer, "p_supplier_id" "uuid", "p_user_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_task_template_with_series"("equipment_id" "uuid", "farm_id" "uuid", "task_description" "text", "schedule_data" "jsonb", "created_by_user_id" "uuid", "part_type_id" "uuid", "consumable_type_id" "uuid", "template_part_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_task_template_with_series"("equipment_id" "uuid", "farm_id" "uuid", "task_description" "text", "schedule_data" "jsonb", "created_by_user_id" "uuid", "part_type_id" "uuid", "consumable_type_id" "uuid", "template_part_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_task_template_with_series"("equipment_id" "uuid", "farm_id" "uuid", "task_description" "text", "schedule_data" "jsonb", "created_by_user_id" "uuid", "part_type_id" "uuid", "consumable_type_id" "uuid", "template_part_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_work_order"("equipment_id" "uuid", "type" "text", "items" "jsonb", "status" "text", "created_by_user_id" "uuid", "name" "text", "description" "text", "priority" "text", "assigned_to" "uuid", "due_date" "text", "equipment" "jsonb", "attachments" "jsonb", "metadata" "jsonb", "completion_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."create_work_order"("equipment_id" "uuid", "type" "text", "items" "jsonb", "status" "text", "created_by_user_id" "uuid", "name" "text", "description" "text", "priority" "text", "assigned_to" "uuid", "due_date" "text", "equipment" "jsonb", "attachments" "jsonb", "metadata" "jsonb", "completion_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_work_order"("equipment_id" "uuid", "type" "text", "items" "jsonb", "status" "text", "created_by_user_id" "uuid", "name" "text", "description" "text", "priority" "text", "assigned_to" "uuid", "due_date" "text", "equipment" "jsonb", "attachments" "jsonb", "metadata" "jsonb", "completion_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."edit_maintenance_task"("task_id" "uuid", "new_name" "text", "new_description" "text", "new_schedule_value" "text", "new_part_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."edit_maintenance_task"("task_id" "uuid", "new_name" "text", "new_description" "text", "new_schedule_value" "text", "new_part_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."edit_maintenance_task"("task_id" "uuid", "new_name" "text", "new_description" "text", "new_schedule_value" "text", "new_part_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_initial_usage_metadata"("p_type" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."generate_initial_usage_metadata"("p_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_initial_usage_metadata"("p_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_initial_usage_metadata"("p_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_short_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_short_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_short_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_equipment_activity_log"("equipment_id" "uuid", "created_at_order" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_equipment_activity_log"("equipment_id" "uuid", "created_at_order" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_equipment_activity_log"("equipment_id" "uuid", "created_at_order" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_farm_equipment"("p_farm_id" "uuid", "p_page" integer, "p_limit" integer, "p_search" "text", "p_equipment_status" boolean, "p_equipment_type" "uuid", "p_equipment_make" "uuid", "p_equipment_model" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."get_farm_equipment"("p_farm_id" "uuid", "p_page" integer, "p_limit" integer, "p_search" "text", "p_equipment_status" boolean, "p_equipment_type" "uuid", "p_equipment_make" "uuid", "p_equipment_model" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_farm_equipment"("p_farm_id" "uuid", "p_page" integer, "p_limit" integer, "p_search" "text", "p_equipment_status" boolean, "p_equipment_type" "uuid", "p_equipment_make" "uuid", "p_equipment_model" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_farm_equipment"("p_farm_id" "uuid", "p_page" integer, "p_limit" integer, "p_search" "text", "p_equipment_status" boolean, "p_equipment_type" "uuid", "p_equipment_make" "uuid", "p_equipment_model" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_farm_tasks"("farm_id" "uuid", "status_filter" "text", "created_at_order" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_farm_tasks"("farm_id" "uuid", "status_filter" "text", "created_at_order" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_farm_tasks"("farm_id" "uuid", "status_filter" "text", "created_at_order" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_farm_users"("p_farm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_farm_users"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_farm_users"("p_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_last_completion_by_task_series"("task_id" "uuid", "equipment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_last_completion_by_task_series"("task_id" "uuid", "equipment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_last_completion_by_task_series"("task_id" "uuid", "equipment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_default_farm"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_default_farm"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_default_farm"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_farms"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_farms"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_farms"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_default_tasks"("p_equipment_id" "uuid", "p_equipment_type_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_default_tasks"("p_equipment_id" "uuid", "p_equipment_type_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_default_tasks"("p_equipment_id" "uuid", "p_equipment_type_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."list_open_tasks"("p_equipment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_open_tasks"("p_equipment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_open_tasks"("p_equipment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_activity"("p_function_name" "text", "p_input_payload" "jsonb", "p_output_result" "jsonb", "p_equipment_id" "uuid", "p_task_ids" "uuid"[], "p_executed_by" "uuid", "p_execution_duration_ms" integer, "p_time_ids" "uuid"[], "p_execution_status" "text", "p_error_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity"("p_function_name" "text", "p_input_payload" "jsonb", "p_output_result" "jsonb", "p_equipment_id" "uuid", "p_task_ids" "uuid"[], "p_executed_by" "uuid", "p_execution_duration_ms" integer, "p_time_ids" "uuid"[], "p_execution_status" "text", "p_error_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity"("p_function_name" "text", "p_input_payload" "jsonb", "p_output_result" "jsonb", "p_equipment_id" "uuid", "p_task_ids" "uuid"[], "p_executed_by" "uuid", "p_execution_duration_ms" integer, "p_time_ids" "uuid"[], "p_execution_status" "text", "p_error_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_equipment_usage"("target_equipment_id" "uuid", "usage_value" numeric, "reason" "text", "created_by_user_id" "uuid", "task_id" "uuid", "maintenance_part_type" "uuid", "maintenance_consumable_type" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."log_equipment_usage"("target_equipment_id" "uuid", "usage_value" numeric, "reason" "text", "created_by_user_id" "uuid", "task_id" "uuid", "maintenance_part_type" "uuid", "maintenance_consumable_type" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_equipment_usage"("target_equipment_id" "uuid", "usage_value" numeric, "reason" "text", "created_by_user_id" "uuid", "task_id" "uuid", "maintenance_part_type" "uuid", "maintenance_consumable_type" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_equipment_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_equipment_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_equipment_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."perform_batch_cancellation"("p_batch_id" "uuid", "p_reason" "text", "p_user_id" "uuid", "p_batch" "record") TO "anon";
GRANT ALL ON FUNCTION "public"."perform_batch_cancellation"("p_batch_id" "uuid", "p_reason" "text", "p_user_id" "uuid", "p_batch" "record") TO "authenticated";
GRANT ALL ON FUNCTION "public"."perform_batch_cancellation"("p_batch_id" "uuid", "p_reason" "text", "p_user_id" "uuid", "p_batch" "record") TO "service_role";



GRANT ALL ON FUNCTION "public"."perform_batch_reception"("p_batch_id" "uuid", "p_defective_info" "jsonb", "p_user_id" "uuid", "p_notes" "text", "p_batch" "record") TO "anon";
GRANT ALL ON FUNCTION "public"."perform_batch_reception"("p_batch_id" "uuid", "p_defective_info" "jsonb", "p_user_id" "uuid", "p_notes" "text", "p_batch" "record") TO "authenticated";
GRANT ALL ON FUNCTION "public"."perform_batch_reception"("p_batch_id" "uuid", "p_defective_info" "jsonb", "p_user_id" "uuid", "p_notes" "text", "p_batch" "record") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_equipment_maintenance_batch"("maintenance_data" "jsonb", "created_by_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_equipment_maintenance_batch"("maintenance_data" "jsonb", "created_by_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_equipment_maintenance_batch"("maintenance_data" "jsonb", "created_by_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."qr_bind_equipment"("equipment_id" "uuid", "qr_identifier" "text", "user_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."qr_bind_equipment"("equipment_id" "uuid", "qr_identifier" "text", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."qr_bind_equipment"("equipment_id" "uuid", "qr_identifier" "text", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."qr_bind_equipment"("equipment_id" "uuid", "qr_identifier" "text", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."qr_create_binding_internal"("p_qr_id" "uuid", "p_bindable_type" "public"."bindable_type", "p_bindable_id" "uuid", "p_user_id" "uuid", "p_metadata" "jsonb", "p_audit_event_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."qr_create_binding_internal"("p_qr_id" "uuid", "p_bindable_type" "public"."bindable_type", "p_bindable_id" "uuid", "p_user_id" "uuid", "p_metadata" "jsonb", "p_audit_event_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."qr_create_binding_internal"("p_qr_id" "uuid", "p_bindable_type" "public"."bindable_type", "p_bindable_id" "uuid", "p_user_id" "uuid", "p_metadata" "jsonb", "p_audit_event_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."qr_create_del_batch"("p_farm_id" "uuid", "p_requested_quantity" integer, "p_user_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."qr_create_del_batch"("p_farm_id" "uuid", "p_requested_quantity" integer, "p_user_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."qr_create_del_batch"("p_farm_id" "uuid", "p_requested_quantity" integer, "p_user_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."qr_create_prod_batch"("p_quantity" integer, "p_supplier_id" "uuid", "p_user_id" "uuid", "p_generated_by" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."qr_create_prod_batch"("p_quantity" integer, "p_supplier_id" "uuid", "p_user_id" "uuid", "p_generated_by" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."qr_create_prod_batch"("p_quantity" integer, "p_supplier_id" "uuid", "p_user_id" "uuid", "p_generated_by" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."qr_generate_del_code"("p_farm_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."qr_generate_del_code"("p_farm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."qr_generate_del_code"("p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."qr_generate_del_code"("p_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."qr_get_available_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."qr_get_available_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."qr_get_available_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."qr_get_binding"("p_identifier" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."qr_get_binding"("p_identifier" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."qr_get_binding"("p_identifier" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."qr_get_stats"("p_farm_id" "uuid", "p_equipment_id" "uuid", "p_production_batch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."qr_get_stats"("p_farm_id" "uuid", "p_equipment_id" "uuid", "p_production_batch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."qr_get_stats"("p_farm_id" "uuid", "p_equipment_id" "uuid", "p_production_batch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."qr_mark_as_defective"("p_qr_identifier" "text", "p_user_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."qr_mark_as_defective"("p_qr_identifier" "text", "p_user_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."qr_mark_as_defective"("p_qr_identifier" "text", "p_user_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."qr_update_status_with_audit"("p_qr_id" "uuid", "p_new_status" "text", "p_user_id" "uuid", "p_event_data" "jsonb", "p_bound_at" timestamp with time zone, "p_farm_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."qr_update_status_with_audit"("p_qr_id" "uuid", "p_new_status" "text", "p_user_id" "uuid", "p_event_data" "jsonb", "p_bound_at" timestamp with time zone, "p_farm_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."qr_update_status_with_audit"("p_qr_id" "uuid", "p_new_status" "text", "p_user_id" "uuid", "p_event_data" "jsonb", "p_bound_at" timestamp with time zone, "p_farm_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_batch_status"("p_batch_id" "uuid", "p_new_status" "text", "p_user_id" "uuid", "p_notes" "text", "p_defective_info" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_batch_status"("p_batch_id" "uuid", "p_new_status" "text", "p_user_id" "uuid", "p_notes" "text", "p_defective_info" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_batch_status"("p_batch_id" "uuid", "p_new_status" "text", "p_user_id" "uuid", "p_notes" "text", "p_defective_info" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_equipment"("equipment_id" "uuid", "updated_by_user_id" "uuid", "equipment_name" "text", "serial_number" "text", "year_purchased" smallint, "metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_equipment"("equipment_id" "uuid", "updated_by_user_id" "uuid", "equipment_name" "text", "serial_number" "text", "year_purchased" smallint, "metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_equipment"("equipment_id" "uuid", "updated_by_user_id" "uuid", "equipment_name" "text", "serial_number" "text", "year_purchased" smallint, "metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_equipment_catalog"("p_equipment_type_id" "uuid", "p_equipment_make_id" "uuid", "p_equipment_model_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."upsert_equipment_catalog"("p_equipment_type_id" "uuid", "p_equipment_make_id" "uuid", "p_equipment_model_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_equipment_catalog"("p_equipment_type_id" "uuid", "p_equipment_make_id" "uuid", "p_equipment_model_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_equipment_catalog"("p_equipment_type_id" "uuid", "p_equipment_make_id" "uuid", "p_equipment_model_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_equipment_usage"("p_equipment_id" "uuid", "p_value" numeric, "p_user_id" "uuid", "p_time_id" "uuid", "p_type" "text", "p_time_metadata" "jsonb", "p_reason" "text", "p_is_correction" boolean, "p_corrected_log_id" "uuid", "p_task_id" "uuid", "p_log_metadata" "jsonb", "p_is_parent_task" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_equipment_usage"("p_equipment_id" "uuid", "p_value" numeric, "p_user_id" "uuid", "p_time_id" "uuid", "p_type" "text", "p_time_metadata" "jsonb", "p_reason" "text", "p_is_correction" boolean, "p_corrected_log_id" "uuid", "p_task_id" "uuid", "p_log_metadata" "jsonb", "p_is_parent_task" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_equipment_usage"("p_equipment_id" "uuid", "p_value" numeric, "p_user_id" "uuid", "p_time_id" "uuid", "p_type" "text", "p_time_metadata" "jsonb", "p_reason" "text", "p_is_correction" boolean, "p_corrected_log_id" "uuid", "p_task_id" "uuid", "p_log_metadata" "jsonb", "p_is_parent_task" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_equipment_combination"("equipment_model_id" "uuid", "make_id" "uuid", "equipment_type_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_equipment_combination"("equipment_model_id" "uuid", "make_id" "uuid", "equipment_type_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_equipment_combination"("equipment_model_id" "uuid", "make_id" "uuid", "equipment_type_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_global_user_permissions"("p_user_id" "uuid", "p_required_role" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."validate_global_user_permissions"("p_user_id" "uuid", "p_required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_global_user_permissions"("p_user_id" "uuid", "p_required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_global_user_permissions"("p_user_id" "uuid", "p_required_role" "text") TO "service_role";


















GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_address" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_address" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_address" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_consumable" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_consumable" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_consumable" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_consumable_type" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_consumable_type" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_consumable_type" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_email" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_email" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_email" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_make" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_make" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_make" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_model" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_model" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_model" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_trim" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_trim" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_trim" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_type" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_type" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_equipment_type" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_farm_crop" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_farm_crop" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_farm_crop" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_farm_user" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_farm_user" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_farm_user" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_part" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_part" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_part" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_part_type" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_part_type" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_part_type" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_phone" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_phone" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_phone" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_task_series" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_task_series" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_task_series" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_task_user" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_task_user" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_task_user" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_time" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_time" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."_time" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."activity_log" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."activity_log" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."activity_log" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."attachment" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."attachment" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."attachment" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crop" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crop" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."crop" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."task" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."task" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."task" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_default_tasks" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_default_tasks" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_default_tasks" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_usage_log" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_usage_log" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_usage_log" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_usage_type" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_usage_type" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_usage_type" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_binding" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_binding" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_binding" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_with_current_usage" TO "postgres";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_with_current_usage" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_with_current_usage" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."equipment_with_current_usage" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."farm" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."farm" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."farm" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."invitation" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."invitation" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."invitation" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."note" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."note" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."note" TO "service_role";



GRANT ALL ON SEQUENCE "public"."note_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."note_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."note_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."open_maintenance_tasks" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."open_maintenance_tasks" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."open_maintenance_tasks" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."part" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."part" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."part" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_audit_log" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_audit_log" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_audit_log" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_delivery_batch" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_delivery_batch" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_delivery_batch" TO "service_role";



GRANT ALL ON SEQUENCE "public"."qr_delivery_batch_sequence" TO "anon";
GRANT ALL ON SEQUENCE "public"."qr_delivery_batch_sequence" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."qr_delivery_batch_sequence" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_production_batch" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_production_batch" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_production_batch" TO "service_role";



GRANT ALL ON SEQUENCE "public"."qr_production_batch_sequence" TO "anon";
GRANT ALL ON SEQUENCE "public"."qr_production_batch_sequence" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."qr_production_batch_sequence" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_supplier" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_supplier" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."qr_supplier" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";































