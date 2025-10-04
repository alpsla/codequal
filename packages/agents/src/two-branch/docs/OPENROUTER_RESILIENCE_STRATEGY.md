# OpenRouter API Resilience Strategy

## Overview

CodeQual V9 implements a **3-tier resilience strategy** to ensure continuous service availability even when OpenRouter API keys fail. This document explains the complete fault-tolerance architecture.

## Problem Statement

**What we discovered (2025-10-03):**
- OpenRouter keys can fail with "401 User not found" even when freshly created
- Account-level issues can make ALL keys from one account unusable
- Single key = Single point of failure = Complete service outage

**Production requirement:**
> Users must **ALWAYS** get a report, even if AI services are degraded or unavailable

## 3-Tier Resilience Architecture

### Tier 1: Multi-Key Automatic Fallback ✅ IMPLEMENTED

**Location:** `src/two-branch/services/openrouter-key-manager.ts`

**How it works:**
1. Configure multiple OpenRouter API keys in `.env`
2. System automatically rotates through keys when one fails
3. Failed keys are temporarily blacklisted (5 minutes for rate limits, permanent for auth errors)
4. Exponential backoff retry (2s, 4s, 8s) for transient errors

**Configuration:**

```bash
# Option 1: Comma-separated list (recommended)
OPENROUTER_API_KEYS=sk-or-v1-key1,sk-or-v1-key2,sk-or-v1-key3

# Option 2: Numbered keys
OPENROUTER_API_KEY_1=sk-or-v1-key1
OPENROUTER_API_KEY_2=sk-or-v1-key2
OPENROUTER_API_KEY_3=sk-or-v1-key3

# Option 3: Single key (backward compatible, NOT recommended for production)
OPENROUTER_API_KEY=sk-or-v1-single-key
```

**Best practices:**
- **Minimum 3 keys** for production
- Use keys from **different OpenRouter accounts** (avoid single account dependency)
- Monitor key usage via `getKeyStatuses()` API
- Rotate keys monthly

**Error handling:**
- **401/403 (Auth)** → Blacklist permanently, try next key immediately
- **429 (Rate limit)** → Blacklist for 1 minute, try next key immediately
- **500/503 (Server error)** → Retry with exponential backoff (2s, 4s, 8s)
- **Network timeout** → Retry with exponential backoff

### Tier 2: Fallback Model Selection 🚧 PLANNED

**Status:** Partially implemented via `DynamicModelSelector`

**Enhancement needed:**
- Currently selects primary + fallback model from Supabase
- Need to add automatic fallback to cheaper/faster models when primary fails
- Example: `google/gemini-2.5-pro` (primary) → `openai/gpt-3.5-turbo` (fallback)

**Implementation priority:** Medium (Tier 1 + Tier 3 provide sufficient resilience)

### Tier 3: Graceful Degradation (Static Analysis Fallback) ✅ IMPLEMENTED

**Location:** `src/two-branch/agents/specialized-agents.ts`

**How it works:**
When ALL API keys fail, specialized agents return structured default fixes based on issue metadata:

```typescript
// Example: SecurityAgent fallback when AI unavailable
{
  fix: "Address this critical security issue according to security best practices",
  correctedCode: `
    ${lineNum}: // SECURITY FIX: Implement secure coding practice
    ${lineNum + 1}: // Validate and sanitize all inputs
    ${lineNum + 2}: // Use parameterized queries or prepared statements
    ${lineNum + 3}: // Apply principle of least privilege
  `,
  bestPractices: [
    "Review security guidelines",
    "Apply appropriate fix based on context"
  ]
}
```

**Coverage:**
- ✅ SecurityAgent: Provides security-focused templates
- ✅ PerformanceAgent: Provides performance optimization templates
- ✅ CodeQualityAgent: Provides code quality templates
- ✅ ArchitectureAgent: Provides design pattern templates
- ✅ DependencyAgent: Provides dependency management templates

**Result:**
- **Users always get a report** with actionable suggestions
- Clear indication when AI was unavailable (via `model: 'fallback-static-analysis'`)
- No service disruption, just reduced fix quality

## Integration Points

### 1. Specialized Agents (Fix Suggestions)

**File:** `src/two-branch/agents/specialized-agents.ts`

```typescript
// Uses OpenRouterKeyManager automatically
const keyManager = getOpenRouterKeyManager();

const response = await keyManager.executeWithFallback(
  async (client) => {
    return await client.chat.completions.create({...});
  },
  this.agentRole // For logging
);
```

### 2. V9 Integrated Analyzer (AI Insights)

**File:** `src/two-branch/analyzers/v9-integrated-analyzer.ts`

**Status:** 🚧 Needs integration (currently throws on failure)

