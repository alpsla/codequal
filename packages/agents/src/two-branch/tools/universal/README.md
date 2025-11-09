# Universal Tools

**Purpose**: Shared tool runners that work across multiple programming languages

**Tools**: 2 universal tools identified
1. **Semgrep** - Security scanning for ALL languages
2. **Dependency-Check** - CVE scanning for 7 languages (with PostgreSQL backend)

---

## Why Universal?

### Benefits
- ✅ **Consistency**: Same tool behavior across Java, TypeScript, Python, etc.
- ✅ **Maintainability**: Update one runner, affects all languages
- ✅ **Performance**: PostgreSQL backend = 5s queries vs 30min downloads
- ✅ **Container Size**: Smaller language images (no bundled tools)
- ✅ **Scalability**: Add new languages without rebuilding tools

### Architecture
```
Language Orchestrators (Java, TypeScript, Python)
        │
        ├─> Language-Specific Tools (ESLint, Pylint, PMD)
        │
        └─> Universal Tools (via universal runners)
                │
                ├─> Semgrep Runner (host-based)
                └─> Dependency-Check Runner (PostgreSQL backend)
```

---

## Files in This Directory

1. **`semgrep-runner.ts`** - Universal Semgrep executor
   - Auto-detects language
   - Runs appropriate rulesets
   - Returns standardized Issue[]

2. **`dependency-check-runner.ts`** - Universal Dependency-Check executor
   - Queries PostgreSQL CVE database
   - Auto-detects project type
   - Returns standardized Issue[]

3. **`universal-tool-base.ts`** - Base class with common logic
   - Execution wrapper
   - Error handling
   - Issue standardization

---

## Usage

### From Tool Orchestrator

```typescript
import { UniversalSemgrepRunner } from '../tools/universal/semgrep-runner';
import { UniversalDependencyCheckRunner } from '../tools/universal/dependency-check-runner';

class JavaToolOrchestrator extends BaseToolOrchestrator {
  protected async executeTool(tool: ToolConfig): Promise<Issue[]> {
    // Check if universal tool
    if (tool.name === 'semgrep') {
      return new UniversalSemgrepRunner().execute(
        this.workspacePath, 
        'java'
      );
    }
    
    if (tool.name === 'dependency-check') {
      return new UniversalDependencyCheckRunner().execute(
        this.workspacePath, 
        'java'
      );
    }
    
    // Otherwise, execute language-specific tool
    return super.executeTool(tool);
  }
}
```

---

## PostgreSQL Backend (Dependency-Check)

### Architecture
```
PostgreSQL Container (24/7 running)
├─> Database: cvedb
├─> CVEs: 208,612+ vulnerabilities
├─> Updated: Daily 2 AM UTC (cron)
└─> Query time: 5 seconds per branch

Dependency-Check queries this database (no download!)
```

### Connection
```typescript
const pgConfig = {
  host: 'localhost',
  port: 5432,
  database: 'cvedb',
  user: 'depscan',
  password: process.env.DEPCHECK_DB_PASSWORD
};
```

### Daily Cron Job
```bash
# /opt/scripts/daily-cve-update.sh
# Schedule: 0 2 * * *
# Updates CVE database with latest NVD data
```

---

## Testing

### Test Execution
```bash
# From packages/agents
npx ts-node src/two-branch/tools/universal/__tests__/semgrep-runner.test.ts
npx ts-node src/two-branch/tools/universal/__tests__/dependency-check-runner.test.ts
```

### Validation
```bash
# Test with Java project
npx ts-node test-java-universal-tools.ts

# Test with TypeScript project
npx ts-node test-typescript-universal-tools.ts

# Test with Python project
npx ts-node test-python-universal-tools.ts
```

---

## CRITICAL: Java Regression Testing

⚠️ **Before deploying**: Must retest Java analyzer to ensure Semgrep and Dependency-Check still work with universal runners.

**Why**: Java currently uses tools FROM container. After switching to universal runners, execution path changes.

**Test**: Run Spring PetClinic analysis and verify:
- ✅ Semgrep detects security issues
- ✅ Dependency-Check detects CVEs
- ✅ Same issue count as before
- ✅ Performance is similar or better

---

## Supported Languages

### Semgrep
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

### Dependency-Check
- ✅ Java (Maven, Gradle)
- ✅ JavaScript/Node.js (npm, yarn, pnpm)
- ✅ Python (pip, requirements.txt)
- ✅ Ruby (Gemfile)
- ✅ PHP (composer.json)
- ✅ .NET (NuGet)
- ✅ C/C++ (Autotools, CMake)

---

**Status**: In Development  
**Last Updated**: 2025-11-07

