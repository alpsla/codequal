# Critical Discovery: Docker v6.0 Image Architecture

**Date**: October 2, 2025
**Discovered During**: Java Tool Integration Testing on Oracle Cloud
**Status**: 🔴 **BLOCKING ISSUE - REQUIRES ORCHESTRATOR UPDATE**

---

## Executive Summary

The `analyzer:lang-java-v6.0-arm` Docker image has a **fundamentally different architecture** than previous versions. It uses a **custom ENTRYPOINT** that runs tools directly without requiring `bash -c`, which breaks the current JavaToolOrchestrator implementation.

**Impact**: All tool execution via JavaToolOrchestrator fails with error `/bin/bash: /bin/bash: cannot execute binary file`

**Root Cause**: JavaToolOrchestrator uses `bash -c 'command'` pattern, but v6.0 image expects direct command execution via ENTRYPOINT `-c` flag

---

## Discovery Process

### 1. Initial Symptoms

**Testing on Oracle Cloud ARM64 (native)**:
```
Error: /bin/bash: /bin/bash: cannot execute binary file
Exit code: 126
```

**Initial Hypothesis**: Architecture mismatch (ARM64 vs x86_64)
**Actual Cause**: Docker image ENTRYPOINT architecture difference

### 2. Testing Sequence

```bash
# Test 1: Direct bash command (FAILED)
docker run --rm iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
  bash -c "echo test"
# Result: /bin/bash: /bin/bash: cannot execute binary file

# Test 2: Direct sh command (FAILED)
docker run --rm iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
  sh -c "echo test"
# Result: /bin/sh: /bin/sh: cannot execute binary file

# Test 3: Standard Ubuntu image (SUCCESS)
docker run --rm ubuntu:22.04 echo "Docker works!"
# Result: Docker works!

# Test 4: Validation script using same v6.0 image (SUCCESS!)
/home/opc/codequal/scripts/monthly-log4shell-validation.sh
# Result: ✅ MONTHLY VALIDATION PASSED
```

### 3. Critical Finding

The monthly validation script **succeeds** using the **same v6.0 image**!

**Key Difference in Docker Command**:

```bash
# ❌ FAILS: JavaToolOrchestrator approach
docker run --rm iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
  bash -c 'dependency-check --scan /workspace ...'

# ✅ WORKS: Validation script approach
docker run --rm iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
  -c "dependency-check --scan /workspace ..."
```

---

## Image Architecture Comparison

### v5.x Images (Previous)

**Architecture**: Standard Ubuntu-based container
**Shell**: `/bin/bash` and `/bin/sh` available
**Command Execution**: Via bash/sh shell
**Pattern**: `docker run image bash -c 'command'`

**Example**:
```bash
docker run --rm analyzer:lang-java-v5.3-arm \
  bash -c 'pmd check -d /workspace ...'
```

### v6.0 Image (Current)

**Architecture**: Custom ENTRYPOINT-based container
**Shell**: **NO standard shells in `/bin/`**
**Command Execution**: Direct via ENTRYPOINT
**Pattern**: `docker run image -c "command"`

**Example**:
```bash
docker run --rm iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
  -c "dependency-check --scan /workspace ..."
```

**ENTRYPOINT**: Custom script that intercepts `-c` flag and runs tools directly

---

## Validation Script Analysis

**File**: `/home/opc/codequal/scripts/monthly-log4shell-validation.sh`

**Working Docker Command** (lines 63-80):
```bash
docker run --rm \
  -v "$TEST_DIR:/workspace" \
  -v "$JDBC_DRIVER_DIR:/jdbc:ro" \
  --network host \
  -e CLASSPATH="/opt/dependency-check/lib/*:/jdbc/*" \
  "$DOCKER_IMAGE" \
  -c "dependency-check \
    --scan /workspace \
    --format JSON \
    --out /workspace \
    --project 'Log4Shell Validation' \
    --connectionString jdbc:postgresql://${PG_HOST}:${PG_PORT}/${PG_DB} \
    --dbUser ${PG_USER} \
    --dbPassword ${PG_PASSWORD} \
    --dbDriverName org.postgresql.Driver \
    --dbDriverPath /jdbc/postgresql-42.7.1.jar \
    --disableNodeAudit"
```

