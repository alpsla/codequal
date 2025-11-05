# Test Directory Organization

**Last Updated**: November 4, 2025
**Status**: Organized for future cleanup after language tool testing completes

---

## 📁 Current Structure

```
tests/
├── README-TEST-ORGANIZATION.md       ← This file
├── V9-TEST-FILES.md                  ← V9 test documentation
├── jest.config.js                    ← Jest configuration
├── jest.setup.js                     ← Jest setup
│
├── __tests__/                        ← ✅ ACTIVE: Jest test suite (20 files)
├── Dependency-check/                 ← ✅ ACTIVE: Dependency check setup & docs
├── integration/                      ← ✅ ACTIVE: Integration tests
├── regression/                       ← ✅ ACTIVE: Regression tests
├── docs/                             ← ✅ ACTIVE: Test documentation
│
└── _to-review/                       ← ⚠️ TO REVIEW AFTER LANGUAGE TOOL TESTING
    ├── v9-iterations/                   (11 files - old V9 test versions)
    ├── performance-calibration/         (4 files - Kafka performance tests)
    ├── pr-analysis/                     (3 files - old PR analysis tests)
    └── dependency-utils/                (7 files - standalone utilities)
```

---

## ✅ ACTIVE Tests (Keep & Use)

### Primary Test
**Location**: `/packages/agents/`
```
test-v9-lite-e2e.ts              ← PRIMARY: Current lite e2e Java test
oracle-run-v9-lite-e2e.sh        ← Oracle runner for lite-e2e test
```

### Jest Test Suite
**Location**: `__tests__/` (20 files)
```
test-v9-optimized-report.ts (67K, Oct 10)    ← Most recent, largest
test-java-all-modes.ts (Oct 30)              ← Latest update
test-kafka-with-spotbugs.ts (Oct 3)
test-complete-v9-report.ts (Oct 3)
... and 16 more test files
```
**Status**: Active test suite, keep all for now
**Review**: After completing language tool testing

### Dependency Check
**Location**: `Dependency-check/` (9 files)
```
README.md                                ← Setup documentation
CRON_JOB_SETUP.md                       ← Production cron setup
PRODUCTION_RECOMMENDATIONS.md            ← Production guidelines
oracle-deploy-dependency-check.sh        ← Oracle deployment
test-dependency-check-complete.sh        ← Complete test suite
test-postgres-solution.sh                ← Database solution test
... and 3 more files
```
**Status**: Active, essential for dependency scanning

### Integration & Regression
**Location**: `integration/`, `regression/`
```
integration/test-java-full-analysis.ts   ← Integration test
regression/                              ← Regression test suite
```
**Status**: Active, keep for quality assurance

---

## ⚠️ TO REVIEW (After Language Tool Testing)

### _to-review/v9-iterations/ (11 files, ~200 KB)
**Purpose**: Old iterations of V9 testing during development
**Created**: September 12-19, 2025
**Status**: ⚠️ Likely superseded by lite-e2e test

```
run-v9-complete-analysis.ts (12K)        ← Sept 12
run-v9-java-pr-complete.ts (35K)         ← Sept 18
run-v9-java-pr.ts (18K)                  ← Sept 18
run-v9-tests.ts (12K)                    ← Sept 18
test-v9-complete-report-generation.ts (21K) ← Sept 12
test-v9-complete-with-supabase.ts (31K)  ← Sept 19
test-v9-tool-orchestrator.ts (6.6K)      ← Sept 19
test-v9-universal-real-pr.ts (26K)       ← Sept 19
test-v9-with-dependency-check.ts (6.7K)  ← Oct 1
v9-real-integration-runner.ts (24K)      ← Sept 18
v9-real-java-analysis.ts (14K)           ← Oct 6
```

**Next Steps**:
1. After language tool testing completes
2. Verify functionality covered by lite-e2e test
3. ✅ DELETE if redundant
4. ✅ Keep only if unique test coverage

---

### _to-review/performance-calibration/ (4 files, ~50 KB)
**Purpose**: Kafka performance optimization tests
**Created**: September 29, 2025
**Status**: ⚠️ One-time performance calibration

```
test-kafka-batched-pmd.ts (9.5K)         ← Batching strategy
test-kafka-extended-timeout.ts (15K)     ← Timeout handling
test-kafka-maximum-parallel.ts (16K)     ← Max parallelization
test-kafka-optimized-batching.ts (13K)   ← Optimized config
```

**Purpose**: Performance baseline testing for Apache Kafka (3,472 files)
**Results**: Documented in performance docs (optimal: 4 parallel, 300 files/batch)

**Next Steps**:
1. ✅ Performance baseline established
2. ✅ Results documented
3. ✅ Safe to DELETE (one-time calibration)

---

