-- Create a test user and API key for E2E testing
-- Run this in your Supabase SQL editor

-- Step 1: Create a test user
INSERT INTO users (id, email, name, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'test@codequal.com',
  'Test User',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email;

-- Step 2: Create a test API key for development
-- Note: This creates a known test key for development only
-- In production, use the Node.js script to generate secure random keys

-- First, let's check if the test user exists
WITH test_user AS (
  SELECT id FROM users WHERE email = 'test@codequal.com' LIMIT 1
)
INSERT INTO api_keys (
  user_id,
  name,
  key_prefix,
  key_hash,
  usage_limit,
  active,
  permissions,
  created_at,
  updated_at
)
SELECT 
  test_user.id,
  'Development Test Key',
  'ck_',
  -- This is the SHA-256 hash of 'ck_test_development_key_12345'
  '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730',
  10000,
  true,
  '{"endpoints": "*"}'::jsonb,
  NOW(),
  NOW()
FROM test_user
WHERE NOT EXISTS (
  SELECT 1 FROM api_keys 
  WHERE key_hash = '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730'
);

-- Step 3: Verify the setup
SELECT 
  u.email,
  ak.name as api_key_name,
  ak.active,
  ak.usage_limit,
  ak.created_at
FROM users u
JOIN api_keys ak ON u.id = ak.user_id
WHERE u.email = 'test@codequal.com';

-- Your test API key for development is: ck_test_development_key_12345
-- Use this in the E2E test form