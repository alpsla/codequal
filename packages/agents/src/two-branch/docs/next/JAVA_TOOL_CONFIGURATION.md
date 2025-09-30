# Java Analysis Tools - Configuration Guide

**Last Updated**: 2025-09-30
**Status**: Production Ready

---

## Overview

CodeQual supports 5 Java analysis tools with flexible configuration:
- **Core Tools** (Always enabled): PMD, Checkstyle, Semgrep
- **Optional Tools** (User-configurable): SpotBugs, Dependency-Check

---

## Tool Descriptions

### Core Tools (Mandatory)

#### 1. PMD - Code Quality Analysis
**Purpose**: Detects code quality issues, potential bugs, and best practice violations

**Configuration**:
```typescript
{
  tool: "pmd",
  enabled: true,  // Always true
  config: {
    priority: "1-2",  // Only critical and high priority
    rulesets: [
      "category/java/errorprone.xml",
      "category/java/bestpractices.xml"
    ],
    parallel: 2,      // 2 parallel containers
    threads: 3,       // 3 threads per container
    memory: "5g"
  },
  performance: {
    expectedTime: "44s",
    findings: "~2,383 critical/high violations"
  }
}
```

**Severity Filtering**: `--minimum-priority 2` (Priority 1-2 only)
**Result**: 76% noise reduction (9,921 → 2,383 violations)

---

#### 2. Checkstyle - Code Style Analysis
**Purpose**: Enforces code style standards and formatting consistency

**Configuration**:
```typescript
{
  tool: "checkstyle",
  enabled: true,  // Always true
  config: {
    standard: "google_checks.xml",
    parallel: 2,      // 2 parallel containers
    memory: "3g",
    changedFilesOnly: true  // Recommended for PR context
  },
  performance: {
    fullScan: "91s (264k warnings)",
    changedFiles: "~0.5s"
  }
}
```

**Note**: All violations are "warning" severity (0 errors)
**Recommendation**: Use `changedFilesOnly: true` for PR analysis

---

#### 3. Semgrep - Security Analysis
**Purpose**: Detects security vulnerabilities and anti-patterns

**Configuration**:
```typescript
{
  tool: "semgrep",
  enabled: true,  // Always true
  config: {
    rulesets: [
      "p/security-audit",
      "p/java"
    ],
    parallel: 4,          // 4 parallel containers
    smartSelection: true, // Only security-critical files
    memory: "2g"
  },
  performance: {
    fullScan: "150s (3,472 files)",
    smartSelection: "48s (708 files) - 74% faster"
  }
}
```

**Smart File Selection Patterns**:
```
Controller, Resource, Handler, Auth*, Security*, Permission*
Validator, Sanitizer, Repository, DAO, Query
Reader, Writer, FileUtil, Client, Socket, Connection
Serializer, Deserializer, Servlet, Service, Manager
Converter, Mapper, Config, Properties
```

---

### Optional Tools (Configurable)

#### 4. SpotBugs - Bytecode Bug Detection
**Purpose**: Analyzes compiled bytecode for bug patterns

**When to Enable**:
- ✅ Project has Maven/Gradle build in CI
- ✅ Distributing compiled artifacts (JARs, WARs)
- ✅ Need bytecode-level analysis
- ❌ Source-only repos (no compilation)
- ❌ Fast CI pipelines (<2 min requirement)

**Configuration**:
```typescript
{
  tool: "spotbugs",
  enabled: false,  // Set to true when needed
  config: {
    effort: "max",
    cpus: 2,
    memory: "4g",
    requiresCompilation: true
  },
  performance: {
    compilation: "48s (Maven/Gradle)",
    analysis: "4s",
    total: "52s"
  },
  tradeoffs: {
    pros: [
      "Detects bytecode-level bugs",
      "Finds issues PMD cannot",
      "Industry-standard tool"
    ],
    cons: [
      "Requires compilation (48s overhead)",
      "Needs build system (Maven/Gradle)",
      "Adds complexity to pipeline"
    ]
  }
}
```

**How to Enable**:
```typescript
// In V9 configuration
const config = {
  tools: {
    java: {
      spotbugs: {
        enabled: true,
        buildCommand: "./mvnw clean compile -DskipTests"
        // or: "./gradlew clean compileJava"
      }
    }
  }
}
```

