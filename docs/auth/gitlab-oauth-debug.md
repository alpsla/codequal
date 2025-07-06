# GitLab OAuth Debugging Guide

## Error: Client authentication failed

This error occurs when GitLab cannot authenticate the OAuth application. Here's how to fix it:

### 1. Verify GitLab Application Settings

Go to GitLab → User Settings → Applications (or Admin Area → Applications)

Your application should have:
- **Name**: CodeQual (or your app name)
- **Redirect URI**: `https://ftjhmbbcuqjqmmbaymqb.supabase.co/auth/v1/callback`
- **Scopes**: 
  - `read_user` (required)
  - `email` (required)
  - `openid` (optional but recommended)
  - `profile` (optional)

### 2. Verify Supabase Configuration

In Supabase Dashboard → Authentication → Providers → GitLab:

1. **Enable GitLab** - Make sure the toggle is ON
2. **GitLab URL** (if self-hosted): Leave empty for gitlab.com
3. **Client ID**: Must match your GitLab Application ID exactly
4. **Client Secret**: Must match your GitLab Secret exactly

### 3. Common Issues

1. **Wrong Client ID/Secret**: Double-check that you're copying the correct values
2. **Spaces in credentials**: Make sure there are no trailing spaces
3. **Self-hosted GitLab**: You need to specify the GitLab URL in Supabase
4. **Redirect URI mismatch**: The URI in GitLab MUST match Supabase's callback URL

### 4. Test the Configuration

After updating the credentials in Supabase:
1. Wait 1-2 minutes for changes to propagate
2. Try the OAuth flow again
3. Check browser console for any additional errors

### 5. Alternative: Create a New GitLab Application

If the issue persists, create a new OAuth application:

1. Go to GitLab → User Settings → Applications
2. Create new application with:
   - Name: CodeQual Dev
   - Redirect URI: `https://ftjhmbbcuqjqmmbaymqb.supabase.co/auth/v1/callback`
   - Scopes: `read_user`, `email`
3. Copy the new Application ID and Secret
4. Update in Supabase Dashboard

### 6. For Development vs Production

Since you have different OAuth apps for dev/prod, make sure you're using the right credentials:
- Development usually uses localhost redirect URIs
- Production uses your domain redirect URIs
- Supabase only supports one OAuth configuration per provider

### Current Configuration

Based on your setup:
- Supabase Project: `ftjhmbbcuqjqmmbaymqb`
- Expected Callback: `https://ftjhmbbcuqjqmmbaymqb.supabase.co/auth/v1/callback`
- GitLab Client ID: `7f7e8d78a21d74b1807091e7256838e3d4218623490043eab60625fa25cb2ca8`

Make sure this Client ID is correctly configured in both GitLab and Supabase.