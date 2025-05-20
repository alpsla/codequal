-- DeepWiki Analysis Schema

-- Repository Analysis Table
-- Stores the complete analysis of a repository
CREATE TABLE repository_analyses (
  id BIGSERIAL PRIMARY KEY,
  repository_owner TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  repository_url TEXT NOT NULL,
  repository_type TEXT NOT NULL,  -- 'github', 'gitlab', etc.
  branch TEXT NOT NULL,           -- Branch analyzed
  commit_hash TEXT NOT NULL,      -- Commit hash for the analysis point
  
  -- Analysis metadata
  provider TEXT NOT NULL,         -- AI provider used (google, openai, openrouter, etc.)
  model TEXT NOT NULL,            -- Model used for analysis
  analysis_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analysis_duration_ms INTEGER,   -- Time taken to perform analysis
  
  -- Content and size metrics
  content_format TEXT NOT NULL,   -- 'json', 'md', etc.
  content_size_bytes INTEGER NOT NULL,
  content JSONB NOT NULL,         -- Full analysis content 
  
  -- Repository metrics
  file_count INTEGER,             -- Number of files analyzed
  loc_count INTEGER,              -- Lines of code
  primary_language TEXT,          -- Primary language detected
  
  -- Validity and versioning
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  invalidated_at TIMESTAMPTZ,     -- When this analysis was marked invalid
  invalidated_reason TEXT,        -- Why it was invalidated
  version INTEGER NOT NULL DEFAULT 1,
  
  -- Indexing and constraints
  UNIQUE(repository_owner, repository_name, commit_hash, provider, model),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_repository_analyses_repo ON repository_analyses(repository_owner, repository_name);
CREATE INDEX idx_repository_analyses_url ON repository_analyses(repository_url);
CREATE INDEX idx_repository_analyses_timestamp ON repository_analyses(analysis_timestamp);

-- Pull Request Analysis Table
-- Stores analysis of specific pull requests
CREATE TABLE pr_analyses (
  id BIGSERIAL PRIMARY KEY,
  repository_owner TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  pr_title TEXT,
  pr_url TEXT NOT NULL,
  
  -- Analysis metadata
  provider TEXT NOT NULL,         -- AI provider used
  model TEXT NOT NULL,            -- Model used
  analysis_depth TEXT NOT NULL,   -- 'quick', 'comprehensive', 'targeted'
  analysis_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analysis_duration_ms INTEGER,   -- Time taken
  
  -- Analysis content
  content JSONB NOT NULL,         -- Full PR analysis content
  
  -- Related repository analysis (if applicable)
  repository_analysis_id BIGINT,
  FOREIGN KEY (repository_analysis_id) REFERENCES repository_analyses(id),
  
  -- Indexing and constraints
  UNIQUE(repository_owner, repository_name, pr_number, provider, model, analysis_depth),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_pr_analyses_repo ON pr_analyses(repository_owner, repository_name);
CREATE INDEX idx_pr_analyses_pr ON pr_analyses(repository_owner, repository_name, pr_number);
CREATE INDEX idx_pr_analyses_timestamp ON pr_analyses(analysis_timestamp);

-- Targeted Analysis Perspectives Table
-- Stores individual perspective analyses
CREATE TABLE perspective_analyses (
  id BIGSERIAL PRIMARY KEY,
  repository_owner TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  
  -- Target information (repository or PR)
  pr_number INTEGER,              -- NULL for repository-level perspective
  perspective_type TEXT NOT NULL, -- 'architecture', 'patterns', 'performance', etc.
  
  -- Analysis metadata
  provider TEXT NOT NULL,         -- AI provider used
  model TEXT NOT NULL,            -- Model used
  analysis_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analysis_duration_ms INTEGER,   -- Time taken
  
  -- Analysis content
  content JSONB NOT NULL,         -- Perspective analysis content
  
  -- Related analyses
  repository_analysis_id BIGINT,
  pr_analysis_id BIGINT,
  FOREIGN KEY (repository_analysis_id) REFERENCES repository_analyses(id),
  FOREIGN KEY (pr_analysis_id) REFERENCES pr_analyses(id),
  
  -- Indexing and constraints
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_perspective_analyses_repo ON perspective_analyses(repository_owner, repository_name);
CREATE INDEX idx_perspective_analyses_pr ON perspective_analyses(repository_owner, repository_name, pr_number);
CREATE INDEX idx_perspective_analyses_type ON perspective_analyses(perspective_type);
CREATE INDEX idx_perspective_analyses_timestamp ON perspective_analyses(analysis_timestamp);

-- Repository Analysis Cache Status Table
-- Tracks the status of repository analysis cache
CREATE TABLE repository_cache_status (
  id BIGSERIAL PRIMARY KEY,
  repository_owner TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  branch TEXT NOT NULL,
  
  -- Latest analysis information
  latest_analysis_id BIGINT NOT NULL,
  latest_commit_hash TEXT NOT NULL,
  latest_analysis_timestamp TIMESTAMPTZ NOT NULL,
  
  -- Cache validity
  is_cache_valid BOOLEAN NOT NULL DEFAULT TRUE,
  cache_expiry TIMESTAMPTZ,      -- When the cache should be considered stale
  
  -- Repository update information
  last_commit_check_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  commits_since_analysis INTEGER NOT NULL DEFAULT 0,
  significant_changes_detected BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Cache statistics
  cache_hit_count INTEGER NOT NULL DEFAULT 0,
  last_cache_hit TIMESTAMPTZ,
  
  FOREIGN KEY (latest_analysis_id) REFERENCES repository_analyses(id),
  UNIQUE(repository_owner, repository_name, branch),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_repository_cache_repo ON repository_cache_status(repository_owner, repository_name);
CREATE INDEX idx_repository_cache_valid ON repository_cache_status(is_cache_valid);
CREATE INDEX idx_repository_cache_expiry ON repository_cache_status(cache_expiry);

-- Model Performance Metrics Table
-- Tracks the performance of different models and providers
CREATE TABLE model_performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  
  -- Repository context
  repository_owner TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  primary_language TEXT NOT NULL,
  repository_size_bytes BIGINT NOT NULL,
  
  -- Analysis type
  analysis_type TEXT NOT NULL,    -- 'repository', 'pr', 'perspective'
  perspective_type TEXT,          -- If applicable
  
  -- Performance metrics
  duration_ms INTEGER NOT NULL,
  content_size_bytes INTEGER NOT NULL,
  error_occurred BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  
  -- Quality metrics (manually rated, updated later)
  accuracy_rating INTEGER,        -- 1-5 scale
  comprehensiveness_rating INTEGER, -- 1-5 scale
  structure_rating INTEGER,       -- 1-5 scale
  code_examples_rating INTEGER,   -- 1-5 scale
  overall_value_rating INTEGER,   -- 1-5 scale
  
  -- Response data for reference
  request_payload JSONB,
  response_sample JSONB,         -- Sample of the response (not the full content)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_model_metrics_provider_model ON model_performance_metrics(provider, model);
CREATE INDEX idx_model_metrics_language ON model_performance_metrics(primary_language);
CREATE INDEX idx_model_metrics_analysis_type ON model_performance_metrics(analysis_type);
CREATE INDEX idx_model_metrics_ratings ON model_performance_metrics(overall_value_rating);

-- Repository Size Category Thresholds
-- Configurable thresholds for repository size categorization
CREATE TABLE size_category_thresholds (
  id BIGSERIAL PRIMARY KEY,
  
  -- Size categories in bytes
  small_max_bytes BIGINT NOT NULL,   -- Maximum size for "small" category
  medium_max_bytes BIGINT NOT NULL,  -- Maximum size for "medium" category
  -- Anything larger is considered "large"
  
  -- Threshold settings
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default size category thresholds
INSERT INTO size_category_thresholds (small_max_bytes, medium_max_bytes, description)
VALUES (
  5 * 1024 * 1024,    -- 5MB max for small repos
  50 * 1024 * 1024,   -- 50MB max for medium repos
  'Default size thresholds based on initial testing'
);

-- Language-Specific Model Recommendations
-- Stores recommendations for the best model per language and size
CREATE TABLE language_model_recommendations (
  id BIGSERIAL PRIMARY KEY,
  
  language TEXT NOT NULL,          -- Programming language
  size_category TEXT NOT NULL,     -- 'small', 'medium', 'large'
  analysis_type TEXT NOT NULL,     -- 'repository', 'pr', 'perspective'
  perspective_type TEXT,           -- If applicable
  
  -- Recommended model configuration
  recommended_provider TEXT NOT NULL,
  recommended_model TEXT NOT NULL,
  
  -- Recommendation metadata
  confidence_score NUMERIC(3,2) NOT NULL, -- 0.00 to 1.00
  recommendation_basis TEXT NOT NULL,    -- 'testing', 'manual', 'derived'
  
  -- Performance expectations
  expected_duration_ms INTEGER,
  expected_quality_score NUMERIC(3,2),   -- 1.00 to 5.00
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  UNIQUE(language, size_category, analysis_type, COALESCE(perspective_type, '')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_model_recommendations_language ON language_model_recommendations(language);
CREATE INDEX idx_model_recommendations_category ON language_model_recommendations(language, size_category);
CREATE INDEX idx_model_recommendations_active ON language_model_recommendations(is_active);

-- Insert initial recommendations for common languages
-- These will be updated based on testing results
INSERT INTO language_model_recommendations 
(language, size_category, analysis_type, perspective_type, recommended_provider, recommended_model, confidence_score, recommendation_basis)
VALUES
-- Python
('python', 'small', 'repository', NULL, 'openai', 'gpt-4o', 0.80, 'initial'),
('python', 'medium', 'repository', NULL, 'openai', 'gpt-4o', 0.75, 'initial'),
('python', 'large', 'repository', NULL, 'openrouter', 'anthropic/claude-3.7-sonnet', 0.70, 'initial'),
-- JavaScript
('javascript', 'small', 'repository', NULL, 'openai', 'gpt-4o', 0.80, 'initial'),
('javascript', 'medium', 'repository', NULL, 'openai', 'gpt-4o', 0.75, 'initial'),
('javascript', 'large', 'repository', NULL, 'openrouter', 'anthropic/claude-3.7-sonnet', 0.70, 'initial'),
-- TypeScript
('typescript', 'small', 'repository', NULL, 'openai', 'gpt-4o', 0.80, 'initial'),
('typescript', 'medium', 'repository', NULL, 'openai', 'gpt-4o', 0.75, 'initial'),
('typescript', 'large', 'repository', NULL, 'openrouter', 'anthropic/claude-3.7-sonnet', 0.70, 'initial');

-- Function to get recommended model configuration
CREATE OR REPLACE FUNCTION get_recommended_model(
  p_language TEXT,
  p_size_category TEXT,
  p_analysis_type TEXT,
  p_perspective_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  provider TEXT,
  model TEXT,
  confidence_score NUMERIC(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    recommended_provider,
    recommended_model,
    confidence_score
  FROM language_model_recommendations
  WHERE
    language = LOWER(p_language) AND
    size_category = LOWER(p_size_category) AND
    analysis_type = LOWER(p_analysis_type) AND
    (perspective_type = p_perspective_type OR (perspective_type IS NULL AND p_perspective_type IS NULL)) AND
    is_active = TRUE
  ORDER BY confidence_score DESC
  LIMIT 1;
  
  -- If no match found, return default
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      'openai'::TEXT AS provider,
      'gpt-4o'::TEXT AS model,
      0.50::NUMERIC(3,2) AS confidence_score;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to invalidate repository cache when needed
CREATE OR REPLACE FUNCTION invalidate_repository_cache(
  p_repository_owner TEXT,
  p_repository_name TEXT,
  p_branch TEXT,
  p_reason TEXT
)
RETURNS VOID AS $$
DECLARE
  v_analysis_id BIGINT;
BEGIN
  -- Get the latest analysis ID
  SELECT latest_analysis_id INTO v_analysis_id
  FROM repository_cache_status
  WHERE
    repository_owner = p_repository_owner AND
    repository_name = p_repository_name AND
    branch = p_branch;
  
  -- Mark cache as invalid
  UPDATE repository_cache_status
  SET
    is_cache_valid = FALSE,
    updated_at = NOW()
  WHERE
    repository_owner = p_repository_owner AND
    repository_name = p_repository_name AND
    branch = p_branch;
  
  -- Mark the analysis as invalid
  IF v_analysis_id IS NOT NULL THEN
    UPDATE repository_analyses
    SET
      is_valid = FALSE,
      invalidated_at = NOW(),
      invalidated_reason = p_reason,
      updated_at = NOW()
    WHERE
      id = v_analysis_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
