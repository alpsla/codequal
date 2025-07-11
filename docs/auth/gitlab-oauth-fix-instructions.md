# GitLab OAuth Fix Instructions

## Problem
GitLab OAuth is failing with `server_error` after user authorizes the app. This is typically due to Supabase URL configuration mismatch.

## Immediate Fix Required in Supabase Dashboard

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/ftjhmbbcuqjqmmbaymqb/auth/url-configuration

2. **Update URL Configuration**:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: Add these (one per line):
     ```
     http://localhost:3000/auth/callback
     http://localhost:3000/**
     ```

3. **Save the changes**

## Optional: Enable Skip Nonce Checks

1. Go to **Authentication → Providers → GitLab**
2. Expand "Advanced Settings"
3. Enable "Skip nonce checks"
4. Save

## Verify GitLab App Settings

1. Go to GitLab → User Settings → Applications
2. Find your CodeQual OAuth app
3. Verify the redirect URI is exactly:
   ```
   https://ftjhmbbcuqjqmmbaymqb.supabase.co/auth/v1/callback
   ```
   (No trailing slash!)

## Testing

After making these changes:
1. Clear your browser cookies/cache
2. Try logging in with GitLab again
3. You should be redirected to `/dashboard` after successful auth

## Why This Fixes the Issue

The `server_error` occurs because Supabase can't redirect back to your application after GitLab authentication. By adding the proper redirect URLs in Supabase, it knows where to send users after successful OAuth.

The current callback handler already properly handles Supabase OAuth tokens in the URL hash, so no code changes are needed once the Supabase configuration is updated.

## Common Issues and Solutions

### 1. Hydration Errors
- **Cause**: SSR/Client state mismatch
- **Solution**: Add mounted checks and consistent initial state
- **Status**: Fixed in auth-context.tsx and billing-context.tsx

### 2. 401 Unauthorized Errors
- **Cause**: Missing authentication token in API requests
- **Solution**: Use fetchWithAuth utility and check for token before making requests
- **Status**: Fixed by updating billing-context.tsx to check for auth token

### 3. GitLab OAuth server_error
- **Cause**: Supabase URL configuration mismatch
- **Solution**: Update Supabase Dashboard URL settings as described above
- **Status**: Requires manual configuration in Supabase Dashboard