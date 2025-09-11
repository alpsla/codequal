-- STEP 1: Add new ENUM values
-- Run this script FIRST and commit it

-- Check current ENUM values
SELECT 
    'Current ENUM values' as info,
    enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = (
    SELECT udt_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'subscription_tier'
)
ORDER BY enumsortorder;

-- Add missing values to the ENUM
DO $$
DECLARE
    v_type_name TEXT;
BEGIN
    -- Get the actual type name
    SELECT udt_name INTO v_type_name
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'subscription_tier';
    
    -- Add 'individual' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = v_type_name
        AND e.enumlabel = 'individual'
    ) THEN
        EXECUTE format('ALTER TYPE %I ADD VALUE ''individual''', v_type_name);
        RAISE NOTICE 'Added "individual" to % enum', v_type_name;
    ELSE
        RAISE NOTICE '"individual" already exists in % enum', v_type_name;
    END IF;
    
    -- Add 'team' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = v_type_name
        AND e.enumlabel = 'team'
    ) THEN
        EXECUTE format('ALTER TYPE %I ADD VALUE ''team''', v_type_name);
        RAISE NOTICE 'Added "team" to % enum', v_type_name;
    ELSE
        RAISE NOTICE '"team" already exists in % enum', v_type_name;
    END IF;
END $$;

-- Verify the new values were added
SELECT 
    'Updated ENUM values' as info,
    enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = (
    SELECT udt_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'subscription_tier'
)
ORDER BY enumsortorder;

-- IMPORTANT: After running this script, you must COMMIT the transaction
-- In Supabase SQL Editor, this happens automatically when you click "Run"