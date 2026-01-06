-- ============================================================================
-- SESSION 77: Add context_key column for context-aware pattern matching
-- ============================================================================
-- This migration adds context_key to fix_patterns for matching patterns
-- based on the specific code context, not just rule_id + tool.
--
-- Examples:
-- - CloseResource with FileInputStream → context_key: 'FileInputStream'
-- - CloseResource with ReadableByteChannel → context_key: 'ReadableByteChannel'
-- - CloseResource with Connection → context_key: 'Connection'
--
-- This allows multiple patterns per rule, each for a different resource type.
-- Pattern lookup: rule_id + tool + context_key (if available)
-- ============================================================================

-- Add context_key column
ALTER TABLE public.fix_patterns
ADD COLUMN IF NOT EXISTS context_key TEXT;

-- Add index for context-aware pattern lookup
CREATE INDEX IF NOT EXISTS idx_fix_patterns_context
    ON public.fix_patterns (rule_id, tool, context_key);

-- Update the lookup function to support context_key
CREATE OR REPLACE FUNCTION lookup_fix_patterns(
    p_rule_id TEXT,
    p_tool TEXT DEFAULT NULL,
    p_file_type TEXT DEFAULT NULL,
    p_active_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    rule_id TEXT,
    tool TEXT,
    context_key TEXT,
    name TEXT,
    description TEXT,
    transformation_type TEXT,
    file_types TEXT[],
    detection JSONB,
    fix_template JSONB,
    examples JSONB,
    confidence INTEGER,
    safe_for_auto_apply BOOLEAN,
    status TEXT,
    source TEXT,
    ai_model TEXT,
    verified BOOLEAN,
    apply_count INTEGER,
    success_count INTEGER,
    revert_count INTEGER,
    created_by TEXT,
    created_at TIMESTAMPTZ,
    updated_by TEXT,
    updated_at TIMESTAMPTZ,
    ai_confidence INTEGER,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fp.id,
        fp.rule_id,
        fp.tool,
        fp.context_key,
        fp.name,
        fp.description,
        fp.transformation_type,
        fp.file_types,
        fp.detection,
        fp.fix_template,
        fp.examples,
        fp.confidence,
        fp.safe_for_auto_apply,
        fp.status,
        fp.source,
        fp.ai_model,
        fp.verified,
        fp.apply_count,
        fp.success_count,
        fp.revert_count,
        fp.created_by,
        fp.created_at,
        fp.updated_by,
        fp.updated_at,
        fp.ai_confidence,
        fp.tags
    FROM public.fix_patterns fp
    WHERE fp.rule_id ILIKE p_rule_id  -- SESSION 77: Case-insensitive match
        AND (p_tool IS NULL OR fp.tool = p_tool)
        AND (p_file_type IS NULL OR p_file_type = ANY(fp.file_types))
        AND (NOT p_active_only OR fp.status = 'active')
    ORDER BY fp.confidence DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add new function for context-aware lookup (SESSION 77)
CREATE OR REPLACE FUNCTION lookup_fix_pattern_with_context(
    p_rule_id TEXT,
    p_tool TEXT,
    p_context_key TEXT,
    p_active_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    id UUID,
    rule_id TEXT,
    tool TEXT,
    context_key TEXT,
    name TEXT,
    description TEXT,
    transformation_type TEXT,
    file_types TEXT[],
    detection JSONB,
    fix_template JSONB,
    examples JSONB,
    confidence INTEGER,
    safe_for_auto_apply BOOLEAN,
    status TEXT,
    source TEXT,
    ai_model TEXT,
    verified BOOLEAN,
    apply_count INTEGER,
    success_count INTEGER,
    revert_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fp.id,
        fp.rule_id,
        fp.tool,
        fp.context_key,
        fp.name,
        fp.description,
        fp.transformation_type,
        fp.file_types,
        fp.detection,
        fp.fix_template,
        fp.examples,
        fp.confidence,
        fp.safe_for_auto_apply,
        fp.status,
        fp.source,
        fp.ai_model,
        fp.verified,
        fp.apply_count,
        fp.success_count,
        fp.revert_count
    FROM public.fix_patterns fp
    WHERE fp.rule_id ILIKE p_rule_id  -- Case-insensitive match
        AND fp.tool = p_tool
        AND fp.context_key = p_context_key
        AND (NOT p_active_only OR fp.status = 'active')
    ORDER BY fp.confidence DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for the new column
COMMENT ON COLUMN public.fix_patterns.context_key IS 'Context key for matching similar code contexts (e.g., FileInputStream for CloseResource rule)';

-- ============================================================================
-- End of migration
-- ============================================================================
