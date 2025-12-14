-- ============================================================================
-- Fix Reports Table - Supabase Migration
-- ============================================================================
-- This table stores fix analysis reports and user selections for PR auto-fix.
-- Supports the complete workflow: Analysis -> User Selection -> Commit Generation
--
-- Key features:
-- - Links to pr_reviews for PR context
-- - Stores all discovered issues with fix availability
-- - Tracks user selections (severity filter, specific issues, review options)
-- - Generates unified commit messages for all providers (GitHub, GitLab, etc.)
-- ============================================================================

-- ============================================================================
-- Fix Reports (Main Analysis Session)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fix_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to PR review
    pr_review_id UUID REFERENCES public.pr_reviews(id) ON DELETE CASCADE,

    -- Repository context
    repository_url TEXT NOT NULL,
    pr_number INTEGER,
    base_branch TEXT NOT NULL DEFAULT 'main',
    head_branch TEXT NOT NULL,
    commit_sha TEXT,

    -- User context
    user_id UUID REFERENCES auth.users(id),
    user_tier TEXT NOT NULL CHECK (user_tier IN ('basic', 'pro', 'enterprise')) DEFAULT 'basic',

    -- Analysis summary
    total_issues INTEGER NOT NULL DEFAULT 0,
    fixable_issues INTEGER NOT NULL DEFAULT 0,
    auto_fixed_count INTEGER NOT NULL DEFAULT 0,
    manual_review_count INTEGER NOT NULL DEFAULT 0,
    intentional_use_count INTEGER NOT NULL DEFAULT 0,

    -- Cost tracking
    api_cost_usd NUMERIC(10, 6) DEFAULT 0,
    pattern_reuse_count INTEGER NOT NULL DEFAULT 0,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Report created, awaiting user selection
        'user_reviewing',    -- User is reviewing issues
        'fixes_selected',    -- User has selected fixes to apply
        'commit_pending',    -- Commit is being generated
        'commit_ready',      -- Commit ready for user approval
        'committed',         -- Changes committed to branch
        'pushed',            -- Changes pushed to remote
        'pr_updated',        -- PR updated with fixes
        'completed',         -- Workflow complete
        'cancelled',         -- User cancelled
        'error'              -- Error occurred
    )),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Provider-specific metadata (GitHub, GitLab, Bitbucket)
    provider TEXT CHECK (provider IN ('github', 'gitlab', 'bitbucket', 'azure_devops')),
    provider_metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- Fix Report Issues (Individual Issues Found)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fix_report_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fix_report_id UUID NOT NULL REFERENCES public.fix_reports(id) ON DELETE CASCADE,

    -- Issue identification
    issue_hash TEXT NOT NULL,  -- Hash for deduplication

    -- Issue details
    file_path TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    column_number INTEGER,
    end_line INTEGER,
    end_column INTEGER,

    -- Classification
    rule_id TEXT NOT NULL,
    tool TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'security',
        'code_quality',
        'performance',
        'architecture',
        'dependency_vulnerability',
        'code_style',
        'best_practice',
        'documentation'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),

    -- Issue content
    message TEXT NOT NULL,
    description TEXT,
    code_snippet TEXT,

    -- Issue status in PR
    issue_type TEXT NOT NULL CHECK (issue_type IN ('new', 'existing_modified', 'existing_rest', 'resolved')),

    -- Fix availability
    fix_available BOOLEAN NOT NULL DEFAULT FALSE,
    fix_source TEXT CHECK (fix_source IN ('pattern', 'ai_generated', 'tool_native', 'manual')),
    fix_confidence INTEGER CHECK (fix_confidence >= 0 AND fix_confidence <= 100),
    fixed_code TEXT,

    -- Special handling
    is_intentional_use BOOLEAN DEFAULT FALSE,
    intentional_reason TEXT,

    -- User selection
    user_selected BOOLEAN DEFAULT FALSE,
    user_selection_time TIMESTAMPTZ,

    -- Pattern tracking
    pattern_id UUID REFERENCES public.fix_patterns(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint for deduplication within a report
    UNIQUE (fix_report_id, issue_hash)
);

