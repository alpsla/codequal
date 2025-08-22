# CodeQual Session Startup Checklist

## ⚠️ CRITICAL: Run These Steps EVERY New Session!

### 1. Port Forwarding Setup (Terminal 1)
```bash
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
```
Keep this terminal open!

### 2. Register DeepWiki API (Terminal 2)
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npx ts-node setup-deepwiki-for-session.ts
```

**WHY THIS IS CRITICAL:**
- The `UnifiedAnalysisWrapper` needs `DirectDeepWikiApi` to be registered
- This registration is lost between sessions
- Without this, you'll get 0 issues or empty responses!

### 3. Quick Verification
```bash
# Test that everything works
npx ts-node test-v8-validation.ts
```

Should see:
- ✅ Base branch: X issues found
- ✅ PR branch: Y issues found
- ✅ Proper issue categorization

## Common Problems & Solutions

### Problem: 0 Issues Found
**Cause:** DirectDeepWikiApi not registered
**Solution:** Run `npx ts-node setup-deepwiki-for-session.ts`

### Problem: DeepWiki 500 Errors  
**Cause:** GitHub authentication issue
**Solution:** 
```bash
kubectl exec -n codequal-dev deployment/deepwiki -- git config --global url."https://github.com/".insteadOf "git@github.com:"
```

### Problem: Location Validation Filtering Too Many Issues
**Cause:** High confidence threshold (70%)
**Solution:** Set `requireMinConfidence: 0` in test calls

### Problem: Mock Mode Not Working
**Cause:** Mock implementation broken
**Solution:** Use real DeepWiki (`USE_DEEPWIKI_MOCK=false`)

## Test File Locations

All in `/Users/alpinro/Code Prjects/codequal/packages/agents/`:

- `test-v8-validation.ts` - Main V8 validation test
- `test-v8-bug-fixes-validation.ts` - Bug fix validation
- `test-v8-with-real-deepwiki-data.ts` - Real data test
- `test-real-pr-final-validation.ts` - Final validation

## Quick Commands

```bash
# Full test suite (after setup)
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npm run build
npx ts-node test-v8-bug-fixes-validation.ts
npx ts-node test-v8-with-real-deepwiki-data.ts
npx ts-node test-real-pr-final-validation.ts
```

## Environment Variables

```bash
# For real DeepWiki
export USE_DEEPWIKI_MOCK=false
export DEEPWIKI_API_URL=http://localhost:8001

# For testing with less filtering
export REQUIRE_MIN_CONFIDENCE=0
export MAX_CLARIFICATION_ATTEMPTS=2
```

## Session Marker

After running setup, check for:
```bash
cat .deepwiki-session.json
```

This confirms the session is properly initialized.

---

**Remember:** The most common issue is forgetting to run `setup-deepwiki-for-session.ts`!