-- ============================================================================
-- Fix Patterns Table - Supabase Migration
-- ============================================================================
-- This table stores reusable fix patterns for the Fix Pattern Registry.
-- Patterns can be captured from manual fixes, AI-generated, or built-in.
--
-- Key features:
-- - Patterns are keyed by rule_id + tool for quick lookup
-- - AI-generated patterns are marked with source = 'ai_generated'
-- - Verified patterns go directly to 'active' status
-- - Pattern reuse skips expensive AI generation
-- ============================================================================

-- Create fix_patterns table
CREATE TABLE IF NOT EXISTS public.fix_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Rule identification (for lookup)
    rule_id TEXT NOT NULL,
    tool TEXT NOT NULL,

    -- Pattern metadata
    name TEXT NOT NULL,
    description TEXT,
    transformation_type TEXT NOT NULL CHECK (transformation_type IN ('replace', 'wrap', 'inject', 'remove', 'restructure', 'refactor')),
    file_types TEXT[] NOT NULL DEFAULT '{}',

    -- Detection pattern (how to find the issue)
    detection JSONB NOT NULL DEFAULT '{}',

    -- Fix template (how to transform the code)
    fix_template JSONB NOT NULL DEFAULT '{}',

    -- Examples (for validation and documentation)
    examples JSONB NOT NULL DEFAULT '[]',

    -- Confidence and safety
    confidence INTEGER NOT NULL DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
    safe_for_auto_apply BOOLEAN NOT NULL DEFAULT FALSE,

    -- Status in the approval pipeline
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'active', 'deprecated', 'rejected')),

    -- Metadata
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT,
    updated_at TIMESTAMPTZ,

    -- Source tracking
    source TEXT NOT NULL DEFAULT 'manual_capture' CHECK (source IN ('manual_capture', 'ai_generated', 'community', 'codequal_team')),

    -- AI-specific metadata
    ai_model TEXT,
    ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    verified BOOLEAN DEFAULT FALSE,

    -- Usage statistics
    apply_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    revert_count INTEGER NOT NULL DEFAULT 0,

    -- Tags for categorization
    tags TEXT[] DEFAULT '{}'
);

-- Index for fast lookup by rule_id + tool (most common query)
CREATE INDEX IF NOT EXISTS idx_fix_patterns_rule_tool
    ON public.fix_patterns (rule_id, tool);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_fix_patterns_status
    ON public.fix_patterns (status);

-- Index for source filtering (to find AI-generated patterns)
CREATE INDEX IF NOT EXISTS idx_fix_patterns_source
    ON public.fix_patterns (source);

-- Index for finding active patterns by rule
CREATE INDEX IF NOT EXISTS idx_fix_patterns_active_lookup
    ON public.fix_patterns (rule_id, tool, status)
    WHERE status = 'active';

-- Composite index for confidence-based sorting
CREATE INDEX IF NOT EXISTS idx_fix_patterns_confidence
    ON public.fix_patterns (rule_id, tool, confidence DESC);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to lookup patterns for a rule (used by FixPatternRegistry)
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
    WHERE fp.rule_id = p_rule_id
        AND (p_tool IS NULL OR fp.tool = p_tool)
        AND (p_file_type IS NULL OR p_file_type = ANY(fp.file_types))
        AND (NOT p_active_only OR fp.status = 'active')
    ORDER BY fp.confidence DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to record pattern application (for learning)
