# API Tier Implementation Guide

## Current Status
- The Stripe API price ID exists: `price_1RjLIsH9VfPdHERjZ8JwAHSV`
- The webhook handler already supports 'api' tier
- The billing routes accept any price ID including API tier
- The database constraint needs to be updated to allow 'api' tier

## SQL Migration Required

Run this SQL in your Supabase SQL Editor:

```sql
-- Add 'api' to the allowed subscription tiers
ALTER TABLE user_billing 
DROP CONSTRAINT IF EXISTS user_billing_subscription_tier_check;

ALTER TABLE user_billing 
ADD CONSTRAINT user_billing_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'individual', 'team', 'api'));

-- Update tester4 to use api tier
UPDATE user_billing 
SET subscription_tier = 'api',
    updated_at = NOW()
WHERE user_id = '7d3bc8c4-d251-4885-aa8e-6674bc52f1b1';

-- Verify the changes
SELECT user_id, subscription_tier, subscription_status 
FROM user_billing 
WHERE subscription_tier = 'api';
```

## Code Already Supporting API Tier

1. **Stripe Webhooks** (`/apps/api/src/routes/stripe-webhooks.ts`):
   - Already maps `STRIPE_API_PRICE_ID` to 'api' tier

2. **Billing Routes** (`/apps/api/src/routes/billing.ts`):
   - Accepts any price ID for checkout sessions
   - Will work with API price ID

3. **Sync Scripts** (`/scripts/sync-stripe-subscription.js`):
   - Already maps API price ID to 'api' tier

## No Code Changes Required

The system is already set up to handle the API tier. You only need to:

1. Run the SQL migration above in Supabase
2. The system will automatically handle API tier subscriptions

## Testing

After running the migration:

1. Check tester4's subscription:
   ```bash
   node scripts/check-user-billing.js 7d3bc8c4-d251-4885-aa8e-6674bc52f1b1
   ```

2. Create a new API tier subscription through Stripe and verify it syncs correctly

## Future Considerations

- The `SubscriptionTier` enum in `/packages/agents/src/multi-agent/supabase-auth-service.ts` uses different values (free, pro, enterprise) and may need to be aligned with the actual tiers (free, individual, team, api) if this service is used.