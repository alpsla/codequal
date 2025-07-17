-- Fix additional missing columns found in E2E test

-- Add missing columns to repository_schedules table
ALTER TABLE public.repository_schedules 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_be_disabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enabled_tools TEXT[] DEFAULT ARRAY['deepwiki', 'vector_search'];

-- Create index on is_active for performance
CREATE INDEX IF NOT EXISTS idx_repository_schedules_is_active 
ON public.repository_schedules(is_active);

-- Verify the fix
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'repository_schedules'
ORDER BY ordinal_position;