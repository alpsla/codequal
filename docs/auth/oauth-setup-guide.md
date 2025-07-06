# OAuth Provider Configuration Guide for Supabase

## Prerequisites
- Access to Supabase Dashboard: https://app.supabase.com
- GitHub account for creating OAuth App
- GitLab account for creating OAuth App (optional)

## Step 1: Create GitHub OAuth App

1. Go to GitHub Settings: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: CodeQual Development (or your app name)
   - **Homepage URL**: http://localhost:3000
   - **Authorization callback URL**: 
     ```
     https://ftjhmbbcuqjqmmbaymqb.supabase.co/auth/v1/callback
     ```
   - **Enable Device Flow**: Leave unchecked

4. Click "Register application"
5. Save the following credentials:
   - **Client ID**: (shown on the app page)
   - **Client Secret**: (click "Generate a new client secret")

## Step 2: Create GitLab OAuth App (Optional)

1. Go to GitLab Applications: https://gitlab.com/-/profile/applications
2. Click "New application"
3. Fill in the application details:
   - **Name**: CodeQual Development
   - **Redirect URI**: 
     ```
     https://ftjhmbbcuqjqmmbaymqb.supabase.co/auth/v1/callback
     ```
   - **Scopes**: Select `read_user`
   - **Confidential**: Check this box

4. Click "Save application"
5. Save the following credentials:
   - **Application ID**: (shown on the app page)
   - **Secret**: (shown only once after creation)

## Step 3: Configure OAuth in Supabase Dashboard

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Authentication** → **Providers**

### Configure GitHub Provider:
1. Find "GitHub" in the provider list
2. Toggle it to "Enabled"
3. Enter the credentials:
   - **Client ID**: (from GitHub OAuth App)
   - **Client Secret**: (from GitHub OAuth App)
   - **Redirect URL**: This is auto-filled, copy it if needed for GitHub
4. Click "Save"

### Configure GitLab Provider:
1. Find "GitLab" in the provider list
2. Toggle it to "Enabled"
3. Enter the credentials:
   - **Application ID**: (from GitLab OAuth App)
   - **Secret**: (from GitLab OAuth App)
   - **Redirect URL**: This is auto-filled, copy it if needed for GitLab
   - **GitLab URL**: Leave as default for GitLab.com
4. Click "Save"

## Step 4: Update Environment Variables (if needed)

Ensure your `.env` file has the correct Supabase credentials:
```bash
SUPABASE_URL=https://ftjhmbbcuqjqmmbaymqb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0amhtYmJjdXFqcW1tYmF5bXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4NTk3MzQsImV4cCI6MjA1NDQzNTczNH0.coUpXWXWCuztUyaGSHx1-qfL1CG5wlVh3I33Rq6NMNI
```

## Step 5: Test OAuth Flow

1. Open your browser to: http://localhost:3001/auth-test.html
2. Click "Sign in with GitHub" or "Sign in with GitLab"
3. You should be redirected to the provider's authorization page
4. After authorization, you'll be redirected back with tokens

## Step 6: Verify Configuration

Run the OAuth flow test:
```bash
cd /Users/alpinro/Code\ Prjects/codequal/apps/api
node test-oauth-flow.js
```

You should see:
- ✅ OAuth URL contains client_id
- ✅ OAuth URL contains proper redirect_uri
- ✅ URLs point to actual GitHub/GitLab OAuth endpoints

## Troubleshooting

### Common Issues:

1. **"Provider is not enabled" error**
   - Ensure the provider is toggled ON in Supabase dashboard
   - Check that credentials are saved properly

2. **"Invalid redirect_uri" error**
   - The callback URL in GitHub/GitLab must EXACTLY match Supabase's callback URL
   - Usually: `https://[YOUR_PROJECT_REF].supabase.co/auth/v1/callback`

3. **"Invalid client_id" error**
   - Double-check the Client ID/Application ID is copied correctly
   - Ensure no extra spaces or characters

4. **After successful auth, no user in database**
   - Check Supabase Auth logs in the dashboard
   - Ensure database triggers are set up for user profile creation

## Production Considerations

For production deployment:
1. Create separate OAuth apps for production
2. Update callback URLs to production domain
3. Use environment-specific credentials
4. Enable only necessary scopes
5. Consider implementing OAuth state parameter for CSRF protection

## Required Scopes

- **GitHub**: `read:user`, `user:email`
- **GitLab**: `read_user`

These scopes allow reading basic user information and email, which is sufficient for authentication.

## Next Steps

After configuration:
1. Test the full OAuth flow using the test HTML page
2. Verify user profiles are created in the database
3. Test token refresh functionality
4. Implement proper error handling for OAuth failures