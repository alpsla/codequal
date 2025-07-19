-- Force Remove SECURITY DEFINER from Views

-- ================================================
-- 1. Check Current View Owners and Properties
-- ================================================
SELECT 
    c.relname as view_name,
    n.nspname as schema_name,
    pg_get_userbyid(c.relowner) as owner,
    c.relacl as permissions,
    CASE 
        WHEN pg_get_viewdef(c.oid) LIKE '%SECURITY DEFINER%' THEN 'YES'
        ELSE 'NO'
    END as has_security_definer
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
AND n.nspname = 'public'
AND c.relname IN ('billing_summary', 'v_active_repositories', 'vector_operation_summary');

-- ================================================
-- 2. Force Drop and Recreate Each View
-- ================================================

-- First, check for dependencies
SELECT DISTINCT
    dependent_ns.nspname as dependent_schema,
    dependent_view.relname as dependent_view_name,
    source_ns.nspname as source_schema,
    source_table.relname as source_view
FROM pg_depend 
JOIN pg_class source_table ON source_table.oid = pg_depend.refobjid
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
JOIN pg_class dependent_view ON dependent_view.oid = pg_depend.objid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
WHERE source_ns.nspname = 'public'
AND source_table.relname IN ('billing_summary', 'v_active_repositories', 'vector_operation_summary')
AND source_table.oid != dependent_view.oid;

-- ================================================
-- 3. Alternative Method - Use ALTER VIEW
-- ================================================

-- Try to alter the views to remove SECURITY DEFINER
ALTER VIEW public.billing_summary RESET (security_definer);
ALTER VIEW public.v_active_repositories RESET (security_definer);
ALTER VIEW public.vector_operation_summary RESET (security_definer);

-- ================================================
-- 4. If Above Doesn't Work - Complete Recreation
-- ================================================

-- Save current view definitions first
\set billing_def `SELECT pg_get_viewdef('public.billing_summary'::regclass)`
\set active_repos_def `SELECT pg_get_viewdef('public.v_active_repositories'::regclass)`
\set vector_ops_def `SELECT pg_get_viewdef('public.vector_operation_summary'::regclass)`

-- Drop with CASCADE to handle dependencies
BEGIN;

-- Drop all three views
DROP VIEW IF EXISTS public.billing_summary CASCADE;
DROP VIEW IF EXISTS public.v_active_repositories CASCADE;
DROP VIEW IF EXISTS public.vector_operation_summary CASCADE;

-- Recreate billing_summary WITHOUT any special options
CREATE VIEW public.billing_summary AS
 SELECT s.organization_id,
    s.id AS subscription_id,
    s.stripe_subscription_id,
    s.tier,
    s.status,
    s.amount_cents,
    s.currency,
    s.billing_cycle,
    s.current_period_end,
    count(DISTINCT p.id) AS payment_count,
    COALESCE(sum(p.amount), (0)::bigint) AS total_paid_cents
   FROM (subscriptions s
     LEFT JOIN payments p ON (((p.subscription_id = s.id) AND (p.status = 'succeeded'::text))))
  GROUP BY s.id;

-- Recreate v_active_repositories WITHOUT any special options
CREATE VIEW public.v_active_repositories AS
 SELECT repositories.id,
    repositories.name,
    repositories.owner,
    repositories.platform,
    repositories.is_private,
    repositories.primary_language,
    repositories.size,
    repositories.created_at,
    repositories.last_analyzed_at,
    repositories.data_collection_status,
    repositories.analysis_count
   FROM repositories
  WHERE (repositories.last_analyzed_at >= (now() - '30 days'::interval));

-- Recreate vector_operation_summary WITHOUT any special options
CREATE VIEW public.vector_operation_summary AS
 SELECT date_trunc('hour'::text, vector_operation_logs.created_at) AS hour,
    vector_operation_logs.operation,
    count(*) AS total_operations,
    count(*) FILTER (WHERE (vector_operation_logs.success = true)) AS successful,
    count(*) FILTER (WHERE (vector_operation_logs.success = false)) AS failed,
    round((((count(*) FILTER (WHERE (vector_operation_logs.success = true)))::numeric / (count(*))::numeric) * (100)::numeric), 2) AS success_rate,
    avg(vector_operation_logs.duration_ms) AS avg_duration_ms
   FROM vector_operation_logs
  WHERE (vector_operation_logs.created_at > (now() - '7 days'::interval))
  GROUP BY (date_trunc('hour'::text, vector_operation_logs.created_at)), vector_operation_logs.operation
  ORDER BY (date_trunc('hour'::text, vector_operation_logs.created_at)) DESC, vector_operation_logs.operation;

-- Grant permissions
GRANT SELECT ON public.billing_summary TO authenticated;
GRANT SELECT ON public.billing_summary TO anon;
GRANT SELECT ON public.v_active_repositories TO authenticated;
GRANT SELECT ON public.v_active_repositories TO anon;
GRANT SELECT ON public.vector_operation_summary TO authenticated;
GRANT SELECT ON public.vector_operation_summary TO anon;

COMMIT;

-- ================================================
-- 5. Verify Security Definer is Removed
-- ================================================
SELECT 
    'After Fix' as status,
    c.relname as view_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_depend d
            JOIN pg_proc p ON d.refobjid = p.oid
            WHERE d.objid = c.oid AND p.prosecdef = true
        ) THEN 'STILL HAS SECURITY DEFINER'
        ELSE 'Clean - No Security Definer'
    END as security_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
AND n.nspname = 'public'
AND c.relname IN ('billing_summary', 'v_active_repositories', 'vector_operation_summary');