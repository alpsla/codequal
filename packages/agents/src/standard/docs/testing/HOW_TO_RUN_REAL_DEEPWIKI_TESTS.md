# Complete V8 Testing Suite - Files & Commands

## 🔍 Test Files Location

All test files are in: `/Users/alpinro/Code Prjects/codequal/packages/agents/`

## 📋 Main V8 Test Files

### 1️⃣ V8 Validation Test

**Full Path:**
`/Users/alpinro/Code Prjects/codequal/packages/agents/test-v8-validation.ts`

**How to Run:**
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npm run build
npx ts-node test-v8-validation.ts
```

**What It Tests:**
- V8 report generator functionality
- Issue reporting and formatting
- HTML report generation with proper styling

### 2️⃣ V8 with Real Analysis Test

**Full Path:**
`/Users/alpinro/Code Prjects/codequal/packages/agents/test-v8-with-real-analysis.ts`

**How to Run:**
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npm run build
npx ts-node test-v8-with-real-analysis.ts
```

**What It Tests:**
- Integration with real DeepWiki data
- Full analysis pipeline
- Report generation with actual analysis results

### 3️⃣ V8 HTML Report Test

**Full Path:**
`/Users/alpinro/Code Prjects/codequal/packages/agents/test-v8-html-report.ts`

**How to Run:**
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npm run build
npx ts-node test-v8-html-report.ts
```

**What It Tests:**
- HTML report generation
- Proper formatting and styling
- Visual elements rendering

## 🚀 Quick Test Commands

### Run Most Important V8 Test

```bash
# Navigate and run the V8 validation test
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents && \
npm run build && \
USE_DEEPWIKI_MOCK=true npx ts-node test-v8-validation.ts
```

### Run Real PR Enhanced Tests

```bash
# Simple enhanced test
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents && \
npm run build && \
USE_DEEPWIKI_MOCK=true npx ts-node test-real-pr-v8-enhanced-simple.ts

# Full enhanced test
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents && \
npm run build && \
USE_DEEPWIKI_MOCK=true npx ts-node test-real-pr-v8-enhanced.ts
```

## 📊 Generated Report Locations

After running tests, HTML reports are saved in the current directory:

```bash
# View generated HTML reports
ls -la /Users/alpinro/Code\ Prjects/codequal/packages/agents/*.html

# Open latest report in browser (macOS)
open /Users/alpinro/Code\ Prjects/codequal/packages/agents/v8-enhanced-test-*.html
```

## 🔧 Regression Test Suite

The main regression test suite is located in:

```bash
# Run regression tests
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npm test src/standard/tests/regression/unified-regression-suite.test.ts
```

## 🔧 If Tests Fail

1. Check which test failed - It will show specific error messages
2. Review the main V8 generator file:
   `/Users/alpinro/Code Prjects/codequal/packages/agents/src/standard/comparison/report-generator-v8-final.ts`
3. Check if DeepWiki is running:
   ```bash
   kubectl get pods -n codequal-dev -l app=deepwiki
   ```
4. Verify port forwarding is active:
   ```bash
   lsof -i :8001
   ```

## ✅ Success Criteria

- Tests should complete without errors
- HTML reports should be generated
- Mock mode tests should run quickly (< 30 seconds)
- Real DeepWiki tests may take longer (1-3 minutes)

## 📝 Important Notes

- **Always use `USE_DEEPWIKI_MOCK=true`** for testing unless specifically testing DeepWiki integration
- DeepWiki analyzes entire repositories, NOT PR diffs (critical limitation discovered)
- V7 generators are deprecated - only use V8
- Check `packages/agents/src/standard/docs/session_summary/NEXT_SESSION_PLAN.md` for current issues

## Quick Start Guide

### First Time Each Day (or New Session):

```bash
# 1. Setup environment (keeps port forwarding active)
cd /Users/alpinro/Code\ Prjects/codequal
./scripts/test-environment-setup.sh 2>/dev/null || echo "Setup script not found - manual setup required"

# 2. Check DeepWiki pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# 3. Start port forwarding if needed
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &

# 4. Navigate to agents directory
cd packages/agents

# 5. Run a quick test with mock data
USE_DEEPWIKI_MOCK=true npx ts-node test-v8-validation.ts
```

### Subsequent Runs (Same Session):

```bash
# Just run the tests directly - no need to setup again
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
USE_DEEPWIKI_MOCK=true npx ts-node test-v8-validation.ts
```

### If Tests Fail Unexpectedly:

```bash
# Check DeepWiki pod
kubectl get pods -n codequal-dev -l app=deepwiki

# Check port forwarding
lsof -i :8001

# Restart port forwarding if needed
pkill -f "port-forward.*8001"
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &

# Try test again with mock mode
USE_DEEPWIKI_MOCK=true npx ts-node test-v8-validation.ts
```

---
*Last Updated: August 22, 2025*