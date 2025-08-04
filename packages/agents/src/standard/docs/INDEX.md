# Documentation Index

## 📚 Available Documentation

### Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - Quick reference guide for common tasks
- **[session_summary/SESSION_SUMMARY_2025_08_04.md](./session_summary/SESSION_SUMMARY_2025_08_04.md)** - Latest session changes (Report Generation)
- **[session_summary/SESSION_SUMMARY_2025_08_03.md](./session_summary/SESSION_SUMMARY_2025_08_03.md)** - Previous session changes

### Architecture & Design
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and component design
- **[pr-decision-logic.md](./pr-decision-logic.md)** - How PR approval/decline decisions are made
- **[skill-calculation-guide.md](./skill-calculation-guide.md)** - Developer skill scoring explained
- **[REPORT_GENERATION_GUIDE.md](./REPORT_GENERATION_GUIDE.md)** - Comprehensive report generation system

### Implementation
- **[implementation-guide.md](./implementation-guide.md)** - Development and implementation guide
- **[SCORE_PERSISTENCE.md](./SCORE_PERSISTENCE.md)** - Database schema and persistence strategy
- **[API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)** - How to integrate with API services

### DeepWiki Integration
- **[deepwiki/README.md](./deepwiki/README.md)** - DeepWiki integration overview
- **[deepwiki/DEEPWIKI_QUICK_START.md](./deepwiki/DEEPWIKI_QUICK_START.md)** - DeepWiki setup and usage
- **[deepwiki/PRODUCTION_CONFIGURATION.md](./deepwiki/PRODUCTION_CONFIGURATION.md)** - Production deployment guide

## 📄 Example Reports

### Generated Test Reports
- **[Basic Generation](../tests/reports/basic-generation/)** - Example reports showing APPROVED vs DECLINED PRs
  - `critical-pr-report.md` - PR with critical/high issues (DECLINED)
  - `good-pr-report.md` - PR with only low issues (APPROVED)

### Real Analysis Reports
- **[Comparison Agent](../tests/reports/comparison-agent/)** - Real PR analysis examples
  - `pr-31616-report-*.md` - Full analysis reports
  - `pr-31616-comment-*.md` - GitHub PR comments

## 🎯 Quick Links

### For New Users
1. Start with the main [README.md](../README.md)
2. Follow [QUICK_START.md](./QUICK_START.md) for hands-on examples
3. Run `npm run test:report` to see it in action

### For Developers
1. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
2. Check [implementation-guide.md](./implementation-guide.md) for coding standards
3. See [session_summary/SESSION_SUMMARY_2025_08_04.md](./session_summary/SESSION_SUMMARY_2025_08_04.md) for latest changes
4. Read [REPORT_GENERATION_GUIDE.md](./REPORT_GENERATION_GUIDE.md) for report system details

### For DeepWiki Setup
1. Follow [deepwiki/DEEPWIKI_QUICK_START.md](./deepwiki/DEEPWIKI_QUICK_START.md)
2. Use the setup script: `./scripts/deepwiki/setup-deepwiki-environment.sh`
3. Check [deepwiki/PRODUCTION_CONFIGURATION.md](./deepwiki/PRODUCTION_CONFIGURATION.md) for deployment