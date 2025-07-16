-- Create analysis_reports table for storing generated reports
CREATE TABLE IF NOT EXISTS public.analysis_reports (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    repository_url TEXT NOT NULL,
    pr_number INTEGER NOT NULL,
    analysis_id TEXT NOT NULL,
    report_data JSONB NOT NULL,
    report_format TEXT DEFAULT 'json',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analysis_reports_user_id ON public.analysis_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_analysis_id ON public.analysis_reports(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_created_at ON public.analysis_reports(created_at DESC);

-- Add RLS policies
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports" ON public.analysis_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can manage all reports
CREATE POLICY "Service role can manage all reports" ON public.analysis_reports
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
GRANT SELECT ON public.analysis_reports TO authenticated;
GRANT ALL ON public.analysis_reports TO service_role;

-- Add comment
COMMENT ON TABLE public.analysis_reports IS 'Stores generated analysis reports with their data';
EOF < /dev/null