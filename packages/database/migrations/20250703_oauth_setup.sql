-- OAuth Setup for GitHub and GitLab Authentication
-- Run this in your Supabase SQL Editor

-- 1. Create user_profiles table to store additional user information
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  
  -- OAuth provider information
  github_username TEXT,
  github_id TEXT,
  gitlab_username TEXT,
  gitlab_id TEXT,
  
  -- Organization info
  organization_id UUID REFERENCES organizations(id),
  
  -- Professional info
  bio TEXT,
  location TEXT,
  website TEXT,
  company TEXT,
  
  -- Settings
  preferred_language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'light',
  email_notifications BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_github_username ON user_profiles(github_username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_gitlab_username ON user_profiles(gitlab_username);

-- 2. Create organizations table for team support
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- GitHub/GitLab integration
  github_org_name TEXT,
  github_installation_id TEXT,
  gitlab_group_name TEXT,
  gitlab_group_id TEXT,
  
  -- Billing
  stripe_customer_id TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'team', 'enterprise')),
  
  -- Settings
  allowed_email_domains TEXT[], -- For automatic team member assignment
  max_members INTEGER DEFAULT 5,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for organizations
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_github_org ON organizations(github_org_name);
CREATE INDEX IF NOT EXISTS idx_organizations_gitlab_group ON organizations(gitlab_group_name);

-- 3. Create organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  
  -- Permissions
  can_manage_billing BOOLEAN DEFAULT false,
  can_manage_members BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,
  
  -- Metadata
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(organization_id, user_id)
);

-- Create indexes for organization_members
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);

-- 4. Create user_repositories table to track repository access
CREATE TABLE IF NOT EXISTS user_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repository_url TEXT NOT NULL,
  
  -- Provider info
  provider TEXT NOT NULL CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
  provider_repo_id TEXT,
  
  -- Access level
  access_level TEXT DEFAULT 'read' CHECK (access_level IN ('read', 'write', 'admin')),
  
  -- Repository metadata (cached)
  repo_name TEXT,
  repo_owner TEXT,
  is_private BOOLEAN DEFAULT false,
  default_branch TEXT DEFAULT 'main',
  
  -- Metadata
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id, repository_url)
);

-- Create indexes for user_repositories
CREATE INDEX IF NOT EXISTS idx_user_repos_user_id ON user_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_repos_provider ON user_repositories(provider);

-- 5. Create session_tokens table for enhanced session management
CREATE TABLE IF NOT EXISTS session_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  
  -- Session info
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  
  -- Token metadata
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Security
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for session_tokens
CREATE INDEX IF NOT EXISTS idx_session_tokens_user_id ON session_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_session_tokens_expires_at ON session_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_tokens_token_hash ON session_tokens(token_hash);

-- 6. Function to handle user creation from OAuth
CREATE OR REPLACE FUNCTION handle_new_oauth_user()
RETURNS TRIGGER AS $$
DECLARE
  github_username TEXT;
  gitlab_username TEXT;
  full_name TEXT;
  avatar_url TEXT;
BEGIN
  -- Extract provider data from raw_user_meta_data
  github_username := NEW.raw_user_meta_data->>'user_name';
  gitlab_username := NEW.raw_user_meta_data->>'nickname';
  full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  );
  avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  
  -- Create user profile
  INSERT INTO user_profiles (
    user_id,
    email,
    full_name,
    avatar_url,
    github_username,
    gitlab_username,
    created_at,
    last_login_at
  ) VALUES (
    NEW.id,
    NEW.email,
    full_name,
    avatar_url,
    CASE WHEN NEW.raw_app_meta_data->>'provider' = 'github' THEN github_username ELSE NULL END,
    CASE WHEN NEW.raw_app_meta_data->>'provider' = 'gitlab' THEN gitlab_username ELSE NULL END,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_login_at = NOW(),
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    github_username = COALESCE(user_profiles.github_username, EXCLUDED.github_username),
    gitlab_username = COALESCE(user_profiles.gitlab_username, EXCLUDED.gitlab_username);
  
  -- Check for organization assignment based on email domain
  IF NEW.email IS NOT NULL THEN
    INSERT INTO organization_members (organization_id, user_id, role)
    SELECT o.id, NEW.id, 'member'
    FROM organizations o
    WHERE NEW.email LIKE ANY(
      SELECT '%@' || domain FROM unnest(o.allowed_email_domains) AS domain
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for new OAuth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_oauth_user();

-- 8. Function to sync repository access from OAuth provider
CREATE OR REPLACE FUNCTION sync_user_repositories(
  p_user_id UUID,
  p_provider TEXT,
  p_repositories JSONB
) RETURNS void AS $$
DECLARE
  repo JSONB;
BEGIN
  -- Mark all existing repos from this provider as potentially stale
  UPDATE user_repositories 
  SET last_accessed_at = NULL 
  WHERE user_id = p_user_id AND provider = p_provider;
  
  -- Insert or update repositories
  FOR repo IN SELECT * FROM jsonb_array_elements(p_repositories)
  LOOP
    INSERT INTO user_repositories (
      user_id,
      repository_url,
      provider,
      provider_repo_id,
      repo_name,
      repo_owner,
      is_private,
      default_branch,
      access_level
    ) VALUES (
      p_user_id,
      repo->>'url',
      p_provider,
      repo->>'id',
      repo->>'name',
      repo->>'owner',
      (repo->>'private')::boolean,
      COALESCE(repo->>'default_branch', 'main'),
      repo->>'access_level'
    )
    ON CONFLICT (user_id, repository_url) DO UPDATE SET
      provider_repo_id = EXCLUDED.provider_repo_id,
      repo_name = EXCLUDED.repo_name,
      repo_owner = EXCLUDED.repo_owner,
      is_private = EXCLUDED.is_private,
      default_branch = EXCLUDED.default_branch,
      access_level = EXCLUDED.access_level,
      last_accessed_at = NOW();
  END LOOP;
  
  -- Remove repos that weren't in the sync (user lost access)
  DELETE FROM user_repositories 
  WHERE user_id = p_user_id 
    AND provider = p_provider 
    AND last_accessed_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;

-- User profiles: users can see and update their own
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Organizations: members can view, owners can manage
CREATE POLICY "Organization members can view" ON organizations
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members WHERE organization_id = id
    )
  );

CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (auth.uid() = owner_id);

-- Organization members: members can view, admins can manage
CREATE POLICY "Organization members can view members" ON organization_members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members om2 
      WHERE om2.organization_id = organization_members.organization_id
    )
  );

-- User repositories: users can only see their own
CREATE POLICY "Users can view own repositories" ON user_repositories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own repositories" ON user_repositories
  FOR ALL USING (auth.uid() = user_id);

-- Session tokens: users can only see their own
CREATE POLICY "Users can view own sessions" ON session_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON user_profiles(updated_at);
CREATE INDEX IF NOT EXISTS idx_organizations_updated_at ON organizations(updated_at);

-- 11. Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() RETURNS void AS $$
BEGIN
  DELETE FROM session_tokens 
  WHERE expires_at < NOW() OR is_revoked = true;
END;
$$ LANGUAGE plpgsql;