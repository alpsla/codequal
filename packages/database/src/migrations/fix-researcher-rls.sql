-- Fix RLS policies for researcher configuration repository
-- This migration allows the system user to store configurations without RLS conflicts

-- First, ensure the special researcher repository exists
INSERT INTO repositories (id, name, url, default_branch, analysis_date)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'CodeQual Researcher Configurations',
  'internal://researcher-configurations',
  'main',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET analysis_date = NOW();

-- Create a system user role for the researcher
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'system-researcher-001') THEN
    -- Insert a system user for researcher operations
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role
    ) VALUES (
      'system-researcher-001',
      'system@codequal.com',
      'not-used', -- System user doesn't use password auth
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "system", "providers": ["system"]}',
      '{"name": "CodeQual System", "isSystemUser": true}',
      false,
      'authenticated'
    );
  END IF;
END $$;

-- Drop existing problematic RLS policies on analysis_chunks
ALTER TABLE analysis_chunks DISABLE ROW LEVEL SECURITY;

-- Create new, simpler RLS policies
ALTER TABLE analysis_chunks ENABLE ROW LEVEL SECURITY;

-- Policy for reading chunks: allow authenticated users to read their own repositories
CREATE POLICY "Users can read chunks from their repositories"
ON analysis_chunks FOR SELECT
TO authenticated
USING (
  -- Allow reading if user has access to the repository
  repository_id IN (
    SELECT ur.repository_id 
    FROM user_repositories ur
    WHERE ur.user_id = auth.uid()
  )
  OR
  -- Allow reading researcher configuration repository (public)
  repository_id = '00000000-0000-0000-0000-000000000001'
);

-- Policy for inserting chunks: allow authenticated users to insert into their repositories
CREATE POLICY "Users can insert chunks into their repositories"
ON analysis_chunks FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow inserting if user has access to the repository
  repository_id IN (
    SELECT ur.repository_id 
    FROM user_repositories ur
    WHERE ur.user_id = auth.uid()
  )
  OR
  -- Allow system user to insert into researcher repository
  (
    auth.uid() = 'system-researcher-001' AND
    repository_id = '00000000-0000-0000-0000-000000000001'
  )
);

-- Policy for updating chunks: similar to insert
CREATE POLICY "Users can update chunks in their repositories"
ON analysis_chunks FOR UPDATE
TO authenticated
USING (
  repository_id IN (
    SELECT ur.repository_id 
    FROM user_repositories ur
    WHERE ur.user_id = auth.uid()
  )
  OR
  (
    auth.uid() = 'system-researcher-001' AND
    repository_id = '00000000-0000-0000-0000-000000000001'
  )
);

-- Policy for deleting chunks: similar to insert
CREATE POLICY "Users can delete chunks from their repositories"
ON analysis_chunks FOR DELETE
TO authenticated
USING (
  repository_id IN (
    SELECT ur.repository_id 
    FROM user_repositories ur
    WHERE ur.user_id = auth.uid()
  )
  OR
  (
    auth.uid() = 'system-researcher-001' AND
    repository_id = '00000000-0000-0000-0000-000000000001'
  )
);

-- Grant necessary permissions to the repositories table as well
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to researcher repository"
ON repositories FOR SELECT
TO authenticated
USING (
  id = '00000000-0000-0000-0000-000000000001'
  OR
  id IN (
    SELECT repository_id 
    FROM user_repositories 
    WHERE user_id = auth.uid()
  )
);

-- Ensure user_repositories table exists and has proper structure
CREATE TABLE IF NOT EXISTS user_repositories (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, repository_id)
);

-- Grant system user access to researcher repository
INSERT INTO user_repositories (user_id, repository_id, role)
VALUES ('system-researcher-001', '00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (user_id, repository_id) DO NOTHING;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_repositories_user_id ON user_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_repositories_repository_id ON user_repositories(repository_id);

-- Verify the policies don't have circular dependencies
-- This should complete without errors
SELECT 1 FROM analysis_chunks WHERE repository_id = '00000000-0000-0000-0000-000000000001' LIMIT 1;