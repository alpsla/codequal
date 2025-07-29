# MCP Tools Cloud Deployment - Quick Fix Guide

## Current Status ✅

Good news: The Ref and Serena adapters we just added **don't actually spawn MCP servers**. They inherit from `BaseMCPAdapter` but override the `analyze` method with direct implementations.

### Ref MCP Adapter
- Currently returns mock findings with search queries
- Only requires `REF_API_KEY` environment variable (optional)
- No process spawning, no MCP server needed

### Serena MCP Adapter  
- Implements semantic analysis directly in TypeScript
- No external dependencies or processes
- Works immediately in cloud environment

## Immediate Actions Required

### 1. Override Health Check (Priority: HIGH)

Both adapters inherit `healthCheck()` from BaseMCPAdapter which tries to initialize MCP server. We need to override this:

```typescript
// In ref-mcp.ts
async healthCheck(): Promise<boolean> {
  // Check if API key is configured (when real implementation is added)
  return !!(process.env.REF_API_KEY || process.env.PERPLEXITY_API_KEY);
}

// In serena-mcp.ts  
async healthCheck(): Promise<boolean> {
  // Serena doesn't require external services
  return true;
}
```

### 2. Prevent MCP Server Initialization

The base class might try to initialize MCP servers. Add guards:

```typescript
// In both adapters, override if needed
protected async initializeMCPServer(): Promise<void> {
  // Do nothing - we don't need MCP servers
  this.isInitialized = true;
}
```

### 3. Environment Variables for Production

```env
# .env.production
NODE_ENV=production
USE_MOCK_MCP=true  # Safety flag
REF_API_KEY=your-api-key  # Optional for Ref
```

## No Dockerfile Changes Needed! 

The current Dockerfile will work as-is because:
- No MCP server binaries needed
- No child processes spawned
- Everything runs in the main Node.js process

## Testing Cloud Compatibility

Run this test locally to verify cloud readiness:

```bash
# Simulate production environment
export NODE_ENV=production
export USE_MOCK_MCP=true

# Run the API
npm run start:api

# Test the tools endpoint
curl -X POST http://localhost:3000/api/analysis/tools \
  -H "Content-Type: application/json" \
  -d '{
    "tools": ["ref-mcp", "serena-mcp"],
    "context": {
      "agentRole": "security",
      "pr": {
        "files": [{
          "path": "test.js",
          "content": "const password = \"hardcoded\";",
          "changeType": "added"
        }]
      }
    }
  }'
```

## Future Considerations

When implementing real Perplexity API calls for Ref:

1. **Option A**: Direct HTTP calls from the adapter
   ```typescript
   const response = await fetch('https://api.perplexity.ai/search', {
     headers: { 'Authorization': `Bearer ${process.env.REF_API_KEY}` },
     body: JSON.stringify({ query: searchQuery })
   });
   ```

2. **Option B**: Use a queue for rate limiting
   ```typescript
   await this.searchQueue.add({ 
     query: searchQuery,
     context: context 
   });
   ```

## Summary

✅ **Current adapters are cloud-ready** - they don't spawn processes
✅ **No Dockerfile changes needed** - runs in main process  
✅ **Can deploy immediately** - just set environment variables

⚠️ **One small fix needed** - override the `healthCheck()` method to prevent MCP initialization

This is actually the best-case scenario for cloud deployment!