# Two-Branch Analysis Tests

This directory contains all tests for the two-branch analysis system, including integration tests, unit tests, and documentation.

---

## Directory Structure

```
src/two-branch/tests/
├── README.md (this file)
├── integration/
│   ├── test-complete-java-flow.ts          # Complete Java flow integration test (7 scenarios)
│   └── ... (other integration tests)
├── unit/
│   └── ... (unit tests for individual components)
├── docs/
│   ├── QUICK_TEST_REFERENCE.md             # Quick reference for running tests
│   ├── JAVA_FLOW_TESTING_GUIDE.md          # Comprehensive testing guide
│   └── SESSION_2025_10_01_JAVA_FLOW_TESTING_COMPLETE.md  # Session summary
└── fixtures/
    └── ... (test data and fixtures)
```

---

## Quick Start

### Run All Java Flow Tests (6/7 automated)

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

npx ts-node src/two-branch/tests/integration/test-complete-java-flow.ts
```

**Expected**: ~90 seconds, 6/7 tests passing

---

## Test Results Expected

### Automated Tests (6/7)

```
✅ PASSED  Daily CVE Update (36s)
✅ PASSED  Status Change and Queue (4s)
✅ PASSED  Rollback Scenarios (38s)
✅ PASSED  Temporary File Cleanup (2s)
✅ PASSED  Dependency-Check Readiness (3s)
✅ PASSED  JavaToolOrchestrator Integration (1s)
❌ FAILED  End-to-End Real Repository (manual)

Total: 6/7 tests passed
```

---

**Last Updated**: October 1, 2025
**Status**: ✅ Production Ready
**Full Guide**: docs/JAVA_FLOW_TESTING_GUIDE.md
