-- Correct fix for UUID type user_id column
-- This handles the case where user_id is UUID (not varchar as we thought)

-- 1. Verify the column types
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN ('user_profiles') 
AND column_name IN ('user_id', 'id', 'email')
ORDER BY table_name, ordinal_position;

-- 2. Basic setup
BEGIN;

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated, service_role;

-- 3. Ensure email is confirmed
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'slavataichi@gmail.com';

-- 4. Create/update profile (user_id is UUID, not text!)
INSERT INTO user_profiles (user_id, email)
SELECT id, email  -- No casting needed, both are UUID
FROM auth.users 
WHERE email = 'slavataichi@gmail.com'
ON CONFLICT (user_id) DO UPDATE 
SET email = EXCLUDED.email,
    updated_at = CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_profiles' 
                    AND column_name = 'updated_at')
        THEN NOW()
        ELSE user_profiles.updated_at
    END;

-- 5. Enable and configure RLS
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

-- Create proper policies for UUID user_id
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access" ON user_profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 6. Clear any existing sessions
DELETE FROM auth.sessions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com');

DELETE FROM auth.refresh_tokens 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com');

-- 7. Create a minimal trigger for profile creation (if missing)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO UPDATE 
    SET email = NEW.email;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't block auth flow if profile creation fails
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created' 
        AND tgrelid = 'auth.users'::regclass
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

COMMIT;

-- 8. Verify the fix
SELECT 
    u.id as user_id,
    u.email,
    u.email_confirmed_at,
    u.created_at,
    p.user_id as profile_user_id,
    p.email as profile_email,
    CASE 
        WHEN u.id IS NULL THEN '❌ User not found'
        WHEN u.email_confirmed_at IS NULL THEN '❌ Email not confirmed'
        WHEN p.user_id IS NULL THEN '❌ Profile missing'
        ELSE '✅ Everything looks good!'
    END as status
FROM auth.users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE u.email = 'slavataichi@gmail.com';

-- 9. Check for any auth errors in the config
SELECT * FROM auth.config;

-- 10. Test auth.uid() function (will be null if not authenticated)
SELECT auth.uid() as current_user_id;

-- 11. Final check - ensure no blocking policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;