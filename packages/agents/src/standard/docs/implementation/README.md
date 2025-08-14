# Implementation Documentation

This directory contains detailed implementation guides and technical specifications for the Standard Framework.

## 📄 Documents

### General Implementation
- **[implementation-guide.md](./implementation-guide.md)** - General implementation guide with code examples and best practices

### Feature Implementations
- **[location-enhancement-implementation.md](./location-enhancement-implementation.md)** - How issue locations (line/column) are detected and enhanced in PRs
- **[mcp-tool-chain-guide.md](./mcp-tool-chain-guide.md)** - MCP (Model Context Protocol) tool integration and usage
- **[skill-calculation-guide.md](./skill-calculation-guide.md)** - Detailed algorithm for calculating developer skill scores

## 🎯 Implementation Priorities

### Current Gaps (from OPERATIONAL-PLAN)
1. **Educator.research() method** - Not implemented, returns mocks
2. **Monitoring integration** - Needs to move to Standard framework
3. **Real course discovery** - Replace mock courses with actual APIs

### Best Practices
- Use TypeScript interfaces for all contracts
- Implement proper error handling with specific error types
- Add comprehensive logging at INFO level
- Write tests for all new features
- Document all public APIs

## 🔧 Common Patterns

### Agent Implementation
```typescript
class MyAgent extends BaseAgent implements IMyAgent {
  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    // Implementation
  }
}
```

### Service Integration
```typescript
interface IMyService {
  initialize(config: ServiceConfig): Promise<void>;
  execute(params: ServiceParams): Promise<ServiceResult>;
  cleanup(): Promise<void>;
}
```

## 🔗 Related Documentation
- Architecture overview: [`../architecture/`](../architecture/)
- Testing guides: [`../testing/`](../testing/)
- API integration: [`../api/`](../api/)