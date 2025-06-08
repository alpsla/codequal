# MCP Hybrid Integration Guide

This guide explains how to integrate MCP tools with the existing CodeQual orchestrator flow.

## Overview

The CodeQual orchestrator flow:
1. **Orchestrator Agent** receives PR URL and analyzes it
2. **Vector DB Check** for existing repository report
3. **DeepWiki Integration** generates repo report if missing
4. **Specialized Agents** receive contextualized inputs from repo report
5. **Educational & Reporting Agents** create final user-facing output

## Tool Mapping by Agent Role

### Orchestrator Agent Tools
- **Git MCP Server** - Fetches PR and repository data
- **Web Search MCP** - Finds related issues and documentation
- **Context MCP** - Retrieves organizational context from Vector DB

### Specialized Agent Tools

**Security Agent:**
- **MCP-Scan** - Security verification
- **Semgrep MCP** - Code security scanning
- **SonarQube** - General security checks

**Code Quality Agent:**
- **ESLint MCP** - JavaScript/TypeScript linting
- **SonarQube** - Multi-language quality analysis
- **Prettier Direct** - Code formatting checks

**Architecture Agent:**
- **Dependency Cruiser** - Dependency analysis
- **Madge** - Circular dependency detection
- **Git MCP** - Repository structure analysis

**Performance Agent:**
- **Lighthouse** - Web performance metrics
- **SonarQube** - Code complexity analysis
- **Bundlephobia** - Bundle size analysis

### Final Stage Agent Tools

**Educational Agent:**
- **Context MCP** - Knowledge retrieval from Vector DB
- **Knowledge Graph MCP** - Learning path identification
- **MCP Memory** - Progress tracking
- **Web Search MCP** - External educational resources

**Reporting Agent:**
- **Chart.js MCP** - Data visualizations
- **Mermaid MCP** - Architecture diagrams
- **Markdown PDF MCP** - Report formatting
- **Grafana Direct** - Dashboard integration

## Integration Steps

### 1. Initialize MCP Hybrid System

```typescript
import { MCPHybridIntegration, toolManager } from '@codequal/mcp-hybrid';

// Initialize on startup
await MCPHybridIntegration.initialize();
```

### 2. Enhance Multi-Agent Executor

```typescript
import { MultiAgentExecutor } from '@codequal/agents';
import { MultiAgentToolIntegration } from '@codequal/mcp-hybrid';

// Create tool integration
const toolIntegration = new MultiAgentToolIntegration({
  enableTools: true,
  toolTimeout: 30000,
  maxParallelToolsPerAgent: 3,
  skipToolsForRoles: ['orchestrator'] // Orchestrator has special handling
});

// Enhance executor
const executor = new MultiAgentExecutor(config, repoData, options);
toolIntegration.enhanceExecutor(executor);
```

### 3. Use Tool-Enhanced Orchestrator

```typescript
import { toolEnhancedOrchestrator } from '@codequal/mcp-hybrid';

// Main orchestration flow with tools
const finalReport = await toolEnhancedOrchestrator.orchestrateAnalysis(
  prUrl,
  userId
);
```

## Detailed Flow with Tools

### Step 1: Orchestrator Analysis
```typescript
// Orchestrator uses Git MCP to fetch PR data
const prData = await gitMCP.fetchPR(prUrl);

// Uses Context MCP to get organizational context
const orgContext = await contextMCP.getOrganizationalContext(userId);
```

### Step 2: Vector DB Integration
```typescript
// Check for existing repo report
const repoReport = await vectorDB.getRepoReport(repoUrl);

if (!repoReport) {
  // Generate via DeepWiki
  repoReport = await deepWiki.generateReport(repoUrl);
  await vectorDB.storeReport(repoUrl, repoReport);
}
```

### Step 3: Specialized Agent Execution
```typescript
// Each agent receives:
// 1. Specialized context from repo report
// 2. Tool results from their specific tools
// 3. PR data from orchestrator

const securityContext = {
  repoContext: repoReport.security,
  focusAreas: repoReport.agentContexts.security,
  prData: orchestratorAnalysis.prData
};

// Security tools run automatically
const securityAnalysis = await securityAgent.analyze(securityContext);
// Agent receives tool results in enhancedData.toolAnalysis
```

