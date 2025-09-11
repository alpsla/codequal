-- Update the can_user_scan_repository function to check for payment methods
-- This aligns with the trial enforcement middleware logic

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
  v_has_payment_method BOOLEAN;
BEGIN
  -- Check if user has active subscription
  SELECT (subscription_status = 'active') INTO v_has_subscription
  FROM user_billing
  WHERE user_id = p_user_id;

  -- If user has active subscription, they can scan any repo
  IF v_has_subscription THEN
    RETURN TRUE;
  END IF;

  -- Check if user has payment method
  SELECT EXISTS(
    SELECT 1 FROM payment_methods 
    WHERE user_id = p_user_id
    LIMIT 1
  ) INTO v_has_payment_method;

  -- If user has payment method, they can scan any repo (pay-per-scan)
  IF v_has_payment_method THEN
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