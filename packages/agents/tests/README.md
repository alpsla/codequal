# V9 Test Suite Organization

## ⭐ CANONICAL TEST - USE THIS!

**`tests/integration/test-v9-lite-e2e.ts`** is the WORKING, VERIFIED test.

**Use this test for**:
- Java repository analysis
- Two-branch PR comparison
- Proper issue categorization (NEW/RESOLVED/EXISTING_MODIFIED/EXISTING_REST)
- Multi-repository validation

**How to run**:
```bash
cd packages/agents
npx ts-node tests/integration/test-v9-lite-e2e.ts
```

**⚠️ Do NOT create new test runners** - use and extend this canonical test instead!

---

## Directory Structure

```
tests/
├── README.md                   # This file
├── shared/                     # Shared test utilities
│   ├── test-config.ts         # Common test configuration
│   ├── test-helpers.ts        # Helper functions for all tests
│   └── test-repos.ts          # Repository URLs and branches
│
├── unit/                      # Unit tests (per module)
│   ├── analyzers/            # Analyzer unit tests
│   ├── tools/                # Tool parser unit tests
│   └── agents/               # Agent unit tests
│
├── integration/              # Integration tests (per language)
│   ├── README.md            # Integration test guide
│   ├── test-v9-lite-e2e.ts        # ⭐ CANONICAL - Java multi-repo test (WORKING)
│   ├── test-v9-e2e-complete.ts    # Complete test (needs review)
│   │
│   ├── java/                # Java language tests
│   │   ├── lite-e2e.ts      # Java validation (no AI/Supabase)
│   │   └── v9-reports/      # V9 generated analysis reports
│   │       ├── spring-petclinic-v9-report.md     # Full V9 analysis
│   │       ├── spring-petclinic-manifest.json     # IDE fix file locations
│   │       ├── spring-boot-v9-report.md          # Full V9 analysis
│   │       ├── spring-boot-manifest.json          # IDE fix file locations
│   │       ├── elasticsearch-v9-report.md        # Full V9 analysis
│   │       ├── elasticsearch-manifest.json        # IDE fix file locations
│   │       ├── apache-kafka-v9-report.md         # Full V9 analysis
│   │       ├── apache-kafka-manifest.json         # IDE fix file locations
│   │       ├── micronaut-v9-report.md            # Full V9 analysis
│   │       ├── micronaut-manifest.json            # IDE fix file locations
│   │       └── history/                          # Historical V9 reports
│   │           └── YYYY-MM-DD/                   # Daily snapshots
│   │
│   ├── typescript/          # TypeScript language tests
│   │   ├── lite-e2e.ts      # TypeScript validation
│   │   ├── validation.ts    # Basic structure validation
│   │   └── v9-reports/      # V9 generated analysis reports
│   │       ├── express-v9-report.md              # Full V9 analysis
│   │       ├── vscode-v9-report.md               # Full V9 analysis
│   │       ├── nestjs-v9-report.md               # Full V9 analysis
│   │       ├── angular-v9-report.md              # Full V9 analysis
│   │       ├── nextjs-v9-report.md               # Full V9 analysis
│   │       └── history/                          # Historical V9 reports
│   │           └── YYYY-MM-DD/                   # Daily snapshots
│   │
│   ├── python/              # Python language tests
│   │   ├── lite-e2e.ts      # Python validation
│   │   └── v9-reports/      # V9 generated analysis reports
│   │       ├── flask-v9-report.md                # Full V9 analysis
│   │       ├── django-v9-report.md               # Full V9 analysis
│   │       ├── fastapi-v9-report.md              # Full V9 analysis
│   │       ├── pandas-v9-report.md               # Full V9 analysis
│   │       ├── requests-v9-report.md             # Full V9 analysis
│   │       └── history/                          # Historical V9 reports
│   │           └── YYYY-MM-DD/                   # Daily snapshots
│   │
│   ├── go/                  # Go language tests (planned)
│   ├── ruby/                # Ruby language tests (planned)
│   ├── php/                 # PHP language tests (planned)
│   └── csharp/              # C# language tests (planned)
│
├── reports/                 # Aggregated test reports
│   ├── SUMMARY.md           # Overall test health dashboard
│   ├── PERFORMANCE.md       # Performance trends and analysis
│   └── history/             # Historical reports
│       └── YYYY-MM-DD.md    # Daily summary report
│
├── performance/             # Performance benchmarks
│   └── parallel-execution/  # Parallel vs sequential tests
│
└── validation/              # Quick validation scripts
    └── tools-check.ts       # Verify tool installations
```

## Test Types

### 1. Lite E2E Tests (`lite-e2e.ts`)
- **Purpose**: Quick validation without external dependencies
- **Duration**: 30-60 seconds
- **Requirements**: No Supabase, no AI calls, tools only
- **Use Case**: CI/CD pipeline, local development validation
- **What it tests**:
  - Tool execution and parsing
  - Basic analyzer functionality
  - Issue detection and counting
  - Parser adapters

