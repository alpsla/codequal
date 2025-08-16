# DeepWiki Enhancement - Next Session Plan

## ✅ Completed in This Session

1. **Module Reorganization**
   - Created `/packages/agents/src/standard/deepwiki/` structure
   - Moved all DeepWiki code to dedicated module
   - Fixed all import issues
   - Tests passing with mock mode

2. **New Services Created**
   - `DeepWikiContextManager` - Context persistence
   - `DeepWikiChatService` - Chat interface
   - `DeepWikiCacheManager` - Caching layer

3. **Enhanced API Calls**
   - Added `response_format: { type: "json_object" }`
   - Created structured prompt templates
   - Increased max_tokens to 8000

## 🔴 Critical Issues to Fix Next

### Priority 1: Test Real DeepWiki Response Format
```bash
# 1. Start port forward
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001

# 2. Run structured test
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node test-deepwiki-structured.ts

# 3. Analyze response format
```

### Priority 2: Debug Missing Issues
**Problem**: Only 1-3 issues showing instead of 13+

**Test Script**: Create `test-deepwiki-issue-count.ts`
```typescript
// Compare raw DeepWiki response vs parsed issues
const rawResponse = await callDeepWikiDirectly(repoUrl);
console.log('Raw issues count:', countIssuesInText(rawResponse));

const parsed = parseDeepWikiResponse(rawResponse);
console.log('Parsed issues:', parsed.issues.length);
```

### Priority 3: Fix File Location Detection
**Problem**: Most issues show location as "unknown"

**Solutions to Test**:
1. Use structured prompt with explicit location request
2. Implement two-pass analysis (first for issues, second for locations)
3. Test with response_format parameter

## 📝 Quick Test Commands

```bash
# Test 1: Context mechanism
QUICK_TEST=true npx ts-node src/standard/deepwiki/scripts/test-context-mechanism.ts

# Test 2: Real PR with DeepWiki
USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700

# Test 3: Direct API test with new prompts
npx ts-node src/standard/deepwiki/scripts/test-structured-api.ts
```

## 🎯 Success Criteria

1. **Issue Detection**: Capture all 13+ issues DeepWiki finds
2. **Location Accuracy**: 90%+ issues have specific file/line
3. **Response Format**: Consistent JSON structure
4. **Performance**: < 30s for small repos

## 📊 Debugging Data to Collect

1. Raw DeepWiki response (before parsing)
2. Parsed JSON structure
3. Issue count at each stage
4. File location extraction success rate
5. Response format variations

## 🚀 Next Session Start

```bash
# 1. Check DeepWiki status
kubectl get pods -n codequal-dev -l app=deepwiki

# 2. Setup port forward
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001

# 3. Run test suite
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
./test-deepwiki-debug.sh
```

## 💡 Key Insights

1. **Response Format**: DeepWiki may not respect `response_format` parameter
2. **Model Selection**: Need to test if different models give better structured output
3. **Prompt Engineering**: Explicit JSON schema in prompt may help
4. **Fallback Strategy**: May need to parse text response if JSON fails

## 📁 Important Files

- `/packages/agents/src/standard/deepwiki/services/deepwiki-repository-analyzer.ts` - Main analysis logic
- `/packages/agents/src/standard/deepwiki/config/prompt-templates.ts` - Prompts to test
- `/packages/agents/test-deepwiki-structured.ts` - Test different response formats
- `/packages/agents/src/standard/deepwiki/services/deepwiki-response-parser.ts` - Parser to debug

## 🔧 Environment Setup

```bash
export DEEPWIKI_API_URL=http://localhost:8001
export DEEPWIKI_API_KEY=dw-key-e48329b6c05b4a36a18d65af21ac3c2f
export USE_DEEPWIKI_MOCK=false
export REDIS_URL=redis://localhost:6379
```

---

**Session saved**: 2025-08-15
**Context used**: 93%
**Ready for next session**: YES