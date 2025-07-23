# Payment Integration Testing Checklist

## Overview
This document provides a comprehensive checklist for testing the CodeQual payment integration with Stripe.

## Pre-Test Setup
- [ ] Stripe test API keys configured in `.env`
- [ ] Stripe webhook endpoint configured
- [ ] Test database initialized
- [ ] Stripe CLI installed (optional but recommended)

## 1. Subscription Flow Testing

### Checkout Session Creation
- [ ] Can create checkout session with valid price ID
- [ ] Returns checkout URL
- [ ] Creates Stripe customer if not exists
- [ ] Links customer to user in database
- [ ] Handles missing price ID error
- [ ] Requires authentication

### Subscription Activation
- [ ] Webhook updates subscription status to 'active'
- [ ] Updates user billing tier correctly
- [ ] Stores subscription ID
- [ ] Sets correct subscription end date
- [ ] Logs billing event

### Subscription Management
- [ ] Can retrieve current subscription status
- [ ] Shows correct tier and pricing
- [ ] Displays renewal date
- [ ] Shows payment method on file

## 2. Pay-Per-Scan Flow Testing

### Setup Intent Creation
- [ ] Creates setup intent for card collection
- [ ] Returns client secret for Stripe.js
- [ ] Creates/retrieves Stripe customer
- [ ] Links to user account

### Payment Method Attachment
- [ ] Stores payment method securely (last 4 only)
- [ ] Marks as default payment method
- [ ] Syncs between Stripe and database
- [ ] Handles multiple payment methods

### Single Scan Charging
- [ ] Charges correct amount ($0.50)
- [ ] Creates payment intent
- [ ] Confirms payment immediately
- [ ] Handles declined cards
- [ ] Updates usage tracking

## 3. Webhook Testing

### Signature Verification
- [ ] Validates webhook signatures
- [ ] Rejects invalid signatures
- [ ] Handles missing signatures
- [ ] Uses correct endpoint secret

### Event Processing
- [ ] `customer.subscription.created` - Updates billing
- [ ] `customer.subscription.updated` - Changes tier
- [ ] `customer.subscription.deleted` - Cancels access
- [ ] `invoice.payment_succeeded` - Logs payment
- [ ] `invoice.payment_failed` - Sends notification
- [ ] `payment_method.attached` - Stores method
- [ ] `payment_method.detached` - Removes method
- [ ] `checkout.session.completed` - Activates subscription

### Error Handling
- [ ] Logs all webhook events
- [ ] Returns 200 even on processing errors
- [ ] Implements idempotency
- [ ] Handles unknown event types

## 4. Security Testing

### API Security
- [ ] All endpoints require authentication
- [ ] Rate limiting on payment endpoints
- [ ] No sensitive data in responses
- [ ] CORS configured correctly

### Data Security
- [ ] No full card numbers stored
- [ ] Payment methods encrypted at rest
- [ ] PCI compliance maintained
- [ ] Audit trail for all transactions

### Error Messages
- [ ] No sensitive data in error messages
- [ ] Generic errors for payment failures
- [ ] Detailed logs server-side only

## 5. Edge Cases

### Network Issues
- [ ] Handles Stripe API timeouts
- [ ] Retries on network errors
- [ ] Graceful degradation

### Data Consistency
- [ ] Handles webhook replay
- [ ] Prevents duplicate charges
- [ ] Syncs state on mismatch

### User Experience
- [ ] Clear error messages
- [ ] Loading states during payment
- [ ] Success/failure notifications
- [ ] Redirect handling

## 6. Performance Testing

### Load Testing
- [ ] Multiple concurrent checkouts
- [ ] Webhook processing under load
- [ ] Database query optimization

### Response Times
- [ ] Checkout session < 2s
- [ ] Payment method save < 1s
- [ ] Billing status < 500ms

## 7. Integration Testing

### Frontend Integration
- [ ] Stripe.js loads correctly
- [ ] Card element renders
- [ ] 3D Secure handling
- [ ] Mobile responsive

### Backend Integration
- [ ] Billing middleware works
- [ ] Trial enforcement active
- [ ] Usage tracking accurate
- [ ] Email notifications sent

## Manual Test Scenarios

### Happy Path - Individual Subscription
1. Create account
2. View pricing page
3. Select Individual plan
4. Complete checkout
5. Verify subscription active
6. Perform scans
7. Check usage tracking

### Happy Path - Pay-Per-Scan
1. Create account
2. Add payment method
3. Trigger scan
4. Verify charge
5. Check scan results
6. View billing history

### Error Scenarios
1. Declined card
2. Expired subscription
3. Webhook failure
4. Network timeout
5. Invalid coupon code

## Test Data

### Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`
- Insufficient funds: `4000 0000 0000 9995`

### Test Webhooks
Use Stripe CLI: `stripe listen --forward-to localhost:3001/api/stripe/webhook`

## Automation Status

### Automated Tests
- ✅ Unit tests for billing routes
- ✅ Integration tests for Stripe service
- ✅ E2E tests for full payment flow
- ✅ Webhook signature verification

### Manual Tests Required
- [ ] 3D Secure flow
- [ ] Subscription upgrade/downgrade
- [ ] Refund processing
- [ ] Tax calculation

## Post-Test Cleanup
- [ ] Remove test customers from Stripe
- [ ] Clear test data from database
- [ ] Review error logs
- [ ] Update documentation