-- Script to manually fix existing Stripe subscription that wasn't synced to database

-- Step 1: Find your user by email
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL_HERE';

-- Step 2: Check current billing status
SELECT * FROM user_billing WHERE user_id = 'YOUR_USER_ID_FROM_STEP_1';

-- Step 3: Update user_billing with Stripe information
-- Replace the values below with actual data from your Stripe dashboard
UPDATE user_billing 
SET 
  stripe_customer_id = 'cus_XXXXXXXXXXXXX', -- Get from Stripe dashboard
  stripe_subscription_id = 'sub_XXXXXXXXXXXXX', -- Get from Stripe dashboard
  subscription_status = 'active',
  subscription_tier = 'individual', -- Use 'individual' for $29.99 plan or 'team' for team plan
  updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID_FROM_STEP_1';

-- Step 4: Verify the update
SELECT * FROM user_billing WHERE user_id = 'YOUR_USER_ID_FROM_STEP_1';

-- Optional: If you have payment method info from Stripe
-- INSERT INTO payment_methods (
--   user_id,
--   stripe_payment_method_id,
--   last_four,
--   brand,
--   is_default
-- ) VALUES (
--   'YOUR_USER_ID_FROM_STEP_1',
--   'pm_XXXXXXXXXXXXX', -- Payment method ID from Stripe
--   '4242', -- Last 4 digits of card
--   'visa', -- Card brand (visa, mastercard, etc)
--   true
-- );