# GitHub Advanced Security (GHAS) Setup Guide

## What is GitHub Advanced Security?

GitHub Advanced Security includes:
- **Secret scanning** - Detects tokens, keys, and secrets in code
- **Code scanning** - Finds security vulnerabilities (CodeQL)
- **Dependency review** - Shows vulnerability impact of dependency changes

## Availability

### Free Access ✅
- **All PUBLIC repositories** - GHAS is FREE and automatically available
- No setup needed for public repos

### Paid Access 💰
- **Private repositories** - Requires GitHub Enterprise or GHAS license
- **Organization private repos** - Needs org-level GHAS license

## How to Check if GHAS is Available

### Method 1: Via GitHub UI
1. Go to your repository on GitHub
2. Click **Settings** tab
3. Look for **Security & analysis** in left sidebar
4. Check if you see:
   - Dependency graph
   - Dependabot alerts
   - Code scanning
   - Secret scanning

### Method 2: Via API
```bash
# Check repository features
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/repos/OWNER/REPO

# Look for security_and_analysis section in response
```

### Method 3: In Our Code
Add a check to detect GHAS availability:

```typescript
private async checkGHASAvailability(owner: string, repo: string): Promise<{
  codeScanning: boolean;
  secretScanning: boolean;
  dependabot: boolean;
}> {
  try {
    const repoInfo = await this.makeGitHubRequest(
      `/repos/${owner}/${repo}`,
      'GET'
    );
    
    const data = JSON.parse(repoInfo);
    
    return {
      codeScanning: data.security_and_analysis?.advanced_security?.status === 'enabled',
      secretScanning: data.security_and_analysis?.secret_scanning?.status === 'enabled',
      dependabot: data.security_and_analysis?.dependabot_security_updates?.status === 'enabled'
    };
  } catch (error) {
    console.log('Unable to check GHAS status');
    return {
      codeScanning: false,
      secretScanning: false,
      dependabot: false
    };
  }
}
```

## How to Enable GHAS

### For PUBLIC Repositories (Free)

1. Go to repository **Settings**
2. Click **Security & analysis**
3. Enable these features:
   - ✅ **Dependency graph** - Click "Enable"
   - ✅ **Dependabot alerts** - Click "Enable"
   - ✅ **Dependabot security updates** - Click "Enable"
   - ✅ **Code scanning** - Click "Set up" → Choose "Default" (uses GitHub Actions)
   - ✅ **Secret scanning** - Click "Enable"

### For PRIVATE Repositories

#### Option 1: Organization with GHAS License
If your organization has GHAS:
1. Go to repository **Settings**
2. Click **Security & analysis**
3. Under "GitHub Advanced Security" click **Enable**
4. Then enable individual features as above

#### Option 2: Personal Private Repos
For personal private repos, you need:
1. GitHub Enterprise account, OR
2. Purchase GHAS license separately
3. Contact GitHub Sales for pricing

#### Option 3: Make Repository Public
If appropriate for your project:
1. Settings → General → Danger Zone
2. Change visibility to Public
3. GHAS features become free

## Testing Repositories with GHAS

### Public Repos with GHAS Enabled (Good for Testing)
These popular public repos have GHAS enabled and actual security alerts:

```javascript
const ghasEnabledRepos = [
  'microsoft/vscode',        // Usually has dependabot alerts
  'facebook/react',          // Often has code scanning results
  'nodejs/node',             // Dependency vulnerabilities
  'tensorflow/tensorflow',   // Complex security surface
  'kubernetes/kubernetes',   // Enterprise-grade scanning
];
```

### How to Find Repos with Security Alerts
1. Use GitHub Search:
   ```
   is:public archived:false security-advisory:>=1
   ```

2. Check GitHub Advisory Database:
   https://github.com/advisories

## Updating Our Code for GHAS Detection

Let's update the GitHub agent to handle GHAS availability gracefully:

```typescript
// In SimplifiedGitHubPlatformAgent.ts

private async scanSecrets(owner: string, repo: string): Promise<any[]> {
  if (!this.token) {
    return this.getMockSecretAlerts();
  }

  try {
    // First check if secret scanning is available
    const repoResponse = await this.makeGitHubRequest(
      `/repos/${owner}/${repo}`,
      'GET'
    );
    const repoData = JSON.parse(repoResponse);
    
    // Check if secret scanning is enabled
    const secretScanningEnabled = 
      repoData.security_and_analysis?.secret_scanning?.status === 'enabled';
    
    if (!secretScanningEnabled) {
      console.log(`Secret scanning not enabled for ${owner}/${repo}`);
      return [];  // Return empty array instead of mock data
    }
    
    // Proceed with secret scanning API call
    const response = await this.makeGitHubRequest(
      `/repos/${owner}/${repo}/secret-scanning/alerts?state=open`,
      'GET'
    );
    
    const alerts = JSON.parse(response);
    return this.parseSecretAlerts(alerts);
    
  } catch (error: any) {
    if (error.message?.includes('404')) {
      console.log(`Secret scanning not available for ${owner}/${repo} (GHAS required)`);
      return [];  // Not an error, just not available
    }
    console.warn('Failed to fetch secret scanning alerts:', error.message);
    return this.getMockSecretAlerts();
  }
}
```

## Expected API Responses

### With GHAS Enabled
```json
{
  "security_and_analysis": {
    "advanced_security": {
      "status": "enabled"
    },
    "secret_scanning": {
      "status": "enabled"
    },
    "secret_scanning_push_protection": {
      "status": "enabled"
    }
  }
}
```

### Without GHAS (Private Repo)
```json
{
  "security_and_analysis": {
    "advanced_security": {
      "status": "disabled"
    },
    "secret_scanning": {
      "status": "disabled"
    }
  }
}
```

## Free Alternatives for Private Repos

If you can't get GHAS for private repos:

1. **GitGuardian** - Free tier available
   - Sign up at gitguardian.com
   - Integrates with GitHub

2. **Snyk** - Free for individual developers
   - Sign up at snyk.io
   - Scans dependencies and code

3. **Local Scanning Tools**
   - `gitleaks` - Secret scanning
   - `trufflehog` - Secret detection
   - `semgrep` - Code scanning

4. **GitHub Actions** (Limited)
   - Some security actions work on private repos
   - CodeQL analysis in Actions (limited free minutes)

## Summary

### For Our Testing
1. **Use PUBLIC repositories** for testing GHAS features - they're free
2. **Popular repos** like React, Node.js often have real security alerts
3. **Our mock data fallback** is appropriate when GHAS isn't available

### For Production
1. **Check GHAS availability** programmatically before calling APIs
2. **Handle 404s gracefully** - they often mean "feature not enabled"
3. **Document requirements** clearly for users

### Next Steps
1. Test with public repos that have GHAS enabled
2. Update code to detect GHAS availability
3. Provide clear messages when features aren't available
4. Consider implementing local scanning as fallback