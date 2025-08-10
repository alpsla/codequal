# Real DeepWiki PR Analysis - https://github.com/vercel/swr #2950

## Configuration
- **DeepWiki Mode**: REAL API
- **Repository**: https://github.com/vercel/swr
- **PR Number**: 2950
- **Duration**: 182.9s

## Results
- **New Issues**: 15
- **Fixed Issues**: 15
- **Unchanged Issues**: 0

## How to Run with Real DeepWiki

To run this test with the real DeepWiki API instead of mock data:

```bash
# Ensure DeepWiki pod is running
kubectl get pods -n codequal-dev -l app=deepwiki

# Run with real API
USE_DEEPWIKI_MOCK=false npx ts-node test-real-deepwiki-pr.ts
```

## How to Run with Mock Data (default)

```bash
# Run with mock data (safer for testing)
npx ts-node test-real-deepwiki-pr.ts

# Or explicitly:
USE_DEEPWIKI_MOCK=true npx ts-node test-real-deepwiki-pr.ts
```

---
*Generated with CodeQual V7 Enhanced Report Generator*
