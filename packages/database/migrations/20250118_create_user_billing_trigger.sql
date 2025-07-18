-- Create a trigger function to automatically create user_billing record when a user signs up
CREATE OR REPLACE FUNCTION create_user_billing_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a user_billing record for the new user
  INSERT INTO user_billing (
    user_id,
    subscription_tier,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'free',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users table
CREATE TRIGGER create_user_billing_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_user_billing_on_signup();

-- Also create user_billing records for existing users who don't have one
INSERT INTO user_billing (user_id, subscription_tier, created_at, updated_at)
SELECT 
  u.id,
  'free',
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN user_billing ub ON u.id = ub.user_id
WHERE ub.id IS NULL;