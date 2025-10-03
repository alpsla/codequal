-- Migration: Add skill tracking and gamification tables
-- Version: 003
-- Date: 2025-10-03
-- Purpose: Enable developer skill tracking, trend analysis, and gamification

-- ============================================================================
-- Table 1: skill_scores
-- Purpose: Track individual PR skill scores for trend analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS skill_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Developer identification
  developer_email TEXT NOT NULL,
  developer_name TEXT,

  -- Repository context
  repository TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  branch TEXT,

  -- Scores
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),

  -- Category breakdown
  security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  architecture_score INTEGER CHECK (architecture_score >= 0 AND architecture_score <= 100),
  dependency_score INTEGER CHECK (dependency_score >= 0 AND dependency_score <= 100),
  code_quality_score INTEGER CHECK (code_quality_score >= 0 AND code_quality_score <= 100),

  -- Issue counts
  new_issues_count INTEGER DEFAULT 0,
  resolved_issues_count INTEGER DEFAULT 0,
  critical_issues_count INTEGER DEFAULT 0,
  high_issues_count INTEGER DEFAULT 0,
  medium_issues_count INTEGER DEFAULT 0,
  low_issues_count INTEGER DEFAULT 0,

  -- Metadata
  analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  analysis_duration_ms INTEGER,
  language TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_skill_scores_developer
  ON skill_scores(developer_email, analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_scores_repository
  ON skill_scores(repository, analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_scores_pr
  ON skill_scores(repository, pr_number);

-- ============================================================================
-- Table 2: developer_metrics
-- Purpose: Aggregated developer stats for leaderboards and tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS developer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Developer identification
  developer_email TEXT NOT NULL UNIQUE,
  developer_name TEXT,

  -- Current scores
  current_score INTEGER DEFAULT 50 CHECK (current_score >= 0 AND current_score <= 100),
  best_score INTEGER DEFAULT 0 CHECK (best_score >= 0 AND best_score <= 100),
  average_score INTEGER DEFAULT 50 CHECK (average_score >= 0 AND average_score <= 100),

  -- Category averages
  avg_security_score INTEGER DEFAULT 50 CHECK (avg_security_score >= 0 AND avg_security_score <= 100),
  avg_performance_score INTEGER DEFAULT 50 CHECK (avg_performance_score >= 0 AND avg_performance_score <= 100),
  avg_architecture_score INTEGER DEFAULT 50 CHECK (avg_architecture_score >= 0 AND avg_architecture_score <= 100),
  avg_dependency_score INTEGER DEFAULT 50 CHECK (avg_dependency_score >= 0 AND avg_dependency_score <= 100),
  avg_code_quality_score INTEGER DEFAULT 50 CHECK (avg_code_quality_score >= 0 AND avg_code_quality_score <= 100),

  -- Statistics
  total_prs_analyzed INTEGER DEFAULT 0,
  total_issues_resolved INTEGER DEFAULT 0,
  total_issues_introduced INTEGER DEFAULT 0,

  -- Streaks and achievements
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  first_analysis_at TIMESTAMP,
  last_analysis_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for leaderboards
CREATE INDEX IF NOT EXISTS idx_developer_metrics_score
  ON developer_metrics(current_score DESC);

CREATE INDEX IF NOT EXISTS idx_developer_metrics_email
  ON developer_metrics(developer_email);

CREATE INDEX IF NOT EXISTS idx_developer_metrics_avg_score
  ON developer_metrics(average_score DESC);

-- ============================================================================
-- Table 3: analysis_results
-- Purpose: Complete PR analysis storage for historical reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- PR context
  repository TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  pr_title TEXT,
  pr_author TEXT,
  branch TEXT,
  base_branch TEXT DEFAULT 'main',

  -- Decision
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'DECLINED')),
  confidence DECIMAL(3,2),
  reason TEXT,

  -- Scores
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  grade TEXT CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),

  -- Issue summary
  new_issues_count INTEGER DEFAULT 0,
  existing_issues_count INTEGER DEFAULT 0,
  resolved_issues_count INTEGER DEFAULT 0,
  blocking_issues_count INTEGER DEFAULT 0,

  -- Full report
  full_report_json JSONB,
  markdown_report TEXT,

  -- Metadata
  language TEXT,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  analysis_duration_ms INTEGER,
  tools_used TEXT[],

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one analysis per PR
  UNIQUE(repository, pr_number)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_analysis_results_pr
  ON analysis_results(repository, pr_number);

CREATE INDEX IF NOT EXISTS idx_analysis_results_author
  ON analysis_results(pr_author, analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_results_decision
  ON analysis_results(decision, analyzed_at DESC);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE skill_scores IS 'Individual PR skill scores for trend analysis and gamification';
COMMENT ON TABLE developer_metrics IS 'Aggregated developer statistics for leaderboards and achievements';
COMMENT ON TABLE analysis_results IS 'Complete PR analysis results for historical tracking';

COMMENT ON COLUMN skill_scores.overall_score IS 'Overall skill score (0-100) calculated from issues';
COMMENT ON COLUMN skill_scores.quality_score IS 'Quality score from V9 analysis (0-100)';
COMMENT ON COLUMN developer_metrics.current_score IS 'Most recent skill score for this developer';
COMMENT ON COLUMN developer_metrics.badges IS 'JSON array of earned badges and achievements';
COMMENT ON COLUMN analysis_results.full_report_json IS 'Complete analysis result as JSON for API access';
COMMENT ON COLUMN analysis_results.markdown_report IS 'Formatted markdown report for display';

-- ============================================================================
-- Migration complete
-- ============================================================================
