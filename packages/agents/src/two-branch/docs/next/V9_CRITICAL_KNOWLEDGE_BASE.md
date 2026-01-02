# V9 CRITICAL KNOWLEDGE BASE (Condensed)
**Last Updated: December 31, 2025**
**For detailed session history, see: [V9_SESSION_ARCHIVE.md](./V9_SESSION_ARCHIVE.md)**

---

## 📋 Tier Differentiation & API Documentation (Session 68)

### Tier Feature Matrix (FINAL - Updated Session 70)

| Feature | BASIC | PRO | Notes |
|---------|-------|-----|-------|
| Issue detection | ✅ | ✅ | Same analysis |
| Educational content | ✅ | ✅ | Based on found issues |
| Business impact analysis | ✅ | ✅ | Same metrics |
| Historical PR analytics | ✅ | ✅ | Same |
| XP & Level progress | ✅ | ✅ | PRO earns more via auto-fix |
| Achievements | ✅ | ✅ | Same |
| Skills tracking | ✅ | ✅ | Same |
| **IDE exports (SARIF, GitLab)** | ✅ | ❌ | BASIC needs IDE to fix |
| **Pattern contribution** | ✅ (opt-in) | ✅ (auto) | BASIC: manual +50 XP |
| **Auto-fix** | ❌ | ✅ | AI compute cost |
| **Fix verification** | ❌ | ✅ | Re-scan + regression check |
| **Commit integration** | ❌ | ✅ | Direct apply |

### Key Decisions (Updated Session 70)
- **Gamification for ALL tiers**: XP, achievements, skills - keeps users engaged
- **Educational resources for ALL tiers**: Same content based on found issues
- **IDE exports ONLY for BASIC**: BASIC users need IDE help to fix manually
- **PRO fixes directly**: No IDE needed, CodeQual applies fixes
- **Pattern contribution**: BASIC = opt-in (+50 XP), PRO = automatic
- **Auto-fix is the killer PRO feature**: Clear value proposition, real compute cost

### API Documentation (Swagger)

**File**: `apps/api/src/docs/v9-unified-report-endpoints.yaml` (850+ lines)

**Endpoints documented**:
```
/api/v9/analyze          - Start/get V9 analysis
/api/v9/analyze/:id/issues - Filtered issues
/api/v9/reports          - Generate/get unified reports
/api/v9/reports/:id/export/:format - Export (SARIF, GitLab, etc.)
/api/v9/users/:id/preferences - User preferences
/api/v9/users/:id/history - Analysis history (ALL tiers)
/api/v9/users/:id/skills - Skills & achievements (ALL tiers)
```

**Access Swagger UI**: `http://localhost:8080/api/docs`

### Cross-Language API Test

**File**: `tests/integration/test-v9-api-cross-language.ts`

Tests 7 languages × 2 tiers = 14 test combinations:
- Java, TypeScript, Python, Go, Rust, Ruby, PHP
- Validates: gamification, historical data, tier-specific sections

```bash
# Run test
DRY_RUN=true npx ts-node tests/integration/test-v9-api-cross-language.ts
```

---

## 🌐 Cloud Infrastructure & Tool Verification (Session 63)

### Oracle Cloud Instance
- **IP**: 129.213.49.128
- **User**: opc
- **SSH Key**: `/Users/alpinro/CodePrjects/codequal/keys/oracle/ssh-key-2025-10-07.key`
- **Architecture**: ARM64 (Oracle A1.Flex)

### dependency-check Configuration (PERMANENT)

**Properties File**: `/home/opc/dependency-check/dependency-check.properties`
```properties
data.driver_name=org.postgresql.Driver
data.connection_string=jdbc:postgresql://localhost:5432/depcheck
data.user=depcheck_scanner
data.password=depcheck123
```

**Wrapper Script**: `/home/opc/bin/dc-scan`
```bash
# Usage - automatically uses PostgreSQL with 211K CVEs
dc-scan /path/to/project --format JSON --out /tmp/report

# Example
dc-scan /tmp/my-app --format JSON --out /tmp/dc-report
```

**CVE Database Stats**:
- **Total CVEs**: 211,304
- **Latest entries**: CVE-2025-* (up to date)
- **Analysis time**: ~9 seconds per scan

### Verified Working Tools (Cloud)

| Tool | Location | Type | Verified |
|------|----------|------|----------|
| **semgrep** | `/home/opc/.local/bin/semgrep` | Host | ✅ 4+ issues |
| **eslint** | `/opt/codequal-tools/bin/eslint` | Host | ✅ 10 issues |
| **ruff** | `/home/opc/.local/bin/ruff` | Host | ✅ Working |
| **checkstyle** | `/usr/local/bin/checkstyle` | Host | ✅ 35 issues |
| **npm audit** | `/usr/bin/npm` | Host | ✅ 9 vulns |
| **dependency-check** | `/home/opc/dependency-check` | Host+PostgreSQL | ✅ 17 CVEs |
| **bandit** | `lang-python-v4.1-arm` | Docker | ✅ 7 issues |
| **mypy** | `lang-python-v4.1-arm` | Docker | ✅ Available |
| **tsc** | `lang-typescript-v4.6-arm` | Docker | ✅ 2 issues |

### Docker Analyzer Images

```bash
# Available on cloud
codequal/analyzer:lang-javascript-v4.3-arm
codequal/analyzer:lang-python-v4.1-arm
codequal/analyzer:lang-typescript-v4.6-arm
iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm
codeql-runner:latest
```

### Runtimes Installed (Session 63)

| Runtime | Version | Purpose |
|---------|---------|---------|
| **Go** | 1.23.4 | gosec, golangci-lint, govulncheck |
| **Ruby** | 3.0.7 | brakeman, rubocop, bundler-audit |
| **Python** | 3.9.21 | bandit, ruff, checkov, pip-audit |
| **Node.js** | 20.19.5 | eslint, spectral, npm audit |
| **Java** | 25.0.1 LTS | checkstyle, pmd, dependency-check |
| **PHP** | 8.0.30 | phpstan |
| **Rust** | 1.92.0 | cargo-audit |

### All Tools Verified Working (Session 63 - COMPLETE)

