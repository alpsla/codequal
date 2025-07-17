-- Safe fix for subscription issue
-- Works around ENUM constraints in user_profiles table

-- Step 1: Check current enum values
DO $$
DECLARE
    v_enum_values TEXT[];
BEGIN
    -- Get allowed values for user_profiles.subscription_tier
    SELECT array_agg(enumlabel::TEXT)
    INTO v_enum_values
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = (
        SELECT udt_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'subscription_tier'
    );
    
    RAISE NOTICE 'Allowed subscription_tier values in user_profiles: %', v_enum_values;
END $$;

-- Step 2: Since we can't update to 'individual', let's check the actual billing data
SELECT 
    'Current Status' as info,
    u.email,
    up.subscription_tier as profile_tier,
    ub.subscription_tier as billing_tier,
    ub.subscription_status as billing_status,
    CASE 
        WHEN ub.subscription_tier = 'individual' AND ub.subscription_status = 'active' 
        THEN 'User has ACTIVE INDIVIDUAL subscription but profile shows FREE'
        ELSE 'Check billing status'
    END as issue
FROM auth.users u
JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_billing ub ON u.id = ub.user_id
WHERE u.email = 'rostislav.alpin@gmail.com';

-- Step 3: The real fix - alter the ENUM type to include missing values
-- First, check if we need to add values
DO $$
BEGIN
    -- Add 'individual' to the enum if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = (
            SELECT udt_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles' 
            AND column_name = 'subscription_tier'
        )
        AND e.enumlabel = 'individual'
    ) THEN
        -- Get the type name
        EXECUTE format(
            'ALTER TYPE %I ADD VALUE IF NOT EXISTS %L',
            (SELECT udt_name FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'user_profiles' 
             AND column_name = 'subscription_tier'),
            'individual'
        );
        RAISE NOTICE 'Added "individual" to subscription_tier enum';
    END IF;

    -- Add 'team' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = (
            SELECT udt_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles' 
            AND column_name = 'subscription_tier'
        )
        AND e.enumlabel = 'team'
    ) THEN
        EXECUTE format(
            'ALTER TYPE %I ADD VALUE IF NOT EXISTS %L',
            (SELECT udt_name FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'user_profiles' 
             AND column_name = 'subscription_tier'),
            'team'
        );
        RAISE NOTICE 'Added "team" to subscription_tier enum';
    END IF;
END $$;

-- Step 4: Now we can safely update
UPDATE user_profiles
SET subscription_tier = 'individual'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'rostislav.alpin@gmail.com');

-- Step 5: Verify the fix
SELECT 
    'After Fix' as info,
    u.email,
    up.subscription_tier as profile_tier,
    ub.subscription_tier as billing_tier,
    ub.subscription_status as billing_status
FROM auth.users u
JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_billing ub ON u.id = ub.user_id
WHERE u.email = 'rostislav.alpin@gmail.com';