-- ============================================================================
-- Fix User Selections (User Preferences for Fix Application)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fix_user_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fix_report_id UUID NOT NULL REFERENCES public.fix_reports(id) ON DELETE CASCADE UNIQUE,

    -- Selection mode
    selection_mode TEXT NOT NULL CHECK (selection_mode IN (
        'all_fixable',         -- Fix all issues that have fixes available
        'by_severity',         -- Fix issues matching severity filter
        'by_category',         -- Fix issues matching category filter
        'specific_issues',     -- Fix only specifically selected issues
        'review_each'          -- Review each fix before applying
    )),

    -- Severity filter (when selection_mode = 'by_severity')
    min_severity TEXT CHECK (min_severity IN ('critical', 'high', 'medium', 'low')),
    include_severities TEXT[] DEFAULT '{}',

    -- Category filter (when selection_mode = 'by_category')
    include_categories TEXT[] DEFAULT '{}',

    -- Specific issues (when selection_mode = 'specific_issues')
    selected_issue_ids UUID[] DEFAULT '{}',

    -- Additional options
    include_intentional_review BOOLEAN DEFAULT FALSE,  -- Include intentional use items in report
    auto_approve_high_confidence BOOLEAN DEFAULT TRUE,  -- Auto-approve fixes with >90% confidence
    require_manual_review_threshold INTEGER DEFAULT 70,  -- Below this confidence, require manual review

    -- Commit preferences
    commit_style TEXT NOT NULL DEFAULT 'grouped' CHECK (commit_style IN (
        'single',       -- All fixes in one commit
        'grouped',      -- Group by category
        'per_file',     -- One commit per file
        'per_issue'     -- One commit per issue
    )),

    -- Branch preferences
    create_new_branch BOOLEAN DEFAULT FALSE,
    new_branch_name TEXT,

    -- PR preferences
    add_pr_comment BOOLEAN DEFAULT TRUE,
    include_educational BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- ============================================================================
-- Fix Commits (Generated Commits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.fix_commits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fix_report_id UUID NOT NULL REFERENCES public.fix_reports(id) ON DELETE CASCADE,

    -- Commit details
    commit_type TEXT NOT NULL CHECK (commit_type IN ('fix', 'style', 'security', 'perf', 'refactor')),
    commit_title TEXT NOT NULL,
    commit_body TEXT NOT NULL,

    -- Files changed
    files_changed TEXT[] NOT NULL DEFAULT '{}',
    additions INTEGER NOT NULL DEFAULT 0,
    deletions INTEGER NOT NULL DEFAULT 0,

    -- Issue references
    issue_ids UUID[] NOT NULL DEFAULT '{}',

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',       -- Commit prepared but not applied
        'staged',        -- Files staged
        'committed',     -- Commit created locally
        'pushed',        -- Pushed to remote
        'merged',        -- Merged to base branch
        'reverted',      -- Commit was reverted
        'error'          -- Error occurred
    )),

    -- Git details (after commit)
    commit_sha TEXT,
    parent_sha TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    committed_at TIMESTAMPTZ,
    pushed_at TIMESTAMPTZ
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Fix Reports indexes
CREATE INDEX IF NOT EXISTS idx_fix_reports_pr_review ON public.fix_reports(pr_review_id);
CREATE INDEX IF NOT EXISTS idx_fix_reports_user ON public.fix_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_fix_reports_status ON public.fix_reports(status);
CREATE INDEX IF NOT EXISTS idx_fix_reports_repository ON public.fix_reports(repository_url);

-- Fix Report Issues indexes
CREATE INDEX IF NOT EXISTS idx_fix_report_issues_report ON public.fix_report_issues(fix_report_id);
CREATE INDEX IF NOT EXISTS idx_fix_report_issues_severity ON public.fix_report_issues(severity);
CREATE INDEX IF NOT EXISTS idx_fix_report_issues_category ON public.fix_report_issues(category);
CREATE INDEX IF NOT EXISTS idx_fix_report_issues_fix_available ON public.fix_report_issues(fix_available);
CREATE INDEX IF NOT EXISTS idx_fix_report_issues_user_selected ON public.fix_report_issues(user_selected);
CREATE INDEX IF NOT EXISTS idx_fix_report_issues_rule ON public.fix_report_issues(rule_id, tool);

