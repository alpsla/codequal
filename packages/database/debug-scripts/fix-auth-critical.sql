-- Critical Fix for "Database error granting user" in Supabase
-- This error often occurs due to missing grants or permission issues in Supabase's internal auth flow

-- IMPORTANT: Run this in Supabase SQL Editor as a superuser/admin

-- Step 1: Ensure all auth schema permissions are properly set
BEGIN;

-- Grant necessary permissions on auth schema to all roles
DO $$
BEGIN
    -- Grant usage on auth schema
    EXECUTE 'GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role';
    
    -- Grant permissions on auth sequences
    EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO postgres, anon, authenticated, service_role';
    
    -- Grant permissions on auth tables
    EXECUTE 'GRANT SELECT ON auth.users TO anon, authenticated, service_role';
    EXECUTE 'GRANT ALL ON auth.identities TO authenticated, service_role';
    EXECUTE 'GRANT ALL ON auth.sessions TO authenticated, service_role';
    EXECUTE 'GRANT ALL ON auth.refresh_tokens TO authenticated, service_role';
    
    -- Grant execute on auth functions
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error granting permissions: %', SQLERRM;
END $$;

-- Step 2: Fix the specific user's profile
DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'slavataichi@gmail.com';
BEGIN
    -- Get the user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User % not found in auth.users', v_email;
    ELSE
        -- Ensure user profile exists
        INSERT INTO user_profiles (
            id,
            user_id,
            email,
            full_name,
            created_at,
            updated_at,
            last_login_at,
            email_verified,
            auth_method
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            v_email,
            'Slava Taichi',
            NOW(),
            NOW(),
            NOW(),
            true,
            'magic_link'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            email_verified = true,
            auth_method = 'magic_link',
            updated_at = NOW();
        
        RAISE NOTICE 'User profile created/updated for %', v_email;
        
        -- Clear any existing sessions/tokens that might be corrupted
        DELETE FROM auth.sessions WHERE user_id = v_user_id;
        DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id;
        
        RAISE NOTICE 'Cleared existing sessions for user %', v_email;
    END IF;
END $$;

-- Step 3: Ensure RLS policies don't block auth operations
-- Create permissive policies for auth operations
DO $$
BEGIN
    -- Drop existing restrictive policies if any
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
    DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;
    
    -- Create new permissive policies
    CREATE POLICY "Users can view own profile" ON user_profiles
        FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can update own profile" ON user_profiles
        FOR UPDATE USING (auth.uid() = user_id);
    
    -- Allow service role full access
    CREATE POLICY "Service role has full access" ON user_profiles
        FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    
    -- Allow profile creation during signup
    CREATE POLICY "Enable profile creation on signup" ON user_profiles
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
    RAISE NOTICE 'RLS policies updated';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policies: %', SQLERRM;
END $$;

-- Step 4: Create or fix the auth trigger
CREATE OR REPLACE FUNCTION public.handle_auth_user_new()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (
        id,
        user_id,
        email,
        full_name,
        created_at,
        updated_at,
        email_verified,
        auth_method
    ) VALUES (
        gen_random_uuid(),
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        NOW(),
        NOW(),
        NEW.email_confirmed_at IS NOT NULL,
        CASE 
            WHEN NEW.raw_app_meta_data->>'provider' IS NOT NULL THEN NEW.raw_app_meta_data->>'provider'
            ELSE 'magic_link'
        END
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        last_login_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth flow
        RAISE WARNING 'Error in handle_auth_user_new: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_auth_user_new();

-- Step 5: Check and fix any custom auth hooks
-- List all auth hooks (for inspection)
SELECT 
    hook_name,
    hook_table_id,
    function_schema,
    function_name,
    enabled
FROM supabase_functions.hooks
WHERE hook_table_id = (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace = 'auth'::regnamespace);

-- Step 6: Verify the fix
DO $$
DECLARE
    v_user_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    -- Check user exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'slavataichi@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'User found with ID: %', v_user_id;
        
        -- Check profile exists
        SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = v_user_id) INTO v_profile_exists;
        
        IF v_profile_exists THEN
            RAISE NOTICE '✅ User profile exists';
        ELSE
            RAISE NOTICE '❌ User profile missing';
        END IF;
    ELSE
        RAISE NOTICE '❌ User not found';
    END IF;
END $$;

COMMIT;

-- Additional debugging queries
-- Check if there are any blocking RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('users', 'user_profiles', 'sessions', 'refresh_tokens')
ORDER BY schemaname, tablename, policyname;

-- Check for any errors in recent auth attempts
-- Note: This requires access to Supabase logs through the dashboard

-- Final test: Try to manually insert a session (requires service role)
-- This helps identify if the issue is with session creation
/*
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'slavataichi@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Try to create a test session
        INSERT INTO auth.sessions (
            id,
            user_id,
            created_at,
            updated_at,
            factor_id,
            aal,
            not_after
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            NOW(),
            NOW(),
            NULL,
            'aal1',
            NOW() + INTERVAL '1 hour'
        );
        
        RAISE NOTICE 'Test session created successfully';
        
        -- Clean up the test session
        DELETE FROM auth.sessions WHERE user_id = v_user_id AND created_at >= NOW() - INTERVAL '1 minute';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Session creation error: %', SQLERRM;
END $$;
*/