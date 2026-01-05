# Quick Start - Next Session

**Last Updated**: Session 75 (January 4, 2026)
**Current Phase**: V9 Two-Branch Analysis - Dynamic Rate Limiting Complete
**Status**: All Session 75 priorities completed locally (pending deployment)

---

## Session 75 Completed

### Major Features Implemented

1. **Dynamic Timeout System (P0)**
   - Timeouts now calculated based on tool type AND repository size
   - Heavy tools (SpotBugs, Clippy): 180s base timeout
   - Light tools (ESLint, Ruff): 30s base timeout
   - Repo size multipliers: small (1x), medium (2x), large (4x), enterprise (8x)
   - Example: SpotBugs on enterprise repo = 180s × 8 = 24 minutes
   - File: `packages/agents/src/fix-agent/fix-pattern-registry/tool-revalidator.ts`

2. **Per-Tool Concurrency Limits**
   - Each tool has its own max concurrent limit
   - Heavy tools (SpotBugs, Clippy): max 2 concurrent
   - Medium tools (PMD, TSC, Mypy): max 4 concurrent
   - Light tools (ESLint, Ruff): max 8 concurrent
   - Prevents resource contention for expensive tools

3. **CPU-Aware Global Limits**
   - Global concurrent limit = 75% of available CPUs
   - Automatically scales with server hardware
   - Uses `os.cpus().length` for detection

4. **User Tier Quotas**
   - Basic: 30/min, 3 concurrent
   - Pro: 100/min, 10 concurrent
   - Enterprise: 500/min, 50 concurrent
   - Quotas respect CPU-aware maximums

5. **Environment-Based Configuration**
   - `CODEQUAL_USER_TIER`: basic | pro | enterprise
   - `CODEQUAL_REPO_SIZE`: small | medium | large | enterprise
   - `CODEQUAL_ESTIMATED_LINES`: number (auto-classifies size)
   - `CODEQUAL_MAX_PER_MINUTE`: override max per minute
   - `CODEQUAL_MAX_CONCURRENT`: override max concurrent
   - `CODEQUAL_TIMEOUT_MS`: override base timeout

### Files Modified (Session 75)

| File | Changes |
|------|---------|
| `tool-revalidator.ts` | Dynamic timeouts, per-tool limits, user tiers, env config |

---

## Session 74 Completed (Previous)

### Major Features Implemented

1. **Security Hardening (P0 - Critical)**
   - Secure file permissions: Mode 0600 for temp files, 0700 for temp directories
   - Command injection prevention: Replaced shell execution with `spawn` + args array
   - Path traversal prevention: Validates temp file paths stay within allowed directory
   - Secure random filenames using `crypto.randomBytes()`

2. **Tool Availability Detection**
   - Added `checkToolAvailability()` - checks if tools (PMD, ESLint, Ruff, etc.) are installed
   - 5-minute cache to avoid repeated checks

3. **ESLint/TypeScript Configuration (P1)**
   - Added `--no-config-lookup` flag for standalone temp file validation
   - Relaxed TSC flags for isolated file checking

4. **JSON Output Parsing Improvements (P1)**
   - New `extractJSON()` with 3 extraction strategies
   - Expanded tool-specific parsers (Mypy, Clippy, Brakeman, PHPStan, etc.)

5. **Code Snippet Improvements (P2)**
   - GitHub API fallback when local files unavailable
   - 5-minute content cache to reduce API calls

6. **Identical Code Detection (P2)**
   - Added `calculateSimilarity()` using Levenshtein distance
   - Detects when before/after code samples are >95% similar

### Commits Created (Session 74)

| Commit | Description |
|--------|-------------|
| `6a909a5b` | feat(session-74): Security hardening and code snippet improvements |

---

## Session 76 TODO

### P0: Deploy and Run Full Multi-Language Test Suite

#### Step 1: Deploy to Oracle Cloud
```bash
ssh -i "keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128
cd ~/codequal && git pull && npm run build && npx pm2 restart codequal-api
```

#### Step 2: Run All 7 Languages × 2 Tiers Test
```bash
cd ~/codequal/packages/agents
npx ts-node tests/integration/test-v9-2tier-all-languages.ts
```

**Expected Test Matrix (14 tests total):**

| Language | BASIC Tier | PRO Tier | Test Repo |
|----------|-----------|----------|-----------|
| Java | ✓ Test | ✓ Test | spring-projects/spring-petclinic |
| TypeScript | ✓ Test | ✓ Test | expressjs/express |
| Python | ✓ Test | ✓ Test | pallets/flask |
| Go | ✓ Test | ✓ Test | gin-gonic/gin |
| Rust | ✓ Test | ✓ Test | tokio-rs/tokio |
| Ruby | ✓ Test | ✓ Test | sinatra/sinatra |
| PHP | ✓ Test | ✓ Test | laravel/framework |

#### Step 3: Collect Timing Metrics
After tests complete, check the rate limit monitoring output:
```
[ToolRevalidator] Execution Metrics Summary:
  pmd:medium: avg=XXms, p95=XXms, max=XXms, timeouts=0/N
  eslint:small: avg=XXms, p95=XXms, max=XXms, timeouts=0/N
  ...
```

#### Step 4: Review Test Reports
Check generated reports in:
```
packages/agents/tests/integration/v9-2tier-reports/
├── java-BASIC-report.md
├── java-PRO-report.md
├── typescript-BASIC-report.md
├── typescript-PRO-report.md
├── python-BASIC-report.md
├── python-PRO-report.md
├── go-BASIC-report.md
├── go-PRO-report.md
├── rust-BASIC-report.md
├── rust-PRO-report.md
├── ruby-BASIC-report.md
├── ruby-PRO-report.md
├── php-BASIC-report.md
└── php-PRO-report.md
```

