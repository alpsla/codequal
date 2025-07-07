-- Generate an access token manually
-- Run this in Supabase SQL Editor

-- First, let's create a simple function to generate a token
-- This is a workaround for testing purposes

DO $$
DECLARE
    user_id uuid := '9ea0c2a9-8b33-409a-a45e-fe218d13d65e';
    user_email text := 'slavataichi@gmail.com';
BEGIN
    -- Update last sign in to trigger profile update
    UPDATE auth.users 
    SET last_sign_in_at = NOW()
    WHERE id = user_id;
    
    RAISE NOTICE 'User % sign-in time updated', user_email;
    
    -- Verify profile exists
    IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = user_id) THEN
        RAISE NOTICE 'Profile exists for user %', user_email;
    ELSE
        RAISE NOTICE 'Profile missing for user %', user_email;
    END IF;
END $$;

-- Check the user's current state
SELECT 
    u.id,
    u.email,
    u.last_sign_in_at,
    up.id as profile_id,
    up.created_at as profile_created,
    up.last_login_at as profile_last_login
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email = 'slavataichi@gmail.com';