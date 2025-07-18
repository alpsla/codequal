# Stripe Webhook Troubleshooting Guide

## Issue
When updating a Stripe subscription, the changes are not reflected in the user_billing table.

## Root Causes

1. **Database Constraint**: The 'api' tier is not allowed in the database constraint (only 'free', 'individual', 'team')
2. **Webhook Delivery**: Webhooks may not be reaching your local development environment

## Solutions Applied

### 1. Temporary Fix in Webhook Handler
Updated `/apps/api/src/routes/stripe-webhooks.ts` to:
- Add logging for better debugging
- Map 'api' tier to 'team' temporarily until database is updated
- Add error handling

### 2. Database Migration Required
Run this SQL in Supabase:
```sql
ALTER TABLE user_billing 
DROP CONSTRAINT IF EXISTS user_billing_subscription_tier_check;

ALTER TABLE user_billing 
ADD CONSTRAINT user_billing_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'individual', 'team', 'api'));
```

### 3. Manual Update Script
Created `/scripts/test-webhook-update.js` to manually sync Stripe data

## Testing Webhooks

### For Local Development

1. **Using Stripe CLI** (Recommended):
   ```bash
   # Install Stripe CLI if not already installed
   brew install stripe/stripe-cli/stripe
   
   # Login to Stripe
   stripe login
   
   # Forward webhooks to your local server
   stripe listen --forward-to localhost:3001/stripe/webhook
   
   # In another terminal, trigger test events
   stripe trigger customer.subscription.updated
   ```

2. **Using ngrok** (For testing with real Stripe events):
   ```bash
   # Install ngrok
   brew install ngrok
   
   # Expose your local server
   ngrok http 3001
   
   # Update webhook endpoint in Stripe Dashboard to ngrok URL
   # e.g., https://abc123.ngrok.io/stripe/webhook
   ```

### For Production

1. Ensure webhook endpoint is accessible from internet
2. Verify STRIPE_WEBHOOK_SECRET is set correctly
3. Check API logs for webhook errors

## Current Webhook Configuration

- **Endpoint**: `https://65c68660979b.ngrok-free.app/stripe/webhook`
- **Events**: 
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed

## Manual Sync

If webhooks fail, run:
```bash
node scripts/test-webhook-update.js
```

This will:
1. Check current database state
2. Fetch latest Stripe subscription
3. Update user_billing if needed
4. Show webhook configuration