#### Step 5: Tune Rate Limits Based on Data

**What to look for in metrics:**
1. **Timeouts**: Any tool timing out? Increase base timeout
2. **Avg vs P95**: Large difference? Some repos are outliers
3. **Tool comparison**: Which tools are slowest?

**Adjust in** `tool-revalidator.ts`:
```typescript
TOOL_TIMEOUT_CONFIGS = {
  // Adjust based on actual p95 times
  spotbugs: { baseTimeoutMs: <actual_p95 × 1.5>, maxConcurrent: 4 },
  pmd: { baseTimeoutMs: <actual_p95 × 1.5>, maxConcurrent: 8 },
  // ...
}
```

### P1: Tier-Specific Report Validation

#### BASIC Tier Reports Should Have:
- ✅ Full issue detection (same as PRO)
- ✅ Educational content for all issues
- ✅ IDE export links (SARIF, GitLab)
- ✅ XP and achievements
- ❌ NO auto-fix sections
- ❌ NO fix verification

#### PRO Tier Reports Should Have:
- ✅ All BASIC features
- ✅ Auto-fix sections with applied fixes
- ✅ Fix verification results
- ✅ Pattern-based fixes
- ✅ Direct commit integration info

### P2: Scaling Architecture (for future growth)

1. **Horizontal Scaling Options**
   - Load balancer (NGINX/HAProxy) in front of multiple API instances
   - Kubernetes with HPA (Horizontal Pod Autoscaler)
   - Redis cluster for distributed rate limiting

2. **Job Queue System (for heavy workloads)**
   - Bull/BullMQ for job queuing
   - Separate worker processes for tool execution
   - Priority queues: PRO users processed first

### P2: Production Monitoring

1. **Add metrics collection**
   - Tool execution times
   - Rate limit hit rates
   - Queue depths (if implemented)

2. **Create deployment runbook**
   - Step-by-step Oracle Cloud deployment
   - Rollback procedures
   - Health check commands

---

## Current Architecture

### Dynamic Rate Limiting (Session 75)

```
Rate Limiting Decision Flow:
1. Check user tier quota (basic/pro/enterprise)
   ↓ (Reject if per-minute limit exceeded)
2. Check global concurrent limit (CPU-aware: 75% of cores)
   ↓ (Reject if at capacity)
3. Check per-tool concurrent limit
   ↓ (e.g., SpotBugs max 2, ESLint max 8)
4. Calculate dynamic timeout
   ↓ (baseTimeout × repoSizeMultiplier)
5. Execute tool with calculated timeout
   ↓
6. Release slots on completion
```

### Timeout Calculation Formula

```
timeout = baseToolTimeout × repoSizeMultiplier

Tool Base Timeouts:
- SpotBugs, Clippy: 180s (compilation required)
- golangci-lint, Brakeman: 90s
- PMD, TSC, Mypy, PHPStan: 60s
- Checkstyle, Pylint, Bandit, RuboCop: 45s
- ESLint, Ruff: 30s

Repo Size Multipliers:
- Small (<10k lines): 1x
- Medium (10k-50k): 2x
- Large (50k-200k): 4x
- Enterprise (200k+): 8x
```

### Security Features (Session 74)

```
Tool Re-Validation Security Flow:
1. Rate Limiter checks (dynamic, tier-based)
   ↓ (Reject if exceeded)
2. Generate secure random filename (crypto.randomBytes)
   ↓
3. Validate path (no traversal, within temp dir)
   ↓
4. Write file with mode 0600
   ↓
5. Execute tool via spawn (no shell, args array)
   ↓
6. Cleanup: overwrite with zeros, then unlink
   ↓
7. Release rate limiter slot
```

### Code Snippet Fetching (Session 74)

```
1. Try local file (repoPath + filePath)
   ↓ (if not exists)
2. Parse GitHub URL from repositoryUrl
   ↓
3. Fetch from raw.githubusercontent.com/owner/repo/branch/path
   ↓ (if 404)
4. Try 'master' branch fallback
   ↓
5. Cache result for 5 minutes
```

---

## Quick Commands

```bash
# Run V9 E2E test
cd /Users/alpinro/CodePrjects/codequal/packages/agents
npx ts-node tests/integration/test-v9-2tier-all-languages.ts

# Run tool re-validation test
npx ts-node tests/integration/test-tool-revalidation.ts

# Build and type-check
npm run build && npx tsc --noEmit

# Deploy to Oracle Cloud
ssh -i "keys/oracle/ssh-key-2025-10-07.key" opc@129.213.49.128
cd ~/codequal && git pull && npm run build && npx pm2 restart codequal-api
```

---

## Files Modified (Session 74)

| File | Changes |
|------|---------|
| `tool-revalidator.ts` | Security hardening, rate limiting, tool availability |
| `code-snippet-extractor.ts` | GitHub API fallback, caching |
| `v9-grouped-report-formatter.ts` | Repository URL storage, identical diff detection |

---

## Known Issues

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| - | VSCode extension missing build script | Low | Ignore (not critical) |

### Resolved in Session 74

| ID | Description | Resolution |
|----|-------------|------------|
| P0-1 | Temp file permissions vulnerable | Added mode 0600/0700 |
| P0-2 | Command injection risk in runTool | Replaced with spawn+args |
| P0-3 | No rate limiting for tool execution | Added RateLimiter class |
| P1-1 | ESLint fails without config | Added --no-config-lookup |
| P1-2 | JSON parsing fragile | Multi-strategy extraction |
| P2-1 | Code snippets unavailable | GitHub API fallback |
| P2-2 | Identical before/after diffs | Similarity detection |
