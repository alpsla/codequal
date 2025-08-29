# 🚀 NEXT SESSION QUICKSTART GUIDE

**Generated:** 2025-08-27  
**Previous Session:** DeepWiki Parser Fixes & Bug Discovery  
**System Version:** 1.4.3  

---

## ⚡ Quick Context

Last session discovered critical pipeline failures. The system has partial fixes but needs systematic resolution of interconnected bugs.

---

## 🎯 IMMEDIATE PRIORITIES (In Order)

### 1️⃣ Fix Connection Issues FIRST (BUG-079, BUG-081)
```bash
# Test current state
kubectl get pods -n codequal-dev -l app=deepwiki
redis-cli -h 157.230.9.119 -a n7ud71guwMiBv3lOwyKGNbiDUThiyk3n ping

# If DeepWiki not running:
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001

# Test DeepWiki directly:
curl http://localhost:8001/health
```

### 2️⃣ Fix Parser Issues (BUG-083, BUG-072)
```bash
# Test parser with debug mode
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
USE_DEEPWIKI_MOCK=false npx ts-node test-debug-deepwiki-pr.ts

# Key file to fix:
# src/standard/services/direct-deepwiki-api-with-location-v2.ts
# Lines 650-850 (parseDeepWikiResponse method)
```

### 3️⃣ Fix Report Generation (BUG-082)
```bash
# Test V8 report generation
USE_DEEPWIKI_MOCK=true npx ts-node test-v8-final.ts

# Key file to fix:
# src/standard/comparison/report-generator-v8-final.ts
# Check generateHtmlReport and generateMarkdownReport methods
```

### 4️⃣ Fix Fix Suggestions (BUG-084)
```bash
# Test fix generation
npx ts-node test-fix-suggestions-demo.ts

# Key file to fix:
# src/standard/services/fix-suggestion-agent-v2.ts
# Check generateFixes and getRealOrIntelligentFix methods
```

---

## 🔧 ENVIRONMENT SETUP

```bash
# 1. Start in correct directory
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# 2. Load environment
source ../../.env

# 3. Check build status
npm run build

# 4. Start DeepWiki
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 &

# 5. Verify Redis
redis-cli -h 157.230.9.119 -a n7ud71guwMiBv3lOwyKGNbiDUThiyk3n ping
```

---

## 🐛 CRITICAL BUGS TO FIX

| Bug ID | Description | Severity | File | Status |
|--------|-------------|----------|------|--------|
| BUG-079 | DeepWiki connection unstable | HIGH | direct-deepwiki-api-with-location-v2.ts | 🔴 OPEN |
| BUG-081 | Redis connection failures | HIGH | direct-deepwiki-api-with-location-v2.ts | 🔴 OPEN |
| BUG-083 | Parser format mismatch | HIGH | direct-deepwiki-api-with-location-v2.ts:650-850 | 🔴 OPEN |
| BUG-072 | Iteration issues | HIGH | direct-deepwiki-api-with-location-v2.ts | 🔴 OPEN |
| BUG-082 | V8 report format broken | HIGH | report-generator-v8-final.ts | 🔴 OPEN |
| BUG-084 | Fix suggestions failing | HIGH | fix-suggestion-agent-v2.ts | 🔴 OPEN |
| BUG-086 | Report timeouts | HIGH | manual-pr-validator.ts | 🔴 OPEN |

---

## 🧪 TEST COMMANDS

### Quick Health Check
```bash
# Test everything is working
npm run test:integration -- --testNamePattern="production-ready-state"
```

### Test Specific Fix
```bash
# After fixing parser (BUG-083):
USE_DEEPWIKI_MOCK=false npx ts-node test-debug-deepwiki-pr.ts

# After fixing report (BUG-082):
USE_DEEPWIKI_MOCK=true npx ts-node test-v8-final.ts

# After fixing suggestions (BUG-084):
npx ts-node test-fix-suggestions-demo.ts

# Full integration test:
USE_DEEPWIKI_MOCK=false timeout 300 npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700
```

