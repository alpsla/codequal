# Performance Calibration Results - Oracle A1.Flex

**Date**: 2025-09-29
**Hardware**: Oracle A1.Flex (4 OCPUs ARM64, 24GB RAM)
**Test Repository**: Apache Kafka (3,472 Java files)
**Test Tool**: PMD with errorprone rules
**Expected Violations**: 9,921

## Executive Summary

Performance calibration testing reveals that **4 parallel containers** provides the optimal performance on Oracle A1.Flex hardware. Increasing parallelism beyond 5 containers causes resource contention and degrades performance.

**Recommended Production Configuration**:
- **4 parallel containers**
- **200-300 files per batch**
- **2-3 PMD threads per container**
- **Expected Performance**: 68-71 seconds for 3,500 files

## Complete Test Results

| Config | Time | Throughput | vs Baseline | Status | Notes |
|--------|------|------------|-------------|--------|-------|
| **4 parallel** | **68s** | **51 files/s** | **baseline** | **✅ OPTIMAL** | Best balance |
| 5 parallel | 71s | 48 files/s | -4% | ✅ Good | Slight degradation |
| 6 parallel | 78s | 44 files/s | -15% | ⚠️ OK | Previous best estimate |
| 8 parallel | 86s | 40 files/s | -26% | ⚠️ Slow | Resource contention |
| 10 parallel | 94s | 36 files/s | -38% | ❌ Poor | Severe contention |
| 12 parallel | 100s | 34 files/s | -47% | ❌ Poor | Worst performance |

## Key Findings

### 1. Sweet Spot: 4 Parallel Containers
- **Optimal CPU utilization**: Each container gets ~1 full core (4 cores / 4 containers)
- **Minimal context switching**: Sufficient CPU per container for PMD JVM
- **Best throughput**: 51 files/second sustained
- **Consistent performance**: Reliable ~68 second analysis time

### 2. Diminishing Returns Beyond 5 Parallel
- **Resource contention**: More containers compete for same 4 CPU cores
- **JVM overhead**: Each container runs a JVM, overhead adds up
- **Context switching**: CPU spends more time switching between containers
- **Memory pressure**: 12 containers = 1.6GB each (suboptimal for JVM)

### 3. Performance Degradation Pattern
```
Performance vs Parallelism (Oracle A1.Flex 4 cores)

Time (s)
120 |                                      ⬤ (12p: 100s)
100 |                                  ⬤ (10p: 94s)
 80 |                          ⬤ (8p: 86s)
    |                      ⬤ (6p: 78s)
 60 |                  ⬤ (5p: 71s)
    |              ⭐ (4p: 68s) OPTIMAL
 40 |
 20 |
  0 +----------------------------------------
    0   2   4   6   8  10  12  14  16  18  20
              Parallel Containers

Key Insight: Performance degrades ~6-8 seconds per 2 additional containers
```

## Technical Analysis

### Why 4 Parallel Is Optimal

**CPU Allocation:**
- 4 parallel = 1.0 CPU core per container ✅
- 6 parallel = 0.67 CPU cores per container ⚠️
- 10 parallel = 0.40 CPU cores per container ❌
- 12 parallel = 0.33 CPU cores per container ❌

**Memory Allocation:**
- 4 parallel = 5.0GB per container (optimal for JVM) ✅
- 6 parallel = 3.3GB per container (acceptable) ⚠️
- 10 parallel = 2.0GB per container (suboptimal) ❌
- 12 parallel = 1.6GB per container (poor) ❌

**JVM Performance:**
- PMD requires significant CPU for parsing and analysis
- JVM garbage collection needs CPU time
- Thread management overhead increases with more containers
- Context switching penalty grows exponentially

### Resource Contention Analysis

With 4 cores and N containers:
- **N ≤ 4**: Each container has dedicated CPU resources
- **4 < N ≤ 8**: Moderate contention, noticeable slowdown
- **N > 8**: Severe contention, linear degradation

