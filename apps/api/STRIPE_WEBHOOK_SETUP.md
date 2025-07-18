# Stripe Webhook Setup Guide

## Issue Identified
Your Stripe subscription was created but the database wasn't updated because:
1. Missing webhook endpoint secret
2. Missing price ID environment variables
3. Raw body parser was missing (now fixed)

## Setup Steps

### 1. Create Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter endpoint URL:
   - **Local testing**: Use ngrok or similar: `https://YOUR_NGROK_URL.ngrok.io/stripe/webhook`
   - **Production**: `https://your-api-domain.com/stripe/webhook`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_method.attached`
   - `payment_method.detached`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)

### 2. Get Your Price IDs

1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. Find your subscription products
3. For each product, click on it and find the Price ID (starts with `price_`)
4. Note down:
   - Individual plan price ID
   - Team plan price ID

### 3. Update Environment Variables

Add these to your `.env` file:

```bash
# Stripe Webhook Secret (from step 1.6)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (from step 2)
STRIPE_INDIVIDUAL_PRICE_ID=price_your_individual_price_id
STRIPE_TEAM_PRICE_ID=price_your_team_price_id
```

### 4. Test Webhook Locally

If testing locally, use ngrok:

```bash
# Install ngrok if needed
npm install -g ngrok

# Start your API server
npm run dev

# In another terminal, expose your local server
ngrok http 3001

# Copy the HTTPS URL and update your Stripe webhook endpoint
```

### 5. Verify Webhook is Working

1. Make a test subscription in Stripe
2. Check your API logs for webhook events
3. Verify database is updated:

```sql
SELECT * FROM user_billing WHERE stripe_customer_id IS NOT NULL;
```

### 6. Manual Fix for Existing Subscription

Since your subscription was already created, you need to manually update the database:

```sql
-- Find your user
SELECT id, email FROM users WHERE email = 'your-email@example.com';

-- Update user_billing with Stripe info
UPDATE user_billing 
SET 
  stripe_customer_id = 'cus_xxxxx', -- Get from Stripe dashboard
  stripe_subscription_id = 'sub_xxxxx', -- Get from Stripe dashboard
  subscription_status = 'active',
  subscription_tier = 'individual', -- or 'team'
  updated_at = NOW()
WHERE user_id = 'your-user-id';
```

To find your Stripe customer and subscription IDs:
1. Go to [Stripe Dashboard > Customers](https://dashboard.stripe.com/customers)
2. Search for your email
3. Click on the customer
4. Copy the Customer ID (cus_xxx)
5. Under "Subscriptions", copy the Subscription ID (sub_xxx)

## Troubleshooting

### Webhook Not Firing
- Check endpoint URL is correct
- Verify signing secret is properly set
- Ensure your server is accessible (use ngrok for local testing)

### Signature Verification Failed
- Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify raw body parser is configured (already fixed in code)

### Tier Not Updating
- Check `STRIPE_INDIVIDUAL_PRICE_ID` and `STRIPE_TEAM_PRICE_ID` match your Stripe price IDs
- Look at API logs for any errors in `determineSubscriptionTier` function

### Database Not Updating
- Check for any database errors in logs
- Verify `user_billing` table exists and has correct schema
- Ensure Stripe customer ID is linked to user

## Testing Checklist

- [ ] Webhook endpoint created in Stripe
- [ ] Signing secret added to `.env`
- [ ] Price IDs added to `.env`
- [ ] Server restarted after `.env` changes
- [ ] Test subscription created
- [ ] Webhook event received (check logs)
- [ ] Database updated correctly
- [ ] User can access premium features