#### P0: Critical Security (6 tools)
| Tool | Version | Purpose | Verified |
|------|---------|---------|----------|
| **semgrep** | 1.136.0 | Multi-language SAST | ✅ |
| **gitleaks** | 8.21.2 | Secret scanning | ✅ |
| **trufflehog** | 3.88.3 | Deep secret scanning | ✅ |
| **trivy** | 0.58.0 | Container/IaC | ✅ |
| **grype** | 0.104.2 | SBOM scanning | ✅ |
| **checkov** | 3.2.495 | IaC security | ✅ |

#### P1: Language Security (5 tools)
| Tool | Version | Language | Verified |
|------|---------|----------|----------|
| **bandit** | 1.8.6 | Python | ✅ |
| **gosec** | 2.22.2 | Go | ✅ |
| **brakeman** | 6.2.2 | Ruby/Rails | ✅ |
| **spectral** | 6.15.0 | OpenAPI | ✅ |
| **graphql-cop** | installed | GraphQL | ✅ |

#### P2: Code Quality (11 tools)
| Tool | Version | Language | Verified |
|------|---------|----------|----------|
| **ruff** | 0.14.7 | Python | ✅ |
| **pylint** | 3.3.9 | Python | ✅ |
| **eslint** | 9.39.2 | JavaScript | ✅ |
| **biome** | 2.3.10 | JS/TS | ✅ |
| **rubocop** | 1.82.0 | Ruby | ✅ |
| **phpstan** | 2.1.33 | PHP | ✅ |
| **checkstyle** | 10.21.2 | Java | ✅ |
| **spotbugs** | 4.8.6 | Java | ✅ |
| **staticcheck** | 2025.1.1 | Go | ✅ |
| **golangci-lint** | 1.62.2 | Go | ✅ |
| **pmd** | 7.9.0 | Java/Apex | ✅ |

#### P3: Architecture (10 tools)
| Tool | Version | Language | Verified |
|------|---------|----------|----------|
| **madge** | 8.0.0 | JS/TS | ✅ |
| **dependency-cruiser** | 17.3.4 | JS/TS | ✅ |
| **ts-unused-exports** | installed | TypeScript | ✅ |
| **pydeps** | 3.0.1 | Python | ✅ |
| **import-linter** | 2.5.2 | Python | ✅ |
| **go-arch-lint** | 1.14.0 | Go | ✅ |
| **jdepend** | 2.10 | Java | ✅ |
| **packwerk** | 3.2.1 | Ruby | ✅ |
| **deptrac** | 0.24.0 | PHP | ✅ |
| **cargo-modules** | 0.25.0 | Rust | ✅ |

#### P4: Dependency Scanning (6 tools)
| Tool | Version | Ecosystem | Verified |
|------|---------|-----------|----------|
| **dc-scan** | 12.1.0 | Java (211K CVEs) | ✅ |
| **npm audit** | built-in | Node.js | ✅ |
| **pip-audit** | 2.9.0 | Python | ✅ |
| **bundler-audit** | 0.9.3 | Ruby | ✅ |
| **govulncheck** | 1.1.4 | Go | ✅ |
| **cargo-audit** | 0.22.0 | Rust | ✅ |

#### Fixer Tools (9 tools)
| Tool | Version | Language | Verified |
|------|---------|----------|----------|
| **black** | 25.11.0 | Python | ✅ |
| **isort** | 6.1.0 | Python | ✅ |
| **autoflake** | 2.3.1 | Python | ✅ |
| **pyupgrade** | installed | Python | ✅ |
| **google-java-format** | 1.24.0 | Java | ✅ |
| **prettier** | 3.7.3 | JS/TS | ✅ |
| **gofmt** | built-in | Go | ✅ |
| **rustfmt** | 1.8.0 | Rust | ✅ |
| **sorald** | 0.8.6 | Java | ✅ |

**Total: 49 unique binaries (72 registry entries) verified across 7 runtimes**

> **Note**: The Supabase registry has 72 tool entries, but many share binaries:
> - `semgrep` → 12 entries (semgrep-java, semgrep-ts, etc.)
> - `eslint` → 4 entries (eslint, eslint-ts, eslint-fix, etc.)
> - `ruff` → 3 entries (ruff-check, ruff-fix, ruff-format)
> - Other shared binaries: clippy, golangci-lint, biome

---

## 🔍 Fix Verification & Unfixed Issue Handler (Session 61)

### Overview
Complete post-fix verification pipeline that re-scans fixed code to confirm fixes work, and provides user-friendly guidance for issues that couldn't be auto-fixed.

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| **FixVerifier** | `fix-branch/fix-verifier.ts` | Re-scans with same tool, checks for regressions |
| **UnfixedIssueHandler** | `fix-branch/unfixed-issue-handler.ts` | Records reasons, generates author guidance |

### Fix Verification Flow
```typescript
import { FixVerifier, createFixVerifier } from './fix-branch';

const verifier = createFixVerifier({
  workingDir: '/path/to/repo',
  skipTools: ['deprecated-tool']  // Optional: tools to skip
});

// Register scanner (same tool that found the issue)
verifier.registerScanner(async (file, tool) => {
  return runTool(tool, file);  // Returns Issue[]
});

// Verify a single fix
const result = await verifier.verifyFix(categorizedFix);
// Returns: { fix, verified, issueResolved, regressionsFound, regressedIssues? }

// Verify batch of fixes
const batchResult = await verifier.verifyBatch(fixes);
// Returns: { results[], verifiedFixes[], failedFixes[], summary }
```

### Verification Logic
1. **Re-scan file** with the SAME tool that found the original issue
2. **Check if resolved**: Original issue should NOT appear at same line (±2 lines drift allowed)
3. **Check for regressions**: No NEW issues should appear at the fix location (±5 lines)
4. **Pass/Fail determination**: `verified = issueResolved && !regressionsFound`

### Unfixed Issue Handling
```typescript
import { UnfixedIssueHandler, createUnfixedIssueHandler } from './fix-branch';

const handler = createUnfixedIssueHandler();

// Record an unfixed issue
handler.recordUnfixed(
  { id, ruleId, toolId, file, line, message, severity },
  'verification_failed',  // reason
  { attemptedTiers: ['tier1', 'tier2'], tierFailures: [...] }  // context
);

// Record a verification failure
handler.recordVerificationFailure(categorizedFix, verificationResult);

// Get summary
const summary = handler.getSummary();
// Returns: { total, byReason, byPriority, mergeBlockers, requiresAuthorAction }

// Generate markdown for report
const markdown = handler.generateMarkdown();
```

