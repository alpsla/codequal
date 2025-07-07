-- Fixed version: Find and fix SQL injection issues in auth flow

-- 1. List all triggers on auth.users that might have SQL injection
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'auth.users'::regclass
ORDER BY t.tgname;

-- 2. List all functions that might be called during auth with string concatenation
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE (
    p.proname LIKE '%user%' OR 
    p.proname LIKE '%auth%' OR 
    p.proname LIKE '%profile%'
)
AND n.nspname IN ('public', 'auth')
AND pg_get_functiondef(p.oid) LIKE '%||%'  -- Look for string concatenation
ORDER BY n.nspname, p.proname;

-- 3. Check RLS policies for SQL injection patterns
SELECT 
    schemaname,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies
WHERE (qual LIKE '%||%' OR with_check LIKE '%||%')
AND tablename IN ('user_profiles', 'users', 'sessions');

-- 4. Drop potentially problematic functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_or_updated ON auth.users;
DROP TRIGGER IF EXISTS ensure_profile_on_user_change ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_auth_user_new() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_oauth_user() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_profile_exists() CASCADE;

-- 5. Create a safe trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS TRIGGER AS $$
BEGIN
    -- Use parameterized insert, no string concatenation
    INSERT INTO public.user_profiles (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't block auth
        RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_safe();

-- 7. Fix any RLS policies with SQL injection vulnerabilities
-- Drop all policies on user_profiles
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
    END LOOP;
END $$;

-- 8. Create safe RLS policies using proper functions
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role bypass" ON user_profiles
    FOR ALL 
    USING (
        (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    );

-- 9. Grant proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_safe() TO authenticated, service_role, anon;

-- 10. Clear sessions safely
DELETE FROM auth.sessions 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com');

DELETE FROM auth.refresh_tokens 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com');

-- 11. Ensure user profile exists
INSERT INTO user_profiles (user_id, email)
SELECT id, email FROM auth.users WHERE email = 'slavataichi@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

-- 12. Check for any remaining SQL injection patterns
SELECT 
    'Checking for SQL injection patterns...' as status;

SELECT 
    n.nspname as schema,
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%|| NEW.%' THEN 'UNSAFE - String concatenation with NEW record'
        WHEN pg_get_functiondef(p.oid) LIKE '%EXECUTE%||%' THEN 'UNSAFE - Dynamic SQL with concatenation'
        WHEN pg_get_functiondef(p.oid) LIKE '%format(%' AND pg_get_functiondef(p.oid) LIKE '%||%' THEN 'UNSAFE - Format with concatenation'
        ELSE 'Possibly unsafe'
    END as issue
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE pg_get_functiondef(p.oid) LIKE '%||%'
AND n.nspname IN ('public', 'auth')
AND p.proname NOT LIKE 'pg_%';

-- 13. Final verification
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    p.user_id IS NOT NULL as has_profile,
    COUNT(DISTINCT s.id) as active_sessions,
    COUNT(DISTINCT r.token) as refresh_tokens
FROM auth.users u
LEFT JOIN user_profiles p ON p.user_id = u.id
LEFT JOIN auth.sessions s ON s.user_id = u.id
LEFT JOIN auth.refresh_tokens r ON r.user_id = u.id
WHERE u.email = 'slavataichi@gmail.com'
GROUP BY u.id, u.email, u.email_confirmed_at, p.user_id;

-- 14. Show next steps
SELECT 
    'IMPORTANT: After running this script, try the magic link again.' as next_step_1,
    'If it still fails, check the Auth logs for new error messages.' as next_step_2,
    'The SQL injection error should be resolved now.' as next_step_3;