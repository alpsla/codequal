-- Tool Database Schema for CodeQual Fix System
-- Migration: 20241130_create_tool_database
-- Updated: 20241201 - Added tool_versions and tool_research_metadata tables
--
-- This schema stores comprehensive tool definitions and fixer mappings
-- for the Three-Tier Fix System, plus tool version tracking for quarterly research.
--
-- Tables:
-- 1. tools - All analysis and fixer tools (45+ tools)
-- 2. rules - Rule definitions for each tool
-- 3. fixer_mappings - Maps analyzer rules to appropriate fixers
-- 4. tool_languages - Many-to-many: tools <-> languages
-- 5. tool_categories - Many-to-many: tools <-> categories
-- 6. tool_versions - Latest version info from package registries (npm, PyPI, Maven, GitHub)
-- 7. tool_research_metadata - Tracks quarterly tool version research runs

-- =============================================================================
-- ENUMS (using DO block for idempotent creation)
-- =============================================================================

-- Tool type: analyzer, fixer, or hybrid (can do both)
DO $$ BEGIN
  CREATE TYPE tool_type AS ENUM ('analyzer', 'fixer', 'hybrid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tool category
DO $$ BEGIN
  CREATE TYPE tool_category AS ENUM (
    'security',
    'quality',
    'style',
    'performance',
    'dependency',
    'architecture',
    'secrets',
    'type-safety',
    'compatibility'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Issue type classification
DO $$ BEGIN
  CREATE TYPE issue_type AS ENUM (
    'security',
    'quality',
    'style',
    'performance',
    'maintainability',
    'compatibility',
    'dependency',
    'unknown'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Fix tier (1=native, 2=dedicated fixer, 3=AI)
DO $$ BEGIN
  CREATE TYPE fix_tier AS ENUM ('1', '2', '3');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Output format
DO $$ BEGIN
  CREATE TYPE output_format AS ENUM ('json', 'sarif', 'xml', 'text', 'custom');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Programming language
DO $$ BEGIN
  CREATE TYPE programming_language AS ENUM (
    'java',
    'python',
    'javascript',
    'typescript',
    'rust',
    'go',
    'csharp',
    'cpp',
    'c',
    'ruby',
    'php',
    'swift',
    'kotlin'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Main tools table
CREATE TABLE IF NOT EXISTS tools (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type tool_type NOT NULL,
  command TEXT NOT NULL,
  output_format output_format NOT NULL DEFAULT 'json',
  has_native_fix BOOLEAN NOT NULL DEFAULT false,
  native_fix_command TEXT,
  version VARCHAR(20),
  documentation_url TEXT,
  rule_doc_url_pattern TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_installed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool categories (many-to-many)
CREATE TABLE IF NOT EXISTS tool_categories (
  tool_id VARCHAR(50) REFERENCES tools(id) ON DELETE CASCADE,
  category tool_category NOT NULL,
  PRIMARY KEY (tool_id, category)
);

-- Tool languages (many-to-many)
CREATE TABLE IF NOT EXISTS tool_languages (
  tool_id VARCHAR(50) REFERENCES tools(id) ON DELETE CASCADE,
  language programming_language NOT NULL,
  PRIMARY KEY (tool_id, language)
);

-- Rules table
CREATE TABLE IF NOT EXISTS rules (
  id SERIAL PRIMARY KEY,
  tool_id VARCHAR(50) REFERENCES tools(id) ON DELETE CASCADE,
  rule_id VARCHAR(200) NOT NULL,
  short_id VARCHAR(100),
  issue_type issue_type NOT NULL DEFAULT 'unknown',
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  fixable BOOLEAN NOT NULL DEFAULT false,
  fix_tier fix_tier,
  fixer_tool_id VARCHAR(50) REFERENCES tools(id),
  description TEXT,
  documentation_url TEXT,
  requires_type_info BOOLEAN DEFAULT false,
  extends_base_rule VARCHAR(200),
  deprecated BOOLEAN DEFAULT false,
  replaced_by VARCHAR(200),
  fix_success_rate NUMERIC(5,2),
  avg_fix_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tool_id, rule_id)
);

-- Fixer mappings table
CREATE TABLE IF NOT EXISTS fixer_mappings (
  id SERIAL PRIMARY KEY,
  analyzer_tool_id VARCHAR(50) REFERENCES tools(id) ON DELETE CASCADE,
  rule_pattern TEXT NOT NULL,
  fixer_tool_id VARCHAR(50) REFERENCES tools(id) ON DELETE CASCADE,
  fix_tier fix_tier NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool versions table (populated by ToolResearcherService)
-- Stores latest version information fetched from package registries
CREATE TABLE IF NOT EXISTS tool_versions (
  tool_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  registry VARCHAR(20) NOT NULL CHECK (registry IN ('npm', 'pypi', 'maven', 'github')),
  package_name VARCHAR(200) NOT NULL,
  current_version VARCHAR(50) NOT NULL,
  latest_version VARCHAR(50) NOT NULL,
  release_date TIMESTAMP WITH TIME ZONE,
  changelog_url TEXT,
  needs_update BOOLEAN NOT NULL DEFAULT false,
  research_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  next_research_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool research metadata (singleton for tracking research runs)
CREATE TABLE IF NOT EXISTS tool_research_metadata (
  id VARCHAR(20) PRIMARY KEY DEFAULT 'singleton',
  last_research_date TIMESTAMP WITH TIME ZONE NOT NULL,
  next_scheduled_research TIMESTAMP WITH TIME ZONE NOT NULL,
  total_tools_researched INTEGER NOT NULL DEFAULT 0,
  research_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES (idempotent - will skip if exists)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_tools_type ON tools(type);
CREATE INDEX IF NOT EXISTS idx_tools_enabled ON tools(is_enabled);
CREATE INDEX IF NOT EXISTS idx_tool_categories_category ON tool_categories(category);
CREATE INDEX IF NOT EXISTS idx_tool_languages_language ON tool_languages(language);
CREATE INDEX IF NOT EXISTS idx_rules_tool_id ON rules(tool_id);
CREATE INDEX IF NOT EXISTS idx_rules_issue_type ON rules(issue_type);
CREATE INDEX IF NOT EXISTS idx_rules_fixable ON rules(fixable);
CREATE INDEX IF NOT EXISTS idx_fixer_mappings_analyzer ON fixer_mappings(analyzer_tool_id);
CREATE INDEX IF NOT EXISTS idx_fixer_mappings_fixer ON fixer_mappings(fixer_tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_versions_registry ON tool_versions(registry);
CREATE INDEX IF NOT EXISTS idx_tool_versions_needs_update ON tool_versions(needs_update);
CREATE INDEX IF NOT EXISTS idx_tool_versions_research_date ON tool_versions(research_date);

-- =============================================================================
-- TRIGGER FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate triggers (idempotent)
DROP TRIGGER IF EXISTS update_tools_updated_at ON tools;
CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rules_updated_at ON rules;
CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fixer_mappings_updated_at ON fixer_mappings;
CREATE TRIGGER update_fixer_mappings_updated_at
  BEFORE UPDATE ON fixer_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tool_versions_updated_at ON tool_versions;
CREATE TRIGGER update_tool_versions_updated_at
  BEFORE UPDATE ON tool_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tool_research_metadata_updated_at ON tool_research_metadata;
CREATE TRIGGER update_tool_research_metadata_updated_at
  BEFORE UPDATE ON tool_research_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View: Tools with their languages and categories
CREATE OR REPLACE VIEW v_tools_full AS
SELECT
  t.id,
  t.name,
  t.type,
  t.command,
  t.output_format,
  t.has_native_fix,
  t.native_fix_command,
  t.documentation_url,
  t.is_enabled,
  ARRAY_AGG(DISTINCT tl.language) AS languages,
  ARRAY_AGG(DISTINCT tc.category) AS categories
FROM tools t
LEFT JOIN tool_languages tl ON t.id = tl.tool_id
LEFT JOIN tool_categories tc ON t.id = tc.tool_id
GROUP BY t.id;

-- View: Tools by language
CREATE OR REPLACE VIEW v_tools_by_language AS
SELECT
  tl.language,
  ARRAY_AGG(t.id) AS tool_ids,
  COUNT(*) AS tool_count
FROM tools t
JOIN tool_languages tl ON t.id = tl.tool_id
WHERE t.is_enabled = true
GROUP BY tl.language;

-- View: Fixer recommendations
CREATE OR REPLACE VIEW v_fixer_recommendations AS
SELECT
  fm.analyzer_tool_id,
  at.name AS analyzer_name,
  fm.rule_pattern,
  fm.fixer_tool_id,
  ft.name AS fixer_name,
  fm.fix_tier,
  fm.confidence,
  ft.native_fix_command,
  fm.notes
FROM fixer_mappings fm
JOIN tools at ON fm.analyzer_tool_id = at.id
JOIN tools ft ON fm.fixer_tool_id = ft.id
ORDER BY fm.confidence DESC;

-- View: Tools needing version updates
CREATE OR REPLACE VIEW v_tool_versions_needing_update AS
SELECT
  tv.tool_id,
  tv.name,
  tv.registry,
  tv.package_name,
  tv.current_version,
  tv.latest_version,
  tv.release_date,
  tv.changelog_url,
  tv.research_date,
  tv.next_research_date
FROM tool_versions tv
WHERE tv.needs_update = true
ORDER BY tv.research_date DESC;

-- View: Tool research status
CREATE OR REPLACE VIEW v_tool_research_status AS
SELECT
  trm.last_research_date,
  trm.next_scheduled_research,
  trm.total_tools_researched,
  trm.research_version,
  (SELECT COUNT(*) FROM tool_versions WHERE needs_update = true) AS tools_needing_update,
  (SELECT COUNT(*) FROM tool_versions) AS total_tracked_tools,
  (trm.next_scheduled_research > NOW()) AS research_is_current
FROM tool_research_metadata trm
WHERE trm.id = 'singleton';

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function: Get tools for a language
CREATE OR REPLACE FUNCTION get_tools_for_language(lang programming_language)
RETURNS SETOF tools AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM tools t
  JOIN tool_languages tl ON t.id = tl.tool_id
  WHERE tl.language = lang AND t.is_enabled = true;
END;
$$ LANGUAGE plpgsql;

-- Function: Get fixer for an issue
CREATE OR REPLACE FUNCTION get_fixer_for_issue(
  p_analyzer_tool_id VARCHAR(50),
  p_rule_id VARCHAR(200)
)
RETURNS TABLE (
  fixer_tool_id VARCHAR(50),
  fixer_name VARCHAR(100),
  fix_tier fix_tier,
  confidence INTEGER,
  native_fix_command TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fm.fixer_tool_id,
    t.name,
    fm.fix_tier,
    fm.confidence,
    t.native_fix_command
  FROM fixer_mappings fm
  JOIN tools t ON fm.fixer_tool_id = t.id
  WHERE fm.analyzer_tool_id = p_analyzer_tool_id
    AND p_rule_id ~ fm.rule_pattern
  ORDER BY fm.confidence DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get tool statistics
CREATE OR REPLACE FUNCTION get_tool_statistics()
RETURNS TABLE (
  total_tools BIGINT,
  analyzers BIGINT,
  fixers BIGINT,
  hybrid_tools BIGINT,
  tools_with_native_fix BIGINT,
  languages_covered BIGINT,
  categories_covered BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_tools,
    COUNT(*) FILTER (WHERE type = 'analyzer') AS analyzers,
    COUNT(*) FILTER (WHERE type = 'fixer') AS fixers,
    COUNT(*) FILTER (WHERE type = 'hybrid') AS hybrid_tools,
    COUNT(*) FILTER (WHERE has_native_fix = true) AS tools_with_native_fix,
    (SELECT COUNT(DISTINCT language) FROM tool_languages) AS languages_covered,
    (SELECT COUNT(DISTINCT category) FROM tool_categories) AS categories_covered
  FROM tools
  WHERE is_enabled = true;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DATA HELPER
-- =============================================================================

-- Function to easily insert a tool with its languages and categories
CREATE OR REPLACE FUNCTION insert_tool_full(
  p_id VARCHAR(50),
  p_name VARCHAR(100),
  p_type tool_type,
  p_command TEXT,
  p_output_format output_format,
  p_has_native_fix BOOLEAN,
  p_native_fix_command TEXT,
  p_documentation_url TEXT,
  p_languages programming_language[],
  p_categories tool_category[]
)
RETURNS VOID AS $$
BEGIN
  -- Insert tool
  INSERT INTO tools (id, name, type, command, output_format, has_native_fix, native_fix_command, documentation_url)
  VALUES (p_id, p_name, p_type, p_command, p_output_format, p_has_native_fix, p_native_fix_command, p_documentation_url)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    command = EXCLUDED.command,
    output_format = EXCLUDED.output_format,
    has_native_fix = EXCLUDED.has_native_fix,
    native_fix_command = EXCLUDED.native_fix_command,
    documentation_url = EXCLUDED.documentation_url,
    updated_at = NOW();

  -- Insert languages
  DELETE FROM tool_languages WHERE tool_id = p_id;
  INSERT INTO tool_languages (tool_id, language)
  SELECT p_id, unnest(p_languages);

  -- Insert categories
  DELETE FROM tool_categories WHERE tool_id = p_id;
  INSERT INTO tool_categories (tool_id, category)
  SELECT p_id, unnest(p_categories);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- RLS POLICIES (Row Level Security) - Idempotent with DROP IF EXISTS
-- =============================================================================

-- Enable RLS on tables (idempotent)
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixer_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_research_metadata ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first, then recreate
DROP POLICY IF EXISTS "Read access for authenticated users" ON tools;
DROP POLICY IF EXISTS "Read access for authenticated users" ON rules;
DROP POLICY IF EXISTS "Read access for authenticated users" ON fixer_mappings;
DROP POLICY IF EXISTS "Read access for authenticated users" ON tool_categories;
DROP POLICY IF EXISTS "Read access for authenticated users" ON tool_languages;
DROP POLICY IF EXISTS "Read access for authenticated users" ON tool_versions;
DROP POLICY IF EXISTS "Read access for authenticated users" ON tool_research_metadata;

DROP POLICY IF EXISTS "Service role full access" ON tools;
DROP POLICY IF EXISTS "Service role full access" ON rules;
DROP POLICY IF EXISTS "Service role full access" ON fixer_mappings;
DROP POLICY IF EXISTS "Service role full access" ON tool_categories;
DROP POLICY IF EXISTS "Service role full access" ON tool_languages;
DROP POLICY IF EXISTS "Service role full access" ON tool_versions;
DROP POLICY IF EXISTS "Service role full access" ON tool_research_metadata;

-- Allow read access to all authenticated users
CREATE POLICY "Read access for authenticated users" ON tools
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Read access for authenticated users" ON rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Read access for authenticated users" ON fixer_mappings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Read access for authenticated users" ON tool_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Read access for authenticated users" ON tool_languages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Read access for authenticated users" ON tool_versions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Read access for authenticated users" ON tool_research_metadata
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role full access
CREATE POLICY "Service role full access" ON tools
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON rules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON fixer_mappings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON tool_categories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON tool_languages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON tool_versions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON tool_research_metadata
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE tools IS 'All analysis and fixer tools supported by CodeQual (45+ tools across 13 languages)';
COMMENT ON TABLE rules IS 'Rule definitions for each tool, including fix capabilities';
COMMENT ON TABLE fixer_mappings IS 'Maps analyzer tool rules to appropriate fixer tools';
COMMENT ON TABLE tool_categories IS 'Many-to-many relationship between tools and categories';
COMMENT ON TABLE tool_languages IS 'Many-to-many relationship between tools and programming languages';
COMMENT ON VIEW v_tools_full IS 'Complete tool information including aggregated languages and categories';
COMMENT ON VIEW v_fixer_recommendations IS 'Recommended fixers for each analyzer rule pattern';
COMMENT ON FUNCTION get_fixer_for_issue IS 'Find the best fixer for a given analyzer tool and rule ID';
COMMENT ON TABLE tool_versions IS 'Latest version information fetched from package registries (npm, PyPI, Maven, GitHub) by ToolResearcherService';
COMMENT ON TABLE tool_research_metadata IS 'Singleton tracking last tool research run and next scheduled research';
COMMENT ON VIEW v_tool_versions_needing_update IS 'Tools with outdated versions that need updating';
COMMENT ON VIEW v_tool_research_status IS 'Current status of tool version research including next scheduled run';
