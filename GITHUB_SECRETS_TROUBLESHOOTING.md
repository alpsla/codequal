# Finding GitHub Secrets - Troubleshooting Guide

## Option 1: Check Your Access Level

1. Go to https://github.com/codequal-repos/codequal
2. Look for the "Settings" tab at the top of the page
3. If you don't see "Settings", you don't have admin access

**Solution if no admin access:**
- Ask a repository admin to add the secrets
- Or ask them to give you admin access
- Repository admins can be found under "Settings > Manage access" (if you can see it)

## Option 2: Direct URL Access

Try going directly to this URL:
```
https://github.com/codequal-repos/codequal/settings/secrets/actions
```

If you get a 404 or permission error, you don't have access.

## Option 3: Check if It's a Fork

1. Look at the top of your repository page
2. If it says "forked from [another-repo]", it's a fork
3. Forks can't have their own secrets

**Solution for forks:**
- Use the secrets from the parent repository, OR
- Create your own repository (not a fork) and push the code there

## Option 4: Organization-Level Secrets

If `codequal-repos` is an organization:
1. Go to https://github.com/codequal-repos
2. Click on the organization Settings (not repository settings)
3. Look for "Secrets and variables" > "Actions"
4. Organization secrets can be shared with repositories

## Option 5: Check Repository Permissions

Ask yourself:
- Are you a member of the `codequal-repos` organization?
- What's your role? (Member, Maintainer, Admin, Owner)
- Only Admins and Owners can manage secrets

## What the Settings Page Should Look Like

When you have proper access:
```
Repository Settings
├── General
├── Collaborators and teams
├── ...
├── Secrets and variables  <-- This is what you need
│   ├── Actions
│   ├── Codespaces
│   └── Dependabot
└── ...
```

## Alternative: Use Environment Variables in CI

If you can't add secrets, you could temporarily modify the CI workflow to use hardcoded test values (NOT recommended for production):

```yaml
env:
  SUPABASE_URL: "https://test.supabase.co"
  PUBLIC_SUPABASE_ANON_KEY: "test-key"
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key"
```

But this is insecure and should only be used for testing.

## Next Steps

1. **If you don't have access**: Contact the repository owner/admin
2. **If it's a fork**: Consider using your own repository
3. **If you're not sure**: Check who owns the repository and your access level

## Getting Help

You can check your access level by:
1. Going to the repository
2. Clicking on "Insights" tab
3. Then "People" on the left
4. Find your username and see your role
