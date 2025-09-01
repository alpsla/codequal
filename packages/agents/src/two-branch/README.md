# Two-Branch Analysis System

This directory contains the complete implementation of CodeQual's two-branch analysis system, which replaces the broken DeepWiki integration with a robust MCP-based solution that analyzes full repositories on both branches to accurately identify new, fixed, and unchanged issues.

## 🚀 Key Achievement: NO MORE DEEPWIKI
All analysis now comes from MCP tools (Semgrep, ESLint, Lighthouse) + Specialized Agents

## Directory Structure

```
two-branch/
├── core/                    # Core components
│   ├── TwoBranchAnalyzer.ts      # Main analyzer orchestrator
│   ├── BranchAnalyzer.ts         # Single branch analysis
│   ├── FileScanner.ts            # Repository file scanning
│   └── RepositoryManager.ts      # Git operations & cloning
│
├── services/                # Business logic services
│   ├── ToolExecutionService.ts   # Tool orchestration
│   ├── IssueComparisonService.ts # Compare branch results
│   ├── MetricsService.ts         # Calculate scores & metrics
│   └── GitHubService.ts          # GitHub API integration
│
├── analyzers/              # Tool-specific analyzers
│   ├── SecurityAnalyzer.ts       # Security tools integration
│   ├── QualityAnalyzer.ts        # Code quality tools
│   ├── DependencyAnalyzer.ts     # Dependency scanning
│   └── PerformanceAnalyzer.ts    # Performance analysis
│
├── comparators/            # Issue comparison logic
│   ├── IssueComparator.ts        # Main comparison engine
│   ├── FingerprintGenerator.ts   # Issue fingerprinting
│   ├── IssueMapper.ts            # Map issues between branches
│   └── DiffAnalyzer.ts           # Analyze changes
│
├── extractors/             # Data extraction
│   ├── IssueExtractor.ts         # Extract issues from tool results
│   ├── ToolResultParser.ts       # Parse different tool formats
│   └── MetadataExtractor.ts      # Extract PR/repo metadata
│
├── reporters/              # Report generation
│   ├── MarkdownReporter.ts       # Generate markdown reports
│   ├── JsonReporter.ts           # Generate JSON reports
│   ├── HtmlReporter.ts           # Generate HTML reports
│   └── SummaryGenerator.ts       # Executive summaries
│
├── cache/                  # Caching layer
│   ├── CacheManager.ts           # Multi-level cache
│   ├── RedisCache.ts             # Redis integration
│   └── MemoryCache.ts            # In-memory cache
│
├── types/                  # TypeScript definitions
│   ├── index.ts                  # All type exports
│   ├── issues.ts                 # Issue-related types
│   ├── analysis.ts               # Analysis types
│   └── tools.ts                  # Tool-related types
│
├── utils/                  # Utilities
│   ├── logger.ts                 # Logging utility
│   ├── errors.ts                 # Custom error classes
│   └── helpers.ts                # Helper functions
│
├── tests/                  # Tests
│   ├── integration/              # Integration tests
│   ├── unit/                     # Unit tests
│   └── fixtures/                 # Test fixtures
│
└── index.ts                # Main exports
```

## Key Components

### 1. TwoBranchAnalyzer
The main orchestrator that coordinates the entire analysis process:
- Clones repositories
- Analyzes both branches
- Compares results
- Generates reports

### 2. IssueComparator
Compares issues between branches to identify:
- **New Issues**: Present in PR but not in main
- **Fixed Issues**: Present in main but not in PR
- **Unchanged Issues**: Present in both branches

### 3. ToolExecutionService
Manages parallel execution of all analysis tools:
- Leverages existing ParallelToolExecutor
- Handles tool selection based on languages
- Manages tool priorities and dependencies

### 4. CacheManager
Multi-level caching for performance:
- L1: In-memory cache (fastest)
- L2: Redis cache (persistent)
- L3: Vector DB (semantic search)

## Integration with Existing Components

This system integrates with existing infrastructure:
- **ParallelToolExecutor** from `mcp-hybrid/src/integration/`
- **Tool Adapters** from `mcp-hybrid/src/adapters/`
- **Agent Framework** from `agents/src/base/`
- **Redis & Supabase** for storage

## 🔄 Complete Analysis Flow with File Paths

### Phase 1: Git Operations & Setup
```
1. GitHub PR Request
   ↓
2. `/services/git-diff-service.ts` 
   - Fetches PR metadata via GitHub API
   - Gets list of changed files
   - Extracts line-level diff details
   ↓
3. `/core/RepositoryManager.ts`
   - Clones repository
   - Checks out main branch
   - Checks out PR branch
```

