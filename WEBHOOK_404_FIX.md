# Fixing Stripe Webhook 404 Error

## Issue
Stripe webhooks are returning 404 errors, meaning the endpoint URL is incorrect or has changed.

## Quick Fix Steps

### 1. Check Your Current ngrok URL

If using ngrok, your URL might have changed. Run:
```bash
ngrok http 3001
```

You'll see something like:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3001
```

### 2. Update Stripe Webhook Endpoint

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. Click "Update endpoint"
4. Change the URL to your current ngrok URL + `/stripe/webhook`
   - Example: `https://abc123.ngrok-free.app/stripe/webhook`
5. Save changes

### 3. Test the Endpoint

Run this to verify it's working:
```bash
node scripts/test-webhook-endpoint.js
```

You should see "400 Bad Request" with "webhook signature validation failed" - this is good!

### 4. Test with Stripe CLI

```bash
stripe listen --forward-to localhost:3001/stripe/webhook
stripe trigger payment_intent.succeeded
```

## Common Issues

### If Still Getting 404:

1. **Wrong Port**: Make sure ngrok is forwarding to port 3001
2. **API Not Running**: Ensure your API server is running
3. **Path Issue**: The full path must be `/stripe/webhook` (not just `/webhook`)

### If Using Production URL:

Make sure your deployed API includes the webhook routes and is properly deployed.

## Permanent Solution

For production, use a stable URL instead of ngrok:
- Deploy your API to a cloud service
- Use the permanent URL in Stripe
- Example: `https://api.yourdomain.com/stripe/webhook`