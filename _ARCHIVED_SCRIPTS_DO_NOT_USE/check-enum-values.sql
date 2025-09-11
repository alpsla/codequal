-- Check the ENUM values for subscription_tier in user_profiles

-- Step 1: Get the column type definition
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
AND column_name = 'subscription_tier';

-- Step 2: Get ENUM values if it's an enum type
SELECT 
    t.typname AS enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = (
    SELECT udt_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'subscription_tier'
)
GROUP BY t.typname;

-- Step 3: Check constraints on the column
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass
AND pg_get_constraintdef(oid) LIKE '%subscription_tier%';

-- Step 4: Check what values are actually in the column
SELECT 
    DISTINCT subscription_tier,
    COUNT(*) as count
FROM user_profiles
GROUP BY subscription_tier
ORDER BY subscription_tier;

-- Step 5: Compare with user_billing enum values
SELECT 
    'user_billing enum' as table_name,
    t.typname AS enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname = (
    SELECT udt_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_billing' 
    AND column_name = 'subscription_tier'
)
GROUP BY t.typname;