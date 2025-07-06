-- Vector Database Authentication & Access Control Integration
-- This migration adds user ownership and RLS policies to Vector DB tables

-- Step 1: Add user ownership columns to Vector DB tables
-- =====================================================

-- Add user_id to rag_repositories (repositories belong to users)
ALTER TABLE rag_repositories
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'organization', 'public'));

-- Create index for user queries
CREATE INDEX IF NOT EXISTS idx_rag_repositories_user_id ON rag_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_repositories_org_id ON rag_repositories(organization_id);
CREATE INDEX IF NOT EXISTS idx_rag_repositories_access ON rag_repositories(access_level);

-- Add user context to document embeddings (inherit from repository)
ALTER TABLE rag_document_embeddings
ADD COLUMN IF NOT EXISTS indexed_by_user_id UUID REFERENCES auth.users(id);

-- Add user ownership to analysis results
ALTER TABLE rag_analysis_results
ADD COLUMN IF NOT EXISTS analyzed_by_user_id UUID REFERENCES auth.users(id);

-- Add user ownership to query patterns for personalization
ALTER TABLE rag_query_patterns
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_rag_query_patterns_user_id ON rag_query_patterns(user_id);

-- Step 2: Create team/organization access tables
-- =============================================

-- Table for repository sharing with team members
CREATE TABLE IF NOT EXISTS rag_repository_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id INTEGER NOT NULL REFERENCES rag_repositories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('read', 'write', 'admin')),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Either user_id or organization_id must be set
  CONSTRAINT check_grantee CHECK (
    (user_id IS NOT NULL AND organization_id IS NULL) OR 
    (user_id IS NULL AND organization_id IS NOT NULL)
  ),
  
  -- Unique access per user/org per repository
  UNIQUE(repository_id, user_id),
  UNIQUE(repository_id, organization_id)
);

CREATE INDEX idx_rag_repository_access_user ON rag_repository_access(user_id);
CREATE INDEX idx_rag_repository_access_org ON rag_repository_access(organization_id);

-- Step 3: Create user skill embeddings table
-- ========================================

CREATE TABLE IF NOT EXISTS user_skill_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_category_id UUID NOT NULL REFERENCES skill_categories(id),
  
  -- Skill profile embedding (represents user's demonstrated skills)
  skill_embedding vector(1536),
  
  -- Metadata about the skill profile
  skill_level INTEGER NOT NULL CHECK (skill_level >= 1 AND skill_level <= 10),
  confidence_score FLOAT DEFAULT 0.5,
  evidence_count INTEGER DEFAULT 0,
  
  -- Learning path embeddings (what the user should learn next)
  learning_path_embedding vector(1536),
  
  -- Temporal data
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, skill_category_id)
);

CREATE INDEX idx_user_skill_embeddings_user ON user_skill_embeddings(user_id);
CREATE INDEX idx_user_skill_embeddings_cosine 
  ON user_skill_embeddings 
  USING ivfflat (skill_embedding vector_cosine_ops) 
  WITH (lists = 50);

-- Step 4: Enable Row Level Security
-- ================================

ALTER TABLE rag_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_educational_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_query_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_repository_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_embeddings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies
-- ==========================

-- RAG Repositories Policies
-- Users can see their own repositories
CREATE POLICY "Users can view own repositories" ON rag_repositories
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    is_public = true
    OR
    -- User has explicit access
    id IN (
      SELECT repository_id FROM rag_repository_access 
      WHERE user_id = auth.uid() AND (expires_at IS NULL OR expires_at > NOW())
    )
    OR
    -- User's organization has access
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create their own repositories
CREATE POLICY "Users can create own repositories" ON rag_repositories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own repositories
CREATE POLICY "Users can update own repositories" ON rag_repositories
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own repositories
CREATE POLICY "Users can delete own repositories" ON rag_repositories
  FOR DELETE
  USING (user_id = auth.uid());

-- Document Embeddings Policies
-- Users can view embeddings for repositories they have access to
CREATE POLICY "Users can view accessible embeddings" ON rag_document_embeddings
  FOR SELECT
  USING (
    repository_id IN (
      SELECT id FROM rag_repositories
      WHERE user_id = auth.uid() 
        OR is_public = true
        OR id IN (
          SELECT repository_id FROM rag_repository_access 
          WHERE user_id = auth.uid() AND (expires_at IS NULL OR expires_at > NOW())
        )
        OR organization_id IN (
          SELECT organization_id FROM organization_members 
          WHERE user_id = auth.uid()
        )
    )
  );

