# CodeQual Test Integration

Comprehensive end-to-end integration tests for the CodeQual orchestrator flow, including all MCP tool integrations.

## Overview

This package provides complete integration testing for:

- **Complete Orchestrator Flow**: From PR analysis to final report generation
- **Educational Agent MCP Tools**: Real-time documentation and working examples
- **Reporter Agent MCP Tools**: Chart generation, diagrams, and PDF reports
- **Multi-Agent Coordination**: Ensuring all agents work together correctly
- **Data Flow Validation**: Verifying consistency across all systems
- **Real Data Testing**: Direct API testing with actual GitHub repositories
- **Performance Monitoring**: Real-time metrics and cost tracking

## Real Data Testing 🆕

The test suite now supports testing against the actual CodeQual API with real GitHub repositories.

### Quick Start

```bash
# Set up environment
export CODEQUAL_API_KEY="your-api-key"
export GITHUB_TOKEN="your-github-token"  # Optional but recommended

# Run all real data tests
npm run test:real-data

# Run specific scenario
npm run test:real-data flask-python-small

# Quick smoke test
npm run test:real-data:quick
```

### Features

- **Actual API Calls**: Tests the real CodeQual analysis endpoint
- **Performance Monitoring**: Tracks tokens, costs, and execution time
- **Error Handling**: Robust retry logic and detailed error reporting
- **Validation**: Ensures results meet expected criteria
- **Detailed Reports**: Saves comprehensive test results

See [TEST-EXECUTION-GUIDE.md](./TEST-EXECUTION-GUIDE.md) for detailed instructions.

## Test Scenarios

Our E2E tests run against **6 diversified scenarios** covering different:

### 📋 Scenario Overview

| Scenario | Repository | PR | Language | Framework | Size | Complexity |
|----------|------------|----|---------|-----------|----- |-----------|
| **VSCode** | `microsoft/vscode` | #150000* | TypeScript | Electron | Large | Complex |
| **React** | `facebook/react` | #25000* | JavaScript | React | Medium | Moderate |
| **Flask** | `pallets/flask` | #4500* | Python | Flask | Small | Simple |
| **Spring** | `spring-projects/spring-boot` | #30000* | Java | Spring Boot | Large | Complex |
| **Tokio** | `tokio-rs/tokio` | #5000* | Rust | Tokio | Medium | Complex |
| **Kubernetes** | `kubernetes/kubernetes` | #100000* | Go | Go Modules | Large | Complex |

*_PR numbers fallback to latest available if specified PR doesn't exist_

### 🔗 **How PR Analysis Works**

Each test scenario follows this flow:

1. **Target Repository + PR**: Each scenario specifies a real GitHub repository and PR number
   ```typescript
   repositoryUrl: 'https://github.com/microsoft/vscode',
   prNumber: 150000,  // Real PR to analyze
   ```

2. **PR Data Extraction**: The orchestrator extracts real PR data:
   - **Changed files** (what files were modified)
   - **Diff content** (what lines changed)
   - **PR metadata** (title, description, author)
   - **Repository context** (language, framework detection)

3. **Domain-Specific Analysis**: Each agent analyzes the **actual PR changes**:
   - **Security Agent** → Looks for security issues in the changed code
   - **Architecture Agent** → Analyzes structural changes and dependencies
   - **Performance Agent** → Reviews performance implications
   - **Dependencies Agent** → Checks package/library changes
   - **Code Quality Agent** → Evaluates code style and documentation

4. **Real Tool Execution**: All tools run against **real repository data**:
   - `npm-audit` → Scans actual package.json for vulnerabilities
   - `madge` → Analyzes real dependency structure
   - `eslint-direct` → Lints actual changed files
   - MCP tools → Process real code examples and documentation

5. **Scenario-Specific Validation**: Results are validated against **expected patterns**:
   - Large TypeScript projects should find architecture issues
   - Python Flask apps should have security findings
   - Rust projects should emphasize performance optimization

## 📊 **What Our Tests Actually Measure**

Based on the **implemented intelligence**, our tests measure real performance gains:

### ✅ **Currently Tested Intelligence** 

**Repository Status Intelligence**:
- ✅ **Cache Hit Rate** → How often Vector DB analysis is reused
- ✅ **Freshness Detection** → Fresh vs stale vs outdated analysis
- 📊 **Expected Impact**: 40-70% time reduction for recently analyzed repos

