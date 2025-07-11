// GitLab OAuth Diagnostic for CodeQual
// This script helps diagnose GitLab OAuth configuration issues

# GitLab OAuth Error Analysis

## Error Message
"Unable to exchange external code: fcccb8b3b7f4dedbf7e1ead88191bed22ad2066f41992ae275be1180e96b2123"

## What This Means
The OAuth flow is working up to the point where:
1. ✅ User clicks "Login with GitLab"
2. ✅ User is redirected to GitLab
3. ✅ User authorizes the app
4. ✅ GitLab redirects back to Supabase with authorization code
5. ❌ Supabase fails to exchange the code for tokens

## Root Cause
This error typically occurs when:
1. **Client Secret Mismatch** - The secret in Supabase doesn't match GitLab
2. **Redirect URI Mismatch** - The callback URL doesn't match exactly
3. **Token Exchange Timeout** - The code expired before exchange
4. **Network Issues** - Supabase can't reach GitLab's token endpoint

## Immediate Fix Steps

### 1. Verify GitLab OAuth App Settings
Go to GitLab → Settings → Applications and verify:
- **Application ID**: `7f7e8d78a21d74b1807091e7256838e3d4218623490043eab60625fa25cb2ca8`
- **Redirect URI**: Must be EXACTLY `https://ftjhmbbcuqjqmmbaymqb.supabase.co/auth/v1/callback`
- **Scopes**: `read_user` (at minimum)

### 2. Update Supabase GitLab Provider
In Supabase Dashboard → Authentication → Providers → GitLab:
1. Click on GitLab provider
2. Verify **Client ID** matches GitLab Application ID
3. **IMPORTANT**: Re-enter the Client Secret from GitLab (even if it looks correct)
4. Click "Save"
5. Wait 30 seconds for changes to propagate

### 3. Test in Incognito Mode
1. Open incognito/private browsing window
2. Go to http://localhost:3000/login
3. Click "Continue with GitLab"
4. Complete the flow

## Alternative Solution: Recreate GitLab OAuth App

If the above doesn't work:

1. **Create New GitLab Application**:
   - Go to GitLab → Settings → Applications
   - Name: `CodeQual Dev New`
   - Redirect URI: `https://ftjhmbbcuqjqmmbaymqb.supabase.co/auth/v1/callback`
   - Scopes: `read_user`, `email`
   - Click "Save application"

2. **Update Supabase**:
   - Copy new Application ID and Secret
   - Update in Supabase Dashboard
   - Save and wait 30 seconds

3. **Update .env files**:
   ```bash
   PROD_GITLAB_CLIENT_ID=<new_application_id>
   PROD_GITLAB_CLIENT_SECRET=<new_secret>
   ```

## Debug Information to Collect

1. **Browser Console**: Check for any errors when clicking GitLab login
2. **Network Tab**: Look for the callback URL and any error parameters
3. **Supabase Logs**: Check if there are any new entries in auth.audit_log_entries

## Common Pitfalls

1. **Trailing Spaces**: Make sure no spaces in Client ID/Secret
2. **Wrong Environment**: Ensure you're using production OAuth app for Supabase
3. **Self-hosted GitLab**: If using self-hosted, need to specify GitLab URL in Supabase
4. **Rate Limiting**: GitLab might rate limit if too many failed attempts

## Next Steps

If none of the above works:
1. Enable "Skip nonce checks" in Supabase GitLab settings
2. Check if GitHub OAuth still works (to rule out general OAuth issues)
3. Contact Supabase support with the error code
