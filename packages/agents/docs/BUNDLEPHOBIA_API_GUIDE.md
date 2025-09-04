# 📦 Bundlephobia API Integration Guide

## Overview
Bundlephobia provides a **FREE public API** that doesn't require authentication tokens or API keys. This makes it ideal for continuous monitoring of package sizes in your projects.

## Key Information

### 🎉 NO API KEY REQUIRED
**Important**: Bundlephobia's API is completely free and open. You **DO NOT need an API key** to use it.

### API Endpoints

The main API endpoint is:
```
https://bundlephobia.com/api/size?package=<package-name>@<version>
```

Example:
```bash
curl "https://bundlephobia.com/api/size?package=react@18.2.0"
```

### Response Format
```json
{
  "name": "react",
  "version": "18.2.0",
  "gzip": 42846,
  "size": 139905,
  "dependencySizes": [
    {
      "name": "loose-envify",
      "approximateSize": 1008
    }
  ],
  "dependencyCount": 2,
  "hasJSNext": false,
  "hasJSModule": false,
  "hasSideEffects": false
}
```

## Integration Options

### Option 1: Direct API Usage (No Setup Required)
```typescript
// No API key needed!
async function getPackageSize(packageName: string, version = 'latest') {
  const response = await fetch(
    `https://bundlephobia.com/api/size?package=${packageName}@${version}`
  );
  return response.json();
}
```

### Option 2: Static Analysis Fallback (Already Implemented)
We've already created a static analysis implementation that works without any API:
```typescript
import { StaticBundlephobiaAnalyzer } from './StaticAnalysisTools';

const analyzer = new StaticBundlephobiaAnalyzer();
const results = await analyzer.analyze(targetPath);
```

## Rate Limits and Best Practices

While Bundlephobia doesn't require authentication, please follow these best practices:

1. **Cache responses** - Store results for at least 24 hours
2. **Batch requests** - Don't make parallel requests for all dependencies
3. **Respect the service** - It's free and community-maintained
4. **Use static analysis first** - Only call API for unknown packages

## Environment Configuration

### For API Usage (Optional)
```bash
# .env - No API key needed, but you can configure the URL
BUNDLEPHOBIA_API_URL=https://bundlephobia.com/api
BUNDLEPHOBIA_CACHE_TTL=86400  # 24 hours in seconds
```

### For Static Analysis (Default)
```bash
# Enable static analysis fallback (already configured)
ENABLE_STATIC_ANALYSIS=true
```

## Implementation in CodeQual

We have **TWO** implementations available:

### 1. Static Analysis (Recommended - No External Dependency)
- Located in: `src/two-branch/agents/tools/StaticAnalysisTools.ts`
- Uses known package sizes and patterns
- Works offline
- No rate limits
- Instant results

### 2. API Integration (Optional - For Accurate Sizes)
```typescript
class BundlephobiaAPIAnalyzer {
  private cache = new Map();
  
  async analyze(packageName: string) {
    // Check cache first
    if (this.cache.has(packageName)) {
      return this.cache.get(packageName);
    }
    
    try {
      // No API key needed!
      const response = await fetch(
        `https://bundlephobia.com/api/size?package=${packageName}@latest`
      );
      
      if (!response.ok) {
        // Fall back to static analysis
        return this.staticAnalyzer.analyze(packageName);
      }
      
      const data = await response.json();
      this.cache.set(packageName, data);
      return data;
    } catch (error) {
      // Use static fallback on any error
      return this.staticAnalyzer.analyze(packageName);
    }
  }
}
```

## Why We Use Static Analysis by Default

1. **No External Dependencies** - Works in any environment
2. **No Network Latency** - Instant results
3. **No Rate Limits** - Can analyze unlimited packages
4. **Privacy** - Package list never leaves your system
5. **Reliability** - Always works, even offline

## When to Use the API

Consider using the Bundlephobia API when:
- You need exact, up-to-date package sizes
- Analyzing packages not in our static database
- Validating static analysis results
- Building size tracking dashboards

## Testing

### Test Static Analysis
```bash
npm run test:static-bundlephobia
```

### Test API Integration (Optional)
```bash
# No API key needed!
curl "https://bundlephobia.com/api/size?package=lodash@latest"
```

## Troubleshooting

### "BUNDLEPHOBIA_API_KEY not found"
**Solution**: You don't need an API key! If you see this error, it's from old documentation. Bundlephobia's API is free and open.

### API Returns 429 (Too Many Requests)
**Solution**: Implement caching and reduce request frequency. Use static analysis for known packages.

### API Timeout or Network Error
**Solution**: The static analyzer automatically takes over when the API is unavailable.

## Summary

- ✅ **NO API KEY REQUIRED** - Bundlephobia is FREE
- ✅ **Static Analysis Available** - Works without any external service
- ✅ **Automatic Fallback** - Gracefully handles API failures
- ✅ **Already Integrated** - Both options ready to use

---

*Last Updated: 2025-09-02*
*Status: Fully Integrated with Static Fallback*