### Step 4: Educational Processing
```typescript
// Educational agent uses:
// - Context MCP to retrieve relevant knowledge
// - Knowledge Graph MCP to identify learning paths
// - Web Search MCP for external resources

const educationalOutput = await educationalAgent.analyze({
  specializedFindings: allAgentResults,
  repoSummary: repoReport.summary
});
```

### Step 5: Final Report Generation
```typescript
// Reporting agent uses:
// - Chart.js MCP for visualizations
// - Mermaid MCP for diagrams
// - Grafana Direct for dashboard updates

const finalReport = await reportingAgent.analyze({
  specializedResults: allAgentResults,
  educationalInsights: educationalOutput,
  visualizationRequirements: getVizRequirements(allAgentResults)
});
```

## Configuration

### Tool Configuration in Vector DB
Each repository can have tool preferences stored:

```typescript
{
  "repoUrl": "https://github.com/org/repo",
  "toolPreferences": {
    "enabledTools": ["eslint-mcp", "sonarqube"],
    "disabledTools": ["prettier-direct"],
    "toolConfigs": {
      "eslint-mcp": {
        "configFile": ".eslintrc.custom.js",
        "autoFix": false
      }
    }
  }
}
```

### Agent Context from Repo Report
```typescript
{
  "agentContexts": {
    "security": {
      "focus": "authentication",
      "priority": "high",
      "knownVulnerabilities": [],
      "securityPatterns": ["OAuth2", "JWT"]
    },
    "codeQuality": {
      "focus": "maintainability",
      "codeStandards": "airbnb",
      "testCoverage": 75
    }
  }
}
```

## Benefits

1. **Concrete Data**: Agents work with actual tool findings, not just code analysis
2. **Consistency**: All PRs analyzed with same tool suite
3. **Learning**: Educational agent can reference specific tool findings
4. **Visualization**: Reporting agent creates charts from real metrics
5. **Efficiency**: Tools run in parallel while agents prepare

## Example Output Structure

```typescript
{
  "executive_summary": "PR adds authentication feature with 3 security issues",
  "detailed_findings": {
    "security": {
      "toolFindings": 3,
      "criticalIssues": ["SQL injection risk in line 45"],
      "toolsUsed": ["mcp-scan", "semgrep-mcp"]
    },
    "codeQuality": {
      "toolFindings": 12,
      "autoFixable": 8,
      "toolsUsed": ["eslint-mcp", "sonarqube"]
    }
  },
  "educational_insights": {
    "keyLearnings": ["Proper input validation techniques"],
    "resources": ["OWASP SQL Injection Prevention"]
  },
  "visualizations": {
    "severityChart": "data:image/png;base64,...",
    "architectureDiagram": "```mermaid..."
  },
  "tool_summary": {
    "totalToolsUsed": 12,
    "totalFindings": 45,
    "executionTime": "15.3s"
  }
}
```

## Monitoring and Debugging

### Tool Execution Logs
```typescript
// Enable debug logging
const toolIntegration = new MultiAgentToolIntegration({
  enableTools: true,
  debug: true
});

// Access tool results after execution
const toolResults = executor.getToolResults();
console.log('Tools used by each agent:', toolResults);
```

### Performance Metrics
- Tool execution time per agent
- Parallel vs sequential performance
- Cache hit rates for repeated analyses
- Failed tool recovery statistics

## Best Practices

1. **Tool Selection**: Let Vector DB preferences override defaults
2. **Parallel Execution**: Run tools while agents initialize
3. **Fallback Handling**: Always have fallback tools for critical roles
4. **Result Caching**: Cache tool results for identical file contents
5. **Error Recovery**: Agents should handle missing tool data gracefully

## Future Enhancements

1. **Dynamic Tool Discovery**: Automatically find new MCP tools
2. **Custom Tool Creation**: Repository-specific tool configurations
3. **Tool Learning**: Track which tools provide most value per repository
4. **Cross-PR Analysis**: Use tools to find similar issues across PRs
