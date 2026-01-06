-- ============================================================================
-- SESSION 77: Add save_patterns setting for pattern contribution
-- ============================================================================
-- This migration adds the save_patterns column to user_profiles table.
-- When enabled (true), AI-generated fixes are automatically saved as patterns
-- to help other developers.
--
-- Default: true for PRO users, false for BASIC users (set by application)
-- ============================================================================

-- Add save_patterns column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS save_patterns BOOLEAN DEFAULT true;

-- Add comment for the new column
COMMENT ON COLUMN public.user_profiles.save_patterns IS
  'When true, AI-generated fixes are automatically saved as patterns to help other developers. PRO feature.';

-- ============================================================================
-- End of migration
-- ============================================================================