**Required change:**
```typescript
// BEFORE (throws on failure)
const response = await this.openRouter.chat.completions.create({...});

// AFTER (resilient with fallback)
const keyManager = getOpenRouterKeyManager();
try {
  const response = await keyManager.executeWithFallback(
    async (client) => client.chat.completions.create({...}),
    'V9Analyzer'
  );
} catch (error) {
  // Fallback: Generate insights from static analysis only
  return this.generateBasicInsights(request);
}
```

### 3. Report Formatter (AI-Generated Sections)

**File:** `src/two-branch/analyzers/v9-report-formatter.ts`

**Status:** ✅ Already has fallback via specialized agents

## Monitoring & Observability

### Key Health Monitoring

```typescript
import { getOpenRouterKeyManager } from './services/openrouter-key-manager';

const keyManager = getOpenRouterKeyManager();
const statuses = keyManager.getKeyStatuses();

statuses.forEach(status => {
  console.log(`Key: ${status.key}`);
  console.log(`Failures: ${status.failureCount}`);
  console.log(`Last used: ${status.lastUsed}`);
  console.log(`Blacklisted until: ${status.blacklistedUntil}`);
  console.log(`Last error: ${status.lastError}`);
});
```

### Recommended Alerts

1. **All keys blacklisted** → Critical alert, add more keys immediately
2. **>50% keys blacklisted** → Warning, investigate account issues
3. **Any key with >10 failures** → Info, consider removing/replacing key

## Testing

### Unit Tests

```bash
# Test key rotation
npm test -- openrouter-key-manager.test.ts

# Test specialized agent fallbacks
npm test -- specialized-agents.test.ts
```

### Integration Tests

```bash
# Test with valid keys
OPENROUTER_API_KEYS=key1,key2,key3 npm run test:v9:integration

# Test with invalid keys (should use fallback)
OPENROUTER_API_KEYS=invalid1,invalid2 npm run test:v9:integration
```

## Production Deployment Checklist

- [ ] Configure **minimum 3 API keys** from different accounts
- [ ] Set `OPENROUTER_API_KEYS` in production `.env`
- [ ] Test failover by temporarily blocking one key
- [ ] Set up monitoring for key health
- [ ] Configure alerts for "all keys blacklisted"
- [ ] Document key rotation process for ops team
- [ ] Test graceful degradation (all keys invalid)

## Cost Optimization

**Multi-key strategy does NOT increase costs:**
- Keys rotate only on failure, not on every request
- Failed keys are blacklisted to avoid repeated failures
- Same total requests, just distributed across multiple keys

**Actual cost impact:**
- Minimal retry overhead (2-3 extra requests on transient failures)
- Retry delay prevents thundering herd

## Troubleshooting

### Issue: "All OpenRouter API keys are currently blacklisted"

**Cause:** All keys failed (auth error, rate limit, or account issues)

**Solution:**
1. Check OpenRouter account status for all accounts
2. Add fresh keys from working accounts
3. Wait 5 minutes for temporary blacklists to expire
4. Check logs for specific error messages

### Issue: "User not found" for freshly created key

**Cause:** OpenRouter account-level bug (database sync issue)

**Solution:**
1. Contact OpenRouter support immediately
2. Try creating key from different account
3. System will use fallback fixes until resolved
4. Users still get reports (graceful degradation working)

### Issue: Keys working locally but failing in production

**Cause:** Environment variable not loaded correctly

**Solution:**
```bash
# Verify keys loaded
echo $OPENROUTER_API_KEYS

# Check key manager initialization logs
grep "OpenRouterKeyManager" logs/*.log

# Test key directly
curl -X GET "https://openrouter.ai/api/v1/auth/key" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY_1"
```

## Future Enhancements

1. **Dynamic key provisioning** - Auto-generate keys via OpenRouter API
2. **Cost-based routing** - Use cheaper models for low-priority requests
3. **Geographic key routing** - Use region-specific keys for latency optimization
4. **Predictive blacklisting** - ML-based prediction of key failures
5. **Self-healing** - Auto-contact support when all keys fail

## References

- **Implementation:** `src/two-branch/services/openrouter-key-manager.ts`
- **Integration:** `src/two-branch/agents/specialized-agents.ts`
- **Tests:** `src/two-branch/tests/__tests__/openrouter-resilience.test.ts` (TODO)
- **OpenRouter Docs:** https://openrouter.ai/docs/api-keys
- **V9 Architecture:** `V9_CRITICAL_KNOWLEDGE_BASE.md`

---

**Last Updated:** 2025-10-03
**Status:** Tier 1 (Multi-key) + Tier 3 (Fallback) ✅ Implemented
**Next:** Tier 2 (Model fallback) 🚧 Planned
