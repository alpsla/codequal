-- Repository & Cross-Repo Learning System
-- Session 82: Persist learnings from PR fix sessions for reuse
--
-- Enables:
-- 1. Same repository - future PRs benefit from past insights
-- 2. Same organization - cross-repo within org
-- 3. Same language/framework - cross-repo knowledge sharing

-- ============================================================================
-- Main Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS repository_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Repository identification
  repository TEXT NOT NULL,           -- Full repo identifier (e.g., "github.com/spring-projects/spring-petclinic")
  organization TEXT NOT NULL,         -- Organization/owner (e.g., "spring-projects")

  -- Language & frameworks
  language TEXT NOT NULL,             -- Primary language (e.g., "java", "typescript")
  frameworks TEXT[] DEFAULT '{}',     -- Detected frameworks (e.g., ["spring-boot", "hibernate"])

  -- The learning itself
  insight TEXT NOT NULL,              -- The learned insight
  category TEXT NOT NULL CHECK (category IN ('codebase', 'pattern', 'tool', 'framework', 'style')),

  -- Confidence & validation
  confidence INTEGER NOT NULL DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
  validation_count INTEGER NOT NULL DEFAULT 0,  -- Times validated as correct
  usage_count INTEGER NOT NULL DEFAULT 0,       -- Times used in fix generation

  -- Applicability
  applicable_rules TEXT[] DEFAULT '{}',  -- Specific rule IDs this applies to
  cross_repo_shareable BOOLEAN NOT NULL DEFAULT false,  -- Can be shared across repos?

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate insights for same repo/category
  CONSTRAINT unique_repo_category_insight UNIQUE (repository, category, insight)
);

-- ============================================================================
-- Indexes for Common Queries
-- ============================================================================

-- Fast lookup by repository
CREATE INDEX IF NOT EXISTS idx_repo_learnings_repository
  ON repository_learnings(repository);

-- Fast lookup by organization (for cross-repo within org)
CREATE INDEX IF NOT EXISTS idx_repo_learnings_organization
  ON repository_learnings(organization)
  WHERE cross_repo_shareable = true;

-- Fast lookup by language (for cross-repo by language)
CREATE INDEX IF NOT EXISTS idx_repo_learnings_language
  ON repository_learnings(language)
  WHERE cross_repo_shareable = true;

-- Fast lookup by frameworks (GIN index for array overlap)
CREATE INDEX IF NOT EXISTS idx_repo_learnings_frameworks
  ON repository_learnings USING GIN(frameworks)
  WHERE cross_repo_shareable = true;

-- Fast lookup by applicable rules (GIN index for array overlap)
CREATE INDEX IF NOT EXISTS idx_repo_learnings_rules
  ON repository_learnings USING GIN(applicable_rules);

-- High-confidence cross-repo shareable learnings
CREATE INDEX IF NOT EXISTS idx_repo_learnings_shareable_confident
  ON repository_learnings(confidence DESC)
  WHERE cross_repo_shareable = true AND confidence >= 70;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Increment validation count and boost confidence
