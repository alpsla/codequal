# Quick Start Guide - PR Analysis System

## Overview

This is the latest version of the PR Analysis system that generates comprehensive reports with:
- PR decision (APPROVED/DECLINED based on critical/high issues)
- Issue categorization with code snippets and required fixes
- Skill tracking for developers
- Score calculations with equal weights for all issues (no discount for old issues)

## Current State (as of 2025-08-03)

### ✅ Working Features
1. **Basic Report Generation** - Generates full markdown reports with all sections
2. **PR Decision Logic** - Correctly blocks PRs with critical/high issues
3. **Code Snippets** - All issues include problematic code and required fixes
4. **Score Calculation** - Equal weights for new and existing issues
5. **User Identification** - Extracts author info for Supabase storage
6. **Test Coverage** - Complete test suite with example PRs

### 🚧 Pending Features
1. **Dynamic Skill Updates** - Update developer skills based on PR analysis
2. **Repository Impact** - Calculate how pre-existing issues affect scores
3. **Supabase Persistence** - Save results to database

## Quick Start

### 1. Run a Complete Analysis (Recommended)

```bash
# Navigate to the standard directory
cd packages/agents/src/standard

# Run with mock DeepWiki (fast, for testing)
npx ts-node scripts/run-complete-analysis.ts --repo https://github.com/vercel/swr --pr 2950 --mock

# Run with real DeepWiki (slower, real analysis)
npx ts-node scripts/run-complete-analysis.ts --repo https://github.com/vercel/swr --pr 2950

# Save to Supabase (requires configuration)
npx ts-node scripts/run-complete-analysis.ts --repo https://github.com/vercel/swr --pr 2950 --save
```

### 2. Run Basic Report Generation Test

```bash
# Test report generation with pre-defined data
npx ts-node tests/integration/test-basic-report-only.ts
```

This will generate two test reports:
- `critical-pr-report.md` - PR with critical/high issues (DECLINED)
- `good-pr-report.md` - PR with only low issues (APPROVED)

### 3. Understanding the Report Structure

The report includes these key sections:

1. **PR Decision** - ✅ APPROVED or ❌ DECLINED
2. **Executive Summary** - Overall score, metrics, issue distribution
3. **Category Analysis** - Security, Performance, Code Quality, Architecture, Dependencies
4. **PR Issues** - New issues introduced (with code snippets)
5. **Repository Issues** - Pre-existing issues (not blocking but affect scores)
6. **Individual & Team Skills** - Developer scoring and progress
7. **Business Impact** - Risk assessment and costs
8. **Action Items** - What must be fixed before merge

## Key Implementation Details

### Scoring System
- **Equal weights for all issues** (no discount for old issues)
  - Critical: -5 points (new or existing)
  - High: -3 points (new or existing)
  - Medium: -1 point (new or existing)
  - Low: -0.5 points (new or existing)

### PR Decision Logic
```typescript
// PR is DECLINED if any critical or high issues are found
const hasBlockingIssues = comparison.newIssues.some(
  issue => issue.severity === 'critical' || issue.severity === 'high'
);
```

### New Team Member Scoring
- Base score: 50/100
- First PR motivation boost: Calculated based on PR quality
- Example: PR scores 68/100 → Member gets +4 boost → Final: 54/100

## File Structure

```
packages/agents/src/standard/
├── scripts/
│   └── run-complete-analysis.ts    # Main entry point
├── orchestrator/
│   └── comparison-orchestrator.ts  # Orchestrates the analysis
├── comparison/
│   ├── comparison-agent.ts         # Core analysis logic
│   ├── report-generator.ts         # Report generation
│   └── skill-calculator.ts         # Skill calculations
├── templates/
│   └── pr-analysis-template.md     # Report template
├── tests/
│   ├── integration/
│   │   └── test-basic-report-only.ts  # Basic report test
│   └── reports/
│       └── basic-generation/       # Generated test reports
└── infrastructure/
    └── factory.ts                  # Dependency injection
```

## Environment Variables

```bash
# Use mock DeepWiki for testing
USE_DEEPWIKI_MOCK=true

# Supabase configuration (if using persistence)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Redis configuration (if using caching)
REDIS_URL=redis://localhost:6379
```

## Common Tasks

### Generate a Report for Any PR
```bash
npx ts-node scripts/run-complete-analysis.ts --repo <github-url> --pr <number> --mock
```

### Test Report Generation
```bash
npx ts-node tests/integration/test-basic-report-only.ts
```

### View Generated Reports
```bash
# Test reports
ls tests/reports/basic-generation/

# Analysis reports
ls reports/
```

## Troubleshooting

1. **"Cannot find module"** - Run `npm install` in the agents package
2. **"DeepWiki timeout"** - Use `--mock` flag for testing
3. **"Supabase error"** - Check environment variables

## Next Steps

When continuing development:
1. Start with `run-complete-analysis.ts` to understand the flow
2. Check `QUICK_START.md` (this file) for current state
3. Review pending todos in the task list
4. Run basic tests to ensure everything works

For questions, check the documentation in the `docs/` directory.