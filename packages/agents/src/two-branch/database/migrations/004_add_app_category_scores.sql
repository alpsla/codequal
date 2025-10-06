-- ============================================================================
-- Migration: Add APP category scores to pr_analysis_history
-- Version: 004
-- Date: 2025-10-06
-- Purpose: Enable repository health tracking with category-specific scores
--
-- APP Scoring vs Developer Scoring:
-- - APP scoring measures repository/application health (baseline = 100)
-- - Developer scoring measures individual skill (baseline = 50)
-- - APP overall = LOWEST category (weakest link principle)
-- - Developer overall = AVERAGE of categories
-- ============================================================================

-- Add APP category score columns to pr_analysis_history
ALTER TABLE pr_analysis_history
  ADD COLUMN IF NOT EXISTS app_overall_score INTEGER CHECK (app_overall_score >= 0 AND app_overall_score <= 100),
  ADD COLUMN IF NOT EXISTS app_security_score INTEGER CHECK (app_security_score >= 0 AND app_security_score <= 100),
  ADD COLUMN IF NOT EXISTS app_performance_score INTEGER CHECK (app_performance_score >= 0 AND app_performance_score <= 100),
  ADD COLUMN IF NOT EXISTS app_architecture_score INTEGER CHECK (app_architecture_score >= 0 AND app_architecture_score <= 100),
  ADD COLUMN IF NOT EXISTS app_dependency_score INTEGER CHECK (app_dependency_score >= 0 AND app_dependency_score <= 100),
  ADD COLUMN IF NOT EXISTS app_code_quality_score INTEGER CHECK (app_code_quality_score >= 0 AND app_code_quality_score <= 100);

-- Add indexes for efficient APP score queries
CREATE INDEX IF NOT EXISTS idx_pr_analysis_app_scores
  ON pr_analysis_history(repo_name, app_overall_score DESC);

CREATE INDEX IF NOT EXISTS idx_pr_analysis_app_timeline
  ON pr_analysis_history(repo_name, analyzed_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN pr_analysis_history.app_overall_score IS 'Overall APP health score (0-100) - LOWEST of all categories (weakest link)';
COMMENT ON COLUMN pr_analysis_history.app_security_score IS 'Security health score for repository (0-100)';
COMMENT ON COLUMN pr_analysis_history.app_performance_score IS 'Performance health score for repository (0-100)';
COMMENT ON COLUMN pr_analysis_history.app_architecture_score IS 'Architecture health score for repository (0-100)';
COMMENT ON COLUMN pr_analysis_history.app_dependency_score IS 'Dependency health score for repository (0-100)';
COMMENT ON COLUMN pr_analysis_history.app_code_quality_score IS 'Code quality health score for repository (0-100)';

-- ============================================================================
-- Verification: Check columns were added
-- ============================================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pr_analysis_history'
  AND column_name LIKE 'app_%'
ORDER BY ordinal_position;

-- ============================================================================
-- Expected output:
-- column_name              | data_type | is_nullable
-- -------------------------|-----------|------------
-- app_overall_score        | integer   | YES
-- app_security_score       | integer   | YES
-- app_performance_score    | integer   | YES
-- app_architecture_score   | integer   | YES
-- app_dependency_score     | integer   | YES
-- app_code_quality_score   | integer   | YES
-- ============================================================================

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Get current repository health
-- SELECT
--   repo_name,
--   app_overall_score,
--   app_security_score,
--   app_performance_score,
--   app_architecture_score,
--   app_dependency_score,
--   app_code_quality_score,
--   analyzed_at
-- FROM pr_analysis_history
-- WHERE repo_name = 'apache/kafka'
-- ORDER BY analyzed_at DESC
-- LIMIT 1;

-- Get repository health trend (last 10 PRs)
-- SELECT
--   pr_number,
--   app_overall_score,
--   analyzed_at
-- FROM pr_analysis_history
-- WHERE repo_name = 'apache/kafka'
-- ORDER BY analyzed_at DESC
-- LIMIT 10;

-- Find repositories with low dependency scores
-- SELECT
--   repo_name,
--   app_dependency_score,
--   app_overall_score
-- FROM pr_analysis_history
-- WHERE app_dependency_score < 70
-- ORDER BY app_dependency_score ASC;

-- ============================================================================
-- Migration complete
-- ============================================================================
