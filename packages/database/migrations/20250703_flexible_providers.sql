-- Make provider_accounts more flexible for future OAuth providers
-- This allows adding new providers without schema changes

-- First, drop the existing constraint
ALTER TABLE provider_accounts 
  DROP CONSTRAINT IF EXISTS provider_accounts_provider_check;

-- Add a more flexible constraint that includes common OAuth providers
ALTER TABLE provider_accounts 
  ADD CONSTRAINT provider_accounts_provider_check 
  CHECK (provider IN (
    'github', 
    'gitlab', 
    'bitbucket',
    'google',
    'microsoft',
    'atlassian',
    'slack',
    'discord'
  ));

-- Or alternatively, create a provider_types table for even more flexibility
CREATE TABLE IF NOT EXISTS provider_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  icon_url TEXT,
  oauth_scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert known providers
INSERT INTO provider_types (name, display_name, oauth_scopes) VALUES
  ('github', 'GitHub', ARRAY['read:user', 'user:email']),
  ('gitlab', 'GitLab', ARRAY['read_user', 'api']),
  ('bitbucket', 'Bitbucket', ARRAY['account', 'email']),
  ('google', 'Google', ARRAY['openid', 'email', 'profile']),
  ('microsoft', 'Microsoft', ARRAY['openid', 'email', 'profile'])
ON CONFLICT (name) DO NOTHING;

-- Function to check if a provider is valid
CREATE OR REPLACE FUNCTION is_valid_provider(provider_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM provider_types 
    WHERE name = provider_name AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Now we can use a more dynamic approach (optional - choose one approach)
-- Option 1: Keep the CHECK constraint with fixed list (simpler)
-- Option 2: Use a trigger to validate against provider_types table (more flexible)

-- Option 2 implementation:
CREATE OR REPLACE FUNCTION validate_provider()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_valid_provider(NEW.provider) THEN
    RAISE EXCEPTION 'Invalid provider: %', NEW.provider;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Uncomment to use dynamic validation instead of CHECK constraint
-- ALTER TABLE provider_accounts DROP CONSTRAINT IF EXISTS provider_accounts_provider_check;
-- CREATE TRIGGER validate_provider_trigger
--   BEFORE INSERT OR UPDATE ON provider_accounts
--   FOR EACH ROW EXECUTE FUNCTION validate_provider();