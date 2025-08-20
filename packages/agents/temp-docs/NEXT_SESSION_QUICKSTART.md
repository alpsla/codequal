# Next Session Quickstart Guide
**Updated:** August 17, 2025  
**Focus:** Fix orchestrator issue preservation

## 🎯 Session Goal
Fix the orchestrator/comparison agent to preserve parsed issues in final reports. Parser works correctly but issues are lost downstream.

## 🚀 Quick Start Commands

### 1. Environment Setup (CRITICAL)
```bash
# Check DeepWiki pod status
kubectl get pods -n codequal-dev -l app=deepwiki

# Start port forwarding (REQUIRED)
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &

# Verify Redis
redis-cli ping

# Navigate to working directory
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
```

### 2. Immediate Test
```bash
# Test with known working case (parser extracts 5 issues)
USE_AI_PARSER=false USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700

# Check outputs (should show 0 issues in reports despite parser finding 5)
open test-outputs/manual-validation/sindresorhus-ky-700-*.html
```

### 3. Debug Tools Available
```bash
# Test raw DeepWiki API directly
npx ts-node test-deepwiki-raw-debug.ts

# Test parser with captured responses
npx ts-node test-parser-directly.ts

# Capture new responses for analysis
npx ts-node capture-deepwiki-response.ts
```

## 🔍 Investigation Focus

### Primary Issue
- **Parser Status:** ✅ Working correctly (extracts 5 issues from ky repo)
- **Final Reports:** ❌ Show 0 issues in JSON/HTML outputs
- **Problem Location:** Orchestrator/comparison agent pipeline

### Key Investigation Points

1. **Orchestrator Pipeline:**
   - File: `packages/agents/src/standard/orchestrator/comparison-orchestrator.ts`
   - Check how parsed issues flow through the orchestrator
   - Look for filtering/transformation that removes issues

2. **Comparison Agent:**
   - File: `packages/agents/src/standard/comparison/comparison-agent.ts`
   - Verify issue preservation during comparison
   - Check if issues are being categorized incorrectly

3. **Report Generation:**
   - File: `packages/agents/src/standard/comparison/report-generator-v7-fixed.ts`
   - Ensure issues make it to final report format
   - Verify JSON/HTML generation includes all issues

## 📊 Debug Logging Added

Enhanced logging is now available in:
- Manual PR validator shows parser vs final count
- Comparison agent logs issue processing steps
- Report generator shows issue categorization
- Orchestrator logs pipeline flow

Look for patterns like:
```
🔍 DEBUG - Parser found: 5 issues
🔍 DEBUG - Orchestrator result: 0 issues
```

## 🧪 Test Cases Ready

### Working Test Case
- **Repo:** https://github.com/sindresorhus/ky/pull/700
- **Parser Result:** 5 issues extracted
- **Final Result:** 0 issues in reports
- **Use:** Primary debugging case

### Alternative Test Cases
```bash
# SWR repository (different format)
USE_AI_PARSER=false USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/vercel/swr/pull/2950

# Next.js repository
USE_AI_PARSER=false USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/vercel/next.js/pull/45678
```

## 🔧 Previous Session Achievements

### ✅ Completed
- Enhanced parser to handle 3 DeepWiki output formats
- Fixed TypeScript compilation errors
- Added comprehensive debug logging
- Created debug tools for isolated testing
- Verified parser works correctly

### 🎯 Current Challenge
Parser extracts issues correctly, but they don't appear in final reports. The bug is in the orchestrator/comparison pipeline, not the parser.

## 📁 Key Files to Examine

### Primary Focus
1. `src/standard/orchestrator/comparison-orchestrator.ts`
2. `src/standard/comparison/comparison-agent.ts`
3. `src/standard/comparison/report-generator-v7-fixed.ts`

### Debug Reference
1. `src/standard/tests/regression/manual-pr-validator.ts` - Main testing tool
2. `src/standard/tests/regression/parse-deepwiki-response.ts` - Working parser
3. Debug tools in root directory

## 🚨 Critical Notes

1. **Always run kubectl port-forward** before testing
2. **Use manual-pr-validator.ts** as main debugging tool
3. **Check outputs directory** for generated reports
4. **Parser is working** - focus on downstream issue preservation
5. **Enhanced logging** will show exactly where issues are lost

## 🎯 Success Criteria
- Final reports show same issue count as parser extracts
- JSON and HTML outputs contain detailed issue information
- All 3 DeepWiki formats work end-to-end
- Issue counts match between parser and final reports

**Ready to start debugging the orchestrator pipeline!**