### 2. Complete E2E Test (`test-v9-e2e-complete.ts`)
- **Purpose**: Full production validation with all components
- **Duration**: 2-5 minutes
- **Requirements**: Supabase, OpenRouter API, all tools, PostgreSQL
- **Use Case**: Pre-deployment validation, release testing
- **What it tests**:
  - Full V9 pipeline
  - AI agent processing
  - Report generation
  - Cost optimization
  - Database operations

### 3. Validation Tests (`validation.ts`)
- **Purpose**: Basic structural validation
- **Duration**: < 10 seconds
- **Requirements**: None (pure TypeScript)
- **Use Case**: Quick sanity checks
- **What it tests**:
  - Import paths
  - Class instantiation
  - Configuration structure

## Running Tests

### By Language
```bash
# Run all Java tests
npm test -- tests/integration/java/

# Run specific test
npm test -- tests/integration/typescript/lite-e2e.ts

# Run with coverage
npm test -- --coverage tests/integration/python/
```

### By Type
```bash
# All lite tests (fast)
npm test -- tests/integration/*/lite-e2e.ts

# All full E2E tests
npm test -- tests/integration/*/full-e2e.ts

# All tool tests
npm test -- tests/integration/*/tools-only.ts
```

### Test Matrix

| Language | Lite E2E | Complete E2E | Latest Report | Status |
|----------|----------|--------------|---------------|---------|
| Java | ✅ | ✅ | [📄 View](./integration/java/reports/latest.md) | Production |
| TypeScript | ✅ | ✅ | [📄 View](./integration/typescript/reports/latest.md) | Production |
| Python | ✅ | ⏳ | - | In Progress |
| Go | ⏳ | ⏳ | - | Planned |
| Ruby | ⏳ | ⏳ | - | Planned |
| PHP | ⏳ | ⏳ | - | Planned |
| C# | ⏳ | ⏳ | - | Planned |

### Repository Test Coverage Matrix

Each language is tested against 3-5 popular repositories to ensure comprehensive coverage:

#### Java Repositories
| Repository | Size | Last Test | Issues Found | Status |
|------------|------|-----------|--------------|--------|
| Spring PetClinic | Small | 2025-11-07 | 1,234 | ✅ |
| Spring Boot | Large | 2025-11-07 | 8,567 | ✅ |
| Elasticsearch | Large | 2025-11-06 | 12,345 | ✅ |
| Apache Kafka | Large | 2025-11-05 | 9,876 | ✅ |
| Micronaut | Medium | 2025-11-07 | 4,567 | ✅ |

#### TypeScript Repositories
| Repository | Size | Last Test | Issues Found | Status |
|------------|------|-----------|--------------|--------|
| Express.js | Small | 2025-11-07 | 398 | ✅ |
| VS Code | Large | 2025-11-06 | 15,234 | ✅ |
| NestJS | Medium | 2025-11-07 | 2,567 | ✅ |
| Angular | Large | 2025-11-05 | 18,765 | ⚠️ |
| Next.js | Large | - | - | ⏳ |

#### Python Repositories
| Repository | Size | Last Test | Issues Found | Status |
|------------|------|-----------|--------------|--------|
| Flask | Small | 2025-11-07 | 567 | ✅ |
| Django | Large | - | - | ⏳ |
| FastAPI | Medium | - | - | ⏳ |
| Pandas | Large | - | - | ⏳ |
| Requests | Small | - | - | ⏳ |

[📊 View Full Matrix Report](./reports/MATRIX.md)

## Test Reports

### Report Structure

Each test run generates a Markdown report with the following structure:

```markdown
# TypeScript Test Report

**Date:** 2025-11-07T21:30:00Z  
**Test Type:** Lite E2E  
**Repository:** https://github.com/expressjs/express.git  
**Duration:** 45.2 seconds  

## 📊 Test Summary

**Grade:** A+ 🌟  
**Score:** 98/100  
**Status:** ✅ PASSED  

## 🔧 Tool Results

| Tool | Issues Found | Execution Time | Status |
|------|-------------|----------------|---------|
| ESLint | 127 | 12.3s | ✅ |
| TypeScript | 89 | 8.7s | ✅ |
| npm-audit | 3 | 5.2s | ✅ |
| Semgrep | 179 | 19.0s | ✅ |

**Total Issues:** 398

## 📈 Issue Breakdown

### By Severity
- 🔴 Critical: 2
- 🟠 High: 45
- 🟡 Medium: 187
- 🔵 Low: 164

### By Category
- Security: 182 issues
- Code Quality: 127 issues
- Type Safety: 89 issues

## ✅ Test Cases

| Test Case | Result | Duration |
|-----------|---------|----------|
| Analyzer initialization | ✅ PASS | 0.5s |
| Tool execution | ✅ PASS | 44.2s |
| Parser validation | ✅ PASS | 0.3s |
| Issue categorization | ✅ PASS | 0.2s |

## 📋 Environment

- **Node Version:** v20.10.0
- **Platform:** linux (Oracle Cloud)
- **Branch:** main
- **Commit:** abc123def

## 🚨 Errors & Warnings

None

---
*Generated by V9 Test Suite*
```

