# MCP Hybrid Implementation Plan

## Overview

This document outlines the detailed implementation plan for the MCP Hybrid system that addresses the challenges of integrating MCP tools with CodeQual's dynamic agent architecture.

## Key Challenges and Solutions

### 1. Dynamic Model Updates Challenge

**Challenge**: Agent models are dynamically updated by the RESEARCHER agent as new models emerge in the market. Tool integrations must continue working seamlessly when models change.

**Solution**: Role-Based Tool Mapping

```typescript
// Instead of mapping tools to specific models:
// ❌ BAD: { "openai/gpt-4": ["eslint", "semgrep"] }

// Map tools to agent roles:
// ✅ GOOD: 
interface RoleToolMapping {
  role: AgentRole;
  recommendedTools: {
    mcp: string[];
    direct: string[];
  };
  requiredCapabilities: string[];
}

const ROLE_TOOL_MAPPINGS: RoleToolMapping[] = [
  {
    role: 'security',
    recommendedTools: {
      mcp: ['semgrep', 'sonarqube'],
      direct: ['bandit', 'safety']
    },
    requiredCapabilities: ['vulnerability-scanning', 'dependency-checking']
  },
  {
    role: 'codeQuality',
    recommendedTools: {
      mcp: ['eslint', 'sonarqube'],
      direct: ['prettier', 'black']
    },
    requiredCapabilities: ['linting', 'formatting', 'code-smell-detection']
  }
];
```

### 2. Language-Specific Tool Configuration

**Challenge**: Some MCP servers only work with specific languages or frameworks. Tool selection must be context-aware.

**Solution**: Context-Aware Tool Selection System

```typescript
interface ToolContext {
  // From repository analysis
  primaryLanguage: string;
  languages: string[];
  frameworks: string[];
  fileExtensions: string[];
  
  // From Vector DB
  repositoryConfig: {
    preferredTools?: string[];
    excludedTools?: string[];
    customRules?: any;
  };
  
  // From user context
  userPermissions: string[];
  organizationSettings: {
    approvedTools?: string[];
    securityLevel: 'low' | 'medium' | 'high';
  };
}

class ContextAwareToolSelector {
  async selectTools(
    agentRole: AgentRole,
    context: ToolContext
  ): Promise<SelectedTools> {
    // 1. Get base tools for role
    const roleTools = this.getRoleTools(agentRole);
    
    // 2. Filter by language compatibility
    const languageCompatible = this.filterByLanguage(
      roleTools,
      context.languages
    );
    
    // 3. Apply repository preferences from Vector DB
    const withPreferences = this.applyRepositoryPreferences(
      languageCompatible,
      context.repositoryConfig
    );
    
    // 4. Check organization constraints
    const approved = this.checkOrganizationApproval(
      withPreferences,
      context.organizationSettings
    );
    
    // 5. Verify availability
    const available = await this.checkAvailability(approved);
    
    return {
      primary: available.mcp,
      fallback: available.direct,
      excludedReasons: this.getExclusionReasons()
    };
  }
}
```

### 3. Vector DB Integration

**Challenge**: Tool configurations and preferences need to be stored and retrieved from Vector DB alongside agent configurations.

**Solution**: Extended Vector DB Schema for Tools

```typescript
// Store tool configurations in special repository
const TOOL_CONFIG_REPOSITORY_ID = '00000000-0000-0000-0000-000000000004';

interface ToolConfiguration {
  tool_id: string;
  tool_type: 'mcp' | 'direct';
  metadata: {
    name: string;
    version: string;
    languages: string[];
    frameworks: string[];
    capabilities: string[];
    requirements: {
      authentication?: string;
      minRepoSize?: number;
      maxRepoSize?: number;
      requiredFiles?: string[];
    };
  };
  performance_metrics: {
    avg_execution_time: number;
    success_rate: number;
    last_used: Date;
  };
}

// Repository-specific tool preferences
interface RepositoryToolPreferences {
  repository_id: string;
  enabled_tools: string[];
  disabled_tools: string[];
  tool_configs: Record<string, any>;
  last_updated: Date;
}
```

### 4. Agent-Tool Communication

**Challenge**: Agents need to communicate with tools while maintaining model independence.

**Solution**: Tool Service Layer

```typescript
class ToolServiceLayer {
  constructor(
    private mcpHybrid: MCPHybridSystem,
    private vectorService: VectorContextService
  ) {}
  
  async enhanceAgentAnalysis(
    agentRole: AgentRole,
    agentAnalysis: any,
    context: RepositoryContext
  ): Promise<EnhancedAnalysis> {
    // 1. Determine which tools to use
    const selectedTools = await this.mcpHybrid.selectTools(
      agentRole,
      context
    );
    
    // 2. Run tools in parallel where possible
    const toolResults = await this.runTools(
      selectedTools,
      context
    );
    
    // 3. Merge tool results with agent analysis
    const enhanced = this.mergeResults(
      agentAnalysis,
      toolResults
    );
    
    // 4. Store performance metrics
    await this.updateToolMetrics(
      selectedTools,
      toolResults
    );
    
    return enhanced;
  }
}
```

## Implementation Architecture

### Directory Structure

