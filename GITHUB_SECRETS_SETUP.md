# Setting Up GitHub Secrets for CodeQual

## Quick Summary

The CI is failing because it's missing Supabase environment variables. You need to add these GitHub secrets:
- `SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY` (optional)

**Note**: These secrets might already be configured. Check Settings > Secrets first!

## Steps to Add Supabase Secrets

1. **Navigate to your GitHub repository**
   - Go to https://github.com/codequal-repos/codequal

2. **Access Repository Settings**
   - Click on "Settings" tab in your repository
   - In the left sidebar, click on "Secrets and variables"
   - Click on "Actions"

3. **Add Required Secrets**
   
   Click "New repository secret" for each of these:

   ### SUPABASE_URL
   - Name: `SUPABASE_URL`
   - Value: Your Supabase project URL (looks like `https://xxxxxxxxxxxxx.supabase.co`)
   - Click "Add secret"

   ### PUBLIC_SUPABASE_ANON_KEY
   - Name: `PUBLIC_SUPABASE_ANON_KEY`
   - Value: Your Supabase anonymous key (a long JWT token)
   - Click "Add secret"

   ### SUPABASE_SERVICE_ROLE_KEY (Optional for tests)
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Your Supabase service role key (only if needed for tests)
   - Click "Add secret"

## Where to Find Your Supabase Credentials

1. **Log in to Supabase Dashboard**
   - Go to https://app.supabase.com

2. **Select Your Project**

3. **Go to Settings > API**
   - You'll find:
   - **Project URL**: Copy this for `SUPABASE_URL`
   - **anon public**: Copy this for `SUPABASE_ANON_KEY`

## Check Existing Secrets First!

**Important**: Your CI workflow already expects these secrets. Check if they're already configured:
1. Go to Settings > Secrets and variables > Actions
2. Look for: SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

If these are already present (shown as hidden values), you don't need to add them again!

## Your CI Workflow Already Uses These Secrets

Your `.github/workflows/ci.yml` is already configured to use the secrets:

```yaml
- name: Create .env file
  run: |
    cat > .env << EOF
    # Supabase Configuration
    SUPABASE_URL=${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY=${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    PUBLIC_SUPABASE_ANON_KEY=${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
    
    # Other secrets...
    EOF
```

## Alternative: Use Test/Mock Values

If you don't want to use real Supabase credentials in CI, you can use mock values:

```yaml
env:
  SUPABASE_URL: "https://mock.supabase.co"
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vY2siLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjAwMDAwMCwiZXhwIjoxOTMxNTc2MDAwfQ.mock_signature"
```

Then update your test setup to handle mock mode when these specific values are detected.

## Verify Secrets Are Set

After adding secrets:
1. Go to Settings > Secrets and variables > Actions
2. You should see:
   - SUPABASE_URL (hidden value)
   - SUPABASE_ANON_KEY (hidden value)

## Security Notes

- Never commit these values to your repository
- Use read-only keys (anon key) for CI/CD
- Consider using different Supabase projects for development/testing/production
- Rotate keys periodically

## Need Help?

If you need the actual Supabase values:
1. Check your local `.env` file
2. Or log into your Supabase dashboard
3. Or ask your team lead for the test environment credentials
