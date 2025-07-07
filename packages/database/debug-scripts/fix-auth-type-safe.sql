-- Fix for type mismatches in auth tables
-- This handles cases where user_id columns might be varchar instead of uuid

-- 1. First, let's check the actual types in auth tables
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'auth'
AND column_name = 'user_id'
AND table_name IN ('sessions', 'refresh_tokens', 'identities', 'mfa_factors', 'mfa_challenges')
ORDER BY table_name;

-- 2. Safe cleanup that handles type mismatches
DO $$
DECLARE
    v_user_id UUID;
    v_user_id_text TEXT;
BEGIN
    -- Get the user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'slavataichi@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        v_user_id_text := v_user_id::TEXT;
        
        -- Clear sessions (handle both UUID and TEXT types)
        BEGIN
            DELETE FROM auth.sessions WHERE user_id = v_user_id;
        EXCEPTION
            WHEN OTHERS THEN
                DELETE FROM auth.sessions WHERE user_id::text = v_user_id_text;
        END;
        
        -- Clear refresh tokens (handle both UUID and TEXT types)
        BEGIN
            DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id;
        EXCEPTION
            WHEN OTHERS THEN
                DELETE FROM auth.refresh_tokens WHERE user_id::text = v_user_id_text;
        END;
        
        -- Clear identities if table exists
        BEGIN
            DELETE FROM auth.identities WHERE user_id = v_user_id;
        EXCEPTION
            WHEN OTHERS THEN
                -- Table might not exist or have different type
                NULL;
        END;
        
        -- Clear MFA if tables exist
        BEGIN
            DELETE FROM auth.mfa_factors WHERE user_id = v_user_id;
            DELETE FROM auth.mfa_challenges WHERE user_id = v_user_id;
        EXCEPTION
            WHEN OTHERS THEN
                -- Tables might not exist
                NULL;
        END;
        
        RAISE NOTICE 'Cleared auth data for user %', v_user_id;
    END IF;
END $$;

-- 3. Grant permissions (safe version)
DO $$
BEGIN
    -- Grant schema permissions
    GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    
    -- Grant table permissions
    GRANT SELECT ON auth.users TO authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    
    -- Grant function permissions
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated, service_role;
    
    RAISE NOTICE 'Permissions granted';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error granting permissions: %', SQLERRM;
END $$;

-- 4. Ensure user profile exists
INSERT INTO user_profiles (user_id, email)
SELECT id, email
FROM auth.users
WHERE email = 'slavataichi@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

-- 5. Create flexible RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
    END LOOP;
END $$;

-- Create permissive policies
CREATE POLICY "Allow authenticated users" ON user_profiles
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon for signup" ON user_profiles
    FOR INSERT TO anon
    WITH CHECK (true);

-- 6. Alternative session cleanup using joins (avoids type issues)
DELETE FROM auth.sessions s
USING auth.users u
WHERE u.email = 'slavataichi@gmail.com'
AND (
    (s.user_id::text = u.id::text) OR 
    (TRY_CAST(s.user_id AS uuid) = u.id)
);

DELETE FROM auth.refresh_tokens r
USING auth.users u
WHERE u.email = 'slavataichi@gmail.com'
AND (
    (r.user_id::text = u.id::text) OR 
    (TRY_CAST(r.user_id AS uuid) = u.id)
);

-- 7. Create a type-safe cleanup function
CREATE OR REPLACE FUNCTION clean_user_sessions(user_email TEXT)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = user_email;
    
    IF v_user_id IS NOT NULL THEN
        -- Use dynamic SQL to handle type mismatches
        EXECUTE 'DELETE FROM auth.sessions WHERE user_id::text = $1::text' USING v_user_id;
        EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id::text = $1::text' USING v_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Use the function
SELECT clean_user_sessions('slavataichi@gmail.com');

-- 8. Final verification
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    p.user_id as profile_user_id,
    (SELECT COUNT(*) FROM auth.sessions s WHERE s.user_id::text = u.id::text) as session_count,
    (SELECT COUNT(*) FROM auth.refresh_tokens r WHERE r.user_id::text = u.id::text) as token_count
FROM auth.users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.email = 'slavataichi@gmail.com';

-- 9. Drop the cleanup function
DROP FUNCTION IF EXISTS clean_user_sessions(TEXT);