**Analysis Mode Intelligence**:
- ✅ **Quick Mode** → Security + Code Quality agents only (2 agents)
- ✅ **Comprehensive Mode** → Security + Architecture + Performance + Code Quality (4 agents)  
- ✅ **Deep Mode** → All 5 agents including Dependencies
- 📊 **Expected Impact**: 30-60% time reduction for Quick mode

**Tool Filtering Intelligence**:
- ✅ **Language Detection** → npm tools only for JavaScript/TypeScript projects
- ✅ **Project Structure** → package.json presence determines tool relevance
- 📊 **Expected Impact**: 20-40% time reduction for filtered tools

**Model Selection Intelligence**:
- ✅ **Context-Aware Models** → Different models for different repository characteristics
- ✅ **Cost Optimization** → Model selection based on complexity vs cost
- 📊 **Expected Impact**: 15-30% cost reduction with maintained quality

### ❌ **Future Intelligence Features** (Not Yet Implemented)

**Context-Based Agent Skipping** (HIGH PRIORITY):
- 🔮 **Small UI PR** → Skip Security/Dependencies → ~60% time reduction
- 🔮 **Documentation PR** → Skip Security/Performance/Dependencies → ~80% time reduction
- 🔮 **Package Updates PR** → Focus on Dependencies/Security → ~40% time reduction

**Dynamic Timeout Adjustment** (MEDIUM PRIORITY):
- 🔮 **Large Repositories** → Extended timeouts based on size
- 🔮 **Simple PRs** → Reduced timeouts for faster feedback
- 🔮 **Resource Contention** → Adaptive timeout based on system load

This approach tests **real intelligence** and measures **actual performance benefits**!

### 🎯 Why Multiple Scenarios?

- **Language Diversity**: Tests tool adaptation across TypeScript, JavaScript, Python, Java, Rust, Go
- **Framework Coverage**: Validates framework-specific analysis (React, Spring, Flask, etc.)
- **Size Variation**: Tests performance with small (2min), medium (3min), large (5min) repositories
- **Complexity Levels**: Validates handling of simple → complex codebases
- **Agent Specialization**: Each scenario emphasizes different agent strengths
- **Tool Validation**: Ensures MCP tools work across different project types

### 🧠 Orchestrator Intelligence Testing

We test the **actually implemented intelligence features** and measure their effectiveness:

## ✅ **IMPLEMENTED Intelligence Features** (Being Tested)

| Feature | Implementation Status | How It Works | File Location |
|---------|-------------------|--------------|---------------|
| **Repository Status Checking** | ✅ **IMPLEMENTED** | Vector DB freshness analysis → Skip reanalysis when recent | `result-orchestrator.ts:459-504` |
| **Model Selection Optimization** | ✅ **IMPLEMENTED** | Context-aware model selection based on repo characteristics | `ModelVersionSync.ts` |
| **Agent Selection Logic** | ✅ **IMPLEMENTED** | Sophisticated scoring: language, complexity, user preferences | `agent-selector.ts:261-337` |
| **Analysis Mode Intelligence** | ✅ **IMPLEMENTED** | Quick/Comprehensive/Deep → Different agent combinations | `result-orchestrator.ts:659-665` |
| **Basic Tool Filtering** | ✅ **IMPLEMENTED** | File extension detection → Language-specific tool execution | `orchestrator-tool-selection.test.ts` |
| **Repository Scheduling** | ✅ **IMPLEMENTED** | Activity-based scheduling with critical finding escalation | `repository-scheduler.service.ts` |
| **Vector Context Retrieval** | ✅ **IMPLEMENTED** | Agent-specific context formatting from Vector DB | `result-orchestrator.ts:528-565` |

## ❌ **MISSING Intelligence Features** (Need Implementation)

| Feature | Status | Potential Impact | Implementation Effort |
|---------|--------|------------------|---------------------|
| **Context-Based Agent Skipping** | ❌ **NOT IMPLEMENTED** | 30-50% time reduction for small PRs | High Priority |
| **Dynamic Timeout Adjustment** | ❌ **NOT IMPLEMENTED** | Prevent analysis failures on large repos | Medium Priority |
| **Performance Learning System** | ❌ **NOT IMPLEMENTED** | Long-term optimization based on patterns | Low Priority |
| **Intelligent Tool Result Integration** | ⚠️ **PARTIAL** | Better agent accuracy, duplicate removal | Medium Priority |
| **Cost-Aware Optimization** | ❌ **NOT IMPLEMENTED** | Budget management, model selection | Low Priority |

