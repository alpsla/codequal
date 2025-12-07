-- ============================================================================
-- Tool Registry Schema for CodeQual Fix System
-- Created: 2024-12-01
--
-- This schema supports the Two-Tier Fix System:
-- - Tier 1: Tools with native --fix support (≥60% confidence)
-- - Tier 2: AI Fixer (for <60% confidence or no tool support)
--
-- Languages covered: Java, TypeScript, JavaScript, Python, Go, Rust
-- ============================================================================

-- Drop existing tables if migrating
DROP TABLE IF EXISTS rule_to_fixer_mappings CASCADE;
DROP TABLE IF EXISTS fixer_tools CASCADE;
DROP TABLE IF EXISTS validator_tools CASCADE;
DROP TABLE IF EXISTS tool_installation_scripts CASCADE;

-- ============================================================================
-- VALIDATOR TOOLS
-- Analysis tools that detect issues (PMD, ESLint, Ruff, etc.)
-- ============================================================================
CREATE TABLE validator_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Language support (array for multi-language tools)
    languages TEXT[] NOT NULL,

    -- Package info
    registry VARCHAR(50) NOT NULL, -- npm, pypi, maven, github, binary
    package_name VARCHAR(255) NOT NULL,
    group_id VARCHAR(255), -- Maven only
    artifact_id VARCHAR(255), -- Maven only
    github_repo VARCHAR(255), -- GitHub releases

    -- Version info
    current_version VARCHAR(50) NOT NULL,
    latest_version VARCHAR(50),
    version_updated_at TIMESTAMP WITH TIME ZONE,

    -- Categories this tool validates
    categories TEXT[] NOT NULL, -- security, code_quality, style, bugs, performance, etc.

    -- Execution info
    command_template VARCHAR(500), -- e.g., "eslint --format json {files}"
    output_format VARCHAR(50), -- json, sarif, text

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FIXER TOOLS
-- Tools that can automatically fix issues
-- ============================================================================
CREATE TABLE fixer_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Language support
    languages TEXT[] NOT NULL,

    -- Package info
    registry VARCHAR(50) NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    group_id VARCHAR(255),
    artifact_id VARCHAR(255),
    github_repo VARCHAR(255),

    -- Version info
    current_version VARCHAR(50) NOT NULL,
    latest_version VARCHAR(50),
    version_updated_at TIMESTAMP WITH TIME ZONE,

    -- Fix capabilities
    fix_type VARCHAR(50) NOT NULL, -- native (--fix flag), dedicated (separate tool), ai
    fix_command VARCHAR(500), -- e.g., "eslint --fix {files}"

    -- Confidence and safety
    base_confidence INTEGER NOT NULL CHECK (base_confidence >= 0 AND base_confidence <= 100),
    safe_for_auto_apply BOOLEAN DEFAULT false,
    requires_review BOOLEAN DEFAULT true,

    -- Categories this fixer handles
    categories TEXT[] NOT NULL,

    -- Execution characteristics
    execution_speed VARCHAR(20) DEFAULT 'medium', -- fast, medium, slow
    supports_batch BOOLEAN DEFAULT true,
    max_parallel INTEGER DEFAULT 4,

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- RULE TO FIXER MAPPINGS
-- Maps specific rules from validators to appropriate fixers
-- ============================================================================
CREATE TABLE rule_to_fixer_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source: validator + rule
    validator_tool_id VARCHAR(100) NOT NULL REFERENCES validator_tools(tool_id),
    rule_id VARCHAR(255) NOT NULL, -- e.g., "no-unused-vars", "S1135", "F401"
    rule_pattern VARCHAR(255), -- Regex for matching rule families (e.g., "TS*" for TypeScript errors)

    -- Target: fixer
    fixer_tool_id VARCHAR(100) REFERENCES fixer_tools(tool_id), -- NULL means AI fixer

    -- Confidence for this specific mapping
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),

    -- Issue classification
    issue_type VARCHAR(50) NOT NULL, -- security, unused_code, type_error, style, etc.

    -- Safety
    safe_for_auto_apply BOOLEAN DEFAULT false,

    -- Notes
    notes TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one mapping per validator+rule
    UNIQUE (validator_tool_id, rule_id)
);

-- ============================================================================
-- TOOL INSTALLATION SCRIPTS
-- Shell scripts/commands to install tools on Oracle/Docker
-- ============================================================================
CREATE TABLE tool_installation_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id VARCHAR(100) NOT NULL, -- Can be validator or fixer tool_id
    tool_type VARCHAR(20) NOT NULL, -- validator, fixer

    -- Environment
    platform VARCHAR(50) NOT NULL, -- linux, darwin, docker
    architecture VARCHAR(20) DEFAULT 'x86_64',

    -- Installation
    install_command TEXT NOT NULL,
    post_install_command TEXT,
    verify_command VARCHAR(500) NOT NULL,

    -- Dependencies
    dependencies TEXT[], -- Other tools that must be installed first
    environment_variables JSONB, -- Required env vars

    -- Status
    is_active BOOLEAN DEFAULT true,
    tested_at TIMESTAMP WITH TIME ZONE,
    test_result VARCHAR(50), -- success, failed, untested

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (tool_id, tool_type, platform)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_validator_tools_languages ON validator_tools USING GIN (languages);
CREATE INDEX idx_validator_tools_categories ON validator_tools USING GIN (categories);
CREATE INDEX idx_fixer_tools_languages ON fixer_tools USING GIN (languages);
CREATE INDEX idx_fixer_tools_categories ON fixer_tools USING GIN (categories);
CREATE INDEX idx_rule_mappings_validator ON rule_to_fixer_mappings (validator_tool_id);
CREATE INDEX idx_rule_mappings_fixer ON rule_to_fixer_mappings (fixer_tool_id);
CREATE INDEX idx_rule_mappings_confidence ON rule_to_fixer_mappings (confidence DESC);
CREATE INDEX idx_rule_mappings_issue_type ON rule_to_fixer_mappings (issue_type);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Tools by language
CREATE OR REPLACE VIEW tools_by_language AS
SELECT
    unnest(v.languages) as language,
    'validator' as tool_type,
    v.tool_id,
    v.name,
    v.categories
