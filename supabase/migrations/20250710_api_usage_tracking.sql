-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start TIMESTAMPTZ NOT NULL,
  api_calls_count INTEGER DEFAULT 0,
  subscription_tier TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per user per month
  UNIQUE(user_id, month_start)
);

-- Create index for efficient queries
CREATE INDEX idx_api_usage_user_month ON api_usage(user_id, month_start);

-- Add RLS policies
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view own API usage" ON api_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all records
CREATE POLICY "Service role can manage API usage" ON api_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to get current month's API usage
CREATE OR REPLACE FUNCTION get_current_api_usage(p_user_id UUID)
RETURNS TABLE (
  calls_used INTEGER,
  calls_limit INTEGER,
  subscription_tier TEXT,
  reset_date TIMESTAMPTZ
) AS $$
DECLARE
  v_month_start TIMESTAMPTZ;
  v_tier TEXT;
  v_limit INTEGER;
BEGIN
  -- Get start of current month
  v_month_start := date_trunc('month', NOW());
  
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM user_billing
  WHERE user_id = p_user_id;
  
  -- Determine limit based on tier
  v_limit := CASE v_tier
    WHEN 'api' THEN 1000
    WHEN 'individual' THEN 50
    WHEN 'team' THEN NULL -- Unlimited
    ELSE 0
  END;
  
  -- Get usage count
  RETURN QUERY
  SELECT 
    COALESCE(u.api_calls_count, 0) as calls_used,
    v_limit as calls_limit,
    COALESCE(v_tier, 'free') as subscription_tier,
    date_trunc('month', NOW() + INTERVAL '1 month') as reset_date
  FROM api_usage u
  WHERE u.user_id = p_user_id
    AND u.month_start = v_month_start;
    
  -- If no record exists, return zeros
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      0 as calls_used,
      v_limit as calls_limit,
      COALESCE(v_tier, 'free') as subscription_tier,
      date_trunc('month', NOW() + INTERVAL '1 month') as reset_date;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;