-- CodeQual Database Optimization Script
-- Generated: 2025-07-18T15:44:49.455Z
-- Issues Found: 6 

-- ================================================
-- SECURITY FIXES (Priority: HIGH)
-- ================================================

-- Enable RLS on public.skill_progression
ALTER TABLE public.skill_progression ENABLE ROW LEVEL SECURITY;

-- Create basic policies for public.skill_progression
CREATE POLICY "public.skill_progression_select" ON public.skill_progression
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "public.skill_progression_insert" ON public.skill_progression
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS on public.skill_recommendations
ALTER TABLE public.skill_recommendations ENABLE ROW LEVEL SECURITY;

-- Create basic policies for public.skill_recommendations
CREATE POLICY "public.skill_recommendations_select" ON public.skill_recommendations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "public.skill_recommendations_insert" ON public.skill_recommendations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS on public.skill_categories
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;

-- Create basic policies for public.skill_categories
CREATE POLICY "public.skill_categories_select" ON public.skill_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "public.skill_categories_insert" ON public.skill_categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS on public.developer_skills
ALTER TABLE public.developer_skills ENABLE ROW LEVEL SECURITY;

-- Create basic policies for public.developer_skills
CREATE POLICY "public.developer_skills_select" ON public.developer_skills
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "public.developer_skills_insert" ON public.developer_skills
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS on public.api_usage
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Create basic policies for public.api_usage
CREATE POLICY "public.api_usage_select" ON public.api_usage
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "public.api_usage_insert" ON public.api_usage
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS on public.stripe_customers
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- Create basic policies for public.stripe_customers
CREATE POLICY "public.stripe_customers_select" ON public.stripe_customers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "public.stripe_customers_insert" ON public.stripe_customers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);


-- ================================================
-- PERFORMANCE OPTIMIZATIONS
-- ================================================

-- Frequent queries filter by repository and content type with date ordering
-- Estimated improvement: 60-80% query time reduction
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vector_store_repository_id_content_type_created_at
  ON vector_store (repository_id, content_type, created_at);

-- Usage queries always filter by user and date range
-- Estimated improvement: 70% query time reduction
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_user_id_created_at
  ON api_usage (user_id, created_at);

-- Lookups by repository/PR with status checks
-- Estimated improvement: 50% query time reduction
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_results_repository_id_pr_number_status
  ON analysis_results (repository_id, pr_number, status);

-- Skill lookups by user and category
-- Estimated improvement: 40% query time reduction
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_developer_skills_user_id_skill_category_id
  ON developer_skills (user_id, skill_category_id);


-- ================================================
-- QUERY OPTIMIZATIONS
-- ================================================

-- Analyze all tables to update statistics
ANALYZE;

-- Set optimal configuration for your workload
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '64MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET random_page_cost = 1.1; -- For SSDs

-- Reload configuration
SELECT pg_reload_conf();
