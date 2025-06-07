# MCP Hybrid System

PR-focused tool integration system for CodeQual agents. Provides intelligent tool selection and execution for enhanced code analysis.

## Overview

The MCP Hybrid system provides comprehensive tool coverage for all agent roles, with each role having at least 2 tools (primary and fallback):

### Tool Distribution by Role:

**Security** (3 tools):
- MCP-Scan - Security verification
- Semgrep MCP - Code security scanning  
- SonarQube - General security checks

**Code Quality** (3 tools):
- ESLint MCP - JavaScript/TypeScript linting
- SonarQube - Multi-language quality (30+ languages)
- Prettier - Code formatting

**Architecture** (3 tools):
- Dependency Cruiser - Dependency analysis
- Madge - Circular dependency detection
- Git MCP - File structure analysis

**Performance** (3 tools):
- Lighthouse - Web performance metrics
- SonarQube - Code complexity
- Bundlephobia - Bundle size analysis

**Educational** (4 tools):
- Context MCP - Vector DB & web knowledge retrieval
- Knowledge Graph MCP - Learning path identification
- MCP Memory - Progress tracking
- Web Search MCP - External resources

**Reporting** (4 tools):
- Chart.js MCP - Data visualization
- Mermaid MCP - Diagram generation
- Markdown PDF MCP - Report formatting
- Grafana - Dashboard integration

## Key Features

- **PR-Focused**: Designed specifically for analyzing pull requests, not full repositories
- **Role-Based Tool Selection**: Tools are mapped to agent roles, not specific models
- **Dynamic Model Compatibility**: Works seamlessly when RESEARCHER agent updates models
- **Isolated Execution**: Each tool runs in an isolated workspace with resource limits
- **Graceful Degradation**: Falls back to LLM-only analysis if tools fail

## Installation

```bash
# Install dependencies
npm install

# Install MCP tools
npm run install-tools

# Verify security
npm run verify-security

# Check health
npm run health-check
```

## Architecture

### Core Components

1. **Tool Registry** - Manages tool registration and discovery
2. **Tool Manager** - Handles server-side execution with isolation
3. **Context Selector** - Intelligent tool selection based on context
4. **Tool Adapters** - Integrate specific tools with the system

### Tool Execution Flow

```typescript
// 1. Agent requests tools for analysis
const tools = await toolSelector.selectTools(agentRole, context);

// 2. Execute tools with PR context
const results = await toolManager.executeTool(tool, context);

// 3. Enhance agent analysis with tool results
const enhancedAnalysis = agent.analyzeWithTools(context, results);
```

## Usage Example

```typescript
import { 
  toolRegistry,
  toolManager,
  toolSelector,
  mcpScanAdapter,
  mcpDocsServiceAdapter
} from '@codequal/mcp-hybrid';

// Register tools
toolRegistry.register(mcpScanAdapter);
toolRegistry.register(mcpDocsServiceAdapter);

// Initialize tool manager
await toolManager.initialize();

// Select tools for educational agent
const tools = await toolSelector.selectTools('educational', {
  agentRole: 'educational',
  pr: {
    prNumber: 123,
    files: [/* PR files */]
  },
  repository: {
    languages: ['typescript'],
    frameworks: ['react']
  }
});

// Execute selected tools
for (const tool of tools.primary) {
  const result = await toolManager.executeTool(tool, context);
  console.log(`Tool ${tool.id}: ${result.success ? 'Success' : 'Failed'}`);
}
```

## Tool-First Agent Pattern

Agents use tools FIRST to get concrete data, then analyze with that context:

```typescript
class ToolAwareAgent extends BaseAgent {
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    // 1. Get tools for this role
    const tools = await toolSelector.selectTools(this.role, context);
    
    // 2. Run tools to get concrete data
    const toolResults = await this.runTools(tools, context);
    
    // 3. Create enhanced prompt with tool results
    const prompt = this.buildPromptWithToolResults(context, toolResults);
    
    // 4. Agent analyzes WITH tool results as context
    return this.model.complete(prompt);
  }
}
```

## Security

- All tools are verified with MCP-Scan before execution
- Isolated workspaces prevent cross-contamination
- Resource limits prevent DoS attacks
- Temporary workspaces are cleaned up automatically

## Configuration

Tools can be configured via environment variables:

```bash
# Enable/disable specific tools
export ENABLE_ESLINT_MCP=true
export ENABLE_SONARQUBE=true

# External tool URLs
export SONARQUBE_URL=http://localhost:9000
```

## Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run type-check
```

## Adding New Tools

1. Create adapter in `src/adapters/mcp/` or `src/adapters/direct/`
2. Implement the `Tool` interface
3. Register in the tool registry
4. Update role mappings
5. Add to installation script

## Troubleshooting

### Tool Not Found
- Run `npm run health-check` to verify installation
- Check tool-specific requirements (Python for Git MCP, etc.)

### Security Verification Failed
- Ensure MCP-Scan is installed: `npm install -g mcp-scan`
- Run `npm run verify-security` to check all tools

### Performance Issues
- Check resource limits in `MCPToolManager`
- Monitor persistent tool processes
- Review timeout settings

## License

MIT
