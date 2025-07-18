-- Add 'api' to the allowed subscription tiers
ALTER TABLE user_billing 
DROP CONSTRAINT user_billing_subscription_tier_check;

ALTER TABLE user_billing 
ADD CONSTRAINT user_billing_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'individual', 'team', 'api'));