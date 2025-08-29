# Tool Data Flow Architecture

## Overview
This document explains how data flows from MCP tools to specialized agents through the Universal Parser.

## 🔄 Data Flow Pipeline

```
MCP Tools → Raw Output → Universal Parser → Standardized Format → Specialized Agents
```

## 1️⃣ Tool Execution Layer

### Tool Runner Service
```typescript
class ToolRunnerService {
  private parser = new UniversalToolParser();
  
  async runToolForLanguage(
    tool: string, 
    language: string, 
    repoPath: string
  ): Promise<StandardizedToolOutput> {
    // Execute tool based on language
    const rawOutput = await this.executeTool(tool, repoPath, language);
    
    // Parse to standardized format
    const standardized = this.parser.parse(tool, rawOutput, language);
    
    // Cache results
    await this.cacheResults(standardized);
    
    return standardized;
  }
}
```

## 2️⃣ Universal Parser

### Standardized Output Structure
```typescript
interface StandardizedToolOutput {
  tool: string;              // Tool that generated this data
  timestamp: string;          // When analysis was performed
  language?: string;          // Programming language analyzed
  files: FileAnalysis[];      // Per-file analysis
  issues: StandardizedIssue[]; // All issues found
  metrics?: CodeMetrics;      // Code metrics if available
  dependencies?: DependencyInfo[]; // Dependency info if available
  raw?: any;                  // Original output for reference
}
```

### Issue Standardization
```typescript
interface StandardizedIssue {
  id: string;
  type: 'security' | 'performance' | 'quality' | 'dependency' | 'architecture' | 'bug';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  location: {
    file: string;
    line?: number;
    column?: number;
  };
  evidence?: string;
  suggestion?: string;
  cwe?: string;        // For security issues
  owasp?: string;      // For security issues
}
```

## 3️⃣ Agent Consumption Pattern

### Security Agent Example
```typescript
class SecurityAgent extends BaseAgent {
  async analyze(context: AgentContext): Promise<AnalysisResult> {
    // Get standardized tool outputs
    const toolOutputs = context.toolOutputs as StandardizedToolOutput[];
    
    // Filter for security-relevant tools
    const securityTools = toolOutputs.filter(output => 
      ['semgrep', 'bandit', 'gosec', 'snyk', 'trivy'].includes(output.tool)
    );
    
    // Extract security issues
    const securityIssues = securityTools
      .flatMap(output => output.issues)
      .filter(issue => issue.type === 'security');
    
    // Enhance with agent expertise
    const enhancedIssues = await this.enhanceWithAI(securityIssues);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(enhancedIssues);
    
    return {
      issues: enhancedIssues,
      recommendations,
      metadata: {
        toolsUsed: securityTools.map(t => t.tool),
        issueCount: enhancedIssues.length,
        criticalCount: enhancedIssues.filter(i => i.severity === 'critical').length
      }
    };
  }
}
```

### Performance Agent Example
```typescript
class PerformanceAgent extends BaseAgent {
  async analyze(context: AgentContext): Promise<AnalysisResult> {
    const toolOutputs = context.toolOutputs as StandardizedToolOutput[];
    
    // Extract performance metrics
    const metrics = this.extractPerformanceMetrics(toolOutputs);
    
    // Find performance issues
    const performanceIssues = toolOutputs
      .flatMap(output => output.issues)
      .filter(issue => 
        issue.type === 'performance' || 
        issue.category.includes('performance') ||
        issue.category.includes('optimization')
      );
    
    // Analyze complexity
    const complexityIssues = this.analyzeComplexity(toolOutputs);
    
    return {
      issues: [...performanceIssues, ...complexityIssues],
      metrics,
      recommendations: this.generateOptimizations(performanceIssues, metrics)
    };
  }
}
```

## 4️⃣ Orchestrator Integration

```typescript
class Orchestrator {
  private toolRunner = new ToolRunnerService();
  private agents: Map<string, BaseAgent>;
  
  async analyzeRepository(repo: string, pr: number) {
    // Step 1: Detect language and size
    const context = await this.detectContext(repo);
    
    // Step 2: Select and run appropriate tools
    const toolOutputs = await this.runTools(context);
    
    // Step 3: Route to specialized agents
    const agentResults = await this.runAgents(context, toolOutputs);
    
    // Step 4: Aggregate results
    return this.aggregateResults(agentResults);
  }
  
  private async runTools(context: RepoContext): Promise<StandardizedToolOutput[]> {
    const outputs: StandardizedToolOutput[] = [];
    
    // Run language-specific tools
    for (const tool of context.availableTools) {
      const output = await this.toolRunner.runToolForLanguage(
        tool,
        context.language,
        context.repoPath
      );
      outputs.push(output);
    }
    
    return outputs;
  }
  
  private async runAgents(
    context: RepoContext, 
    toolOutputs: StandardizedToolOutput[]
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    
    // Configure agents for language/size
    for (const [role, agent] of this.agents) {
      agent.configureForLanguage(context.language, context.availableTools);
      agent.setRepositorySize(context.size);
      
      // Run analysis with standardized data
      const result = await agent.analyze({
        ...context,
        toolOutputs
      });
      
      results.push({ role, result });
    }
    
    return results;
  }
}
```

