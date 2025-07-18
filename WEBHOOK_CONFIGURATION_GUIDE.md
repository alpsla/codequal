# Stripe Webhook Configuration Guide

## 🚨 Critical Issue

Users are subscribing but their Supabase billing records aren't updating because:
1. The `checkout.session.completed` webhook event is not configured
2. Without this event, Stripe customer IDs don't get linked to users
3. Subsequent subscription updates fail because they can't find the user

## 🔧 How to Fix

### Step 1: Update Webhook Events in Stripe Dashboard

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint (e.g., `https://your-domain.com/stripe/webhook`)
3. Click "Update endpoint"
4. In the "Events to send" section, add these events:
   - ✅ `checkout.session.completed` (CRITICAL - currently missing!)
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click "Update endpoint"

### Step 2: Verify Webhook Secret

Make sure your `STRIPE_WEBHOOK_SECRET` environment variable matches the signing secret shown in Stripe.

### Step 3: Test the Webhook

Using Stripe CLI:
```bash
stripe listen --forward-to localhost:3001/stripe/webhook
stripe trigger checkout.session.completed
```

## 📋 Quick Fixes for Affected Users

### Fix Single User
```bash
node scripts/fix-user-billing-by-email.js <user-id> <email>
```

### Find All Unlinked Users
```bash
node scripts/find-unlinked-subscriptions.js
```

### Batch Fix All Users
```bash
node scripts/batch-fix-unlinked-subscriptions.js
```

## 🎯 Expected Behavior After Fix

1. User completes checkout → `checkout.session.completed` fires
2. Webhook links Stripe customer ID to user_billing
3. Future subscription updates work automatically
4. No more manual fixes needed!

## 🔍 Monitoring

Check webhook logs in Stripe Dashboard:
- Successful events should show 200 responses
- Failed events will show errors and retry attempts

## 💡 Prevention

1. Always include `checkout.session.completed` in webhook events
2. Monitor for users with 'free' tier but active Stripe subscriptions
3. Set up alerts for webhook failures