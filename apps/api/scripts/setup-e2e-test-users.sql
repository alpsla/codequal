-- Setup E2E test users

-- Create test users if they don't exist
INSERT INTO users (id, email, name, created_at, updated_at, stripe_customer_id)
VALUES 
  (gen_random_uuid(), 'slavataichi@gmail.com', 'Slava Taichi', NOW(), NOW(), 'cus_test_slava'),
  (gen_random_uuid(), 'rostislav.alpin@gmail.com', 'Rostislav Alpin', NOW(), NOW(), 'cus_test_rostislav')
ON CONFLICT (email) DO NOTHING;

-- Create subscriptions for test users
INSERT INTO subscriptions (id, user_id, plan_type, status, start_date, end_date, stripe_subscription_id, trial_end, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  u.id,
  'pro',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year',
  'sub_test_' || substring(u.id::text, 1, 8),
  NULL,
  NOW(),
  NOW()
FROM users u
WHERE u.email IN ('slavataichi@gmail.com', 'rostislav.alpin@gmail.com')
AND NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
);

-- Create API keys for test users
INSERT INTO api_keys (id, user_id, key, name, status, created_at, last_used_at)
SELECT 
  gen_random_uuid(),
  u.id,
  'ck_test_' || encode(gen_random_bytes(32), 'hex'),
  'E2E Test Key',
  'active',
  NOW(),
  NULL
FROM users u
WHERE u.email IN ('slavataichi@gmail.com', 'rostislav.alpin@gmail.com')
AND NOT EXISTS (
  SELECT 1 FROM api_keys k WHERE k.user_id = u.id AND k.status = 'active' AND k.name = 'E2E Test Key'
);

-- Display the created API keys
SELECT 
  u.email,
  u.id as user_id,
  k.key as api_key,
  s.plan_type,
  s.status as subscription_status
FROM users u
JOIN api_keys k ON k.user_id = u.id
JOIN subscriptions s ON s.user_id = u.id
WHERE u.email IN ('slavataichi@gmail.com', 'rostislav.alpin@gmail.com')
AND k.status = 'active'
AND s.status = 'active';