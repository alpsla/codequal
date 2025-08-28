# DeepWiki Repository Clone Issue - Troubleshooting Guide

## Issue Summary
**Date Identified:** August 28, 2025  
**Severity:** High - Prevented all DeepWiki repository analysis  
**Resolution Status:** ✅ RESOLVED

## Problem Description

### Symptoms
DeepWiki was failing to clone GitHub repositories with the following error:
```
fatal: repository 'https://github.com/sindresorhus/is-odd/' not found
Error during cloning: Cloning into '/root/.adalflow/repos/sindresorhus_is-odd'...
```

### Initial Hypothesis
The error message showed a trailing slash in the URL (`/is-odd/`), leading to initial suspicion that:
1. DeepWiki was incorrectly adding a trailing slash to repository URLs
2. Git configuration had URL rewrite rules causing the issue

### Impact
- All repository analysis requests failed with 500 errors
- DeepWiki could not analyze any GitHub repositories
- Integration tests were failing

## Root Cause Analysis

### Investigation Steps

1. **Checked DeepWiki Health**
   ```bash
   kubectl get pods -n codequal-dev -l app=deepwiki
   curl http://localhost:8001/health
   ```
   Result: DeepWiki was running and healthy

2. **Examined Git Configuration**
   ```bash
   kubectl exec -n codequal-dev deployment/deepwiki -- git config --global --list
   ```
   Found: `url.https://ghp_TOKEN@github.com/.insteadof=https://github.com/`
   
3. **Tested Direct Cloning in Pod**
   ```bash
   kubectl exec -n codequal-dev deployment/deepwiki -- \
     git clone --depth=1 https://github.com/sindresorhus/is-odd /tmp/test
   ```
   Result: Same error - repository not found

4. **Verified Repository Existence**
   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     https://api.github.com/repos/sindresorhus/is-odd
   ```
   Result: **404 - Repository does not exist!**

### Actual Root Cause
The repository `sindresorhus/is-odd` does not exist on GitHub. The trailing slash in the error message was a red herring - git was correctly reporting that the repository couldn't be found.

## Resolution

### Immediate Fix
Updated test scripts to use valid, existing repositories:

```typescript
// Before (non-existent repository)
const request = {
  repo_url: 'https://github.com/sindresorhus/is-odd',
  // ...
}

// After (valid repository)
const request = {
  repo_url: 'https://github.com/sindresorhus/ky',
  // ...
}
```

### Verification Steps

1. **Confirm Repository Exists**
   ```bash
   curl -s https://api.github.com/repos/sindresorhus/ky | jq .name
   # Output: "ky"
   ```

2. **Test Cloning in Pod**
   ```bash
   kubectl exec -n codequal-dev deployment/deepwiki -- \
     git clone --depth=1 https://github.com/sindresorhus/ky /tmp/test
   # Success!
   ```

3. **Run Analysis Test**
   ```bash
   USE_DEEPWIKI_MOCK=false npx ts-node test-deepwiki-simple-repo.ts
   # ✅ Response received in 2.2s
   ```

## Lessons Learned

### Key Takeaways
1. **Always verify repository existence** before using in tests
2. **Git error messages can be misleading** - the trailing slash was not the issue
3. **Check the obvious first** - verify that resources exist before debugging complex systems
4. **Test with known-good data** - use popular, stable repositories for testing

### Common Misconceptions
- ❌ "Git is adding a trailing slash to URLs" - This is normal git behavior
- ❌ "Git config URL rewrite rules are broken" - They were working correctly
- ✅ "The repository doesn't exist" - This was the actual issue

## Prevention Measures

### Best Practices for Testing

1. **Use Well-Known Repositories**
   ```typescript
   const RELIABLE_TEST_REPOS = [
     'https://github.com/sindresorhus/ky',
     'https://github.com/facebook/react',
     'https://github.com/vercel/next.js'
   ];
   ```

2. **Implement Repository Validation**
   ```typescript
   async function validateRepository(url: string): Promise<boolean> {
     const [owner, repo] = url.split('/').slice(-2);
     const response = await fetch(
       `https://api.github.com/repos/${owner}/${repo}`
     );
     return response.status === 200;
   }
   ```

3. **Add Pre-flight Checks**
   ```typescript
   before('Validate test repositories', async () => {
     for (const repo of TEST_REPOSITORIES) {
       const exists = await validateRepository(repo);
       expect(exists).to.be.true;
     }
   });
   ```

## Quick Reference

### DeepWiki Health Check
```bash
# Check pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# Start port forwarding
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &

# Health check
curl http://localhost:8001/health
```

### Test Repository Clone
```bash
# Test in pod
kubectl exec -n codequal-dev deployment/deepwiki -- \
  git clone --depth=1 https://github.com/sindresorhus/ky /tmp/test

# Clean up
kubectl exec -n codequal-dev deployment/deepwiki -- rm -rf /tmp/test
```

### Common Valid Test Repositories
- `sindresorhus/ky` - Small, modern HTTP client
- `sindresorhus/p-limit` - Simple concurrency limiter
- `sindresorhus/ora` - Terminal spinner library

## Related Documentation
- [DeepWiki API Documentation](./deepwiki-api.md)
- [Git Configuration Guide](./git-config.md)
- [Kubernetes Troubleshooting](./k8s-troubleshooting.md)

## Support
For additional help with DeepWiki issues:
- Check logs: `kubectl logs -n codequal-dev deployment/deepwiki --tail=100`
- View all configuration: `kubectl describe deployment/deepwiki -n codequal-dev`
- Contact: DevOps team via #deepwiki-support channel

---

**Document Version:** 1.0  
**Last Updated:** August 28, 2025  
**Author:** CodeQual Development Team



 Quick Start Commands

  1️⃣ Check Pod Status

  kubectl get pods -n codequal-dev -l app=deepwiki

  2️⃣ Start Port Forwarding

  kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &

  3️⃣ Verify Health

  curl http://localhost:8001/health

  4️⃣ Test with VALID Repository (Critical!)

  # ⚠️ DON'T use sindresorhus/is-odd - it doesn't exist!
  # ✅ Use sindresorhus/ky instead:

  kubectl exec -n codequal-dev deployment/deepwiki -- \
    git clone --depth=1 https://github.com/sindresorhus/ky /tmp/test

  ⚠️ MOST IMPORTANT:

  The main issue is usually that sindresorhus/is-odd doesn't exist! Always use valid repositories like:
  - sindresorhus/ky ✅
  - sindresorhus/p-limit ✅
  - facebook/react ✅

  🔍 Quick Diagnostic

  # Check if your test repo actually exists:
  curl -s -o /dev/null -w "%{http_code}" \
    https://api.github.com/repos/sindresorhus/is-odd
  # Returns 404 = doesn't exist!

  The complete command reference is saved in DEEPWIKI_CLONE_FIX_COMMANDS.md for future reference!

╭─────────────────────────────────────────────────────