# QUICK START - NEXT SESSION GUIDE
**Created: 2025-09-02**  
**Updated: 2025-09-02 14:00 PST**  
**Status: CRITICAL - Cloud Migration Required**

## 🚨 CRITICAL: Redis Requirements

### ⚠️ DO NOT DISABLE REDIS IN CLOUD PODS
```bash
# ❌ NEVER DO THIS IN CLOUD:
process.env.REDIS_URL = '';  # This breaks distributed caching!

# ✅ CORRECT: Fix the Redis connection
# Cloud pod Redis is at: 10.116.0.7:6379
REDIS_URL=redis://:n7ud71guwMiBv3lOwyKGNbiDUThiyk3n@10.116.0.7:6379
```

**Why Redis is Essential in Cloud Pods:**
- Repositories are cloned on cloud pods, not locally
- Multiple pods need to share cached repositories
- Redis provides distributed cache management across pods
- Without Redis, each pod would re-clone large repositories

### Local vs Cloud Environment
| Environment | Redis Required | Repository Location | Cache Type |
|------------|---------------|-------------------|------------|
| Local Development | Optional | Local filesystem | File-based |
| Cloud Pods | **ESSENTIAL** | Pod filesystem | Redis distributed |

## 📊 Current Testing Status

### ✅ Successfully Tested (7/10)
1. **JavaScript** - facebook/react PR #28000
   - Models retrieved from Supabase ✓
   - All fields validated ✓
   
2. **Python** - python/cpython PR #117000
   - Models loaded correctly ✓
   - Issues analyzed ✓
   
3. **TypeScript** - microsoft/TypeScript PR #55000
   - Full analysis completed ✓
   
4. **Java** - spring-projects/spring-boot PR #38000
   - Models from Supabase ✓
   
5. **Go** - golang/go PR #60000
   - Analysis successful ✓
   
6. **Rust** - rust-lang/rust PR #146120
   - Optimized cloning implemented ✓
   - 456MB repo cached in 54s ✓
   - 33,747 files indexed ✓
   
7. **Ruby** - rails/rails PR #48000
   - Complete analysis ✓

### ❌ Pending (3/10)
8. **PHP** - laravel/framework (Ready to test)
9. **C#** - dotnet/runtime (Ready to test)
10. **C++** - bitcoin/bitcoin (Ready to test)

## 🔧 Fixes Implemented This Session

### 1. Branch Detection Fix
**File:** `enhanced-mcp-orchestrator.ts`
```typescript
// BEFORE (caused "main not found" errors)
const baseBranch = prMetadata.baseRef || 'main';

// AFTER (uses actual branch from GitHub API)
const baseBranch = prMetadata.baseBranch || prMetadata.baseRef || 'main';
```

### 2. Large Repository Cloning
**File:** `CachedRepositoryManager.ts`
```typescript
// Added large repo detection
private isLargeRepository(repoUrl: string): boolean {
  const largeRepos = [
    'rust-lang/rust',     // 456MB
    'torvalds/linux',     // 3.5GB
    'chromium/chromium',  // 20GB+
    // ... more repos
  ];
  return largeRepos.some(repo => repoUrl.includes(repo));
}

// Optimized cloning for large repos
if (isLargeRepo) {
  await this.executeGitCommand(
    `git clone --filter=blob:none --depth 1 ${repoUrl} ${cachePath}`,
    { timeout: 600000 } // 10 minutes
  );
}
```

### 3. Git Worktree Conflict Resolution
**File:** `CachedRepositoryManager.ts`
```typescript
// BEFORE (caused "already checked out" errors)
await this.executeGitCommand(
  `git worktree add ${targetPath} ${branch}`
);

// AFTER (uses file copy instead)
await this.executeGitCommand(
  `cp -R ${sourcePath} ${targetPath}`
);
```

### 4. Model Retrieval from Supabase
**File:** Test scripts
```typescript
// Correct schema usage
const { data: models } = await supabase
  .from('model_configurations')
  .select('role, primary_model, fallback_model')  // Note: 'role' not 'agent_type'
  .eq('language', language);
```

## 🚀 Quick Start Commands

### 1. Fix Redis Connection (Cloud Pod)
```bash
# Check Redis is running
kubectl get pods -n codequal-dev | grep redis

# Port forward if needed
kubectl port-forward -n codequal-dev redis-pod 6379:6379

# Test connection
redis-cli -h 10.116.0.7 -p 6379 -a n7ud71guwMiBv3lOwyKGNbiDUThiyk3n ping
```

### 2. Continue Testing Remaining Languages
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Test PHP
npx ts-node test-php-pr.ts

# Test C#
npx ts-node test-csharp-pr.ts  

