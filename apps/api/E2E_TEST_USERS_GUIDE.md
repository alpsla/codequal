# E2E Test Users Guide

## Overview

This guide explains how to set up and use the predefined test users for E2E testing instead of creating new users during test runs.

## Test Users

### 1. Pay-Per-Scan User
- **Email**: `slavataichi@gmail.com`
- **Type**: Pay-per-scan ($0.50 per scan)
- **Subscription Tier**: Free
- **Has Payment Method**: Yes
- **Test Focus**: 
  - Payment flow for individual scans
  - No trial restrictions
  - Unlimited repository access

### 2. Individual Plan User
- **Email**: `rostislav.alpin@gmail.com`
- **Type**: Individual subscription plan
- **Subscription Tier**: Individual
- **Has Payment Method**: Yes
- **Monthly Limit**: 50 web scans
- **Test Focus**:
  - Subscription features
  - Web scan limits
  - Educational content access
  - API key management

## Setup Instructions

### 1. Database Setup

Run the provided SQL script to ensure test users have proper billing data:

```sql
-- In Supabase SQL Editor, run:
scripts/setup-e2e-test-users.sql
```

This script:
- Creates user profiles if they don't exist
- Sets up billing records with appropriate subscription tiers
- Adds test payment methods
- Configures proper test data

### 2. Environment Variables

Add the following to your `.env` file:

```env
# Test user passwords
TEST_USER_PAY_PER_SCAN_PASSWORD=your_password_here
TEST_USER_INDIVIDUAL_PASSWORD=your_password_here

# API URLs
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000
```

### 3. Running the Tests

```bash
# Run all E2E tests
./run-e2e-tests.sh

# Run specific user tests
./run-e2e-tests.sh --pay-per-scan
./run-e2e-tests.sh --individual

# Show setup instructions
./run-e2e-tests.sh --setup
```

## Test Scenarios

### Pay-Per-Scan User Tests

1. **Authentication**: Verify login with existing user
2. **Billing Status**: Confirm payment method exists
3. **Pay-Per-Scan Analysis**: Test single scan charging
4. **No Trial Restrictions**: Verify unlimited repository access
5. **Multiple Scans**: Test sequential scan charges

### Individual Plan User Tests

1. **Authentication**: Verify login with existing user
2. **Billing Status**: Confirm active subscription
3. **Web Scan Limits**: Check monthly scan allowance (50 scans)
4. **API Key Management**: Create and use API keys
5. **PR Analysis**: Run comprehensive analysis
6. **Report Access**: Test HTML and JSON report generation
7. **Educational Content**: Verify enhanced features

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify test user exists in Supabase Auth
   - Check password is correct in environment variables
   - Ensure user email is spelled correctly

2. **Billing Data Missing**
   - Run the setup SQL script
   - Check `user_billing` table has records
   - Verify `payment_methods` table has entries

3. **No Payment Method Found**
   - Ensure setup script was run
   - Check `payment_methods` table
   - Verify Stripe test customer IDs

4. **Subscription Not Active**
   - Update `subscription_status` in `user_billing` table
   - Set to 'active' for Individual plan user

## Database Schema Reference

### Key Tables

- `auth.users`: Supabase authentication users
- `public.user_profiles`: User profile data
- `public.user_billing`: Billing and subscription info
- `public.payment_methods`: Stored payment methods
- `public.trial_usage`: Trial scan tracking

### Important Fields

- `user_billing.subscription_tier`: 'free' or 'individual'
- `user_billing.subscription_status`: 'active' for paid plans
- `user_billing.trial_scans_used`: Number of trial scans used
- `payment_methods.stripe_payment_method_id`: Test payment method ID

## Best Practices

1. **Don't modify test users during tests**: Keep test data consistent
2. **Reset counters periodically**: Clear scan counts if needed
3. **Use mock endpoints**: Avoid real charges during testing
4. **Monitor logs**: Check for authentication or billing errors
5. **Keep passwords secure**: Use strong passwords even for test accounts

## Extending Tests

To add new test users:

1. Create user in Supabase Auth
2. Add billing record in `user_billing`
3. Add payment method if needed
4. Update `test-e2e-config.ts` with new user
5. Create new test file following existing patterns