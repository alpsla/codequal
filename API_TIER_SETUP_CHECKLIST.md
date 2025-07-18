# API Tier Setup Checklist

## ✅ Implementation Steps

### 1. Database Migration
- [ ] Run the SQL migration in Supabase SQL Editor:
  ```sql
  ALTER TABLE user_billing 
  DROP CONSTRAINT IF EXISTS user_billing_subscription_tier_check;
  
  ALTER TABLE user_billing 
  ADD CONSTRAINT user_billing_subscription_tier_check 
  CHECK (subscription_tier IN ('free', 'individual', 'team', 'api'));
  ```

### 2. Update Existing API Tier Users
- [ ] Update tester4 to use 'api' tier:
  ```sql
  UPDATE user_billing 
  SET subscription_tier = 'api', updated_at = NOW()
  WHERE user_id = '7d3bc8c4-d251-4885-aa8e-6674bc52f1b1';
  ```

### 3. Deploy Code Changes
- [ ] Build the API: `cd apps/api && npm run build`
- [ ] Restart the API server
- [ ] Verify webhook handler logs API tier correctly

### 4. Test Webhooks
- [ ] Set up Stripe CLI for local testing:
  ```bash
  stripe listen --forward-to localhost:3001/stripe/webhook
  ```
- [ ] Test subscription update event:
  ```bash
  stripe trigger customer.subscription.updated
  ```

### 5. Verify Setup
- [ ] Run verification script:
  ```bash
  node scripts/verify-api-tier-setup.js
  ```
- [ ] All checks should pass

## 🔧 Troubleshooting

### If webhooks aren't working:
1. Check `STRIPE_WEBHOOK_SECRET` is set correctly
2. Verify webhook endpoint URL in Stripe Dashboard
3. Check API server logs for errors
4. Use ngrok for local testing with real events

### If database constraint fails:
1. Make sure you're connected to the correct Supabase project
2. Check if you have permission to alter constraints
3. Try dropping and recreating the constraint

### Manual sync if needed:
```bash
node scripts/sync-stripe-subscription.js user@email.com
```

## 📝 What Changed

1. **Database**: Added 'api' to allowed subscription tiers
2. **Webhook Handler**: Removed temporary 'api' → 'team' mapping
3. **User Billing**: Updated tester4 to have correct 'api' tier

## 🎯 Expected Result

- Users with API tier subscriptions will have `subscription_tier = 'api'` in database
- Webhook updates will correctly set API tier
- No more manual intervention needed for API subscriptions