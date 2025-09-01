# Orchestrator → Comparison Service Flow

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                 ORCHESTRATOR                     │
│  Coordinates all agents and services             │
└─────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ MCP Tools    │ │ MCP Tools    │ │ Git Diff     │
│ (Main Branch)│ │ (PR Branch)  │ │ Service      │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        ▼               ▼               │
┌──────────────────────────────────────┐         │
│     Specialized Agents (x2)          │         │
│ - SecurityAgent (main & PR)          │         │
│ - PerformanceAgent (main & PR)       │         │
│ - CodeQualityAgent (main & PR)       │         │
│ - DependencyAgent (main & PR)        │         │
│ - ArchitectureAgent (main & PR)      │         │
└──────────────────────────────────────┘         │
                        │                         │
                        ▼                         ▼
        ┌───────────────────────────────────────────┐
        │     Enhanced Comparison Service           │
        │  Compares all agent reports with git diff │
        └───────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   Categorized     Educator Agent    Final Report
   Comparisons     (Training)        (MD/HTML/JSON)
```

## 1. Orchestrator Initialization

```typescript
class Orchestrator {
  private mcpOrchestration: MCPOrchestrationService;
  private comparisonService: EnhancedComparisonService;
  private gitDiffService: GitDiffService;
  private specializedAgents: {
    security: SecurityAgent;
    performance: PerformanceAgent;
    codeQuality: CodeQualityAgent;
    dependency: DependencyAgent;
    architecture: ArchitectureAgent;
  };
  
