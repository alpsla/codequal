# Phase 2 Test Adjustments Needed

## Current Issues in Phase 2 Tests

### 1. ❌ Hardcoded Agent Configurations
**Current (Wrong):**
```typescript
const config: MultiAgentConfig = {
  agents: [
    { provider: 'claude', model: 'claude-3-opus', role: 'security' },
    { provider: 'openai', model: 'gpt-4', role: 'codeQuality' }
  ]
};
```

**Should Be:**
```typescript
// Orchestrator analyzes PR first
const requiredAgents = await orchestrator.determineRequiredAgents(prContext);
// Returns: ['security', 'architecture'] based on PR content

// Then pulls configurations dynamically
const agentConfigs = await orchestrator.getAgentConfigurations(
  requiredAgents,
  userContext,
  prComplexity
);
// Returns optimal models from Vector DB/OpenRouter
```

### 2. ❌ Missing MCP Tool Execution Phase
**Current (Wrong):**
- Tests jump directly to agent execution
- No tool results used as agent input

**Should Be:**
```typescript
// Step 1: Execute MCP tools FIRST
const toolResults = await mcpToolExecutor.runTools({
  selectedTools: ['eslint', 'semgrep', 'sonarqube'],
  context: { pr, deepwikiChunks }
});

// Step 2: Pass tool results to agents
const agentContext = {
  toolFindings: toolResults,  // Concrete findings
  prContext: pr,
  deepwikiContext: relevantChunks,
  vectorContext: historicalPatterns
};
```

### 3. ❌ Incorrect MCP Understanding
**Current (Wrong):**
- MCP seen as coordination between agents
- Cross-agent insight sharing during execution

**Should Be:**
- MCP tools run BEFORE agents
- Tools provide concrete findings
- Agents analyze tool results with context

## Required Test Updates

### 1. orchestrator-initialization.test.ts
Add tests for:
- Dynamic agent requirement detection
- Configuration pulling from Vector DB
- Model selection based on context

### 2. orchestrator-pr-analysis.test.ts  
Add tests for:
- Agent requirement determination
- Complexity-based model selection
- DeepWiki chunk selection per agent

### 3. orchestrator-agent-selection.test.ts
Rename to `orchestrator-tool-selection.test.ts` and test:
- Tool selection based on required agents
- MCP tool parameter preparation
- Tool execution ordering

### 4. orchestrator-deepwiki-config.test.ts
Expand to cover:
- Agent model configuration retrieval
- Context-based model selection
- Fallback model determination

### 5. New Test File Needed: orchestrator-mcp-tools.test.ts
```typescript
describe('MCP Tool Execution', () => {
  it('should execute tools before agent analysis', async () => {
    // Arrange
    const pr = createTestPR();
    const selectedAgents = ['security', 'codeQuality'];
    const tools = orchestrator.selectToolsForAgents(selectedAgents);
    
    // Act
    const toolResults = await mcpExecutor.executeTools(tools, pr);
    
    // Assert
    expect(toolResults.security).toHaveProperty('findings');
    expect(toolResults.security.findings).toBeInstanceOf(Array);
    expect(toolResults.executionTime).toBeLessThan(30000);
  });

  it('should prepare tool context from DeepWiki chunks', async () => {
    const deepwikiReport = getTestDeepWikiReport();
    const relevantChunks = orchestrator.selectRelevantChunks(
      deepwikiReport,
      ['security', 'performance']
    );
    
    expect(relevantChunks.security).toBeDefined();
    expect(relevantChunks.performance).toBeDefined();
  });
});
```

## Correct Flow to Test

```
1. PR Analysis
   └─> Required agents: [security, performance]

2. Configuration Retrieval  
   └─> security: claude-3-opus (high complexity)
   └─> performance: gpt-4-turbo (large codebase)

3. Tool Selection
   └─> security: [semgrep, sonarqube, mcp-scan]
   └─> performance: [lighthouse, bundlephobia]

4. MCP Tool Execution (FIRST)
   └─> Concrete findings from each tool

5. Agent Analysis (with tool results)
   └─> Security agent uses semgrep findings + context
   └─> Performance agent uses lighthouse metrics + context

6. Compilation
   └─> Orchestrator compiles all agent reports
   └─> Sends to Educational and Reporting agents
```

## Implementation Priority

### Phase 2.5 (Corrections):
1. Add dynamic agent selection logic
2. Implement configuration retrieval  
3. Add MCP tool execution tests
4. Update agent tests to use tool results

### Phase 3 (Agent Integration):
1. Test individual agents with tool results
2. Test agent fallback mechanisms
3. Test context enrichment
4. Test result compilation

### Phase 4 (Tool Integration):
1. Test individual MCP tools
2. Test tool parameter generation
3. Test tool result parsing
4. Test tool error handling

This aligns with the correct architecture where orchestration is truly dynamic and tools provide the concrete foundation for agent analysis.
