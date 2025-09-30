# CodeQual V9 Architecture Documentation

**Last Updated**: September 30, 2025
**Status**: Production Ready (95% Complete)
**Cloud Provider**: Oracle Cloud (migrating from DigitalOcean)

---

## 📚 Documentation Index

### Core Architecture
1. **[V9-SYSTEM-OVERVIEW.md](./V9-SYSTEM-OVERVIEW.md)** - Complete system architecture
2. **[V9_WORKING_COMPONENTS.md](./V9_WORKING_COMPONENTS.md)** - Verified components status
3. **[DEPLOYMENT-ARCHITECTURE.md](./DEPLOYMENT-ARCHITECTURE.md)** - **NEW** - Oracle Cloud deployment
4. **[TOOL-EXECUTION-PIPELINE.md](./TOOL-EXECUTION-PIPELINE.md)** - **NEW** - Analysis tools pipeline

### Language-Specific
5. **[../java/README.md](../java/README.md)** - Java tools comprehensive guide
6. **[AGENT_TOOL_LANGUAGE_MATRIX.md](./AGENT_TOOL_LANGUAGE_MATRIX.md)** - All languages coverage

### Infrastructure
7. **[CACHING-STRATEGY.md](./CACHING-STRATEGY.md)** - **NEW** - Database caching architecture
8. **[MONITORING-OBSERVABILITY.md](./MONITORING-OBSERVABILITY.md)** - **NEW** - Grafana integration

---

## 🎯 Quick Start

**First time here?** Read in this order:
1. [V9-SYSTEM-OVERVIEW.md](./V9-SYSTEM-OVERVIEW.md) - Understand the system
2. [DEPLOYMENT-ARCHITECTURE.md](./DEPLOYMENT-ARCHITECTURE.md) - See how it's deployed
3. [../java/README.md](../java/README.md) - Java tools details (most mature)

---

## 🏗️ System Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│ CodeQual V9 Analysis Platform                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GitHub PR → Webhook → API                                 │
│                ↓                                            │
│  ┌──────────────────────────────────────────┐             │
│  │ V9 Repository Manager                     │             │
│  │ - Clone both branches (main + PR)         │             │
│  │ - Smart file selection (< 10k vs > 10k)   │             │
│  │ - Redis caching                           │             │
│  └──────────────────────────────────────────┘             │
│                ↓                                            │
│  ┌──────────────────────────────────────────┐             │
│  │ Tool Execution (Oracle Cloud)             │             │
│  │ ┌────────────────────────────────────┐   │             │
│  │ │ Java: PMD, Checkstyle, Semgrep     │   │             │
│  │ │ Optional: SpotBugs, Dep-Check      │   │             │
│  │ │ - Direct Docker (not K8s)          │   │             │
│  │ │ - Shared cached CVE DB             │   │             │
│  │ │ - 30-60s scans (vs 15-20 min)      │   │             │
│  │ └────────────────────────────────────┘   │             │
│  │                                           │             │
│  │ Python: Pylint, Bandit, MyPy, Safety     │             │
│  │ TypeScript: ESLint, TSC, npm audit       │             │
│  │ Go: golangci-lint, gosec, go vet         │             │
│  └──────────────────────────────────────────┘             │
│                ↓                                            │
│  ┌──────────────────────────────────────────┐             │
│  │ 5 Specialized Agents (Parallel)          │             │
│  │ 1. Security Agent                        │             │
│  │ 2. Quality Agent                         │             │
│  │ 3. Performance Agent                     │             │
│  │ 4. Architecture Agent                    │             │
│  │ 5. Dependency Agent                      │             │
│  └──────────────────────────────────────────┘             │
│                ↓                                            │
│  ┌──────────────────────────────────────────┐             │
│  │ V9 Orchestrator                          │             │
│  │ - Deduplicates issues                    │             │
│  │ - Compares branches (NEW/EXISTING/FIXED) │             │
│  │ - Severity filtering (critical-only)     │             │
│  └──────────────────────────────────────────┘             │
│                ↓                                            │
│  ┌──────────────────────────────────────────┐             │
│  │ AI Enhancement (Parallel)                │             │
│  │ ├─ Educator: Explanations + Learning     │             │
│  │ └─ Fix Generator: AI-generated fixes     │             │
│  └──────────────────────────────────────────┘             │
│                ↓                                            │
│  ┌──────────────────────────────────────────┐             │
│  │ Report Generation                        │             │
│  │ - Ultra-minimal PR comment (3 lines)     │             │
│  │ - Category grouping dashboard            │             │
│  │ - Full V9 issue details                  │             │
│  └──────────────────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Current Status

### Completed (95%)
- ✅ V9 core framework
- ✅ Repository management & caching
- ✅ Smart file selection
- ✅ 5 specialized agents
- ✅ Java tools (PMD, Checkstyle, Semgrep)
- ✅ Dependency-Check caching (95% faster)
- ✅ Oracle Cloud migration
- ✅ Monitoring integration (UnifiedMonitoringService)
- ✅ UX design (Standard vs Enhanced modes)

