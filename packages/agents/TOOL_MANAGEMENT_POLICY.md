# Tool Management Policy - No Silent Failures

## The Problem We Solved
**Critical Issue**: Tools could fail silently and return mock data, giving users a false sense of security.

## The Solution: Three Strict Modes

### 1. STRICT Mode (Production)
- **Behavior**: Fails immediately if any tool is missing
- **Mock Data**: ❌ NEVER
- **Error Message**: `CRITICAL: Tool X is required but not installed. Cannot proceed.`
- **Use Case**: Production environments where real analysis is mandatory

### 2. DEGRADED Mode (Staging/Warning)  
- **Behavior**: Also fails if tools are missing (no mocks!)
- **Mock Data**: ❌ NEVER
- **Error Message**: `WARNING: Tool X not available. Install it or switch to MOCK mode for development.`
- **Use Case**: Staging environments where you want clear warnings but still no fake data

### 3. MOCK Mode (Development ONLY)
- **Behavior**: Returns mock data with clear warnings
- **Mock Data**: ✅ Allowed ONLY with explicit permission
- **Requirements**:
  - `NODE_ENV=development` or `NODE_ENV=test`
  - `ALLOW_MOCK_TOOLS=true` must be explicitly set
  - Mock data clearly marked as "MOCK DATA: This is not real analysis"
- **Use Case**: Local development when you don't have tools installed

## Configuration

```bash
# Production (default - fails fast)
NODE_ENV=production
# or
TOOL_MODE=strict

# Staging (fails with detailed warning)
TOOL_MODE=degraded

# Development (mock data allowed ONLY with flag)
NODE_ENV=development
ALLOW_MOCK_TOOLS=true
TOOL_MODE=mock
```

## Key Principles

1. **No Silent Failures**: System either works with real tools or fails explicitly
2. **No Surprise Mocks**: Mock data ONLY with explicit developer permission
3. **Clear Communication**: Every response indicates data quality
4. **Fail Fast**: Default behavior is to fail, not degrade
5. **Production Safety**: Production can NEVER use mock data

## Environment Defaults

| Environment | Default Mode | Can Use Mocks? |
|------------|--------------|----------------|
| production | STRICT | ❌ Never |
| staging | STRICT | ❌ Never |
| development | STRICT | ✅ Only with `ALLOW_MOCK_TOOLS=true` |
| test | STRICT | ✅ Only with `ALLOW_MOCK_TOOLS=true` |
| undefined | STRICT | ❌ Never |

## Implementation Example

```typescript
// Check tool availability
const check = await toolAvailabilityManager.checkTool('spotbugs');

if (check.shouldFail) {
  // STRICT or DEGRADED mode - fail immediately
  throw new Error(check.warning);
}

if (check.shouldUseMock) {
  // MOCK mode only - with explicit permission
  const mockResult = this.mockSpotBugsAnalysis();
  mockResult.metadata.isMocked = true;
  mockResult.metadata.warning = "MOCK DATA: Not real analysis";
  return mockResult;
}

// Real tool execution
return this.runRealSpotBugs();
```

## Benefits

✅ **No Silent Degradation**: Users always know when tools are missing
✅ **Clear Failures**: Explicit errors instead of fake success
✅ **Developer Friendly**: Can still use mocks for local development
✅ **Production Safe**: Impossible to accidentally use mocks in production
✅ **Monitoring Ready**: Easy to alert on tool failures

## Migration Guide

### From Old (Silent Failure) to New (Explicit Failure)

```typescript
// OLD - BAD
if (!toolInstalled) {
  return mockData();  // Silent failure!
}

// NEW - GOOD
if (!toolInstalled) {
  if (mode === 'mock' && allowMocks) {
    return mockData();  // Explicit mock mode
  }
  throw new Error('Tool required');  // Explicit failure
}
```

## Testing

```bash
# Test with real tools (will fail if not installed)
npm test

# Test with mocks (development only)
NODE_ENV=test ALLOW_MOCK_TOOLS=true npm test

# Test production behavior
NODE_ENV=production npm test  # Will fail if tools missing
```

## Monitoring Integration

The system provides health endpoints for monitoring:

```typescript
const health = await toolAvailabilityManager.getHealthStatus();
// Returns:
// {
//   status: 'healthy' | 'unhealthy',
//   missingTools: ['spotbugs', 'pmd'],
//   recommendations: ['Install: brew install spotbugs']
// }
```

## Summary

This approach ensures:
1. **Production never gets mock data**
2. **Failures are explicit and actionable**
3. **Developers can still work without all tools**
4. **System integrity is maintained**

The key insight: **It's better to fail loudly than succeed falsely.**