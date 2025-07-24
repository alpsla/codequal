# Rate Limiting Analysis & Recommendations

## Current Configuration Issues

### 1. Global Rate Limiter (CRITICAL)
- **Current**: 100 requests per 15 minutes (≈6.6 req/min)
- **Issue**: Too restrictive for normal web app usage
- **Recommendation**: Increase to 1000 requests per 15 minutes (≈66 req/min)

### 2. API Rate Limiter (MEDIUM)
- **Current**: 10 req/min for unauthenticated users
- **Issue**: Too low for dashboard/page loads that make multiple API calls
- **Recommendation**: 
  - Unauthenticated: 30 req/min
  - API Key: 60 req/min
  - Basic tier: 120 req/min
  - Premium tier: 300 req/min

### 3. Missing Exemptions
- Static assets (CSS, JS, images) should be exempt
- Health check endpoints should be exempt
- Certain read-only endpoints could have higher limits

## Recommended Changes

```typescript
// Global rate limiter - more permissive
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased from 100
  skip: (req: Request) => {
    // Skip rate limiting for static assets
    return req.path.match(/\.(css|js|jpg|png|gif|ico|svg|woff|woff2)$/i) !== null;
  }
});

// API rate limiter - adjusted tiers
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: (req: Request) => {
    const user = (req as any).user;
    if (user?.subscription?.tier === 'premium') {
      return 300; // increased from 60
    } else if (user?.subscription?.tier === 'basic') {
      return 120; // increased from 30
    } else if (req.headers['x-api-key']) {
      return 60; // increased from 20
    }
    return 30; // increased from 10
  }
});

// Separate rate limiter for read operations
export const readOnlyRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200, // Higher limit for GET requests
  skip: (req: Request) => req.method !== 'GET'
});
```

## Monitoring Strategy

1. **Track Rate Limit Hits**:
   - Log when users hit rate limits
   - Monitor which endpoints trigger limits most
   - Adjust limits based on real usage patterns

2. **User Experience Metrics**:
   - Monitor 429 response rates
   - Track user abandonment after hitting limits
   - Set up alerts for high rate limit violations

3. **Gradual Rollout**:
   - Start with recommended limits
   - Monitor for abuse
   - Adjust based on actual usage patterns

## Implementation Priority

1. **Immediate** (High Risk):
   - Increase global rate limit to prevent blocking normal users
   - Exempt static assets from rate limiting

2. **Short Term** (Medium Risk):
   - Adjust API rate limits per tier
   - Implement read-only endpoint exemptions
   - Add better client-side rate limit handling

3. **Long Term** (Optimization):
   - Implement sliding window rate limiting
   - Add per-endpoint custom limits
   - Consider Redis-based distributed rate limiting

## Client-Side Improvements

1. **Request Batching**: Combine multiple API calls where possible
2. **Caching**: Implement client-side caching to reduce requests
3. **Rate Limit Headers**: Display remaining requests to users
4. **Graceful Degradation**: Handle 429 responses smoothly