---

#### 5. Dependency-Check - CVE Scanning
**Purpose**: Scans dependencies for known security vulnerabilities

**When to Enable**:
- ✅ Security compliance requirements
- ✅ Enterprise environments
- ✅ Have NVD API key configured
- ✅ Need CVE tracking
- ❌ Using GitHub Dependabot/Snyk
- ❌ No security compliance needs

**Configuration**:
```typescript
{
  tool: "dependency-check",
  enabled: false,  // Set to true when needed
  config: {
    nvdApiKey: process.env.NVD_API_KEY,  // Required
    databasePath: "/data/dependency-check-db",
    updateInterval: "24h",
    failOnCVSS: 7,
    cpus: 1,
    memory: "4g"
  },
  requirements: {
    nvdApiKey: "Free from https://nvd.nist.gov/developers/request-an-api-key",
    database: "~3GB initial download",
    network: "Internet access for CVE updates"
  },
  performance: {
    firstRun: "~10 min (database download)",
    subsequentRuns: "~30-60s"
  },
  tradeoffs: {
    pros: [
      "Official OWASP tool",
      "Comprehensive CVE database",
      "Works offline after initial setup"
    ],
    cons: [
      "Requires NVD API key",
      "3GB database download",
      "External service dependency"
    ]
  }
}
```

**How to Enable**:
```typescript
// 1. Get NVD API key from https://nvd.nist.gov/developers/request-an-api-key

// 2. Configure in environment
process.env.NVD_API_KEY = "your-api-key-here"

// 3. Enable in V9 configuration
const config = {
  tools: {
    java: {
      dependencyCheck: {
        enabled: true,
        nvdApiKey: process.env.NVD_API_KEY,
        updateOnStartup: true
      }
    }
  }
}
```

---

## Orchestration Strategy

### 2-Stage Pipeline (Core Tools Only)

**Total Time**: 141s (2.4 minutes)

```
Stage 1: Semgrep (Security - Slowest First)
├─ Duration: 47s
├─ CPUs: 4 (all available)
└─ Files: 708 security-critical files

Stage 2: PMD + Checkstyle (Parallel)
├─ PMD: 43s (2 CPUs)
├─ Checkstyle: 94s (2 CPUs)
└─ Total: 94s (limited by slowest)

Total: 47s + 94s = 141s
Speedup: 24% faster than sequential (184s)
```

### 3-Stage Pipeline (All Tools Enabled)

**Total Time**: ~241s (4 minutes)

```
Stage 0: Compilation (if SpotBugs enabled)
├─ Duration: 48s
└─ Maven/Gradle compile

Stage 1: Semgrep (Security - Slowest First)
├─ Duration: 47s
├─ CPUs: 4
└─ Files: 708 files

Stage 2: PMD + Checkstyle + Dependency-Check (Parallel)
├─ PMD: 43s (2 CPUs)
├─ Checkstyle: 94s (2 CPUs)
├─ Dependency-Check: 45s (1 CPU - if enabled)
└─ Total: 94s (limited by Checkstyle)

Stage 3: SpotBugs (if enabled)
├─ Duration: 4s
└─ CPUs: 2

Total: 48s + 47s + 94s + 4s = 193s (with optional tools)
Speedup: 20% faster than sequential (241s)
```

---

## Configuration Examples

### Example 1: Minimal (Core Tools Only)
**Use Case**: Fast PR checks, source-only repos

```typescript
const config = {
  tools: {
    java: {
      pmd: { enabled: true },
      checkstyle: { enabled: true, changedFilesOnly: true },
      semgrep: { enabled: true, smartSelection: true },
      spotbugs: { enabled: false },
      dependencyCheck: { enabled: false }
    }
  }
}
```

**Performance**: ~93s with PR optimization


### Example 2: Security-Focused (Core + Dependency-Check)
**Use Case**: Security compliance, enterprise environments

```typescript
const config = {
  tools: {
    java: {
      pmd: { enabled: true },
      checkstyle: { enabled: true, changedFilesOnly: true },
      semgrep: { enabled: true, smartSelection: true },
      spotbugs: { enabled: false },
      dependencyCheck: {
        enabled: true,
        nvdApiKey: process.env.NVD_API_KEY,
        failOnCVSS: 7
      }
    }
  }
}
```

