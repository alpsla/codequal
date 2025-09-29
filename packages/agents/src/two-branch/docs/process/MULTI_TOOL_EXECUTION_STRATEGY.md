# Multi-Tool Execution Strategy for Java Analysis

**Version**: 1.0
**Date**: 2025-09-29
**Target**: Complete PR analysis with all Java tools
**Hardware**: Oracle A1.Flex (4 OCPUs ARM64, 24GB RAM)

## Executive Summary

Strategy for executing all Java analysis tools (PMD, Checkstyle, SpotBugs, Semgrep) with optimal parallelization and resource allocation on Oracle A1.Flex infrastructure.

## Java Tools Configuration

### Available Tools in `analyzer:lang-java-v5.1-arm`

1. **PMD 6.55.0** - Static analysis for code quality
2. **Checkstyle 10.12.0** - Code style and standards
3. **SpotBugs 4.7.3** - Bug pattern detection
4. **Semgrep 1.138.0** - Security and pattern matching

### Tool Performance Profiles

Based on previous calibration testing:

| Tool | Type | Optimal Threads | Speedup | Execution Time (3,472 files) |
|------|------|-----------------|---------|------------------------------|
| **PMD** | CPU-bound | 3-4 | 3.53x | ~63s (with batching) |
| **Checkstyle** | I/O-bound | 2 | 1.1x | ~45s (single process) |
| **SpotBugs** | CPU-bound | 2-3 | 2.0x | ~90s (bytecode analysis) |
| **Semgrep** | CPU-bound | 2 | 1.8x | ~30s (pattern matching) |

## Multi-Tool Execution Strategies

### Strategy 1: Sequential Execution (Conservative)

**Approach**: Run tools one at a time with full resource allocation

**Configuration**:
```yaml
Execution: Sequential
Parallel Containers: 4 per tool
Resource Allocation: Full (1 CPU, 5GB per container)
```

**Timeline**:
```
PMD:        [====== 63s ======]
Checkstyle:                     [==== 45s ====]
SpotBugs:                                      [======= 90s =======]
Semgrep:                                                           [=== 30s ===]
Total:      228 seconds (~3.8 minutes)
```

**Pros**:
- Simple to implement
- Maximum resources per tool
- Consistent performance
- Easy to debug

**Cons**:
- Longer total time
- Underutilized resources (only 4 of 4 cores used)

### Strategy 2: Parallel Tool Execution (Optimal)

**Approach**: Run multiple tools concurrently with shared resource allocation

**Configuration**:
```yaml
Execution: Parallel
Parallel Groups:
  - Group 1 (Heavy): PMD (2 containers) + Checkstyle (2 containers)
  - Group 2 (Light): SpotBugs (2 containers) + Semgrep (2 containers)
Resource Allocation: Shared (0.5 CPU, 2.5GB per container)
```

**Timeline**:
```
Group 1 (parallel):
  PMD (2 cont):     [========= ~95s =========]
  Checkstyle (2):   [======== ~68s ========]

Group 2 (parallel):
  SpotBugs (2):                                [======== ~135s ========]
  Semgrep (2):                                 [==== ~45s ====]

Total: ~180 seconds (~3 minutes)
```

**Pros**:
- 21% faster than sequential
- Better resource utilization
- Reasonable complexity

**Cons**:
- More complex orchestration
- Resource contention may cause variance

### Strategy 3: Staged Execution (Recommended)

**Approach**: Run fast tools first in parallel, then heavy tools

**Configuration**:
```yaml
Execution: Staged
Stage 1 (Fast): Semgrep (4 containers) - ~20s
Stage 2 (Medium): Checkstyle (4 containers) - ~45s
Stage 3 (Heavy): PMD (4 containers) + SpotBugs (partial)
  - PMD: 4 containers @ 300 files/batch - ~63s
  - SpotBugs: Start in background
Stage 4 (Finalize): SpotBugs completion - ~40s remaining
```

**Timeline**:
```
Stage 1: Semgrep (4x)         [==== 20s ====]
Stage 2: Checkstyle (4x)                     [======= 45s =======]
Stage 3: PMD (4x) + SpotBugs(bg)                                  [======= 63s =======]
Stage 4: SpotBugs finalize                                                            [== 40s ==]

Total: ~168 seconds (~2.8 minutes)
```

**Pros**:
- Fastest overall time
- Maximum resource utilization
- Progressive results (fast tools complete early)
- Optimal for CI/CD feedback

**Cons**:
- Most complex orchestration
- Requires careful resource management

## Recommended Configuration: Staged Execution

### Stage 1: Quick Analysis (20 seconds)

**Tool**: Semgrep (security patterns, simple rules)

```bash
Parallel: 4 containers
Files per batch: 870 files (3,472 / 4)
Threads: 2 per container
CPU: 1.0 core per container
Memory: 2GB per container
Expected: 20 seconds
```

