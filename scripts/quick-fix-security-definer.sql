-- Quick Fix for SECURITY DEFINER Views
-- Run this in Supabase SQL Editor

BEGIN;

-- Drop and recreate the three problematic views
DROP VIEW IF EXISTS public.billing_summary CASCADE;
DROP VIEW IF EXISTS public.v_active_repositories CASCADE;
DROP VIEW IF EXISTS public.vector_operation_summary CASCADE;

-- Recreate billing_summary (normal view, no SECURITY DEFINER)
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

-- Recreate v_active_repositories (normal view)
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

-- Recreate vector_operation_summary (normal view)
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
GRANT SELECT ON public.billing_summary TO authenticated;
GRANT SELECT ON public.v_active_repositories TO authenticated;
GRANT SELECT ON public.vector_operation_summary TO authenticated;

COMMIT;

-- Verify the fix
SELECT 
    'After Fix' as status,
    COUNT(*) as "SECURITY DEFINER Views Remaining"
FROM pg_views v
JOIN pg_class c ON c.relname = v.viewname
WHERE v.schemaname = 'public'
AND v.definition ILIKE '%SECURITY DEFINER%';