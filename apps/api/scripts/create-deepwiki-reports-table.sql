-- Create table for storing DeepWiki analysis reports
CREATE TABLE IF NOT EXISTS public.deepwiki_reports (
  id BIGSERIAL PRIMARY KEY,
  analysis_id UUID NOT NULL,
  repository_url TEXT NOT NULL,
  branch TEXT,
  commit_hash TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('main', 'feature', 'comparison')),
  
  -- Report data
  issues JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  scores JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  statistics JSONB,
  quality JSONB,
  testing JSONB,
  
  -- Token usage tracking
  token_usage JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT unique_analysis_branch UNIQUE(analysis_id, branch)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_deepwiki_reports_analysis_id ON public.deepwiki_reports(analysis_id);
CREATE INDEX IF NOT EXISTS idx_deepwiki_reports_repository_url ON public.deepwiki_reports(repository_url);
CREATE INDEX IF NOT EXISTS idx_deepwiki_reports_branch ON public.deepwiki_reports(branch);
CREATE INDEX IF NOT EXISTS idx_deepwiki_reports_created_at ON public.deepwiki_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deepwiki_reports_scores ON public.deepwiki_reports USING GIN(scores);

-- Enable RLS
ALTER TABLE public.deepwiki_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service role (full access)
CREATE POLICY "Service role has full access to deepwiki_reports" ON public.deepwiki_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create RLS policy for authenticated users (read-only access to their org's reports)
CREATE POLICY "Users can read their organization's deepwiki reports" ON public.deepwiki_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.url = deepwiki_reports.repository_url
      AND r.organization_id IN (
        SELECT organization_id 
        FROM public.organization_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Grant permissions
GRANT ALL ON public.deepwiki_reports TO service_role;
GRANT SELECT ON public.deepwiki_reports TO authenticated;
GRANT USAGE ON SEQUENCE public.deepwiki_reports_id_seq TO service_role;

-- Add comment
COMMENT ON TABLE public.deepwiki_reports IS 'Stores DeepWiki analysis reports for repositories and pull requests';