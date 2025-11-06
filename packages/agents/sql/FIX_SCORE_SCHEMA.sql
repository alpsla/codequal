-- =====================================================
-- FIX: Score Schema - Add Missing Columns
-- =====================================================

-- 1. Add missing columns to app_scores
ALTER TABLE app_scores 
ADD COLUMN IF NOT EXISTS decision TEXT,
ADD COLUMN IF NOT EXISTS quality_score INTEGER,
ADD COLUMN IF NOT EXISTS existing_issues_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS blocking_issues_count INTEGER DEFAULT 0;

-- 2. Add missing columns to skill_scores (if they don't exist)
ALTER TABLE skill_scores
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS critical_issues_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS high_issues_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS medium_issues_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS low_issues_count INTEGER DEFAULT 0;

-- Note: commit_sha already added in previous migration
-- Note: Individual category score columns already exist in both tables

-- 3. Add helpful comments
COMMENT ON COLUMN app_scores.decision IS 'Merge decision: APPROVED or DECLINED based on score';
COMMENT ON COLUMN app_scores.quality_score IS 'Overall quality score (same as overall_score, kept for compatibility)';
COMMENT ON COLUMN app_scores.existing_issues_count IS 'Count of existing issues found in this PR';
COMMENT ON COLUMN app_scores.blocking_issues_count IS 'Count of critical/high severity blocking issues';

-- =====================================================
-- Migration complete!
-- =====================================================

