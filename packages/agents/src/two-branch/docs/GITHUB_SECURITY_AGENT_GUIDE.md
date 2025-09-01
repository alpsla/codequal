# GitHub Security Agent - Complete Guide

## ❓ How It Works

The **GitHubSecurityAgent** uses the **GitHub API** to fetch security data that GitHub has already analyzed. It does **NOT** analyze code directly.

### What It Can Do ✅
- Fetch Dependabot vulnerability alerts from GitHub
- Fetch CodeQL code scanning results from GitHub
- Fetch secret scanning alerts from GitHub
- Fetch security advisories from GitHub
- Work with ANY GitHub repository (with proper token)
- Provide zero-infrastructure security scanning

### What It CANNOT Do ❌
- **Cannot analyze GitLab repositories** (need separate GitLabSecurityAgent)
- **Cannot analyze local code** that hasn't been pushed to GitHub
- **Cannot run custom security rules** (uses GitHub's rules only)
- **Cannot work offline** (requires GitHub API access)
- **Cannot analyze non-GitHub repositories**

## 🔄 Integration with Cached Repositories

### Important: The Agent Needs Repository URL, Not Local Path

```typescript
// ❌ WRONG - Local path doesn't help
const result = await githubAgent.analyze({
  targetPath: '/Users/me/.codequal/repo-cache/facebook-react',
  language: 'javascript'
});

// ✅ CORRECT - GitHub URL needed for API calls
const result = await githubAgent.analyze({
  repoUrl: 'https://github.com/facebook/react',
  language: 'javascript'
});
```

### How to Use with CachedRepositoryManager

```typescript
class MCPBasedOrchestrator {
  private githubAgent = new GitHubSecurityAgent();
  private multiToolSecurityAgent = new MultiToolSecurityAgent();
  
  async analyzePullRequest(repoUrl: string, prNumber: number) {
    // Step 1: Clone/cache repository
    const { mainPath, prPath } = await this.repositoryManager.cloneForPRAnalysis(
      repoUrl,
      prNumber
    );
    
    // Step 2: Run BOTH GitHub API and local tools
    const [githubResults, localResults] = await Promise.all([
      // GitHub Security - uses API, not local path
      this.githubAgent.analyze({
        repoUrl: repoUrl, // Pass URL, not local path!
        language: 'javascript'
      }),
      
      // Local security tools - analyze cached code
      this.multiToolSecurityAgent.analyze({
        targetPath: prPath, // Local path for Semgrep, Bandit, etc.
        language: 'javascript'
      })
    ]);
    
    // Step 3: Combine results
    return this.combineSecurityResults(githubResults, localResults);
  }
}
```

## 🏗️ Architecture Pattern

```
User Request
    ↓
Orchestrator
    ↓
┌─────────────────────────────────────┐
│         Parallel Execution          │
├─────────────────┬───────────────────┤
│  GitHub Agent   │   Local Tools     │
├─────────────────┼───────────────────┤
│ Uses GitHub API │ Analyzes cached   │
│ for repo URL    │ repository files  │
├─────────────────┼───────────────────┤
│ • Dependabot    │ • Semgrep         │
│ • CodeQL        │ • Bandit          │
│ • Secrets       │ • Gosec           │
│ • Advisories    │ • npm audit       │
└─────────────────┴───────────────────┘
           ↓              ↓
        Combine & Deduplicate
                 ↓
           Final Report
```

## 🎯 Testing Strategy

### 1. Unit Tests (with mocked API)
```typescript
// Mock GitHub API responses
jest.mock('axios');
const mockApi = {
  get: jest.fn().mockResolvedValue({
    data: mockDependabotAlerts
  })
};
```

### 2. Integration Tests (real API)
```bash
# Requires GitHub token
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
npm test -- github-security-integration.test.ts
```

### 3. Local Testing (with mock data)
```typescript
// The agent automatically falls back to mock data
// when API is unavailable or returns errors
```

## 🔀 Platform Support Matrix

| Platform | Agent | Status | Notes |
|----------|-------|--------|-------|
| GitHub.com | GitHubSecurityAgent | ✅ Ready | Uses GitHub API |
| GitHub Enterprise | GitHubSecurityAgent | ✅ Ready | With proper token |
| GitLab.com | GitLabSecurityAgent | 🚧 Phase 1F | To be implemented |
| GitLab Self-hosted | GitLabSecurityAgent | 🚧 Phase 1F | To be implemented |
| Bitbucket | - | ❌ Not planned | Use local tools only |
| Local repos | MultiToolSecurityAgent | ✅ Ready | Semgrep, Bandit, etc. |

## 💡 Best Practices

### 1. Always Run Both GitHub and Local Tools
```typescript
// Get the best of both worlds
const results = await Promise.all([
  githubAgent.analyze({ repoUrl }),      // GitHub's findings
  localAgent.analyze({ targetPath })      // Fresh local analysis
]);
```

### 2. Prefer GitHub Native Findings
```typescript
// GitHub findings are often more accurate (fewer false positives)
if (githubFinding && localFinding) {
  return githubFinding; // Prefer GitHub's analysis
}
```

### 3. Handle Platform Detection
```typescript
function detectPlatform(repoUrl: string) {
  if (repoUrl.includes('github.com')) return 'github';
  if (repoUrl.includes('gitlab.com')) return 'gitlab';
  if (repoUrl.includes('bitbucket.org')) return 'bitbucket';
  return 'unknown';
}

async function runSecurityAnalysis(repoUrl: string, localPath: string) {
  const platform = detectPlatform(repoUrl);
  
  switch (platform) {
    case 'github':
      return githubAgent.analyze({ repoUrl });
    case 'gitlab':
      return gitlabAgent.analyze({ repoUrl }); // Phase 1F
    default:
      return localAgent.analyze({ targetPath: localPath });
  }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# Required for private repos and higher API limits
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# Optional: GitHub Enterprise
export GITHUB_ENTERPRISE_URL=https://github.company.com
```

### API Rate Limits
- **Without token**: 60 requests/hour
- **With token**: 5,000 requests/hour
- **Enterprise**: Varies by plan

## 📊 Example Output

```json
{
  "agent": "GitHubSecurityAgent",
  "tools": [
    "github-dependabot",
    "github-code-scanning",
    "github-secret-scanning",
    "github-security-advisories"
  ],
  "issues": [
    {
      "type": "dependency-vulnerability",
      "severity": "high",
      "package": "lodash",
      "cve": "CVE-2021-23337",
      "patchedVersion": "4.17.21",
      "gitHubNative": true,
      "url": "https://github.com/owner/repo/security/dependabot/1"
    },
    {
      "type": "code-vulnerability",
      "severity": "high",
      "rule": "js/sql-injection",
      "file": "src/api/users.js",
      "line": 45,
      "tool": "CodeQL",
      "gitHubNative": true
    },
    {
      "type": "exposed-secret",
      "severity": "critical",
      "secretType": "aws_access_key_id",
      "file": "config/aws.js",
      "line": 12,
      "gitHubNative": true
    }
  ],
  "summary": {
    "total": 3,
    "critical": 1,
    "high": 2,
    "byType": {
      "dependencyVulnerabilities": 1,
      "codeVulnerabilities": 1,
      "exposedSecrets": 1
    }
  }
}
```

## ⚠️ Common Mistakes

### Mistake 1: Passing Local Path Instead of URL
```typescript
// ❌ WRONG
await githubAgent.analyze({
  targetPath: '/tmp/cloned-repo'
});

// ✅ CORRECT
await githubAgent.analyze({
  repoUrl: 'https://github.com/owner/repo'
});
```

### Mistake 2: Expecting Local Code Analysis
```typescript
// ❌ GitHub Agent won't analyze uncommitted changes
// Use MultiToolSecurityAgent for local analysis
```

### Mistake 3: Using for Non-GitHub Repos
```typescript
// ❌ Won't work for GitLab
await githubAgent.analyze({
  repoUrl: 'https://gitlab.com/owner/repo'
});

// ✅ Wait for GitLabSecurityAgent (Phase 1F)
```

## 🚀 Quick Test

```bash
# Test with a public repo (no token needed for public data)
curl -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/OWASP/NodeGoat/dependabot/alerts

# Test with token (for private repos or higher limits)
curl -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token ghp_xxxxxxxxxxxxx" \
  https://api.github.com/repos/owner/repo/code-scanning/alerts
```

---

**Remember**: GitHubSecurityAgent leverages GitHub's continuous scanning - it doesn't duplicate work, it uses what GitHub already knows!