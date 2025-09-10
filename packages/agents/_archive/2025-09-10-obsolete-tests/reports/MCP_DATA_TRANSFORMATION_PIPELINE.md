# MCP Data Transformation Pipeline Documentation

## Overview
This document describes the complete data transformation pipeline from MCP (Model Context Protocol) tools to the final analysis report generation in the CodeQual system.

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   MCP Tools     │────▶│ Universal Parser │────▶│ Specialized      │
│                 │     │                  │     │ Agents           │
├─────────────────┤     └──────────────────┘     ├──────────────────┤
│ • Semgrep       │              │                │ • Security       │
│ • ESLint        │              ▼                │ • Code Quality   │
│ • npm-audit     │     ┌──────────────────┐     │ • Performance    │
│ • Lighthouse    │     │ Standardized     │     └──────────────────┘
│ • SonarQube     │     │ Findings         │              │
│ • Snyk          │     └──────────────────┘              ▼
│ • Bandit        │                              ┌──────────────────┐
│ • GoSec         │                              │ Orchestrator     │
└─────────────────┘                              └──────────────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │ Report Generator │
                                                 └──────────────────┘
```

## 1. MCP Tools Layer

### Purpose
Execute language-specific and tool-specific analysis on codebases.

### Available Tools

#### Security Tools
- **Semgrep** (`semgrep-mcp.ts`) ✅ Implemented
  - Static analysis for security vulnerabilities
  - Supports multiple languages
  - OWASP and CWE rule mappings
  - Free and open source

- **Bandit** (Python) - Planned
  - Python-specific security linting
  - Common security issue detection
  - Free and open source

- **GoSec** (Go) - Planned
  - Go-specific security analysis
  - Memory safety checks
  - Free and open source

#### Code Quality Tools
- **ESLint** (`eslint-mcp.ts`) ✅ Implemented
  - JavaScript/TypeScript linting
  - Configurable rule sets
  - Auto-fix capabilities
  - Free and open source

- **RuboCop** (Ruby) - Planned
  - Ruby style and quality checks
  - Rails-specific rules
  - Free and open source

- **PHPStan** (PHP) - Planned
  - PHP static analysis
  - Type safety checking
  - Free and open source

#### Performance Tools
- **Lighthouse** (`lighthouse-mcp.ts`) ✅ Implemented
  - Web performance metrics
  - Core Web Vitals analysis
  - Bundle size analysis
  - Free and open source

- **Webpack Bundle Analyzer** - Planned
  - JavaScript bundle analysis
  - Dependency size tracking
  - Free and open source

#### Dependency Tools
- **npm-audit** (`npm-audit-mcp.ts`) ✅ Implemented
  - Node.js dependency vulnerabilities
  - Auto-fix capabilities
  - CVE tracking
  - Built into npm (free)

### Tool Output Format
Each MCP tool wrapper returns a standardized structure:
```typescript
{
  tool: string;           // Tool identifier
  success: boolean;       // Execution status
  findings: Array<{       // Tool-specific findings
    type: string;
    severity: string;
    category: string;
    message: string;
    location: {...};
    // Tool-specific fields
  }>;
  metrics: {...};         // Tool-specific metrics
}
```

## 2. Universal Parser Layer

### Purpose
Transform diverse tool outputs into a standardized format for consumption by specialized agents.

### Core Component
**UniversalToolParser** (`universal-tool-parser.ts`)

### Standardized Finding Structure
```typescript
interface StandardizedFinding {
  // Core identification
  id: string;
  toolSource: string;
  type: 'security' | 'performance' | 'code-quality' | 'dependency';
  
  // Severity and priority
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  priority: number;        // 1-10 scale
  confidence: number;      // 0-100 percentage
  
  // Issue details
  title: string;
  description: string;
  category: string;
  
  // Location information
  location: {
    file?: string;
    line?: number;
    column?: number;
    url?: string;
  };
  