### Unfixed Issue Reasons

| Reason | Description | Author Action |
|--------|-------------|---------------|
| `no_pattern_match` | No fix pattern in registry | Upgrade to PRO or wait for pattern |
| `cloud_api_failed` | Corgea couldn't generate fix | Manual fix required |
| `ai_generation_failed` | AI couldn't generate reliable fix | Manual fix required |
| `verification_failed` | Fix didn't resolve the issue | Review and fix manually |
| `regression_introduced` | Fix created new issues | Investigate approach |
| `code_context_insufficient` | Not enough context | Provide more code context |
| `complex_refactoring` | Requires architecture change | Plan refactoring |
| `external_dependency` | Issue in external library | Update or fork library |
| `cost_limit_exceeded` | AI cost limit reached | Upgrade tier or reduce scope |
| `timeout` | Fix attempt timed out | Retry or manual fix |

### Integration in FixBranchOrchestrator
```typescript
const orchestrator = new FixBranchOrchestrator({
  repoUrl: 'https://github.com/org/repo',
  prNumber: 123,
  workingDir: '/tmp/repo',
  currentBranch: 'feature/my-pr',
  verifyFixes: true,  // Enable verification
  skipVerificationTools: ['slow-tool']  // Optional
});

// Register tool scanner
orchestrator.registerToolScanner(async (file, tool) => {
  return runTool(tool, file);
});

const result = await orchestrator.orchestrate(issues);
// result.verification: { performed, passed, failed, regressions, details }
// result.unfixedIssues: { total, byReason, mergeBlockers, markdown }
```

### Key Files
```
packages/agents/src/two-branch/fix-branch/
├── fix-verifier.ts           # Fix verification logic
├── unfixed-issue-handler.ts  # Unfixed issue handling
├── fix-branch-orchestrator.ts # Updated with verification
└── index.ts                   # Exports new modules
```

---

## ☁️ Cloud API Fixer Integration (Session 60)

### Overview
Corgea AI Fixer integration for PRO/ENTERPRISE tiers with SARIF conversion and pattern learning.

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **CorgeaFixer** | `cloud-api/corgea-fixer.ts` | Corgea API integration |
| **SARIFConverter** | `cloud-api/sarif-converter.ts` | Issue to SARIF 2.1.0 |
| **CloudAPIOrchestrator** | `cloud-api/api-tool-orchestrator.ts` | Async execution + tier gating |

### Tier 2.5 Flow (Optimized)
```
Tier 2.5A: Pattern Registry (CHECK FIRST - instant, free)
     │
     ▼ (unmatched issues only)
Tier 2.5B: Cloud API (Corgea - PRO/ENTERPRISE only)
     │
     ▼ (successful fixes)
Store as patterns for future reuse
```

### Subscription Tier Gating

| Tier | Cloud Fixers | Max Fixes/Analysis |
|------|--------------|-------------------|
| **BASIC** | ❌ | 0 |
| **PRO** | ✅ Corgea | 50 |
| **ENTERPRISE** | ✅ Corgea | 200 |

### Key Files
```
packages/agents/src/two-branch/tools/cloud-api/
├── index.ts                    # Module exports
├── base-api-tool.ts            # Abstract base class
├── sarif-converter.ts          # SARIF conversion
├── corgea-fixer.ts             # Corgea integration
└── api-tool-orchestrator.ts    # Orchestration
```

---

## 🔐 Security Infrastructure Tools (Session 59)

### Overview
New security tool integrations for secrets, IaC, and container scanning with intelligent infrastructure detection.

### New Tools Integrated

| Tool | Category | Purpose | Output Type |
|------|----------|---------|-------------|
| **Gitleaks** | Secrets | Detect hardcoded secrets | Recommendation-only |
| **TruffleHog** | Secrets | Deep secret scanning | Recommendation-only |
| **Checkov** | IaC Security | Terraform/K8s/CloudFormation | Hybrid (some auto-fix) |
| **Trivy** | Container/IaC | CVE + misconfiguration | Recommendation-only |
| **Grype** | Container | SBOM-based vulnerability | Recommendation-only |

### Infrastructure Auto-Detection
```typescript
import { detectInfrastructure, getSecurityScanConfig } from './utils/framework-detector';

// Detects: docker, kubernetes, terraform, cloudformation, helm, ansible, pulumi, openapi, graphql
const infra = await detectInfrastructure(repoPath);
// Returns: { types: ['docker', 'kubernetes'], detected: true, patterns: {...} }

// Orchestrator uses this to enable appropriate scans
const scanConfig = await getSecurityScanConfig(repoPath);
// Returns: { enableSecrets: true, enableIaC: true, enableContainer: true, detectedInfrastructure: [...] }
```

### Blocker Logic (CRITICAL)
```typescript
// smart-issue-filter.ts
const ALWAYS_BLOCKER_CATEGORIES = ['Secrets', 'secrets'];  // ALWAYS block regardless of severity
const SECURITY_BLOCKER_CATEGORIES = ['Security', 'Infrastructure', 'Container Security'];

// Blocker determination:
// 1. Secrets → ALWAYS block (any severity)
// 2. Security (critical) → Block regardless of code location (configurable via securityCriticalAlwaysBlocks)
// 3. Security (high) → Block only in NEW/EXISTING_MODIFIED code
// 4. Standard critical → Block only in NEW/EXISTING_MODIFIED code
```

### Recommendation-Only Tools
These tools DON'T produce auto-fixable code - they generate AI recommendations instead:
- **Gitleaks/TruffleHog**: "Rotate this credential and remove from git history"
- **Trivy/Grype**: "Update base image or add vulnerability exception with justification"

```typescript
// ai-fix-prompts.ts
const RECOMMENDATION_ONLY_CATEGORIES = ['secrets', 'iac_security', 'container_security'];

// Output format is markdown recommendations, not code patches
export function isRecommendationCategory(category: IssueCategory): boolean {
  return RECOMMENDATION_ONLY_CATEGORIES.includes(category);
}
```

### Subscription Tiers
| Tool | BASIC | PRO |
|------|-------|-----|
| Gitleaks | ✅ | ✅ |
| TruffleHog | ✅ | ✅ |
| Checkov | ✅ | ✅ |
| Trivy | ✅ | ✅ |
| Grype | ✅ | ✅ |
| CodeQL | ❌ | ✅ |

