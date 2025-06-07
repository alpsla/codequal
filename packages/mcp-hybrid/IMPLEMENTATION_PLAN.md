# MCP Hybrid Implementation Plan

## Overview

This document outlines the detailed implementation plan for the MCP Hybrid system that addresses the challenges of integrating MCP tools with CodeQual's dynamic agent architecture.

## Core Tool Selection

Based on the requirement that each role must have at least 2 tools (primary and fallback), we've selected tools that properly support each agent role:

### Security Role (3 tools)
1. **MCP-Scan** - Security infrastructure and tool verification (PRIMARY)
2. **Semgrep MCP** - Advanced security scanning (PRIMARY)
3. **SonarQube** - General security and quality checks (FALLBACK)

### Code Quality Role (3 tools)
1. **ESLint MCP** - JavaScript/TypeScript linting (PRIMARY)
2. **SonarQube** - Multi-language quality monitoring (PRIMARY)
3. **Prettier Direct** - Code formatting checks (FALLBACK)

### Architecture Role (3 tools)
1. **Dependency Cruiser Direct** - Dependency analysis for PRs (PRIMARY)
2. **Madge Direct** - Circular dependency detection (PRIMARY)
3. **Git MCP Server** - File structure analysis (FALLBACK)

### Performance Role (3 tools)
1. **Lighthouse Direct** - Web performance metrics (PRIMARY)
2. **SonarQube** - Code complexity analysis (PRIMARY)
3. **Bundlephobia Direct** - Bundle size analysis (FALLBACK)

### Dependency Role (3 tools)
1. **NPM Audit Direct** - Security vulnerability scanning (PRIMARY)
2. **License Checker Direct** - License compliance (PRIMARY)
3. **Outdated Direct** - Version currency checks (FALLBACK)

### Educational Role (4 tools)
1. **Context MCP** - Retrieves educational context from Vector DB & web (PRIMARY)
2. **Knowledge Graph MCP** - Identifies learning paths and skill gaps (PRIMARY)
3. **MCP Memory** - Stores/retrieves learning progress (FALLBACK)
4. **Web Search MCP** - Finds external educational resources (FALLBACK)

