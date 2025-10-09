# Incident Report: Runaway API Costs - Oct 8, 2025

**Incident ID**: INC-2025-10-08-001  
**Date**: October 8-9, 2025  
**Severity**: HIGH (Financial Impact)  
**Status**: RESOLVED  
**Duration**: ~4-5 hours  
**Est. Cost**: ~$10 USD

---

## 📋 Executive Summary

A test run of `test-v9-e2e-complete.ts` consumed **3,739+ OpenRouter API calls** over 4-5 hours (expected: ~50-100 calls in 5-10 minutes), resulting in approximately $10 in unexpected API costs. The root cause was incomplete deployment of BUG-128 fix - TypeScript source files were updated but compiled JavaScript was not rebuilt.

---

## 🔍 Root Cause Analysis

### Primary Cause

**Incomplete BUG-128 Fix Deployment**:
- ✅ TypeScript source files (`.ts`) were fixed: `model_configs` → `model_configurations`
- ❌ Compiled JavaScript files (`.js`) were NOT updated
- ❌ Test execution used cached compiled JS with incorrect table name

### Chain of Events

1. **19:20 UTC**: Test started (`test-v9-e2e-complete.ts`)
2. **19:23 UTC**: STEP 2 completed successfully (PMD working, all tools OK)
3. **19:25 UTC**: STEP 4 reached (Agent processing)
4. **Error Triggered**: Every AI agent call failed with:
   ```
   Failed to fetch model config: {
     code: '42P01',
     message: 'relation "public.model_configs" does not exist'
   }
   ```
5. **Fallback Chain Activated**:
   - Primary: ModelConfigResolver lookup → **FAIL** (table not found)
   - Secondary: Researcher Agent discovery → **FAIL** (same table error)
   - Tertiary: Emergency fallback model → **SUCCESS** (but slow)

6. **Cost Escalation**:
   - Each report section triggered 3-5 fallback attempts
   - 34 report sections × 3-5 attempts = 100-170 expected calls
   - BUT: Report was being regenerated multiple times due to errors
   - Result: **3,739+ actual calls**

7. **23:13 UTC**: Test manually terminated after detection

---

## 💰 Cost Analysis

| Metric | Value |
|--------|-------|
| **Total API Calls** | 3,739+ |
| **Expected Calls** | 50-100 |
| **Excess Calls** | 3,639+ (97% waste) |
| **Avg Cost per Call** | ~$0.003 |
| **Total Cost** | ~$10.00 |
| **Expected Cost** | ~$0.15-0.30 |

### Cost Breakdown by Phase

- Tool Execution: ~20 calls ✅ (expected)
- Issue Categorization: 0 calls ✅ (expected)
- Agent Processing (10 issues): ~30 calls ✅ (expected)
- **Report Generation: 3,689+ calls** ❌ (should be ~50)

---

## ✅ What Worked (Positive Outcomes)

Despite the cost issue, the test validated critical fixes:

1. **BUG-127 RESOLVED**: PMD produced 7,299 issues (was 0)
2. **All 5 Tools Working**: PMD, Semgrep, Checkstyle, SpotBugs, Dependency-Check
3. **Two-Branch Analysis**: Successfully analyzed both PR and main branches
4. **Issue Categorization**: Correctly categorized 9,449 issues
5. **Code Snippets**: Successfully extracted for all issues

**Core system functionality is WORKING** - only the deployment process had issues.

---

## 🔧 Immediate Actions Taken

### 1. Test Termination
```bash
# Killed runaway process
kill -9 1012713 1012715 1012727 1012686
```

### 2. Cleaned Compiled Files
```bash
# Removed stale JavaScript files
cd ~/codequal/packages/agents/src/standard/monitoring/services
rm -f *.js *.d.ts
```

### 3. Verified Source Files
```bash
# Confirmed TypeScript source is correct
grep -c 'model_configs' *.ts  # Result: 0 (good)
grep -c 'model_configurations' *.ts  # Result: 5+ (correct)
```

---

## 🛡️ Preventive Measures Implemented

### 1. Cost-Safe Test Script

Created `test-v9-limited.ts` with:
- **API call limit**: Max 100 calls before auto-termination
- **Call tracking**: Counts and logs every API call
- **Cost estimation**: Real-time cost tracking
- **Reduced scope**: Only critical tests (PMD + Semgrep)
- **Fast validation**: 2-3 minutes vs 5-10 minutes

### 2. Deployment Checklist

**CRITICAL: Always follow this sequence when deploying fixes:**