### Key Files
```
src/two-branch/tools/universal/
├── secret-scanner.ts       # Gitleaks/TruffleHog integration
├── iac-scanner.ts          # Checkov/Trivy IaC
├── container-scanner.ts    # Trivy/Grype containers
└── index.ts                # Updated exports

src/two-branch/utils/
├── smart-issue-filter.ts   # Blocker logic with security categories
├── framework-detector.ts   # Infrastructure detection
└── issue-grouping.ts       # Fix tier determination

src/fix-agent/
├── ai-fix-prompts.ts       # Recommendation-only category prompts
└── tool-fix-registry.ts    # New tools registered
```

---

## 🏗️ Framework-Specific Issue Classification (Session 42)

### Overview
New system for handling issues based on framework context. Different frameworks have different "normal" patterns - what's a bug in one framework might be intentional in another.

### Issue Disposition Types
```typescript
type IssueDisposition =
  | 'FIX_NOW'              // Apply fix immediately
  | 'ADD_TO_PATTERNS'      // Fix and save pattern for reuse
  | 'PATTERN_REUSE'        // Apply existing pattern (FREE - no AI call)
  | 'FILTER_OUT'           // Known false positive for framework
  | 'INTENTIONAL_USE'      // Legitimate use, don't fix
  | 'ENVIRONMENT_ISSUE'    // Missing deps/config, not code issue
  | 'MANUAL_REVIEW';       // Requires human decision
```

### Framework Configs
Each framework defines:
- **Intentional Patterns**: Code that looks problematic but is correct for this framework
- **Filter Rules**: Issues to skip based on context (test files, generated code, etc.)
- **Environment Requirements**: What needs to be installed for proper analysis
- **Fix Strategies**: Framework-specific fix approaches

### NestJS Example
```typescript
// CLI tools using child_process - INTENTIONAL, don't fix
{
  ruleId: 'detect-child-process',
  filePatterns: [/cli\//, /scripts\//],
  reason: 'CLI tools intentionally spawn processes'
}

// Missing @nestjs/* modules - ENVIRONMENT issue, not code
{
  ruleId: 'TS2307',
  condition: 'when_missing_deps',
  fixCommand: 'npx lerna bootstrap'
}
```

### Pattern Flywheel Economics
| Phase | Issues | AI Calls | Cost |
|-------|--------|----------|------|
| Week 1 | 1,000 | ~200 | ~$0.60 |
| Month 2 | 1,000 | ~10 | ~$0.03 |
| Month 6+ | 1,000 | ~2 | ~$0.006 |

### Key Files
```
packages/agents/src/fix-agent/
├── types/framework-issue-types.ts       # Type definitions
├── framework-configs/
│   ├── index.ts                         # Config registry
│   └── nestjs-config.ts                 # NestJS rules
└── services/
    └── framework-issue-classifier.ts    # Classification service
```

### Usage
```typescript
import { classifyIssuesForFramework } from './fix-agent/services';

const result = classifyIssuesForFramework(
  issues,
  'nestjs',           // framework
  '/path/to/repo',    // workingDir
  false               // dependenciesInstalled
);

// Result includes:
// - fixableIssues: Issues to actually fix
// - filteredIssues: Issues filtered with reasons
// - costAnalysis: Pattern reuse savings
```

---

## ⚡ CodeQL Performance Optimizations (Session 41)

### Overview
CodeQL runner now features comprehensive performance optimizations with user-configurable settings:

### Default Configuration (Fast Mode)
```typescript
import { CODEQL_DEFAULTS } from './two-branch/tools/universal';

// Defaults optimized for typical PRO tier usage:
{
  threads: 2,                    // Good for shared environments
  querySuite: 'security',        // Faster (~40% less time)
  enableCaching: true,           // Significant speedup on repeat runs
  cacheTTLDays: 7,              // One week cache
  useRamDisk: auto,             // Enabled on Linux
  timeout: 900000,              // 15 minutes
}
```

### Convenience Functions
| Function | Use Case | Performance |
|----------|----------|-------------|
| `runCodeQL()` | Default analysis | Fast + caching |
| `runCodeQLFast()` | One-off runs | Fastest (no caching) |
| `runCodeQLParallel()` | Dedicated environments | Max parallelism |
| `runCodeQLExtended()` | Thorough analysis | ~40% slower, more issues |

### Cache Management
- **TTL**: 7 days (configurable via `cacheTTLDays`)
- **Storage**: ~100-500MB per database
- **Auto-cleanup**: Expired caches removed on startup
- **Manual cleanup**: `clearCodeQLCache()`
- **Stats**: `getCodeQLCacheStats()` for monitoring

### Usage Examples
```typescript
// Fast (default) - ~40% faster
await runCodeQL(workspacePath, 'java');

// Extended (thorough) - more issues detected
await runCodeQLExtended(workspacePath, 'java');

// Custom configuration
await runCodeQL(workspacePath, 'java', {
  querySuite: 'security-extended',
  threads: 4,
  cacheTTLDays: 14,
});
```

### Key Files
```
packages/agents/src/two-branch/tools/universal/
├── codeql-runner.ts     # Main runner with all optimizations
└── index.ts             # Exports (CODEQL_DEFAULTS, runCodeQLExtended, etc.)
```

---

## 🚀 PARALLEL AI FIXER (Session 39 - HIGH-PERFORMANCE FIX EXECUTION)

### Overview
New **two-tier parallel fix system** that dramatically improves fix execution performance:

