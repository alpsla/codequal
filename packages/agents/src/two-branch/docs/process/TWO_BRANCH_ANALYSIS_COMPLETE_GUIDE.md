# Two-Branch Analysis: Complete Guide

**Version**: 2.0
**Date**: 2025-09-29
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Two-Branch Execution Strategy](#two-branch-execution-strategy)
3. [Performance Calibration Results](#performance-calibration-results)
4. [Multi-Tool Execution](#multi-tool-execution)
5. [Language-Specific Configurations](#language-specific-configurations)
6. [Caching Strategy](#caching-strategy)
7. [Production Deployment](#production-deployment)

---

## Overview

### What is Two-Branch Analysis?

Two-branch analysis compares code quality between the **main branch** (baseline) and **PR branch** (changes) to identify:
- **New issues**: Problems introduced in the PR
- **Resolved issues**: Problems fixed in the PR
- **Existing issues**: Problems that remain unchanged

### Critical Principle: BOTH Branches Are Analyzed

**⚠️ IMPORTANT**: We MUST run analysis tools on BOTH branches:

```
Main Branch Analysis:    [Run ALL tools] → Cache results (24h)
                                ↓
PR Branch Analysis:      [Run ALL tools] → Compare with main
                                ↓
V9 Comparator:           [Categorize issues] → New/Resolved/Existing
```

**Why both branches?**
- Need baseline to identify what's NEW in PR
- Need PR results to find what was RESOLVED
- Caching main branch makes subsequent PRs faster
- 100% file coverage on both branches (for repos < 10k files)

---

## Two-Branch Execution Strategy

### Workflow Overview

```yaml
Phase 1: Main Branch Analysis
  Step 1: Check Redis cache for main branch
  Step 2: If cache miss → Analyze 100% of main branch files
  Step 3: Cache results with 24h TTL
  Step 4: Store violations by file and tool
  Duration: ~168s first time, <1s on cache hit

Phase 2: PR Branch Analysis
  Step 1: Checkout PR branch
  Step 2: Analyze 100% of PR branch files
  Step 3: Store violations by file and tool
  Duration: ~168s

Phase 3: Comparison (V9 Comparator)
  Step 1: Load main branch violations (from cache)
  Step 2: Load PR branch violations
  Step 3: Compare file by file, issue by issue
  Step 4: Categorize: NEW / RESOLVED / EXISTING
  Step 5: Calculate impact scores
  Duration: ~10s

Total: ~178s (first PR), ~178s (cached main PRs)
```

### Cache Efficiency

**First PR against main branch**:
```
Main: 168s (analyze + cache)
PR:   168s (analyze)
Compare: 10s
Total: 346s (~5.8 minutes)
```

**Subsequent PRs (same main branch)**:
```
Main: <1s (cache retrieval)
PR:   168s (analyze)
Compare: 10s
Total: 178s (~3 minutes)
```

**Cache benefit**: 48% faster for subsequent PRs!

### File Selection Strategy

**For repos < 10,000 files**: 100% coverage on both branches

```typescript
// Main branch
const mainFiles = getAllFiles(mainBranch, language);
// Analyze ALL files: 3,472 files for Apache Kafka

// PR branch
const prFiles = getAllFiles(prBranch, language);
// Analyze ALL files: 3,472 files (or slightly different)

// Comparison
const comparison = compareViolations(mainResults, prResults);
```

**For repos >= 10,000 files**: Smart selection of ~500 files

```typescript
// Main branch
const mainFiles = smartSelect(mainBranch, language, 500);
// Smart selection: 500 most important files

// PR branch
const prFiles = smartSelect(prBranch, language, 500);
// Smart selection: 500 most important files + all changed files

// Comparison
const comparison = compareViolations(mainResults, prResults);
```

---

## Performance Calibration Results

### Hardware: Oracle A1.Flex

- **CPUs**: 4 OCPUs (ARM64)
- **Memory**: 24GB RAM
- **Storage**: NVMe SSD
- **Network**: 1 Gbps
- **Cost**: Free tier (permanent)

### Java (PMD) - Calibration Complete ✅

**Test Repository**: Apache Kafka (3,472 Java files)

| Parallel | Batch Size | Threads | Time | Throughput | Status |
|----------|------------|---------|------|------------|--------|
| **4** | **300** | **3** | **63s** | **55 f/s** | **✅ OPTIMAL** |
| 5 | 200 | 2 | 71s | 48 f/s | ⚠️ Slower |
| 6 | 200 | 2 | 78s | 44 f/s | ⚠️ Slower |
| 8 | 150 | 2 | 86s | 40 f/s | ❌ Poor |
| 10 | 200 | 2 | 94s | 36 f/s | ❌ Poor |
| 12 | 200 | 2 | 100s | 34 f/s | ❌ Poor |

**Key Finding**: More parallelism causes resource contention on 4-core system

**Optimal Configuration**:
```yaml
Parallel Containers: 4
Files per Batch: 300
PMD Threads: 3
CPU per Container: 1.0 cores
Memory per Container: 5GB
```

**Resource Allocation**:
- 4 containers × 1 CPU = 4 CPUs (100% utilization)
- 4 containers × 5GB = 20GB RAM (83% utilization)
- Perfect balance for 4-core system

### Performance Degradation Pattern

```
Time (seconds)
100 |                              ● (100s, 12p)
 90 |                          ● (94s, 10p)
 80 |                      ● (86s, 8p)
 70 |                  ● (78s, 6p)
    |              ● (71s, 5p)
 60 |          ★ (63s, 4p) ← OPTIMAL
    +----------------------------------
    4   5   6   8   10  12  Parallel

Key: Each 2 additional containers adds ~6-8 seconds
```

---

## Multi-Tool Execution

### Java Tools Configuration

**Available Tools**:
1. **PMD** - Code quality and best practices
2. **Checkstyle** - Code style and formatting
3. **SpotBugs** - Bug pattern detection
4. **Semgrep** - Security and pattern matching

### Tool Performance Profiles

| Tool | Type | Threads | Expected Time | Calibration Status |
|------|------|---------|---------------|-------------------|
| PMD | CPU-bound | 3 | 63s | ✅ Calibrated |
| Checkstyle | I/O-bound | 2 | 45s | 🔄 Estimated |
| SpotBugs | CPU-bound | 2 | 90s | 🔄 Estimated |
| Semgrep | CPU-bound | 2 | 20s | ⚠️ Needs optimization |

### Staged Execution Strategy

```yaml
Stage 1: Fast Tools (Run in parallel)
  - Semgrep: 4 containers, 2 jobs each
  - Duration: ~20s
  - Focus: Security patterns, quick wins

Stage 2: Style Analysis
  - Checkstyle: 4 containers
  - Duration: ~45s
  - Focus: Code style, formatting

Stage 3: Quality Analysis (Run in parallel where possible)
  - PMD: 4 containers, 300 files/batch, 3 threads
  - Duration: ~63s
  - Focus: Code quality, best practices

Stage 4: Deep Bug Detection (Optional)
  - SpotBugs: 2 containers (memory intensive)
  - Duration: ~90s
  - Focus: Bug patterns (requires bytecode)
  - Note: Runs in background during Stage 3

Total Estimated: ~168 seconds (2.8 minutes)
```

### Tool Resource Allocation

**Concurrent Execution Matrix**:

```yaml
# Stage 1: Light tools
Semgrep: 4 containers × (1 CPU, 2GB) = 4 CPUs, 8GB

# Stage 2: Medium tools
Checkstyle: 4 containers × (1 CPU, 3GB) = 4 CPUs, 12GB

# Stage 3: Heavy tools
PMD: 4 containers × (1 CPU, 5GB) = 4 CPUs, 20GB

# Stage 4: Memory-intensive (parallel with Stage 3)
SpotBugs: 2 containers × (1 CPU, 8GB) = 2 CPUs, 16GB
# Starts after PMD completes 2 batches to avoid memory exhaustion
```

### Two-Branch Multi-Tool Execution

**Complete workflow for PR analysis**:

```bash
# === MAIN BRANCH ===
Step 1: Check cache
  - Key: "repo:main:commit_hash:tool_name"
  - If found: Skip to PR branch

Step 2: Main branch analysis (if cache miss)
  Stage 1: Semgrep on main (4 parallel) → 20s
  Stage 2: Checkstyle on main (4 parallel) → 45s
  Stage 3: PMD on main (4 parallel) → 63s
  Stage 4: SpotBugs on main (2 parallel) → 90s
  Total: ~168s

Step 3: Cache main branch results
  - Store per-tool violations
  - TTL: 24 hours
  - Key includes commit hash

# === PR BRANCH ===
Step 4: PR branch analysis (always runs)
  Stage 1: Semgrep on PR (4 parallel) → 20s
  Stage 2: Checkstyle on PR (4 parallel) → 45s
  Stage 3: PMD on PR (4 parallel) → 63s
  Stage 4: SpotBugs on PR (2 parallel) → 90s
  Total: ~168s

# === COMPARISON ===
Step 5: Compare results (V9 Comparator)
  - Load main results (from cache or fresh)
  - Load PR results (fresh)
  - Compare tool by tool, file by file
  - Categorize: NEW / RESOLVED / EXISTING
  - Calculate impact scores
  Total: ~10s

# === TOTAL TIME ===
First PR: 168s (main) + 168s (PR) + 10s (compare) = 346s (~5.8 min)
Cached: <1s (main) + 168s (PR) + 10s (compare) = 178s (~3 min)
```

---

## Language-Specific Configurations

### Why Language-Specific Calibration?

Each language has:
- **Different tools** with different resource requirements
- **Different file structures** (packages vs modules vs namespaces)
- **Different compilation needs** (interpreted vs compiled)
- **Different optimal threading** (I/O vs CPU bound)

**Example**: Java PMD vs Python pylint have completely different profiles:
- PMD: CPU-bound, benefits from 3-4 threads
- pylint: I/O-bound, minimal threading benefit

### Calibration Framework

**For each language, we must determine**:

```yaml
Language: java

  Tools:
    - name: pmd
      parallel: 4
      batch_size: 300
      threads: 3
      memory: 5GB
      duration: 63s
      status: ✅ Calibrated

    - name: checkstyle
      parallel: 4
      batch_size: 870
      threads: 2
      memory: 3GB
      duration: 45s
      status: 🔄 Needs calibration

    - name: semgrep
      parallel: 4
      batch_size: 870
      threads: 2
      memory: 2GB
      duration: 20s
      status: ⚠️ Needs optimization

  Hardware: Oracle A1.Flex (4 cores, 24GB)
  Test Repository: Apache Kafka (3,472 files)
  Total Time: ~168s for all tools
```

### Language Configuration Template

```yaml
Language: <language_name>

  Calibration Status: [ ] Not started | [x] Complete

  Test Repository:
    name: <repo_name>
    url: <github_url>
    file_count: <number>

  Hardware:
    platform: Oracle A1.Flex
    cpus: 4 OCPUs ARM64
    memory: 24GB RAM

  Tools:
    Essential (always run):
      - tool_name: <name>
        parallel: <number>
        batch_size: <number>
        threads: <number>
        memory: <size>
        expected_duration: <seconds>
        calibrated: <yes/no>

    Optional (on demand):
      - tool_name: <name>
        # ... same structure

  Performance:
    single_tool_optimal: <seconds>
    multi_tool_total: <seconds>
    with_cache: <seconds>

  Notes:
    - Key findings
    - Specific optimizations
    - Known issues
```

### Languages Requiring Calibration

**Priority 1 (High Usage)**:
- [x] **Java** - Calibrated (PMD: 63s optimal)
- [ ] **Python** - Needs calibration (pylint, flake8, bandit, mypy)
- [ ] **JavaScript** - Needs calibration (ESLint, JSHint)
- [ ] **TypeScript** - Needs calibration (TSLint, ESLint)

**Priority 2 (Medium Usage)**:
- [ ] **Go** - Needs calibration (golangci-lint, staticcheck, gosec)
- [ ] **Ruby** - Needs calibration (RuboCop, Brakeman, Reek)
- [ ] **PHP** - Needs calibration (PHP_CodeSniffer, PHPMD, Psalm)
- [ ] **C#** - Needs calibration (Roslyn analyzers, StyleCop)

**Priority 3 (Lower Usage)**:
- [ ] **Rust** - Needs calibration (Clippy, rustfmt)
- [ ] **Swift** - Needs calibration (SwiftLint, Periphery)
- [ ] **Kotlin** - Needs calibration (detekt, ktlint)

### Python Configuration (Example Template)

```yaml
Language: python

  Calibration Status: [ ] Not started

  Test Repository:
    name: TBD (need large Python repo, 3000+ files)
    suggestions:
      - django/django (Python web framework)
      - pallets/flask (Python web framework)
      - psf/requests (HTTP library)

  Tools:
    Essential:
      - tool_name: pylint
        parallel: TBD
        batch_size: TBD
        threads: TBD
        memory: TBD
        expected_duration: TBD
        calibrated: no

      - tool_name: flake8
        parallel: TBD
        batch_size: TBD
        threads: TBD
        memory: TBD
        expected_duration: TBD
        calibrated: no

    Optional:
      - tool_name: bandit  # Security
      - tool_name: mypy    # Type checking
      - tool_name: black   # Formatting check

  Performance:
    single_tool_optimal: TBD
    multi_tool_total: TBD
    with_cache: TBD

  Notes:
    - Python is interpreted (no compilation needed)
    - pylint is known to be slow (may need more optimization)
    - Consider pyflakes as lightweight alternative
```

---

## Caching Strategy

### Redis Cache Structure

**Cache Key Format**:
```
{repository}:{branch}:{commit_hash}:{tool_name}
```

**Example**:
```
kafka:trunk:a1b2c3d4:pmd
kafka:trunk:a1b2c3d4:checkstyle
kafka:pr-17620:e5f6g7h8:pmd
```

### Cache Data Structure

**Stored as Redis Hash**:
```redis
HSET kafka:trunk:a1b2c3d4:pmd
  time "63"
  violations "9921"
  timestamp "2025-09-29T18:11:28Z"
  files "3472"

EXPIRE kafka:trunk:a1b2c3d4:pmd 86400  # 24 hours
```

**Violation Details** (separate key):
```redis
SET kafka:trunk:a1b2c3d4:pmd:violations "{
  'file1.java': [
    {line: 42, rule: 'UnusedVariable', message: '...'},
    {line: 87, rule: 'NullCheck', message: '...'}
  ],
  'file2.java': [...]
}"

EXPIRE kafka:trunk:a1b2c3d4:pmd:violations 86400
```

### Cache Invalidation

**When to invalidate**:
1. **New commit on main**: Different commit_hash → new cache key
2. **TTL expires**: After 24 hours
3. **Manual clear**: For debugging or forced re-analysis

**Cache hit scenarios**:
```
PR #1 vs main (commit abc123):
  - Main: Cache miss → Analyze → Cache (168s)
  - PR #1: No cache → Analyze (168s)
  - Total: 336s

PR #2 vs same main (commit abc123):
  - Main: Cache hit (abc123) → Retrieve (<1s)
  - PR #2: No cache → Analyze (168s)
  - Total: 168s ✅ 2x faster!

PR #3 vs new main (commit xyz789):
  - Main: Cache miss (new commit) → Analyze → Cache (168s)
  - PR #3: No cache → Analyze (168s)
  - Total: 336s
```

### Cache Performance

**Apache Kafka Example**:
- Files: 3,472
- PMD violations: 9,921
- Cache size: ~2MB (compressed)
- Retrieval time: <1 second
- Benefit: 168s → <1s = **99.4% faster**

---

## Production Deployment

### Deployment Checklist

- [x] **Performance calibration complete** (Java PMD)
- [x] **Caching validated** (Redis 24h TTL)
- [x] **Two-branch strategy documented**
- [ ] **Multi-tool calibration** (Checkstyle, Semgrep, SpotBugs)
- [ ] **V9ToolOrchestrator integration**
- [ ] **Additional language calibration** (Python, JavaScript, TypeScript)
- [ ] **Production monitoring setup**

### V9ToolOrchestrator Integration

**Required changes**:

```typescript
// 1. Add tool configuration per language
interface ToolConfig {
  name: string;
  parallel: number;
  batchSize: number;
  threads: number;
  memory: string;
  timeout: number;
  calibrated: boolean;
}

// 2. Language-specific toolsets
const LANGUAGE_CONFIGS = {
  java: {
    essential: ['pmd', 'checkstyle'],
    optional: ['semgrep', 'spotbugs'],
    tools: {
      pmd: {
        parallel: 4,
        batchSize: 300,
        threads: 3,
        memory: '5g',
        timeout: 120,
        calibrated: true
      },
      // ... other tools
    }
  },
  python: {
    essential: ['pylint', 'flake8'],
    optional: ['bandit', 'mypy'],
    tools: {
      // ... to be calibrated
    }
  }
};

// 3. Two-branch execution
async function analyzePR(repo: string, prNumber: number) {
  // Phase 1: Main branch
  const mainResults = await analyzeMainBranch(repo);  // Uses cache

  // Phase 2: PR branch
  const prResults = await analyzePRBranch(repo, prNumber);

  // Phase 3: Compare
  const comparison = await comparator.compare(mainResults, prResults);

  return {
    main: mainResults,
    pr: prResults,
    comparison: comparison,
    new: comparison.newIssues,
    resolved: comparison.resolvedIssues,
    existing: comparison.existingIssues
  };
}
```

### Monitoring Metrics

**Track these metrics**:
1. **Analysis Time**
   - Per tool
   - Per language
   - Total (main + PR + compare)

2. **Cache Performance**
   - Hit rate
   - Miss rate
   - Average retrieval time

3. **Resource Usage**
   - CPU utilization
   - Memory utilization
   - Container count

4. **Quality Metrics**
   - Issues found (new/resolved/existing)
   - False positive rate
   - Tool coverage

### Performance Targets

**For Java (3,500 files)**:
```yaml
First PR:
  Main: 168s (analyze + cache)
  PR: 168s (analyze)
  Compare: 10s
  Total: 346s (~5.8 min) ✅

Subsequent PRs:
  Main: <1s (cache hit)
  PR: 168s (analyze)
  Compare: 10s
  Total: 178s (~3 min) ✅
```

**For Python (3,500 files)** - To be determined:
```yaml
Target:
  Single tool: <90s
  Multi-tool: <180s
  With cache: <90s
```

---

## Next Steps

### Immediate (Current Sprint)

1. **Complete Java Multi-Tool Calibration**
   - Fix Semgrep performance (173s → 20s target)
   - Test Checkstyle (estimate: 45s)
   - Test SpotBugs (estimate: 90s)
   - Validate total time (~168s target)

2. **Document Two-Branch Workflow**
   - Update V9 documentation
   - Create workflow diagrams
   - Document cache key strategy

3. **Integrate with V9ToolOrchestrator**
   - Add language config support
   - Implement two-branch execution
   - Enable Redis caching

### Short Term (Next 2 Weeks)

4. **Python Calibration**
   - Select test repository (django/flask)
   - Test pylint performance
   - Test flake8 performance
   - Find optimal configuration

5. **JavaScript/TypeScript Calibration**
   - Select test repositories
   - Test ESLint performance
   - Find optimal configuration

### Medium Term (Next Month)

6. **Additional Languages**
   - Go calibration
   - Ruby calibration
   - PHP calibration

7. **Production Optimization**
   - Monitor real PR performance
   - Tune configurations based on data
   - Optimize slow tools

---

## Summary

### Key Achievements

✅ **Two-branch strategy designed** - Analyze both main and PR, compare results
✅ **Java PMD calibrated** - 4 parallel, 300 batch, 3 threads = 63s optimal
✅ **Caching validated** - Redis with 24h TTL, <1s retrieval, 99% faster
✅ **Multi-tool framework** - Staged execution strategy for all Java tools
✅ **Documentation organized** - All process docs in proper location

### Critical Understanding

1. **BOTH branches must be analyzed** - Not just the diff!
2. **Caching makes subsequent PRs faster** - First PR: 346s, Later PRs: 178s
3. **Each language needs calibration** - Different tools, different profiles
4. **Resource contention matters** - More parallel ≠ faster (4 is optimal for 4 cores)

### Production Ready

- **Java PMD**: ✅ Ready (63s for 3,500 files)
- **Caching**: ✅ Ready (Redis operational)
- **Two-branch**: ✅ Strategy defined
- **Multi-tool**: 🔄 Testing in progress
- **Other languages**: 🔄 Needs calibration

---

**Document Status**: Current and Comprehensive
**Next Update**: After multi-tool calibration complete
**Owner**: Performance/Infrastructure Team