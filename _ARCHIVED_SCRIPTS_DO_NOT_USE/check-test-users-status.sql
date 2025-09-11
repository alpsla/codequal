-- Check Test Users Status
-- This script shows the current state of test users without modifying anything

-- 1. Check auth users
SELECT 
  'Auth Users' as table_name,
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email IN ('slavataichi@gmail.com', 'rostislav.alpin@gmail.com');

-- 2. Check user profiles
SELECT 
  'User Profiles' as table_name,
  up.user_id,
  up.email,
  up.full_name,
  up.created_at
FROM public.user_profiles up
WHERE up.user_id IN (
  '9ea0c2a9-8b33-409a-a45e-fe218d13d65e',
  '580e3fe8-094d-477f-86cb-88e4273b589b'
);

-- 3. Check billing status
SELECT 
  'User Billing' as table_name,
  ub.user_id,
  au.email,
  ub.subscription_tier,
  ub.subscription_status,
  ub.trial_scans_used,
  ub.trial_scans_limit,
  ub.stripe_customer_id
FROM public.user_billing ub
JOIN auth.users au ON au.id = ub.user_id
WHERE ub.user_id IN (
  '9ea0c2a9-8b33-409a-a45e-fe218d13d65e',
  '580e3fe8-094d-477f-86cb-88e4273b589b'
);

-- 4. Check payment methods
SELECT 
  'Payment Methods' as table_name,
  pm.user_id,
  au.email,
  pm.stripe_payment_method_id,
  pm.last_four,
  pm.brand,
  pm.is_default
FROM public.payment_methods pm
JOIN auth.users au ON au.id = pm.user_id
WHERE pm.user_id IN (
  '9ea0c2a9-8b33-409a-a45e-fe218d13d65e',
  '580e3fe8-094d-477f-86cb-88e4273b589b'
);

-- 5. Check API keys
SELECT 
  'API Keys' as table_name,
  ak.user_id,
  au.email,
  ak.name,
  ak.active,
  ak.created_at,
  ak.key_prefix,
  ak.usage_count || '/' || ak.usage_limit as usage
FROM public.api_keys ak
JOIN auth.users au ON au.id = ak.user_id
WHERE ak.user_id IN (
  '9ea0c2a9-8b33-409a-a45e-fe218d13d65e',
  '580e3fe8-094d-477f-86cb-88e4273b589b'
)
AND ak.active = true
ORDER BY ak.created_at DESC;

-- 6. Summary view
SELECT 
  au.email,
  COALESCE(up.full_name, 'No profile') as profile_status,
  COALESCE(ub.subscription_tier, 'No billing') as subscription_tier,
  COALESCE(ub.subscription_status, 'N/A') as subscription_status,
  CASE 
    WHEN pm.user_id IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_payment_method,
  CASE 
    WHEN ak.user_id IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_api_key,
  ub.trial_scans_used || '/' || ub.trial_scans_limit as trial_usage
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
LEFT JOIN public.user_billing ub ON au.id = ub.user_id
LEFT JOIN public.payment_methods pm ON au.id = pm.user_id AND pm.is_default = true
LEFT JOIN public.api_keys ak ON au.id = ak.user_id AND ak.active = true
WHERE au.email IN ('slavataichi@gmail.com', 'rostislav.alpin@gmail.com')
GROUP BY au.email, up.full_name, ub.subscription_tier, ub.subscription_status, 
         pm.user_id, ak.user_id, ub.trial_scans_used, ub.trial_scans_limit;