# Authentication Setup Guide

This guide explains how to set up authentication for your CodeQual instance, including email/password and OAuth providers.

## Overview

CodeQual supports multiple authentication methods:
- **Email/Password** - Traditional authentication (handled by Supabase Auth)
- **OAuth Providers**:
  - GitHub
  - GitLab
  - (Extensible to Google, Microsoft, Bitbucket, etc.)

The authentication flow integrates with your existing user profiles and automatically syncs user data from OAuth providers.

## Database Architecture

### Authentication Tables Structure

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  auth.users     │────>│  user_profiles   │<────│ provider_accounts  │
│ (Supabase Auth) │     │  (All users)     │     │ (OAuth only)      │
└─────────────────┘     └──────────────────┘     └────────────────────┘
```

The authentication system uses:

1. **auth.users** (Supabase managed) - Core authentication for all users
   - Handles email/password authentication
   - Manages OAuth authentication
   - Stores basic auth metadata

2. **user_profiles table** - Extended profile for ALL users:
   - `user_id` - Links to Supabase auth.users
   - `email`, `name` - Basic user info
   - `auth_method` - How user authenticated ('email', 'github', 'gitlab')
   - `email_verified` - For email auth users
   - `github_username`, `github_id` - GitHub account info
   - `gitlab_username`, `gitlab_id` - GitLab account info
   - `full_name`, `avatar_url` - Profile data
   - `subscription_tier`, `status` - Account status

3. **provider_accounts table** - OAuth-specific data only:
   - Provider tokens (access_token, refresh_token)
   - Provider user IDs and metadata
   - Raw user data from OAuth provider
   - Note: Email auth users do NOT have entries here

4. **Authentication triggers** - Automatically sync data:
   - `handle_new_user()` - Creates/updates user profile on signup
   - `sync_oauth_provider_data()` - Syncs OAuth provider data
   - `update_auth_method()` - Tracks last used auth method

## Supabase Configuration

### 1. Enable OAuth Providers

1. Go to your Supabase dashboard
2. Navigate to Authentication > Providers
3. Enable GitHub:
   - Click on GitHub
   - Add your GitHub OAuth App credentials:
     - Client ID
     - Client Secret
   - Set callback URL: `https://your-project.supabase.co/auth/v1/callback`

4. Enable GitLab:
   - Click on GitLab
   - Add your GitLab OAuth App credentials:
     - Application ID
     - Application Secret
   - Set callback URL: `https://your-project.supabase.co/auth/v1/callback`

### 2. Create OAuth Apps

**Important:** Since Supabase only allows one OAuth configuration per provider, you'll use the SAME OAuth app for both development and production environments.

#### GitHub OAuth App
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: `CodeQual`
   - Homepage URL: `https://codequal.dev` (or your domain)
   - Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
   - **Note:** GitHub only allows ONE callback URL per app
4. Copy Client ID and Client Secret

#### GitLab OAuth App
1. Go to GitLab > User Settings > Applications
2. Fill in:
   - Name: `CodeQual`
   - Redirect URIs: `https://your-project.supabase.co/auth/v1/callback`
   - Scopes: Select `read_user`, `read_api`, `openid`, `profile`, `email`
   - **Note:** GitLab allows multiple redirect URIs but we only need the Supabase one
3. Copy Application ID and Secret

### 3. Configure in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Providers**
3. For each provider (GitHub, GitLab):
   - Enable the provider
   - Add the Client ID/Application ID
   - Add the Client Secret/Application Secret
   - Save

**Note:** These credentials will be used for BOTH development and production environments.

## API Endpoints

The auth routes provide the following endpoints:

### Email/Password Authentication
- `POST /auth/signup` - Create new account
- `POST /auth/signin` - Sign in with email/password
- `POST /auth/signout` - Sign out

### OAuth Authentication
- `POST /auth/oauth/github` - Initiate GitHub OAuth flow
- `POST /auth/oauth/gitlab` - Initiate GitLab OAuth flow
- `GET /auth/callback` - OAuth callback handler

### Account Management
- `GET /auth/me` - Get current user with profile
- `POST /auth/refresh` - Refresh access token
- `POST /auth/link/github` - Link GitHub to existing account
- `POST /auth/link/gitlab` - Link GitLab to existing account

## Frontend Integration

### 1. OAuth Sign In

```typescript
// Initiate OAuth sign in
const response = await fetch('/auth/oauth/github', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    redirectTo: window.location.origin + '/auth/callback'
  })
});

const { url } = await response.json();
window.location.href = url; // Redirect to OAuth provider
```

