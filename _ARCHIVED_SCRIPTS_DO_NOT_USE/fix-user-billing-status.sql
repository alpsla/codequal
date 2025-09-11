-- Script to check and fix user billing status for rostislav.alpin@gmail.com
-- This addresses the mismatch between having a subscription but showing free tier

-- Step 1: Check current user and billing data
SELECT 
    'User and Billing Info' as section,
    u.id as user_id,
    u.email,
    up.full_name,
    ub.subscription_tier,
    ub.subscription_status,
    ub.stripe_customer_id,
    ub.stripe_subscription_id,
    ub.trial_ends_at,
    ub.updated_at as billing_updated_at
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_billing ub ON u.id = ub.user_id
WHERE u.email = 'rostislav.alpin@gmail.com';

-- Step 2: Check if user has payment methods
SELECT 
    'Payment Methods' as section,
    pm.stripe_payment_method_id,
    pm.is_default,
    pm.brand,
    pm.last_four,
    pm.created_at
FROM auth.users u
LEFT JOIN payment_methods pm ON u.id = pm.user_id
WHERE u.email = 'rostislav.alpin@gmail.com';

-- Step 3: Check recent billing events
SELECT 
    'Recent Billing Events' as section,
    be.event_type,
    be.stripe_event_id,
    be.data,
    be.created_at
FROM auth.users u
LEFT JOIN billing_events be ON u.id = be.user_id
WHERE u.email = 'rostislav.alpin@gmail.com'
ORDER BY be.created_at DESC
LIMIT 5;

-- Step 4: Check if there's a status column in user_profiles (it shouldn't be there)
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
AND column_name IN ('status', 'subscription_tier')
ORDER BY ordinal_position;

-- Step 5: If the user has a Stripe subscription but user_billing shows free tier, update it
-- IMPORTANT: Only run this if you've confirmed the user has an active subscription in Stripe
/*
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'rostislav.alpin@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Update billing status
        UPDATE user_billing
        SET 
            subscription_tier = 'individual',  -- or 'team' depending on their plan
            subscription_status = 'active',
            updated_at = NOW()
        WHERE user_id = v_user_id;
        
        RAISE NOTICE 'Updated billing status for user %', v_user_id;
    ELSE
        RAISE NOTICE 'User not found';
    END IF;
END $$;
*/

-- Step 6: Create user_billing record if it doesn't exist
DO $$
DECLARE
    v_user_id UUID;
    v_billing_exists BOOLEAN;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'rostislav.alpin@gmail.com';
    
    -- Check if billing record exists
    SELECT EXISTS(
        SELECT 1 FROM user_billing WHERE user_id = v_user_id
    ) INTO v_billing_exists;
    
    IF v_user_id IS NOT NULL AND NOT v_billing_exists THEN
        INSERT INTO user_billing (
            user_id,
            subscription_tier,
            subscription_status,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            'free',  -- Start with free, update after confirming Stripe status
            NULL,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created billing record for user %', v_user_id;
    ELSIF v_billing_exists THEN
        RAISE NOTICE 'Billing record already exists for user %', v_user_id;
    ELSE
        RAISE NOTICE 'User not found';
    END IF;
END $$;

-- Step 7: Final check - show all billing-related data for the user
SELECT 
    'Final Status Check' as section,
    u.id,
    u.email,
    up.full_name,
    ub.subscription_tier,
    ub.subscription_status,
    COUNT(pm.id) as payment_methods_count,
    COUNT(be.id) as billing_events_count
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_billing ub ON u.id = ub.user_id
LEFT JOIN payment_methods pm ON u.id = pm.user_id
LEFT JOIN billing_events be ON u.id = be.user_id
WHERE u.email = 'rostislav.alpin@gmail.com'
GROUP BY u.id, u.email, up.full_name, ub.subscription_tier, ub.subscription_status;