# V9 CRITICAL KNOWLEDGE BASE (Condensed)
**Last Updated: November 30, 2025**
**For detailed session history, see: [V9_SESSION_ARCHIVE.md](./V9_SESSION_ARCHIVE.md)**

---

## QUICK REFERENCE: Key Decisions

### Product Architecture (Session 32)
| Decision | Choice | Notes |
|----------|--------|-------|
| **Two-Tier Model** | BASIC (free) vs PRO ($8-10/mo) | BASIC: report only, PRO: auto-fix |
| **Tool Selection** | 70% overlap threshold | >=70% REPLACE if better, <70% ADD |
| **AI Enrichment** | Two-stage pipeline | Cheap model prepares, expensive finalizes (40-60% savings) |
| **Caching** | Commit-based | Same commit = instant cached response |
| **Docker Images** | Pre-built only | No runtime npm install |

### Auto-Fix Architecture (Session 31)
| Tier | Source | Confidence | Coverage |
|------|--------|------------|----------|
| **Tier 1** | Tool native (`--fix`) | HIGH | ~60-70% |
| **Tier 2** | Dedicated fixers | HIGH | ~15-20% |
| **Tier 3** | AI generation | MEDIUM | ~10-15% |

### Language Priority
| Priority | Languages | Status |
|----------|-----------|--------|
| P0 | Python, JavaScript, Java | Ready |
| P1 | TypeScript, Go | Ready/In Progress |
| P2 | Rust, PHP | Planned |
| Deferred | C#, C++, C | Enterprise focus |

---

## CRITICAL RULES

### 1. Decision Options (ONLY 2)
- **APPROVED** - PR can be merged
- **DECLINED** - PR needs changes
- ~~CHANGES_REQUESTED~~ - **DOES NOT EXIST**

### 2. Testing Policy: Oracle Cloud ONLY
**NEVER test locally** - Redis/PostgreSQL not available locally.

```bash
# SSH to Oracle
ssh -i "/Users/alpinro/CodePrjects/codequal/keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128

# Run E2E test
cd ~/codequal/packages/agents
npx ts-node tests/integration/test-v9-lite-e2e.ts
```

### 3. Report Must Have 34 Sections
Executive Summary, Decision, Issue Summary, Detailed Issues, Business Impact, Risk Matrix, Score Calculation, Skills Development, PR Comment, Fix Suggestions, Educational Resources, Phased Plan, Team Skills, Metadata, Performance Metrics, Agent Performance, Tool Metrics, Cost Analysis, Recommended Actions, Resolution Metrics, Progress Tracking, Quality Trends, Achievements, Learning Path, Code Ownership, Technical Debt, Security Posture, Performance Opportunities, Architecture Compliance, Dependency Health, Monitoring Config, CI/CD Status, Sprint Planning, Footer.

### 4. Issue Categories (4 Types)
1. **NEW** - Issues introduced in PR (can block)
2. **RESOLVED** - Issues fixed by PR
3. **EXISTING IN MODIFIED FILES** - Pre-existing in changed files (can block)
4. **EXISTING REST** - Pre-existing in unchanged files (NEVER blocks)

### 5. File Selection Rules
- **< 10,000 files:** Analyze ALL (100% coverage)
- **>= 10,000 files:** Smart selection (~500 files)

### 6. OpenRouter is EVERYTHING
OpenRouter = The ONLY gateway for ALL AI models. Never "fall back to OpenRouter" - we're ALWAYS using it.

---

## CORE FILES

### V9 Production Service
```
packages/agents/src/two-branch/services/v9-pr-analyzer.ts      # Main service
packages/agents/src/two-branch/api/analyze-pr-endpoint.ts      # API endpoint
packages/agents/tests/integration/test-v9-lite-e2e.ts          # Canonical test (Java)
packages/agents/tests/integration/test-v9-typescript-lite-e2e.ts  # TypeScript test
```