-- Fix Commits indexes
CREATE INDEX IF NOT EXISTS idx_fix_commits_report ON public.fix_commits(fix_report_id);
CREATE INDEX IF NOT EXISTS idx_fix_commits_status ON public.fix_commits(status);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to get fix report summary
CREATE OR REPLACE FUNCTION get_fix_report_summary(p_report_id UUID)
RETURNS TABLE (
    total_issues BIGINT,
    by_severity JSONB,
    by_category JSONB,
    fixable_count BIGINT,
    auto_fixed BIGINT,
    manual_review BIGINT,
    intentional_use BIGINT,
    selected_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_issues,
        jsonb_object_agg(
            fri.severity,
            (SELECT COUNT(*) FROM public.fix_report_issues WHERE fix_report_id = p_report_id AND severity = fri.severity)
        ) AS by_severity,
        jsonb_object_agg(
            fri.category,
            (SELECT COUNT(*) FROM public.fix_report_issues WHERE fix_report_id = p_report_id AND category = fri.category)
        ) AS by_category,
        COUNT(*) FILTER (WHERE fix_available = TRUE)::BIGINT AS fixable_count,
        COUNT(*) FILTER (WHERE fix_available = TRUE AND fix_source IN ('pattern', 'ai_generated'))::BIGINT AS auto_fixed,
        COUNT(*) FILTER (WHERE fix_source = 'manual')::BIGINT AS manual_review,
        COUNT(*) FILTER (WHERE is_intentional_use = TRUE)::BIGINT AS intentional_use,
        COUNT(*) FILTER (WHERE user_selected = TRUE)::BIGINT AS selected_count
    FROM public.fix_report_issues fri
    WHERE fri.fix_report_id = p_report_id
    GROUP BY fri.fix_report_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to apply user selection to issues
CREATE OR REPLACE FUNCTION apply_user_selection(p_report_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_selection RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    -- Get user selection for this report
    SELECT * INTO v_selection
    FROM public.fix_user_selections
    WHERE fix_report_id = p_report_id;

    IF v_selection IS NULL THEN
        RETURN 0;
    END IF;

    -- Apply selection based on mode
    CASE v_selection.selection_mode
        WHEN 'all_fixable' THEN
            UPDATE public.fix_report_issues
            SET user_selected = TRUE, user_selection_time = NOW()
            WHERE fix_report_id = p_report_id
              AND fix_available = TRUE
              AND is_intentional_use = FALSE;
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;

        WHEN 'by_severity' THEN
            UPDATE public.fix_report_issues
            SET user_selected = TRUE, user_selection_time = NOW()
            WHERE fix_report_id = p_report_id
              AND fix_available = TRUE
              AND is_intentional_use = FALSE
              AND severity = ANY(v_selection.include_severities);
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;

        WHEN 'by_category' THEN
            UPDATE public.fix_report_issues
            SET user_selected = TRUE, user_selection_time = NOW()
            WHERE fix_report_id = p_report_id
              AND fix_available = TRUE
              AND is_intentional_use = FALSE
              AND category = ANY(v_selection.include_categories);
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;

        WHEN 'specific_issues' THEN
            UPDATE public.fix_report_issues
            SET user_selected = TRUE, user_selection_time = NOW()
            WHERE fix_report_id = p_report_id
              AND id = ANY(v_selection.selected_issue_ids);
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;

        ELSE
            -- 'review_each' - no automatic selection
            v_updated_count := 0;
    END CASE;

    -- Update report status
    UPDATE public.fix_reports
    SET status = 'fixes_selected', updated_at = NOW()
    WHERE id = p_report_id;

    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.fix_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fix_report_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fix_user_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fix_commits ENABLE ROW LEVEL SECURITY;

-- Fix Reports policies
CREATE POLICY "Users can view their own reports" ON public.fix_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to fix_reports" ON public.fix_reports
    FOR ALL USING (auth.role() = 'service_role');

-- Fix Report Issues policies
CREATE POLICY "Users can view issues for their reports" ON public.fix_report_issues
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.fix_reports fr
            WHERE fr.id = fix_report_id AND fr.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to fix_report_issues" ON public.fix_report_issues
    FOR ALL USING (auth.role() = 'service_role');

-- Fix User Selections policies
CREATE POLICY "Users can manage their selections" ON public.fix_user_selections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.fix_reports fr
            WHERE fr.id = fix_report_id AND fr.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to fix_user_selections" ON public.fix_user_selections
    FOR ALL USING (auth.role() = 'service_role');

-- Fix Commits policies
CREATE POLICY "Users can view their commits" ON public.fix_commits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.fix_reports fr
            WHERE fr.id = fix_report_id AND fr.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role has full access to fix_commits" ON public.fix_commits
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.fix_reports IS 'Main fix analysis session linking to PR review';
COMMENT ON TABLE public.fix_report_issues IS 'Individual issues discovered during analysis with fix availability';
COMMENT ON TABLE public.fix_user_selections IS 'User preferences for which fixes to apply';
COMMENT ON TABLE public.fix_commits IS 'Generated commits for fix application';

COMMENT ON COLUMN public.fix_reports.status IS 'Current status in the fix workflow';
COMMENT ON COLUMN public.fix_report_issues.fix_source IS 'How the fix was generated: pattern reuse, AI, tool native, or manual';
COMMENT ON COLUMN public.fix_user_selections.selection_mode IS 'How user wants to select fixes: all, by severity, by category, specific, or review each';