**Key Points**:
- ✅ No `bash -c` wrapper
- ✅ Direct `-c` flag to ENTRYPOINT
- ✅ Command passed as single argument
- ✅ Environment variables set via `-e`
- ✅ Network mode: `--network host` (for PostgreSQL access)

---

## JavaToolOrchestrator Current Implementation

**File**: `src/two-branch/tools/java/java-tool-orchestrator.ts`

### PMD Execution (Line ~303)

```typescript
const command = `
  docker run --rm \\
    -v ${repoPath}:/workspace \\
    ${this.dockerImage} \\
    bash -c 'pmd check \\
      -d /workspace \\
      -f json \\
      -R ${rulesets} \\
      --minimum-priority ${this.config.pmd.minimumPriority} \\
      --threads ${this.config.pmd.threads} \\
      --cache /tmp/pmd-cache \\
      > /workspace/pmd-results-${branch}.json 2>&1 || true'
`;
```

**❌ Problem**: Uses `bash -c` which doesn't exist in v6.0 image

### Checkstyle Execution (Line ~384)

```typescript
const command = `
  docker run --rm \\
    -v ${repoPath}:/workspace \\
    ${this.dockerImage} \\
    bash -c 'checkstyle \\
      -c ${this.config.checkstyle.configFile} \\
      -f json \\
      ${filesToScan} \\
      > /workspace/checkstyle-results-${branch}.json 2>&1 || true'
`;
```

**❌ Problem**: Same `bash -c` issue

### Dependency-Check Execution (Line ~605)

```typescript
const command = `
  docker run --rm \\
    -v ${repoPath}:/workspace \\
    -v $(dirname ${pg.dbDriver}):$(dirname ${pg.dbDriver}):ro \\
    --network host \\
    -e CLASSPATH="/opt/dependency-check/lib/*:${pg.dbDriver}" \\
    ${this.dockerImage} \\
    bash -c 'dependency-check \\
      --scan /workspace \\
      --format JSON \\
      --out /workspace/dependency-check-results-${branch} \\
      --project "CodeQual-${branch}" \\
      ${jdbcParams} \\
      --failOnCVSS ${this.config.dependencyCheck.failOnCVSS} \\
      --disableNodeAudit \\
      --disableYarnAudit 2>&1 || true'
`;
```

**❌ Problem**: Uses `bash -c` instead of direct `-c` flag

---

## Required Fix

### Pattern Change Required

**Before** (❌ Broken):
```typescript
docker run --rm \
  -v ${repoPath}:/workspace \
  ${dockerImage} \
  bash -c 'tool command args > output'
```

**After** (✅ Working):
```typescript
docker run --rm \
  -v ${repoPath}:/workspace \
  ${dockerImage} \
  -c "tool command args > output"
```

### Key Changes Needed

1. **Remove `bash -c` wrapper**
   - Before: `bash -c 'command'`
   - After: `-c "command"`

2. **Quote Handling**
   - Before: Single quotes for bash: `'command'`
   - After: Double quotes for ENTRYPOINT: `"command"`

3. **Output Redirection**
   - Still supported: `> /workspace/output.json`
   - Error redirection: `2>&1`
   - Continue on error: `|| true`

4. **Environment Variables**
   - Use `-e` flag: `-e VAR=value`
   - Access in command: `$VAR`

---

## Testing Confirmation

### Successful Execution (from validation script)

```bash
# Test: Monthly Log4Shell Validation
$ /home/opc/codequal/scripts/monthly-log4shell-validation.sh

Results:
✅ MONTHLY VALIDATION PASSED
- CVE-2021-44228 (Log4Shell): ✅ DETECTED
- PostgreSQL backend: ✅ WORKING
- Database CVE count: 208,531
- Scan duration: 5s
- Docker Image: iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm
```