**Key Principles:**
- 🧠 **Orchestrator Intelligence** - Let the system decide what to execute based on PR context
- 📊 **Real Performance Measurement** - Track actual execution times and optimization effectiveness
- 🎯 **Context-Driven Optimization** - Optimization based on actual PR content, not artificial modes
- 📈 **Adaptive Learning** - System learns and improves from real execution patterns

```bash
# Smart orchestrator testing (default approach)
npm run test:orchestrator                    # Smart comprehensive testing

# Individual scenario testing
npm run test:scenario:flask                  # Small Python PR
npm run test:scenario:react                  # Medium JavaScript PR  
npm run test:scenario:vscode                 # Large TypeScript PR
npm run test:scenario:spring                 # Large Java PR
npm run test:scenario:rust                   # Medium Rust PR
npm run test:scenario:go                     # Large Go PR

# Performance baseline collection
npm run test:performance-baseline            # Log all performance data
npm run test:all-scenarios                   # All scenarios sequentially
```

## 📊 Performance Measurement

The tests automatically collect detailed performance metrics:

### Execution Time Tracking
```typescript
// Example performance data collected
{
  scenarioId: "flask-python-small",
  executionMode: "QUICK_SMOKE_TEST",
  totalTime: 45000,      // 45 seconds
  stepTimings: {
    deepWikiAnalysis: 15000,   // 15 seconds
    toolExecution: 12000,      // 12 seconds  
    multiAgentAnalysis: 8000,  // 8 seconds
    educationalAgent: 7000,    // 7 seconds
    reporterAgent: 3000        // 3 seconds
  },
  toolTimings: {
    "npm-audit": 5000,
    "madge": 4000,
    "eslint-direct": 3000
    // bundlephobia-direct: SKIPPED
  }
}
```

### Performance Analysis Goals
- **Identify actual bottlenecks** (not assumptions)
- **Measure repository size impact** on each component
- **Compare language-specific performance** differences  
- **Validate tool filtering effectiveness**
- **Establish realistic timeout values**

After running tests, we can make **data-driven decisions** about:
- Which tools to filter for different modes
- Whether execution mode complexity is worth the performance gain
- Realistic timeout and performance target values

## Test Coverage

### High Priority MCP Tools

#### Educational Agent
- **context7-mcp**: Real-time documentation search and retrieval
- **working-examples-mcp**: Validated working code examples

#### Reporting Agent
- **chartjs-mcp**: Dynamic chart generation (pie, bar, line charts)
- **mermaid-mcp**: Diagram creation (dependency graphs, learning paths)
- **markdown-pdf-mcp**: Multi-format report generation

#### Code Quality Agent
- **mcp-docs-service**: Documentation quality assessment and scoring

### Standard Tools (Also Tested)
- **DeepWiki Tools**: npm-audit, madge, dependency-cruiser, license-checker, npm-outdated
- **Local Tools**: eslint-direct, bundlephobia-direct, grafana-direct

## Quick Start

### Prerequisites

1. **Environment Setup**: Create `.env.test` in the project root:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=your_openai_key
```

2. **Install Dependencies**:
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/test-integration
npm install
```

### Running Tests

#### Quick Smoke Test (Default - Fast)
```bash
npm run test:orchestrator
```
Runs small repositories and simple scenarios (~2-4 minutes total).

#### Comprehensive Test Suite (All Scenarios)
```bash
npm run test:orchestrator:comprehensive
```
Runs all 6 test scenarios across different languages, sizes, and complexities (~30+ minutes total).

#### Test by Categories
```bash
# Test by programming languages (TypeScript, JavaScript, Python)
npm run test:orchestrator:by-language

# Test by repository sizes (small, medium)
npm run test:orchestrator:by-size

# Test performance-focused scenarios
npm run test:orchestrator:performance
```

#### Run All Execution Modes
```bash
# Progressive testing: Quick → Language → Size → Performance
npm run test:all-modes                       # ~20-25 minutes

# Ultimate testing: All modes + comprehensive scenarios
npm run test:all-modes:comprehensive         # ~45+ minutes
```

