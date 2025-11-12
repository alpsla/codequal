# Commit-Based Analysis Cache Integration Guide

**Created**: November 12, 2025
**Purpose**: Avoid re-analyzing unchanged code by caching results per commit SHA

---

## 🎯 Key Concept: Cache by Commit, Not PR

**Critical Design Principle**: Cache is keyed by **commit SHA**, not PR number.

### Why This Matters

| Scenario | Commit SHA | Cache Behavior | Analysis Needed? |
|----------|-----------|----------------|------------------|
| Initial PR analysis | `abc123...` | Cache MISS | ✅ YES (fresh analysis) |
| Re-request same PR | `abc123...` | **Cache HIT** | ❌ NO (instant result) |
| User pushes fixes | `def456...` | Cache MISS | ✅ YES (NEW code) |
| Different PR, same code | `abc123...` | **Cache HIT** | ❌ NO (identical code) |

**Result**: Each code change triggers fresh analysis automatically. No stale results!

---

## 📊 Integration Examples

### Example 1: PR Analysis with Cache

```typescript
import { CommitAnalysisCache } from './commit-analysis-cache';
import { V9PRAnalyzer } from './v9-pr-analyzer';

const cache = new CommitAnalysisCache();
const analyzer = new V9PRAnalyzer();

async function analyzePRWithCache(
  repoUrl: string,
  prNumber: number,
  commitSha: string,
  options: { skipCache?: boolean } = {}
) {
  console.log(`🔍 Analyzing PR #${prNumber} at commit ${commitSha.substring(0, 8)}...`);

  // Step 1: Check cache
  const cached = await cache.get(commitSha, 'pr_analysis', options);

  if (cached) {
    console.log('✅ Using cached result (no analysis needed)');
    return cached;
  }

  // Step 2: Cache miss - run fresh analysis
  console.log('⚪ Cache miss - running fresh analysis...');
  const startTime = Date.now();

  const result = await analyzer.analyzePR({
    repositoryUrl: repoUrl,
    prNumber,
    skipCache: options.skipCache,
  });

  const duration = `${Math.round((Date.now() - startTime) / 1000)}s`;

  // Step 3: Store in cache
  await cache.set(
    commitSha,
    'pr_analysis',
    result,
    {
      repositoryUrl: repoUrl,
      prNumber,
      duration,
      issueCount: result.metadata.totalIssues,
      cost: result.metadata.totalCost,
    }
  );

  console.log(`✅ Analysis complete and cached (${duration})`);
  return result;
}
```

**Usage Example:**

```typescript
// First analysis of PR #123
await analyzePRWithCache(
  'https://github.com/org/repo',
  123,
  'abc123def456...',  // Current commit SHA
);
// Output:
// ⚪ Cache miss - running fresh analysis...
// ✅ Analysis complete and cached (68s)

// User re-requests same PR (no code changes)
await analyzePRWithCache(
  'https://github.com/org/repo',
  123,
  'abc123def456...',  // SAME commit SHA
);
// Output:
// ✅ Using cached result (no analysis needed)
// → Instant result! (< 1 second)

// User pushes fixes to PR #123
await analyzePRWithCache(
  'https://github.com/org/repo',
  123,
  '789xyz123456...',  // NEW commit SHA
);
// Output:
// ⚪ Cache miss - running fresh analysis...
// ✅ Analysis complete and cached (65s)
// → Fresh analysis of NEW code!
```

---

### Example 2: User Skill Scoring with Cache

```typescript
import { CommitAnalysisCache } from './commit-analysis-cache';

const cache = new CommitAnalysisCache();

async function calculateUserSkillScore(
  userId: string,
  repoUrl: string,
  latestCommitSha: string
) {
  console.log(`📊 Calculating skill score for user ${userId}...`);

  // Step 1: Check cache
  const cacheKey = `${userId}:${latestCommitSha}`;
  const cached = await cache.get(cacheKey, 'skill_scoring');

  if (cached) {
    console.log('✅ Using cached skill score');
    return cached;
  }

  // Step 2: Calculate fresh score
  console.log('⚪ Calculating fresh skill score...');
  const score = await analyzeUserContributions(userId, repoUrl);

  // Step 3: Store in cache
  await cache.set(
    cacheKey,
    'skill_scoring',
    score,
    {
      repositoryUrl: repoUrl,
      duration: score.duration,
    }
  );

  return score;
}
```

**Key Insight**: User skill score is tied to their latest commit. If they haven't pushed new code, return cached score instantly.

---

### Example 3: App/Repository Scoring with Cache

```typescript
import { CommitAnalysisCache } from './commit-analysis-cache';

