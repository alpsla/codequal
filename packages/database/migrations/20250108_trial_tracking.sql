-- Trial tracking system with single repository limit
-- Each user can only analyze one repository during their trial

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