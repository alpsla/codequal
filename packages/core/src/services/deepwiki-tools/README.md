# DeepWiki Tool Integration Implementation

## Overview

This implementation adds tool execution capabilities to the DeepWiki service, allowing specific analysis tools to run alongside DeepWiki analysis using the already-cloned repository.

## Architecture

### Tool Distribution

**Tools that run in DeepWiki (5 tools)**:
- `npm-audit` - Security vulnerability scanning
- `license-checker` - License compliance checking  
- `madge` - Circular dependency detection
- `dependency-cruiser` - Dependency rule validation
- `npm-outdated` - Version currency checking

**Tools that stay local for PR context (3 tools)**:
- `eslint` - Auto-fixable linting issues
- `bundlephobia` - Bundle size analysis (uses external API)
- `grafana` - Reporting integration

**Tools removed as redundant (2 tools)**:
- `prettier` - DeepWiki already covers formatting
- `sonarjs` - DeepWiki covers quality patterns

## Implementation Components

### 1. Tool Runner Service (`tool-runner.service.ts`)
Executes tools within the DeepWiki pod:
- Detects applicable tools based on repository type
- Runs tools in parallel with timeout management
- Handles errors gracefully with partial results

### 2. DeepWiki with Tools Service (`deepwiki-with-tools.service.ts`)
Extends the base DeepWiki service:
- Adds tool execution alongside analysis
- Manages tool configuration and results
- Integrates with existing Kubernetes execution

### 3. Tool Result Storage Service (`tool-result-storage.service.ts`)
Stores tool results in Vector DB:
- Formats tool output for vector storage
- Maps tools to appropriate agent roles
- Generates embeddings for searchability

### 4. Enhanced DeepWiki Manager (`enhanced-deepwiki-manager.ts`)
Orchestrates the complete analysis:
- Triggers DeepWiki + tool analysis
- Stores results in Vector DB
- Provides job tracking and status

## Data Flow

```
1. PR Submitted
   ↓
2. DeepWiki Manager checks Vector DB
   ↓
3. If not exists, trigger analysis:
   - DeepWiki clones repository
   - DeepWiki runs analysis
   - Tools run in parallel
   ↓
4. Store results in Vector DB:
   - DeepWiki analysis chunks
   - Tool results with agent mapping
   ↓
5. Orchestrator retrieves context:
   - Filters by agent role
   - Includes relevant tool results
```

## Vector DB Schema

Tool results are stored in the existing `analysis_chunks` table with specific metadata:

```typescript
{
  repository_id: string,
  source_type: 'tool',
  content: string, // Formatted tool output
  metadata: {
    content_type: 'tool_result',
    tool_name: string,
    tool_id: string,
    agent_role: string,
    severity_counts?: object,
    total_vulnerabilities?: number,
    // ... tool-specific metrics
  },
  storage_type: 'permanent'
}
```

## Agent Role Mapping

- **Security Agent**: npm-audit, license-checker
- **Architecture Agent**: madge, dependency-cruiser  
- **Dependency Agent**: npm-outdated, license-checker

## Usage Example

```typescript
// Enhanced DeepWiki Manager usage
const manager = new EnhancedDeepWikiManager(
  authenticatedUser,
  vectorStorageService,
  embeddingService
);

// Trigger analysis with tools
const jobId = await manager.triggerRepositoryAnalysisWithTools(
  'https://github.com/user/repo',
  {
    runTools: true,
    enabledTools: ['npm-audit', 'license-checker', 'madge'],
    prNumber: 123
  }
);

// Wait for completion
const results = await manager.waitForAnalysisCompletion('https://github.com/user/repo');
```

## Performance Benefits

- **Single Clone**: Repository cloned once by DeepWiki
- **Parallel Execution**: All tools run concurrently
- **Expected Improvement**: ~42% faster (165s → 95s)

## Error Handling

- Tool failures don't block DeepWiki analysis
- Partial results are stored even if some tools fail
- Each tool has independent timeout
- Graceful degradation for agents

## Next Steps

1. **Deploy to DeepWiki Pod**:
   - Add Node.js and npm to DeepWiki Docker image
   - Install required tool packages
   - Deploy tool runner service

2. **Update Orchestrator**:
   - Modify context retrieval to include tool results
   - Ensure proper filtering by agent role

3. **Testing**:
   - Integration tests with real repositories
   - Performance benchmarking
   - Error scenario validation

## Migration Path

1. Deploy Vector DB migration for indexes
2. Update DeepWiki Docker image with tools
3. Deploy enhanced DeepWiki manager
4. Update orchestrator to use new context
5. Monitor and optimize

## Monitoring

Key metrics to track:
- Tool execution success rate
- Average tool execution time
- Vector DB query performance
- Agent context retrieval time
