# Testing Subscription Flow

## Prerequisites
- Web server running at http://localhost:3000 (or 3002)
- API server running at http://localhost:3001
- User must be logged in with payment method already added

## Steps to Test Subscription

1. **Navigate to Subscribe Page**
   - Go to http://localhost:3000/subscribe
   - You should see three plans: Free Trial, Individual ($29/month), Team ($99/month)

2. **Select a Plan**
   - Click "Subscribe" on the Individual plan
   - This will create a Stripe Checkout session

3. **Complete Stripe Checkout**
   - You'll be redirected to Stripe's hosted checkout page
   - Use test card: 4242 4242 4242 4242
   - Any future expiry date and any CVC
   - Complete the subscription

4. **Verify Subscription**
   - After successful payment, you'll be redirected back to the dashboard
   - Check billing status at http://localhost:3000/scan
   - You should see unlimited scans available

## Test Stripe Price IDs
- Individual Plan: `price_1RjBXQH9VfPdHERjHqKZxVtO`
- Team Plan: `price_1RjBXrH9VfPdHERjNQw4XK8m`

## Common Issues

### "Failed to create checkout session"
- Check browser console for detailed error
- Verify API server is running with proper auth middleware
- Check that Stripe environment variables are set

### Redirect Issues
- Make sure `FRONTEND_URL` env var is set correctly in API
- Default success URL: `/dashboard?subscription=success`
- Default cancel URL: `/subscribe?canceled=true`

## Debug Commands

Check user's current billing status:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/billing/status
```

View Stripe logs:
```bash
stripe logs tail
```