1. **Template Fixes (Tier 1)**: Fast, deterministic pattern-based fixes from `fix_patterns` table
2. **AI Fixes (Tier 2)**: Parallel AI execution for issues without patterns

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PARALLEL AI FIXER SYSTEM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐   │
│  │ IssueIndex   │◀──▶│ TemplateFixEng  │◀──▶│ Pattern Registry │   │
│  │ (O(1) lookup)│    │ (Tier 1 - FAST) │    │ (Supabase)       │   │
│  └──────┬───────┘    └────────┬────────┘    └──────────────────┘   │
│         │                     │                                     │
│         ▼                     ▼                                     │
│  ┌──────────────┐    ┌─────────────────────────────┐               │
│  │  FileCache   │◀───│ PARTITION:                  │               │
│  │ (In-memory)  │    │ templateFixable | needsAI   │               │
│  └──────┬───────┘    └─────────────┬───────────────┘               │
│         │                          │                               │
│         ▼                          ▼                               │
│  ┌──────────────┐    ┌─────────────────────────────┐               │
│  │  Template    │    │  ParallelAIFixerExecutor    │               │
│  │  Fixes       │    │  (N workers in parallel)    │               │
│  │  (Instant)   │    │  with self-improvement loop │               │
│  └──────┬───────┘    └─────────────┬───────────────┘               │
│         │                          │                               │
│         └──────────────┬───────────┘                               │
│                        ▼                                           │
│               ┌────────────────┐                                   │
│               │  Batch Verify  │                                   │
│               │   Per-File     │                                   │
│               └────────────────┘                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **IssueIndex** | O(1) issue lookup by file/rule/location | `parallel-ai-fixer/issue-index.ts` |
| **FileCache** | In-memory file content caching | `parallel-ai-fixer/file-cache.ts` |
| **TemplateFixEngine** | Pattern-based fixing (Tier 1) | `parallel-ai-fixer/template-fix-engine.ts` |
| **ParallelAIFixerExecutor** | Parallel AI execution (Tier 2) | `parallel-ai-fixer/parallel-executor.ts` |

### Performance Comparison

| Mode | 280 Issues | API Calls | Time | Speedup |
|------|------------|-----------|------|---------|
| Sequential | 280 | 280+ | ~14 min | 1x |
| Parallel Only | 280 | 280+ | ~2.3 min | 6x |
| **Template + Parallel** | 280 | ~170 | ~1.5 min | **9x** |

### Usage

```typescript
import { ParallelAIFixerExecutor, executeParallelAIFixes } from './fix-agent/parallel-ai-fixer';

// Quick fix function
const result = await executeParallelAIFixes({
  workspaceRoot: '/path/to/repo',
  issues: detectedIssues,
  parallelism: 4,
});

// Result: { summary: { total, templateFixed, aiFixed, failed }, files: {...} }
```

---

## 🎯 SELF-IMPROVING PATTERN SYSTEM (Session 38 - KEY DIFFERENTIATOR)

### Overview
CodeQual features a **self-improving fix pattern system** that learns from every successful AI-generated fix. This is our key competitive advantage:

- **PRO tier** generates AI fixes → patterns saved to Supabase → **BASIC tier benefits**
- Every successful fix becomes a reusable pattern
- Pattern library grows with each analysis run
- Cross-session, cross-user pattern sharing

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SELF-IMPROVING PATTERN SYSTEM                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐   │
│  │   PRO User   │───▶│  AI Fix Agent   │───▶│ Pattern Registry │   │
│  │  (New Issue) │    │  (Generates Fix)│    │   (Saves Fix)    │   │
│  └──────────────┘    └─────────────────┘    └────────┬─────────┘   │
│                                                       │             │
│                                                       ▼             │
│                                              ┌────────────────┐     │
│                                              │   Supabase DB  │     │
│                                              │  fix_patterns  │     │
│                                              └────────┬───────┘     │
│                                                       │             │
│         ┌─────────────────────────────────────────────┤             │
│         ▼                                             ▼             │
│  ┌──────────────┐                            ┌──────────────────┐   │
│  │  BASIC User  │◀───────────────────────────│  Pattern Lookup  │   │
│  │ (Same Issue) │   Instant fix, no AI cost  │  (Before AI Gen) │   │
│  └──────────────┘                            └──────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Pattern Lookup First**: Before any AI generation, we check Supabase for existing patterns
2. **AI Generation (PRO)**: If no pattern exists, AI generates fix with self-improvement loop
3. **Pattern Storage**: Successful fixes saved to `fix_patterns` table with:
   - Rule ID (e.g., `javascript.lang.security.detect-child-process`)
   - Tool source (e.g., `semgrep`)
   - Fix template (transformation code)
   - Confidence score
   - Apply/success/revert counts
4. **Pattern Reuse**: Future requests for same rule → instant pattern application

### Tier Differentiation

| Feature | BASIC (Free) | PRO ($8-10/mo) |
|---------|--------------|----------------|
| **Pattern Fixes** | ✅ Reuses existing | ✅ Reuses existing |
| **AI Generation** | ❌ No | ✅ Yes |
| **Pattern Learning** | ❌ No | ✅ Contributes |
| **Coverage** | 70-80% (depends on library) | 99%+ |
| **API Cost** | $0 | ~$0.07/PR |

### Key Files

```
packages/agents/src/fix-agent/fix-pattern-registry/
├── fix-pattern-registry.ts     # Pattern lookup/save logic
├── supabase-pattern-store.ts   # Supabase persistence
├── ai-fixer-verifier.ts        # AI fix generation + verification
├── types.ts                    # FixPattern interface
└── index.ts                    # Exports
```

### Supabase Schema

```sql
CREATE TABLE fix_patterns (
  id UUID PRIMARY KEY,
  rule_id TEXT NOT NULL,           -- e.g., "detect-child-process"
  tool TEXT NOT NULL,              -- e.g., "semgrep"
  name TEXT NOT NULL,
  transformation_type TEXT,        -- "replace", "wrap", "delete"
  fix_template JSONB,              -- The actual fix transformation
  confidence FLOAT,                -- 0.0-1.0
  safe_for_auto_apply BOOLEAN,
  status TEXT,                     -- "active", "pending", "deprecated"
  apply_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  revert_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ
);
```

### Calibration Strategy (CRITICAL for BASIC Tier)

To maximize BASIC tier value, we must grow the pattern library:

1. **TypeScript/JavaScript**: Run on popular repos (React, Vue, Express, NestJS)
2. **Java**: Spring PetClinic, Spring Boot examples, enterprise patterns
3. **Python**: FastAPI, Django, Flask examples
4. **Go**: Popular microservices, Kubernetes tools
5. **Rust**: Common crates, web frameworks

**Target**: 500+ patterns per language before BASIC tier launch

### V5 Test Results (Session 38, Part 4)

```
Total Issues: 282
Auto-Fixed: 243 (99.2% of fixable)
Intentional Uses: 37 (correctly skipped)
True AI Failures: 0
```

**Intentional Use Detection**: Added smart detection for legitimate `child_process` usage (grep, git commands, shell adapters) - these are flagged for security review, not auto-fixed.

---

