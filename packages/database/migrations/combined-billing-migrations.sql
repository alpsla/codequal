-- Combined billing migrations for easy application
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Basic billing tables (20250108_billing_tables.sql)
-- ============================================

-- User billing information
CREATE TABLE IF NOT EXISTS user_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired')),
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'individual', 'team')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods stored in Stripe
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT false,
  last_four TEXT,
  brand TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing events for audit trail
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_billing_user_id ON user_billing(user_id);
CREATE INDEX IF NOT EXISTS idx_user_billing_stripe_customer_id ON user_billing(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at);

-- Enable RLS
ALTER TABLE user_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own billing data" ON user_billing
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own billing events" ON billing_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage billing data" ON user_billing
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage payment methods" ON payment_methods
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage billing events" ON billing_events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 2. Trial tracking (20250108_trial_tracking.sql)
-- ============================================

-- Track which repository a user selected for their trial
CREATE TABLE IF NOT EXISTS user_trial_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  repository_url TEXT NOT NULL,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track trial usage (scans)
CREATE TABLE IF NOT EXISTS trial_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repository_url TEXT NOT NULL,
  pr_number INTEGER,
  scan_type TEXT CHECK (scan_type IN ('repository', 'pull_request')),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trial scan count to user_billing
ALTER TABLE user_billing ADD COLUMN IF NOT EXISTS trial_scans_used INTEGER DEFAULT 0;
ALTER TABLE user_billing ADD COLUMN IF NOT EXISTS trial_scans_limit INTEGER DEFAULT 10;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_trial_repository_user_id ON user_trial_repository(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_usage_user_id ON trial_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_usage_repository_url ON trial_usage(repository_url);
CREATE INDEX IF NOT EXISTS idx_trial_usage_scanned_at ON trial_usage(scanned_at);

-- Enable RLS
ALTER TABLE user_trial_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own trial repository" ON user_trial_repository
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own trial usage" ON trial_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage trial data" ON user_trial_repository
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage trial usage" ON trial_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Function to check if user can scan a repository
CREATE OR REPLACE FUNCTION can_user_scan_repository(p_user_id UUID, p_repository_url TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial_repo TEXT;
  v_scans_used INTEGER;
  v_scans_limit INTEGER;
  v_has_subscription BOOLEAN;
BEGIN
  -- Check if user has active subscription
  SELECT (subscription_status = 'active') INTO v_has_subscription
  FROM user_billing
  WHERE user_id = p_user_id;

  -- If user has active subscription, they can scan any repo
  IF v_has_subscription THEN
    RETURN TRUE;
  END IF;

  -- Check trial repository
  SELECT repository_url INTO v_trial_repo
  FROM user_trial_repository
  WHERE user_id = p_user_id;

  -- If no trial repo selected yet, this will be their trial repo
  IF v_trial_repo IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if requested repo matches trial repo
  IF v_trial_repo != p_repository_url THEN
    RETURN FALSE;
  END IF;

  -- Check scan count
  SELECT trial_scans_used, trial_scans_limit INTO v_scans_used, v_scans_limit
  FROM user_billing
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_scans_used, 0) < COALESCE(v_scans_limit, 10);
END;
$$;

-- ============================================
-- 3. Error logging (20250108_error_logging.sql)
-- ============================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  details JSONB,
  stack_trace TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own error logs" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage error logs" ON error_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Function to clean up old error logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- ============================================
-- 4. Insert initial billing record for existing users
-- ============================================

-- Create billing records for existing users
INSERT INTO user_billing (user_id, subscription_tier, trial_scans_used, trial_scans_limit)
SELECT id, 'free', 0, 10
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_billing);