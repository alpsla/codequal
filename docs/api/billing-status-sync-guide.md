# Billing Status Sync Guide

## Problem Description

User reports having a subscription but the system shows:
- `subscription_tier: free` in `user_billing` table
- `status: pending_verification` (though this shouldn't be in user_profiles)

This indicates a sync issue between Stripe and the database.

## Understanding the Data Model

### Tables Involved:
1. **user_billing** - Stores subscription information
   - `subscription_tier`: 'free', 'individual', or 'team'
   - `subscription_status`: 'active', 'canceled', 'past_due', etc.
   - `stripe_customer_id`: Customer ID in Stripe
   - `stripe_subscription_id`: Subscription ID in Stripe

2. **user_profiles** - Stores user profile data
   - Should NOT have subscription_tier or status fields
   - Contains: email, full_name, avatar_url, etc.

3. **payment_methods** - Stores payment method references

## Diagnosis Steps

### 1. Check Current Status
Run in Supabase SQL Editor:
```sql
SELECT 
    u.email,
    ub.subscription_tier,
    ub.subscription_status,
    ub.stripe_customer_id,
    ub.stripe_subscription_id,
    COUNT(pm.id) as payment_methods
FROM auth.users u
LEFT JOIN user_billing ub ON u.id = ub.user_id
LEFT JOIN payment_methods pm ON u.id = pm.user_id
WHERE u.email = 'rostislav.alpin@gmail.com'
GROUP BY u.email, ub.subscription_tier, ub.subscription_status, 
         ub.stripe_customer_id, ub.stripe_subscription_id;
```

### 2. Check Stripe Status
Run the sync script:
```bash
cd apps/api
npx tsx src/test-scripts/sync-stripe-subscription.ts rostislav.alpin@gmail.com
```

## Common Issues and Fixes

### Issue 1: Missing user_billing record
**Fix**: The sync script will create it automatically

### Issue 2: Outdated subscription status
**Cause**: Webhook didn't fire or was not processed
**Fix**: Run the sync script to update from Stripe

### Issue 3: Wrong subscription tier
**Fix**: The sync script determines tier from price ID

## Manual Fix (SQL)

If you've confirmed the user has an active subscription in Stripe:

```sql
-- Get user ID
WITH user_info AS (
    SELECT id FROM auth.users WHERE email = 'rostislav.alpin@gmail.com'
)
-- Update or insert billing record
INSERT INTO user_billing (
    user_id,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at
) 
SELECT 
    id,
    'individual',  -- or 'team' based on their plan
    'active',
    NOW(),
    NOW()
FROM user_info
ON CONFLICT (user_id) 
DO UPDATE SET
    subscription_tier = EXCLUDED.subscription_tier,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = NOW();
```

## Webhook Configuration

Ensure these Stripe webhooks are configured:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Prevention

1. **Monitor webhook failures** in Stripe dashboard
2. **Add retry logic** for failed webhook processing
3. **Daily sync job** to catch any missed updates
4. **Logging** all billing events for audit trail

## Testing

After fixing, verify:
1. User can access paid features
2. Trial enforcement doesn't block them
3. Payment method is attached
4. Billing events are logged

## Emergency Override

If urgent access is needed while investigating:
```sql
-- Temporarily grant access (use with caution)
UPDATE user_billing 
SET subscription_tier = 'individual', 
    subscription_status = 'active'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

Remember to properly sync with Stripe afterward!