# Universal Tools Analysis - Multi-Language Support

**Date**: 2025-11-07  
**Purpose**: Identify tools that should be universal runners vs language-specific

---

## 🎯 Executive Summary

**Universal Tools Identified**: 2 critical tools used across 3+ languages

1. **Semgrep** - Used in ALL languages (Java, TypeScript, JavaScript, Python, Go, Ruby, PHP)
2. **Dependency-Check** - Supports 7 languages (Java, JavaScript, Python, Ruby, PHP, .NET, C++)

**Architecture Decision**: Create universal runners with PostgreSQL backend for performance

---

## 📊 Complete Tool Matrix by Language

### JavaScript/TypeScript
| Category | Tools | Universal? |
|----------|-------|-----------|
| **Security** | semgrep, eslint | ✅ semgrep |
| **Quality** | eslint, jshint, tsc | ❌ Language-specific |
| **Dependencies** | npm-audit, dep-cruiser | ⚠️ npm-audit (JS/TS only) |
| **Performance** | lighthouse | ❌ Web-specific |
| **Architecture** | madge, dep-cruiser | ❌ JS-specific |

### Python
| Category | Tools | Universal? |
|----------|-------|-----------|
| **Security** | bandit, semgrep, safety | ✅ semgrep |
| **Quality** | pylint, flake8 | ❌ Language-specific |
| **TypeCheck** | mypy | ❌ Python-specific |
| **Dependencies** | safety | ❌ Python-specific |
| **Performance** | py-spy | ❌ Python-specific |
| **Architecture** | pydeps | ❌ Python-specific |

### Java
| Category | Tools | Universal? |
|----------|-------|-----------|
| **Security** | semgrep, spotbugs | ✅ semgrep |
| **Quality** | checkstyle, pmd | ❌ Language-specific |
| **TypeCheck** | javac | ❌ Java-specific |
| **Dependencies** | owasp-dependency-check | ✅ Universal |
| **Performance** | jmh | ❌ Java-specific |
| **Architecture** | jdepend | ❌ Java-specific |

### Go
| Category | Tools | Universal? |
|----------|-------|-----------|
| **Security** | semgrep, gosec | ✅ semgrep |
| **Quality** | golint, go vet | ❌ Language-specific |
| **Dependencies** | go mod verify | ❌ Go-specific |
| **Performance** | pprof | ❌ Go-specific |

### Ruby
| Category | Tools | Universal? |
|----------|-------|-----------|
| **Security** | semgrep, brakeman | ✅ semgrep |
| **Quality** | rubocop | ❌ Language-specific |
| **Dependencies** | bundler-audit | ❌ Ruby-specific |

### PHP
| Category | Tools | Universal? |
|----------|-------|-----------|
| **Security** | semgrep, psalm | ✅ semgrep |
| **Quality** | phpcs, phpstan | ❌ Language-specific |
| **Dependencies** | composer audit | ❌ PHP-specific |

---

## ✅ Universal Tool Candidates

### 1. **Semgrep** (CONFIRMED UNIVERSAL)

**Languages Supported**: ALL
- ✅ Java
- ✅ TypeScript
- ✅ JavaScript
- ✅ Python
- ✅ Go
- ✅ Ruby
- ✅ PHP
- ✅ C/C++
- ✅ Rust
- ✅ Kotlin

**Agent Role**: SecurityAnalyzer

**Current Status**:
- ✅ Installed in Java container v6.0 (pip install semgrep==1.45.0)
- ❌ NOT in TypeScript container
- ❌ NOT in Python container

**Execution**:
```bash
semgrep --config=auto --json . 2>&1 || true
```

**Output**: JSON format (universal parser)

**Why Universal?**:
- Single binary/tool works for ALL languages
- Language detection is automatic
- Same CLI across all languages
- Same JSON output format
- Security rules maintained by Semgrep team

---

### 2. **Dependency-Check** (CONFIRMED UNIVERSAL)

**Languages Supported**: 7 major languages
- ✅ Java (Maven, Gradle, JAR files)
- ✅ JavaScript/Node.js (npm, yarn, pnpm)
- ✅ Python (pip, requirements.txt, setup.py)
- ✅ Ruby (Gemfile, Gemfile.lock)
- ✅ PHP (composer.json, composer.lock)
- ✅ .NET (NuGet, packages.config)
- ✅ C/C++ (Autotools, CMake)

**Agent Role**: DependencyAnalyzer

**Current Status**:
- ✅ Installed in Java container v6.0 (Dependency-Check 12.1.5)
- ❌ NOT in TypeScript container
- ❌ NOT in Python container

**Execution**:
```bash
dependency-check.sh \
  --scan . \
  --format JSON \
  --out dependency-check-report.json \
  --connectionString "jdbc:postgresql://localhost:5432/cvedb" \
  --dbUser depscan \
  --dbPassword <password>
```