  // Evidence
  evidence?: {
    codeSnippet?: string;
    context?: string[];
  };
  
  // Technical details
  technical?: {
    cwe?: string[];
    cve?: string[];
    owasp?: string[];
    rule?: string;
    metric?: string;
  };
  
  // Remediation
  remediation?: {
    effort: 'trivial' | 'easy' | 'moderate' | 'complex' | 'major';
    automaticFix?: boolean;
    recommendations: string[];
  };
}
```

### Transformation Process
1. **Tool Detection**: Identifies tool type from output structure
2. **Field Mapping**: Maps tool-specific fields to standardized fields
3. **Severity Normalization**: Converts tool-specific severities to standard scale
4. **Confidence Calculation**: Computes confidence based on available evidence
5. **Priority Assignment**: Calculates priority from severity and confidence

### Supported Tool Parsers
**Implemented:**
- `parseSemgrep()` - Security findings ✅
- `parseESLint()` - Code quality issues ✅
- `parseNpmAudit()` - Dependency vulnerabilities ✅
- `parseLighthouse()` - Performance metrics ✅
- `parseGeneric()` - Unknown tool fallback ✅

**Planned (free tools):**
- `parseBandit()` - Python security
- `parseGoSec()` - Go security
- `parseRuboCop()` - Ruby quality
- `parsePHPStan()` - PHP type safety
- `parsePylint()` - Python quality

**Note:** We only integrate free and open-source tools to avoid licensing costs.

## 3. Specialized Agents Layer

### Purpose
Process standardized findings with domain-specific expertise and AI enhancement.

### Agent Types

#### Security Agent
**File**: `specialized/security-agent.ts`
**Responsibilities**:
- Vulnerability assessment
- Threat modeling
- Security best practices validation
- OWASP/CWE mapping enrichment

**Input Processing**:
```typescript
{
  repositoryPath: string;
  branchName: string;
  language: string;
  languageTools: string[];
  toolResults: StandardizedFinding[];
}
```

**Output**:
```typescript
{
  vulnerabilities: SecurityVulnerability[];
  riskScore: number;
  recommendations: string[];
}
```

#### Code Quality Agent
**File**: `specialized/code-quality-agent.ts`
**Responsibilities**:
- Code maintainability analysis
- Technical debt assessment
- Best practices validation
- Refactoring suggestions

**Input/Output**: Similar structure with quality-specific fields

#### Performance Agent
**File**: `specialized/performance-agent.ts`
**Responsibilities**:
- Performance bottleneck identification
- Resource usage analysis
- Optimization recommendations
- Benchmark comparisons

**Input/Output**: Similar structure with performance-specific fields

### Agent Processing Pipeline
1. **Context Configuration**: Language and tool-specific setup
2. **Finding Enrichment**: Add context and relationships
3. **AI Analysis**: Use configured models for deeper insights
4. **Prioritization**: Rank issues by impact
5. **Recommendation Generation**: Create actionable suggestions

## 4. Orchestrator Layer

### Purpose
Coordinate multiple agents and aggregate their results.

### Core Components
- **LanguageRouter**: Routes to appropriate tools by language
- **ModelSelector**: Chooses optimal AI models
- **ResultAggregator**: Combines agent outputs

### Orchestration Flow
```typescript
async function orchestrate(repository: Repository) {
  // 1. Detect language and select tools
  const language = detectLanguage(repository);
  const tools = selectToolsForLanguage(language);
  
  // 2. Execute MCP tools
  const toolResults = await Promise.all(
    tools.map(tool => tool.analyze(repository))
  );
  
  // 3. Parse tool outputs
  const standardizedFindings = toolResults.map(
    result => parser.parse(result)
  );
  
  // 4. Route to specialized agents
  const agentResults = await Promise.all([
    securityAgent.analyze(securityFindings),
    qualityAgent.analyze(qualityFindings),
    performanceAgent.analyze(performanceFindings)
  ]);
  
  // 5. Aggregate results
  return aggregateResults(agentResults);
}
```

## 5. Report Generation Layer

### Purpose
Transform aggregated analysis results into user-facing reports.

### Report Formats
- **HTML**: Interactive web report
- **Markdown**: Documentation-friendly format
- **JSON**: Machine-readable format

### Report Sections
1. **Executive Summary**
   - Overall score
   - Critical issues count
   - Key recommendations

2. **Security Analysis**
   - Vulnerabilities by severity
   - CWE/OWASP mappings
   - Remediation steps

3. **Code Quality Analysis**
   - Maintainability metrics
   - Technical debt
   - Refactoring suggestions

4. **Performance Analysis**
   - Performance metrics
   - Bottlenecks
   - Optimization opportunities

5. **Dependencies**
   - Vulnerable dependencies
   - Update recommendations
   - License compliance

## 6. Data Flow Examples

### Example 1: Security Issue Flow
```
1. Semgrep detects SQL injection in user.ts:45
   ↓
