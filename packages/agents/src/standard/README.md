# Standard Framework - Complete Guide

## 🚀 Quick Start

### Run a Complete PR Analysis (Recommended Entry Point)

```bash
# Navigate to the agents package
cd packages/agents

# Run with mock DeepWiki (fast, for testing)
npm run analyze -- --repo https://github.com/vercel/swr --pr 2950 --mock

# Run with real DeepWiki (slower, real analysis)
npm run analyze -- --repo https://github.com/vercel/swr --pr 2950

# Test report generation with pre-defined data
npm run test:report
```

The main entry point is: `src/standard/scripts/run-complete-analysis.ts`

## 📋 Overview

The Standard Framework is a comprehensive PR analysis system that:
- Analyzes pull requests for code quality issues
- Generates detailed reports with actionable feedback
- Tracks developer skills over time
- Makes PR approval/decline decisions based on issue severity

### Current State (as of 2025-08-03)

#### ✅ Working Features
1. **Basic Report Generation** - Full markdown reports with all sections
2. **PR Decision Logic** - Blocks PRs with critical/high issues
3. **Code Snippets** - All issues include problematic code and required fixes
4. **Score Calculation** - Equal weights for new and existing issues
5. **User Identification** - Extracts author info for Supabase storage
6. **DeepWiki Integration** - Real code analysis with mock fallback

#### 🚧 Pending Features
1. **Dynamic Skill Updates** - Update developer skills based on PR analysis
2. **Repository Impact** - Calculate how pre-existing issues affect scores
3. **Supabase Persistence** - Save results to database

## 🏗️ Architecture

```
packages/agents/src/standard/
├── scripts/
│   ├── run-complete-analysis.ts    # 🎯 Main entry point
│   └── deepwiki/
│       └── setup-deepwiki-environment.sh
├── orchestrator/
│   └── comparison-orchestrator.ts  # Orchestrates the analysis flow
├── comparison/
│   ├── comparison-agent.ts         # Core analysis logic
│   ├── report-generator.ts         # Report generation
│   └── skill-calculator.ts         # Skill calculations
├── templates/
│   └── pr-analysis-template.md     # Report template
├── tests/
│   ├── integration/
│   │   ├── test-basic-report-only.ts  # Basic report test
│   │   └── deepwiki/               # DeepWiki integration tests
│   └── reports/
│       └── basic-generation/       # Generated test reports
├── infrastructure/
│   └── factory.ts                  # Dependency injection
└── docs/
    ├── README_COMPLETE.md          # This file
    ├── QUICK_START.md              # Quick reference
    ├── SESSION_SUMMARY_2025_08_03.md
    └── deepwiki/                   # DeepWiki specific docs
```

## 🔧 DeepWiki Integration

### First Time Setup

```bash
# From project root
./setup-deepwiki.sh

# Or manually
./packages/agents/src/standard/scripts/deepwiki/setup-deepwiki-environment.sh
source .env.deepwiki
```

### Running with DeepWiki

```bash
# With real DeepWiki
USE_DEEPWIKI_MOCK=false npm run analyze -- --repo <url> --pr <number>

# With mock (faster for testing)
USE_DEEPWIKI_MOCK=true npm run analyze -- --repo <url> --pr <number>
```

### DeepWiki Resources
- Setup Script: `scripts/deepwiki/setup-deepwiki-environment.sh`
- Documentation: `docs/deepwiki/DEEPWIKI_QUICK_START.md`
- Tests: `tests/integration/deepwiki/`

## 📊 Report Structure

### 1. PR Decision
- **✅ APPROVED** - No critical/high issues found
- **❌ DECLINED** - Critical or high issues must be fixed

### 2. Scoring System
Equal weights for all issues (no discount for old issues):
- **Critical**: -5 points
- **High**: -3 points
- **Medium**: -1 point
- **Low**: -0.5 points

### 3. Report Sections
1. **Executive Summary** - Overall score, metrics, issue distribution
2. **Category Analysis** - Security, Performance, Code Quality, Architecture, Dependencies
3. **PR Issues** - New issues introduced (with code snippets)
4. **Repository Issues** - Pre-existing issues (not blocking but affect scores)
5. **Skills Tracking** - Individual and team progress
6. **Business Impact** - Risk assessment
7. **Action Items** - What must be fixed

