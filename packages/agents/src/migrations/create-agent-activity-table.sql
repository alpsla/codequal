-- Create agent_activity table for tracking agent operations and metrics
-- This table stores all agent activity for monitoring and performance analysis

CREATE TABLE IF NOT EXISTS agent_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp BIGINT NOT NULL, -- Unix timestamp in milliseconds
  agent_role TEXT NOT NULL, -- The role of the agent (e.g., 'comparator', 'educator', 'researcher')
  operation TEXT NOT NULL, -- The operation performed (e.g., 'analyze', 'compare', 'research')
  repository_url TEXT, -- Repository being analyzed
  pr_number TEXT, -- Pull request number if applicable
  language TEXT, -- Programming language
  repository_size TEXT, -- Size category: small, medium, large, enterprise
  model_config_id UUID, -- Reference to model configuration
  model_used TEXT NOT NULL, -- The actual model used (e.g., 'gpt-4', 'claude-3')
  model_version TEXT, -- Model version
  is_fallback BOOLEAN DEFAULT FALSE, -- Whether fallback model was used
  input_tokens INTEGER DEFAULT 0, -- Number of input tokens
  output_tokens INTEGER DEFAULT 0, -- Number of output tokens
  duration_ms INTEGER, -- Operation duration in milliseconds
  success BOOLEAN DEFAULT TRUE, -- Whether operation succeeded
  error TEXT, -- Error message if failed
  retry_count INTEGER DEFAULT 0, -- Number of retries
  cost DECIMAL(10, 6) DEFAULT 0, -- Estimated cost in USD
  metadata JSONB, -- Additional metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_activity_timestamp ON agent_activity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_agent_role ON agent_activity(agent_role);
CREATE INDEX IF NOT EXISTS idx_agent_activity_model_used ON agent_activity(model_used);
CREATE INDEX IF NOT EXISTS idx_agent_activity_success ON agent_activity(success);
CREATE INDEX IF NOT EXISTS idx_agent_activity_is_fallback ON agent_activity(is_fallback);
CREATE INDEX IF NOT EXISTS idx_agent_activity_repository ON agent_activity(repository_url);
CREATE INDEX IF NOT EXISTS idx_agent_activity_pr ON agent_activity(pr_number);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_agent_activity_timestamp_agent 
ON agent_activity(timestamp DESC, agent_role);

-- Index for cost analysis
CREATE INDEX IF NOT EXISTS idx_agent_activity_cost 
ON agent_activity(cost) 
WHERE cost > 0;

-- Partial index for failed operations (useful for error analysis)
CREATE INDEX IF NOT EXISTS idx_agent_activity_failures 
ON agent_activity(timestamp DESC, agent_role, error) 
WHERE success = false;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_agent_activity_updated_at
  BEFORE UPDATE ON agent_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust based on your user roles)
GRANT ALL ON agent_activity TO authenticated;
GRANT ALL ON agent_activity TO service_role;
GRANT SELECT ON agent_activity TO anon;

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to insert their own records
CREATE POLICY "Users can insert their own activity" 
  ON agent_activity 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Policy to allow users to view all activity (for dashboards)
CREATE POLICY "Anyone can view activity" 
  ON agent_activity 
  FOR SELECT 
  TO authenticated, anon 
  USING (true);

-- Policy for service role to have full access
CREATE POLICY "Service role has full access" 
  ON agent_activity 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE agent_activity IS 'Tracks all agent operations for monitoring, performance analysis, and cost tracking';

-- Add comments to important columns
COMMENT ON COLUMN agent_activity.timestamp IS 'Unix timestamp in milliseconds when the operation occurred';
COMMENT ON COLUMN agent_activity.agent_role IS 'The role/type of agent performing the operation';
COMMENT ON COLUMN agent_activity.is_fallback IS 'Whether a fallback model was used due to primary model failure';
COMMENT ON COLUMN agent_activity.cost IS 'Estimated cost in USD based on token usage and model pricing';