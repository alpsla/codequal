-- This SQL helps you check existing API keys in your database
-- Run this in your Supabase SQL editor

-- Check if there are any existing active API keys
SELECT 
  ak.id,
  ak.name,
  ak.key_prefix,
  ak.usage_limit,
  ak.usage_count,
  ak.active,
  ak.created_at,
  u.email as user_email
FROM api_keys ak
JOIN users u ON ak.user_id = u.id
WHERE ak.active = true
ORDER BY ak.created_at DESC
LIMIT 5;

-- If you need to create a test user first:
-- INSERT INTO users (email, name) 
-- VALUES ('test@example.com', 'Test User')
-- RETURNING id;

-- Note: You cannot retrieve the actual API key from the database
-- Only the hash is stored for security reasons