**Command**:
```bash
semgrep --config=p/security-audit \
        --config=p/java \
        --jobs=2 \
        --json \
        --timeout=30 \
        [file_list]
```

### Stage 2: Style Analysis (45 seconds)

**Tool**: Checkstyle (code style, formatting)

```bash
Parallel: 4 containers
Files per batch: 870 files
Threads: 2 (I/O bound, minimal benefit)
CPU: 1.0 core per container
Memory: 3GB per container (XML config loading)
Expected: 45 seconds
```

**Command**:
```bash
java -jar /opt/checkstyle.jar \
     -c /google_checks.xml \
     -f xml \
     -o output.xml \
     [file_list]
```

### Stage 3: Quality Analysis (63 seconds)

**Tool**: PMD (code quality, best practices)

```bash
Parallel: 4 containers
Files per batch: 300 files (optimal from calibration)
Threads: 3 per container
CPU: 1.0 core per container
Memory: 5GB per container (optimal for JVM)
Expected: 63 seconds
```

**Command**:
```bash
pmd pmd --file-list [batch_file] \
        -R category/java/errorprone.xml \
        -R category/java/bestpractices.xml \
        -R category/java/codestyle.xml \
        -f xml \
        -t 3 \
        --no-cache
```

### Stage 4: Bug Detection (90 seconds, parallel with Stage 3)

**Tool**: SpotBugs (bug patterns, potential defects)

```bash
Parallel: 2 containers (memory intensive)
Files: Full classpath (needs compiled .class files)
Threads: 2 per container
CPU: 1.0 core per container
Memory: 8GB per container (bytecode analysis)
Expected: 90 seconds (starts during PMD, completes after)
```

**Command**:
```bash
spotbugs -textui \
         -effort:max \
         -xml:withMessages \
         -output output.xml \
         -auxclasspath [dependencies] \
         [compiled_classes]
```

**Note**: SpotBugs requires compiled bytecode, so we need to:
1. Compile Java files first (or use existing build artifacts)
2. Run SpotBugs on .class files
3. Map findings back to source files

## Complete Execution Flow

### Orchestration Script Logic

```yaml
# Pre-analysis Setup (5 seconds)
- Clone repository
- Checkout PR branch
- Identify Java files (non-test)
- Create file batches
- Start Redis connection

# Stage 1: Semgrep (20 seconds)
Parallel: 4 containers
- Batch 1: Files 1-870
- Batch 2: Files 871-1740
- Batch 3: Files 1741-2610
- Batch 4: Files 2611-3472
Wait for all batches to complete

# Stage 2: Checkstyle (45 seconds)
Parallel: 4 containers
- Same batching as Semgrep
- Wait for all batches to complete

# Stage 3a: PMD (63 seconds)
Parallel: 4 containers
- Batch 1: Files 1-300
- Batch 2: Files 301-600
- ... (12 batches total)
- Process in 3 rounds of 4 batches

# Stage 3b: SpotBugs Start (parallel with PMD)
Parallel: 2 containers
- Check if .class files exist
- If yes: Run SpotBugs
- If no: Skip or compile first

# Stage 4: SpotBugs Completion (if started)
- Wait for SpotBugs to complete
- Parse and merge results

# Post-analysis (10 seconds)
- Aggregate all tool outputs
- Parse violations
- Cache results in Redis
- Return combined analysis

Total Time: ~168 seconds (2.8 minutes)
```

## Resource Allocation Matrix

### Optimal Resource Distribution

| Stage | Tool | Containers | CPU/Container | RAM/Container | Duration |
|-------|------|------------|---------------|---------------|----------|
| 1 | Semgrep | 4 | 1.0 | 2GB | 20s |
| 2 | Checkstyle | 4 | 1.0 | 3GB | 45s |
| 3 | PMD | 4 | 1.0 | 5GB | 63s |
| 3 (bg) | SpotBugs | 2 | 1.0 | 8GB | 90s |

**Total Peak Resources**:
- Stage 1-2: 4 containers × (1 CPU, 2-3GB) = 4 CPUs, 12GB RAM ✅
- Stage 3: 4 PMD + 2 SpotBugs = 6 containers
  - PMD: 4 CPUs, 20GB RAM
  - SpotBugs: 2 CPUs, 16GB RAM (runs on 2 cores after PMD completes some batches)
  - **Stagger SpotBugs start** to avoid resource exhaustion

## Tool-Specific Configurations

### PMD Configuration

**Rulesets** (comprehensive coverage):
```yaml
Rulesets:
  - category/java/errorprone.xml    # Error-prone code
  - category/java/bestpractices.xml # Best practices
  - category/java/codestyle.xml     # Code style
  - category/java/design.xml        # Design flaws
  - category/java/performance.xml   # Performance issues
  - category/java/security.xml      # Security vulnerabilities
```

