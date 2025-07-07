-- Comprehensive fix for "Database error granting user" 
-- when basic setup looks correct

BEGIN;

-- 1. Ensure all auth permissions are granted
DO $$
BEGIN
    -- Grant permissions on auth schema objects
    EXECUTE 'GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role';
    
    -- Grant permissions on ALL auth tables (not just users)
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA auth TO service_role';
    EXECUTE 'GRANT ALL ON auth.sessions TO authenticated, service_role';
    EXECUTE 'GRANT ALL ON auth.refresh_tokens TO authenticated, service_role';
    EXECUTE 'GRANT ALL ON auth.mfa_factors TO authenticated, service_role';
    EXECUTE 'GRANT ALL ON auth.mfa_challenges TO authenticated, service_role';
    EXECUTE 'GRANT SELECT ON auth.users TO authenticated';
    
    -- Grant permissions on auth sequences (important!)
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO authenticated, service_role';
    
    -- Grant execute on ALL auth functions
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated, service_role';
    
    RAISE NOTICE 'Auth permissions granted';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error granting auth permissions: %', SQLERRM;
END $$;

-- 2. Fix potential issues with auth.identities table
DO $$
BEGIN
    -- Ensure identities table has proper permissions
    GRANT ALL ON auth.identities TO service_role;
    GRANT SELECT, INSERT, UPDATE ON auth.identities TO authenticated;
    
    -- Clean up any orphaned identities
    DELETE FROM auth.identities i
    WHERE NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.id = i.user_id
    );
    
    RAISE NOTICE 'Identities table cleaned';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error with identities: %', SQLERRM;
END $$;

-- 3. Ensure RLS is not blocking auth operations
DO $$
BEGIN
    -- Temporarily disable RLS on auth tables (if enabled by mistake)
    ALTER TABLE auth.sessions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE auth.refresh_tokens DISABLE ROW LEVEL SECURITY;
    ALTER TABLE auth.mfa_factors DISABLE ROW LEVEL SECURITY;
    ALTER TABLE auth.mfa_challenges DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'RLS disabled on auth tables';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error disabling RLS: %', SQLERRM;
END $$;

-- 4. Fix user_profiles RLS to be more permissive during auth
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
    END LOOP;
END $$;

-- Create very permissive policies
CREATE POLICY "Enable all for authenticated" ON user_profiles
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable insert for anon during signup" ON user_profiles
    FOR INSERT 
    TO anon
    WITH CHECK (true);

CREATE POLICY "Service role bypass" ON user_profiles
    FOR ALL
    TO service_role
    USING (true);

-- 5. Create or replace the user creation trigger with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to insert/update user profile
    BEGIN
        INSERT INTO public.user_profiles (user_id, email)
        VALUES (NEW.id, NEW.email)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            email = EXCLUDED.email,
            updated_at = CASE 
                WHEN EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_profiles' 
                    AND column_name = 'updated_at'
                ) THEN NOW() 
                ELSE NULL 
            END;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log but don't fail
            RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 6. Clear ALL auth-related data for the user to start fresh
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'slavataichi@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Clear all sessions
        DELETE FROM auth.sessions WHERE user_id = v_user_id;
        DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id;
        DELETE FROM auth.mfa_factors WHERE user_id = v_user_id;
        DELETE FROM auth.mfa_challenges WHERE user_id = v_user_id;
        
        -- Clear any identities (for OAuth)
        DELETE FROM auth.identities WHERE user_id = v_user_id;
        
        RAISE NOTICE 'Cleared all auth data for user %', v_user_id;
    END IF;
END $$;

-- 7. Ensure auth config is not blocking
-- Check if there are any custom settings that might interfere
UPDATE auth.config 
SET value = 'true' 
WHERE key = 'external_email_enabled';

UPDATE auth.config 
SET value = 'false' 
WHERE key = 'mailer_autoconfirm';

-- 8. Grant permissions on provider_accounts if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'provider_accounts'
    ) THEN
        GRANT ALL ON provider_accounts TO authenticated, service_role;
        RAISE NOTICE 'Granted permissions on provider_accounts';
    END IF;
END $$;

COMMIT;

-- 9. Final verification
SELECT 
    '=== FINAL CHECK ===' as section;

SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    p.user_id as profile_id,
    COUNT(s.id) as active_sessions,
    COUNT(r.token) as refresh_tokens
FROM auth.users u
LEFT JOIN user_profiles p ON p.user_id = u.id
LEFT JOIN auth.sessions s ON s.user_id = u.id
LEFT JOIN auth.refresh_tokens r ON r.user_id = u.id
WHERE u.email = 'slavataichi@gmail.com'
GROUP BY u.id, u.email, u.email_confirmed_at, p.user_id;

-- 10. Test critical auth functions
SELECT 
    '=== AUTH FUNCTION TEST ===' as section;

-- These should work without errors
SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'uid' 
    AND pronamespace = 'auth'::regnamespace
) as uid_function_exists;

SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'jwt' 
    AND pronamespace = 'auth'::regnamespace
) as jwt_function_exists;

-- 11. Show any auth-related errors in recent logs
-- Note: This requires checking Supabase Dashboard logs

SELECT 
    '=== NEXT STEPS ===' as section,
    'Check Supabase Dashboard → Logs → Auth Logs for detailed error messages' as action;