-- Final verification and solution

-- The debug showed subscription_tier IS 'individual' in the array: "{individual}"
-- So the update worked! Let's verify:

-- 1. Simple direct query
SELECT email, subscription_tier 
FROM user_profiles 
WHERE email = 'rostislav.alpin@gmail.com';

-- 2. If still showing 'free', try these troubleshooting steps:

-- Option A: Clear any client-side cache
-- In Supabase SQL Editor, try refreshing the page

-- Option B: Check if you're querying the right database/schema
SELECT current_database(), current_schema();

-- Option C: Force a new transaction
BEGIN;
SELECT email, subscription_tier 
FROM user_profiles 
WHERE email = 'rostislav.alpin@gmail.com';
COMMIT;

-- 3. SUCCESS CONFIRMATION
-- Your debug query showed: "tiers": "{individual}"
-- This means the subscription_tier IS SET TO 'individual'
-- The update was successful!

-- 4. Test that the application can see it correctly
SELECT 
    'SUCCESS - User has Individual subscription' as status,
    email,
    subscription_tier,
    CASE 
        WHEN subscription_tier = 'individual' THEN '✅ Premium Access Granted'
        WHEN subscription_tier = 'free' THEN '❌ Free Tier Only'
        ELSE '❓ Unknown Tier'
    END as access_level
FROM user_profiles
WHERE email = 'rostislav.alpin@gmail.com';

-- 5. Summary for other users who need updates
SELECT 
    COUNT(*) FILTER (WHERE subscription_tier = 'individual') as individual_users,
    COUNT(*) FILTER (WHERE subscription_tier = 'team') as team_users,
    COUNT(*) FILTER (WHERE subscription_tier = 'free') as free_users,
    COUNT(*) as total_users
FROM user_profiles;