CREATE OR REPLACE FUNCTION increment_learning_validation(learning_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE repository_learnings
  SET
    validation_count = validation_count + 1,
    confidence = LEAST(100, confidence + 5),  -- Boost by 5, cap at 100
    last_used_at = NOW()
  WHERE id = learning_id;
END;
$$ LANGUAGE plpgsql;

-- Decrease confidence (when learning proved wrong)
CREATE OR REPLACE FUNCTION decrease_learning_confidence(learning_id UUID, amount INTEGER DEFAULT 10)
RETURNS void AS $$
BEGIN
  UPDATE repository_learnings
  SET
    confidence = GREATEST(0, confidence - amount),  -- Decrease, floor at 0
    last_used_at = NOW()
  WHERE id = learning_id;
END;
$$ LANGUAGE plpgsql;

-- Get relevant learnings for a repository context
CREATE OR REPLACE FUNCTION get_relevant_learnings(
  p_repository TEXT,
  p_organization TEXT,
  p_language TEXT,
  p_frameworks TEXT[] DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  repository TEXT,
  organization TEXT,
  language TEXT,
  frameworks TEXT[],
  insight TEXT,
  category TEXT,
  confidence INTEGER,
  validation_count INTEGER,
  applicable_rules TEXT[],
  source TEXT,
  effective_weight INTEGER
) AS $$
BEGIN
  RETURN QUERY

  -- Same repository (100% weight)
  SELECT
    rl.id, rl.repository, rl.organization, rl.language, rl.frameworks,
    rl.insight, rl.category, rl.confidence, rl.validation_count, rl.applicable_rules,
    'same-repo'::TEXT as source,
    100 as effective_weight
  FROM repository_learnings rl
  WHERE rl.repository = p_repository

  UNION ALL

  -- Same organization (80% weight, cross-repo shareable only)
  SELECT
    rl.id, rl.repository, rl.organization, rl.language, rl.frameworks,
    rl.insight, rl.category, rl.confidence, rl.validation_count, rl.applicable_rules,
    'same-org'::TEXT as source,
    80 as effective_weight
  FROM repository_learnings rl
  WHERE rl.organization = p_organization
    AND rl.repository != p_repository
    AND rl.cross_repo_shareable = true
    AND rl.confidence >= 70

  UNION ALL

  -- Same language (60% weight, cross-repo shareable only)
  SELECT
    rl.id, rl.repository, rl.organization, rl.language, rl.frameworks,
    rl.insight, rl.category, rl.confidence, rl.validation_count, rl.applicable_rules,
    'same-language'::TEXT as source,
    60 as effective_weight
  FROM repository_learnings rl
  WHERE rl.language = p_language
    AND rl.repository != p_repository
    AND rl.organization != p_organization
    AND rl.cross_repo_shareable = true
    AND rl.confidence >= 70

  UNION ALL

  -- Same frameworks (60% weight, cross-repo shareable only)
  SELECT
    rl.id, rl.repository, rl.organization, rl.language, rl.frameworks,
    rl.insight, rl.category, rl.confidence, rl.validation_count, rl.applicable_rules,
    'same-framework'::TEXT as source,
    60 as effective_weight
  FROM repository_learnings rl
  WHERE rl.frameworks && p_frameworks  -- Array overlap
    AND rl.repository != p_repository
    AND rl.cross_repo_shareable = true
    AND rl.confidence >= 70

  ORDER BY effective_weight DESC, confidence DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data (Seed with common framework learnings)
-- ============================================================================

INSERT INTO repository_learnings (
  repository, organization, language, frameworks, insight, category,
  confidence, cross_repo_shareable
) VALUES
  -- Spring Boot patterns (shareable)
  ('_seed', '_common', 'java', ARRAY['spring-boot'],
   'Spring Boot applications use @Autowired for dependency injection - prefer constructor injection',
   'framework', 90, true),

  ('_seed', '_common', 'java', ARRAY['spring-boot'],
   'Use @Transactional on service methods that modify database state',
   'framework', 90, true),

  -- Lombok patterns (shareable)
  ('_seed', '_common', 'java', ARRAY['lombok'],
   'Codebase uses Lombok @Data - do not add manual getters/setters',
   'framework', 95, true),

  ('_seed', '_common', 'java', ARRAY['lombok'],
   'Use @Cleanup from Lombok for automatic resource cleanup instead of try-finally',
   'framework', 85, true),

  -- Hibernate patterns (shareable)
  ('_seed', '_common', 'java', ARRAY['hibernate'],
   'Close EntityManager in finally block or use try-with-resources with JPA 2.1+',
   'framework', 90, true),

  -- React patterns (shareable)
  ('_seed', '_common', 'typescript', ARRAY['react'],
   'Use useCallback for event handlers passed to child components to prevent re-renders',
   'framework', 85, true),

  -- General Java patterns (shareable)
  ('_seed', '_common', 'java', ARRAY[]::TEXT[],
   'Prefer try-with-resources over explicit close() for AutoCloseable resources',
   'pattern', 95, true),

  ('_seed', '_common', 'java', ARRAY[]::TEXT[],
   'Catch specific exceptions (IOException, SQLException) not generic Exception or Throwable',
   'pattern', 95, true),

  -- General TypeScript patterns (shareable)
  ('_seed', '_common', 'typescript', ARRAY[]::TEXT[],
   'Use strict null checks - avoid ! assertions, prefer optional chaining (?.) and nullish coalescing (??)',
   'pattern', 90, true),

  ('_seed', '_common', 'typescript', ARRAY[]::TEXT[],
   'Prefer async/await over .then() chains for better readability and error handling',
   'pattern', 85, true)

ON CONFLICT (repository, category, insight) DO NOTHING;

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant access to authenticated users (if using RLS)
-- ALTER TABLE repository_learnings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Service role has full access" ON repository_learnings
--   FOR ALL USING (true);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE repository_learnings IS 'Stores learnings from PR fix sessions for cross-PR and cross-repo reuse';
COMMENT ON COLUMN repository_learnings.cross_repo_shareable IS 'Whether this learning can be shared with similar repositories';
COMMENT ON COLUMN repository_learnings.confidence IS 'Confidence score (0-100), increases with successful validations';
COMMENT ON FUNCTION get_relevant_learnings IS 'Fetches learnings with weighted relevance based on repository similarity';