### Phase 2: MCP Tool Execution (Parallel for Both Branches)
```
4. `/services/mcp-orchestration-service.ts`
   - Coordinates all MCP tools
   - Runs tools on BOTH branches in parallel
   ↓
5. MCP Tool Wrappers (from `/mcp-wrappers/`)
   - `/mcp-wrappers/semgrep-mcp.ts` → Security scanning
   - `/mcp-wrappers/eslint-mcp.ts` → Code quality (JS/TS)
   - `/mcp-wrappers/lighthouse-mcp.ts` → Performance metrics
   ↓
6. `/parsers/UniversalToolParser.ts`
   - Standardizes all tool outputs
   - Creates StandardizedFinding objects
```

### Phase 3: Specialized Agent Analysis
```
7. Specialized Agents (from `/specialized/`)
   - `/specialized/enhanced-security-agent.ts`
   - `/specialized/enhanced-code-quality-agent.ts`
   - `/specialized/enhanced-performance-agent.ts`
   - Each agent enriches findings with context
```

### Phase 4: Comparison & Education (Parallel)
```
8a. COMPARISON PATH:
    `/services/issue-comparison-service.ts`
    - Categorizes issues into:
      * Resolved (in main, not in PR) ✅
      * Existing (in both branches) ⚠️
      * New in diff lines (user introduced) ❌
      * New in changed files (should have cleaned) ❌
    - Uses git diff to filter by changed files/lines
    - Makes binary decision: BLOCK or APPROVE

8b. EDUCATOR PATH (Parallel):
    `/specialized/educator-agent.ts`
    - Generates learning materials
    - Creates improvement suggestions
    - Provides resources
```

### Phase 5: Enhanced Reporting
```
9. `/services/enhanced-comparison-service.ts`
   - Receives reports from ALL specialized agents
   - Preserves complete metadata:
     * Title, description, location
     * Code snippets (before/issue/after)
     * Recommendations with examples
   - Groups by category (Security, Performance, etc.)
   - Calculates severity scores per category
```

### Phase 6: Orchestration & Final Report
```
10. `/orchestrators/mcp-based-orchestrator.ts`
    - Main entry point
    - Coordinates entire flow
    - Manages parallel execution
    - Tracks skill impact
    ↓
11. `/reporters/ReportGeneratorV9.ts`
    - Generates HTML report
    - Creates markdown summary
    - Produces JSON output
```

## 🎯 Issue Categorization Logic

### The Three Categories (User's Requirement)
1. **RESOLVED/FIXED Issues** ✅
   - Exist in main branch but NOT in PR branch
   - User fixed these (good!)
   - Example: Security issue was in main, user removed vulnerable code

2. **EXISTING Issues** ⚠️
   - Present in BOTH branches
   - Pre-existing, not introduced by PR
   - Don't block PR but impact skill scores
   - Example: Legacy code smell that wasn't touched

3. **NEW Issues** ❌ (Two Sub-categories)
   - **In Diff Lines**: Directly in changed lines
     - User directly introduced these
     - Example: Added vulnerable regex in new code
   - **In Changed Files**: In modified files but outside diff lines
     - User should have cleaned these (Boy Scout Rule)
     - Example: File has existing issues, user modified file but didn't clean

### Decision Logic (Binary)
```typescript
if (newIssuesInDiffLines.critical > 0 || newIssuesInDiffLines.high > 0 ||
    newIssuesInChangedFiles.critical > 0 || newIssuesInChangedFiles.high > 0) {
  return 'BLOCK';
} else {
  return 'APPROVE';
}
```

## Usage

```typescript
import { MCPBasedOrchestrator } from './orchestrators/mcp-based-orchestrator';

const orchestrator = new MCPBasedOrchestrator({
  parallel: true,           // Run comparison + educator in parallel
  includeEducator: true,    // Generate educational content
  trackSkills: true         // Track skill impact scores
});

const result = await orchestrator.analyzePullRequest(
  'https://github.com/owner/repo',
  123  // PR number
);

// Access categorized issues
console.log(`Fixed issues: ${result.comparison.resolvedIssues.length}`);
console.log(`Existing issues: ${result.comparison.existingIssues.length}`);
console.log(`New in diff: ${result.comparison.newIssues.inDiffLines.length}`);
console.log(`New in files: ${result.comparison.newIssues.inChangedFiles.length}`);

// Binary decision
console.log(`Decision: ${result.comparison.summary.recommendation.severity}`); // 'approve' or 'block'
```

## 🧪 Testing

```bash
# Test complete flow (with mock data for speed)
npx ts-node test-two-branch-complete-flow.ts

# Test with real MCP tools (requires tools installed)
GITHUB_TOKEN=your_token npx ts-node test-two-branch-complete-flow.ts
```

## 📝 Key Design Principles

1. **No DeepWiki**: All analysis from MCP tools
2. **Parallel Execution**: Comparison + Educator run simultaneously
3. **Boy Scout Rule**: "Leave code cleaner than you found it"
4. **Binary Decisions**: Only APPROVE or BLOCK (no middle ground)
5. **Full Metadata**: Every issue has complete context and recommendations
6. **Skill Tracking**: Existing issues impact developer skill scores