### Core Components
```
v9-repository-manager.ts    # Repository cloning/caching
v9-tool-orchestrator.ts     # Tool execution (both branches)
v9-issue-comparator.ts      # NEW/RESOLVED/EXISTING classification
v9-grouped-report-formatter.ts  # Report generation (99.8% cost savings)
smart-file-selector.ts      # File selection for large repos
```

### Tool Categories (15)
`code_quality`, `security`, `formatting`, `type_checking`, `dependency_vuln`, `dependency_update`, `architecture`, `dead_code`, `code_duplication`, `complexity`, `secrets`, `license`, `performance`, `documentation`, `test_coverage`

---

## INFRASTRUCTURE

### Oracle Cloud
```bash
IP: 129.213.49.128
Redis: 10.116.0.7:6379
PostgreSQL: 129.213.49.128:5432/depcheck
Docker Images: analyzer:lang-java-v6.0-arm, analyzer:lang-typescript-v5.0
```

### Dependency-Check PostgreSQL (Auto-configured)
```bash
ORACLE_DEPCHECK_DB_URL=jdbc:postgresql://localhost:5432/depcheck
ORACLE_DEPCHECK_DB_USER=depcheck_scanner
ORACLE_DEPCHECK_DB_PASSWORD=depcheck123
```

### Cleanup Service
| Environment | Delay | Enabled |
|-------------|-------|---------|
| Development | 1h | false |
| Production | 10m | true |
| CI/CD | 5m | true |

---

## TOOL CONFIGURATION

### Tool Registry Interface
```typescript
interface ToolConfiguration {
  id: string;
  language: 'python' | 'typescript' | 'java' | 'go' | 'rust' | 'php';
  category: ToolCategory;
  capabilities: {
    canScan: boolean;
    canFix: boolean;
    fixCoverage: number;  // 0-100%
  };
  dockerImage: string;
  weightedScore: number;
  isActive: boolean;
  lastResearchDate: Date;
  nextResearchDate: Date;  // +90 days
}
```

### Quarterly Research
Every 3 months research both:
1. **AI Models** - Best models for each agent role
2. **Tools** - Best tools for each language/category

---

## RECENT FIXES

### Session 32 (Nov 30, 2025)
- Two-Tier Product Architecture designed
- Tool Registry system defined
- 70% overlap threshold established

### Session 31 (Nov 28, 2025)
- Three-Tier Auto-Fix architecture
- Tool-first approach (AI only 10-15%)
- Fix confidence display

### Earlier Fixes
- BUG-127: PMD JSON output fixed
- BUG-084: Category score filtering
- Runaway cost fix (SimpleOpenRouterClient)
- Universal agent hang fix

---

## COMMON MISTAKES TO AVOID

| Mistake | Correct Approach |
|---------|------------------|
| Testing locally | Test on Oracle Cloud only |
| Creating new test runners | Use canonical tests (test-v9-lite-e2e.ts) |
| Runtime tool installation | Use pre-built Docker images |
| AI generates all fixes | Tools generate 85-90%, AI only fallback |
| Single-branch analysis | Always analyze BOTH branches |
| Hardcoded models | Use Researcher agent for dynamic selection |
| Template-based fixes | AI generates (when needed) |

---

## SESSION ARCHIVE

For detailed session information (26-32), code examples, and historical context, see:
**[V9_SESSION_ARCHIVE.md](./V9_SESSION_ARCHIVE.md)**

Sessions documented:
- Session 32: Two-Tier Product Architecture
- Session 31: Three-Tier Auto-Fix Architecture
- Session 29: Monorepo Optimization
- Session 28: TypeScript Compilation
- Session 27: GitLab Integration, Fix Validation
- Session 26: LSP/SARIF Auto-Fix

---

## FILES TO READ AT SESSION START

1. **QUICK_START_NEXT_SESSION.md** - Current status and TODO
2. **This file** - Critical rules and decisions
3. **V9_SESSION_ARCHIVE.md** - If you need detailed context