#### Individual Scenario Testing
```bash
# Test specific scenarios
npm run test:scenario:vscode    # Large TypeScript/Electron app
npm run test:scenario:react     # Medium JavaScript/React app
npm run test:scenario:flask     # Small Python/Flask app
npm run test:scenario:spring    # Large Java/Spring app
npm run test:scenario:rust      # Medium Rust systems app
npm run test:scenario:go        # Large Go microservices app

# Or specify custom scenario ID
SCENARIO_ID=your-scenario-id npm run test:scenario
```

#### Debug Mode
```bash
npm run test:orchestrator:debug
```

#### Legacy Test Categories
```bash
# Test only Educational Agent MCP tools
npm run test:educational

# Test only Reporting Agent MCP tools
npm run test:reporting

# Test all MCP tools
npm run test:tools
```

## Test Architecture

### Test Flow Structure

```
Step 1: Authentication & Initialization
├── User authentication
├── Service initialization
└── MCP tool registration validation

Step 2: PR Analysis with Context
├── Repository access validation
├── PR metadata extraction
└── Educational context preparation

Step 3: DeepWiki Repository Analysis
├── Repository analysis with DeepWiki
├── Vector DB chunk storage
└── Repository context preparation

Step 4: Tool Execution with Repository Context
├── DeepWiki tools with repository context
├── Local PR analysis tools
└── Tool results stored as Vector DB chunks

Step 5: Multi-Agent Analysis with Domain-Specific DeepWiki Chunks
├── Security Agent (security chunks + npm-audit)
├── Architecture Agent (architecture chunks + madge, dependency-cruiser)
├── Performance Agent (performance chunks + performance tools)
├── Dependencies Agent (dependency chunks + npm-outdated, license-checker)
├── Code Quality Agent (quality chunks + eslint-direct, mcp-docs-service)
├── DeepWiki chunk distribution validation
├── Agent domain-specific content validation
└── Orchestrator summary access validation

Step 6: Educational Agent with MCP Tools
├── Orchestrator → Educational Agent input validation
│   ├── RecommendationModule structure validation
│   ├── Educational Tool Results validation  
│   └── Complete input package validation
├── context7-mcp execution (with compiled findings)
├── working-examples-mcp execution (with compiled findings)
└── Educational content compilation

Step 7: Reporter Agent with MCP Tools
├── chartjs-mcp execution
├── mermaid-mcp execution
├── markdown-pdf-mcp execution
└── StandardReport generation

Step 8: Complete Flow Validation
├── End-to-end data consistency
├── MCP tool integration verification
└── Performance target validation

Step 9: Error Handling & Performance
├── Graceful failure handling
└── Performance benchmarking
```

### MCP Tool Test Specifications

#### Educational Agent Tools

**context7-mcp**:
- Input: Topics, search queries, user context
- Output: Structured documentation with relevance scores
- Validation: Content quality, source attribution, relevance

**working-examples-mcp**:
- Input: Findings, language, framework
- Output: Validated code examples with explanations
- Validation: Code syntax, execution safety, educational value

**mcp-docs-service**:
- Input: Repository URL
- Output: Documentation quality assessment
- Validation: Quality scores, improvement suggestions

#### Reporting Agent Tools

**chartjs-mcp**:
- Input: Data sets, chart configurations
- Output: Rendered charts as base64 images
- Validation: Chart types, data accuracy, visual quality

**mermaid-mcp**:
- Input: Diagram specifications, data structures
- Output: SVG diagrams with mermaid code
- Validation: Diagram syntax, visual clarity, data representation

**markdown-pdf-mcp**:
- Input: Report content, formatting options
- Output: PDF buffers with metadata
- Validation: PDF structure, page counts, content fidelity

## Test Data and Scenarios

### Test Repository
- **Primary**: `https://github.com/microsoft/vscode`
- **PR Number**: 150000 (or latest available)
- **Language**: TypeScript
- **Framework**: Electron/Node.js

### Test Scenarios
1. **Security-focused PR**: Authentication changes
2. **Architecture PR**: Core structural modifications
3. **Performance PR**: Optimization improvements
4. **Dependencies PR**: Package updates
5. **Documentation PR**: README/docs changes

## Performance Targets

| Component | Target Time | Actual Time |
|-----------|-------------|-------------|
| Authentication | 5s | ✓ |
| PR Analysis | 10s | ✓ |
| DeepWiki Tools | 120s | ✓ |
| Multi-Agent Analysis | 180s | ✓ |
| Educational MCP Tools | 60s | ✓ |
| Reporting MCP Tools | 60s | ✓ |
| **Total Flow** | **300s (5min)** | **✓** |

