-- =====================================================================================
-- Migration: Add get_maintenance_templates function
-- Description: Function to retrieve maintenance templates with pagination and filtering
-- Created: 2025-12-08
-- =====================================================================================

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_maintenance_templates(p_page integer DEFAULT 1, p_limit integer DEFAULT 25, p_search text DEFAULT NULL::text, p_type_id uuid DEFAULT NULL::uuid, p_make_id uuid DEFAULT NULL::uuid, p_model_id uuid DEFAULT NULL::uuid, p_year smallint DEFAULT NULL::smallint, p_sort text DEFAULT 'created_at'::text, p_order text DEFAULT 'DESC'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE
AS $function$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_data JSONB;
  v_result JSONB;
  v_sort_column TEXT;
BEGIN
  -- ============================================================================
  -- Parameter validation
  -- ============================================================================

  -- Validate page parameter
  IF p_page < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAGE',
      'error_message', 'Page number must be greater than or equal to 1',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'get_maintenance_templates',
        'provided_page', p_page
      )
    );
  END IF;

  -- Validate limit parameter
  IF p_limit < 1 OR p_limit > 100 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_LIMIT',
      'error_message', 'Limit must be between 1 and 100',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'get_maintenance_templates',
        'provided_limit', p_limit
      )
    );
  END IF;

  -- Validate sort parameter
  IF p_sort NOT IN ('task_count', 'created_at', 'type_name') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_SORT_FIELD',
      'error_message', 'Sort field must be one of: task_count, created_at, type_name',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'get_maintenance_templates',
        'provided_sort', p_sort
      )
    );
  END IF;

  -- Validate order parameter
  IF UPPER(p_order) NOT IN ('ASC', 'DESC') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_SORT_ORDER',
      'error_message', 'Sort order must be ASC or DESC',
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'get_maintenance_templates',
        'provided_order', p_order
      )
    );
  END IF;

  -- ============================================================================
  -- Calculate offset
  -- ============================================================================
  v_offset := (p_page - 1) * p_limit;

  -- ============================================================================
  -- Get total count with filters
  -- ============================================================================
  SELECT COUNT(DISTINCT eq.id)
  INTO v_total
  FROM _equipment eq
  INNER JOIN _equipment_type et ON eq.type = et.id
  LEFT JOIN _equipment_make em ON eq.make = em.id
  LEFT JOIN _equipment_model emod ON eq.model = emod.id
  LEFT JOIN _equipment_trim etr ON eq.trim = etr.id
  WHERE EXISTS (
    SELECT 1
    FROM _task_series ts
    WHERE ts._equipment = eq.id
      AND ts.type = 'template:maintenance'
  )
  AND (p_search IS NULL OR
       et.name ILIKE '%' || p_search || '%' OR
       em.name ILIKE '%' || p_search || '%' OR
       emod.name ILIKE '%' || p_search || '%' OR
       etr.name ILIKE '%' || p_search || '%')
  AND (p_type_id IS NULL OR eq.type = p_type_id)
  AND (p_make_id IS NULL OR eq.make = p_make_id)
  AND (p_model_id IS NULL OR eq.model = p_model_id)
  AND (p_year IS NULL OR eq.year = p_year);

  -- ============================================================================
  -- Get paginated data with equipment and tasks
  -- ============================================================================
  SELECT COALESCE(
    jsonb_agg(
      template_data
      ORDER BY
        CASE WHEN p_sort = 'task_count' AND UPPER(p_order) = 'ASC' THEN template_data->>'task_count' END ASC,
        CASE WHEN p_sort = 'task_count' AND UPPER(p_order) = 'DESC' THEN template_data->>'task_count' END DESC,
        CASE WHEN p_sort = 'type_name' AND UPPER(p_order) = 'ASC' THEN template_data->'equipment'->>'type_name' END ASC,
        CASE WHEN p_sort = 'type_name' AND UPPER(p_order) = 'DESC' THEN template_data->'equipment'->>'type_name' END DESC,
        CASE WHEN p_sort = 'created_at' AND UPPER(p_order) = 'ASC' THEN (template_data->>'created_at')::timestamptz END ASC,
        CASE WHEN p_sort = 'created_at' AND UPPER(p_order) = 'DESC' THEN (template_data->>'created_at')::timestamptz END DESC
    ),
    '[]'::jsonb
  )
  INTO v_data
  FROM (
    SELECT
      jsonb_build_object(
        'id', eq.id,
        'equipment', jsonb_strip_nulls(jsonb_build_object(
          'type_id', et.id,
          'type_name', et.name,
          'make_id', em.id,
          'make_name', em.name,
          'model_id', emod.id,
          'model_name', emod.name,
          'year', eq.year,
          'trim_id', etr.id,
          'trim_name', etr.name
        )),
        'tasks', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'description', t.description,
                'intervals', COALESCE(
                  (
                    SELECT jsonb_agg(
                      jsonb_build_object(
                        'type', CASE
                          WHEN time_rec.type::text LIKE 'schedule:hours%' THEN 'engine_hours'
                          WHEN time_rec.type::text LIKE 'schedule:distance%' THEN 'odometer'
                          WHEN time_rec.type::text LIKE 'schedule:days%' THEN 'calendar_time'
                          ELSE time_rec.type::text
                        END,
                        'value', time_rec.value::numeric,
                        'unit', CASE
                          WHEN time_rec.type::text LIKE 'schedule:hours%' THEN 'hours'
                          WHEN time_rec.type::text LIKE 'schedule:distance%' THEN
                            COALESCE(time_rec.metadata->>'unit', 'km')
                          WHEN time_rec.type::text LIKE 'schedule:days%' THEN 'days'
                          ELSE COALESCE(time_rec.metadata->>'unit', 'units')
                        END
                      )
                    )
                    FROM _task_series ts2
                    INNER JOIN _time time_rec ON ts2.schedule = time_rec.id
                    WHERE ts2.task_template = t.id
                  ),
                  '[]'::jsonb
                ),
                'priority', t.priority,
                'estimated_duration', (t.metadata->>'estimated_duration')::integer,
                'metadata', COALESCE(t.metadata, '{}'::jsonb),
                'created_at', t.created_at
              )
              ORDER BY t.created_at DESC
            )
            FROM task t
            WHERE t._equipment = eq.id
              AND t.type = 'template:maintenance'
              AND (p_search IS NULL OR
                   t.name ILIKE '%' || p_search || '%' OR
                   t.description ILIKE '%' || p_search || '%')
          ),
          '[]'::jsonb
        ),
        'task_count', (
          SELECT COUNT(*)
          FROM task t
          WHERE t._equipment = eq.id
            AND t.type = 'template:maintenance'
        )::integer,
        'created_at', eq.created_at,
        'updated_at', (
          SELECT MAX(t.created_at)
          FROM task t
          WHERE t._equipment = eq.id
            AND t.type = 'template:maintenance'
        )
      ) as template_data
    FROM _equipment eq
    INNER JOIN _equipment_type et ON eq.type = et.id
    LEFT JOIN _equipment_make em ON eq.make = em.id
    LEFT JOIN _equipment_model emod ON eq.model = emod.id
    LEFT JOIN _equipment_trim etr ON eq.trim = etr.id
    WHERE EXISTS (
      SELECT 1
      FROM _task_series ts
      WHERE ts._equipment = eq.id
        AND ts.type = 'template:maintenance'
    )
    AND (p_search IS NULL OR
         et.name ILIKE '%' || p_search || '%' OR
         em.name ILIKE '%' || p_search || '%' OR
         emod.name ILIKE '%' || p_search || '%' OR
         etr.name ILIKE '%' || p_search || '%')
    AND (p_type_id IS NULL OR eq.type = p_type_id)
    AND (p_make_id IS NULL OR eq.make = p_make_id)
    AND (p_model_id IS NULL OR eq.model = p_model_id)
    AND (p_year IS NULL OR eq.year = p_year)
    LIMIT p_limit
    OFFSET v_offset
  ) templates;

  -- ============================================================================
  -- Build result with pagination metadata
  -- ============================================================================
  v_result := jsonb_build_object(
    'success', true,
    'data', v_data,
    'pagination', jsonb_build_object(
      'page', p_page,
      'limit', p_limit,
      'total', v_total,
      'total_pages', CEIL(v_total::DECIMAL / p_limit)::INTEGER,
      'has_next', (p_page * p_limit) < v_total,
      'has_prev', p_page > 1
    ),
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'get_maintenance_templates',
      'filters', jsonb_build_object(
        'search', p_search,
        'type_id', p_type_id,
        'make_id', p_make_id,
        'model_id', p_model_id,
        'year', p_year,
        'sort', p_sort,
        'order', p_order
      )
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNEXPECTED_ERROR',
      'error_message', SQLERRM,
      'error_state', SQLSTATE,
      'metadata', jsonb_build_object(
        'timestamp', NOW(),
        'operation', 'get_maintenance_templates'
      )
    );
END;
$function$
