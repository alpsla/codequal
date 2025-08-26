# How to Test with Real Data ONLY

## Prerequisites

1. **Start DeepWiki port forwarding:**
```bash
kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
```

2. **Verify environment variables in .env:**
```
DEEPWIKI_API_URL=http://localhost:8001
DEEPWIKI_API_KEY=your-key
SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
OPENROUTER_API_KEY=your-key
```

## Primary Test Command

```bash
# Analyze a PR with real DeepWiki:
npx ts-node src/standard/tests/regression/manual-pr-validator.ts <PR_URL>

# Example:
npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700
```

## What This Test Does

1. **Analyzes both branches** (main and PR) using real DeepWiki
2. **Categorizes issues**:
   - 🆕 NEW issues (introduced by PR)
   - ✅ FIXED issues (resolved by PR)
   - ➖ UNCHANGED issues (pre-existing)
3. **Generates V8 report** with all sections
4. **Creates HTML report** in test-reports/
5. **Uses iterative collection** (3-10 iterations for completeness)

## Output Location

Reports are saved to:
- HTML: `test-reports/pr-analysis-<timestamp>.html`
- JSON: `test-reports/pr-analysis-<timestamp>.json`

## NO MOCKING

This codebase no longer supports mocked tests. All analysis uses real DeepWiki data.