CREATE OR REPLACE FUNCTION record_pattern_application(
    p_pattern_id UUID,
    p_success BOOLEAN,
    p_reverted BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.fix_patterns
    SET
        apply_count = apply_count + 1,
        success_count = success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
        revert_count = revert_count + CASE WHEN p_reverted THEN 1 ELSE 0 END,
        updated_at = NOW(),
        -- Auto-adjust confidence based on success rate
        confidence = CASE
            WHEN (apply_count + 1) >= 10 THEN
                LEAST(95, confidence + CASE
                    WHEN p_success AND NOT p_reverted THEN 1
                    WHEN p_reverted THEN -3
                    ELSE 0
                END)
            ELSE confidence
        END,
        -- Auto-approve for safe auto-apply if success rate is high
        safe_for_auto_apply = CASE
            WHEN (apply_count + 1) >= 10
                AND ((success_count + CASE WHEN p_success THEN 1 ELSE 0 END)::FLOAT / (apply_count + 1)) > 0.9
                AND ((revert_count + CASE WHEN p_reverted THEN 1 ELSE 0 END)::FLOAT / (apply_count + 1)) < 0.05
            THEN TRUE
            ELSE safe_for_auto_apply
        END
    WHERE id = p_pattern_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get AI fixer statistics
CREATE OR REPLACE FUNCTION get_ai_fixer_stats()
RETURNS TABLE (
    total_patterns BIGINT,
    active_patterns BIGINT,
    pending_patterns BIGINT,
    verified_patterns BIGINT,
    avg_confidence NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_patterns,
        COUNT(*) FILTER (WHERE status = 'active')::BIGINT AS active_patterns,
        COUNT(*) FILTER (WHERE status = 'pending_review')::BIGINT AS pending_patterns,
        COUNT(*) FILTER (WHERE verified = TRUE)::BIGINT AS verified_patterns,
        ROUND(AVG(confidence)::NUMERIC, 1) AS avg_confidence
    FROM public.fix_patterns
    WHERE source = 'ai_generated';
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.fix_patterns ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active patterns
CREATE POLICY "Anyone can read active patterns" ON public.fix_patterns
    FOR SELECT
    USING (status = 'active');

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access" ON public.fix_patterns
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- Seed Built-in Patterns
-- ============================================================================

-- GitHub Actions Shell Injection Fix (built-in pattern)
INSERT INTO public.fix_patterns (
    id,
    rule_id,
    tool,
    name,
    description,
    transformation_type,
    file_types,
    detection,
    fix_template,
    examples,
    confidence,
    safe_for_auto_apply,
    status,
    created_by,
    source,
    tags
) VALUES (
    'a0000001-0001-0001-0001-000000000001'::UUID,
    'yaml.github-actions.security.run-shell-injection.run-shell-injection',
    'semgrep',
    'Fix GitHub Actions Shell Injection',
    'Moves GitHub context variables from direct interpolation to env: block to prevent shell injection',
    'wrap',
    ARRAY['yaml', 'yml'],
    '{"regex": "(\\s*)-\\s*name:\\s*([^\\n]+)\\n\\s*run:\\s*\\|([\\s\\S]*?)\\$\\{\\{\\s*github\\.event\\.inputs\\.([^}]+)\\s*\\}\\}", "extractVariables": [{"name": "INDENT", "source": "group_1"}, {"name": "STEP_NAME", "source": "group_2"}, {"name": "RUN_CONTENT", "source": "group_3"}, {"name": "INPUT_NAME", "source": "group_4"}]}'::JSONB,
    '{"template": "{{INDENT}}- name: {{STEP_NAME}}\n{{INDENT}}  env:\n{{INDENT}}    {{VAR_NAME}}: ${{ github.event.inputs.{{INPUT_NAME}} }}\n{{INDENT}}  run: |\n{{INDENT}}    {{RUN_CONTENT_FIXED}}", "indentation": "preserve", "requiredVariables": ["INDENT", "STEP_NAME", "INPUT_NAME"], "defaultVariables": {"VAR_NAME": "INPUT_VALUE"}}'::JSONB,
    '[{"description": "Fix shell injection in kubectl command", "before": "    - name: Create namespace\n      run: |\n        kubectl create namespace codequal-${{ github.event.inputs.environment }}", "after": "    - name: Create namespace\n      env:\n        DEPLOY_ENV: ${{ github.event.inputs.environment }}\n      run: |\n        kubectl create namespace \"codequal-$DEPLOY_ENV\"", "variables": {"INPUT_NAME": "environment", "VAR_NAME": "DEPLOY_ENV"}}]'::JSONB,
    90,
    FALSE,
    'active',
    'codequal-team',
    'codequal_team',
    ARRAY['security', 'github-actions', 'shell-injection']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.fix_patterns IS 'Stores reusable fix patterns for the Fix Pattern Registry';
COMMENT ON COLUMN public.fix_patterns.rule_id IS 'The rule ID this pattern fixes (e.g., yaml.github-actions.security.run-shell-injection)';
COMMENT ON COLUMN public.fix_patterns.tool IS 'The tool that detects this rule (e.g., semgrep, eslint)';
COMMENT ON COLUMN public.fix_patterns.detection IS 'JSON object containing regex and variable extraction rules';
COMMENT ON COLUMN public.fix_patterns.fix_template IS 'JSON object containing the fix template and required variables';
COMMENT ON COLUMN public.fix_patterns.verified IS 'Whether this AI-generated pattern has been verified through testing';
COMMENT ON COLUMN public.fix_patterns.source IS 'Origin of the pattern: manual_capture, ai_generated, community, or codequal_team';
