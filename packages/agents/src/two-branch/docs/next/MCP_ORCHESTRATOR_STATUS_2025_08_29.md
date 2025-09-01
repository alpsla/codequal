# MCP + Orchestrator Integration Status - 2025-08-29

## Architecture Update: NO MORE DEEPWIKI
We've completely moved from DeepWiki to MCP tools + Specialized Agents architecture.

### Current Architecture
```
MCP Tools (Semgrep, ESLint, etc.)
    ↓
Universal Tool Parser
    ↓
Specialized Agents (Security, Performance, CodeQuality)
    ↓
Orchestrator (aggregates all agent results)
    ↓
┌─────────────────────────┬──────────────────────────┐
│  Comparison Service     │    Educator Agent        │
│  - New issues           │    - Training materials  │
│  - Resolved issues      │    - Learning paths      │
│  - Git diff filtering   │    - Resources           │
└─────────────────────┴──────────────────────────┘
    ↓                              ↓
    └──────────┬──────────────────┘
               ↓
         Final Report
```

## Key Change: No DeepWiki Dependencies
- ❌ Remove all `USE_DEEPWIKI_MOCK` references
- ❌ Remove DeepWikiApiWrapper imports
- ✅ Use MCP tool wrappers instead
- ✅ Use specialized agents for analysis

## Files Being Modified

### 1. Main Orchestrator File
**Path:** `/Users/alpinro/Code Prjects/codequal/packages/agents/src/standard/orchestrator/comparison-orchestrator.ts`
- Lines 286-315: Current educator integration (needs refactoring)
- Lines 324-333: Comparison logic area
- Need to: Replace DeepWiki references with MCP tool calls

### 2. Files to Create

#### A. Issue Comparison Service
**Path:** `/Users/alpinro/Code Prjects/codequal/packages/agents/src/standard/services/issue-comparison-service.ts`
```typescript
export class IssueComparisonService {
  compareIssues(mainIssues: Issue[], prIssues: Issue[], gitDiff: GitDiffResult): ComparisonResult {
    // Compare issues from MCP tools, not DeepWiki
  }
  private matchIssues(issue1: Issue, issue2: Issue): boolean
  private filterByChangedFiles(issues: Issue[], changedFiles: string[]): Issue[]
}
```

#### B. Git Diff Service
**Path:** `/Users/alpinro/Code Prjects/codequal/packages/agents/src/standard/services/git-diff-service.ts`
```typescript
export class GitDiffService {
  async getChangedFiles(repoUrl: string, prNumber: number): Promise<string[]>
  async getDiffDetails(repoUrl: string, prNumber: number): Promise<GitDiffResult>
}
```

#### C. MCP Orchestration Service
**Path:** `/Users/alpinro/Code Prjects/codequal/packages/agents/src/standard/services/mcp-orchestration-service.ts`
```typescript
export class MCPOrchestrationService {
  async runAllTools(targetPath: string, language: string): Promise<ToolResults> {
    const [semgrepResults, eslintResults, lighthouseResults] = await Promise.all([
      this.semgrepMCP.analyze(targetPath, language),
      this.eslintMCP.analyze(targetPath),
      this.lighthouseMCP.analyze(targetPath)
    ]);
    return this.universalParser.parseAll([semgrepResults, eslintResults, lighthouseResults]);
  }
}
```

### 3. MCP Wrappers Already Created
- `/packages/agents/src/mcp-wrappers/semgrep-mcp.ts` ✅
- `/packages/agents/src/mcp-wrappers/eslint-mcp.ts` ✅
- `/packages/agents/src/mcp-wrappers/lighthouse-mcp.ts` ✅

### 4. Enhanced Agents Already Created
- `/packages/agents/src/specialized/enhanced-security-agent.ts` ✅
- `/packages/agents/src/specialized/enhanced-code-quality-agent.ts` ✅
- `/packages/agents/src/specialized/enhanced-performance-agent.ts` ✅
- `/packages/agents/src/specialized/educator-agent.ts` ✅

