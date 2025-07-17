-- Vector DB Retention Policy Database Functions
-- These functions support the retention policy system

-- Function to compact similar embeddings
CREATE OR REPLACE FUNCTION compact_similar_embeddings(
  similarity_threshold FLOAT DEFAULT 0.95,
  batch_size INT DEFAULT 100
)
RETURNS TABLE(compacted_count INT) AS $$
DECLARE
  compacted INT := 0;
BEGIN
  -- This is a placeholder for the actual implementation
  -- In production, this would:
  -- 1. Find groups of very similar embeddings using pgvector similarity search
  -- 2. Merge metadata and content
  -- 3. Keep one representative embedding
  -- 4. Delete the duplicates
  
  -- For now, return 0 compacted
  RETURN QUERY SELECT 0 AS compacted_count;
END;
$$ LANGUAGE plpgsql;

-- Create index for efficient retention queries if not exists
CREATE INDEX IF NOT EXISTS idx_tool_results_created_at 
ON tool_results_vectors ((metadata->>'created_at'));

CREATE INDEX IF NOT EXISTS idx_tool_results_repository_id 
ON tool_results_vectors ((metadata->>'repository_id'));

CREATE INDEX IF NOT EXISTS idx_tool_results_severity 
ON tool_results_vectors ((metadata->>'severity'));

-- Function to get storage statistics
CREATE OR REPLACE FUNCTION get_vector_storage_stats()
RETURNS TABLE(
  table_name TEXT,
  record_count BIGINT,
  total_size TEXT,
  index_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'tool_results_vectors'::TEXT AS table_name,
    COUNT(*)::BIGINT AS record_count,
    pg_size_pretty(pg_total_relation_size('tool_results_vectors')) AS total_size,
    pg_size_pretty(pg_indexes_size('tool_results_vectors')) AS index_size
  FROM tool_results_vectors
  
  UNION ALL
  
  SELECT 
    'analysis_vectors'::TEXT AS table_name,
    COUNT(*)::BIGINT AS record_count,
    pg_size_pretty(pg_total_relation_size('analysis_vectors')) AS total_size,
    pg_size_pretty(pg_indexes_size('analysis_vectors')) AS index_size
  FROM analysis_vectors;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old records before deletion
CREATE OR REPLACE FUNCTION archive_old_tool_results(days_old INT DEFAULT 90)
RETURNS TABLE(archived_count INT) AS $$
DECLARE
  cutoff_date TIMESTAMP;
  archived INT := 0;
BEGIN
  cutoff_date := NOW() - INTERVAL '1 day' * days_old;
  
  -- Create archive table if not exists
  CREATE TABLE IF NOT EXISTS tool_results_archive (
    id TEXT PRIMARY KEY,
    repository_id TEXT,
    tool_id TEXT,
    severity TEXT,
    findings_count INT,
    created_at TIMESTAMP,
    archived_at TIMESTAMP DEFAULT NOW()
  );
  
  -- Archive summary data
  INSERT INTO tool_results_archive (id, repository_id, tool_id, severity, findings_count, created_at)
  SELECT 
    id,
    metadata->>'repository_id',
    metadata->>'tool_id',
    metadata->>'severity',
    (metadata->'findings_count')::INT,
    (metadata->>'created_at')::TIMESTAMP
  FROM tool_results_vectors
  WHERE (metadata->>'created_at')::TIMESTAMP < cutoff_date
  ON CONFLICT (id) DO NOTHING;
  
  GET DIAGNOSTICS archived := ROW_COUNT;
  
  RETURN QUERY SELECT archived AS archived_count;
END;
$$ LANGUAGE plpgsql;

-- Create retention policy tracking table
CREATE TABLE IF NOT EXISTS retention_policy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date TIMESTAMP DEFAULT NOW(),
  records_deleted INT DEFAULT 0,
  records_archived INT DEFAULT 0,
  space_freed_mb FLOAT DEFAULT 0,
  duration_ms INT DEFAULT 0,
  status TEXT DEFAULT 'running',
  error_message TEXT
);

-- Function to log retention policy runs
CREATE OR REPLACE FUNCTION log_retention_run(
  p_records_deleted INT,
  p_records_archived INT,
  p_space_freed_mb FLOAT,
  p_duration_ms INT,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  run_id UUID;
BEGIN
  INSERT INTO retention_policy_runs (
    records_deleted,
    records_archived,
    space_freed_mb,
    duration_ms,
    status,
    error_message
  ) VALUES (
    p_records_deleted,
    p_records_archived,
    p_space_freed_mb,
    p_duration_ms,
    p_status,
    p_error_message
  ) RETURNING id INTO run_id;
  
  RETURN run_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION compact_similar_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION get_vector_storage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_tool_results TO service_role;
GRANT EXECUTE ON FUNCTION log_retention_run TO service_role;
GRANT SELECT ON retention_policy_runs TO authenticated;