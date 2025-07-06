-- Add auth method tracking to user_profiles
-- This helps track how users signed up and their preferred auth method

-- Add auth_method column to track how user authenticated
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'email' 
  CHECK (auth_method IN ('email', 'github', 'gitlab', 'google', 'microsoft'));

-- Add column to track if email is verified (for email auth users)
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Add column to track primary auth method (if user has multiple)
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS primary_auth_method TEXT;

-- Create index for auth method analytics
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_method ON user_profiles(auth_method);

-- Update existing users based on provider_accounts
UPDATE user_profiles up
SET auth_method = COALESCE(
  (SELECT provider FROM provider_accounts WHERE user_id = up.user_id LIMIT 1),
  'email'
)
WHERE auth_method IS NULL;

-- Function to update auth method when user signs in
CREATE OR REPLACE FUNCTION update_auth_method()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an OAuth login
  IF NEW.raw_app_meta_data->>'provider' IS NOT NULL THEN
    UPDATE user_profiles
    SET 
      auth_method = NEW.raw_app_meta_data->>'provider',
      last_login_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.id;
  ELSE
    -- Email/password login
    UPDATE user_profiles
    SET 
      auth_method = 'email',
      email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
      last_login_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update auth method on login
DROP TRIGGER IF EXISTS update_auth_method_on_login ON auth.users;
CREATE TRIGGER update_auth_method_on_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW 
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION update_auth_method();

-- View to get auth statistics
CREATE OR REPLACE VIEW auth_statistics AS
SELECT 
  auth_method,
  COUNT(*) as user_count,
  COUNT(CASE WHEN last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 1 END) as active_30d,
  COUNT(CASE WHEN last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as active_7d
FROM user_profiles
GROUP BY auth_method;

-- View to get users with multiple auth methods
CREATE OR REPLACE VIEW users_multiple_auth_methods AS
SELECT 
  up.user_id,
  up.email,
  up.auth_method as last_used_method,
  ARRAY_AGG(DISTINCT pa.provider) as oauth_providers,
  up.email_verified
FROM user_profiles up
LEFT JOIN provider_accounts pa ON pa.user_id = up.user_id
GROUP BY up.user_id, up.email, up.auth_method, up.email_verified
HAVING COUNT(DISTINCT pa.provider) > 0 OR up.email_verified = true;