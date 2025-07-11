-- Create analysis_reports table
CREATE TABLE IF NOT EXISTS analysis_reports (
  id TEXT PRIMARY KEY,
  repository_url TEXT NOT NULL,
  pr_number INTEGER,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID,
  report_data JSONB NOT NULL,
  overview JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  analysis_mode TEXT,
  total_findings INTEGER DEFAULT 0,
  risk_level TEXT,
  analysis_score INTEGER,
  CONSTRAINT unique_report_id UNIQUE (id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analysis_reports_user_id ON analysis_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_created_at ON analysis_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_repository ON analysis_reports(repository_url);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_pr ON analysis_reports(pr_number);

-- Create a view for report summaries
CREATE OR REPLACE VIEW analysis_report_summaries AS
SELECT 
  id,
  repository_url,
  pr_number,
  user_id,
  organization_id,
  created_at,
  analysis_mode,
  total_findings,
  risk_level,
  analysis_score,
  overview->>'executiveSummary' as executive_summary,
  overview->>'estimatedRemediationTime' as estimated_remediation_time
FROM analysis_reports;

-- Grant permissions
GRANT SELECT ON analysis_reports TO authenticated;
GRANT SELECT ON analysis_report_summaries TO authenticated;

-- Create RLS policies
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;

-- Users can see their own reports
CREATE POLICY "Users can view their own reports" ON analysis_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own reports
CREATE POLICY "Users can create their own reports" ON analysis_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to get report with access control
CREATE OR REPLACE FUNCTION get_analysis_report(report_id TEXT)
RETURNS TABLE (
  id TEXT,
  repository_url TEXT,
  pr_number INTEGER,
  user_id UUID,
  organization_id UUID,
  report_data JSONB,
  overview JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  analysis_mode TEXT,
  total_findings INTEGER,
  risk_level TEXT,
  analysis_score INTEGER
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM analysis_reports 
  WHERE id = report_id 
    AND user_id = auth.uid()
  LIMIT 1;
$$;

-- Create function to get latest report for a repository/PR
CREATE OR REPLACE FUNCTION get_latest_analysis_report(
  p_repository_url TEXT,
  p_pr_number INTEGER
)
RETURNS TABLE (
  id TEXT,
  repository_url TEXT,
  pr_number INTEGER,
  user_id UUID,
  organization_id UUID,
  report_data JSONB,
  overview JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  analysis_mode TEXT,
  total_findings INTEGER,
  risk_level TEXT,
  analysis_score INTEGER
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM analysis_reports 
  WHERE repository_url = p_repository_url 
    AND pr_number = p_pr_number
    AND user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;
$$;