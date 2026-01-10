-- SESSION 80: Fix Pattern Knowledge Base Migration
-- Purpose: Store guidance for AI fix generation to avoid known anti-patterns
-- and provide correct patterns for common issues

-- Fix pattern guidance table
CREATE TABLE IF NOT EXISTS fix_pattern_guidance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identification
  rule_id VARCHAR(100) NOT NULL,           -- e.g., 'CloseResource', 'EmptyCatchBlock'
  language VARCHAR(50) NOT NULL,            -- e.g., 'java', 'python', 'typescript'
  tool VARCHAR(50) NOT NULL DEFAULT 'any',  -- e.g., 'pmd', 'checkstyle', 'eslint', 'any'

  -- Anti-patterns to avoid in AI-generated fixes
  anti_patterns JSONB NOT NULL DEFAULT '[]',
  -- Example: [
  --   {"pattern": "empty catch block", "why": "swallows exceptions, hides bugs"},
  --   {"pattern": "catch Throwable", "why": "catches errors that shouldn't be caught"}
  -- ]

  -- Correct patterns to use in fixes
  correct_patterns JSONB NOT NULL DEFAULT '[]',
  -- Example: [
  --   {"pattern": "log and rethrow", "example": "catch(IOException e) { log.error(\"Failed\", e); throw new RuntimeException(e); }"},
  --   {"pattern": "try-with-resources", "example": "try (var stream = new FileInputStream(f)) { ... }"}
  -- ]

  -- Related rules that often conflict when fixing this rule
  related_rules VARCHAR(100)[] DEFAULT '{}',
  -- Example: {'EmptyCatchBlock', 'AvoidCatchingThrowable'} for CloseResource

  -- Additional human-readable guidance for the AI
  guidance_text TEXT,
  -- Example: "When fixing CloseResource issues, always use try-with-resources..."

  -- Prompt additions for this rule (injected into AI prompts)
  prompt_additions TEXT,
  -- Example: "CRITICAL: Never generate empty catch blocks..."

  -- Tracking metadata
  success_rate DECIMAL(5,2) DEFAULT 0.00,   -- Percentage of successful fixes using this guidance
  usage_count INTEGER DEFAULT 0,             -- Number of times this guidance has been used
  last_failure_reason TEXT,                  -- Last known failure reason for debugging

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each rule/language/tool combination should be unique
  UNIQUE(rule_id, language, tool)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_fix_pattern_guidance_rule
  ON fix_pattern_guidance(rule_id);

CREATE INDEX IF NOT EXISTS idx_fix_pattern_guidance_language
  ON fix_pattern_guidance(language);

CREATE INDEX IF NOT EXISTS idx_fix_pattern_guidance_tool
  ON fix_pattern_guidance(tool);

-- Compound index for common query pattern
CREATE INDEX IF NOT EXISTS idx_fix_pattern_guidance_lookup
  ON fix_pattern_guidance(rule_id, language);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fix_pattern_guidance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fix_pattern_guidance_updated_at_trigger ON fix_pattern_guidance;
CREATE TRIGGER fix_pattern_guidance_updated_at_trigger
  BEFORE UPDATE ON fix_pattern_guidance
  FOR EACH ROW
  EXECUTE FUNCTION update_fix_pattern_guidance_updated_at();

-- Comments for documentation
COMMENT ON TABLE fix_pattern_guidance IS 'Knowledge base for AI fix generation guidance - stores anti-patterns to avoid and correct patterns to use';
COMMENT ON COLUMN fix_pattern_guidance.anti_patterns IS 'JSON array of patterns to AVOID in fixes, with explanations';
COMMENT ON COLUMN fix_pattern_guidance.correct_patterns IS 'JSON array of correct patterns to USE in fixes, with examples';
COMMENT ON COLUMN fix_pattern_guidance.related_rules IS 'Array of related rules that may conflict when fixing this rule';
COMMENT ON COLUMN fix_pattern_guidance.prompt_additions IS 'Text to inject into AI prompts when fixing this rule type';
