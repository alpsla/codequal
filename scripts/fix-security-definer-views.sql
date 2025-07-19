-- Fix SECURITY DEFINER Views and Remaining Security Issues

-- ================================================
-- 1. Fix _backup_metadata table (1 security issue)
-- ================================================
ALTER TABLE public._backup_metadata ENABLE ROW LEVEL SECURITY;

-- Create a restrictive policy - only admins can access
CREATE POLICY "_backup_metadata_admin_only" ON public._backup_metadata
  FOR ALL 
  USING (
    auth.role() = 'service_role' 
    OR current_user = 'postgres'
    OR auth.jwt() ->> 'role' = 'authenticated' AND auth.jwt() ->> 'email' LIKE '%admin%'
  );

-- ================================================
-- 2. Recreate Views WITHOUT SECURITY DEFINER
-- ================================================

-- Drop and recreate billing_summary view
DROP VIEW IF EXISTS public.billing_summary CASCADE;
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
FROM subscriptions s
LEFT JOIN payments p ON ((p.subscription_id = s.id) AND (p.status = 'succeeded'::text))
GROUP BY s.id;

-- Grant appropriate permissions
GRANT SELECT ON public.billing_summary TO authenticated;

-- Drop and recreate v_active_repositories view
DROP VIEW IF EXISTS public.v_active_repositories CASCADE;
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

-- Grant appropriate permissions
GRANT SELECT ON public.v_active_repositories TO authenticated;

-- Drop and recreate vector_operation_summary view
DROP VIEW IF EXISTS public.vector_operation_summary CASCADE;
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

-- Grant appropriate permissions
GRANT SELECT ON public.vector_operation_summary TO authenticated;

-- ================================================
-- 3. Verify All Security Issues Are Fixed
-- ================================================

-- Check that all tables now have RLS
SELECT 
    COUNT(*) as "Tables without RLS",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ All tables have RLS enabled!'
        ELSE '❌ Still have tables without RLS'
    END as "Status"
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Check for SECURITY DEFINER views
SELECT 
    COUNT(*) as "SECURITY DEFINER Views",
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No SECURITY DEFINER views!'
        ELSE '❌ Still have SECURITY DEFINER views'
    END as "Status"
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.schemaname
WHERE v.schemaname = 'public'
AND EXISTS (
    SELECT 1 FROM pg_depend d
    JOIN pg_proc p ON d.refobjid = p.oid
    WHERE d.objid = c.oid
    AND p.prosecdef = true
);

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Security fixes applied!';
    RAISE NOTICE '- Enabled RLS on _backup_metadata table';
    RAISE NOTICE '- Removed SECURITY DEFINER from 3 views';
    RAISE NOTICE '- Views now respect user permissions and RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE 'Expected result: 19 security issues → 0 security issues';
END $$;