```bash
# Step 1: Deploy source files
rsync -avz src/ oracle:~/codequal/packages/agents/src/

# Step 2: Remove compiled files (IMPORTANT!)
ssh oracle "cd ~/codequal/packages/agents/src/standard/monitoring/services && rm -f *.js *.d.ts"

# Step 3: Use ts-node (not node)
ssh oracle "cd ~/codequal/packages/agents && npx ts-node test-script.ts"
```

**Why ts-node?**
- Compiles TypeScript on-the-fly
- Always uses latest source code
- No stale compiled files
- Slower startup but guaranteed fresh

### 3. Pre-Flight Checklist

Before running expensive tests:

```bash
# Verify no table name errors
ssh oracle "grep -r 'model_configs' ~/codequal/packages/agents/src/standard/monitoring/ --include='*.ts'"
# Should return 0 results

# Run limited test first
ssh oracle "cd ~/codequal/packages/agents && npx ts-node test-v9-limited.ts"
# Should complete in 2-3 minutes with <100 API calls

# If limited test passes, run full test
ssh oracle "cd ~/codequal/packages/agents && npx ts-node test-v9-e2e-complete.ts"
```

---

## 📊 Lessons Learned

### Technical Lessons

1. **TypeScript Compilation**: Always remove old `.js` files after source updates
2. **Test Validation**: Run limited tests before expensive full tests
3. **Cost Monitoring**: Implement API call limits in long-running tests
4. **Error Handling**: Fallback chains can amplify costs exponentially
5. **ts-node vs node**: Use ts-node for development to avoid stale compiled code

### Process Lessons

1. **Deployment Verification**: Add "remove compiled files" to deployment checklist
2. **Cost Limits**: Set hard limits on API calls for test scripts
3. **Early Detection**: Monitor initial test output for error patterns
4. **Incremental Testing**: Validate fixes in stages (limited → full test)

---

## 🎯 Action Items

### Completed ✅

- [x] Stop runaway test
- [x] Remove stale compiled files
- [x] Verify source files correct
- [x] Create cost-safe test script
- [x] Document incident
- [x] Create deployment checklist

### TODO 📋

- [ ] Run `test-v9-limited.ts` to verify fixes work with low cost
- [ ] Add API call tracking to main test script
- [ ] Create automated deployment script with compilation cleanup
- [ ] Add cost alerts to monitoring system
- [ ] Document cost-safe testing practices in README

---

## 📝 Usage Guide

### Running Cost-Safe Test

```bash
# SSH to Oracle
ssh -i "$SSH_KEY" opc@129.213.49.128

# Run limited test (safe, ~$0.30 max)
cd ~/codequal/packages/agents
npx ts-node test-v9-limited.ts

# Expected output:
# ✅ BUG-127 (PMD): FIXED ✅
# ✅ BUG-128 (Table): No errors
# ✅ API Calls: 45 / 100
# ✅ Estimated Cost: $0.14
```

### Running Full Test (After Validation)

```bash
# Only run if limited test passes!
cd ~/codequal/packages/agents
timeout 900 npx ts-node test-v9-e2e-complete.ts 2>&1 | tee /tmp/test-$(date +%Y%m%d-%H%M%S).log

# Monitor in another terminal:
tail -f /tmp/test-*.log | grep -E '(STEP|✅|PMD:|API)'
```

---

## 💡 Future Improvements

### Short-term (Next Session)

1. Add API call counter to all test scripts
2. Implement cost alerts (email/Slack when cost > $1)
3. Create "dry run" mode for tests

### Medium-term

1. Build TypeScript automatically on Oracle (CI/CD)
2. Add cost tracking dashboard
3. Implement API call budgets per test

### Long-term

1. Cache AI responses for identical requests
2. Use cheaper models for report generation
3. Implement smart report generation (only AI-enhance top issues)

---

## 📞 Contact

**Incident Owner**: AI Assistant (Session 2025-10-08)  
**User Affected**: alpinro  
**System**: CodeQual V9 on Oracle Cloud  
**Next Review**: Before next full E2E test

---

## ✅ Resolution Status

**RESOLVED**: 
- Immediate cost impact stopped (test terminated)
- Root cause identified (stale compiled JavaScript)
- Preventive measures implemented (cost-safe test script)
- Deployment process improved (checklist with compilation cleanup)

**REMAINING WORK**:
- Validate fixes with cost-safe test
- Run full test only after limited test passes
- Monitor API costs in future tests

---

**Document Version**: 1.0  
**Last Updated**: October 9, 2025 02:20 UTC  
**Status**: Incident Closed, Monitoring Ongoing