## ✅ COMPLETED IN THIS SESSION

### 1. ✅ Created MCP Orchestration Service
**Path:** `/packages/agents/src/standard/services/mcp-orchestration-service.ts`
- Replaces all DeepWiki calls with MCP tool calls
- Runs Semgrep, ESLint, Lighthouse in parallel
- Supports branch comparison
- Language-specific tool selection

### 2. ✅ Created Issue Comparison Service (ENHANCED)
**Path:** `/packages/agents/src/standard/services/issue-comparison-service.ts`
- **Proper 3-category classification:**
  - **Resolved/Fixed Issues**: Exist in main but NOT in PR (user fixed them ✅)
  - **Existing Issues**: Present in both branches (pre-existing, not user's fault)
  - **New Issues** with critical sub-categorization:
    - **In Diff Lines**: Issues directly in changed lines (user introduced ❌)
    - **In Changed Files**: Issues in modified files but outside diff lines (user should have cleaned ⚠️)
- Intelligent fuzzy matching for moved code
- Git diff integration for precise categorization
- Simple binary decision: BLOCK if any critical/high issues, APPROVE otherwise
- Levenshtein distance for similarity matching

### 3. ✅ Created Git Diff Service
**Path:** `/packages/agents/src/standard/services/git-diff-service.ts`
- GitHub API integration
- Fallback to git commands
- Detailed line-level change tracking
- PR metadata retrieval

## Next Steps for New Session

### 1. Update Orchestrator
```typescript
// Remove all DeepWiki imports and references
// Replace with MCPOrchestrationService
const [comparisonResult, educationalContent] = await Promise.all([
  this.issueComparisonService.compare(mainMCPResults, prMCPResults, gitDiff),
  this.educatorAgent.generateContent(allMCPResults, developerProfile)
]);
```

### 4. Test with Real PR (NO DEEPWIKI MOCK)
```bash
cd /Users/alpinro/Code Prjects/codequal/packages/agents
npx ts-node test-mcp-orchestrator-flow.ts
```

## Environment Variables Needed
```bash
export GITHUB_TOKEN=<token_for_api_calls>
# NO DeepWiki variables - we're using MCP tools
```

## Quick Start Commands for Next Session
```bash
# 1. Navigate to working directory
cd /Users/alpinro/Code Prjects/codequal/packages/agents

# 2. Check MCP wrappers
ls -la src/mcp-wrappers/

# 3. Create MCP orchestration service first
touch src/standard/services/mcp-orchestration-service.ts

# 4. Update orchestrator to use MCP
# Remove DeepWiki imports from comparison-orchestrator.ts

# 5. Test the MCP flow (NO MOCK NEEDED)
npm run build
npx ts-node test-mcp-orchestrator-flow.ts
```

## Important Notes
- **NO MORE DEEPWIKI** - All analysis comes from MCP tools
- **Parallel execution** - Comparison + Educator run simultaneously
- **Smart Issue Categorization**:
  - **Resolved Issues**: Good - user fixed these ✅
  - **Existing Issues**: Neutral - pre-existing, not introduced by PR
  - **New in Diff Lines**: Bad - user directly introduced these ❌
  - **New in Changed Files**: Bad - user should have cleaned these while working on the file ⚠️
- **File-Level Responsibility**: If you modify a file, you're responsible for cleaning up ALL issues in it
- **Universal parser** - Standardizes all MCP tool outputs

## PR Review Philosophy
When a developer modifies a file, they should:
1. Fix the specific issue they're addressing
2. Clean up any other issues in that file (Boy Scout Rule: "Leave the code cleaner than you found it")
3. Not introduce new issues in their changes

The comparison service enforces this by separately tracking:
- Issues directly introduced (in diff lines) 
- Issues that should have been cleaned up (in changed files but outside diff lines)