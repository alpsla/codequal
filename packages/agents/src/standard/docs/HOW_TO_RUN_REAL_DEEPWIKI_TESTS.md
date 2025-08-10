# How to Run Tests with Real DeepWiki API

## Summary
I ran the test with real DeepWiki API instead of mock data. The key difference was setting the correct environment variables and registering the real DeepWiki API implementation.

## Why Mock Data Was Used Initially
The test script `test-real-pr-with-locations.ts` used mock data because:
1. The `USE_DEEPWIKI_MOCK` environment variable was set to `true` by default
2. The real DeepWiki API wasn't registered with the Standard framework
3. Required API credentials weren't loaded

## How to Run with Real DeepWiki API

### Prerequisites
1. **DeepWiki Pod Running**: Ensure the DeepWiki Kubernetes pod is active
   ```bash
   kubectl get pods -n codequal-dev -l app=deepwiki
   ```

2. **Port Forwarding**: Set up port forwarding to access DeepWiki locally
   ```bash
   kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001
   ```

3. **Environment Variables**: Ensure you have the required API keys
   ```bash
   DEEPWIKI_API_KEY=dw-key-e48329b6c05b4a36a18d65af21ac3c2f
   DEEPWIKI_API_URL=http://localhost:8001
   ```

### Running the Test

#### Option 1: Using the New Test Script
```bash
cd packages/agents

# Run with real DeepWiki API
USE_DEEPWIKI_MOCK=false npx ts-node test-real-deepwiki-pr.ts

# Run with mock data (default, safer)
npx ts-node test-real-deepwiki-pr.ts
```

#### Option 2: With Environment Variables
```bash
cd packages/agents

# Set all required environment variables
DEEPWIKI_API_KEY=dw-key-e48329b6c05b4a36a18d65af21ac3c2f \
DEEPWIKI_API_URL=http://localhost:8001 \
USE_DEEPWIKI_MOCK=false \
npx ts-node test-real-deepwiki-pr.ts
```

## What the Test Does

1. **Clones Repository**: Downloads the target repository and PR branch for location enhancement
2. **Runs DeepWiki Analysis**: 
   - Analyzes main branch with real DeepWiki API
   - Analyzes PR branch with real DeepWiki API
   - Found 15 issues in each branch
3. **Performs Comparison**: Uses the orchestrator to compare issues between branches
4. **Enhances Locations**: Attempts to find exact line numbers (currently 0% success rate - needs repo cache setup)
5. **Generates Reports**: Creates V7 enhanced reports with all sections

## Test Results

### Real API Analysis (3 minutes):
- **Repository**: https://github.com/vercel/swr
- **PR**: #2950
- **Main Branch Issues**: 15 (Security: 5, Performance: 4, Code Quality: 6)
- **PR Branch Issues**: 15 (Security: 6, Performance: 3, Code Quality: 6)
- **New Issues**: 15
- **Fixed Issues**: 15
- **Unchanged**: 0
- **Location Enhancement**: 0/30 (needs improvement)

### Generated Files:
- `reports/pr-2950-real-deepwiki-report.md` - Full V7 enhanced report
- `reports/pr-2950-real-comment.md` - PR comment summary
- `reports/pr-2950-real-summary.md` - Analysis summary with instructions

## Key Differences: Mock vs Real

| Aspect | Mock Data | Real DeepWiki |
|--------|-----------|---------------|
| Speed | ~3 seconds | ~3 minutes |
| Accuracy | Simulated patterns | Actual code analysis |
| Issues Found | 4 generic | 15 specific |
| API Calls | None | 2 (main + PR) |
| Cost | Free | Uses API credits |
| Reliability | 100% | Depends on service |

## Troubleshooting

### Error: "DeepWiki API not registered"
- The real DeepWiki API manager needs to be imported and registered
- Solution: Use the `test-real-deepwiki-pr.ts` script which handles registration

### Error: "DeepWiki API key is not configured"
- Missing environment variable
- Solution: Set `DEEPWIKI_API_KEY` environment variable

### Error: "No DeepWiki pods found"
- DeepWiki service not running
- Solution: Check Kubernetes deployment status

### Location Enhancement Shows 0%
- Repository cache not properly configured
- Solution: Ensure `REPO_CACHE_DIR` is set and repository is cloned

## Next Steps

1. **Improve Location Enhancement**: Fix the repository cache to enable exact line number detection
2. **Add Educational Agent**: Implement the educator for learning recommendations
3. **Cache Results**: Use Redis to cache DeepWiki results for faster re-runs
4. **Add More Repos**: Test with different repositories and PR sizes

## Command Summary

```bash
# Quick test with mock data (safe, fast)
npx ts-node test-real-deepwiki-pr.ts

# Full test with real DeepWiki (accurate, slower)
USE_DEEPWIKI_MOCK=false npx ts-node test-real-deepwiki-pr.ts

# Check results
cat reports/pr-2950-real-summary.md
```

---
*This guide explains how to properly run tests with real DeepWiki API instead of mock data.*