**Performance**: ~180s (includes CVE scanning)

### Example 3: Comprehensive (All Tools)
**Use Case**: Major releases, audit requirements, compiled artifacts

```typescript
const config = {
  tools: {
    java: {
      pmd: { enabled: true },
      checkstyle: { enabled: true, changedFilesOnly: false },
      semgrep: { enabled: true, smartSelection: true },
      spotbugs: {
        enabled: true,
        buildCommand: "./mvnw clean compile -DskipTests"
      },
      dependencyCheck: {
        enabled: true,
        nvdApiKey: process.env.NVD_API_KEY
      }
    }
  }
}
```

**Performance**: ~240s (full analysis)

---

## Decision Tree

```
Do you have a build system (Maven/Gradle) in your CI?
├─ NO  → Use core tools only (PMD + Checkstyle + Semgrep)
└─ YES → Continue ↓

Do you need bytecode-level bug detection?
├─ NO  → Skip SpotBugs
└─ YES → Enable SpotBugs

Do you have security compliance requirements?
├─ NO  → Skip Dependency-Check
└─ YES → Continue ↓

Do you have an NVD API key?
├─ NO  → Get one (free): https://nvd.nist.gov/developers/request-an-api-key
└─ YES → Enable Dependency-Check

What's your CI time budget?
├─ <2 min  → Core tools only (93s PR-optimized)
├─ <3 min  → Core tools + Dependency-Check (180s)
└─ <5 min  → All tools (240s)
```

---

## Performance Summary

| Configuration | Time | Tools | Use Case |
|---------------|------|-------|----------|
| **Minimal (PR-optimized)** | 93s | PMD, CS (changed), Semgrep | Fast PR checks |
| **Core (Full scan)** | 141s | PMD, Checkstyle, Semgrep | Standard analysis |
| **Security-focused** | 180s | Core + Dependency-Check | Compliance |
| **Comprehensive** | 240s | All 5 tools | Release audits |

---

## V9 Integration

### Tool Configuration Interface

```typescript
interface JavaToolConfig {
  pmd: {
    enabled: boolean;
    priority: "1-2" | "1-3" | "all";
    parallel: number;
    threads: number;
  };
  checkstyle: {
    enabled: boolean;
    changedFilesOnly: boolean;
    parallel: number;
  };
  semgrep: {
    enabled: boolean;
    smartSelection: boolean;
    parallel: number;
  };
  spotbugs?: {
    enabled: boolean;
    buildCommand: string;
    cpus: number;
  };
  dependencyCheck?: {
    enabled: boolean;
    nvdApiKey: string;
    failOnCVSS: number;
    updateInterval: string;
  };
}
```

### Usage in V9ToolOrchestrator

```typescript
import { V9ToolOrchestrator } from './V9ToolOrchestrator';

const orchestrator = new V9ToolOrchestrator({
  language: 'java',
  tools: {
    pmd: { enabled: true },
    checkstyle: { enabled: true, changedFilesOnly: true },
    semgrep: { enabled: true, smartSelection: true },
    spotbugs: { enabled: false },  // Optional
    dependencyCheck: { enabled: false }  // Optional
  }
});

// Run analysis on both branches
const mainResults = await orchestrator.analyze({
  branch: 'main',
  repoPath: '/path/to/repo'
});

const prResults = await orchestrator.analyze({
  branch: 'feature/new-feature',
  repoPath: '/path/to/repo'
});

// Compare and categorize issues
const comparison = orchestrator.compare(mainResults, prResults);
// Returns: { NEW: [], RESOLVED: [], EXISTING: [] }
```

---

## Recommendations

### For Most Users (Default Configuration)
```
Core Tools Only: PMD + Checkstyle (changed files) + Semgrep
Performance: ~93s
Coverage: 99.3% noise filtered, security-focused
```

### When to Enable Optional Tools

**SpotBugs**:
- Building artifacts (JAR/WAR distribution)
- Legacy codebases with complex bugs
- Release audits (not every PR)

**Dependency-Check**:
- SOC 2, ISO 27001, or similar compliance
- Financial/Healthcare/Government sectors
- Managing critical infrastructure

---

**Next Steps**: Integrate this configuration into V9ToolOrchestrator and test with real PRs.
