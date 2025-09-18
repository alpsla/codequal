-- Model Research Schema for Supabase
-- Stores quarterly AI model research results and context-specific selections

-- Main table for quarterly model research
CREATE TABLE IF NOT EXISTS model_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id VARCHAR(255) UNIQUE NOT NULL,
  provider VARCHAR(100) NOT NULL,
  quality_score DECIMAL(5,2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  speed_score DECIMAL(5,2) NOT NULL CHECK (speed_score >= 0 AND speed_score <= 100),
  price_score DECIMAL(5,2) NOT NULL CHECK (price_score >= 0 AND price_score <= 100),
  context_length INTEGER,
  specializations TEXT[] DEFAULT '{}',
  optimal_for JSONB NOT NULL DEFAULT '{"languages": [], "repo_sizes": [], "frameworks": []}',
  research_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_research_date TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_model_research_quality ON model_research(quality_score DESC);
CREATE INDEX idx_model_research_provider ON model_research(provider);
CREATE INDEX idx_model_research_optimal_for ON model_research USING GIN(optimal_for);
CREATE INDEX idx_model_research_date ON model_research(research_date);

-- Table for context-specific research (orchestrator requests)
CREATE TABLE IF NOT EXISTS model_context_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id VARCHAR(255) NOT NULL,
  context JSONB NOT NULL,
  research_type VARCHAR(50) DEFAULT 'specific', -- 'specific' or 'scheduled'
  quality_score DECIMAL(5,2),
  speed_score DECIMAL(5,2),
  price_score DECIMAL(5,2),
  total_score DECIMAL(5,2),
  research_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for context lookups
CREATE INDEX idx_context_research_model ON model_context_research(model_id);
CREATE INDEX idx_context_research_context ON model_context_research USING GIN(context);
CREATE INDEX idx_context_research_expires ON model_context_research(expires_at);

-- Metadata table for tracking research schedule
CREATE TABLE IF NOT EXISTS model_research_metadata (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'singleton',
  last_research_date TIMESTAMP WITH TIME ZONE,
  next_scheduled_research TIMESTAMP WITH TIME ZONE,
  total_models_researched INTEGER DEFAULT 0,
  research_version VARCHAR(20) DEFAULT '1.0.0',
  research_config JSONB DEFAULT '{"quality_weight": 0.7, "speed_weight": 0.2, "price_weight": 0.1}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for orchestrator research requests
CREATE TABLE IF NOT EXISTS model_research_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type VARCHAR(100) NOT NULL,
  context JSONB NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal', -- 'high', 'normal', 'low'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  requester VARCHAR(100),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completion_date TIMESTAMP WITH TIME ZONE,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for request processing
CREATE INDEX idx_research_requests_status ON model_research_requests(status);
CREATE INDEX idx_research_requests_priority ON model_research_requests(priority);
CREATE INDEX idx_research_requests_date ON model_research_requests(request_date);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_model_research_updated_at BEFORE UPDATE ON model_research
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_research_metadata_updated_at BEFORE UPDATE ON model_research_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired context research
CREATE OR REPLACE FUNCTION cleanup_expired_research()
RETURNS void AS $$
BEGIN
  DELETE FROM model_context_research 
  WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Row Level Security (RLS) Policies
ALTER TABLE model_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_context_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_research_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_research_requests ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to model_research" ON model_research
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to model_context_research" ON model_context_research
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to model_research_metadata" ON model_research_metadata
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to model_research_requests" ON model_research_requests
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Sample data for initial setup (can be removed after first run)
INSERT INTO model_research_metadata (
  id,
  last_research_date,
  next_scheduled_research,
  total_models_researched,
  research_version
) VALUES (
  'singleton',
  NULL, -- Will trigger initial research
  NOW() + INTERVAL '90 days',
  0,
  '1.0.0'
) ON CONFLICT (id) DO NOTHING;