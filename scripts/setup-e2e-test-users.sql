-- Setup script for E2E test users
-- This script ensures the test users have proper billing and subscription data

-- First, ensure user profiles exist for both users
INSERT INTO public.user_profiles (user_id, email, full_name, avatar_url)
VALUES 
  ('9ea0c2a9-8b33-409a-a45e-fe218d13d65e', 'slavataichi@gmail.com', 'Test User (Pay-per-scan)', NULL),
  ('580e3fe8-094d-477f-86cb-88e4273b589b', 'rostislav.alpin@gmail.com', 'Test User (Individual)', NULL)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

-- Setup billing for pay-per-scan user (slavataichi@gmail.com)
INSERT INTO public.user_billing (
  user_id, 
  subscription_tier, 
  subscription_status,
  trial_scans_used, 
  trial_scans_limit,
  stripe_customer_id
)
VALUES (
  '9ea0c2a9-8b33-409a-a45e-fe218d13d65e',
  'free',
  null,
  0,
  10,
  'cus_test_payperscant' -- Test Stripe customer ID
)
ON CONFLICT (user_id) DO UPDATE SET
  subscription_tier = EXCLUDED.subscription_tier,
  subscription_status = EXCLUDED.subscription_status;

-- Setup billing for Individual plan user (rostislav.alpin@gmail.com)
INSERT INTO public.user_billing (
  user_id, 
  subscription_tier, 
  subscription_status,
  trial_scans_used, 
  trial_scans_limit,
  stripe_customer_id
)
VALUES (
  '580e3fe8-094d-477f-86cb-88e4273b589b',
  'individual',
  'active',
  0,
  10,
  'cus_test_individual' -- Test Stripe customer ID
)
ON CONFLICT (user_id) DO UPDATE SET
  subscription_tier = EXCLUDED.subscription_tier,
  subscription_status = EXCLUDED.subscription_status;

-- Add payment method for pay-per-scan user
INSERT INTO public.payment_methods (
  user_id,
  stripe_payment_method_id,
  last_four,
  brand,
  is_default
)
VALUES (
  '9ea0c2a9-8b33-409a-a45e-fe218d13d65e',
  'pm_test_payperscant',
  '4242',
  'visa',
  true
)
ON CONFLICT (user_id, stripe_payment_method_id) DO NOTHING;

-- Add payment method for Individual plan user
INSERT INTO public.payment_methods (
  user_id,
  stripe_payment_method_id,
  last_four,
  brand,
  is_default
)
VALUES (
  '580e3fe8-094d-477f-86cb-88e4273b589b',
  'pm_test_individual',
  '5555',
  'mastercard',
  true
)
ON CONFLICT (user_id, stripe_payment_method_id) DO NOTHING;

-- Verify the setup
SELECT 
  u.email,
  up.full_name,
  ub.subscription_tier,
  ub.subscription_status,
  ub.trial_scans_used,
  ub.trial_scans_limit,
  pm.last_four,
  pm.brand
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
LEFT JOIN public.user_billing ub ON u.id = ub.user_id
LEFT JOIN public.payment_methods pm ON u.id = pm.user_id
WHERE u.email IN ('slavataichi@gmail.com', 'rostislav.alpin@gmail.com');