---

## 📁 KEY FILES TO MODIFY

```typescript
// 1. Parser Issues (BUG-083, BUG-072)
src/standard/services/direct-deepwiki-api-with-location-v2.ts
  - parseDeepWikiResponse() method (lines 650-850)
  - extractIssuesFromSection() method
  - parseDeepWikiPRResponse() method

// 2. Report Generation (BUG-082)
src/standard/comparison/report-generator-v8-final.ts
  - generateHtmlReport() method
  - generateMarkdownReport() method
  - formatIssueWithFix() method

// 3. Fix Suggestions (BUG-084)
src/standard/services/fix-suggestion-agent-v2.ts
  - generateFixes() method
  - getRealOrIntelligentFix() method
  - generateIntelligentPatternFix() method

// 4. Test Runner (BUG-086)
src/standard/tests/regression/manual-pr-validator.ts
  - Timeout configuration (line 45)
  - Fix generation section (lines 200-250)
```

---

## ⚠️ CURRENT SYSTEM STATE

### What's Working ✅
- Basic DeepWiki connection (when port-forward active)
- Parser handles simple numbered lists
- Cache clearing functionality
- Template-first, AI-fallback order

### What's Broken 🔴
- Code snippets not extracted
- Fix suggestions not generating
- V8 report format incomplete
- Timeouts during generation
- Location data showing "Unknown location"

### What's Partially Working ⚠️
- Parser (gets issues but missing details)
- Redis caching (works but stale data issues)
- Report generation (creates file but incomplete)

---

## 💡 DEBUGGING TIPS

### When Parser Returns 0 Issues:
1. Check DeepWiki response format in debug logs
2. Look for "Response was transformed" message
3. Check if response wrapped in error/raw object
4. Verify regex patterns match actual format

### When Fix Suggestions Fail:
1. Check OPENROUTER_API_KEY is set
2. Verify USE_DEEPWIKI_MOCK environment variable
3. Check template matching in debug logs
4. Look for timeout errors in AI generation

### When Reports Are Incomplete:
1. Check for "Unknown location" in issues
2. Verify code snippets are present
3. Check fix suggestions array length
4. Look for timeout messages in console

---

## 📊 SUCCESS CRITERIA

The session is successful when:

1. ✅ Parser extracts all issue details including locations
2. ✅ Fix suggestions generate for template-matching issues
3. ✅ V8 reports include code snippets and fixes
4. ✅ No timeouts during standard PR analysis
5. ✅ Test command below completes successfully:

```bash
USE_DEEPWIKI_MOCK=false timeout 300 npx ts-node \
  src/standard/tests/regression/manual-pr-validator.ts \
  https://github.com/sindresorhus/ky/pull/700
```

Expected output:
- Main branch: ~23 issues with locations
- PR branch: ~16 issues with locations
- Report includes code snippets
- Fix suggestions for critical issues
- HTML and MD reports generated

---

## 🚨 DO NOT

1. ❌ Don't skip fixing connection issues first
2. ❌ Don't modify V7 generators (deprecated)
3. ❌ Don't use USE_DEEPWIKI_MOCK=true for integration tests
4. ❌ Don't forget to clear caches between tests
5. ❌ Don't ignore timeout errors

---

## 📝 NOTES FOR NEXT SESSION

- Parser needs to handle code snippet extraction from DeepWiki responses
- Fix suggestion templates need review - most aren't matching
- Consider increasing default timeout to 5 minutes
- Redis remote connection (157.230.9.119) may need local fallback
- V8 report format specification needs documentation

---

## 🎯 QUICK START COMMAND

```bash
# Copy and paste to start immediately:
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents && \
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001 & \
sleep 3 && \
curl http://localhost:8001/health && \
echo "Ready to fix BUG-079 through BUG-086" && \
echo "Start with: src/standard/services/direct-deepwiki-api-with-location-v2.ts"
```

---

**Good luck with the bug fixes! Follow the dependency order for best results.**