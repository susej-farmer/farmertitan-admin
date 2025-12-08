-- =====================================================================================
-- Migration: Update get_system_stats and add get_maintenance_templates
-- Description: Updates get_system_stats to include maintenance_templates and catalog
--              Adds get_maintenance_templates function for maintenance templates endpoint
-- Created: 2025-12-08
-- =====================================================================================

set check_function_bodies = off;

-- =====================================================================================
-- Update get_system_stats to include maintenance_templates and catalog statistics
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.get_system_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE PARALLEL SAFE
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  -- ============================================================================
  -- Execute all counts in a single query using CTEs for optimal performance
  -- ============================================================================
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'equipment', jsonb_build_object(
        'active_count', equipment_stats.active_count,
        'total_count', equipment_stats.total_count,
        'inactive_count', equipment_stats.total_count - equipment_stats.active_count
      ),
      'farms', jsonb_build_object(
        'active_count', farm_stats.active_count,
        'total_count', farm_stats.total_count,
        'inactive_count', farm_stats.total_count - farm_stats.active_count,
        'total_acres', farm_stats.total_acres,
        'active_acres', farm_stats.active_acres
      ),
      'qr', jsonb_build_object(
        'bound_count', qr_stats.bound_count,
        'total_count', qr_stats.total_count,
        'unbound_count', qr_stats.total_count - qr_stats.bound_count,
        'status_breakdown', qr_stats.status_breakdown
      ),
      'maintenance_templates', jsonb_build_object(
        'total_count', maintenance_stats.template_count
      ),
      'catalog', jsonb_build_object(
        'equipment_types_count', catalog_stats.types_count,
        'equipment_makes_count', catalog_stats.makes_count,
        'equipment_models_count', catalog_stats.models_count
      )
    ),
    'metadata', jsonb_build_object(
      'timestamp', NOW(),
      'operation', 'get_system_stats'
    )
  )
  INTO v_result
  FROM
    -- Equipment statistics
    (
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') AS active_count,
        COUNT(*) AS total_count
      FROM equipment
    ) equipment_stats,
    -- Farm statistics
    (
      SELECT
        COUNT(*) FILTER (WHERE status = true) AS active_count,
        COUNT(*) AS total_count,
        COALESCE(SUM(acres) FILTER (WHERE status = true), 0) AS active_acres,
        COALESCE(SUM(acres), 0) AS total_acres
      FROM farm
    ) farm_stats,
    -- QR statistics with status breakdown
    (
      SELECT
        COUNT(*) FILTER (WHERE status = 'bound') AS bound_count,
        COUNT(*) AS total_count,
        jsonb_object_agg(
          COALESCE(status::text, 'null'),
          status_count
        ) AS status_breakdown
      FROM (
        SELECT
          status,
          COUNT(*) AS status_count
        FROM qr
        GROUP BY status
      ) qr_status_counts
    ) qr_stats,
    -- Maintenance template statistics
    (
      SELECT
        COUNT(*) AS template_count
      FROM _task_series
      WHERE type = 'template:maintenance'
    ) maintenance_stats,
    -- Equipment catalog statistics
    (
      SELECT
        (SELECT COUNT(*) FROM _equipment_type) AS types_count,
        (SELECT COUNT(*) FROM _equipment_make) AS makes_count,
        (SELECT COUNT(*) FROM _equipment_model) AS models_count
    ) catalog_stats;

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
        'operation', 'get_system_stats'
      )
    );
END;
$function$;
