-- Fix for type mismatch error (varchar vs uuid)
-- This handles the case where user_id might be stored as varchar instead of uuid

-- 1. First, let's check the actual data types
SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.columns c
WHERE c.table_name = 'user_profiles'
AND c.column_name IN ('id', 'user_id', 'email')
ORDER BY c.ordinal_position;

-- 2. Check auth.users structure
SELECT 
    c.column_name,
    c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'auth' 
AND c.table_name = 'users'
AND c.column_name = 'id';

-- 3. Core fixes with proper type casting
BEGIN;

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO postgres, service_role;
GRANT SELECT ON auth.users TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- 4. Ensure email is confirmed
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'slavataichi@gmail.com';

-- 5. Create user profile with proper type handling
DO $$
DECLARE
    v_user_id UUID;
    v_user_id_text TEXT;
BEGIN
    -- Get the user ID as UUID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'slavataichi@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Convert to text for comparison if needed
        v_user_id_text := v_user_id::TEXT;
        
        -- Check if user_id column is UUID or VARCHAR
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'user_id' 
            AND data_type = 'uuid'
        ) THEN
            -- user_id is UUID type
            INSERT INTO user_profiles (user_id, email)
            VALUES (v_user_id, 'slavataichi@gmail.com')
            ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
        ELSE
            -- user_id is VARCHAR/TEXT type
            INSERT INTO user_profiles (user_id, email)
            VALUES (v_user_id_text, 'slavataichi@gmail.com')
            ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
        END IF;
        
        RAISE NOTICE 'Profile ensured for user %', v_user_id;
    ELSE
        RAISE NOTICE 'User not found';
    END IF;
END $$;

-- 6. Fix RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
    END LOOP;
END $$;

-- Create policies that handle type conversion
CREATE POLICY "Enable read for authenticated users" ON user_profiles
    FOR SELECT 
    USING (
        CASE 
            WHEN pg_typeof(user_id) = 'uuid'::regtype THEN user_id::uuid = auth.uid()
            ELSE user_id::text = auth.uid()::text
        END
    );

CREATE POLICY "Enable insert for authenticated users" ON user_profiles
    FOR INSERT 
    WITH CHECK (
        CASE 
            WHEN pg_typeof(user_id) = 'uuid'::regtype THEN user_id::uuid = auth.uid()
            ELSE user_id::text = auth.uid()::text
        END
    );

CREATE POLICY "Enable update for users" ON user_profiles
    FOR UPDATE 
    USING (
        CASE 
            WHEN pg_typeof(user_id) = 'uuid'::regtype THEN user_id::uuid = auth.uid()
            ELSE user_id::text = auth.uid()::text
        END
    );

-- Service role bypass
CREATE POLICY "Service role full access" ON user_profiles
    FOR ALL 
    USING (auth.jwt() ->> 'role' = 'service_role');

-- 7. Clear sessions with proper type casting
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'slavataichi@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        DELETE FROM auth.sessions WHERE user_id = v_user_id;
        DELETE FROM auth.refresh_tokens WHERE user_id = v_user_id;
        RAISE NOTICE 'Cleared sessions for user %', v_user_id;
    END IF;
END $$;

COMMIT;

-- 8. Verification query
WITH user_info AS (
    SELECT 
        u.id::text as user_id_text,
        u.id as user_id_uuid,
        u.email,
        u.email_confirmed_at
    FROM auth.users u
    WHERE u.email = 'slavataichi@gmail.com'
)
SELECT 
    ui.email,
    ui.email_confirmed_at IS NOT NULL as email_confirmed,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id::text = ui.user_id_text) THEN true
        ELSE false
    END as has_profile,
    CASE 
        WHEN ui.user_id_uuid IS NULL THEN '❌ User not found'
        WHEN ui.email_confirmed_at IS NULL THEN '❌ Email not confirmed'
        WHEN NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id::text = ui.user_id_text) THEN '❌ Profile missing'
        ELSE '✅ User setup complete'
    END as status
FROM user_info ui;

-- 9. Show the actual user_id values to debug type issues
SELECT 
    'Auth User ID' as source,
    id::text as value,
    pg_typeof(id) as data_type
FROM auth.users 
WHERE email = 'slavataichi@gmail.com'
UNION ALL
SELECT 
    'Profile User ID' as source,
    user_id::text as value,
    pg_typeof(user_id) as data_type
FROM user_profiles 
WHERE email = 'slavataichi@gmail.com';