# E2E Test Setup Guide

## Current Status

Based on your query results:

1. **slavataichi@gmail.com** ✅
   - Has user profile ("Test User Updated")
   - Has payment method
   - Subscription: Free (pay-per-scan)
   - ❌ **Missing: API key**

2. **rostislav.alpin@gmail.com** ⚠️
   - ❌ **Missing: User profile** 
   - Has payment method
   - Subscription: Individual (active)
   - ✅ Has API key

## Setup Steps

### Step 1: Fix Missing Profile

Run this SQL in Supabase to create the missing profile:
```sql
-- Run: scripts/fix-missing-profile.sql
```

This will:
- Create the missing profile for rostislav.alpin@gmail.com
- Check why the automatic trigger didn't work

### Step 2: Generate API Keys

Since slavataichi@gmail.com has no API key:

1. **Log in as slavataichi@gmail.com** using Magic Link
2. Navigate to Settings/API Keys in your web app
3. Create a new API key
4. **Save the key immediately** (shown only once!)

### Step 3: Get Existing API Key

For rostislav.alpin@gmail.com who already has an API key:
- If you saved it previously, use that
- If not, you'll need to regenerate it through the web UI

### Step 4: Set Environment Variables

Create or update your `.env` file:
```bash
# API Keys for E2E tests
TEST_API_KEY_PAY_PER_SCAN=ck_[key_for_slavataichi]
TEST_API_KEY_INDIVIDUAL=ck_[key_for_rostislav]

# Supabase (for data verification)
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_KEY=[your-service-key]
```

### Step 5: Run E2E Tests

```bash
cd apps/api

# Run all tests
npx ts-node src/test-scripts/test-e2e-with-api-keys.ts

# Or run individual user tests
npx ts-node src/test-scripts/test-e2e-pay-per-scan.ts
npx ts-node src/test-scripts/test-e2e-individual.ts
```

## What the Tests Validate

The E2E tests will verify:

1. **Data Integrity**
   - User profiles exist and are complete
   - Billing records match expected subscription types
   - Payment methods are properly linked

2. **API Authentication**
   - API keys authenticate correctly
   - Proper rate limiting is applied
   - Correct permissions based on subscription

3. **Business Logic**
   - Pay-per-scan user: Can scan any repo, charged per scan
   - Individual user: Monthly limit of 50 scans, all features

4. **PR Analysis Flow**
   - Analysis can be started
   - Progress tracking works
   - Results are retrievable
   - Reports are generated

## Troubleshooting

### Profile Creation Issues
If profiles aren't being created automatically:
1. Check if the trigger exists: Look for `on_auth_user_created_or_updated`
2. The trigger might not have been applied to your database
3. Consider running the migration: `20250106_fix_auth_profile_sync.sql`

### API Key Issues
- API keys are hashed, so you can't retrieve them after creation
- Each user can have multiple API keys
- Keys can be deactivated but not retrieved

### Billing Data
Your users already have proper billing setup:
- slavataichi: Free tier with payment method (pay-per-scan)
- rostislav: Individual plan, active subscription

No changes needed to billing data!