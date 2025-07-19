-- Fix Remaining Security Issues

-- ================================================
-- 1. Fix SECURITY DEFINER Views
-- ================================================
-- These views bypass RLS. We need to recreate them without SECURITY DEFINER

-- Fix vector_operation_summary view
DROP VIEW IF EXISTS public.vector_operation_summary CASCADE;
CREATE OR REPLACE VIEW public.vector_operation_summary AS
-- Copy the original view definition here, but WITHOUT SECURITY DEFINER
-- You'll need to check the current view definition first

-- Fix billing_summary view  
DROP VIEW IF EXISTS public.billing_summary CASCADE;
CREATE OR REPLACE VIEW public.billing_summary AS
-- Copy the original view definition here, but WITHOUT SECURITY DEFINER

-- Fix v_active_repositories view
DROP VIEW IF EXISTS public.v_active_repositories CASCADE;
CREATE OR REPLACE VIEW public.v_active_repositories AS
-- Copy the original view definition here, but WITHOUT SECURITY DEFINER

-- ================================================
-- 2. Enable RLS on _backup_metadata table
-- ================================================
ALTER TABLE public._backup_metadata ENABLE ROW LEVEL SECURITY;

-- Create a policy for superusers only (since this is a system table)
CREATE POLICY "_backup_metadata_superuser_only" ON public._backup_metadata
  FOR ALL 
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ================================================
-- 3. Check Current View Definitions
-- ================================================
-- Run this to see the current view definitions so we can recreate them properly:
SELECT 
    viewname as "View Name",
    definition as "Current Definition"
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('vector_operation_summary', 'billing_summary', 'v_active_repositories');

-- ================================================
-- 4. Alternative: If Views Are Not Needed
-- ================================================
-- If these views are not actively used, you can simply drop them:
-- DROP VIEW IF EXISTS public.vector_operation_summary CASCADE;
-- DROP VIEW IF EXISTS public.billing_summary CASCADE;
-- DROP VIEW IF EXISTS public.v_active_repositories CASCADE;