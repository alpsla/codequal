-- Essential Vector DB fixes (without embedding_configurations)
-- Run these first to create the missing core tables

-- 1. Create missing analysis tables
CREATE TABLE IF NOT EXISTS analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  repository_url TEXT NOT NULL,
  pr_number INTEGER,
  report_data JSONB NOT NULL,
  vector_ids UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pr_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_url TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  analysis_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  results JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pr_analyses_repo_pr_unique'
  ) THEN
    ALTER TABLE pr_analyses 
    ADD CONSTRAINT pr_analyses_repo_pr_unique 
    UNIQUE(repository_url, pr_number);
  END IF;
END $$;

-- 2. Create vector operation logs table
CREATE TABLE IF NOT EXISTS vector_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_analysis_reports_user_id ON analysis_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_reports_analysis_id ON analysis_reports(analysis_id);
CREATE INDEX IF NOT EXISTS idx_pr_analyses_repo_pr ON pr_analyses(repository_url, pr_number);
CREATE INDEX IF NOT EXISTS idx_vector_logs_created ON vector_operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vector_logs_operation ON vector_operation_logs(operation, success);

-- 4. Enable RLS on new tables
ALTER TABLE analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_operation_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
-- Analysis reports - users see their own
DROP POLICY IF EXISTS "Users view own analysis reports" ON analysis_reports;
CREATE POLICY "Users view own analysis reports" ON analysis_reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access analysis" ON analysis_reports;
CREATE POLICY "Service role full access analysis" ON analysis_reports
  FOR ALL USING (auth.role() = 'service_role');

-- PR analyses - public read, service write
DROP POLICY IF EXISTS "Public read pr analyses" ON pr_analyses;
CREATE POLICY "Public read pr analyses" ON pr_analyses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manage pr analyses" ON pr_analyses;
CREATE POLICY "Service role manage pr analyses" ON pr_analyses
  FOR ALL USING (auth.role() = 'service_role');

-- Operation logs - users see their own
DROP POLICY IF EXISTS "Users view own logs" ON vector_operation_logs;
CREATE POLICY "Users view own logs" ON vector_operation_logs
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Service role full access logs" ON vector_operation_logs;
CREATE POLICY "Service role full access logs" ON vector_operation_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Create helper function to check embedding dimensions
CREATE OR REPLACE FUNCTION check_embedding_dimension(embedding_vector REAL[])
RETURNS TABLE(dimension INTEGER, is_standard BOOLEAN, recommended_action TEXT) AS $$
DECLARE
  vec_dimension INTEGER;
BEGIN
  vec_dimension := array_length(embedding_vector, 1);
  
  RETURN QUERY
  SELECT 
    vec_dimension,
    vec_dimension = 1536,
    CASE 
      WHEN vec_dimension = 1536 THEN 'No action needed - standard dimension'
      WHEN vec_dimension = 3072 THEN 'Truncate to 1536 dimensions'
      WHEN vec_dimension = 1024 THEN 'Pad with zeros to 1536 dimensions'
      ELSE 'Non-standard dimension - requires custom handling'
    END;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to adapt embeddings to standard dimension
CREATE OR REPLACE FUNCTION adapt_embedding_dimension(
  embedding_vector REAL[],
  target_dimension INTEGER DEFAULT 1536
) RETURNS REAL[] AS $$
DECLARE
  current_dimension INTEGER;
  result_vector REAL[];
BEGIN
  current_dimension := array_length(embedding_vector, 1);
  
  IF current_dimension = target_dimension THEN
    RETURN embedding_vector;
  ELSIF current_dimension > target_dimension THEN
    -- Truncate
    result_vector := embedding_vector[1:target_dimension];
  ELSE
    -- Pad with zeros
    result_vector := embedding_vector;
    FOR i IN (current_dimension + 1)..target_dimension LOOP
      result_vector := array_append(result_vector, 0.0::REAL);
    END LOOP;
  END IF;
  
  RETURN result_vector;
END;
$$ LANGUAGE plpgsql;

-- 8. Create monitoring view
CREATE OR REPLACE VIEW vector_operation_summary AS
SELECT 
  date_trunc('hour', created_at) as hour,
  operation,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed,
  ROUND(
    COUNT(*) FILTER (WHERE success = true)::NUMERIC / 
    COUNT(*)::NUMERIC * 100, 
    2
  ) as success_rate,
  AVG(duration_ms) as avg_duration_ms
FROM vector_operation_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', created_at), operation
ORDER BY hour DESC, operation;

-- Grant permissions
GRANT SELECT ON vector_operation_summary TO authenticated;

-- 9. Verify tables were created
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('analysis_reports', 'pr_analyses', 'vector_operation_logs')
    THEN '✅ Created'
    ELSE '❌ Missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('analysis_reports', 'pr_analyses', 'vector_operation_logs')
ORDER BY table_name;

-- 10. Show recent analyses (if any)
SELECT 
  'Recent analyses' as info,
  COUNT(*) as total_analyses,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as latest_analysis
FROM analysis_reports;

-- 11. Show vector operation stats (if any)
SELECT 
  'Vector operations last 24h' as info,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed
FROM vector_operation_logs
WHERE created_at > NOW() - INTERVAL '24 hours';