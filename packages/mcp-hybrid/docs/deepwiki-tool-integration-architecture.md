# DeepWiki Tool Integration Architecture

**Date**: June 13, 2025  
**Status**: Design Complete, Ready for Implementation

## Overview

Based on testing of the new Direct adapters (NPM Audit, License Checker, Madge), we've validated the architecture for integrating MCP tools with DeepWiki's existing repository analysis infrastructure.

## Current State vs. Target State

### Current State (Inefficient)
```
PR Submitted → Orchestrator → Check Vector DB
                ↓
                → DeepWiki clones repo → Analyzes → Stores in Vector DB
                ↓
                → Direct tools clone repo again → Run analysis → Return to agents
                
Total time: ~165s (two clones, sequential execution)
```

### Target State (Optimized)
```
PR Submitted → Orchestrator → Check Vector DB
                ↓
                → DeepWiki Service:
                   - Clones repo once
                   - Runs DeepWiki analysis
                   - Runs tools in parallel
                   - Stores all results in Vector DB
                ↓
                → Orchestrator retrieves filtered results for each agent

Total time: ~95s (one clone, parallel execution)
```

## Validated Tool Distribution

### Tools to Remove (Redundant)
1. **Prettier Direct** - DeepWiki already analyzes code formatting
2. **SonarJS Direct** - DeepWiki covers most code quality patterns

### Tools for Legacy PR Flow (3 tools)
These work well with PR-only context and should remain separate:

1. **ESLint Direct** - Provides auto-fixable issues for PR files
2. **Bundlephobia Direct** - Uses external API, doesn't need repo
3. **Grafana Direct** - Reporting tool, different purpose

### Tools for DeepWiki Integration (5 tools)
These need full repository access and fill gaps in DeepWiki analysis:

1. **NPM Audit** - Security vulnerability scanning (critical gap)
2. **License Checker** - License compliance (critical gap)
3. **Madge** - Circular dependency detection (architecture gap)
4. **Dependency Cruiser** - Detailed dependency rules
5. **NPM Outdated** - Version currency checking

## Implementation Architecture

### 1. DeepWiki Service Enhancement

```typescript
// packages/deepwiki/src/services/tool-runner.ts
export class ToolRunner {
  private tools = {
    'npm-audit': new NpmAuditExecutor(),
    'license-checker': new LicenseCheckerExecutor(),
    'madge': new MadgeExecutor(),
    'dependency-cruiser': new DependencyCruiserExecutor(),
    'npm-outdated': new NpmOutdatedExecutor()
  };

  async runTools(repoPath: string, enabledTools: string[]): Promise<ToolResults> {
    // Run tools in parallel
    const results = await Promise.allSettled(
      enabledTools.map(toolId => 
        this.tools[toolId].execute(repoPath)
      )
    );
    
    return this.consolidateResults(results);
  }
}
```

### 2. Vector DB Schema for Tool Results

```sql
-- Tool results storage (similar to analysis_chunks)
CREATE TABLE tool_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID REFERENCES repositories(id),
  tool_id TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  content JSONB NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient retrieval
CREATE INDEX idx_tool_results_repo_agent 
  ON tool_results(repository_id, agent_role);
```

### 3. Tool Result Storage Pattern

```typescript
// Store tool results with agent context
const toolResult = {
  tool_id: 'npm-audit',
  findings: [...],
  metrics: {...},
  metadata: {
    executionTime: 1234,
    vulnerabilityCount: 5,
    securityScore: 7.5
  }
};

// Store for relevant agents
const agentMappings = {
  'npm-audit': ['security'],
  'license-checker': ['security', 'dependency'],
  'madge': ['architecture'],
  'dependency-cruiser': ['architecture'],
  'npm-outdated': ['dependency']
};

// Store in Vector DB with proper agent context
for (const agentRole of agentMappings[toolId]) {
  await vectorDB.storeToolResult({
    repository_id: repoId,
    tool_id: toolId,
    agent_role: agentRole,
    content: toolResult,
    metadata: {
      pr_number: prNumber,
      execution_date: new Date()
    }
  });
}
```

### 4. Orchestrator Retrieval Pattern

```typescript
// Orchestrator retrieves tool results for each agent
async function getAgentContext(repoId: string, agentRole: string) {
  // Get DeepWiki analysis
  const deepwikiResults = await vectorDB.getAnalysisChunks({
    repository_id: repoId,
    metadata: { analysis_type: agentRole }
  });
  
  // Get tool results for this agent
  const toolResults = await vectorDB.getToolResults({
    repository_id: repoId,
    agent_role: agentRole
  });
  
  return {
    deepwiki: deepwikiResults,
    tools: toolResults
  };
}
```

## Tool Execution Details

### NPM Audit Integration
```bash
# In DeepWiki pod after repo clone
cd /repo
npm audit --json > /tmp/npm-audit-results.json
```

**Key Findings Storage**:
- Vulnerability counts by severity
- Security score (0-10)
- Fix recommendations
- Affected packages list

### License Checker Integration
```bash
# In DeepWiki pod
cd /repo
npx license-checker --json > /tmp/license-results.json
```

**Key Findings Storage**:
- License distribution
- GPL/AGPL warnings
- Unknown licenses
- Compliance score

### Madge Integration
```bash
# In DeepWiki pod
cd /repo
npx madge --circular --json src > /tmp/madge-results.json
```

**Key Findings Storage**:
- Circular dependency chains
- Module count
- Architecture score
- Dependency depth metrics

## Performance Optimizations

1. **Parallel Execution**: All tools run concurrently
2. **Shared Repository**: Single clone for all analysis
3. **Selective Execution**: Only run tools needed by agents in PR
4. **Result Caching**: Store results for reuse across similar PRs
5. **Timeout Management**: Each tool has independent timeout

## Error Handling

1. **Tool Failures**: Don't block DeepWiki analysis
2. **Partial Results**: Store successful tool results even if others fail
3. **Timeout Handling**: Kill long-running tools, proceed with others
4. **Graceful Degradation**: Agents work without tool results (lower confidence)

## Deployment Steps

1. **Update DeepWiki Docker Image**:
   - Add tool executables (npm, npx)
   - Add ToolRunner service
   - Update API to trigger tools

2. **Update Vector DB**:
   - Run migration for tool_results table
   - Add indexes for performance

3. **Update Orchestrator**:
   - Modify context retrieval to include tools
   - Add tool result filtering by agent

4. **Configure Tool Mappings**:
   - Set agent → tool relationships
   - Configure tool timeouts
   - Set execution priorities

## Success Metrics

- **Performance**: 40%+ reduction in analysis time
- **Coverage**: 100% of security/architecture gaps filled
- **Reliability**: 95%+ tool execution success rate
- **Quality**: Higher confidence scores from agents

## Risk Mitigation

1. **Tool Version Conflicts**: Use npx for consistent versions
2. **Resource Limits**: Set CPU/memory limits per tool
3. **Security**: Run tools in sandboxed environment
4. **Compatibility**: Test with various repo structures

## Conclusion

This architecture leverages DeepWiki's existing infrastructure while adding specialized tool analysis. The design is validated through testing and ready for implementation. Expected benefits include faster analysis, better coverage, and reduced resource usage.
