# DeepWiki Enhancement - Next Session Plan

## ✅ Completed in Previous Sessions

### Session 2025-08-15: Module Reorganization
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

### Session 2025-08-17: DeepWiki Fix & AI Parser Integration
1. **Fixed DeepWiki Returning 0 Issues**
   - Enhanced rule-based parser to correctly extract severity, files, and line numbers
   - Now successfully returns 10 issues on main branch, 5 on PR branch
   - Fixed continuation line parsing and file path extraction

2. **AI Parser Integration (Partial)**
   - Integrated UnifiedAIParser from comprehensive implementation
   - Enhanced fallback chain without hardcoded models
   - Fixed JSON parsing to handle markdown code blocks
   - AI parser working but returning 0 issues (identified as BUG-032)

3. **Improved Error Handling**
   - Better model selection fallback mechanisms
   - Proper environment variable loading
   - Enhanced debugging and validation tools

## 🔴 Critical Issues to Fix Next

### Priority 1: Fix AI Parser Returning 0 Issues (BUG-032)
**Problem**: UnifiedAIParser successfully calls AI models but returns 0 issues
**Working**: Rule-based parser extracts 10+ issues correctly

**Debug Plan**:
```bash
# 1. Test AI parser in isolation
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node -e "
const { UnifiedAIParser } = require('./src/standard/deepwiki/services/unified-ai-parser');
const parser = new UnifiedAIParser();
// Test with sample DeepWiki response
"

# 2. Debug parseCategory method
# Check if individual category parsing works

# 3. Debug response aggregation
# Verify how 8 categories are combined
```

**Hypothesis**: Issue in `parseCategory` method or response aggregation logic

### Priority 2: Model Selection Improvements
**Problem**: DynamicModelSelector returns invalid models (google/gemini-2.5-pro-exp-03-25)
**Working**: Fallback models work but may have parsing issues

**Solutions**:
1. Implement model validation before selection
2. Update model availability check
3. Filter out known problematic models

### Priority 3: Complete System Integration Testing
**Achievement**: DeepWiki analysis now working with rule-based parser
**Next**: Ensure AI parser becomes primary solution with rule-based fallback

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