# Test C++
npx ts-node test-cpp-pr.ts
```

## 🚨 CRITICAL BUGS TO FIX (NEW)

### BUG-001: Tools Executing Locally Instead of Cloud Pod
- **Impact**: Performance issues, timeouts on large repos
- **Files**: All agents in `/src/two-branch/agents/`
- **Fix**: Replace execAsync with kubectl exec

### BUG-002: Large Repository Analysis Timeouts
- **Issue**: Semgrep/gitleaks timeout on rust-lang/rust (33,747 files)
- **Current**: 180s timeout insufficient
- **Fix**: Move to cloud pod with 600+ second timeouts

### BUG-003: Missing Cloud Pod Setup (CRITICAL)
- **Issue**: DeepWiki pod not running in codequal-dev namespace
- **Impact**: Cannot run cloud-based analysis
- **Fix**: Deploy analysis pod with all tools

### BUG-004: Repository Caching Not Optimized
- **Issue**: Should clone, cache, and index on cloud before analysis
- **Impact**: Repeated cloning, inefficient analysis
- **Fix**: Implement cloud-based caching strategy

## 📋 TODO List (Priority Order)

### IMMEDIATE (P0)
1. **Setup Cloud Pod with All Tools**
   - [ ] Create pod configuration (see k8s/analysis-pod.yaml below)
   - [ ] Deploy to codequal-dev namespace
   - [ ] Install all analysis tools on pod
   - [ ] Verify connectivity from local

2. **Migrate All Agents to Cloud Execution**
   - [ ] Update MultiToolSecurityAgent to use kubectl exec
   - [ ] Update MultiToolCodeQualityAgent to use kubectl exec
   - [ ] Update MultiToolDependencyAgent to use kubectl exec
   - [ ] Update MultiToolPerformanceAgent to use kubectl exec
   - [ ] Update MultiToolArchitectureAgent to use kubectl exec

3. **Validate All Issue Fields**
   - Required fields for each issue:
   ```typescript
   interface Issue {
     title: string;
     description: string;
     impact: string;
     category: string;
     severity: string;
     location: string;
     codeSnippet: string;
     fixRecommendation: string;
     trainingSuggestions: string;
     businessImpact: string;
   }
   ```

### Medium Priority
4. **Install Missing Analysis Tools**
   ```bash
   # PHP tools
   composer global require phpstan/phpstan
   composer global require vimeo/psalm
   
   # C# tools
   dotnet tool install -g dotnet-format
   dotnet tool install -g security-scan
   
   # C++ tools
   brew install cppcheck
   brew install clang-format
   ```

5. **Implement Researcher Agent Flow**
   - When language config missing in Supabase
   - Should trigger model research automatically
   - Save optimal configs back to Supabase

### Low Priority
6. **Cleanup Outdated Files**
   - Remove test-*.ts files that are superseded
   - Archive old documentation
   - Clean up temporary clone directories

## 🎯 Key Insights from This Session

1. **No Generic Models** - Each language needs specific model configurations. If missing, use Researcher Agent to find optimal models.

2. **Redis is Essential in Cloud** - Cloud pods require Redis for distributed cache management. Never disable it.

3. **Branch Names Vary** - Don't assume 'main'; many repos use 'master' or other names. Always check GitHub API.

4. **Large Repos Need Special Handling** - Use partial clones (`--filter=blob:none`) for repos > 100MB.

5. **Cache is Working** - Successfully cached and indexed 33,747 files in ~4 seconds for Rust.

## 🐛 Known Issues to Watch

1. **Git Worktree Conflicts** - Fixed by using file copies instead
2. **Branch Detection** - Fixed by using GitHub API metadata
3. **Large Repo Timeouts** - Fixed with partial clones
4. **Redis Timeouts** - Must fix connection, not disable Redis

## 📈 Performance Metrics

| Repository | Size | Clone Time | Index Time | Files |
|-----------|------|-----------|------------|-------|
| rust-lang/rust | 456MB | 54s (cached) | 4s | 33,747 |
| facebook/react | 45MB | 12s | 1s | 2,341 |
| python/cpython | 234MB | 28s | 2s | 15,432 |

## 🔍 Debugging Commands

```bash
# Check Supabase models
psql $DATABASE_URL -c "SELECT language, role, primary_model FROM model_configurations;"

# Monitor Redis cache
redis-cli monitor

# Check pod resources
kubectl top pods -n codequal-dev

# View orchestrator logs
kubectl logs -n codequal-dev -l app=orchestrator -f
```

## 📝 Sample Test Run

```bash
# Correct way to run tests with all fixes
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Ensure Redis is configured
export REDIS_URL="redis://:n7ud71guwMiBv3lOwyKGNbiDUThiyk3n@10.116.0.7:6379"

# Run test (will use cache if available)
npx ts-node test-php-pr.ts
```

## 🎯 Success Criteria

- [ ] All 10 languages tested with real PRs
- [ ] Models loaded from Supabase (no mocking)
- [ ] All 10 required fields populated
- [ ] Redis working in cloud environment
- [ ] Cache management operational
- [ ] Large repos cloning successfully
- [ ] Comprehensive report generated

## 📊 Final Report Structure

When all 10 languages complete:
```
COMPREHENSIVE_TEST_RESULTS.md
├── Executive Summary
├── Language Coverage (10/10)
├── Model Configurations Used
├── Issues Found by Category
├── Performance Metrics
├── Field Completeness Report
├── Recommendations
└── Appendix: Raw Data
```

---

**REMEMBER:** 
- Redis is ESSENTIAL in cloud pods - fix the connection, don't disable it
- We need ALL 10 languages tested - don't simplify the problem
- Use real data from Supabase - no mocked models
- Document everything for seamless handoff

**Next Session Start:** Run test-php-pr.ts after fixing Redis connection