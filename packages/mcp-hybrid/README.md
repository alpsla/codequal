# MCP Hybrid Integration System

## Overview

The MCP Hybrid Integration System provides a unified interface for integrating both Model Context Protocol (MCP) tools and direct tool integrations into CodeQual's multi-agent architecture. This system is designed to work seamlessly with dynamically updated agent models and role-based configurations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Hybrid System                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌──────────────────┐               │
│  │  Tool Registry  │    │ Context Matcher  │               │
│  │                 │    │                  │               │
│  │ - MCP Tools     │◄───┤ - Language      │               │
│  │ - Direct Tools  │    │ - Framework     │               │
│  │ - Capabilities  │    │ - Repository    │               │
│  └─────────────────┘    │ - Agent Role    │               │
│           ▲             └──────────────────┘               │
│           │                      ▲                          │
│           │                      │                          │
│  ┌────────┴────────┐    ┌───────┴────────┐               │
│  │ Tool Executor   │    │  Vector DB     │               │
│  │                 │    │  Integration   │               │
│  │ - MCP Client    │    │                │               │
│  │ - Direct Runner │    │ - Agent Config │               │
│  │ - Fallback     │    │ - Tool Config  │               │
│  └─────────────────┘    └────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. **Dynamic Model Compatibility**
- Tools are associated with agent roles, not specific models
- When RESEARCHER updates model configurations, tool mappings remain intact
- Tool selection based on capabilities, not model names

### 2. **Context-Aware Tool Selection**
- Tools are matched based on:
  - Repository language and framework
  - Agent role (security, performance, etc.)
  - File types being analyzed
  - Repository size and complexity
  - User permissions and organization settings

### 3. **Language-Specific Tool Routing**
- ESLint MCP → Only for JavaScript/TypeScript files
- Semgrep MCP → Multi-language with language detection
- SonarQube MCP → 30+ languages with automatic routing
- Direct tools → Language-specific implementations

### 4. **Graceful Degradation**
- If MCP tool unavailable → Try direct tool
- If direct tool unavailable → Fallback to LLM analysis
- Always maintain analysis capability

## Core Components

### 1. Tool Registry (`/src/registry/`)
- Manages both MCP and direct tool configurations
- Stores tool capabilities and requirements
- Handles tool availability checking

### 2. Context Matcher (`/src/context/`)
- Matches tools to repository context
- Integrates with Vector DB for configurations
- Considers user permissions and settings

### 3. Tool Executor (`/src/executor/`)
- Unified interface for MCP and direct tools
- Handles authentication and configuration
- Manages timeouts and retries

### 4. Integration Adapters (`/src/adapters/`)
- MCP tool adapters for each integrated server
- Direct tool adapters for gap-filling tools
- Common interface for all tool types

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
1. **Tool Registry Implementation**
   - Define interfaces for tool capabilities
   - Create registry with dynamic loading
   - Implement availability checking

2. **Context Matching System**
   - Create context analyzer for repositories
   - Integrate with Vector DB configurations
   - Build matching algorithm

3. **Base Executor Framework**
   - Unified tool execution interface
   - Error handling and fallback logic
   - Metrics and logging

### Phase 2: MCP Tool Integration (Week 2)
1. **ESLint MCP Adapter**
   - JavaScript/TypeScript specific
   - Integrate with code quality agent role

2. **SonarQube MCP Adapter**
   - Multi-language support
   - Enterprise configuration options

3. **Semgrep MCP Adapter**
   - Security-focused integration
   - Custom rule support

4. **GitHub MCP Adapter**
   - Repository context provider
   - PR and issue integration

### Phase 3: Direct Tool Integration (Week 3)
1. **Test Coverage Tools**
   - Jest, pytest-cov, go test adapters
   - Language-specific routing

2. **Performance Profiling**
   - Node.js, Python, Go profilers
   - Resource usage analysis

3. **Documentation Generation**
   - JSDoc, Sphinx, Doxygen adapters
   - Markdown generation

### Phase 4: Advanced Features (Post-MVP)
1. **Tool Recommendation Engine**
   - Suggest best tools for repository
   - Cost/benefit analysis

2. **Custom MCP Server Development**
   - Fill critical gaps with custom servers
   - Open-source contributions

3. **Tool Performance Optimization**
   - Caching and result reuse
   - Parallel tool execution

## Configuration Schema

```typescript
interface MCPHybridConfig {
  // Tool definitions
  tools: {
    mcp: MCPToolConfig[];
    direct: DirectToolConfig[];
  };
  
  // Context matching rules
  contextRules: {
    language: LanguageToolMapping[];
    framework: FrameworkToolMapping[];
    agentRole: RoleToolMapping[];
  };
  
  // Execution settings
  execution: {
    timeout: number;
    maxRetries: number;
    fallbackStrategy: 'direct' | 'llm' | 'skip';
  };
  
  // Integration with Vector DB
  vectorDB: {
    configRepositoryId: string;
    syncInterval: number;
  };
}
```

## Usage Example

```typescript
// Initialize MCP Hybrid System
const mcpHybrid = new MCPHybridSystem({
  authenticatedUser,
  vectorService,
  logger
});

// Analyze with automatic tool selection
const result = await mcpHybrid.analyze({
  agentRole: 'security',
  repository: {
    language: 'typescript',
    framework: 'express',
    files: changedFiles
  },
  context: repositoryContext
});

// Result includes tool-enhanced analysis
console.log(result.toolsUsed); // ['semgrep-mcp', 'eslint-mcp']
console.log(result.insights); // Combined insights from tools + LLM
```

## Integration with Existing Systems

### 1. **Multi-Agent Executor**
- MCP Hybrid becomes a service available to all agents
- Agents request tool analysis through unified interface
- Results integrated into agent responses

### 2. **RESEARCHER Agent**
- Tool configurations stored separately from model configs
- Tools mapped to roles, not specific models
- Automatic compatibility when models update

### 3. **Vector DB**
- Tool configurations stored with metadata
- Repository-specific tool preferences
- Historical tool performance data

## Challenges and Solutions

### Challenge 1: Dynamic Model Updates
**Solution**: Decouple tools from models by mapping to agent roles instead. When RESEARCHER updates models, tools continue working with new models.

### Challenge 2: Language-Specific Tools
**Solution**: Implement smart routing based on file extensions, repository metadata, and Vector DB configurations.

### Challenge 3: Tool Availability
**Solution**: Runtime availability checking with graceful degradation chain: MCP → Direct → LLM.

### Challenge 4: Configuration Complexity
**Solution**: Hierarchical configuration with defaults, repository overrides, and user preferences.

### Challenge 5: Performance Impact
**Solution**: Parallel tool execution where possible, result caching, and smart tool selection to avoid redundant analysis.

## Next Steps

1. Review and approve architecture design
2. Set up development environment for MCP tools
3. Create base interfaces and types
4. Begin Phase 1 implementation
5. Prepare test repositories for validation

## Resources

- [MCP Specification](https://spec.modelcontextprotocol.io)
- [MCP Tools Research Document](/docs/research/MCP%20RESEARCH.md)
- [Integration Architecture](/docs/architecture/mcp-integration-architecture.md)
- [Direct Tool Integration Guide](/docs/guides/mcp-direct-tool-integration-guide.md)
