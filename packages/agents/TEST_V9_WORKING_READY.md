# test-v9-working.ts - Ready for Testing

**Date**: October 4, 2025
**Status**: ✅ READY TO RUN

## ✅ Fixes Applied

### 1. PMD Priority Configuration
- **Changed**: `minimumPriority: 2 → 3` (reverted to 2 per interface requirement)
- **Reason**: Interface only allows `1 | 2`, not 3
- **Current**: Using priority 2 (critical + high severity issues)

### 2. Dependency-Check OSS Index Configuration
- **Added**: Complete Dependency-Check configuration
- **Includes**: OSS Index integration with environment variable support
- **Configuration**:
  ```typescript
  dependencyCheck: {
    enabled: true,
    failOnCVSS: 11,        // Won't fail build (all CVEs reported)
    timeout: 600,          // 10 minute timeout
    ossIndex: {
      enabled: true,
      username: process.env.OSS_INDEX_USERNAME || '',
      apiToken: process.env.OSS_INDEX_API_TOKEN || ''
    }
  }
  ```

### 3. Repository Cloning Logic
- **Added**: Automatic cloning if repo not cached
- **Added**: PR branch fetching if not exists
- **Flow**:
  1. Check if `/tmp/kafka-repo` exists
  2. If not, clone from `https://github.com/apache/kafka.git`
  3. Check if `pr-17620` branch exists
  4. If not, fetch `pull/17620/head:pr-17620`
  5. Proceed with analysis

## 📋 Complete Tool Configuration

The test now runs **5 tools** (all properly configured):

| Tool | Status | Configuration |
|------|--------|---------------|
| **PMD** | ✅ Enabled | Priority: 2, Ruleset: errorprone.xml, 2 parallel, 3g memory |
| **Semgrep** | ✅ Enabled | Rulesets: auto, 2 parallel, 2g memory |
| **Checkstyle** | ✅ Enabled | Config: google_checks.xml, 2 parallel, 2g memory |
| **Dependency-Check** | ✅ Enabled | OSS Index enabled, 600s timeout, CVSS 11 threshold |
| **SpotBugs** | ✅ Optional | Auto-detect Gradle/Maven, graceful degradation if compilation fails |

## 🔄 Test Flow

```
1. Repository Setup (V9 Canonical Flow)
   └─> Clone ONLY main branch (--single-branch trunk)
   └─> Cache repository (simulated)
   └─> Index repository (simulated)
   └─> Create PR branch from cached main (git fetch PR)

2. Get Modified Files
   └─> git diff --name-only trunk..pr-17620
   └─> Store modified file list for categorization

3. Setup Orchestrator
   └─> Configure all 5 tools
   └─> Enable OSS Index (env vars)
   └─> Enable SpotBugs with auto-detection

4. Analyze PR Branch
   └─> git checkout pr-17620
   └─> Run all 5 tools (SpotBugs if Gradle/Maven detected)
   └─> Collect issues

5. Analyze Main Branch
   └─> git checkout trunk
   └─> Run all 5 tools (SpotBugs if Gradle/Maven detected)
   └─> Collect issues

6. Categorize Issues (4 Categories)
   └─> NEW: In PR but not in main
   └─> EXISTING (Modified): In both, in modified files
   └─> RESOLVED: In main but not in PR
   └─> EXISTING (Rest): In both, in unmodified files

7. PR Decision Logic
   └─> Check NEW + EXISTING(Modified) for critical/high issues
   └─> If found: DECLINED
   └─> If not: APPROVED

8. Generate Report
   └─> Save to /tmp/v9-reports/v9-report-[timestamp].md
   └─> Include all 4 categories and decision
```

## 🚀 How to Run

### On Oracle Cloud (Recommended)
```bash
# Connect to Oracle
ssh -i "/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key" opc@129.213.49.128

# Navigate to project
cd /home/opc/codequal/packages/agents

# Set OSS Index credentials (if available)
export OSS_INDEX_USERNAME="your-email@example.com"
export OSS_INDEX_API_TOKEN="your-token"

# Run test
npx ts-node test-v9-working.ts
```

### Locally (if repo already cloned)
```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

# Set OSS Index credentials (optional)
export OSS_INDEX_USERNAME="your-email@example.com"
export OSS_INDEX_API_TOKEN="your-token"

# Run test
npx ts-node test-v9-working.ts
```

## 📊 Expected Output

```
V9 Two-Branch Test

Cloning Apache Kafka (main branch only)...
(or "Using cached repo at /tmp/kafka-repo")
Repository cached and indexed

Creating PR branch from main...
(or "PR branch pr-17620 already exists")

Getting modified files...
Found X modified files

Analyzing PR branch...
[Tool execution logs...]

Analyzing main branch...
[Tool execution logs...]

=== Results ===
NEW: X
EXISTING (Modified Files): Y
RESOLVED: Z
EXISTING (Rest): W
Decision: APPROVED/DECLINED (N blocking issues)

Report: /tmp/v9-reports/v9-report-[timestamp].md
```

## 📝 Report Format (Current)

```markdown
# V9 Report

## Decision: APPROVED/DECLINED

### Issue Categories
- **NEW**: X
- **EXISTING (Modified Files)**: Y
- **RESOLVED**: Z
- **EXISTING (Rest)**: W

### Blocking Issues
N critical/high severity issues in NEW or modified files
**PR must be DECLINED until these are resolved**
(or "**PR can be APPROVED**")
```

**Note**: This is a simplified report. Full V9 reports with all 34 sections will come in the next iteration when we integrate:
- V9ReportFormatterFinal
- Specialized agents (Security, Quality, Performance, Architecture, Dependency)
- AI-powered fix suggestions
- Educational resources

## ⚠️ Environment Requirements

### Required
- ✅ Node.js with TypeScript support
- ✅ Git installed
- ✅ Internet access (for cloning, if needed)
- ✅ Docker (for tool containers)

### Optional (for full features)
- OSS Index credentials (for enhanced vulnerability data)
- Redis (for caching - Oracle only)
- PostgreSQL (for CVE database - Oracle only)

## 🐛 Known Limitations

1. **OSS Index**: Without credentials, Dependency-Check will use NVD only
2. **SpotBugs**: Auto-detects Gradle/Maven, gracefully skips if:
   - Build system not detected
   - Compilation fails
   - Build system not supported
3. **Report Format**: Simplified (not full 34-section V9 format yet)
4. **Local Testing**: Missing Redis/PostgreSQL (Oracle has these)

## 🎯 Next Steps

After this test succeeds:

1. ✅ Verify all 5 tools run (SpotBugs if Gradle detected)
2. ✅ Verify issues are found by each tool
3. ✅ Verify NEW/RESOLVED categorization works
4. ✅ Integrate V9ReportFormatterFinal
5. ✅ Add specialized agents
6. ✅ Generate complete 34-section reports
7. ✅ Document Java as 100% complete

## 📂 File Location

```
/Users/alpinro/Code Prjects/codequal/packages/agents/test-v9-working.ts
```

## 🔗 Related Documentation

- `SESSION_2025_10_04_HANDOFF_TO_NEXT.md` - Session handoff
- `V9_CANONICAL_ARCHITECTURE.md` - V9 architecture
- `V9_CRITICAL_KNOWLEDGE_BASE.md` - Critical V9 knowledge
- `QUICK_START_NEXT_SESSION.md` - Quick start guide

---

**Status**: ✅ Ready to run on Oracle Cloud or locally