**CRITICAL Architecture** (Per User):
```
┌─────────────────────────────────────────────┐
│ PostgreSQL Database (Always Running)       │
│ - CVE Database: 208,612+ CVEs              │
│ - Updated Daily: 2 AM UTC (cron)           │
│ - Size: ~3GB                                │
│ - Location: /data/postgres-depcheck        │
└─────────────────┬───────────────────────────┘
                  │
                  │ Query (5 seconds per branch)
                  │
┌─────────────────▼───────────────────────────┐
│ Universal Dependency-Check Runner           │
│ - Detects language automatically            │
│ - Queries PostgreSQL (no download)          │
│ - Parses CVE results                        │
│ - Returns standardized Issue[]              │
└─────────────────────────────────────────────┘
```

**Why Universal?**:
- Single tool supports 7 languages
- Language detection is automatic (file inspection)
- Same PostgreSQL backend for ALL languages
- Same JSON output format
- Fast execution (~5 seconds vs 30 minutes download)
- Daily cron keeps database current

**PostgreSQL Backend Benefits**:
- ✅ One database for ALL language scans
- ✅ Daily updates (not per-scan)
- ✅ Persistent storage (no re-download)
- ✅ Fast queries (5 seconds vs 30 minutes)
- ✅ Consistent CVE data across all languages

---

## ❌ Tools That Are NOT Universal

### npm-audit
- **Languages**: JavaScript, TypeScript ONLY
- **Why Not Universal**: npm-specific, requires package.json
- **Keep As**: Language-specific tool in TypeScript orchestrator

### safety (Python)
- **Languages**: Python ONLY
- **Why Not Universal**: PyPI-specific, requires requirements.txt
- **Keep As**: Language-specific tool in Python orchestrator

### eslint
- **Languages**: JavaScript, TypeScript ONLY
- **Why Not Universal**: JS/TS specific
- **Keep As**: Language-specific tool

### pylint/flake8
- **Languages**: Python ONLY
- **Why Not Universal**: Python syntax-specific
- **Keep As**: Language-specific tools

### PMD/Checkstyle/SpotBugs
- **Languages**: Java ONLY
- **Why Not Universal**: Java bytecode/syntax specific
- **Keep As**: Language-specific tools

---

## 🏗️ Recommended Architecture

### Three-Tier Tool System

```
┌─────────────────────────────────────────────────────────┐
│ V9 Language Analyzer (v9-java-analyzer.ts)             │
│ - Defines which tools to run                           │
│ - Maps tools to agents (Security, Quality, etc.)       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Tool Orchestrator (java-tool-orchestrator.ts)          │
│ - Routes tools to correct executor                      │
│ - Parallel execution management                         │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
┌────────────────┐  ┌────────────────────────┐
│ Language       │  │ Universal Tools        │
│ Specific       │  │ (Shared)               │
│                │  │                        │
│ - ESLint       │  │ - Semgrep Runner       │
│ - TypeScript   │  │ - Dependency-Check     │
│ - npm-audit    │  │   Runner               │
│ - Pylint       │  │                        │
│ - Bandit       │  │ PostgreSQL Backend:    │
│ - PMD          │  │ - CVE Database         │
│ - Checkstyle   │  │ - Daily Cron Update    │
│ - SpotBugs     │  │ - 5s queries           │
└────────────────┘  └────────────────────────┘
```

---

## 📋 Implementation Plan

### Phase 1: Create Universal Tool Runners (Today - 2 hours)

**1. Universal Semgrep Runner** (30 minutes)
```typescript
// packages/agents/src/two-branch/tools/universal/semgrep-runner.ts

export class UniversalSemgrepRunner {
  async execute(workspacePath: string, language: string): Promise<Issue[]> {
    // 1. Auto-detect language (or use provided)
    // 2. Run semgrep with appropriate rulesets
    // 3. Parse JSON output
    // 4. Return standardized Issue[]
  }
}
```

**2. Universal Dependency-Check Runner** (1 hour)
```typescript
// packages/agents/src/two-branch/tools/universal/dependency-check-runner.ts

export class UniversalDependencyCheckRunner {
  private pgConnection: PostgreSQLConnection;
  
  constructor() {
    // Connect to PostgreSQL backend
    this.pgConnection = new PostgreSQLConnection({
      host: 'localhost',
      port: 5432,
      database: 'cvedb',
      user: 'depscan'
    });
  }
  
  async execute(workspacePath: string, language: string): Promise<Issue[]> {
    // 1. Detect project type (pom.xml, package.json, requirements.txt)
    // 2. Run dependency-check with PostgreSQL backend
    // 3. Parse JSON output
    // 4. Return standardized Issue[]
  }
}
```

**3. Base Tool Orchestrator Update** (30 minutes)
```typescript
// packages/agents/src/two-branch/orchestrators/base-tool-orchestrator.ts

protected async executeTool(tool: ToolConfig): Promise<Issue[]> {
  // Check if universal tool
  if (this.isUniversalTool(tool.name)) {
    return this.executeUniversalTool(tool);
  } else {
    return this.executeLanguageSpecificTool(tool);
  }
}

private isUniversalTool(toolName: string): boolean {
  return ['semgrep', 'dependency-check'].includes(toolName);
}

private async executeUniversalTool(tool: ToolConfig): Promise<Issue[]> {
  switch (tool.name) {
    case 'semgrep':
      return new UniversalSemgrepRunner().execute(this.workspacePath, this.language);
    case 'dependency-check':
      return new UniversalDependencyCheckRunner().execute(this.workspacePath, this.language);
    default:
      throw new Error(`Unknown universal tool: ${tool.name}`);
  }
}
```

