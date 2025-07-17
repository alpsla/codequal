# E2E Testing with Existing Users - Simplified Guide

## Current Situation

You have two test users:
1. **slavataichi@gmail.com** - Pay-per-scan user ($0.50 per scan)
2. **rostislav.alpin@gmail.com** - Individual subscription plan user

Both users authenticated via Magic Link, so you don't have their passwords.

## Testing Approach

Since API keys are stored as hashes (not retrievable), we need the actual API key values. Here are your options:

### Option 1: Manual API Key Generation (Recommended)

1. **Log in as each user** via the web interface using Magic Link
2. **Generate API keys** for each user through the UI
3. **Save the API keys** (they're only shown once!)
4. **Add to .env file**:
   ```
   TEST_API_KEY_PAY_PER_SCAN=ck_1234567890abcdef...
   TEST_API_KEY_INDIVIDUAL=ck_0987654321fedcba...
   ```

### Option 2: Direct Database Query (Current State Check)

Run this SQL to see what data exists:
```sql
-- In Supabase SQL Editor, run:
-- scripts/check-test-users-status.sql
```

This will show you:
- If user profiles exist
- If billing records exist  
- If payment methods exist
- If API keys exist (but not the actual keys)

### Option 3: Use Supabase Admin to Test

If you just want to verify the data structure:
```bash
# Run with service key
SUPABASE_SERVICE_KEY=<your_service_key> npx ts-node src/test-scripts/test-e2e-with-api-keys.ts
```

## Running the Tests

Once you have API keys:

```bash
cd apps/api

# Set environment variables
export TEST_API_KEY_PAY_PER_SCAN="your_api_key_here"
export TEST_API_KEY_INDIVIDUAL="your_api_key_here"

# Run the test
npx ts-node src/test-scripts/test-e2e-with-api-keys.ts
```

## What the Tests Check

1. **User Data Integrity**
   - User profiles exist
   - Billing records are correct
   - Payment methods are set up

2. **API Access**
   - API key authentication works
   - Proper permissions based on subscription

3. **PR Analysis Flow**
   - Can start analysis
   - Progress tracking works
   - Results are retrievable

## If Data is Missing

If the status check reveals missing data (profiles, billing, etc.), this indicates issues with your onboarding flow that should be fixed in the application, not with SQL inserts.

Common issues:
- Profile creation trigger not firing
- Billing record not created on signup
- Payment method not properly linked

These should be fixed in the application code, then users should go through the flow again.