-- Find and fix SQL injection issues in auth flow

-- 1. List all triggers on auth.users that might have SQL injection
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE t.tgrelid = 'auth.users'::regclass
ORDER BY t.tgname;

-- 2. List all functions that might be called during auth
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

-- 4. Drop and recreate the user profile trigger with proper parameterization
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_auth_user_new();

-- 5. Create a safe trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS TRIGGER AS $$
BEGIN
    -- Use parameterized insert, no string concatenation
    INSERT INTO public.user_profiles (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) 
    DO UPDATE SET email = EXCLUDED.email;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't block auth
        RAISE WARNING 'Profile creation failed: %', SQLERRM;
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
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- 9. Grant proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_safe() TO authenticated, service_role;

-- 10. Clear sessions one more time
DELETE FROM auth.sessions 
WHERE user_id::text = (SELECT id::text FROM auth.users WHERE email = 'slavataichi@gmail.com');

DELETE FROM auth.refresh_tokens 
WHERE user_id::text = (SELECT id::text FROM auth.users WHERE email = 'slavataichi@gmail.com');

-- 11. Verify no SQL injection patterns remain
SELECT 
    'Functions with concatenation' as check_type,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE pg_get_functiondef(p.oid) LIKE '%|| NEW.%'
AND n.nspname IN ('public', 'auth')
UNION ALL
SELECT 
    'Policies with concatenation' as check_type,
    COUNT(*) as count
FROM pg_policies
WHERE (qual LIKE '%||%' OR with_check LIKE '%||%');

-- 12. Final check
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    p.user_id IS NOT NULL as has_profile
FROM auth.users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.email = 'slavataichi@gmail.com';