### In Progress (5%)
- ⏳ SpotBugs parser (90% complete)
- ⏳ Dependency-Check parser (not started)
- ⏳ V9 integration with Java tools

### Planned
- 📋 Python tools integration
- 📋 TypeScript tools integration
- 📋 Go tools integration

---

## 🔧 Key Technologies

### Infrastructure
- **Cloud**: Oracle Cloud (ARM64 VMs)
- **Containers**: Docker (direct, no Kubernetes)
- **Registry**: `iad.ocir.io/codequal/*`
- **Storage**: `/data/` volumes on VMs

### Databases & Caching
- **Redis**: Tool result caching
- **Supabase**: Persistence layer
- **CVE Database**: 3GB shared cached database (H2 + Lucene indexes)

### Monitoring
- **Service**: UnifiedMonitoringService
- **Dashboards**: Grafana
- **Metrics**: Prometheus format

### AI Models
- **Provider**: OpenRouter
- **Models**: Dynamic selection (Claude Sonnet, GPT-4, etc.)
- **Features**: Fix generation, educational content

---

## 📈 Performance Metrics

### Analysis Speed
| Configuration | Time | Notes |
|---------------|------|-------|
| Standard (3 tools) | 2-3 min | PMD + Checkstyle + Semgrep |
| Enhanced (5 tools) | 4-5 min | + SpotBugs + Dependency-Check |
| Dependency-Check alone | 30-60 sec | With caching (vs 15-20 min without) |

### Noise Reduction
- **Before**: 269,228 issues (overwhelming)
- **After**: 141 critical issues (actionable)
- **Reduction**: 99.9%

### Cache Hit Rates
- **Repository**: 85%+ (Redis)
- **CVE Database**: 100% (shared volume)
- **Analysis Results**: 70%+ (Redis)

---

## 🔐 Security & Compliance

### API Keys Required
- ✅ NVD API Key (for Dependency-Check)
- ✅ OpenRouter API Key (for AI features)
- ✅ GitHub/GitLab tokens (for PR access)

### Secrets Management
- Oracle Cloud Secrets (preferred)
- Environment variables (development)
- Never committed to Git

---

## 🚀 Deployment

### Oracle Cloud VM Setup
```bash
# One-command deployment
./scripts/deploy-dependency-check-oracle.sh <vm-ip>

# Manual setup
ssh opc@<vm-ip>
cd /opt/codequal
./setup.sh
```

See [DEPLOYMENT-ARCHITECTURE.md](./DEPLOYMENT-ARCHITECTURE.md) for details.

---

## 📚 Related Documentation

### Java Tools (Most Mature)
- [Java README](../java/README.md) - Complete guide
- [Dependency-Check Caching](../java/DEPENDENCY_CHECK_CACHING_GUIDE.md)
- [SpotBugs Setup](../java/SPOTBUGS_SETUP.md)
- [Severity Filtering](../java/SEVERITY_FILTERING_STRATEGY.md)

### V9 Framework
- [V9 Critical Knowledge Base](../next/V9_CRITICAL_KNOWLEDGE_BASE.md)
- [V9 Canonical Architecture](/V9_CANONICAL_ARCHITECTURE.md)

### User Experience
- [Optional Tools UX Design](../java/OPTIONAL_TOOLS_UX_DESIGN.md)
- [Large Issue List UX](../next/LARGE_ISSUE_LIST_UX.md)

---

## 🐛 Known Issues & Limitations

### Java Tools
- ⚠️  SpotBugs parser 90% complete (needs testing)
- ⚠️  Dependency-Check parser not implemented yet
- ⚠️  V9 integration pending

### Infrastructure
- ⚠️  DigitalOcean registry still referenced in some places
- ⚠️  Kubernetes yamls exist but not used (Direct Docker preferred)

### Other Languages
- ⚠️  Python, TypeScript, Go tools need similar calibration
- ⚠️  Only Java has comprehensive documentation

---

## 🎯 Next Steps

### Immediate (This Week)
1. Complete SpotBugs parser
2. Test SpotBugs on Oracle Cloud
3. Implement Dependency-Check parser
4. V9 integration with Java tools

### Short-term (This Month)
5. Deploy to production Oracle Cloud
6. Configure Grafana dashboards
7. User acceptance testing
8. Python tools calibration

### Long-term (Next Quarter)
9. All languages coverage
10. ML-powered issue detection
11. Advanced caching strategies
12. Multi-cloud support

---

## 📞 Support & Contact

- **Issues**: GitHub Issues
- **Documentation**: This directory
- **Architecture Questions**: Read V9-SYSTEM-OVERVIEW.md first

---

**Last Updated**: September 30, 2025
**Version**: V9.5
**Status**: Production Ready (Java), Other Languages In Progress
