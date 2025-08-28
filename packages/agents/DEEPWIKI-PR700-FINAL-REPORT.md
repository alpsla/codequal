# DeepWiki Analysis Report - PR #700 sindresorhus/ky

## Executive Summary

**Date:** August 28, 2025  
**Repository:** https://github.com/sindresorhus/ky  
**PR #700:** "Workaround silent crash in node 20 on await stream cancel"  
**Status:** ⚠️ **DeepWiki Not Providing Real Analysis**

## Critical Finding

### DeepWiki Service Issue
DeepWiki is **NOT** analyzing the actual repository code despite:
- ✅ Service is healthy and running
- ✅ Repository is successfully cloned
- ✅ Embeddings are created (repository content visible in logs)
- ❌ **Responses are generic/hallucinated** - not based on actual code

## Test Results Summary

### Prompt Testing Results
We tested 16 different prompt styles, from ultra-simple to complex:

| Prompt Style | Example | Result |
|--------------|---------|---------|
| Ultra Simple | "Find bugs" | Generic response, no real issues |
| Specific File | "Check source/core/Ky.ts" | Mentions file but generic content |
| Line Specific | "Analyze line 90 of Ky.ts" | Shows wrong code snippet |
| Complex Format | Full structured prompt | Returns fake file paths |

**Success Rate:** Only 3/16 prompts mentioned real files, but **0/16 provided actual code analysis**

### Response Patterns Observed

#### For Main Branch:
```
"The repository does not have any reported bugs..."
"Review the following aspects commonly checked..."
"Potential areas to review include..."
```
→ Generic suggestions, not actual findings

#### For PR #700:
```
"PR 700 introduces several changes..."
"Enhanced error handling..."
"Refactoring..."
```
→ Made-up changes, not the actual single-line change

## Actual PR #700 Change

### Real Change (from GitHub API)
```diff
// source/core/Ky.ts - Line 90
.finally(async () => {
    if (!ky.request.bodyUsed) {
-       await ky.request.body?.cancel();
+       ky.request.body?.cancel();
    }
})
```

**What it does:** Removes `await` to workaround Node.js 20 crash

### What DeepWiki Returns
DeepWiki claims PR #700 includes:
- "Improved TypeScript Definitions" ❌ (Not true)
- "Enhanced error handling" ❌ (Not true)
- "Code refactoring" ❌ (Not true)
- Files like "index.js", "src/ky.js" ❌ (Don't exist)

## Root Cause Analysis

### Why DeepWiki Fails

1. **Embeddings Not Used for Response**
   - Repository is indexed (visible in logs)
   - But responses don't use the indexed content
   - AI generates generic responses instead

2. **Possible Causes**
   - Retrieval pipeline broken
   - Context not being passed to AI
   - Embeddings not properly queried
   - AI model not receiving retrieved chunks

3. **Evidence**
   - Same generic responses regardless of prompt
   - Mentions non-existent files
   - Cannot find actual issues even when prompted specifically

## Recommendations

### Immediate Actions

1. **Fix DeepWiki Retrieval Pipeline**
   ```bash
   # Check if embeddings are searchable
   kubectl exec -n codequal-dev deployment/deepwiki -- \
     python -c "from api.data_pipeline import search_embeddings; 
                print(search_embeddings('ky.request.body.cancel'))"
   ```

2. **Verify Context Passing**
   - Check if retrieved chunks are passed to AI
   - Verify prompt template includes context
   - Ensure AI model receives repository data

3. **Test with Direct Queries**
   ```python
   # Test if embeddings return relevant content
   query = "cancel stream body"
   results = vector_store.search(query, k=5)
   print(results)  # Should show Ky.ts line 90 area
   ```

### Alternative Solutions

1. **Use Mock Mode**
   ```bash
   USE_DEEPWIKI_MOCK=true npm run analyze
   ```
   Mock mode might have better pre-configured responses

2. **Restart DeepWiki**
   ```bash
   kubectl rollout restart deployment/deepwiki -n codequal-dev
   kubectl wait --for=condition=ready pod -n codequal-dev -l app=deepwiki
   ```

3. **Clear Cache and Re-index**
   ```bash
   kubectl exec -n codequal-dev deployment/deepwiki -- \
     rm -rf /root/.adalflow/repos/*
   ```

## Conclusion

### Current State
- ❌ **DeepWiki is NOT working for code analysis**
- ✅ Infrastructure is healthy (pod, API, cloning)
- ❌ Analysis pipeline is broken (retrieval → AI)
- ❌ Returns generic/fake responses for all queries

### Impact
- Cannot analyze PR changes
- Cannot find real code issues
- Cannot provide fix suggestions
- Service is essentially non-functional for its purpose

### Next Steps
1. **Debug retrieval pipeline** - Why aren't embeddings being used?
2. **Check prompt templates** - Is context being included?
3. **Verify AI integration** - Is the model receiving repository data?
4. **Consider alternative** - Use different analysis tool if DeepWiki cannot be fixed

## Appendix: Evidence

### Generic Response Example
**Prompt:** "Find security issues"  
**Response:** "The repository does not have any known security vulnerabilities..."  
**Reality:** Should analyze actual code, not give generic statement

### Fake File Example
**Prompt:** "Analyze this repository"  
**Response:** Mentions "index.js", "src/ky.js"  
**Reality:** These files don't exist; real files are "source/core/Ky.ts", etc.

### Wrong PR Description
**Prompt:** "What changed in PR 700?"  
**Response:** "Enhanced type definitions, refactoring..."  
**Reality:** Single line change removing `await`

---

**Report Generated:** August 28, 2025  
**Recommendation:** DeepWiki requires immediate fixing or replacement