const cache = new CommitAnalysisCache();

async function scoreRepository(
  repoUrl: string,
  latestCommitSha: string
) {
  console.log(`⭐ Scoring repository: ${repoUrl}...`);

  // Step 1: Check cache
  const cached = await cache.get(latestCommitSha, 'app_scoring');

  if (cached) {
    console.log('✅ Using cached app score');
    console.log(`   • Score: ${cached.score}/100`);
    console.log(`   • Last analyzed: ${cached.analyzedAt}`);
    return cached;
  }

  // Step 2: Run fresh scoring
  console.log('⚪ Running fresh app scoring...');
  const score = await performAppScoring(repoUrl);

  // Step 3: Store in cache
  await cache.set(
    latestCommitSha,
    'app_scoring',
    score,
    {
      repositoryUrl: repoUrl,
      duration: score.duration,
      issueCount: score.totalIssues,
    }
  );

  return score;
}
```

---

## 🔄 Real-World Workflow

### Scenario: Developer Working on PR

```
Day 1 (Monday):
└─ Developer creates PR #456 at commit abc123
   └─ CodeQual analyzes: 68 seconds, 420 issues found
   └─ Result cached with key "pr_analysis:abc123"

Day 1 (Later):
└─ Developer re-opens PR report in UI
   └─ CodeQual checks cache: HIT! (instant)
   └─ User sees report in < 1 second

Day 2 (Tuesday):
└─ Developer pushes fixes, new commit def456
   └─ CodeQual analyzes: 65 seconds, 200 issues found
   └─ Result cached with key "pr_analysis:def456"

Day 2 (Later):
└─ Manager reviews PR report
   └─ CodeQual checks cache: HIT! (instant)
   └─ Manager sees latest report in < 1 second

Week 2:
└─ PR merged, user views historical report
   └─ CodeQual checks cache: HIT! (instant)
   └─ Historical data available forever (until TTL expires)
```

**Benefits:**
- ✅ First analysis: 68 seconds (unavoidable)
- ✅ All subsequent views: < 1 second (cached)
- ✅ Each code change: Fresh analysis (no stale data)
- ✅ Cost savings: Analyze once, serve many times

---

## 🛠️ Integration into V9PRAnalyzer

### Modified V9PRAnalyzer with Cache

```typescript
import { CommitAnalysisCache } from './commit-analysis-cache';

export class V9PRAnalyzer {
  private cache: CommitAnalysisCache;

  constructor() {
    this.cache = new CommitAnalysisCache();
  }

  async analyzePR(request: PRAnalysisRequest): Promise<PRAnalysisResult> {
    // Get current commit SHA for PR
    const commitSha = await this.getCurrentCommitSha(
      request.repositoryUrl,
      request.prNumber
    );

    console.log(`[V9 PR Analyzer] PR #${request.prNumber} at commit ${commitSha.substring(0, 8)}`);

    // Check cache (unless skipCache is true)
    const cached = await this.cache.get(
      commitSha,
      'pr_analysis',
      { skipCache: request.skipCache }
    );

    if (cached) {
      console.log('[V9 PR Analyzer] ✅ Returning cached analysis');
      return cached;
    }

    // Run fresh analysis
    console.log('[V9 PR Analyzer] ⚪ Running fresh analysis...');
    const startTime = Date.now();

    // ... existing V9 analysis logic ...
    const result = await this.runAnalysis(request);

    const duration = `${Math.round((Date.now() - startTime) / 1000)}s`;

    // Cache the result
    await this.cache.set(
      commitSha,
      'pr_analysis',
      result,
      {
        repositoryUrl: request.repositoryUrl,
        prNumber: request.prNumber,
        duration,
        issueCount: result.metadata.totalIssues,
        cost: result.metadata.totalCost,
      }
    );

    return result;
  }