**Optimal Settings**:
```bash
--threads 3              # Optimal for 4-core system
--no-cache              # Fresh analysis each time
--format xml            # Structured output
--fail-on-violation false  # Don't fail, just report
--minimum-priority 3    # Medium and above
```

### Checkstyle Configuration

**Config**: Google Java Style Guide

```bash
-c /google_checks.xml   # Or sun_checks.xml
-f xml                  # XML output
-p checkstyle.properties  # Custom properties
```

**Properties**:
```properties
checkstyle.suppressions.file=suppressions.xml
checkstyle.header.file=java.header
severity=warning
```

### Semgrep Configuration

**Rulesets**:
```yaml
Configs:
  - p/security-audit    # Security patterns
  - p/java             # Java-specific rules
  - p/owasp-top-ten    # OWASP vulnerabilities
  - p/cwe-top-25       # Common weakness enumeration
```

**Optimal Settings**:
```bash
--jobs 2                # Parallel jobs
--timeout 30            # 30s per file
--max-memory 2000       # 2GB max
--json                  # JSON output
--metrics off           # Disable metrics collection
```

### SpotBugs Configuration

**Effort Level**: Max (thorough analysis)

```bash
-effort:max             # Maximum analysis depth
-rank 15                # Report rank 15 and below
-xml:withMessages       # XML with descriptions
-include filterfile.xml # Custom filters
```

**Filter File** (exclude test code):
```xml
<FindBugsFilter>
  <Match>
    <Not>
      <Class name="~.*Test.*"/>
    </Not>
  </Match>
</FindBugsFilter>
```

## Performance Expectations

### By Repository Size

| Files | Semgrep | Checkstyle | PMD | SpotBugs | Total |
|-------|---------|------------|-----|----------|-------|
| 500 | 3s | 8s | 10s | 15s | ~36s |
| 1,000 | 6s | 15s | 18s | 25s | ~64s |
| 2,000 | 12s | 25s | 32s | 45s | ~114s |
| 3,500 | 20s | 45s | 63s | 90s | ~168s |
| 5,000 | 28s | 65s | 90s | 130s | ~243s |

### Expected Output Volumes

**Apache Kafka (3,472 files)**:
- **PMD**: ~9,921 violations (previous test)
- **Checkstyle**: ~15,000 violations (estimated)
- **SpotBugs**: ~200-500 bugs (estimated)
- **Semgrep**: ~50-100 security issues (estimated)
- **Total**: ~25,000-26,000 findings

## Implementation: Multi-Tool Orchestrator Script

Location: `/packages/agents/oracle-multi-tool-test.sh`

**Key Features**:
- Staged execution with optimal tool ordering
- Parallel container orchestration
- Resource monitoring and allocation
- Progress reporting
- Result aggregation
- Redis caching
- Error handling and retries

## Testing Plan

### Phase 1: Individual Tool Testing (1 hour)

Test each tool individually with optimal configuration:

```bash
# Test Semgrep
./test-tool-individual.sh semgrep 4 870 2

# Test Checkstyle
./test-tool-individual.sh checkstyle 4 870 2

# Test PMD (already tested)
./oracle-calibration-test.sh 4 300 3

# Test SpotBugs (needs compilation)
./test-tool-individual.sh spotbugs 2 0 2
```

### Phase 2: Multi-Tool Integration (30 minutes)

Test staged execution with 2 tools:

```bash
# Test Semgrep + Checkstyle
./oracle-multi-tool-test.sh --tools semgrep,checkstyle

# Test PMD + SpotBugs
./oracle-multi-tool-test.sh --tools pmd,spotbugs
```

### Phase 3: Complete Toolchain (1 hour)

Full test with all 4 tools:

```bash
# Complete analysis
./oracle-multi-tool-test.sh --tools all --repo apache/kafka

# Expected output:
# - Total time: ~168 seconds
# - All tools complete
# - Results aggregated
# - Redis cache populated
```

## Next Steps

1. ✅ Design complete (this document)
2. 🔄 Create `oracle-multi-tool-test.sh` orchestrator
3. 🔄 Test individual tools for baseline
4. 🔄 Test multi-tool execution
5. 🔄 Integrate with V9ToolOrchestrator
6. 🔄 Test on real Apache Kafka PR

## Related Documentation

- `PERFORMANCE_CALIBRATION_RESULTS.md` - PMD calibration data
- `ORACLE_PERFORMANCE_SUMMARY.md` - Oracle infrastructure summary
- `QUICK_START_NEXT_SESSION.md` - Session management
- `V9_CRITICAL_KNOWLEDGE_BASE.md` - V9 architecture

---

**Status**: Design Complete - Ready for Implementation
**Estimated Implementation**: 2-3 hours
**Expected Performance**: ~168 seconds for 3,500 files with all tools