2. Parser standardizes to SecurityFinding with CWE-89
   ↓
3. Security Agent enriches with OWASP A03:2021
   ↓
4. Orchestrator aggregates with other findings
   ↓
5. Report shows as Critical security issue with fix
```

### Example 2: Performance Issue Flow
```
1. Lighthouse measures LCP at 4.5 seconds
   ↓
2. Parser converts to PerformanceFinding
   ↓
3. Performance Agent adds optimization suggestions
   ↓
4. Orchestrator calculates performance score
   ↓
5. Report shows Core Web Vitals failing with fixes
```

## 7. Configuration and Extensibility

### Adding New MCP Tools
1. Create wrapper in `mcp-wrappers/`
2. Implement standard interface
3. Add parser in `UniversalToolParser`
4. Register in tool registry

### Adding New Finding Types
1. Extend `StandardizedFinding` interface
2. Add parser logic
3. Update agent processors
4. Extend report templates

### Language-Specific Configuration
```typescript
const languageTools = {
  javascript: ['eslint', 'semgrep', 'npm-audit', 'lighthouse'],
  python: ['pylint', 'bandit', 'safety'],
  go: ['golint', 'gosec', 'go-mod-audit'],
  ruby: ['rubocop', 'brakeman', 'bundler-audit'],
  java: ['spotbugs', 'dependency-check', 'sonarqube'],
  php: ['phpstan', 'psalm', 'security-checker']
};
```

## 8. Error Handling and Fallbacks

### Tool Failure Handling
- Graceful degradation when tools fail
- Fallback to alternative tools
- Partial result aggregation

### Parser Error Recovery
- Generic parser for unknown formats
- Field inference from patterns
- Confidence adjustment for uncertain data

### Agent Failure Isolation
- Independent agent execution
- Timeout protection
- Result caching

## 9. Performance Optimizations

### Parallel Execution
- Tools run concurrently
- Agents process in parallel
- Async result aggregation

### Caching Strategy
- Tool result caching
- Parsed finding caching
- Report caching

### Resource Management
- Memory limits per tool
- Timeout configuration
- Process isolation

## 10. Testing and Validation

### Integration Tests
- `test-mcp-integration-complete.ts`: Full pipeline test
- Mock data for each tool type
- Validation of transformations

### Unit Tests
- Parser transformation tests
- Agent processing tests
- Report generation tests

### End-to-End Tests
- Real repository analysis
- Complete pipeline validation
- Report accuracy verification

## Conclusion

The MCP Data Transformation Pipeline provides a robust, extensible architecture for:
- **Tool Integration**: Easy addition of new analysis tools
- **Data Standardization**: Consistent format across diverse tools
- **Intelligent Processing**: AI-enhanced analysis by specialized agents
- **Comprehensive Reporting**: Multi-format, actionable reports

This pipeline ensures that CodeQual can leverage the best tools for each language and domain while maintaining a consistent, high-quality analysis output.