  private async getCurrentCommitSha(
    repoUrl: string,
    prNumber: number
  ): Promise<string> {
    // Use GitHub API to get PR's current HEAD commit SHA
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`
    );
    const pr = await response.json();
    return pr.head.sha;
  }
}
```

---

## ⚙️ Configuration Options

### Cache Version Management

When you upgrade analysis logic (e.g., new rules, different tools), increment the cache version:

```typescript
// Old cache version
const cache = new CommitAnalysisCache(
  undefined,  // default Supabase URL
  undefined,  // default Supabase key
  'v9.0'      // cache version
);

// After upgrading analysis logic
const cache = new CommitAnalysisCache(
  undefined,
  undefined,
  'v9.1'      // NEW cache version
);

// Invalidate old cache
await cache.invalidateVersion('v9.0');
```

### Custom TTL

```typescript
// Get with custom TTL (7 days instead of default 30)
const cached = await cache.get(
  commitSha,
  'pr_analysis',
  { ttlDays: 7 }
);

// Use case: Short TTL for active development
// Long TTL for historical/archived data
```

### Force Fresh Analysis

```typescript
// Skip cache and force fresh analysis
const result = await cache.get(
  commitSha,
  'pr_analysis',
  { skipCache: true }  // Always returns null
);
```

---

## 📊 Monitoring Cache Performance

### Get Cache Statistics

```typescript
const stats = await cache.getStats();

console.log('Cache Statistics:');
console.log(`  Total entries: ${stats.totalEntries}`);
console.log(`  PR analyses: ${stats.byAnalysisType.pr_analysis || 0}`);
console.log(`  Skill scores: ${stats.byAnalysisType.skill_scoring || 0}`);
console.log(`  App scores: ${stats.byAnalysisType.app_scoring || 0}`);
console.log(`  Oldest entry: ${stats.oldestEntry}`);
console.log(`  Newest entry: ${stats.newestEntry}`);
```

**Example Output:**
```
Cache Statistics:
  Total entries: 1,247
  PR analyses: 980
  Skill scores: 145
  App scores: 122
  Oldest entry: 2025-10-15T08:30:00Z
  Newest entry: 2025-11-12T03:45:00Z
```

### Cleanup Expired Entries

```typescript
// Run cleanup (via Supabase SQL)
const deleted = await supabase.rpc('cleanup_expired_commit_cache', { ttl_days: 30 });
console.log(`Cleaned up ${deleted} expired entries`);
```

---

## 💰 Cost Savings Calculation

### Example: 1,000 PR Analyses

**Without Cache:**
```
1,000 analyses × $0.07 per analysis = $70.00
Total time: 1,000 × 68s = 18.9 hours
```

**With Cache (90% cache hit rate):**
```
100 fresh analyses × $0.07 = $7.00
900 cached results × $0.00 = $0.00
Total cost: $7.00 (90% savings!)
Total time: (100 × 68s) + (900 × 1s) = 2.1 hours (89% time savings!)
```

**ROI**: $63 saved per 1,000 analyses + 16.8 hours saved

---

## ✅ Best Practices

1. **Always get commit SHA first**: Don't cache by PR number, use commit SHA
2. **Set appropriate TTL**: 30 days for active PRs, longer for historical
3. **Use cache versions**: Increment when upgrading analysis logic
4. **Monitor cache hit rate**: Track `cache_hits / total_requests`
5. **Clean up expired entries**: Run monthly cleanup script
6. **Log cache operations**: Track performance and debug issues

---

## 🔧 Troubleshooting

### Cache Not Working?

**Check 1: Supabase table exists**
```sql
SELECT * FROM commit_analysis_cache LIMIT 1;
```

**Check 2: Cache key format**
```typescript
// Correct format
const cacheKey = `pr_analysis:${commitSha}`;

// Incorrect (missing analysis type)
const cacheKey = commitSha;  // ❌ WRONG
```

**Check 3: TTL not expired**
```sql
SELECT * FROM commit_analysis_cache
WHERE commit_sha = 'abc123...'
AND analyzed_at > NOW() - INTERVAL '30 days';
```

---

## 📝 Summary

**Commit-based caching eliminates the fundamental problem:**

❌ **Without cache**: Every PR view = full analysis (68s, $0.07)
✅ **With cache**: First view = analysis, all subsequent = instant (< 1s, $0.00)

**Key insight**: Code doesn't change without a commit. Same commit = same code = same result.

**Deployment checklist:**
- [x] Create Supabase table (003_create_commit_analysis_cache.sql)
- [x] Deploy CommitAnalysisCache service
- [x] Integrate into V9PRAnalyzer
- [x] Add monitoring and cleanup scripts
- [x] Test with real PRs
- [x] Monitor cache hit rate

**Status**: Ready for production deployment ✅

---

**Created**: November 12, 2025
**Version**: 1.0
**Impact**: 90% cost savings, 89% time savings on cached analyses