```
/packages/mcp-hybrid/
├── src/
│   ├── core/
│   │   ├── interfaces.ts      # Core type definitions
│   │   ├── registry.ts        # Tool registry
│   │   └── executor.ts        # Tool executor
│   ├── context/
│   │   ├── matcher.ts         # Context matching logic
│   │   ├── analyzer.ts        # Repository analyzer
│   │   └── selector.ts        # Tool selector
│   ├── adapters/
│   │   ├── mcp/
│   │   │   ├── eslint.ts      # ESLint MCP adapter
│   │   │   ├── sonarqube.ts   # SonarQube MCP adapter
│   │   │   ├── semgrep.ts     # Semgrep MCP adapter
│   │   │   └── github.ts      # GitHub MCP adapter
│   │   └── direct/
│   │       ├── jest.ts        # Jest coverage adapter
│   │       ├── pytest.ts      # Pytest coverage adapter
│   │       └── profiler.ts    # Performance profiler adapters
│   ├── integration/
│   │   ├── vector-db.ts       # Vector DB integration
│   │   ├── multi-agent.ts     # Multi-agent integration
│   │   └── mcp-context.ts     # MCP context integration
│   └── index.ts               # Main exports
├── tests/
├── docs/
└── package.json
```

### Core Interfaces

```typescript
// Core tool interface that works with any agent model
interface Tool {
  id: string;
  type: 'mcp' | 'direct';
  capabilities: ToolCapability[];
  requirements: ToolRequirements;
  
  // Check if tool can analyze given context
  canAnalyze(context: AnalysisContext): boolean;
  
  // Execute analysis
  analyze(context: AnalysisContext): Promise<ToolResult>;
}

// Tool capability definition
interface ToolCapability {
  name: string;
  category: 'security' | 'quality' | 'performance' | 'architecture';
  languages?: string[];
  frameworks?: string[];
}

// Analysis context passed to tools
interface AnalysisContext {
  files: FileData[];
  repository: RepositoryMetadata;
  agentRole: AgentRole;
  userContext: UserContext;
  vectorDBConfig?: any;
}
```

## Integration Points

### 1. Multi-Agent Executor Integration

```typescript
// In EnhancedMultiAgentExecutor
class EnhancedMultiAgentExecutor {
  private mcpHybrid: MCPHybridSystem;
  
  async executeAgent(
    agent: Agent,
    context: ExecutionContext
  ): Promise<AgentResult> {
    // 1. Get base agent analysis
    const baseAnalysis = await agent.analyze(context);
    
    // 2. Enhance with tools if available
    if (this.options.enableTools) {
      const enhanced = await this.mcpHybrid.enhance(
        agent.role,
        baseAnalysis,
        context
      );
      return enhanced;
    }
    
    return baseAnalysis;
  }
}
```

### 2. RESEARCHER Agent Compatibility

```typescript
// Tool configurations remain stable during model updates
class ResearcherCompatibleToolSystem {
  // Tools are selected based on role, not model
  async getToolsForAgent(
    agentRole: AgentRole,
    modelConfig: ModelConfig // Can be any model
  ): Promise<Tool[]> {
    // Tool selection is independent of model
    return this.toolRegistry.getToolsForRole(agentRole);
  }
}
```

### 3. Vector DB Synchronization

```typescript
class ToolConfigSync {
  async syncWithVectorDB(): Promise<void> {
    // 1. Load tool configurations
    const configs = await this.vectorService.search(
      TOOL_CONFIG_REPOSITORY_ID,
      'tool_configuration'
    );
    
    // 2. Update local registry
    configs.forEach(config => {
      this.registry.updateToolConfig(
        config.tool_id,
        config.metadata
      );
    });
    
    // 3. Load repository preferences
    const preferences = await this.loadRepositoryPreferences();
    this.applyPreferences(preferences);
  }
}
```

## Testing Strategy

### 1. Unit Tests
- Tool adapter functionality
- Context matching logic
- Fallback mechanisms

### 2. Integration Tests
- Multi-language repository analysis
- Tool availability scenarios
- Vector DB synchronization

### 3. E2E Tests
- Complete analysis with tool enhancement
- Dynamic model updates with tool stability
- Performance benchmarks

## Performance Considerations

1. **Tool Execution Parallelization**
   - Run independent tools concurrently
   - Implement smart timeout management

2. **Result Caching**
   - Cache tool results for unchanged files
   - Implement cache invalidation strategy

3. **Resource Management**
   - Monitor tool resource usage
   - Implement circuit breakers for failing tools

## Migration Strategy

1. **Phase 1**: Implement core system with manual tool selection
2. **Phase 2**: Add automatic context-based selection
3. **Phase 3**: Full Vector DB integration
4. **Phase 4**: Advanced features (recommendations, custom tools)

## Success Metrics

1. **Tool Coverage**: % of analyses enhanced by tools
2. **Performance Impact**: Analysis time with/without tools
3. **Accuracy Improvement**: Quality metrics before/after tool integration
4. **Stability**: Tool success rate across model updates
5. **User Satisfaction**: Developer feedback on tool recommendations

## Next Steps

1. Review and approve implementation plan
2. Set up MCP tool development environment
3. Create base interfaces and types
4. Implement core registry and executor
5. Add first MCP adapter (ESLint)
6. Test with real repositories
