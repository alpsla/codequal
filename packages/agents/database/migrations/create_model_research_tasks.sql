-- Create model_research_tasks table for urgent research requests
CREATE TABLE IF NOT EXISTS model_research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(100) NOT NULL,
  language VARCHAR(50) NOT NULL,
  size_category VARCHAR(20) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  priority VARCHAR(20) DEFAULT 'normal', -- urgent, high, normal, low
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  requested_by VARCHAR(100),
  completed_at TIMESTAMP WITH TIME ZONE,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for task processing
CREATE INDEX idx_research_tasks_status ON model_research_tasks(status);
CREATE INDEX idx_research_tasks_priority ON model_research_tasks(priority);
CREATE INDEX idx_research_tasks_requested ON model_research_tasks(requested_at);

-- Unique constraint to prevent duplicate tasks
CREATE UNIQUE INDEX idx_unique_pending_task 
ON model_research_tasks(role, language, size_category) 
WHERE status IN ('pending', 'processing');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_model_research_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_model_research_tasks_updated_at 
BEFORE UPDATE ON model_research_tasks
FOR EACH ROW EXECUTE FUNCTION update_model_research_tasks_updated_at();

-- Row Level Security
ALTER TABLE model_research_tasks ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to model_research_tasks" 
ON model_research_tasks
FOR ALL USING (auth.jwt()->>'role' = 'service_role');