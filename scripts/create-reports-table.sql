-- Create reports table for storing analysis reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repository_url TEXT NOT NULL,
  pr_number INTEGER,
  report_data JSONB NOT NULL,
  overview JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  analysis_mode TEXT,
  total_findings INTEGER,
  risk_level TEXT,
  analysis_score NUMERIC(5,2)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_repository_url ON public.reports(repository_url);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_report_id ON public.reports(report_id);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own reports
CREATE POLICY "Users can view their own reports"
  ON public.reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for service role to manage all reports
CREATE POLICY "Service role can manage all reports"
  ON public.reports
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT SELECT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;