-- Simple fix that avoids all type casting issues

-- 1. Grant basic permissions
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- 2. Ensure email is confirmed
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'slavataichi@gmail.com' 
AND email_confirmed_at IS NULL;

-- 3. Ensure profile exists
INSERT INTO user_profiles (user_id, email)
SELECT id, email
FROM auth.users
WHERE email = 'slavataichi@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

-- 4. Clear sessions using text comparison (works for both UUID and VARCHAR)
DELETE FROM auth.sessions 
WHERE user_id::text IN (
    SELECT id::text FROM auth.users WHERE email = 'slavataichi@gmail.com'
);

DELETE FROM auth.refresh_tokens 
WHERE user_id::text IN (
    SELECT id::text FROM auth.users WHERE email = 'slavataichi@gmail.com'
);

-- 5. Create simple RLS policy
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open for authenticated" ON user_profiles;
CREATE POLICY "Open for authenticated" ON user_profiles
    FOR ALL TO authenticated
    USING (true);

-- 6. Check the result
SELECT 
    'User exists' as check,
    EXISTS(SELECT 1 FROM auth.users WHERE email = 'slavataichi@gmail.com') as result
UNION ALL
SELECT 
    'Email confirmed' as check,
    EXISTS(SELECT 1 FROM auth.users WHERE email = 'slavataichi@gmail.com' AND email_confirmed_at IS NOT NULL) as result
UNION ALL
SELECT 
    'Profile exists' as check,
    EXISTS(SELECT 1 FROM user_profiles WHERE email = 'slavataichi@gmail.com') as result
UNION ALL
SELECT 
    'No active sessions' as check,
    NOT EXISTS(
        SELECT 1 FROM auth.sessions s 
        WHERE s.user_id::text = (SELECT id::text FROM auth.users WHERE email = 'slavataichi@gmail.com')
    ) as result;

-- 7. IMPORTANT: Check Supabase Dashboard
SELECT 'CHECK SUPABASE DASHBOARD → Logs → Auth Logs for the actual error!' as next_step;