# API Tier Support Note

## Issue
The system currently has a Stripe price for 'api' tier (price_1RjLIsH9VfPdHERjZ8JwAHSV), but the database schema only supports 'free', 'individual', and 'team' tiers.

## Current Workaround
Users with API tier subscriptions are temporarily mapped to 'team' tier in the database.

## Solution
Run the migration `20250118_add_api_tier.sql` to add 'api' to the allowed subscription tiers:

```sql
ALTER TABLE user_billing 
DROP CONSTRAINT user_billing_subscription_tier_check;

ALTER TABLE user_billing 
ADD CONSTRAINT user_billing_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'individual', 'team', 'api'));
```

## Affected Users
- tester4@grr.la (7d3bc8c4-d251-4885-aa8e-6674bc52f1b1) - Has API tier in Stripe but mapped to team tier in database

## Files to Update After Migration
After running the migration, update these files to properly handle 'api' tier:
- `/apps/api/src/routes/billing.ts` - Already handles api tier correctly
- `/scripts/sync-stripe-subscription.js` - Already handles api tier correctly
- Update tester4's record to use 'api' tier instead of 'team'