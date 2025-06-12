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
- ESLint MCP - JavaScript/TypeScript linting (✅ Implemented)
- SonarQube - Multi-language quality (30+ languages)
- Prettier - Code formatting (✅ Implemented)

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

## Implemented Tools

### ESLint MCP Adapter

The ESLint MCP adapter provides comprehensive JavaScript/TypeScript linting for the Code Quality role.

**Features:**
- Automatic framework detection (React, Vue, Angular)
- TypeScript support with @typescript-eslint
- Auto-fix suggestions for common issues
- Custom ESLint configuration support
- Detailed metrics (errors, warnings, fixable issues)

**Usage:**
```typescript
import { eslintMCPAdapter } from '@codequal/mcp-hybrid';

// Check if ESLint can analyze the PR
if (eslintMCPAdapter.canAnalyze(context)) {
  const result = await eslintMCPAdapter.analyze(context);
  console.log(`Found ${result.findings.length} issues`);
  console.log(`Auto-fixable: ${result.metrics.fixableIssues}`);
}
```

**Supported File Types:**
- `.js`, `.jsx` - JavaScript
- `.ts`, `.tsx` - TypeScript
- `.mjs`, `.cjs` - ES/CommonJS modules

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

## Tool Implementation Status

### MCP Tools (Model Context Protocol)

| Tool | Role | Purpose | Status | Tests | Notes |
|------|------|---------|--------|-------|-------|
| **ESLint MCP** | Code Quality | JavaScript/TypeScript linting | ✅ Implemented | ✅ 20/20 passing | Primary code quality tool |
| **Chart.js MCP** | Reporting | Data visualization | ✅ Implemented | ✅ 15/15 passing | PR metrics charts |
| **Context MCP** | Educational | Vector DB & web knowledge | ✅ Implemented | ✅ 14/14 passing | RAG integration |
| **MCP-Scan** | Security | Security scanning & tool verification | ✅ Implemented | ✅ 13/13 passing | Verifies all tools |
| **Docs Service MCP** | Educational/Reporting | Documentation analysis | ✅ Implemented | ✅ 11/11 passing | Quality metrics |
| **Semgrep MCP** | Security | Code security patterns | ❌ Not Started | - | SAST analysis |
| **SonarQube MCP** | Multiple | Multi-language analysis | ❌ Not Started | - | Quality/Security/Performance |
| **Git MCP** | Architecture | Repository structure | ❌ Not Started | - | File analysis |
| **Madge MCP** | Architecture | Circular dependencies | ❌ Not Started | - | Dependency graphs |
| **Lighthouse MCP** | Performance | Web performance | ❌ Not Started | - | Core Web Vitals |
| **Bundlephobia MCP** | Performance | Bundle size analysis | ❌ Not Started | - | NPM package sizes |
| **Knowledge Graph MCP** | Educational | Learning paths | ❌ Not Started | - | Skill mapping |
| **MCP Memory** | Educational | Progress tracking | ❌ Not Started | - | Learning history |
| **Web Search MCP** | Educational | External resources | ❌ Not Started | - | Documentation search |
| **Mermaid MCP** | Reporting | Diagram generation | ❌ Not Started | - | Architecture diagrams |
| **Markdown PDF MCP** | Reporting | Report formatting | ❌ Not Started | - | PDF generation |
| **NPM Audit MCP** | Dependency | Security vulnerabilities | ❌ Not Started | - | Package scanning |
| **License Checker MCP** | Dependency | License compliance | ❌ Not Started | - | OSS compliance |
| **Outdated MCP** | Dependency | Version currency | ❌ Not Started | - | Update suggestions |

**MCP Tool Summary**: 5/19 implemented (26%)

### Direct Tools

| Tool | Role | Purpose | Status | Tests | Notes |
|------|------|---------|--------|-------|-------|
| **Prettier Direct** | Code Quality | Code formatting | ✅ Implemented | ❌ No tests | Formatting checks |
| **Dependency Cruiser Direct** | Architecture | Dependency validation | ✅ Implemented | ❌ No tests | Circular dep detection |
| **Grafana Direct** | Reporting | Dashboard integration | ✅ Implemented | ❌ No tests | Metrics visualization |

**Direct Tool Summary**: 3/3 implemented (100%), 0/3 tested (0%)

### Overall Progress

- **Total Tools**: 22 (19 MCP + 3 Direct)
- **Implemented**: 8/22 (36%)
- **Fully Tested**: 5/22 (23%)
- **Test Coverage**: 73 tests passing (MCP only)

### Implementation Priority

1. **High Priority** (Core functionality):
   - ✅ ESLint MCP (Code Quality)
   - ✅ MCP-Scan (Security verification)
   - ❌ SonarQube MCP (Multi-role support)
   - ❌ Semgrep MCP (Security)

2. **Medium Priority** (Enhanced analysis):
   - ✅ Context MCP (Educational)
   - ✅ Chart.js MCP (Reporting)
   - ❌ Git MCP (Architecture)
   - ❌ NPM Audit MCP (Dependency)

3. **Low Priority** (Nice to have):
   - ❌ Mermaid MCP (Diagrams)
   - ❌ Bundlephobia MCP (Bundle analysis)
   - ❌ Knowledge Graph MCP (Learning paths)

## License

MIT