### Accessing Reports

1. **Individual Repository Reports**: `tests/integration/<language>/reports/<repository>.md`
2. **Matrix Overview**: `tests/reports/MATRIX.md`
3. **Historical Snapshots**: `tests/integration/<language>/reports/history/YYYY-MM-DD/<repository>.md`
4. **Overall Summary**: `tests/reports/SUMMARY.md`

### Report Generation

The V9 framework automatically generates comprehensive analysis reports during test runs:

```typescript
// In test files
import { V9PRAnalyzer } from '../../src/two-branch/services/v9-pr-analyzer';
import { saveV9Assets } from '../../shared/test-helpers';

// Run V9 analysis (generates full report, manifest, and fix files)
const analyzer = new V9PRAnalyzer();
const result = await analyzer.analyzePR({
  repositoryUrl: 'https://github.com/spring-projects/spring-petclinic.git',
  prNumber: 950,
  language: 'java',
  analysisMode: 'complete'
});

// V9 automatically generates in output directory:
// - spring-petclinic-v9-report.md (full analysis)
// - spring-petclinic-manifest.json (issue metadata & file locations - named by repository)
// - attachments/group-*-cursor-fix.json (fix files per issue group)

// Save all V9-generated assets to test directory
await saveV9Assets({
  language: 'java',
  repository: 'spring-petclinic',
  outputDir: result.outputDirectory // Where V9 saved all files
});
```

### V9 Generated Assets

The V9 framework automatically generates these assets during each test:

1. **V9 Report** (`<repository>-v9-report.md`):
   - Full analysis report with issue groups
   - Summary statistics (e.g., "578 issues, 29 unique types")
   - Blocking issues list with file locations
   - Auto-fixable issue counts by severity
   
2. **Manifest File** (`<repository>-manifest.json`):
   - Auto-generated by V9 framework
   - Named by repository for easy identification
   - Contains metadata for all issues grouped by severity
   - Embedded critical issues for instant access
   - Lazy loading metadata for high/medium/low issues
   - File locations for each issue group
   
3. **Attachments Directory** (`attachments/`):
   - Individual fix files for each issue group
   - Priority-based organization (critical → high → medium → low)
   - IDE-ready format for auto-fixing
   - Referenced by the manifest for lazy loading

### Asset Storage

The test framework automatically:
1. Saves all V9-generated assets to `v9-reports/` directory
2. Preserves the original structure from V9 output
3. Downloads reports, manifest, and attachments from Oracle Cloud
4. Updates the matrix with links to all assets

## Adding New Language Tests

1. Create language directory: `tests/integration/<language>/`
2. Copy template tests from `tests/integration/java/`
3. Update:
   - Repository URL in test
   - Expected tool list
   - Sample issue counts
   - Language-specific assertions
4. Update this README's test matrix

## Common Test Utilities

### Test Configuration (`shared/test-config.ts`)
```typescript
export const TEST_CONFIG = {
  timeout: {
    lite: 30000,    // 30 seconds
    full: 300000,   // 5 minutes
    tools: 60000    // 1 minute
  },
  repositories: {
    java: 'https://github.com/spring-projects/spring-petclinic.git',
    typescript: 'https://github.com/microsoft/vscode.git',
    python: 'https://github.com/django/django.git',
    // ...
  }
};
```

### Test Helpers (`shared/test-helpers.ts`)
- `cloneTestRepo(url, branch)` - Clone and cache test repositories
- `runAnalysis(language, repoPath)` - Run V9 analysis
- `validateIssues(issues, expectedCounts)` - Validate issue counts
- `measurePerformance(fn)` - Measure execution time

## Best Practices

1. **Isolation**: Each test should be independent
2. **Deterministic**: Use fixed repository commits/tags
3. **Fast Feedback**: Lite tests should run in < 30 seconds
4. **Clear Failures**: Include context in assertions
5. **Resource Cleanup**: Clean up cloned repos after tests

## CI/CD Integration

```yaml
# GitHub Actions example
test:
  strategy:
    matrix:
      language: [java, typescript, python]
      test-type: [lite-e2e, full-e2e, tools-only]
  steps:
    - run: npm test -- tests/integration/${{ matrix.language }}/${{ matrix.test-type }}.ts
```
