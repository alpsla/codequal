# GitHub Token Setup Guide

## Token Type: Classic vs Fine-grained

### Use Classic Personal Access Token (Recommended for Now)
GitHub offers two types of tokens, but for our security scanning needs, **Classic tokens** are recommended because:

1. **Fine-grained tokens** (newer) have limitations:
   - Don't support all security APIs yet
   - More complex permission model
   - Some endpoints still require classic tokens

2. **Classic tokens** support all the security features we need

## Steps to Create Classic Token with Security Scopes

### 1. Navigate to Token Settings
1. Go to GitHub → Settings (click your profile picture)
2. Scroll down to **Developer settings** (bottom of left sidebar)
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token** → **Generate new token (classic)**

### 2. Configure Token

**Note/Name**: `CodeQual Security Scanner` (or any memorable name)

**Expiration**: Choose based on your needs (90 days recommended for security)

### 3. Select Required Scopes

Check these scopes for full security scanning access:

#### Essential Scopes ✅
- [x] **repo** - Full control of private repositories (includes all repo scopes)
  - This automatically includes:
    - repo:status
    - repo_deployment
    - public_repo
    - repo:invite
    - security_events

- [x] **read:org** - Read org and team membership, read org projects

#### Optional but Recommended
- [x] **workflow** - Update GitHub Action workflows (if scanning workflows)
- [x] **read:packages** - Download packages from GitHub Package Registry
- [x] **read:user** - Read user profile data
- [x] **read:project** - Read access to user projects

### 4. Security Events Scope
The `security_events` scope is **automatically included** when you select `repo`. This gives access to:
- Code scanning alerts
- Dependabot alerts
- Security advisories

### 5. What About Secret Scanning?
**Note**: Secret scanning alerts require GitHub Advanced Security, which is:
- ✅ Free for public repositories
- 💰 Paid feature for private repositories
- Not available via personal access tokens for all accounts

## Token Scopes Summary

```yaml
Required Scopes:
  - repo                 # Includes security_events
  - read:org            # For organization repositories

Optional Scopes:
  - workflow            # For GitHub Actions
  - read:packages       # For package vulnerabilities
  - read:user          # For user context
  - read:project       # For project boards
```

## After Creating Token

### 1. Copy the Token
⚠️ **IMPORTANT**: Copy the token immediately! You won't be able to see it again.

Token format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Update .env File
Replace the existing token in your `.env` file:
```bash
GITHUB_TOKEN=ghp_YOUR_NEW_TOKEN_HERE
```

### 3. Test the Token
Run this command to verify the token works:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/user
```

### 4. Test Security APIs
Test Dependabot alerts (should return 200 or empty array, not 403):
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/repos/django/django/dependabot/alerts
```

Test code scanning (should return 200 or empty array, not 403):
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/repos/django/django/code-scanning/alerts
```

## Expected Results After Update

With the proper token scopes, you should see:
- ✅ Dependabot alerts: 200 OK (may return empty array if no alerts)
- ✅ Code scanning alerts: 200 OK (may return empty array if not enabled)
- ⚠️ Secret scanning: May still return 404 if not available for the repository

## Troubleshooting

### Still Getting 403 Errors?
1. Verify token has `repo` scope
2. Check if repository is accessible to your account
3. For org repos, ensure `read:org` is selected

### Still Getting 404 Errors?
1. Feature might not be enabled for the repository
2. Repository might not have GitHub Advanced Security
3. Some features are only available for certain repository types

## Security Best Practices

1. **Never commit tokens** to version control
2. **Use environment variables** for token storage
3. **Rotate tokens regularly** (every 90 days)
4. **Use minimum required scopes** for your use case
5. **Consider GitHub Apps** for production use (better security model)

## Next Steps

After creating and updating your token:
1. Remove debug logging from `SimplifiedGitHubPlatformAgent.ts`
2. Run `npx ts-node test-real-prs.ts` to test with real API data
3. Check if you get actual security alerts instead of mock data
4. Document any remaining 404s (these might be legitimate "no alerts" responses)

---

**Note**: Even with proper tokens, many repositories might not have security alerts, which is normal. The important thing is that the API returns 200 OK instead of 403 Forbidden.