# Standard Framework Documentation Index

Welcome to the CodeQual Standard Framework documentation. This directory contains comprehensive documentation organized by topic for easy navigation.

## 📁 Directory Structure

### 🚀 Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - Quick reference guide for common tasks

### 📐 Architecture & Design
Located in [`architecture/`](./architecture/)
- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** - System architecture and component design
- **[pr-decision-logic.md](./architecture/pr-decision-logic.md)** - How PR approval/decline decisions are made
- **[search-decision-flow.md](./architecture/search-decision-flow.md)** - Search strategy decisions
- **[SCORE_PERSISTENCE.md](./architecture/SCORE_PERSISTENCE.md)** - Database schema and persistence strategy

### 🔌 API Documentation
Located in [`api/`](./api/)
- **[API_INTEGRATION_GUIDE.md](./api/API_INTEGRATION_GUIDE.md)** - How to integrate with API services

### 📚 Guides & Best Practices
Located in [`guides/`](./guides/)
- **[REPORT_GENERATION_GUIDE.md](./guides/REPORT_GENERATION_GUIDE.md)** - Comprehensive report generation system
- **[V7_TEMPLATE_CONSISTENCY_GUIDE.md](./guides/V7_TEMPLATE_CONSISTENCY_GUIDE.md)** - V7 template standards

### 🛠️ Implementation Details
Located in [`implementation/`](./implementation/)
- **[implementation-guide.md](./implementation/implementation-guide.md)** - Development and implementation guide
- **[location-enhancement-implementation.md](./implementation/location-enhancement-implementation.md)** - Location tracking implementation
- **[mcp-tool-chain-guide.md](./implementation/mcp-tool-chain-guide.md)** - MCP tool integration guide
- **[skill-calculation-guide.md](./implementation/skill-calculation-guide.md)** - Developer skill scoring explained

### 📅 Planning & Roadmap
Located in [`planning/`](./planning/)
- **[OPERATIONAL-PLAN.md](./planning/OPERATIONAL-PLAN.md)** - Current operational plan and 7-week roadmap
- **[ENHANCEMENT-SUMMARY.md](./planning/ENHANCEMENT-SUMMARY.md)** - Enhancement tracking
- **[CLEANUP_SUMMARY.md](./planning/CLEANUP_SUMMARY.md)** - Cleanup activities

### 🧪 Testing Documentation
Located in [`testing/`](./testing/)
- **[HOW_TO_RUN_REAL_DEEPWIKI_TESTS.md](./testing/HOW_TO_RUN_REAL_DEEPWIKI_TESTS.md)** - DeepWiki testing guide

### 🔍 DeepWiki Integration
Located in [`deepwiki/`](./deepwiki/)
- **[README.md](./deepwiki/README.md)** - DeepWiki integration overview
- **[DEEPWIKI_QUICK_START.md](./deepwiki/DEEPWIKI_QUICK_START.md)** - DeepWiki setup and usage
- **[PRODUCTION_CONFIGURATION.md](./deepwiki/PRODUCTION_CONFIGURATION.md)** - Production deployment guide

### 📝 Session Summaries
Located in [`session_summary/`](./session_summary/)
- **[SESSION_SUMMARY_2025_08_04.md](./session_summary/SESSION_SUMMARY_2025_08_04.md)** - Latest session changes (Report Generation)
- **[SESSION_SUMMARY_2025_08_03.md](./session_summary/SESSION_SUMMARY_2025_08_03.md)** - Previous session changes

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