## Error Handling

### Graceful Degradation
- **Tool Failures**: Continue with available tools
- **API Limits**: Fallback to cached results
- **Network Issues**: Retry with exponential backoff
- **Invalid Input**: Sanitize and proceed with warnings

### Test Validation
- Each MCP tool includes failure scenarios
- Network timeout simulations
- Invalid input handling
- Resource constraint testing

## Debugging and Troubleshooting

### Common Issues

1. **Environment Variables Missing**:
   ```bash
   # Check your .env.test file
   cat .env.test
   ```

2. **MCP Tool Not Found**:
   ```bash
   # Verify tool registration
   npm run test:tools
   ```

3. **Authentication Failures**:
   ```bash
   # Test Supabase connection
   npm run test:orchestrator:step -- "Authentication"
   ```

4. **Performance Timeouts**:
   ```bash
   # Run with extended timeout
   JEST_TIMEOUT=600000 npm run test:orchestrator
   ```

### Debug Commands

```bash
# Enable verbose logging
DEBUG=codequal:* npm run test:orchestrator:debug

# Run single test step
npm run test:orchestrator:step -- "Educational Agent"

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:e2e -- --coverage
```

## Contributing

### Adding New MCP Tools

1. **Register the tool** in the test configuration
2. **Add test specification** in the orchestrator flow
3. **Implement validation logic** for tool outputs
4. **Update performance targets** if needed

### Test Structure Guidelines

```typescript
describe('Step X: Your Test Category', () => {
  it('should execute your-mcp-tool', async function() {
    this.timeout(expectedDurationMs);
    
    const result = await agent.executeYourTool({
      // input parameters
    });
    
    expect(result).toBeValidMCPToolResult();
    // Additional validations
    
    logger.info('✓ your-mcp-tool executed', {
      // metrics
    });
  });
});
```

## Integration with CI/CD

This test suite is designed to run in CI environments:

```yaml
# GitHub Actions example
- name: Run Orchestrator Flow Tests
  run: |
    cd packages/test-integration
    npm run test:orchestrator
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## DeepWiki Chunk Distribution Validation

### Architecture Pattern Validated

Our tests ensure the correct **domain-specific chunk distribution**:

```typescript
// DeepWiki Analysis creates categorized chunks
DeepWiki → {
  security: [...security analysis chunks...],
  architecture: [...architecture analysis chunks...], 
  performance: [...performance analysis chunks...],
  dependencies: [...dependency analysis chunks...],
  codeQuality: [...code quality analysis chunks...],
  summary: [...overall repository summary...]
}

// Each Agent receives ONLY their domain chunks
SecurityAgent.context.deepWikiChunks = security chunks only
ArchitectureAgent.context.deepWikiChunks = architecture chunks only  
PerformanceAgent.context.deepWikiChunks = performance chunks only
DependenciesAgent.context.deepWikiChunks = dependencies chunks only
CodeQualityAgent.context.deepWikiChunks = codeQuality chunks only

// Orchestrator receives agent reports + DeepWiki summary paragraph  
Orchestrator.compilation = {
  agentReports: {
    security: SecurityAgent.report,
    architecture: ArchitectureAgent.report,
    performance: PerformanceAgent.report,
    dependencies: DependenciesAgent.report,
    codeQuality: CodeQualityAgent.report
  },
  deepWikiSummary: summary paragraph from DeepWiki analysis
}
```

### Validation Tests

- **✅ Chunk Categorization**: Verifies DeepWiki creates properly tagged chunks by domain
- **✅ Agent Filtering**: Ensures agents receive only domain-relevant chunks  
- **✅ Content Matching**: Validates chunk content matches agent domain (regex patterns)
- **✅ Tool-Agent Alignment**: Ensures each agent gets results from domain-specific tools
- **✅ Orchestrator Compilation**: Confirms orchestrator gets agent reports + DeepWiki summary paragraph
- **✅ Distribution Efficiency**: Ensures agents don't receive ALL chunks (filtered correctly)
- **✅ Cross-Domain Detection**: Identifies legitimate cross-domain tool/chunk usage

## Orchestrator → Educational Agent Input Validation

### Critical Data Contract Validation

Our tests ensure the **Orchestrator provides complete, valid input data** to the Educational Agent:

#### **1. RecommendationModule Validation**
```typescript
interface RecommendationModule {
  summary: {
    totalRecommendations: number;           // ✅ Must be > 0
    priorityBreakdown: PriorityStats;       // ✅ Must have all priority levels
    estimatedTotalEffort: string;           // ✅ Must be present
    focusAreas: string[];                   // ✅ Must be array
  };
  