### Reporting Role (4 tools)
1. **Chart.js MCP** - Generates charts and visualizations (PRIMARY)
2. **Mermaid MCP** - Creates diagrams and flowcharts (PRIMARY)
3. **Markdown PDF MCP** - Formats professional reports (FALLBACK)
4. **Grafana Direct** - Dashboard integration (FALLBACK)

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
      mcp: ['mcp-scan', 'semgrep', 'sonarqube'],
      direct: ['bandit', 'safety']
    },
    requiredCapabilities: ['vulnerability-scanning', 'dependency-checking']
  },
  {
    role: 'codeQuality',
    recommendedTools: {
      mcp: ['eslint', 'sonarqube', 'repomix'],
      direct: ['prettier', 'black']
    },
    requiredCapabilities: ['linting', 'formatting', 'code-smell-detection']
  },
  {
    role: 'architecture',
    recommendedTools: {
      mcp: ['repomix', 'git-mcp'],
      direct: ['dependency-cruiser']
    },
    requiredCapabilities: ['structure-analysis', 'dependency-mapping']
  },
  {
    role: 'performance',
    recommendedTools: {
      mcp: ['sonarqube'],
      direct: ['lighthouse', 'webpack-bundle-analyzer']
    },
    requiredCapabilities: ['performance-analysis', 'complexity-metrics']
  },
  {
    role: 'educational',
    recommendedTools: {
      mcp: ['mcp-docs-service', 'repomix', 'git-mcp'],
      direct: []
    },
    requiredCapabilities: ['documentation-analysis', 'learning-gap-detection']
  },
  {
    role: 'reporting',
    recommendedTools: {
      mcp: ['mcp-docs-service', 'sonarqube', 'git-mcp'],
      direct: []
    },
    requiredCapabilities: ['metrics-generation', 'visualization-data']
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

### 5. Server-Side Tool Execution

**Challenge**: Tools need to be accessible to all users without client-side installation, while maintaining security and isolation.

**Solution**: Hybrid Server-Side Architecture

```typescript
// Server-side tool management with user isolation
export class MCPToolManager {
  private persistentTools: Map<string, MCPServerProcess> = new Map();
  private onDemandTools: Set<string> = new Set(['mcp-scan', 'git-mcp', 'mcp-docs-service']);
  
  async initialize() {
    // Start persistent tools that benefit from warm state
    await this.initializePersistentTools();
    
    // Validate on-demand tools are available
    await this.validateOnDemandTools();
  }
  
  private async initializePersistentTools() {
    // SonarQube benefits from project caching
    if (process.env.ENABLE_SONARQUBE === 'true') {
      this.persistentTools.set('sonarqube', 
        await this.startSonarQubeServer()
      );
    }
    
    // ESLint can cache project configs
    this.persistentTools.set('eslint',
      await this.startESLintServer()
    );
  }
  
  async executeTool(
    toolId: string,
    userId: string,
    repository: Repository
  ): Promise<ToolResult> {
    // Create isolated execution environment
    const workspace = await this.createIsolatedWorkspace(userId, repository);
    
    try {
      if (this.persistentTools.has(toolId)) {
        return await this.executePersistentTool(
          toolId, workspace
        );
      } else {
        return await this.executeOnDemandTool(
          toolId, workspace
        );
      }
    } finally {
      await workspace.cleanup();
    }
  }
  
  private async createIsolatedWorkspace(
    userId: string,
    repository: Repository
  ): Promise<IsolatedWorkspace> {
    // Create temporary directory with user isolation
    const workspaceId = `${userId}-${Date.now()}`;
    const path = `/tmp/codequal-workspaces/${workspaceId}`;
    
    // Clone repository to isolated location
    await this.cloneRepository(repository, path);
    
    // Set resource limits
    return {
      path,
      limits: {
        cpu: '50%',
        memory: '1GB',
        timeout: 60000,
        diskSpace: '500MB'
      },
      cleanup: async () => fs.rm(path, { recursive: true })
    };
  }
}
```

**Execution Modes**:

1. **Persistent Tools**: Long-running processes that cache state
   - SonarQube (project analysis cache)
   - ESLint (configuration cache)
   - Semgrep (rule cache)

2. **On-Demand Tools**: Execute per request
   - MCP-Scan (security checks)
   - Git MCP (repository operations)
   - MCP Documentation Service (doc analysis)
   - Repomix (repository packaging)

```typescript
class ToolServiceLayer {
  constructor(
    private mcpToolManager: MCPToolManager,
    private vectorService: VectorContextService
  ) {}
  
  async getToolResultsForAgent(
    agentRole: AgentRole,
    context: RepositoryContext,
    userId: string
  ): Promise<ToolResults> {
    // 1. Determine which tools to use
    const selectedTools = await this.selectTools(
      agentRole,
      context
    );
    
    // 2. Run tools in parallel where possible
    const toolPromises = selectedTools.map(tool => 
      this.mcpToolManager.executeTool(
        tool.id,
        userId,
        context.repository
      ).catch(error => ({
        toolId: tool.id,
        success: false,
        error: error.message
      }))
    );
    
    const results = await Promise.all(toolPromises);
    
    // 3. Filter successful results
    const successfulResults = results.filter(r => r.success);
    
    // 4. Store performance metrics
    await this.updateToolMetrics(selectedTools, results);
    
    return {
      findings: this.consolidateFindings(successfulResults),
      toolsUsed: successfulResults.map(r => r.toolId),
      failedTools: results.filter(r => !r.success).map(r => r.toolId)
    };
  }
}
```

## Implementation Architecture

### Directory Structure

```
/packages/mcp-hybrid/
├── src/
│   ├── core/
│   │   ├── interfaces.ts         # Core type definitions
│   │   ├── tool-manager.ts       # Server-side tool management
│   │   ├── registry.ts           # Tool registry
│   │   └── executor.ts           # Tool executor
│   ├── server/
│   │   ├── workspace-manager.ts  # Isolated workspace creation
│   │   ├── persistent-tools.ts   # Long-running tool processes
│   │   └── security.ts           # Security and resource limits
│   ├── context/
│   │   ├── matcher.ts            # Context matching logic
│   │   ├── analyzer.ts           # Repository analyzer
│   │   └── selector.ts           # Tool selector
│   ├── adapters/
│   │   ├── mcp/
│   │   │   ├── mcp-scan.ts       # MCP-Scan security adapter
│   │   │   ├── eslint.ts         # ESLint MCP adapter
│   │   │   ├── sonarqube.ts      # SonarQube adapter
│   │   │   ├── repomix.ts        # Repomix MCP adapter
│   │   │   ├── semgrep.ts        # Semgrep MCP adapter
│   │   │   ├── git-mcp.ts        # Git MCP adapter
│   │   │   └── docs-service.ts   # Documentation service adapter
│   │   └── direct/
│   │       ├── sonarqube-cli.ts  # Direct SonarQube integration
│   │       ├── jest.ts           # Jest coverage adapter
│   │       └── pytest.ts         # Pytest coverage adapter
│   ├── integration/
│   │   ├── vector-db.ts          # Vector DB integration
│   │   ├── multi-agent.ts        # Multi-agent integration
│   │   └── tool-aware-agent.ts   # Tool-first agent implementation
│   ├── scripts/
│   │   ├── install-tools.sh      # Tool installation script
│   │   ├── verify-security.sh    # Security verification
│   │   └── health-check.sh       # Tool health checks
│   └── index.ts                  # Main exports
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

### 1. Multi-Agent Executor Integration (Tool-First Approach)

```typescript
// Tool-aware agent that uses tools during analysis
class ToolAwareAgent extends BaseAgent {
  constructor(
    private role: AgentRole,
    private model: ModelConfig,
    private toolService: ToolServiceLayer
  ) {
    super(model);
  }
  
  async analyze(context: AnalysisContext): Promise<AnalysisResult> {
    // 1. Get available tools for this context
    const tools = await this.toolService.selectTools(this.role, context);
    
    // 2. Run tools FIRST to get concrete data
    const toolResults = await this.toolService.getToolResultsForAgent(
      this.role,
      context,
      context.userId
    );
    
    // 3. Create enhanced prompt with tool results
    const prompt = this.buildPromptWithToolResults(context, toolResults);
    
    // 4. Agent analyzes WITH tool results as context
    const analysis = await this.model.complete(prompt);
    
    // 5. Return unified result
    return {
      ...analysis,
      toolsUsed: toolResults.toolsUsed,
      toolFindings: toolResults.findings,
      source: 'agent-with-tools'
    };
  }
}

// In EnhancedMultiAgentExecutor
class EnhancedMultiAgentExecutor {
  async executeAgent(
    agentConfig: AgentConfig,
    context: ExecutionContext
  ): Promise<AgentResult> {
    // Create tool-aware agent
    const agent = new ToolAwareAgent(
      agentConfig.role,
      agentConfig.model,
      this.toolService
    );
    
    // Agent handles tool integration internally
    return await agent.analyze(context);
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

## Tool Configuration Storage

```typescript
// Store in Vector DB special repository
const TOOL_CONFIGURATIONS = {
  'mcp-scan': {
    id: 'mcp-scan',
    name: 'MCP Security Scanner',
    type: 'mcp',
    executionMode: 'on-demand',
    command: 'npx mcp-scan@latest',
    timeout: 30000,
    capabilities: ['security-scanning', 'tool-verification'],
    languages: ['*'], // All languages
    priority: 1 // Run first for security
  },
  'eslint': {
    id: 'eslint',
    name: 'ESLint MCP',
    type: 'mcp',
    executionMode: 'persistent',
    command: 'npx @eslint/mcp@latest',
    serverPort: 3001,
    timeout: 30000,
    capabilities: ['linting', 'code-quality'],
    languages: ['javascript', 'typescript'],
    frameworks: ['react', 'vue', 'angular', 'node']
  },
  'sonarqube': {
    id: 'sonarqube',
    name: 'SonarQube Scanner',
    type: 'direct', // Can be MCP or direct
    executionMode: 'persistent',
    url: process.env.SONARQUBE_URL || 'http://localhost:9000',
    timeout: 120000,
    capabilities: ['code-quality', 'security', 'coverage'],
    languages: ['*'], // 30+ languages
    requiresAuth: true
  },
  'repomix': {
    id: 'repomix',
    name: 'Repomix MCP',
    type: 'mcp',
    executionMode: 'on-demand',
    command: 'npx @modelcontextprotocol/server-repomix',
    timeout: 60000,
    capabilities: ['repository-analysis', 'structure-mapping'],
    languages: ['*']
  },
  'semgrep': {
    id: 'semgrep',
    name: 'Semgrep MCP',
    type: 'mcp',
    executionMode: 'persistent',
    command: 'semgrep --config=auto',
    serverPort: 3002,
    timeout: 90000,
    capabilities: ['security-scanning', 'sast'],
    languages: ['*']
  },
  'git-mcp': {
    id: 'git-mcp',
    name: 'Git MCP Server',
    type: 'mcp',
    executionMode: 'on-demand',
    command: 'uvx mcp-server-git',
    timeout: 30000,
    capabilities: ['version-control', 'history-analysis'],
    languages: ['*']
  },
  'mcp-docs-service': {
    id: 'mcp-docs-service',
    name: 'Documentation Service',
    type: 'mcp',
    executionMode: 'on-demand',
    command: 'npm run mcp-docs-service',
    timeout: 45000,
    capabilities: ['documentation-analysis', 'quality-metrics'],
    languages: ['*'],
    fileTypes: ['.md', '.rst', '.txt']
  }
};
```

## Current Implementation Status (June 8, 2025)

### ✅ Completed Components (30% of total implementation)

#### Core Architecture (100% Complete)
- ✅ Complete package structure with TypeScript configuration
- ✅ Core interfaces designed for PR-focused analysis
- ✅ Tool registry with comprehensive role mappings
- ✅ MCPToolManager for server-side execution with isolation
- ✅ Context-aware tool selector with Vector DB support
- ✅ Parallel execution engine (ToolExecutor) with 3 strategies
- ✅ Tool-aware agent base class and integration
- ✅ Parallel agent executor for maximum performance

#### Tool Adapters Implemented (7/25 tools - 28%)
1. ✅ **MCP-Scan** - Security verification and tool validation
2. ✅ **Context MCP** - Educational knowledge retrieval from Vector DB & web
3. ✅ **Chart.js MCP** - PR visualization for reports
4. ✅ **Grafana Direct** - Dashboard integration with Supabase
5. ✅ **Prettier Direct** - Code formatting validation
6. ✅ **Dependency Cruiser Direct** - Architecture dependency analysis
7. ✅ **MCP Docs Service** - Documentation analysis (being replaced)

#### Infrastructure Components (100% Complete)
- ✅ Installation scripts for all tools
- ✅ Security verification script
- ✅ Health check script
- ✅ Package.json with all dependencies
- ✅ Comprehensive README documentation

### 🔄 In Progress / Next Priority

#### Critical Tools to Implement (Week 1)
1. 🔲 **ESLint MCP** - Most important for code quality role
2. 🔲 **Semgrep MCP** - Critical for security scanning
3. 🔲 **SonarQube** - Multi-role support (security, quality, performance)
4. 🔲 **Git MCP Server** - Version control integration

#### Supporting Tools (Week 2)
5. 🔲 **NPM Audit Direct** - Dependency security scanning
6. 🔲 **Lighthouse Direct** - Performance metrics
7. 🔲 **Knowledge Graph MCP** - Educational learning paths
8. 🔲 **Mermaid MCP** - Diagram generation for reports

#### Integration Tasks
- 🔲 Integration with EnhancedMultiAgentExecutor
- 🔲 Vector DB tool configuration storage
- 🔲 End-to-end testing with real PR data
- 🔲 Performance benchmarking

### 📊 Progress Metrics

```
Total Planned Tools: ~25
Tools Implemented: 7 (28%)
Core Architecture: 100%
Integration Ready: Yes
Parallel Execution: Implemented

Estimated Completion:
- Critical Tools: 50% by end of next week
- All Primary Tools: 80% by week 2
- Full Implementation: 100% by week 3
```

### 🎯 Key Achievements

1. **Parallel Execution Architecture**: All tools can run simultaneously with configurable strategies
2. **PR-Focused Design**: No dependency on full repository access
3. **Educational & Reporting Tools**: Proper tools for knowledge retrieval and visualization
4. **Grafana Integration**: Leverages existing Supabase infrastructure
5. **Security First**: MCP-Scan validates all tools before execution

### ⚠️ Important Changes from Original Plan

1. **Removed Repomix**: Requires full repository, not suitable for PR-only analysis
2. **Enhanced Educational Tools**: Context MCP and Knowledge Graph MCP instead of doc validator
3. **Dual Visualization**: Chart.js for PR comments + Grafana for dashboards
4. **All Roles Have 2+ Tools**: No single-tool roles anymore

## Implementation Timeline

### Week 1: Foundation and Security

**Day 1-2: Core Infrastructure**
- [ ] Create base interfaces and types
- [ ] Implement MCPToolManager class
- [ ] Set up isolated workspace creation
- [ ] Install and configure MCP-Scan for security

**Day 3-4: First Tool Integration**
- [ ] Implement ESLintMCPAdapter
- [ ] Create persistent tool management
- [ ] Test with TypeScript repository
- [ ] Add resource limiting and security

**Day 5: Multi-Language Support**
- [ ] Add SonarQube integration (direct or MCP)
- [ ] Test with multi-language repository
- [ ] Implement language detection logic

### Week 2: Complete Core Tools

**Day 6-7: Security and Analysis Tools**
- [ ] Add Semgrep MCP adapter
- [ ] Implement Repomix for repository analysis
- [ ] Create security-focused test suite

**Day 8-9: Documentation and Git Tools**
- [ ] Add Git MCP Server adapter
- [ ] Implement MCP Documentation Service
- [ ] Test with Educational and Reporting agents

**Day 10: Integration and Testing**
- [ ] Integrate with ToolAwareAgent pattern
- [ ] End-to-end testing with all agents
- [ ] Performance benchmarking

### Week 3: Production Readiness

**Day 11-12: Vector DB Integration**
- [ ] Store tool configurations in Vector DB
- [ ] Implement repository-specific preferences
- [ ] Add performance metrics tracking

**Day 13-14: Monitoring and Documentation**
- [ ] Add tool health monitoring
- [ ] Create comprehensive documentation
- [ ] Set up alerting for tool failures
- [ ] Create troubleshooting guides

## Migration Strategy

### Phase 1: Simple Implementation (Week 1)
- Manual tool configuration
- Basic role-based selection
- Server-side execution with isolation

### Phase 2: Smart Selection (Week 2)
- Context-aware tool selection
- Language and framework detection
- Tool result integration in agents

### Phase 3: Full Integration (Week 3)
- Vector DB configuration storage
- Repository preferences
- Performance optimization
- Production deployment

## Configuration Integration

All maintenance and tool configurations are now centralized in `@codequal/core/config`:

### Importing Configurations

```typescript
import {
  // Circuit breaker configs
  CircuitBreakerConfig,
  getToolCircuitConfig,
  CIRCUIT_BREAKER_PROFILES,
  
  // Recovery configs  
  GradualRecoveryConfig,
  getToolRecoveryConfig,
  RECOVERY_PROFILES,
  
  // Threshold profiles
  ThresholdProfile,
  getCurrentThresholdProfile,
  
  // Monitoring configs
  MonitoringConfig,
  MONITORING_PROFILES,
  
  // Tool registry
  MCP_TOOLS_REGISTRY,
  MCPToolDefinition,
  getToolsForRole,
  
  // Execution configs
  ExecutionConfig,
  getExecutionConfig,
  
  // Complete maintenance config
  getToolMaintenanceConfig
} from '@codequal/core/config';
```

### Usage Example

```typescript
// In circuit breaker implementation
class MCPCircuitBreaker {
  constructor(
    private toolManager: MCPToolManager,
    private environment: 'production' | 'development' = 'production'
  ) {
    // Get environment-specific thresholds
    const profile = getCurrentThresholdProfile();
    this.config = profile.circuitBreaker;
    this.recoveryConfig = profile.recovery;
  }
  
  // Get tool-specific overrides
  private getToolConfig(toolId: string): CircuitBreakerConfig {
    return getToolCircuitConfig(toolId, this.environment);
  }
}

// In tool manager
class MCPToolManager {
  private tools: Map<string, MCPToolInstance> = new Map();
  
  async initialize() {
    // Load all tools from registry
    for (const [toolId, definition] of Object.entries(MCP_TOOLS_REGISTRY)) {
      await this.registerTool(toolId, definition);
    }
  }
  
  // Get tools for specific agent
  getToolsForAgent(role: string): MCPToolDefinition[] {
    return getToolsForRole(role);
  }
}
```

## Security Considerations

### 1. Tool Verification
```typescript
class ToolSecurityManager {
  async verifyTool(toolId: string): Promise<SecurityStatus> {
    // 1. Run MCP-Scan on the tool first
    const scanResult = await this.runMCPScan(toolId);
    
    // 2. Check against known vulnerabilities
    const vulnCheck = await this.checkVulnerabilities(toolId);
    
    // 3. Verify digital signatures if available
    const signatureValid = await this.verifySignature(toolId);
    
    // 4. Check permissions required
    const permissions = await this.analyzePermissions(toolId);
    
    return {
      safe: scanResult.safe && vulnCheck.clean && signatureValid,
      risks: [...scanResult.risks, ...vulnCheck.risks],
      permissions
    };
  }
}
```

### 2. Execution Isolation
- Each tool execution in isolated Docker container
- Limited network access (only required endpoints)
- Read-only repository mount
- Temporary workspace cleanup after execution
- Resource limits enforced (CPU, memory, disk)

### 3. Authentication and Authorization
- Tool access tied to user permissions
- Repository-level tool allowlists
- Organization-level tool policies
- Audit logging of all tool executions

## Success Metrics

1. **Tool Coverage**: % of analyses enhanced by tools
2. **Performance Impact**: Analysis time with/without tools  
3. **Accuracy Improvement**: Quality metrics before/after tool integration
4. **Stability**: Tool success rate across model updates
5. **User Satisfaction**: Developer feedback on tool recommendations
6. **Security Incidents**: Zero tool-related security breaches
7. **Resource Efficiency**: Average CPU/memory per tool execution

## Risk Mitigation

1. **Tool Failure**: Graceful degradation to LLM-only analysis
2. **Performance Issues**: Circuit breakers and timeouts
3. **Security Threats**: MCP-Scan verification before any execution
4. **Resource Exhaustion**: Hard limits and monitoring
5. **Version Conflicts**: Isolated environments per execution

## Next Steps

### Immediate Actions (This Week)
1. ✅ Finalize implementation plan (DONE)
2. [ ] Create minimal directory structure
3. [ ] Write core interfaces (Tool, ToolManager, etc.)
4. [ ] Install MCP-Scan for security verification
5. [ ] Implement first adapter (ESLint MCP)
6. [ ] Create isolated workspace manager

### Week 1 Deliverables
- Working ESLint integration
- Security verification with MCP-Scan
- Basic server-side execution
- Test with sample TypeScript project

### Success Criteria for Phase 1
- ✅ ESLint successfully analyzes a TypeScript file
- ✅ Results integrated into agent prompt
- ✅ Execution isolated per user
- ✅ No security vulnerabilities detected
- ✅ Performance impact < 5 seconds