FROM validator_tools v
WHERE v.is_active = true
UNION ALL
SELECT
    unnest(f.languages) as language,
    'fixer' as tool_type,
    f.tool_id,
    f.name,
    f.categories
FROM fixer_tools f
WHERE f.is_active = true;

-- View: High confidence fixers (≥60%)
CREATE OR REPLACE VIEW high_confidence_fixers AS
SELECT
    m.validator_tool_id,
    m.rule_id,
    m.rule_pattern,
    f.tool_id as fixer_tool_id,
    f.name as fixer_name,
    f.fix_command,
    m.confidence,
    m.issue_type,
    m.safe_for_auto_apply
FROM rule_to_fixer_mappings m
LEFT JOIN fixer_tools f ON m.fixer_tool_id = f.tool_id
WHERE m.is_active = true
  AND m.confidence >= 60
ORDER BY m.confidence DESC;

-- View: AI fixer candidates (<60% confidence or no fixer)
CREATE OR REPLACE VIEW ai_fixer_candidates AS
SELECT
    m.validator_tool_id,
    m.rule_id,
    m.rule_pattern,
    m.confidence,
    m.issue_type,
    m.notes
FROM rule_to_fixer_mappings m
WHERE m.is_active = true
  AND (m.confidence < 60 OR m.fixer_tool_id IS NULL)
ORDER BY m.validator_tool_id, m.rule_id;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Get fixer for a rule
CREATE OR REPLACE FUNCTION get_fixer_for_rule(
    p_validator_tool_id VARCHAR(100),
    p_rule_id VARCHAR(255)
) RETURNS TABLE (
    fixer_tool_id VARCHAR(100),
    fixer_name VARCHAR(255),
    fix_command VARCHAR(500),
    confidence INTEGER,
    use_ai_fixer BOOLEAN,
    safe_for_auto_apply BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.fixer_tool_id,
        f.name,
        f.fix_command,
        m.confidence,
        (m.confidence < 60 OR m.fixer_tool_id IS NULL) as use_ai_fixer,
        m.safe_for_auto_apply
    FROM rule_to_fixer_mappings m
    LEFT JOIN fixer_tools f ON m.fixer_tool_id = f.tool_id
    WHERE m.validator_tool_id = p_validator_tool_id
      AND (m.rule_id = p_rule_id OR p_rule_id ~ m.rule_pattern)
      AND m.is_active = true
    ORDER BY
        CASE WHEN m.rule_id = p_rule_id THEN 0 ELSE 1 END, -- Exact match first
        m.confidence DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get all fixers for a language
CREATE OR REPLACE FUNCTION get_fixers_for_language(p_language VARCHAR(50))
RETURNS TABLE (
    tool_id VARCHAR(100),
    name VARCHAR(255),
    fix_type VARCHAR(50),
    fix_command VARCHAR(500),
    base_confidence INTEGER,
    safe_for_auto_apply BOOLEAN,
    categories TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.tool_id,
        f.name,
        f.fix_type,
        f.fix_command,
        f.base_confidence,
        f.safe_for_auto_apply,
        f.categories
    FROM fixer_tools f
    WHERE p_language = ANY(f.languages)
      AND f.is_active = true
    ORDER BY f.base_confidence DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validator_tools_updated
    BEFORE UPDATE ON validator_tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_fixer_tools_updated
    BEFORE UPDATE ON fixer_tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_rule_mappings_updated
    BEFORE UPDATE ON rule_to_fixer_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE validator_tools IS 'Analysis tools that detect issues in code';
COMMENT ON TABLE fixer_tools IS 'Tools that can automatically fix detected issues';
COMMENT ON TABLE rule_to_fixer_mappings IS 'Maps specific validator rules to appropriate fixers';
COMMENT ON TABLE tool_installation_scripts IS 'Installation scripts for Oracle/Docker environments';

COMMENT ON COLUMN rule_to_fixer_mappings.confidence IS 'Confidence level 0-100. ≥60 uses tool fixer, <60 uses AI fixer';
COMMENT ON COLUMN fixer_tools.safe_for_auto_apply IS 'If true, fix can be auto-applied without human review';
COMMENT ON COLUMN fixer_tools.fix_type IS 'native = tool has --fix, dedicated = separate fixer tool, ai = AI-generated';
