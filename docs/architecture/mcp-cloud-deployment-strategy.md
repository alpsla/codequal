# MCP Tools Cloud Deployment Strategy

## Current Issues

The current MCP adapter implementation is designed for local development and will face challenges in cloud pod deployment:

1. **Process Spawning**: MCP adapters spawn local processes which doesn't align with container best practices
2. **Missing Binaries**: MCP server executables are not included in Docker images
3. **Communication**: Uses stdin/stdout instead of network protocols
4. **Resource Management**: Child processes complicate container resource limits

## Recommended Solutions

### Option 1: Containerized MCP Services (Recommended)

Deploy each MCP server as a separate microservice:

```yaml
# docker-compose.yml or kubernetes deployment
services:
  api:
    image: codequal/api:latest
    environment:
      - REF_MCP_URL=http://ref-mcp:3001
      - SERENA_MCP_URL=http://serena-mcp:3002
  
  ref-mcp:
    image: codequal/ref-mcp:latest
    environment:
      - REF_API_KEY=${REF_API_KEY}
    ports:
      - "3001:3001"
  
  serena-mcp:
    image: codequal/serena-mcp:latest
    ports:
      - "3002:3002"
```

**Benefits:**
- Clean separation of concerns
- Independent scaling
- Proper resource isolation
- Easy monitoring and logging
- Can use different languages/runtimes per MCP server

**Implementation Changes Needed:**

1. **Update Base MCP Adapter:**
```typescript
export abstract class BaseMCPAdapter {
  // Instead of spawning process
  protected async initializeMCPServer(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      // Use HTTP/WebSocket client
      this.mcpClient = new MCPHttpClient(this.getMCPServiceUrl());
    } else {
      // Keep existing spawn logic for local dev
      this.mcpProcess = spawn(this.mcpServerCommand, this.mcpServerArgs);
    }
  }
  
  protected abstract getMCPServiceUrl(): string;
}
```

2. **Update Individual Adapters:**
```typescript
export class RefMCPAdapter extends BaseMCPAdapter {
  protected getMCPServiceUrl(): string {
    return process.env.REF_MCP_URL || 'http://localhost:3001';
  }
}
```

### Option 2: Sidecar Pattern

Deploy MCP servers as sidecar containers:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: api
        image: codequal/api:latest
        volumeMounts:
        - name: shared-data
          mountPath: /tmp/mcp
      - name: ref-mcp
        image: codequal/ref-mcp:latest
        volumeMounts:
        - name: shared-data
          mountPath: /tmp/mcp
      volumes:
      - name: shared-data
        emptyDir: {}
```

**Benefits:**
- Maintains process locality
- Shared filesystem for communication
- Single pod deployment

**Drawbacks:**
- All containers scale together
- Resource limits apply to entire pod
- More complex debugging

### Option 3: Mock MCP in Production

For tools that don't require external APIs, implement in-process versions:

```typescript
export class SerenaMCPAdapter extends BaseMCPAdapter {
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    if (process.env.USE_MOCK_MCP === 'true') {
      // Direct implementation without MCP server
      return this.analyzeDirectly(context);
    } else {
      // Use MCP server
      return super.analyze(context);
    }
  }
  
  private async analyzeDirectly(context: AnalysisContext): Promise<ToolResult> {
    // Implement semantic analysis directly
    const findings = [];
    for (const file of context.pr.files) {
      findings.push(...this.analyzeFile(file));
    }
    return { success: true, findings };
  }
}
```

## Recommended Architecture for CodeQual

### Phase 1: Direct Implementation (Immediate)
1. Keep Ref and Serena as direct implementations (no MCP server needed)
2. They already have mock implementations that work without external processes
3. This allows immediate cloud deployment

### Phase 2: Service-Based MCP (Future)
1. Create HTTP-based MCP protocol adapter
2. Deploy critical MCP servers as microservices
3. Use environment variables for service discovery

### Required Dockerfile Updates

```dockerfile
# For Option 1 - No changes needed to main Dockerfile
# MCP servers get their own Dockerfiles

# For Option 3 - Add mock flag
ENV USE_MOCK_MCP=true

# For any option - ensure tools are available
RUN apk add --no-cache git
```

### Environment Configuration

```env
# Production environment
NODE_ENV=production
USE_MOCK_MCP=true  # For phase 1

# When using microservices (phase 2)
REF_MCP_URL=http://ref-mcp-service:3001
SERENA_MCP_URL=http://serena-mcp-service:3002
```

## Implementation Priority

1. **Immediate (for current sprint):**
   - Use mock/direct implementations for Ref and Serena
   - No MCP server spawning in production
   - This allows cloud deployment without changes

2. **Short-term (next sprint):**
   - Create HTTP client for MCP communication
   - Build Docker images for critical MCP servers
   - Update adapters to support both modes

3. **Long-term:**
   - Migrate all MCP tools to service architecture
   - Implement service mesh for inter-service communication
   - Add circuit breakers and retry logic

## Testing Strategy

```typescript
// Add to test files
describe('MCP Adapter Cloud Compatibility', () => {
  it('should work without spawning processes', async () => {
    process.env.USE_MOCK_MCP = 'true';
    const adapter = new SerenaMCPAdapter();
    const result = await adapter.analyze(mockContext);
    expect(result.success).toBe(true);
  });
  
  it('should use HTTP client in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SERENA_MCP_URL = 'http://mock-server';
    // Test HTTP communication
  });
});
```

## Conclusion

The current MCP implementation won't work in cloud pods without modification. The recommended approach is:

1. **Immediate**: Use the mock implementations already present in Ref and Serena adapters
2. **Future**: Migrate to microservice architecture for MCP servers
3. **Maintain**: Local development experience with process spawning

This ensures CodeQual can deploy to cloud immediately while planning for a more robust MCP architecture.