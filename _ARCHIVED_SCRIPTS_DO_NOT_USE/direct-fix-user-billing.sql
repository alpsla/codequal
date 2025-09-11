-- First, check if the user exists in auth.users
SELECT id, email, created_at FROM auth.users 
WHERE id = '7dcd7c31-ccc1-4479-889a-ad52d69e5a56' 
   OR email = 'tester3@grr.la';

-- Check if user_billing exists for this user
SELECT * FROM user_billing 
WHERE user_id = '7dcd7c31-ccc1-4479-889a-ad52d69e5a56';

-- If the user exists but user_billing doesn't, create it
INSERT INTO user_billing (
    user_id,
    subscription_tier,
    created_at,
    updated_at
) 
SELECT 
    '7dcd7c31-ccc1-4479-889a-ad52d69e5a56',
    'free',
    NOW(),
    NOW()
WHERE EXISTS (
    SELECT 1 FROM auth.users WHERE id = '7dcd7c31-ccc1-4479-889a-ad52d69e5a56'
)
AND NOT EXISTS (
    SELECT 1 FROM user_billing WHERE user_id = '7dcd7c31-ccc1-4479-889a-ad52d69e5a56'
);

-- Verify the result
SELECT * FROM user_billing 
WHERE user_id = '7dcd7c31-ccc1-4479-889a-ad52d69e5a56';