## QUICK REFERENCE: Key Decisions

### Product Architecture (Session 32)
| Decision | Choice | Notes |
|----------|--------|-------|
| **Two-Tier Model** | BASIC (free) vs PRO ($8-10/mo) | BASIC: pattern-only, PRO: pattern + AI |
| **Tool Selection** | 70% overlap threshold | >=70% REPLACE if better, <70% ADD |
| **AI Enrichment** | Two-stage pipeline | Cheap model prepares, expensive finalizes (40-60% savings) |
| **Caching** | Commit-based | Same commit = instant cached response |
| **Docker Images** | Pre-built only | No runtime npm install |
| **Pattern System** | Self-improving | PRO learns → BASIC benefits |

### Auto-Fix Architecture (Session 61 - COMPLETE)
| Tier | Source | Confidence | Coverage | Notes |
|------|--------|------------|----------|-------|
| **Tier 1** | Native `--fix` | 95-100% | ~60-70% | eslint, prettier, ruff, gofmt |
| **Tier 2** | Dedicated fixers | 85-95% | ~15-20% | Sorald, pyupgrade, semgrep --autofix |
| **Tier 2.5A** | Pattern Registry | 80-90% | Growing | Supabase lookup (FREE, instant) |
| **Tier 2.5B** | Cloud API (Corgea) | 70-85% | PRO only | SARIF → AI fixes → save as patterns |
| **Tier 3** | AI generation | 50-80% | Fallback | Claude/GPT with self-improvement loop |

**Post-Fix Flow (Session 61):**
| Step | Component | Purpose |
|------|-----------|---------|
| 7 | FixVerifier | Re-scan with same tool, check regressions |
| 8 | UnfixedIssueHandler | Record failures with author guidance |
| 9 | FixBranchGenerator | Apply verified fixes, generate review doc |

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

### Parallel AI Fixer (Session 39)
```
packages/agents/src/fix-agent/parallel-ai-fixer/
├── index.ts               # Module exports
├── issue-index.ts         # O(1) issue lookup (byFile, byRule, byLocation)
├── file-cache.ts          # In-memory file content caching
├── template-fix-engine.ts # Pattern-based fixes (Tier 1)
├── parallel-executor.ts   # Parallel AI execution (Tier 2)
└── execute.ts             # Convenience functions (executeParallelAIFixes, quickParallelFix)
```

### Tool Categories (15)
`code_quality`, `security`, `formatting`, `type_checking`, `dependency_vuln`, `dependency_update`, `architecture`, `dead_code`, `code_duplication`, `complexity`, `secrets`, `license`, `performance`, `documentation`, `test_coverage`

---

## 🏗️ PRODUCTION CLOUD ARCHITECTURE (Session 69 - CURRENT VISION)

### Overview
Single Oracle Cloud instance serving as unified API + Analysis server. Tools run directly on host (no Docker containers) for maximum performance.

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                 ORACLE CLOUD INSTANCE (129.213.49.128)                   │
│                        ARM64 A1.Flex - 24GB RAM                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐   ┌─────────────────────────────────────────────┐  │
│  │   API Server    │   │        HOST-NATIVE ANALYSIS TOOLS            │  │
│  │   (Port 3001)   │   │                                              │  │
│  │                 │   │  Security:    semgrep, gitleaks, trivy       │  │
│  │  • Express.js   │   │  Java:        pmd, checkstyle, spotbugs      │  │
│  │  • V9 Routes    │◄─►│  Python:      ruff, bandit, pylint           │  │
│  │  • Async Poll   │   │  JavaScript:  eslint, biome                  │  │
│  │                 │   │  Go:          golangci-lint, gosec           │  │
│  │  Execution:     │   │  Ruby:        rubocop, brakeman              │  │
│  │  4-5 sec/branch │   │  Rust:        clippy, cargo-audit            │  │
│  │                 │   │  PHP:         phpstan                         │  │
│  └────────┬────────┘   └──────────────────────┬──────────────────────┘  │
│           │                                    │                         │
│           │         ┌──────────────────────────┼──────────────┐         │
│           │         │                          │              │         │
│           ▼         ▼                          ▼              ▼         │
│  ┌─────────────────────┐  ┌────────────────────────────────────────┐   │
│  │       Redis         │  │      PostgreSQL (dependency-check)      │   │
│  │   (10.116.0.7)      │  │                                         │   │
│  │                     │  │  • 211,304 CVEs loaded                  │   │
│  │  • Tool output cache│  │  • dc-scan wrapper configured           │   │
│  │  • Analysis state   │  │  • ~9 sec per dependency scan           │   │
│  │  • Pattern registry │  │                                         │   │
│  └─────────────────────┘  └────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Tool Execution** | Host-native (no Docker) | 4-5 sec/branch vs 30+ sec in containers |
| **API + Analysis** | Same server | Reduces latency, simpler deployment |
| **Caching** | Redis (10.116.0.7) | Shared cache for patterns, state, outputs |
| **CVE Database** | PostgreSQL local | 211K CVEs, instant lookups |
| **Languages** | 7 fully tested | Java, Python, JS/TS, Go, Rust, Ruby, PHP |

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Tool execution (per branch) | < 10 sec | 4-5 sec ✅ |
| Full PR analysis (both branches) | < 30 sec | ~10 sec ✅ |
| AI enrichment (PRO tier) | < 60 sec | Pending |
| Report generation | < 5 sec | Pending |
| **Total analysis time** | < 2 min | Target |

### Tool Execution Flow

```
1. API receives PR request
       │
       ▼
2. Clone/checkout repository (cached if recent)
       │
       ├─────────────────────┬─────────────────────┐
       ▼                     ▼                     ▼
3a. Tool scan          3b. Tool scan          3c. Tool scan
    (main branch)          (PR branch)            (both: dep-check)
    ~4-5 sec               ~4-5 sec               ~9 sec
       │                     │                     │
       └─────────────────────┴─────────────────────┘
                             │
                             ▼
4. Compare results → Categorize (NEW/RESOLVED/EXISTING)
       │
       ▼
5. AI Enrichment (PRO) / Pattern Lookup (BASIC)
       │
       ▼
6. Generate Report → Return to API
```

### API Endpoints (V9)

```
POST /api/v9/analyze          - Start analysis (returns 202 + analysisId)
GET  /api/v9/analyze/:id      - Poll status (202 in-progress, 200 complete)
POST /api/v9/reports          - Get unified report with gamification
GET  /api/v9/health           - Health check + cloud service status
```