### 4. New Team Members
- Start at 50/100 base score
- Receive a "first PR motivation boost" based on PR quality
- Example: PR scores 68/100 → Member gets +4 boost → Final: 54/100

## 🛠️ Common Tasks

### Generate Report for Any PR
```bash
npm run analyze -- --repo <github-url> --pr <number> --mock
```

### Test Report Generation
```bash
npm run test:report
```

### View Generated Reports
```bash
# Test reports
ls src/standard/tests/reports/basic-generation/

# Analysis reports  
ls src/standard/reports/
```

## 📄 Example Reports

### Basic Generation Examples
Located in `tests/reports/basic-generation/`:
- **[critical-pr-report.md](./tests/reports/basic-generation/critical-pr-report.md)** - Example of a DECLINED PR with critical/high issues
- **[good-pr-report.md](./tests/reports/basic-generation/good-pr-report.md)** - Example of an APPROVED PR with only low issues

### Real Analysis Examples
Located in `tests/reports/comparison-agent/`:
- **pr-31616-report-*.md** - Real PR analysis reports
- **pr-31616-comment-*.md** - Generated PR comments

### Skill Evolution Examples
Located in `tests/reports/skill-evolution/`:
- **PR_2900_ANALYSIS.md** - Analysis for PR #2900
- **PR_2950_ANALYSIS.md** - Analysis for PR #2950
- Shows how developer skills evolve between PRs

### Run Specific Tests
```bash
# Basic report generation
npx ts-node src/standard/tests/integration/test-basic-report-only.ts

# DeepWiki integration
npm test src/standard/tests/integration/deepwiki/orchestrator-real-flow.test.ts
```

## 🔑 Environment Variables

```bash
# DeepWiki Configuration
USE_DEEPWIKI_MOCK=true              # Use mock for testing
DEEPWIKI_API_URL=http://localhost:8080
DEEPWIKI_API_KEY=your-key

# Supabase Configuration (if using persistence)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Redis Configuration (if using caching)
REDIS_URL=redis://localhost:6379
```

## 📚 Key Documentation

### Essential Guides
- **[QUICK_START.md](./QUICK_START.md)** - Quick reference for common tasks
- **[SESSION_SUMMARY_2025_08_03.md](./docs/SESSION_SUMMARY_2025_08_03.md)** - Latest changes
- **[deepwiki/DEEPWIKI_QUICK_START.md](./docs/deepwiki/DEEPWIKI_QUICK_START.md)** - DeepWiki setup

### Architecture & Design
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture
- **[pr-decision-logic.md](./docs/pr-decision-logic.md)** - How PR decisions are made
- **[skill-calculation-guide.md](./docs/skill-calculation-guide.md)** - Skill scoring explained

### Implementation Details
- **[SCORE_PERSISTENCE.md](./docs/SCORE_PERSISTENCE.md)** - Database schema
- **[implementation-guide.md](./docs/implementation-guide.md)** - Development guide

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot find module"**
   ```bash
   cd packages/agents
   npm install
   ```

2. **"DeepWiki timeout"**
   - Use `--mock` flag for testing
   - Check DeepWiki pod status: `kubectl get pods -n codequal-dev`

3. **"Supabase error"**
   - Check environment variables
   - Verify Supabase connection

4. **"Report not generating"**
   - Check test data in `test-basic-report-only.ts`
   - Verify template file exists

### Debug Commands

```bash
# Check DeepWiki connection
curl http://localhost:8080/health

# Test basic report generation
npm run test:report

# Run with verbose logging
DEBUG=* npm run analyze -- --repo <url> --pr <number> --mock
```

## 🚀 Next Steps

### For Development
1. Start with `run-complete-analysis.ts` to understand the flow
2. Review pending tasks in todo list
3. Run basic tests to ensure everything works
4. Check `SESSION_SUMMARY_2025_08_03.md` for latest context

### For Production
1. Set up DeepWiki connection
2. Configure Supabase credentials
3. Set up Redis for caching
4. Deploy monitoring dashboard

## 📝 Contributing

When making changes:
1. Update relevant documentation
2. Add tests for new features
3. Run `npm run lint` before committing
4. Update the session summary if making significant changes

## 🔗 Related Resources

- Main API: `packages/api/`
- Database Schema: `packages/database/`
- Core Utilities: `packages/core/`
- Web Interface: `apps/web/`

---

For questions or issues, check the documentation in the `docs/` directory or create an issue in the repository.