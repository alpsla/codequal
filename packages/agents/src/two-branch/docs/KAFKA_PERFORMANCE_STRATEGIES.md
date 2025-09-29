# Apache Kafka Performance Optimization Strategies

## Problem Statement
Apache Kafka repository has **3,489 main Java files** (5,587 total including tests) which causes PMD to timeout even with 4-thread optimization that achieved 3.53x speedup on smaller file sets.

## Solution Approaches

### 1. Extended Timeout Strategy (Baseline)
**File:** `test-kafka-extended-timeout.ts`

- **Timeout:** 10 minutes (600 seconds)
- **Purpose:** Establish baseline metrics
- **Benefits:**
  - Get complete analysis metrics
  - Identify actual processing time
  - Understand bottlenecks
- **Drawbacks:**
  - Too slow for CI/CD pipelines
  - Poor developer experience

### 2. File Batching Strategy (Recommended)
**File:** `test-kafka-batched-pmd.ts`

- **Batch Size:** 500 files per batch
- **Concurrency:** 2 batches in parallel
- **Total Batches:** 7 for 3,489 files
- **Benefits:**
  - Prevents timeout issues
  - Enables parallel processing
  - Provides progress feedback
  - Allows partial failure recovery
- **Expected Performance:**
  - Each batch: ~20-30 seconds
  - Total time: ~2-3 minutes (with parallelism)

### 3. Progressive Analysis Strategy
**Components:** Priority-based file selection

```typescript
Priority Levels:
1. Critical paths (core/, server/, controller/) - Batch 1
2. Client code (clients/, producer/, consumer/) - Batch 2
3. Utilities and helpers - Batch 3
4. Everything else - Batch 4
```

- **Benefits:**
  - Fast feedback on critical issues
  - Can stop early if blockers found
  - Better resource utilization

### 4. Two-Branch Caching Strategy
**Next Priority:** Implement Redis caching

- Cache main branch analysis results
- Only analyze PR diff files
- Expected reduction: 70-90% of work
- Implementation ready in `V9RepositoryManager`

## Performance Benchmarks

### Current State (From Last Session)
| Configuration | Files | Time | Status |
|--------------|-------|------|--------|
| PMD 1 thread | 1,319 (core) | 46s | ✅ Success |
| PMD 4 threads | 1,319 (core) | 13s | ✅ Success |
| PMD 4 threads | 3,489 (all) | Timeout | ❌ Failed |

### Projected Performance with Batching
| Strategy | Files | Expected Time | Parallel |
|----------|-------|---------------|----------|
| Extended timeout | 3,489 | 5-10 min | No |
| Batching (seq) | 3,489 | 3-4 min | No |
| Batching (parallel) | 3,489 | 1.5-2 min | Yes |
| Two-branch + batching | ~500 | 20-30s | Yes |

## Optimal Configuration

### Recommended Settings
```javascript
const config = {
  // PMD Configuration
  pmd: {
    threads: 4,
    batchSize: 500,
    timeout: 120000, // 2 minutes per batch
    rules: 'category/java/errorprone.xml'
  },

  // Batching Configuration
  batching: {
    maxFilesPerBatch: 500,
    concurrentBatches: 2,
    maxBatchSizeBytes: 25 * 1024 * 1024, // 25MB
    prioritizeBySize: true
  },

  // Resource Allocation
  resources: {
    cpusPerBatch: 2,
    memoryPerBatch: '3g',
    totalCpus: 4,
    totalMemory: '8g'
  }
};
```

### CPU Allocation Strategy
```
Option A: Parallel Tools (Oracle A1 - 4 CPUs)
- PMD Batch 1: 2 CPUs
- PMD Batch 2: 2 CPUs
- Queue others

Option B: Sequential Optimized
- Step 1: PMD with all 4 CPUs (fastest)
- Step 2: Checkstyle + Semgrep (parallel)
```

## Implementation Checklist

- [x] File batcher utility (`file-batcher.ts`)
- [x] Batched PMD analyzer (`test-kafka-batched-pmd.ts`)
- [x] Extended timeout test (`test-kafka-extended-timeout.ts`)
- [x] Performance test runner (`run-kafka-performance-test.sh`)
- [ ] Two-branch caching integration
- [ ] Progressive priority analyzer
- [ ] Production-ready orchestrator
- [ ] Metrics dashboard

## Quick Start Commands

### Test Batching Strategy
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node src/two-branch/tests/test-kafka-batched-pmd.ts
```

### Run Extended Timeout Test
```bash
npx ts-node src/two-branch/tests/test-kafka-extended-timeout.ts
```

### Run Performance Test Suite
```bash
./run-kafka-performance-test.sh
```

## Next Steps

1. **Immediate:** Run extended timeout test to get baseline
2. **Next:** Test batching with real Kafka repository
3. **Then:** Implement two-branch caching
4. **Finally:** Integrate into V9 orchestrator

## Expected Outcomes

With all optimizations applied:
- Full repository analysis: < 2 minutes
- PR diff analysis (with caching): < 30 seconds
- Critical path analysis: < 10 seconds
- Memory usage: < 4GB per tool
- CPU efficiency: > 80% utilization

---

**Status:** Implementation complete, ready for testing
**Last Updated:** 2025-09-29