-- Minimal fix for skill tracking schema issues
-- This focuses only on the critical fixes needed for the API to work

-- Step 1: Rename skill_history to skill_updates if needed
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'skill_history')
       AND NOT EXISTS (SELECT FROM information_schema.tables 
                       WHERE table_schema = 'public' 
                       AND table_name = 'skill_updates') THEN
        
        ALTER TABLE skill_history RENAME TO skill_updates;
        
        -- Rename indexes
        ALTER INDEX IF EXISTS idx_skill_history_user_id RENAME TO idx_skill_updates_user_id;
        ALTER INDEX IF EXISTS idx_skill_history_pr_id RENAME TO idx_skill_updates_pr_id;
        ALTER INDEX IF EXISTS idx_skill_history_timestamp RENAME TO idx_skill_updates_timestamp;
        
        RAISE NOTICE 'Renamed skill_history to skill_updates';
    ELSE
        RAISE NOTICE 'Table skill_updates already exists or skill_history not found';
    END IF;
END $$;

-- Step 2: Add missing skill_id column
ALTER TABLE skill_updates 
ADD COLUMN IF NOT EXISTS skill_id UUID DEFAULT gen_random_uuid();

-- Step 3: Create index for skill_id
CREATE INDEX IF NOT EXISTS idx_skill_updates_skill_id ON skill_updates(skill_id);

-- Step 4: Verify the table structure
SELECT 'Current skill_updates table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'skill_updates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 5: Check if we have the required columns
SELECT 
    'Required columns check:' as info,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'skill_updates' 
           AND column_name = 'skill_id') as has_skill_id,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'skill_updates' 
           AND column_name = 'user_id') as has_user_id,
    EXISTS(SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'skill_updates' 
           AND column_name = 'pr_id') as has_pr_id;