## 5️⃣ Tool Mapping by Language

### JavaScript/TypeScript
- **Security**: semgrep, snyk, npm audit
- **Quality**: eslint, jshint, standard
- **Performance**: lighthouse, webpack-bundle-analyzer
- **Dependencies**: npm-check, depcheck

### Python
- **Security**: bandit, safety, pip-audit
- **Quality**: pylint, flake8, black
- **Performance**: py-spy, memory_profiler
- **Dependencies**: pipdeptree, pip-review

### Java
- **Security**: spotbugs, find-sec-bugs
- **Quality**: checkstyle, pmd
- **Performance**: jmh, jprofiler
- **Dependencies**: dependency-check, versions-maven-plugin

### Go
- **Security**: gosec, nancy
- **Quality**: golint, gofmt
- **Performance**: pprof, trace
- **Dependencies**: go mod graph, go list

## 6️⃣ Benefits of This Architecture

### 1. **Tool Agnostic**
Agents don't need to know specific tool output formats. They work with standardized data.

### 2. **Easy to Extend**
Adding a new tool only requires adding a parser. No changes to agents needed.

### 3. **Language Flexibility**
Same agent code works for all languages because data is standardized.

### 4. **Cacheable**
Standardized outputs can be cached and reused across agents.

### 5. **Testable**
Agents can be tested with mock standardized data without running actual tools.

## 7️⃣ Example: Complete Flow

```typescript
// 1. Orchestrator detects JavaScript project, medium size
const context = {
  language: 'javascript',
  size: 'medium',
  availableTools: ['eslint', 'semgrep', 'jscpd', 'npm-audit']
};

// 2. Run tools and get raw outputs
const eslintRaw = await runESLint(repoPath);
const semgrepRaw = await runSemgrep(repoPath);

// 3. Parse to standardized format
const parser = new UniversalToolParser();
const eslintStandard = parser.parse('eslint', eslintRaw, 'javascript');
const semgrepStandard = parser.parse('semgrep', semgrepRaw, 'javascript');

// 4. Agents consume standardized data
const securityAgent = new SecurityAgent();
securityAgent.configureForLanguage('javascript', ['semgrep']);

const securityResult = await securityAgent.analyze({
  toolOutputs: [eslintStandard, semgrepStandard]
});

// 5. Result contains enriched, categorized issues
console.log(securityResult.issues); // Standardized security issues
console.log(securityResult.recommendations); // AI-enhanced recommendations
```

## 8️⃣ Error Handling

```typescript
class UniversalToolParser {
  parse(tool: string, output: any, language?: string): StandardizedToolOutput {
    try {
      const parser = this.toolParsers.get(tool);
      if (!parser) {
        // Fallback to generic parser
        return this.genericParse(tool, output, language);
      }
      return parser(output);
    } catch (error) {
      // Return empty but valid structure
      return {
        tool,
        timestamp: new Date().toISOString(),
        language,
        files: [],
        issues: [],
        raw: output,
        error: error.message
      };
    }
  }
}
```

## 9️⃣ Performance Considerations

### Parallel Processing
```typescript
// Run tools in parallel
const toolPromises = tools.map(tool => 
  this.toolRunner.runToolForLanguage(tool, language, repoPath)
);
const toolOutputs = await Promise.all(toolPromises);

// Run agents in parallel
const agentPromises = agents.map(agent => 
  agent.analyze({ toolOutputs })
);
const agentResults = await Promise.all(agentPromises);
```

### Caching Strategy
```typescript
class ToolCache {
  private cache = new Map<string, StandardizedToolOutput>();
  
  getCacheKey(tool: string, repo: string, commit: string): string {
    return `${tool}:${repo}:${commit}`;
  }
  
  async get(key: string): Promise<StandardizedToolOutput | null> {
    // Check memory cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    // Check Redis cache
    const cached = await redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      this.cache.set(key, parsed);
      return parsed;
    }
    
    return null;
  }
}
```

## 🎯 Summary

The Universal Parser creates a **standardized data contract** between tools and agents:

1. **Tools** produce raw output in their native format
2. **Parser** converts to standardized structure
3. **Agents** consume standardized data
4. **Results** are consistent regardless of tools used

This architecture ensures:
- ✅ Agents work with any tool
- ✅ Easy to add new tools
- ✅ Consistent data format
- ✅ Language-agnostic agent code
- ✅ Testable and maintainable