  constructor() {
    // Initialize services
    this.mcpOrchestration = new MCPOrchestrationService();
    this.comparisonService = new EnhancedComparisonService();
    this.gitDiffService = new GitDiffService();
    
    // Initialize specialized agents
    this.specializedAgents = {
      security: new EnhancedSecurityAgent(),
      performance: new EnhancedPerformanceAgent(),
      codeQuality: new EnhancedCodeQualityAgent(),
      dependency: new DependencyAgent(),
      architecture: new ArchitectureAgent()
    };
  }
}
```

## 2. Main Orchestration Flow

```typescript
async analyzePR(repoUrl: string, prNumber: number) {
  // Step 1: Get git diff information
  const gitDiff = await this.gitDiffService.getDiffDetails(repoUrl, prNumber);
  const prMetadata = await this.gitDiffService.getPRMetadata(repoUrl, prNumber);
  
  // Step 2: Run MCP tools on both branches
  const [mainMCPResults, prMCPResults] = await Promise.all([
    this.mcpOrchestration.analyzeBranch({
      targetPath: mainBranchPath,
      language: detected,
      branch: 'main'
    }),
    this.mcpOrchestration.analyzeBranch({
      targetPath: prBranchPath,
      language: detected,
      branch: 'pr'
    })
  ]);
  
  // Step 3: Run specialized agents on MCP results
  const [mainAgentReports, prAgentReports] = await Promise.all([
    this.runSpecializedAgents(mainMCPResults),
    this.runSpecializedAgents(prMCPResults)
  ]);
  
  // Step 4: Run comparison service with full metadata
  const comparison = await this.comparisonService.compareWithFullMetadata(
    mainAgentReports,
    prAgentReports,
    gitDiff,
    prMetadata
  );
  
  // Step 5: Run educator in parallel (optional)
  const educationalContent = await this.educatorAgent.generateContent(
    comparison.byCategory,
    developerProfile
  );
  
  // Step 6: Generate final report
  return {
    comparison,
    education: educationalContent,
    prComment: comparison.prComment,
    fullReport: comparison.detailedReport
  };
}
```

## 3. Running Specialized Agents

```typescript
async runSpecializedAgents(mcpResults: MCPToolResults): Promise<SpecializedAgentReports> {
  // Each agent processes relevant MCP findings
  const [security, performance, codeQuality, dependency, architecture] = await Promise.all([
    this.specializedAgents.security.analyze(mcpResults.security),
    this.specializedAgents.performance.analyze(mcpResults.performance),
    this.specializedAgents.codeQuality.analyze(mcpResults.codeQuality),
    this.specializedAgents.dependency.analyze(mcpResults.all),
    this.specializedAgents.architecture.analyze(mcpResults.all)
  ]);
  
  return {
    security: {
      agent: 'SecurityAgent',
      tools: ['semgrep', 'bandit'],
      issues: security.issues,
      summary: security.summary
    },
    performance: {
      agent: 'PerformanceAgent',
      tools: ['lighthouse'],
      issues: performance.issues,
      summary: performance.summary
    },
    codeQuality: {
      agent: 'CodeQualityAgent',
      tools: ['eslint', 'sonarjs'],
      issues: codeQuality.issues,
      summary: codeQuality.summary
    },
    dependency: {
      agent: 'DependencyAgent',
      tools: ['npm-audit'],
      issues: dependency.issues,
      summary: dependency.summary
    },
    architecture: {
      agent: 'ArchitectureAgent',
      tools: ['madge'],
      issues: architecture.issues,
      summary: architecture.summary
    }
  };
}
```

## 4. Data Flow Example

### Input from Specialized Agents:
```typescript
{
  security: {
    agent: 'SecurityAgent',
    tools: ['semgrep'],
    issues: [
      {
        id: 'sec-001',
        category: 'security',
        severity: 'critical',
        title: 'SQL Injection Vulnerability',
        description: 'User input directly concatenated in SQL query',
        location: {
          file: 'api/users.js',
          startLine: 45
        },
        codeSnippet: {
          before: 'const query = ',
          issue: '"SELECT * FROM users WHERE id = " + userId',
          after: ';'
        },
        recommendation: {
          description: 'Use parameterized queries',
          codeExample: 'db.query("SELECT * FROM users WHERE id = ?", [userId])',
          estimatedEffort: 'trivial',
          documentation: ['https://owasp.org/sql-injection']
        }
      }
    ]
  },
  // ... other categories
}
```

### Output from Comparison Service:
```typescript
{
  byCategory: {
    security: {
      resolved: [], // Issues fixed in PR
      existing: [], // Pre-existing issues
      newInDiff: [/* Issues in changed lines */],
      newInFiles: [/* Issues in changed files but not in diff */],
      summary: {
        totalResolved: 0,
        totalExisting: 2,
        totalNewInDiff: 1,
        totalNewInFiles: 3
      }
    }
  },
  summary: {
    recommendation: {
      action: 'block',
      confidence: 0.95,
      reasons: ['1 critical issue introduced in changed code']
    },
    prQualityScore: 45
  },
  prComment: '🚫 **Code Analysis: BLOCK**\n...'
}
```

## 5. Issue Categorization Logic

The comparison service categorizes issues based on:

1. **Location in Git Diff**:
   - If issue is in a file that wasn't changed → Ignore
   - If issue is in changed file:
     - In actual diff lines → `newInDiff` (user introduced)
     - In file but not in diff lines → `newInFiles` (should have cleaned)

2. **Existence in Branches**:
   - Only in main → `resolved` (user fixed it)
   - In both branches → `existing` (pre-existing)
   - Only in PR → `new` (check if in diff or just in file)

3. **Simple Binary Decision Logic**:
   - **BLOCK**: If ANY NEW critical or high severity issues found (introduced in PR)
   - **APPROVE**: If NO NEW critical or high severity issues found
   - **IMPORTANT**: Existing issues (present in both main and PR) do NOT block
   - Note: Medium/low severity issues are reported but don't block the PR
   
   Examples:
   - Existing critical issue in both branches → APPROVE (pre-existing, not introduced)
   - New critical issue in changed lines → BLOCK (user introduced)
   - New high issue in modified file → BLOCK (user should have cleaned)
   - Only medium/low issues → APPROVE (non-blocking)

## 6. Complete Issue Metadata

Each issue includes:
- **Title & Description**: Clear explanation of the problem
- **Location**: Exact file and line number
- **Code Snippet**: Context around the issue
- **Recommendation**: How to fix with code example
- **Effort Estimate**: How hard to fix
- **Documentation**: Links to learn more

This ensures developers get actionable feedback with everything needed to fix issues.