### 2. Handle OAuth Callback

```typescript
// In your /auth/success page
const params = new URLSearchParams(window.location.search);
const accessToken = params.get('access_token');
const refreshToken = params.get('refresh_token');

// Store tokens securely
localStorage.setItem('access_token', accessToken);
localStorage.setItem('refresh_token', refreshToken);

// Redirect to app
window.location.href = '/dashboard';
```

### 3. Get Current User

```typescript
const response = await fetch('/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { user } = await response.json();
// user contains auth data + profile with organization info
```

## Environment Variables

Add these to your `.env` file:

```env
# Environment
NODE_ENV=development  # or 'production'

# Supabase (same for dev and prod)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URLs (change based on environment)
APP_URL=http://localhost:3000      # Dev: http://localhost:3000, Prod: https://codequal.dev
API_URL=http://localhost:3001      # Dev: http://localhost:3001, Prod: https://api.codequal.dev

# Feature Flags
ENABLE_GITHUB_AUTH=true
ENABLE_GITLAB_AUTH=true
ENABLE_EMAIL_AUTH=true

# Note: OAuth credentials are configured in Supabase Dashboard, not here
```

### How the Single OAuth App Works

1. **Development Flow:**
   ```
   localhost:3000 → Supabase OAuth → GitHub/GitLab → Supabase → localhost:3000/auth/callback
   ```

2. **Production Flow:**
   ```
   codequal.dev → Supabase OAuth → GitHub/GitLab → Supabase → codequal.dev/auth/callback
   ```

The key is the `redirectTo` parameter in your OAuth initiation - Supabase remembers where to send the user back to after authentication.

## Data Flow

### Email/Password Authentication

1. **User signs up with email/password**
   - Frontend calls `/auth/signup`
   - Supabase creates auth.users record
   - `handle_new_user()` trigger creates user_profiles record
   - `auth_method` set to 'email'
   - User receives verification email

2. **User signs in**
   - Frontend calls `/auth/signin`
   - Supabase validates credentials
   - `update_auth_method()` trigger updates last_login_at
   - Returns session tokens

### OAuth Authentication

1. **User clicks "Sign in with GitHub/GitLab"**
   - Frontend calls `/auth/oauth/github` or `/auth/oauth/gitlab`
   - API returns OAuth URL
   - User is redirected to OAuth provider

2. **OAuth provider redirects back**
   - Supabase handles the callback
   - Database triggers fire to:
     - Create/update user_profiles record
     - Set `auth_method` to provider name
     - Link existing profile by email if found
     - Store provider data in provider_accounts
     - Create free subscription

3. **User is authenticated**
   - Frontend receives tokens
   - Can now make authenticated API calls
   - Profile data is automatically synced

### Multiple Auth Methods

Users can link multiple auth methods to one account:
- Start with email/password, add GitHub later
- Start with GitHub, add GitLab later
- `auth_method` tracks the last used method
- All methods link to the same user_profiles record

## Security Considerations

1. **Token Storage**: Store tokens securely (httpOnly cookies recommended)
2. **CORS**: Configure allowed origins properly
3. **Scopes**: Request minimal OAuth scopes needed
4. **Rate Limiting**: Implement rate limiting on auth endpoints
5. **HTTPS**: Always use HTTPS in production

## Analytics and Monitoring

### Auth Method Statistics
```sql
-- View auth method distribution
SELECT * FROM auth_statistics;

-- Find users with multiple auth methods
SELECT * FROM users_multiple_auth_methods;

-- Check recent signups by method
SELECT auth_method, COUNT(*) 
FROM user_profiles 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY auth_method;
```

## Troubleshooting

### "Column user_id does not exist"
- The migration should have added this column
- Check if migration ran successfully
- Verify user_profiles table structure

### OAuth redirect fails
- Check callback URLs match exactly
- Verify OAuth app credentials in Supabase
- Check browser console for errors

### Profile not syncing
- Check database triggers are created
- Verify raw_user_meta_data contains expected fields
- Check Supabase logs for trigger errors

### Email users vs OAuth users
- Email users: Only in auth.users and user_profiles
- OAuth users: Also have entries in provider_accounts
- Use `auth_method` column to identify auth type

## Adding New OAuth Providers

To add a new provider (e.g., Google):

1. Add to provider_types table:
```sql
INSERT INTO provider_types (name, display_name, oauth_scopes) 
VALUES ('google', 'Google', ARRAY['openid', 'email', 'profile']);
```

2. Configure in Supabase Dashboard
3. Update frontend to show new provider button
4. The existing code will handle the rest!