### _to-review/pr-analysis/ (3 files, ~30 KB)
**Purpose**: Old PR analysis test iterations
**Created**: September 19, 2025
**Status**: ⚠️ Likely superseded by current tests

```
run-real-java-pr-analysis.ts (8.3K)      ← Java PR analysis
run-real-kafka-pr.ts (12K)               ← Kafka PR analysis
run-real-v9-java-analysis.ts (10K)       ← V9 Java analysis
```

**Next Steps**:
1. Check if functionality covered by __tests__/
2. ✅ DELETE if redundant

---

### _to-review/dependency-utils/ (7 files, ~20 KB)
**Purpose**: Standalone dependency check utilities
**Created**: September-October 2025
**Status**: ⚠️ May be superseded by Dependency-check/ directory

```
check-cpe-format.ts (2.3K)               ← CPE format validation
check-single-cve-direct.ts (1.5K)        ← Single CVE check
test-dependency-check.sh (3.0K)          ← Shell test
test-raw-tool-output.sh (2.9K)           ← Raw output test
test-remaining-tools.sh (4.3K)           ← Tool validation
test-tool-parser.ts (6.5K)               ← Parser test
test-scheduling-simple.ts (2.9K)         ← Scheduling test
```

**Next Steps**:
1. Check if covered by Dependency-check/ directory
2. Consider merging useful utilities into Dependency-check/
3. ✅ DELETE if redundant

---

## 📊 Cleanup Statistics

### Already Deleted (Nov 4, 2025)
```
✅ reports/ directory (27 files, ~500 KB)
   - V9-WITH-ISSUES-*.md (13 iterations)
   - FINAL-*.md, INVESTIGATION-*.md reports
   - All dated Sept 16-17, 2025
   - Reason: Historical test reports, no longer needed
```

### Organized for Review (52 files moved)
```
⚠️ _to-review/v9-iterations/          11 files (~200 KB)
⚠️ _to-review/performance-calibration/ 4 files (~50 KB)
⚠️ _to-review/pr-analysis/             3 files (~30 KB)
⚠️ _to-review/dependency-utils/        7 files (~20 KB)
```

**Total Organized**: 25 files, ~300 KB
**Estimated Deletion After Review**: 20-23 files (~250-280 KB)

---

## 🎯 Cleanup Timeline

### Phase 1: Immediate (Nov 4, 2025) ✅
- ✅ Deleted reports/ directory (27 files)
- ✅ Organized tests into _to-review/ subdirectories
- ✅ Created this README for tracking

### Phase 2: After Language Tool Testing (Future)
**When**: After completing testing for all 11 languages

**Review Process**:
1. ✅ Verify lite-e2e test covers all necessary scenarios
2. ✅ Check __tests__/ for redundant tests
3. ✅ Delete v9-iterations/ (likely all files)
4. ✅ Delete performance-calibration/ (all files - one-time tests)
5. ✅ Delete pr-analysis/ (check for unique coverage first)
6. ✅ Merge/delete dependency-utils/ (consolidate into Dependency-check/)

**Expected Result**: ~20-23 files deleted, ~250-280 KB freed

---

## 🔍 Quick Reference

### Find Active Tests
```bash
# Primary test
ls -lh /packages/agents/test-v9-lite-e2e.ts

# Jest test suite
ls -lh __tests__/

# Dependency check
ls -lh Dependency-check/
```

### Find Tests to Review
```bash
# All pending review
ls -lh _to-review/*/

# By category
ls -lh _to-review/v9-iterations/
ls -lh _to-review/performance-calibration/
ls -lh _to-review/pr-analysis/
ls -lh _to-review/dependency-utils/
```

### Run Active Tests
```bash
# Lite E2E test (primary)
npx ts-node /packages/agents/test-v9-lite-e2e.ts

# Or on Oracle
./packages/agents/oracle-run-v9-lite-e2e.sh

# Jest suite
npm test -- __tests__/test-v9-optimized-report.ts
```

---

## 📝 Decision Criteria for Cleanup

### Keep if:
- ✅ Part of active test suite (__tests__/)
- ✅ Covers unique test scenarios
- ✅ Required for CI/CD
- ✅ Documentation/setup files (Dependency-check/)

### Delete if:
- ❌ Functionality covered by lite-e2e test
- ❌ One-time performance calibration
- ❌ Old iteration/experimental tests
- ❌ Superseded by newer test versions
- ❌ Historical reports/logs

---

## 🚀 Next Steps

1. **Complete language tool testing** for all 11 languages
2. **Verify lite-e2e test** covers all critical scenarios
3. **Review _to-review/ directories** one by one
4. **Delete confirmed redundant tests** (~20-23 files)
5. **Update this README** with final cleanup results

---

**Organized by**: Claude Code - Phase 2E Root Cleanup
**Date**: November 4, 2025
**Purpose**: Prepare for systematic cleanup after language tool testing completes
