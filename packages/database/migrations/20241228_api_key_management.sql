-- API Key Management Schema
-- This migration creates tables for API key authentication and usage tracking

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL DEFAULT 'ck_',
  key_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of the actual key
  
  -- Permissions and limits
  permissions JSONB DEFAULT '{"endpoints": "*"}', -- Can restrict to specific endpoints
  usage_limit INTEGER NOT NULL DEFAULT 1000,
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  
  -- Status
  active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  
  -- Indexes
  INDEX idx_api_keys_user_id (user_id),
  INDEX idx_api_keys_key_hash (key_hash),
  INDEX idx_api_keys_active (active),
  INDEX idx_api_keys_expires_at (expires_at)
);

-- API Usage Logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  
  -- Request details
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_params JSONB DEFAULT '{}',
  request_headers JSONB DEFAULT '{}',
  
  -- Response details
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  
  -- Usage metrics
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for analytics
  INDEX idx_usage_logs_api_key_id (api_key_id),
  INDEX idx_usage_logs_timestamp (timestamp),
  INDEX idx_usage_logs_endpoint (endpoint),
  INDEX idx_usage_logs_status_code (status_code)
);

-- API Subscriptions table (links API keys to Stripe subscriptions)
CREATE TABLE IF NOT EXISTS api_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stripe data
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255) NOT NULL,
  
  -- Plan details
  plan_name VARCHAR(50) NOT NULL CHECK (plan_name IN ('starter', 'growth', 'scale', 'enterprise')),
  usage_limit INTEGER NOT NULL,
  api_key_limit INTEGER NOT NULL DEFAULT 3,
  
  -- Billing
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_subscriptions_user_id (user_id),
  INDEX idx_subscriptions_stripe_customer (stripe_customer_id),
  INDEX idx_subscriptions_status (status)
);

-- Monthly usage summaries (for billing)
CREATE TABLE IF NOT EXISTS api_usage_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- Usage metrics
  total_requests INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Breakdown by endpoint
  usage_by_endpoint JSONB DEFAULT '{}',
  
  -- Billing status
  billed BOOLEAN DEFAULT false,
  stripe_invoice_id VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one summary per user per month
  UNIQUE(user_id, year, month),
  INDEX idx_usage_summaries_period (year, month),
  INDEX idx_usage_summaries_user_id (user_id)
);

-- Rate limiting cache (optional, can use Redis instead)
CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_hash VARCHAR(64) NOT NULL,
  window_type VARCHAR(20) NOT NULL CHECK (window_type IN ('minute', 'hour', 'day')),
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  
  PRIMARY KEY (key_hash, window_type, window_start),
  INDEX idx_rate_limits_window (window_start)
);

-- Function to update usage count
CREATE OR REPLACE FUNCTION increment_api_usage(
  p_api_key_id UUID,
  p_tokens_used INTEGER DEFAULT 0,
  p_cost_usd DECIMAL DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  v_usage_limit INTEGER;
  v_current_usage INTEGER;
BEGIN
  -- Get current usage and limit
  SELECT usage_limit, usage_count 
  INTO v_usage_limit, v_current_usage
  FROM api_keys 
  WHERE id = p_api_key_id AND active = true;
  
  -- Check if within limits
  IF v_current_usage >= v_usage_limit THEN
    RETURN false;
  END IF;
  
  -- Update usage count
  UPDATE api_keys 
  SET 
    usage_count = usage_count + 1,
    last_used_at = CURRENT_TIMESTAMP
  WHERE id = p_api_key_id;
  
  -- Update monthly summary
  INSERT INTO api_usage_summaries (
    user_id, year, month, total_requests, total_tokens, total_cost_usd
  )
  SELECT 
    user_id, 
    EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_TIMESTAMP)::INTEGER,
    1, p_tokens_used, p_cost_usd
  FROM api_keys WHERE id = p_api_key_id
  ON CONFLICT (user_id, year, month) DO UPDATE
  SET 
    total_requests = api_usage_summaries.total_requests + 1,
    total_tokens = api_usage_summaries.total_tokens + p_tokens_used,
    total_cost_usd = api_usage_summaries.total_cost_usd + p_cost_usd,
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key_hash VARCHAR(64),
  p_limit_per_minute INTEGER,
  p_limit_per_hour INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_minute_count INTEGER;
  v_hour_count INTEGER;
BEGIN
  -- Check minute limit
  SELECT COALESCE(SUM(request_count), 0) INTO v_minute_count
  FROM api_rate_limits
  WHERE key_hash = p_key_hash 
    AND window_type = 'minute'
    AND window_start > CURRENT_TIMESTAMP - INTERVAL '1 minute';
  
  IF v_minute_count >= p_limit_per_minute THEN
    RETURN false;
  END IF;
  
  -- Check hour limit
  SELECT COALESCE(SUM(request_count), 0) INTO v_hour_count
  FROM api_rate_limits
  WHERE key_hash = p_key_hash 
    AND window_type = 'hour'
    AND window_start > CURRENT_TIMESTAMP - INTERVAL '1 hour';
  
  IF v_hour_count >= p_limit_per_hour THEN
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO api_rate_limits (key_hash, window_type, window_start, request_count)
  VALUES 
    (p_key_hash, 'minute', date_trunc('minute', CURRENT_TIMESTAMP), 1),
    (p_key_hash, 'hour', date_trunc('hour', CURRENT_TIMESTAMP), 1)
  ON CONFLICT (key_hash, window_type, window_start) DO UPDATE
  SET request_count = api_rate_limits.request_count + 1;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits() RETURNS void AS $$
BEGIN
  DELETE FROM api_rate_limits 
  WHERE window_start < CURRENT_TIMESTAMP - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own API keys
CREATE POLICY "Users can view own api keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own api keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Users can view own usage logs" ON api_usage_logs
  FOR SELECT USING (
    api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own subscriptions" ON api_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage summaries" ON api_usage_summaries
  FOR SELECT USING (auth.uid() = user_id);