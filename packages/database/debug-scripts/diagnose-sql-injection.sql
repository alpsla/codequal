-- Quick diagnostic to find SQL injection source

-- 1. Show all triggers on auth.users
SELECT 'Current triggers on auth.users:' as info;
SELECT 
    tgname as trigger_name,
    tgenabled as enabled
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass
AND tgname NOT LIKE 'pg_%'
AND tgname NOT LIKE 'RI_%';

-- 2. Show trigger functions that might have issues
SELECT 'Functions used by triggers:' as info;
SELECT DISTINCT
    p.proname as function_name,
    n.nspname as schema
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE t.tgrelid = 'auth.users'::regclass
AND tgname NOT LIKE 'pg_%';

-- 3. Look for the specific function causing issues
SELECT 'Checking for concatenation in trigger functions:' as info;
SELECT 
    p.proname,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%|| NEW.email ||%' THEN 'FOUND: Concatenating NEW.email'
        WHEN pg_get_functiondef(p.oid) LIKE '%|| NEW.%' THEN 'FOUND: Concatenating NEW fields'
        WHEN pg_get_functiondef(p.oid) LIKE '%EXECUTE%||%' THEN 'FOUND: Dynamic SQL'
        ELSE 'No direct concatenation found'
    END as issue
FROM pg_proc p
WHERE p.oid IN (
    SELECT DISTINCT tgfoid 
    FROM pg_trigger 
    WHERE tgrelid = 'auth.users'::regclass
);

-- 4. Show the actual function definitions
SELECT 'Function definitions:' as info;
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
WHERE p.oid IN (
    SELECT DISTINCT tgfoid 
    FROM pg_trigger 
    WHERE tgrelid = 'auth.users'::regclass
)
AND p.proname NOT LIKE 'pg_%';

-- 5. Quick fix - disable problematic triggers temporarily
UPDATE pg_trigger 
SET tgenabled = 'D'  -- Disable
WHERE tgrelid = 'auth.users'::regclass
AND tgname IN (
    SELECT t.tgname
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'auth.users'::regclass
    AND pg_get_functiondef(p.oid) LIKE '%||%'
);

-- Show disabled triggers
SELECT 
    'Disabled triggers:' as info,
    tgname 
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass 
AND tgenabled = 'D';

-- 6. Try to clear the user's sessions again
DELETE FROM auth.sessions WHERE user_id = (SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com');
DELETE FROM auth.refresh_tokens WHERE user_id = (SELECT id FROM auth.users WHERE email = 'slavataichi@gmail.com');

SELECT 'Try the magic link now. If it works, we know the issue was in a trigger.' as next_step;