-- Users can create embeddings for their repositories
CREATE POLICY "Users can create embeddings for own repos" ON rag_document_embeddings
  FOR INSERT
  WITH CHECK (
    repository_id IN (
      SELECT id FROM rag_repositories WHERE user_id = auth.uid()
    )
  );

-- Analysis Results Policies
CREATE POLICY "Users can view analysis for accessible repos" ON rag_analysis_results
  FOR SELECT
  USING (
    repository_id IN (
      SELECT id FROM rag_repositories
      WHERE user_id = auth.uid() 
        OR is_public = true
        OR id IN (
          SELECT repository_id FROM rag_repository_access 
          WHERE user_id = auth.uid()
        )
        OR organization_id IN (
          SELECT organization_id FROM organization_members 
          WHERE user_id = auth.uid()
        )
    )
  );

-- Educational Content Policies (public read, admin write)
CREATE POLICY "Everyone can view educational content" ON rag_educational_content
  FOR SELECT
  USING (true);

-- Query Patterns Policies
CREATE POLICY "Users can view own query patterns" ON rag_query_patterns
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own query patterns" ON rag_query_patterns
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Repository Access Policies
CREATE POLICY "Users can view access for their repos" ON rag_repository_access
  FOR SELECT
  USING (
    repository_id IN (
      SELECT id FROM rag_repositories WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Repo owners can grant access" ON rag_repository_access
  FOR INSERT
  WITH CHECK (
    repository_id IN (
      SELECT id FROM rag_repositories WHERE user_id = auth.uid()
    )
    AND granted_by = auth.uid()
  );

-- User Skill Embeddings Policies
CREATE POLICY "Users can view own skill embeddings" ON user_skill_embeddings
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own skill embeddings" ON user_skill_embeddings
  FOR ALL
  USING (user_id = auth.uid());

-- Step 6: Create helper functions for access control
-- ===============================================

-- Function to check if user has access to a repository
CREATE OR REPLACE FUNCTION user_has_repository_access(
  p_user_id UUID,
  p_repository_id INTEGER,
  p_required_access TEXT DEFAULT 'read'
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM rag_repositories r
    WHERE r.id = p_repository_id
    AND (
      -- Owner
      r.user_id = p_user_id
      -- Public repository
      OR r.is_public = true
      -- Explicit user access
      OR EXISTS (
        SELECT 1 FROM rag_repository_access ra
        WHERE ra.repository_id = r.id
        AND ra.user_id = p_user_id
        AND (ra.expires_at IS NULL OR ra.expires_at > NOW())
        AND (
          p_required_access = 'read' 
          OR (p_required_access = 'write' AND ra.access_type IN ('write', 'admin'))
          OR (p_required_access = 'admin' AND ra.access_type = 'admin')
        )
      )
      -- Organization member
      OR (
        r.organization_id IS NOT NULL
        AND r.organization_id IN (
          SELECT organization_id FROM organization_members 
          WHERE user_id = p_user_id
        )
      )
    )
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced vector search function with user context
CREATE OR REPLACE FUNCTION rag_search_user_documents(
  p_user_id UUID,
  query_embedding vector(1536),
  repository_filter INTEGER DEFAULT NULL,
  content_type_filter VARCHAR(50) DEFAULT NULL,
  language_filter VARCHAR(50) DEFAULT NULL,
  min_importance FLOAT DEFAULT 0.0,
  include_organization BOOLEAN DEFAULT true,
  include_public BOOLEAN DEFAULT true,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id BIGINT,
  repository_id INTEGER,
  repository_name VARCHAR(255),
  file_path VARCHAR(1000),
  content_chunk TEXT,
  content_type VARCHAR(50),
  content_language VARCHAR(50),
  importance_score FLOAT,
  metadata JSONB,
  similarity FLOAT,
  access_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Record the query for learning
  INSERT INTO rag_query_patterns (
    user_id,
    query_text,
    query_type,
    query_embedding,
    repository_id,
    user_context
  ) VALUES (
    p_user_id,
    'Vector search',
    'code_search',
    query_embedding,
    repository_filter,
    jsonb_build_object(
      'content_type', content_type_filter,
      'language', language_filter,
      'min_importance', min_importance
    )
  );

  RETURN QUERY
  SELECT
    rde.id,
    rde.repository_id,
    rr.repository_name,
    rde.file_path,
    rde.content_chunk,
    rde.content_type,
    rde.content_language,
    rde.importance_score,
    rde.metadata,
    1 - (rde.embedding <=> query_embedding) as similarity,
    CASE 
      WHEN rr.user_id = p_user_id THEN 'owner'
      WHEN rr.is_public THEN 'public'
      WHEN rr.organization_id IS NOT NULL THEN 'organization'
      ELSE 'shared'
    END as access_type
  FROM rag_document_embeddings rde
  INNER JOIN rag_repositories rr ON rde.repository_id = rr.id
  WHERE
    -- User has access to the repository
    user_has_repository_access(p_user_id, rde.repository_id, 'read')
    -- Apply filters
    AND (repository_filter IS NULL OR rde.repository_id = repository_filter)
    AND (content_type_filter IS NULL OR rde.content_type = content_type_filter)
    AND (language_filter IS NULL OR rde.content_language = language_filter)
    AND rde.importance_score >= min_importance
    AND (rde.expires_at IS NULL OR rde.expires_at > NOW())
    -- Include/exclude based on access type
    AND (
      rr.user_id = p_user_id
      OR (include_organization AND rr.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = p_user_id
      ))
      OR (include_public AND rr.is_public = true)
      OR EXISTS (
        SELECT 1 FROM rag_repository_access 
        WHERE repository_id = rr.id AND user_id = p_user_id
      )
    )
    -- Vector similarity threshold
    AND 1 - (rde.embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC,
    rde.importance_score DESC
  LIMIT match_count;
END;
$$;

-- Function to search for similar users based on skills
CREATE OR REPLACE FUNCTION find_similar_skilled_users(
  p_user_id UUID,
  p_skill_category TEXT DEFAULT NULL,
  p_min_similarity FLOAT DEFAULT 0.7,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  skill_similarity FLOAT,
  common_skills JSONB,
  complementary_skills JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_embedding vector(1536);
BEGIN
  -- Get the user's skill embedding
  SELECT skill_embedding INTO v_user_embedding
  FROM user_skill_embeddings use
  JOIN skill_categories sc ON use.skill_category_id = sc.id
  WHERE use.user_id = p_user_id
  AND (p_skill_category IS NULL OR sc.name = p_skill_category)
  LIMIT 1;
  
  IF v_user_embedding IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT
    use2.user_id,
    u.email,
    1 - (use2.skill_embedding <=> v_user_embedding) as skill_similarity,
    -- Common strong skills
    (
      SELECT jsonb_agg(sc.name)
      FROM user_skill_embeddings use3
      JOIN skill_categories sc ON use3.skill_category_id = sc.id
      WHERE use3.user_id = use2.user_id
      AND use3.skill_level >= 7
      AND sc.id IN (
        SELECT skill_category_id FROM user_skill_embeddings
        WHERE user_id = p_user_id AND skill_level >= 7
      )
    ) as common_skills,
    -- Complementary skills (they're strong where user is weak)
    (
      SELECT jsonb_agg(sc.name)
      FROM user_skill_embeddings use4
      JOIN skill_categories sc ON use4.skill_category_id = sc.id
      WHERE use4.user_id = use2.user_id
      AND use4.skill_level >= 7
      AND sc.id IN (
        SELECT skill_category_id FROM user_skill_embeddings
        WHERE user_id = p_user_id AND skill_level < 5
      )
    ) as complementary_skills
  FROM user_skill_embeddings use2
  JOIN auth.users u ON use2.user_id = u.id
  WHERE use2.user_id != p_user_id
  AND 1 - (use2.skill_embedding <=> v_user_embedding) > p_min_similarity
  ORDER BY skill_similarity DESC
  LIMIT p_limit;
END;
$$;

-- Function to get personalized educational content
CREATE OR REPLACE FUNCTION get_personalized_educational_content(
  p_user_id UUID,
  p_skill_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  content_id BIGINT,
  title VARCHAR(500),
  content TEXT,
  content_type VARCHAR(50),
  programming_language VARCHAR(50),
  difficulty_level VARCHAR(20),
  relevance_score FLOAT,
  skill_gap_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_skills RECORD;
BEGIN
  -- Get user's current skill levels
  SELECT 
    AVG(skill_level) as avg_level,
    MIN(skill_level) as min_level,
    MAX(skill_level) as max_level
  INTO v_user_skills
  FROM developer_skills ds
  JOIN skill_categories sc ON ds.category_id = sc.id
  WHERE ds.user_id = p_user_id
  AND (p_skill_category IS NULL OR sc.name = p_skill_category);
  
  RETURN QUERY
  SELECT
    rec.id,
    rec.title,
    rec.content,
    rec.content_type,
    rec.programming_language,
    rec.difficulty_level,
    rec.quality_score as relevance_score,
    -- Calculate skill gap score (how much this content could help)
    CASE 
      WHEN rec.difficulty_level = 'beginner' AND v_user_skills.min_level < 4 THEN 0.9
      WHEN rec.difficulty_level = 'intermediate' AND v_user_skills.avg_level BETWEEN 3 AND 7 THEN 0.8
      WHEN rec.difficulty_level = 'advanced' AND v_user_skills.max_level > 6 THEN 0.7
      ELSE 0.5
    END as skill_gap_score
  FROM rag_educational_content rec
  WHERE
    -- Filter by user's recent query patterns
    rec.programming_language IN (
      SELECT DISTINCT content_language
      FROM rag_document_embeddings rde
      JOIN rag_repositories rr ON rde.repository_id = rr.id
      WHERE rr.user_id = p_user_id
      LIMIT 5
    )
    -- Match difficulty to user's skill level
    AND (
      (rec.difficulty_level = 'beginner' AND v_user_skills.min_level < 4)
      OR (rec.difficulty_level = 'intermediate' AND v_user_skills.avg_level BETWEEN 3 AND 7)
      OR (rec.difficulty_level = 'advanced' AND v_user_skills.max_level > 6)
    )
  ORDER BY
    skill_gap_score DESC,
    rec.quality_score DESC
  LIMIT p_limit;
END;
$$;

-- Step 7: Create audit log for Vector DB access
-- ===========================================

CREATE TABLE IF NOT EXISTS vector_db_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('search', 'embed', 'analyze', 'share')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('repository', 'document', 'analysis', 'skill')),
  resource_id TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vector_db_access_log_user ON vector_db_access_log(user_id);
CREATE INDEX idx_vector_db_access_log_created ON vector_db_access_log(created_at);

-- Enable RLS on audit log
ALTER TABLE vector_db_access_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own access logs
CREATE POLICY "Users can view own access logs" ON vector_db_access_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Step 8: Migration helper to update existing data
-- ==============================================

-- Function to migrate existing repositories to user ownership
CREATE OR REPLACE FUNCTION migrate_repositories_to_user_ownership()
RETURNS void AS $$
BEGIN
  -- Update repositories based on pull_requests table
  UPDATE rag_repositories rr
  SET user_id = pr.created_by
  FROM (
    SELECT DISTINCT repository_id, created_by
    FROM pull_requests
    WHERE created_by IS NOT NULL
  ) pr
  WHERE rr.id = pr.repository_id
  AND rr.user_id IS NULL;
  
  -- Set remaining repositories to a default admin user or mark as public
  UPDATE rag_repositories
  SET is_public = true, access_level = 'public'
  WHERE user_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Run the migration (comment out after first run)
-- SELECT migrate_repositories_to_user_ownership();

-- Add comments for documentation
COMMENT ON TABLE rag_repository_access IS 'Manages sharing of vector DB repositories between users and organizations';
COMMENT ON TABLE user_skill_embeddings IS 'Stores vector embeddings of user skills for similarity matching and recommendations';
COMMENT ON TABLE vector_db_access_log IS 'Audit log for Vector DB access and operations';
COMMENT ON FUNCTION user_has_repository_access IS 'Checks if a user has access to a specific repository in the Vector DB';
COMMENT ON FUNCTION rag_search_user_documents IS 'Performs vector similarity search with user access control';
COMMENT ON FUNCTION find_similar_skilled_users IS 'Finds users with similar skill profiles for team building';
COMMENT ON FUNCTION get_personalized_educational_content IS 'Returns educational content personalized to user skill gaps';