**Conclusion**: The v6.0 image works perfectly when used correctly!

---

## Impact Assessment

### ❌ Currently Broken

1. **JavaToolOrchestrator.runPMD()** - Cannot execute PMD
2. **JavaToolOrchestrator.runCheckstyle()** - Cannot execute Checkstyle
3. **JavaToolOrchestrator.runSemgrep()** - Cannot execute Semgrep
4. **JavaToolOrchestrator.runDependencyCheck()** - Cannot execute Dependency-Check
5. **All integration tests** - Cannot run on Oracle Cloud

### ✅ Currently Working

1. **monthly-log4shell-validation.sh** - Uses correct pattern
2. **daily-cve-update.sh** - Uses correct pattern
3. **Standalone Dependency-Check** - Works via validation scripts

---

## Recommended Solution

### Option 1: Update JavaToolOrchestrator (RECOMMENDED)

**Effort**: Medium (2-3 hours)
**Impact**: Fixes all tool execution
**Risk**: Low (clear pattern to follow)

**Steps**:
1. Update all `docker run` commands to use `-c` instead of `bash -c`
2. Change quote style from single to double
3. Test each tool individually
4. Run full integration test

### Option 2: Rebuild Docker Image with Bash

**Effort**: High (rebuild + test + deploy)
**Impact**: Maintains backward compatibility
**Risk**: Medium (may introduce other issues)

**Not Recommended**: The ENTRYPOINT pattern is better architecture

---

## Next Steps

### Immediate (Today)

1. ✅ Document discovery (this file)
2. ⏳ Update JavaToolOrchestrator with correct Docker pattern
3. ⏳ Test PMD execution
4. ⏳ Test Checkstyle execution
5. ⏳ Test Semgrep execution
6. ⏳ Test Dependency-Check execution

### Follow-Up (Tomorrow)

7. Run full integration test on Oracle Cloud
8. Validate all tools work correctly
9. Update V9 integration
10. Deploy to production

---

## Code Examples for Fix

### PMD Fix

```typescript
// BEFORE (BROKEN):
const command = `
  docker run --rm \\
    -v ${repoPath}:/workspace \\
    ${this.dockerImage} \\
    bash -c 'pmd check -d /workspace -f json ...'
`;

// AFTER (FIXED):
const command = `
  docker run --rm \\
    -v ${repoPath}:/workspace \\
    ${this.dockerImage} \\
    -c "pmd check -d /workspace -f json ..."
`;
```

### Dependency-Check Fix

```typescript
// BEFORE (BROKEN):
const command = `
  docker run --rm \\
    -v ${repoPath}:/workspace \\
    --network host \\
    ${this.dockerImage} \\
    bash -c 'dependency-check --scan /workspace ...'
`;

// AFTER (FIXED):
const command = `
  docker run --rm \\
    -v ${repoPath}:/workspace \\
    --network host \\
    ${this.dockerImage} \\
    -c "dependency-check --scan /workspace ..."
`;
```

---

## Lessons Learned

1. **Always test Docker images directly** before using in orchestration
2. **ENTRYPOINT-based images** require different command patterns
3. **Validation scripts** are good examples of working patterns
4. **Architecture changes** in Docker images need documentation
5. **Shell availability** should not be assumed in custom images

---

## Related Files

- ✅ Working: `/home/opc/codequal/scripts/monthly-log4shell-validation.sh`
- ✅ Working: `/home/opc/codequal/scripts/daily-cve-update.sh`
- ❌ Broken: `src/two-branch/tools/java/java-tool-orchestrator.ts`
- 📝 Test: `src/two-branch/tests/integration/test-java-full-analysis.ts`

---

**Last Updated**: October 2, 2025
**Discovered By**: Claude Code during integration testing
**Priority**: 🔴 **HIGH - BLOCKING**
**Estimated Fix Time**: 2-3 hours
**Status**: ⏳ **PENDING FIX**
