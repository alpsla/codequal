# Tool Execution Pipeline

**Last Updated**: October 3, 2025
**Status**: Java Production Ready with Oracle PostgreSQL Integration

---

## 🔄 Complete Analysis Flow

```
GitHub PR Event
    ↓
Webhook → API Server
    ↓
┌────────────────────────────────────────┐
│ 1. Repository Preparation              │
│ - Clone main + PR branches             │
│ - Smart file selection                 │
│ - Redis cache check                    │
└────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────┐
│ 2. Tool Execution (Parallel)           │
│ ┌────────────────────────────────────┐ │
│ │ Docker: PMD                        │ │
│ │ Time: 25s, Files: 3472             │ │
│ │ Result: 138 P1 issues              │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ Docker: Checkstyle                 │ │
│ │ Time: 0.5s (changed files only)    │ │
│ │ Result: 0 errors                   │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ Docker: Semgrep                    │ │
│ │ Time: 38s (security-critical only) │ │
│ │ Result: 0 security issues          │ │
│ └────────────────────────────────────┘ │
│ Optional:                              │
│ ┌────────────────────────────────────┐ │
│ │ Docker: SpotBugs                   │ │
│ │ Time: 150s (compilation + analysis)│ │
│ │ Result: 3 P1 bugs                  │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ Docker: Dependency-Check           │ │
│ │ Time: < 5s (Oracle PostgreSQL)     │ │
│ │ CVEs: 208K+ cached on Oracle Cloud │ │
│ │ Result: 2 CVEs detected            │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────┐
│ 3. Agent Processing (Parallel)         │
│ - Security Agent                       │
│ - Quality Agent                        │
│ - Performance Agent                    │
│ - Architecture Agent                   │
│ - Dependency Agent                     │
└────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────┐
│ 4. V9 Orchestrator                     │
│ - Deduplicates issues                  │
│ - Compares branches                    │
│ - Severity filtering                   │
└────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────┐
│ 5. AI Enhancement (Parallel)           │
│ ├─ Educator: Explanations              │
│ └─ Fix Generator: AI-generated fixes   │
└────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────┐
│ 6. Report Generation                   │
│ - Ultra-minimal PR comment             │
│ - Web dashboard with details           │
│ - Storage in Supabase                  │
└────────────────────────────────────────┘
    ↓
GitHub PR Comment Posted
```

---

## 🛠️ Tool Configuration by Language

### Java (Production Ready - 95%)

**Standard Mode** (2-3 minutes):
```yaml
tools:
  - name: PMD
    priority: 1-only  # Critical only
    time: 25s
    parallel: 4

  - name: Checkstyle
    mode: changed-files-only
    time: 0.5s
    parallel: 4

  - name: Semgrep
    file-selection: security-critical
    time: 38s
    parallel: 4
```

**Enhanced Mode** (2-3 minutes):
```yaml
tools:
  - name: SpotBugs
    enabled: optional
    requires: compilation
    time: 150s

  - name: Dependency-Check
    enabled: REQUIRED (automatic)
    backend: Oracle Cloud PostgreSQL
    time: < 5s  # Cached CVE database
    database: 208K+ CVEs on Oracle Cloud
    updates: Daily cron at 2 AM UTC
    configuration: Zero-config (DEFAULT_JAVA_CONFIG)
```

**Performance Optimization:**
- ✅ 2-stage orchestration (Semgrep alone, then PMD+Checkstyle parallel)
- ✅ Smart file selection (708/3472 files for Semgrep = 74% faster)
- ✅ Changed-files-only for Checkstyle (0.5s vs 91s)
- ✅ **Oracle PostgreSQL CVE cache (< 5s vs 5-10 minutes!)**
- **Total**: 139s standard, 144s enhanced (vs 15-20 min with file-based Dependency-Check)

### Python (In Progress - 40%)

**Planned Tools**:
```yaml
tools:
  - name: Pylint
    severity: E, F only  # Errors and Fatal only
    time: ~30s

  - name: Bandit
    severity: HIGH, CRITICAL
    time: ~20s

  - name: MyPy
    strict-mode: true
    time: ~40s

  - name: Safety
    cache: shared-vulnerability-db
    time: ~15s
```

**Status**: Needs calibration

### TypeScript (In Progress - 30%)

**Planned Tools**:
```yaml
tools:
  - name: ESLint
    rules: security + quality
    time: ~25s

  - name: TSC
    strict: true
    time: ~45s

  - name: npm audit
    severity: high, critical
    cache: npm-advisory-db
    time: ~10s
```

**Status**: Needs calibration

### Go (In Progress - 20%)

**Planned Tools**:
```yaml
tools:
  - name: golangci-lint
    linters: gosec, govet, staticcheck
    time: ~30s

  - name: gosec
    severity: HIGH, CRITICAL
    time: ~15s
```

**Status**: Needs calibration

---

## 📊 Severity Filtering Strategy

### Three-Tier System

```
┌─────────────────────────────────────────────────────────┐
│ Tier 1: BLOCKING (Critical Only)                       │
│ - PMD Priority 1                                        │
│ - SpotBugs Priority 1                                   │
│ - Semgrep ERROR severity                                │
│ - Checkstyle errors                                     │
│ Total: ~141 issues                                      │
│ Action: Block PR merge                                  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Tier 2: RECOMMENDATIONS (High Priority)                │
│ - PMD Priority 2                                        │
│ - SpotBugs Priority 2                                   │
│ - Semgrep WARNING severity                              │
│ Total: ~4,646 issues                                    │
│ Action: Show in dashboard, don't block                  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ Tier 3: INFORMATIONAL (Low Priority)                   │
│ - All other issues                                      │
│ Total: ~280,000 issues                                  │
│ Action: Hidden by default, available on demand         │
└─────────────────────────────────────────────────────────┘
```