### Environment Variables (Cloud Instance)

```bash
# API Configuration
PORT=3001
NODE_ENV=production
V9_SIMULATION_MODE=false          # CRITICAL: Set false for real analysis

# Redis (Private Subnet)
REDIS_URL=redis://10.116.0.7:6379

# PostgreSQL (dependency-check)
ORACLE_DEPCHECK_DB_URL=jdbc:postgresql://localhost:5432/depcheck
ORACLE_DEPCHECK_DB_USER=depcheck_scanner
ORACLE_DEPCHECK_DB_PASSWORD=depcheck123

# Supabase
SUPABASE_URL=https://ftjhmbbcuqjqmmbaymqb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<key>

# AI Services (via OpenRouter)
OPENROUTER_API_KEY=<key>
```

### Deployment Commands

```bash
# SSH to instance
ssh -i "keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128

# Deploy API
cd ~/codequal/apps/api
npm run build
pm2 restart codequal-api  # or: node dist/index.js

# Run E2E test
cd ~/codequal/packages/agents
npx ts-node tests/integration/test-v9-lite-e2e.ts
```

### Future Scaling (When Needed)

```
CURRENT: Single Instance (API + Analysis)
         ┌─────────────────┐
         │  129.213.49.128 │
         │  API + Analysis │
         └─────────────────┘

FUTURE: Separate Roles (Higher Load)
         ┌─────────────────┐     ┌─────────────────────────────┐
         │   API Server    │◄───►│   Analysis Worker Pool      │
         │  (lightweight)  │ MQ  │  (2-4 instances, auto-scale)│
         └─────────────────┘     └─────────────────────────────┘
```

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

### Session 61 (Dec 19, 2025) - FIX VERIFICATION & UNFIXED ISSUE HANDLER

**Major Additions:**
1. **FixVerifier** - Re-scans fixed code with same tool to confirm fixes work
2. **UnfixedIssueHandler** - Records reasons + generates author guidance
3. **Orchestrator Integration** - Complete verification pipeline in fix-branch-orchestrator
4. **Cloud API Type Fixes** - Fixed TypeScript errors in SARIF converter

**Key Architecture Changes:**
- `fix-branch-orchestrator.ts`: Added `verifyFixes` config, `registerToolScanner()` method
- `fix-branch/index.ts`: Exports FixVerifier and UnfixedIssueHandler
- `cloud-api/sarif-converter.ts`: Fixed Issue type property mappings
- `cloud-api/base-api-tool.ts`: Fixed unknown type for error response

**New Result Fields:**
```typescript
interface FixOrchestrationResult {
  // ...existing fields...
  verification?: {
    performed: boolean;
    passed: number;
    failed: number;
    regressions: number;
    details?: BatchVerificationResult;
  };
  unfixedIssues: {
    total: number;
    byReason: Record<string, number>;
    mergeBlockers: number;
    markdown: string;
  };
}
```

---

### Session 60 (Dec 19, 2025) - CLOUD API FIXER INTEGRATION

**Major Integrations:**
1. **Corgea AI Fixer** - Cloud-based fix generation for PRO tier
2. **SARIF Converter** - Issue to SARIF 2.1.0 conversion
3. **API Tool Orchestrator** - Async execution + tier gating
4. **Tier 2.5 Routing** - Pattern FIRST, then Cloud API

**Key Files Created:**
- `src/two-branch/tools/cloud-api/corgea-fixer.ts`
- `src/two-branch/tools/cloud-api/sarif-converter.ts`
- `src/two-branch/tools/cloud-api/api-tool-orchestrator.ts`

---

### Session 59 (Dec 19, 2025) - SECURITY INFRASTRUCTURE TOOLS

**Major Integrations:**
1. **Secrets Detection** - Gitleaks + TruffleHog for hardcoded credentials
2. **IaC Security** - Checkov for Terraform, K8s, CloudFormation, Helm
3. **Container Security** - Trivy + Grype for CVE scanning
4. **Infrastructure Detection** - Auto-detect Docker, Kubernetes, Terraform in repos
5. **Security Blocker Logic** - Secrets ALWAYS block, critical security blocks regardless of code location

**Key Architecture Changes:**
- `smart-issue-filter.ts`: New `isBlockerIssue()` function with security-aware logic
- `framework-detector.ts`: Added `detectInfrastructure()` and `getSecurityScanConfig()`
- `issue-grouping.ts`: Updated `inferCategoryFromTool()` for new security tools
- `ai-fix-prompts.ts`: Added recommendation-only categories with markdown output

**Blocker Configuration:**
```typescript
// Default: Critical security issues block regardless of code location
securityCriticalAlwaysBlocks: true

// Secrets ALWAYS block
secretsAlwaysBlock: true
```

---

### Session 53 (Dec 13, 2025) - PYTHON FIXER INTEGRATION & $0 BASIC TIER

**Major Architecture Changes:**

1. **$0 Report Generation (BASIC Tier)**
   - AI enrichment now uses rule-descriptions when `modelConfigResolver=null`
   - Saves $1.50+ per report by avoiding 61 AI API calls
   - File: `src/two-branch/report/ai-enrichment.ts`

2. **Language-Neutral Auto-Fix Detection**
   - `canAutoFix()` returns `true` by default (no hardcoded tool lists)
   - Only specific patterns like `circular-dependency`, `god-class` return `false`
   - Files: `business-impact.ts`, `metadata-footer.ts`, `header-sections.ts`

3. **Python Fixer Tools Integrated into FixOrchestrator**
   - `PipAuditFixerExecutor` - Python dependency vulnerabilities (`pip-audit --fix`)
   - `SemgrepAutoFixExecutor` - Security autofix (`semgrep scan --autofix`)
   - New file: `src/fix-agent/tool-fixers/python-fixer.ts`

4. **BASIC vs PRO Tier in FixOrchestrator**
   - New config: `userTier: 'basic' | 'pro'`
   - BASIC tier: Sets `dryRun: true` automatically (recommendations only)
   - PRO tier: Actually applies fixes
   - New config: `patternStore: PatternStore` for Supabase pattern lookup

