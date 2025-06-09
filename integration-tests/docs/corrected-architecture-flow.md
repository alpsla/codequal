# CodeQual Architecture: Dynamic Agent & Tool Orchestration

## Correct Flow Overview

```
PR URL → Orchestrator → Context Analysis → Dynamic Agent Selection → MCP Tools First → Agent Analysis → Compilation
          ↓                ↓                    ↓                      ↓                ↓               ↓
      Analyze PR      Vector DB Query    Pull Configs from      Execute Tools    Use Tool Results   Educator &
      Complexity      Repository History  OpenRouter/Config     Get Concrete     + Context for      Reporter
                      User Permissions                           Findings         Final Analysis
```

## 1. Dynamic Agent Creation (Not Just DeepWiki)

### Current State (Incorrect in Tests)
```typescript
// WRONG: Hardcoded agents
const config: MultiAgentConfig = {
  agents: [
    { provider: 'claude', model: 'claude-3-opus', role: 'security' },
    { provider: 'openai', model: 'gpt-4', role: 'codeQuality' }
  ]
};
```

### Target Implementation (Correct)
```typescript
// RIGHT: Dynamic agent selection based on context
class EnhancedOrchestrator {
  async analyzeContext(pr: RepositoryData): Promise<RequiredAgents> {
    const context = {
      language: this.detectLanguage(pr),
      securityCritical: this.hasSecurityFiles(pr),
      performanceCritical: this.hasPerformanceImpact(pr),
      size: this.calculatePRSize(pr),
      patterns: await this.getHistoricalPatterns()
    };
    
    // Dynamically determine which agents are needed
    return this.selectRequiredAgents(context);
  }

  async createAgentsFromConfig(
    requiredAgents: RequiredAgents,
    userContext: AuthenticatedUser
  ): Promise<Agent[]> {
    const agents = [];
    
    for (const agentRole of requiredAgents) {
      // Pull optimal model from OpenRouter/config based on context
      const modelConfig = await this.getOptimalModel(agentRole, userContext);
      
      agents.push({
        provider: modelConfig.provider,
        model: modelConfig.model,
        role: agentRole,
        tokenBudget: modelConfig.tokenBudget,
        temperature: modelConfig.temperature
      });
    }
    
    return agents;
  }
}
```

## 2. MCP Tools Execute FIRST (Before Agent Analysis)

### Incorrect Understanding
```
Agents analyze → MCP coordinates results ❌
```

### Correct Flow
```
MCP Tools Execute → Concrete Findings → Agents Analyze with Context → Final Reports ✅
```

### Implementation
```typescript
class MCPToolOrchestrator {
  async executePRAnalysis(
    pr: RepositoryData,
    deepwikiContext: DeepWikiReport,
    selectedAgents: Agent[]
  ): Promise<AnalysisResult> {
    // 1. MCP TOOLS RUN FIRST
    const toolResults = await this.executeMCPTools({
      context: {
        pr: pr,
        deepwikiChunks: this.extractRelevantChunks(deepwikiContext, pr),
        userPermissions: this.getUserContext()
      },
      tools: this.selectToolsForAgents(selectedAgents)
    });

    // 2. AGENTS USE TOOL RESULTS + CONTEXT
    const agentAnalyses = await this.executeAgents(
      selectedAgents,
      {
        prContext: pr,
        deepwikiContext: deepwikiContext,
        toolFindings: toolResults, // Concrete findings from tools
        crossRepoPatterns: await this.getCrossRepoPatterns()
      }
    );

    // 3. ORCHESTRATOR COMPILES
    return this.compileResults(agentAnalyses);
  }
}
```

## 3. MCP Tool Integration Details

### Tool Execution Flow
```typescript
interface MCPToolExecution {
  // Input parameters for tools
  context: {
    pr: RepositoryData;
    deepwikiChunks: DeepWikiChunk[]; // Relevant sections
    userPermissions: UserContext;
  };
  
  // Tools selected based on agents
  tools: {
    security: ['semgrep', 'sonarqube', 'mcp-scan'],
    codeQuality: ['eslint', 'prettier', 'sonarqube'],
    performance: ['lighthouse', 'bundlephobia'],
    architecture: ['dependency-cruiser', 'madge'],
    dependencies: ['npm-audit', 'license-checker']
  };
}

// Tool results become agent input
interface ToolResults {
  findings: {
    security: SecurityFinding[];
    codeQuality: QualityIssue[];
    performance: PerformanceMetric[];
    architecture: ArchitecturePattern[];
    dependencies: DependencyIssue[];
  };
  metrics: {
    totalIssues: number;
    criticalCount: number;
    coverage: number;
  };
}
```