### Phase 2: PostgreSQL Backend Setup (If Not Already Done)

**Check Current Status**:
```bash
ssh opc@oracle
docker ps | grep postgres
# If running: ✅ Already configured
# If not: Set up PostgreSQL backend
```

**Setup Script** (if needed):
```bash
# packages/agents/src/two-branch/scripts/setup-postgres-depcheck.sh
#!/bin/bash

# Create persistent data directory
mkdir -p /data/postgres-depcheck

# Start PostgreSQL container
docker run -d \
  --name dependency-check-db \
  --restart unless-stopped \
  -e POSTGRES_DB=cvedb \
  -e POSTGRES_USER=depscan \
  -e POSTGRES_PASSWORD=<secure-password> \
  -p 5432:5432 \
  -v /data/postgres-depcheck:/var/lib/postgresql/data \
  postgres:16-alpine

# Initialize database schema
# (Run Dependency-Check --updateonly to populate)
```

**Daily Cron Job**:
```bash
# Already exists: packages/agents/src/two-branch/scripts/daily-cve-update.sh
# Schedule: 0 2 * * * (2 AM UTC daily)
```

### Phase 3: Update Language Analyzers (30 minutes per language)

**Java Analyzer** (backward compatible):
```typescript
// v9-java-analyzer.ts - NO CHANGES NEEDED
// Already uses semgrep and dependency-check
// Will automatically route through universal runners
```

**TypeScript Analyzer**:
```typescript
// v9-typescript-analyzer.ts
{
  name: 'semgrep',
  command: 'UNIVERSAL',  // Flag for universal runner
  agent: 'SecurityAnalyzer',
  parser: 'UNIVERSAL'
},
{
  name: 'dependency-check',
  command: 'UNIVERSAL',
  agent: 'DependencyAnalyzer',
  parser: 'UNIVERSAL'
}
```

**Python Analyzer**:
```typescript
// v9-python-analyzer.ts
// Same pattern as TypeScript
```

---

## ✅ Benefits Summary

| Benefit | Impact |
|---------|--------|
| **Consistency** | Same Semgrep/Dependency-Check behavior across ALL languages |
| **Maintainability** | Update one runner, affects all languages |
| **Performance** | PostgreSQL backend = 5s queries vs 30min downloads |
| **Container Size** | TypeScript 424MB (vs 1GB+ with tools bundled) |
| **Scalability** | Add Go/PHP/Ruby without rebuilding tools |
| **Database Efficiency** | One 3GB database for ALL language scans |
| **Cost** | Daily cron update vs per-analysis download |

---

## 🚨 Critical Architecture Notes

### Dependency-Check PostgreSQL Backend

**Why This Matters**:
- ❌ **OLD WAY**: Each analysis downloads 3GB NVD database (~30 minutes)
- ✅ **NEW WAY**: Query existing PostgreSQL database (~5 seconds)
- ✅ **Cost Savings**: 360× faster (1,800s → 5s)
- ✅ **Bandwidth Savings**: No repeated 3GB downloads
- ✅ **Consistency**: All languages use same CVE database version

**User's Insight** (Critical):
> "We install a database which should update daily by cron and tool's responsibility 
> to run the validation against the stored db in Postgres and it takes 5 seconds per branch"

**Implementation**:
1. PostgreSQL container runs 24/7
2. Daily cron at 2 AM updates CVE database
3. Dependency-Check queries database (no download)
4. Same database for Java, JavaScript, Python, Ruby, PHP, etc.

---

## 📊 Final Tool Classification

### ✅ Universal Tools (2)
1. **Semgrep** - ALL languages
2. **Dependency-Check** - 7 languages (with PostgreSQL backend)

### ❌ Language-Specific Tools (Keep in Containers)
- **JavaScript/TypeScript**: ESLint, tsc, npm-audit, Prettier
- **Python**: Pylint, flake8, mypy, Bandit, Safety
- **Java**: PMD, Checkstyle, SpotBugs
- **Go**: golint, go vet, gosec
- **Ruby**: RuboCop, Brakeman
- **PHP**: PHPCS, PHPStan, Psalm

---

**Status**: Ready for implementation  
**Estimated Time**: 2-3 hours total  
**Priority**: HIGH (blocks multi-language expansion)

---

**Next Steps**:
1. ✅ Review this matrix with user
2. ⏳ Implement Universal Semgrep Runner
3. ⏳ Implement Universal Dependency-Check Runner
4. ⏳ Update orchestrators to route universal tools
5. ⏳ Test with TypeScript (Semgrep should work)
6. ⏳ Test with Python (Dependency-Check should work)

