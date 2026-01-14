-- ============================================================================
-- SESSION 79: Add verification level settings for fix application
-- ============================================================================
-- This migration adds verification preference columns to user_profiles table.
-- Users can choose their preferred verification level for fix application:
-- - quick_apply: Apply fixes immediately (fastest)
-- - standard_verify: Scan modified files only (default)
-- - full_regression: Full codebase scan with auto-revert (safest)
--
-- Also adds auto_commit_fixes preference for automatic commits.
-- ============================================================================

-- Add verification_level column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'standard_verify'
CHECK (verification_level IN ('quick_apply', 'standard_verify', 'full_regression'));

-- Add auto_commit_fixes column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS auto_commit_fixes BOOLEAN DEFAULT false;

-- Add comments for the new columns
COMMENT ON COLUMN public.user_profiles.verification_level IS
  'User preference for fix verification level. Options: quick_apply (fastest), standard_verify (default), full_regression (safest with auto-revert)';

COMMENT ON COLUMN public.user_profiles.auto_commit_fixes IS
  'When true, automatically commit verified fixes after successful application and regression check';

-- ============================================================================
-- End of migration
-- ============================================================================