  recommendations: ActionableRecommendation[]; // ✅ Must not be empty
  
  learningPathGuidance: {
    suggestedOrder: string[];               // ✅ Must contain valid recommendation IDs
    parallelizable: string[][];             // ✅ Must be array of arrays
    dependencies: Record<string, string[]>; // ✅ All IDs must exist in recommendations
  };
  
  metadata: {
    confidence: number;                     // ✅ Must be 0-100
    basedOnFindings: number;               // ✅ Must be > 0
    generationMethod: string;              // ✅ Must be valid method
  };
}
```

#### **2. ActionableRecommendation Validation**
```typescript
interface ActionableRecommendation {
  id: string;                              // ✅ Must be unique
  category: 'security' | 'performance'...  // ✅ Must be valid category
  priority: { level: 'critical' | 'high'...} // ✅ Must be valid priority
  
  actionSteps: ActionStep[];               // ✅ Must not be empty
  
  learningContext: {                       // ✅ CRITICAL for Educational Agent
    skillLevel: 'beginner' | 'intermediate' | 'advanced'; // ✅ Must be valid
    prerequisites: string[];               // ✅ Must be array
    relatedConcepts: string[];            // ✅ Must be array  
    difficultyScore: number;              // ✅ Must be 1-10
  };
  
  evidence: {
    findingIds: string[];                  // ✅ Must link back to actual findings
    affectedFiles: string[];              // ✅ Must not be empty
  };
  
  successCriteria: {
    measurable: string[];                  // ✅ Must be array
    testable: string[];                   // ✅ Must be array
  };
}
```

#### **3. Educational Tool Results Validation**
```typescript
interface EducationalToolResult {
  documentation: EducationalDocumentation[]; // ✅ From context7-mcp
  workingExamples: WorkingExample[];         // ✅ From working-examples-mcp
  versionInfo: VersionInfo[];               // ✅ From version checking
  
  // Performance metrics
  cachedResults: number;                    // ✅ Must be >= 0
  freshResults: number;                     // ✅ Must be >= 0
  totalCost: number;                       // ✅ Must be >= 0
}
```

#### **4. Data Consistency Validation**
- **ID Consistency**: All `suggestedOrder` IDs exist in `recommendations`
- **Prerequisite Validation**: All prerequisite IDs are valid recommendation IDs
- **Category Alignment**: Tool results align with recommendation categories
- **Evidence Linking**: All `findingIds` link back to actual agent findings

#### **5. Complete Input Package Structure**
```typescript
const educationalInputPackage = {
  recommendationModule: RecommendationModule,  // ✅ Structured recommendations
  toolResults: EducationalToolResult,          // ✅ MCP tool outputs
  userContext: {                              // ✅ Personalization data
    userId: string,
    skillLevel: string,
    learningPreferences: string[],
    timeAvailable: string
  },
  analysisContext: {                          // ✅ Repository context
    repositoryUrl: string,
    primaryLanguage: string,
    frameworkDetected: string,
    complexity: string
  }
};
```

### Validation Benefits

- **✅ Data Completeness**: Ensures Educational Agent has all required data
- **✅ Structure Validation**: Prevents runtime errors from malformed data
- **✅ Consistency Checks**: Validates cross-references and relationships
- **✅ Quality Assurance**: Ensures learning context is properly populated
- **✅ Performance Monitoring**: Tracks tool execution costs and cache efficiency

## Future Enhancements

- [ ] **Load Testing**: Concurrent user scenarios
- [ ] **A/B Testing**: Multiple model comparisons
- [ ] **Integration Testing**: External service dependencies
- [ ] **Performance Profiling**: Detailed bottleneck analysis
- [ ] **Multi-Repository Testing**: Various codebase types

## Support

For issues with the test suite:

1. Check the [troubleshooting section](#debugging-and-troubleshooting)
2. Review test logs in `test-results/`
3. Run individual test steps to isolate issues
4. Create an issue with full test output