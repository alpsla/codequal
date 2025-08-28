# Two-Branch Analysis System

This directory contains the complete implementation of CodeQual's two-branch analysis system, which replaces the broken DeepWiki integration with a robust solution that analyzes full repositories on both branches to accurately identify new, fixed, and unchanged issues.

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

## Usage

```typescript
import { TwoBranchAnalyzer } from './core/TwoBranchAnalyzer';

const analyzer = new TwoBranchAnalyzer();
const report = await analyzer.analyzePR(
  'https://github.com/owner/repo',
  123
);

console.log(`New issues: ${report.newIssues.length}`);
console.log(`Fixed issues: ${report.fixedIssues.length}`);
console.log(`Score: ${report.metrics.score}/100`);
```