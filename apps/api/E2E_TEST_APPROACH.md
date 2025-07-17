# E2E Test Approach - Using Existing Users

## Overview

Since you used Magic Link authentication and don't have passwords for the test users, we have several approaches to test the system without modifying the database.

## Current User Status

Based on your SQL queries:

1. **slavataichi@gmail.com** (User ID: 9ea0c2a9-8b33-409a-a45e-fe218d13d65e)
   - Authenticated via GitHub OAuth
   - Should be pay-per-scan user ($0.50 per scan)
   - Exists in auth.users but not in public.users

2. **rostislav.alpin@gmail.com** (User ID: 580e3fe8-094d-477f-86cb-88e4273b589b)
   - Authenticated via email (magic link)
   - Should have Individual subscription plan
   - Exists in auth.users but not in public.users

## Testing Approaches

### 1. API Key Based Testing (Recommended)

Since users can generate API keys through the web interface, this is the most production-like approach:

```bash
# Run the API key based tests
npx ts-node src/test-scripts/test-e2e-with-api-keys.ts
```

**Prerequisites:**
1. Users need to log in via the web interface and generate API keys
2. Store the API keys in your .env file:
   ```
   TEST_API_KEY_PAY_PER_SCAN=<api_key_for_slavataichi>
   TEST_API_KEY_INDIVIDUAL=<api_key_for_rostislav>
   ```

### 2. Service Account Testing

Use Supabase service key to query data directly:

```bash
# Check user status first
psql -h <supabase_host> -U postgres -d postgres -f scripts/check-test-users-status.sql

# Run tests with service account
SUPABASE_SERVICE_KEY=<your_service_key> npx ts-node src/test-scripts/test-e2e-with-api-keys.ts
```

### 3. Manual Token Generation (Development Only)

For development, you can manually generate a token using Supabase Admin API:

```javascript
// In Supabase SQL Editor or a script
const { data, error } = await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: 'slavataichi@gmail.com',
  options: {
    redirectTo: 'http://localhost:3000/auth/callback'
  }
});
```

## What the Tests Verify

The E2E tests check the actual state of your system without modifications:

1. **User Profile Existence**: Checks if user_profiles records exist
2. **Billing Configuration**: Verifies subscription_tier and payment status
3. **API Access**: Tests API endpoints with proper authentication
4. **PR Analysis Flow**: Runs actual analysis if user has proper permissions

## Troubleshooting Missing Data

If the tests reveal missing data (which seems to be the case from your queries), here's what might have happened:

1. **Missing user_profiles**: The profile sync might not have triggered during authentication
2. **Missing billing records**: Billing setup might not have completed
3. **Missing payment methods**: Payment method addition might have failed

## Running the Status Check

To see the current state of your test users:

```sql
-- Run this in Supabase SQL Editor
-- Copy the content from scripts/check-test-users-status.sql
```

This will show you exactly what data exists for each user without modifying anything.

## Next Steps

1. **Run the status check SQL** to see what data actually exists
2. **Have users generate API keys** through the web interface
3. **Use API key based testing** for the most realistic E2E tests
4. **Fix any missing data** through the normal application flow (not SQL inserts)

The key principle is: **E2E tests should verify the actual system state, not create test data**.