**Noise Reduction**: 99.9% (269k → 141 blocking)

---

## 🚀 Parallel Execution Strategy

### Java 2-Stage Pipeline

**Why not run all 3 core tools in parallel?**
- Semgrep uses all 4 CPUs efficiently
- PMD + Checkstyle together also use 4 CPUs
- Running all 3 = CPU contention = slower

**Optimal Strategy**:
```
Stage 1 (48s):
  Semgrep (4 parallel workers, 1 CPU each)

Stage 2 (91s):
  PMD (4 parallel workers, 1 CPU each)
  +
  Checkstyle (4 parallel workers, 1 CPU each)
  (Both complete in 91s - Checkstyle finishes first)

Total: 48s + 91s = 139s
vs Sequential: 44s + 91s + 48s = 183s
Savings: 44s (24%)
```

### Multi-Language Parallel Execution

When analyzing multi-language projects:
```
Repository contains: Java + Python + TypeScript

Parallel execution:
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Java tools │ │ Python     │ │ TypeScript │
│ 2-3 min    │ │ tools      │ │ tools      │
│            │ │ 2-3 min    │ │ 1-2 min    │
└────────────┘ └────────────┘ └────────────┘
Total: ~3 minutes (vs 6-7 min sequential)
```

---

## 💾 Caching Strategy

### Multi-Level Caching

```
┌──────────────────────────────────────────┐
│ Level 1: Redis Cache (Hot)              │
│ - Tool results (1 hour TTL)             │
│ - Repository metadata (24 hour TTL)     │
│ - File hashes (persistent)              │
│ Hit rate: 70-85%                        │
└──────────────────────────────────────────┘
         ↓ (on miss)
┌──────────────────────────────────────────┐
│ Level 2: Shared Volume Cache (Warm)     │
│ - CVE database (updated daily)          │
│ - Repository clones (7 day TTL)         │
│ - NPM/Maven packages (LRU eviction)     │
│ Hit rate: 90-95%                        │
└──────────────────────────────────────────┘
         ↓ (on miss)
┌──────────────────────────────────────────┐
│ Level 3: Network Fetch (Cold)           │
│ - Clone repository from GitHub          │
│ - Download CVE database from NVD        │
│ - Fetch packages from registries        │
│ Performance: Slowest (minutes)          │
└──────────────────────────────────────────┘
```

### Cache Invalidation

```typescript
// Invalidate when:
invalidateCache({
  repository, // Repository changes
  prNumber,   // New commits pushed
  branch,     // Branch updated
  toolVersion, // Tool upgraded
  config       // Configuration changed
});
```

---

## 🔍 Smart File Selection

### Selection Algorithm

```typescript
function selectFiles(repository, prNumber, maxFiles = 500) {
  const allFiles = repository.listFiles();

  if (allFiles.length <= 10000) {
    // Small repo: analyze everything
    return allFiles;
  }

  // Large repo: smart selection
  const selection = {
    prChanged: getPRChangedFiles(prNumber),      // 60% weight
    securityCritical: getSecurityCriticalFiles(), // 20% weight
    entryPoints: getEntryPoints(),                // 10% weight
    config: getConfigFiles(),                     // 5% weight
    tests: getTestFiles()                         // 5% weight
  };

  return prioritize(selection, maxFiles);
}
```

**Example (Apache Kafka)**:
- Total files: 3,472 Java files
- PR changed: 12 files
- Security-critical: 708 files (Controllers, Auth, Security, etc.)
- Selected: 720 files (708 critical + 12 PR)
- **Coverage**: 100% of PR + all security-critical paths

---

## 📈 Performance Benchmarks

### Real-World Results (Apache Kafka)

| Tool | Sequential | Optimized | Improvement |
|------|-----------|-----------|-------------|
| PMD | 44s | 25s | 43% faster |
| Checkstyle | 91s | 0.5s | 99% faster |
| Semgrep | 150s | 38s | 75% faster |
| SpotBugs | N/A | 150s | (compilation required) |
| Dep-Check | 15-20 min | 30-60s | **95% faster** |
| **Total** | 305s (5 min) | 139s (2.3 min) | **54% faster** |

### Scaling Performance

| Repository Size | Files | Standard | Enhanced |
|----------------|-------|----------|----------|
| Small (< 100) | 50-100 | 30-60s | 1-2 min |
| Medium (< 1k) | 100-1000 | 1-2 min | 3-4 min |
| Large (< 10k) | 1000-10000 | 2-3 min | 4-5 min |
| Huge (> 10k) | 10000+ | 2-3 min | 4-5 min |

**Note**: Huge repositories use smart selection, so time plateaus.

---

## 🎯 Next Steps

### Immediate (This Week)
1. ✅ Java tools production ready
2. ⏳ SpotBugs parser completion
3. ⏳ Dependency-Check parser
4. ⏳ V9 integration

### Short-term (This Month)
5. Python tools calibration
6. TypeScript tools calibration
7. Go tools calibration
8. Multi-language parallel execution

### Long-term (Next Quarter)
9. ML-based smart selection
10. Predictive caching
11. Auto-scaling based on load
12. Cross-language dependency analysis

---

**Status**: Java Production Ready, Other Languages 20-40% Complete
**Performance**: 54% faster overall, 95% faster for Dependency-Check
**Next**: Python tools calibration