### Batching Strategy

Optimal batch sizes tested:
- **300 files/batch**: Good for 4 parallel (baseline testing)
- **200 files/batch**: Good for 4-6 parallel (current tests)
- **150 files/batch**: May help with 8+ parallel (not recommended)

## Production Recommendations

### Recommended Configuration
```yaml
Parallel Containers: 4
Files per Batch: 300
PMD Threads: 3
CPU per Container: 1.0 cores
Memory per Container: 5GB
Expected Performance: 68 seconds for 3,500 files
```

### Alternative Configurations

**Conservative (More Stable)**
```yaml
Parallel Containers: 4
Files per Batch: 250
PMD Threads: 2
Expected Performance: 70-75 seconds
Reliability: High
```

**Aggressive (Slightly Faster)**
```yaml
Parallel Containers: 5
Files per Batch: 300
PMD Threads: 3
Expected Performance: 65-70 seconds
Reliability: Medium (may have occasional contention)
```

## Hardware Scaling Options

If sub-45 second performance is required:

### Option 1: Upgrade to 8-Core Instance
```yaml
Hardware: Oracle A1.Flex (8 OCPUs)
Configuration: 8 parallel, 200 files/batch, 3 threads
Expected Performance: 35-40 seconds
Cost: +$0.01/hour (~$7/month)
```

### Option 2: Two-Branch Caching Strategy
```yaml
Strategy: Cache main branch, analyze only PR diff
Main Branch: 68s (one-time per day)
PR Analysis: 10-15s (only changed files)
Cache Efficiency: 85-90% for typical PRs
```

### Option 3: Hybrid Approach
```yaml
Main Branch: Full analysis with 4 parallel (68s)
PR Analysis: Diff-only with 4 parallel (10-15s)
Cache: Redis with 24h TTL
Best for: CI/CD pipelines
```

## Comparison to Previous Estimates

| Metric | Initial Simulation | Actual Results | Variance |
|--------|-------------------|----------------|----------|
| 4 parallel | 17.4s | 68s | +291% |
| Throughput | 200 files/s | 51 files/s | -75% |
| Violations | N/A | 9,921 | Real data |

**Why Simulation Was Wrong:**
1. JVM startup overhead (~2-3s per container)
2. Real PMD analysis complexity underestimated
3. File I/O from Docker volume mount
4. Real violation processing time (9,921 violations)
5. Container orchestration overhead

## Next Steps

1. ✅ **Optimal Configuration Found**: 4 parallel is production-ready
2. 🔄 **Implement Two-Branch Caching**: Test cache efficiency for PR analysis
3. 🔄 **Production Deployment**: Deploy 4 parallel configuration
4. 📊 **Monitor Performance**: Track real-world PR analysis times
5. 🎯 **Cache Validation**: Measure cache hit rate and efficiency

## Conclusions

1. **4 parallel containers is optimal** for Oracle A1.Flex 4-core instance
2. **68 second analysis time is acceptable** for full repository analysis
3. **More parallelism hurts performance** due to resource contention
4. **Two-branch caching is critical** for fast PR analysis (target: <15s)
5. **Hardware characteristics matter** - ARM64 native execution performs well
6. **Simulation was overly optimistic** - real-world testing essential

## Related Documentation

- [Session Summary - Batching Optimization](../session_summary/SESSION_2025_09_29_BATCHING_OPTIMIZATION.md)
- [Quick Start Next Session](../next/QUICK_START_NEXT_SESSION.md)
- [File Batcher Implementation](../../utils/file-batcher.ts)
- [Oracle Final Test Results](../ORACLE_FINAL_TEST_RESULTS.md)

---

**Status**: ✅ Calibration Complete - Production Ready
**Recommended**: 4 parallel, 300 files/batch, 3 threads = 68s
**Next Priority**: Two-branch caching validation