### Agent Analysis with Tool Results
```typescript
class SecurityAgent {
  async analyze(context: AgentContext): Promise<SecurityAnalysis> {
    const { toolFindings, prContext, deepwikiContext } = context;
    
    // Agent uses CONCRETE tool findings as foundation
    const baseFindings = toolFindings.security;
    
    // Agent adds intelligence and context
    const enrichedAnalysis = await this.enrichWithContext({
      findings: baseFindings,
      historicalPatterns: deepwikiContext.securityHistory,
      crossRepoInsights: context.crossRepoPatterns,
      prSpecificContext: this.analyzePRSecurity(prContext)
    });
    
    return {
      findings: enrichedAnalysis,
      recommendations: this.generateRecommendations(enrichedAnalysis),
      educationalContent: this.createLearningMaterials(enrichedAnalysis)
    };
  }
}
```

## 4. Complete Corrected Flow

### Step 1: Orchestrator Initialization
```typescript
const orchestrator = new EnhancedOrchestrator();

// Analyze PR to determine what's needed
const prAnalysis = await orchestrator.analyzeContext(pr);
// Returns: { needsSecurity: true, needsPerformance: true, ... }
```

### Step 2: Dynamic Agent Creation
```typescript
// Pull configurations from Vector DB / OpenRouter
const agentConfigs = await orchestrator.getAgentConfigs(prAnalysis, userContext);

// Create only needed agents with optimal models
const agents = await orchestrator.createAgents(agentConfigs);
// Creates: SecurityAgent(claude-3-opus), PerformanceAgent(gpt-4), etc.
```

### Step 3: MCP Tool Execution (FIRST)
```typescript
// Select and run tools based on agents
const toolResults = await mcpOrchestrator.executeTools({
  agents: agents,
  context: { pr, deepwiki, user }
});
// Returns: Concrete findings from ESLint, Semgrep, etc.
```

### Step 4: Agent Analysis (Using Tool Results)
```typescript
// Agents analyze using tool results + context
const agentResults = await Promise.all(
  agents.map(agent => agent.analyze({
    toolFindings: toolResults[agent.role],
    prContext: pr,
    deepwikiContext: deepwiki,
    vectorContext: await getVectorContext(agent.role)
  }))
);
```

### Step 5: Compilation and Final Steps
```typescript
// Orchestrator compiles all results
const compiled = await orchestrator.compile(agentResults);

// Pass to final agents
const education = await educationalAgent.create(compiled);
const report = await reportingAgent.generate(compiled, education);
```

## 5. Key Corrections from Phase 2 Tests

### What Needs to Change:
1. **Dynamic Agent Selection**: Based on PR context, not hardcoded
2. **Model Selection**: Pull from OpenRouter/config based on context
3. **MCP Tools First**: Tools execute before agents, not after
4. **Tool Results as Input**: Agents use concrete tool findings
5. **Context Integration**: DeepWiki chunks selected per agent needs

### Correct Test Structure:
```typescript
describe('Orchestrator Dynamic Agent Creation', () => {
  it('should create agents based on PR context', async () => {
    const pr = createSecurityFocusedPR();
    const analysis = await orchestrator.analyzeContext(pr);
    
    expect(analysis.requiredAgents).toContain('security');
    expect(analysis.requiredAgents).toContain('architecture');
    
    const agents = await orchestrator.createAgents(analysis);
    
    // Models should be pulled from config, not hardcoded
    expect(agents[0].model).toBe('claude-3-opus'); // Best for security
  });
});

describe('MCP Tool Execution', () => {
  it('should execute tools before agent analysis', async () => {
    const toolResults = await mcpOrchestrator.executeTools(context);
    
    expect(toolResults.security.findings).toHaveLength(5);
    expect(toolResults.timestamp).toBeLessThan(agentExecutionTime);
  });
});
```

## 6. Configuration Storage Structure

```typescript
// Vector DB: Model configurations per context
{
  repository_id: 'agent-model-configs',
  content: {
    security: {
      high_severity: { provider: 'claude', model: 'claude-3-opus' },
      medium_severity: { provider: 'openai', model: 'gpt-4' },
      low_severity: { provider: 'openai', model: 'gpt-3.5-turbo' }
    },
    performance: {
      large_codebase: { provider: 'deepseek', model: 'deepseek-coder' },
      small_codebase: { provider: 'openai', model: 'gpt-4-turbo' }
    },
    architecture: {
      complex: { provider: 'claude', model: 'claude-3-opus' },
      simple: { provider: 'gemini', model: 'gemini-pro' }
    }
  }
}
```

This reflects the actual intended architecture where both DeepWiki AND agents are dynamically selected, and MCP tools provide concrete findings that agents then analyze with context.