5. **Complete Fix Flow**
   ```
   SCAN → GROUP → CHECK PATTERNS → FIXER TOOLS → AI FALLBACK
                       ↓
            Pattern EXISTS? → BASIC: suggest / PRO: apply
                       ↓ (no pattern)
            Fixer Tools → BASIC: dry-run / PRO: apply
                       ↓ (still not fixed)
            AI Fixer → BASIC: recommend / PRO: apply+save
   ```

**Docker Update:**
- `Dockerfile.python-quick` now includes `black` and `isort`

**Python Fixer Tool Stack:**
| Tool | Purpose | Command |
|------|---------|---------|
| ruff | Linting + Security | `ruff check --fix` |
| pip-audit | Dependency vulns | `pip-audit --fix` |
| semgrep | Security autofix | `semgrep --autofix` |
| black | Formatting | `black .` |
| isort | Import sorting | `isort .` |

---

### Session 41 (Dec 7, 2025) - CodeQL PERFORMANCE OPTIMIZATIONS
- **CodeQL Runner v2.0** with comprehensive performance optimizations
- **Fast default**: `querySuite: 'security'` (~40% faster than extended)
- **7-day cache TTL**: Balances storage (~100-500MB) vs rebuild cost
- **Auto-cleanup**: Expired caches removed on startup
- **CODEQL_DEFAULTS** exported for transparency
- **runCodeQLExtended()** for users wanting thorough analysis
- **Convenience functions**: `runCodeQL`, `runCodeQLFast`, `runCodeQLParallel`, `runCodeQLExtended`
- **ARM64 Docker support**: Added QEMU emulation for ARM64 servers

### 🔴 FUTURE: Dedicated x86 Instance for CodeQL (PLANNED)
**Problem**: CodeQL on ARM64 with QEMU emulation takes ~11 minutes for database creation (vs ~1-2 min on native x86).

**Solution**: Create a dedicated x86_64 Oracle Cloud instance for CodeQL:
- **Instance Type**: VM.Standard.E4.Flex (x86_64 AMD)
- **Usage**: Run CodeQL database creation and analysis natively
- **Expected Speedup**: 5-10x faster than QEMU emulation
- **API**: REST endpoint for CodeQL analysis requests

**Current Workaround** (ARM64):
- Docker image: `codeql-runner:latest` (2.5GB with query packs)
- QEMU emulation via `--platform linux/amd64`
- Database creation: ~11 minutes (mostly emulation overhead)
- Analysis: ~30 seconds

**Optimization Strategies**:
1. **Database Caching**: Cache databases by `hash(repo_url + commit_sha + language)` - reuse for same commit
2. **Pre-warming**: Start Docker container during repo cloning
3. **Parallel Database Creation**: Build CodeQL database while other tools run

### Session 39 (Dec 5, 2025) - HIGH-PERFORMANCE ARCHITECTURE
- **Parallel AI Fixer** module created for high-performance fix execution
- **TemplateFixEngine** integrates with fix-pattern-registry
- **Two-tier system**: Template fixes first (fast), then AI fixes (parallel)
- **IssueIndex** for O(1) lookup by file/rule/location
- **FileCache** for in-memory file content caching
- Expected **9x speedup** and **40% reduction in API calls**

### Session 38, Part 4 (Dec 5, 2025) - MAJOR MILESTONE
- **Self-Improving Pattern System** documented and operational
- **99.2% auto-fix success rate** achieved (243/245 fixable issues)
- **Intentional Use Detector** added for child_process
- **0 true AI failures** - all remaining issues are legitimate uses
- **Brace-balancing recovery** in self-improvement loop
- Pattern reuse optimization active

### Session 36 (Dec 3, 2025)
- AI Fixer integration with scan-fix-executor
- Self-improvement loop (3 attempts with verification)
- Pattern storage to Supabase `fix_patterns` table
- Enhanced manifest schema for user actions

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

For detailed session information (26-38), code examples, and historical context, see:
**[V9_SESSION_ARCHIVE.md](./V9_SESSION_ARCHIVE.md)**

Sessions documented:
- **Session 38**: Self-Improving Pattern System (KEY MILESTONE)
- Session 36: AI Fixer Integration, Pattern Storage
- Session 32: Two-Tier Product Architecture
- Session 31: Three-Tier Auto-Fix Architecture
- Session 29: Monorepo Optimization
- Session 28: TypeScript Compilation
- Session 27: GitLab Integration, Fix Validation
- Session 26: LSP/SARIF Auto-Fix

---

## 🧪 FUTURE: End-to-End UX Testing Plan

### Overview (Session 46 Note)
After completing pattern collection for all languages, comprehensive UX testing is required to validate the complete fix implementation flow before production deployment.

### Testing Scope

| Test Area | Description | Priority |
|-----------|-------------|----------|
| **PRO Tier Flow** | AI fix generation + pattern saving | P0 |
| **BASIC Tier Flow** | Pattern-only fixes (no AI) | P0 |
| **Multi-Language** | All P0/P1 languages (JS, TS, Python, Java, Go) | P0 |
| **Provider Integration** | Core CodeQual framework integration | P1 |
| **User Messaging** | Unfixed issue guidance (`getActionableGuidance()`) | P1 |

### Key Test Scenarios

1. **PRO Tier Complete Flow**
   - PR submission → Tool scan → AI fix generation → Pattern storage
   - Verify fix quality and success rates
   - Validate cost tracking

2. **BASIC Tier Pattern-Only**
   - PR submission → Tool scan → Pattern lookup only
   - Verify no AI calls made
   - Validate pattern coverage metrics

3. **Unfixed Issue UX**
   - Environment issues: Clear "npm install" guidance
   - Manual review: Actionable suggestions
   - No pattern available (BASIC): PRO upgrade path

4. **Cross-Language Consistency**
   - Same issue types should have similar UX
   - Error messages consistent across languages
   - Fix confidence display uniform

### Related Code
- `scan-fix-executor.ts`: `getActionableGuidance()` function
- `framework-issue-classifier.ts`: Issue disposition logic
- User-facing messages for all issue types

### When to Execute
- After pattern collection target reached (500+ patterns/language)
- Before BASIC tier public launch
- As part of provider integration milestone

---

## FILES TO READ AT SESSION START

1. **QUICK_START_NEXT_SESSION.md** - Current status and TODO
2. **This file** - Critical rules and decisions
3. **V9_SESSION_ARCHIVE.md** - If you need detailed context
