# V9 Tool Orchestrator Framework

**Generic orchestration framework for multi-tool analysis across ALL languages**

## 🎯 Purpose

The V9 Orchestrator Base Class provides a **language-agnostic** framework for running analysis tools with smart conditional logic. This eliminates code duplication and ensures consistent behavior across Java, Python, JavaScript, Go, Rust, etc.

## 📐 Architecture

### The 3-Phase Pipeline

All language orchestrators follow the same V9 canonical flow:

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: REQUIRED TOOLS (Parallel)                          │
│ ├─ Code Quality Tool (PMD, pylint, ESLint, etc.)           │
│ └─ Security Tool (Semgrep, bandit, gosec, etc.)            │
│                                                              │
│ 📊 Evaluate Phase 1 Results                                 │
│ └─ Count critical + high severity issues                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: CONDITIONAL TOOLS (Smart decision)                 │
│                                                              │
│ IF (criticalHighCount === 0) OR (user wants all severities):│
│   ├─ Style/Format Tools (Checkstyle, black, prettier)      │
│   └─ Type Checkers (mypy, TypeScript compiler)             │
│ ELSE:                                                        │
│   └─ Skip (focus on fixing critical/high issues first)     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: PR-ONLY TOOLS (Resource optimization)              │
│                                                              │
│ IF branch === 'pr':                                         │
│   ├─ Dependency Scanning (Dependency-Check, safety, etc.)  │
│   └─ Expensive Checks (compilation, complex analysis)      │
│ ELSE (main branch):                                         │
│   └─ Skip (CVE database is same for both branches)         │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 How to Use

### For Java (Already Implemented)

```typescript
import { V9ToolOrchestratorBase } from '../orchestration/v9-tool-orchestrator-base';

export class JavaToolOrchestrator extends V9ToolOrchestratorBase {
  constructor(config: JavaToolConfig) {
    super('Java');
    this.config = config;
  }

  // Phase 1: PMD + Semgrep (parallel)
  protected async runRequiredTools(context: OrchestrationContext): Promise<ToolResult[]> {
    return Promise.all([
      this.runPMD(context),
      this.runSemgrep(context)
    ]);
  }

  // Phase 2: Checkstyle (conditional)
  protected async runConditionalTools(
    context: OrchestrationContext,
    phase1Results: ToolResult[]
  ): Promise<ToolResult[]> {
    if (this.config.checkstyle.enabled) {
      return [await this.runCheckstyle(context)];
    }
    return [];
  }

  // Phase 3: Dependency-Check (PR-only)
  protected async runPROnlyTools(
    context: OrchestrationContext,
    previousResults: ToolResult[]
  ): Promise<ToolResult[]> {
    if (this.config.dependencyCheck.enabled) {
      return [await this.runDependencyCheck(context)];
    }
    return [];
  }
}
```

### For Python (Proposed)

```typescript
import { V9ToolOrchestratorBase } from '../orchestration/v9-tool-orchestrator-base';

export class PythonToolOrchestrator extends V9ToolOrchestratorBase {
  constructor(config: PythonToolConfig) {
    super('Python');
    this.config = config;
  }

  // Phase 1: pylint + bandit (parallel)
  protected async runRequiredTools(context: OrchestrationContext): Promise<ToolResult[]> {
    return Promise.all([
      this.runPylint(context),    // Code quality
      this.runBandit(context)     // Security
    ]);
  }

  // Phase 2: mypy + black (conditional)
  protected async runConditionalTools(
    context: OrchestrationContext,
    phase1Results: ToolResult[]
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    if (this.config.mypy?.enabled) {
      results.push(await this.runMypy(context));
    }

    if (this.config.black?.enabled) {
      results.push(await this.runBlack(context));
    }

    return results;
  }

  // Phase 3: safety/pip-audit (PR-only)
  protected async runPROnlyTools(
    context: OrchestrationContext,
    previousResults: ToolResult[]
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    if (this.config.safety?.enabled) {
      results.push(await this.runSafety(context));  // CVE scanning
    }

    return results;
  }
}
```

### For JavaScript/TypeScript (Proposed)

```typescript
import { V9ToolOrchestratorBase } from '../orchestration/v9-tool-orchestrator-base';

export class JavaScriptToolOrchestrator extends V9ToolOrchestratorBase {
  constructor(config: JavaScriptToolConfig) {
    super('JavaScript');
    this.config = config;
  }

  // Phase 1: ESLint + Semgrep (parallel)
  protected async runRequiredTools(context: OrchestrationContext): Promise<ToolResult[]> {
    return Promise.all([
      this.runESLint(context),
      this.runSemgrep(context)
    ]);
  }

  // Phase 2: Prettier + TypeScript compiler (conditional)
  protected async runConditionalTools(
    context: OrchestrationContext,
    phase1Results: ToolResult[]
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    if (this.config.prettier?.enabled) {
      results.push(await this.runPrettier(context));
    }

    if (this.config.typescript?.enabled) {
      results.push(await this.runTSC(context));
    }

    return results;
  }

  // Phase 3: npm audit (PR-only)
  protected async runPROnlyTools(
    context: OrchestrationContext,
    previousResults: ToolResult[]
  ): Promise<ToolResult[]> {
    if (this.config.npmAudit?.enabled) {
      return [await this.runNpmAudit(context)];
    }
    return [];
  }
}
```

## 🌍 Built-in Utilities (Language-Agnostic)

The base class provides these utilities for ALL languages:

### Git Operations

```typescript
// Auto-detect default branch (trunk, main, or master)
const mainBranch = this.detectDefaultBranch();

// Get modified files between branches
const modifiedFiles = await this.getModifiedFiles('pr-branch', 'main');
```

### Severity Counting

```typescript
// Count critical + high issues from Phase 1
const criticalHighCount = this.countCriticalHigh(phase1Results);

// Aggregate all severities
const totals = this.aggregateSeverities(allResults);
console.log(`Critical: ${totals.critical}, High: ${totals.high}`);
```

### Smart Decision Logic

```typescript
// Automatically decides if conditional tools should run
const shouldRun = this.shouldRunConditionalTools(criticalHighCount, includeAll);
```

## 📊 Execution Flow Example

```bash
🎯 Starting Java Tool Orchestration (pr branch)
📁 Repository: /tmp/kafka-repo
🔧 Mode: CRITICAL/HIGH ONLY

🚀 Phase 1: Running REQUIRED tools in parallel...

📊 Phase 1 Results:
✅ PMD: 54109ms, 2062 issues
✅ Semgrep: 44971ms, 0 issues

⏭️  Skipping conditional tools: Found 294 critical/high issues

🔐 Running PR-only tools (dependency scanning, security)...
✅ Dependency-Check: 15234ms, 3 vulnerabilities

✅ Orchestration complete in 69343ms
📊 Total issues found: 2065
🚨 Blocking issues (critical): 294
```

## 🎯 Benefits

### 1. **Consistency Across Languages**
All languages follow the same 3-phase pipeline, making the system predictable and easy to understand.

### 2. **Smart Resource Management**
- **Parallel execution** in Phase 1 (fastest tools run together)
- **Conditional execution** in Phase 2 (skip style checks if critical issues exist)
- **PR-only execution** in Phase 3 (avoid redundant CVE scans on main branch)

### 3. **Code Reuse**
Git operations, severity counting, and decision logic are implemented once and shared across all languages.

### 4. **Easy Extension**
Adding a new language requires only implementing 3 methods:
- `runRequiredTools()`
- `runConditionalTools()`
- `runPROnlyTools()`

### 5. **Testability**
Each phase can be tested independently, and the base class logic is tested once for all languages.

## 🚀 Next Steps

### Immediate (Java - Already Done)
- ✅ Java orchestrator extends base class
- ✅ Git utilities extracted and shared
- ✅ 3-phase pipeline working

### Short-term (Python, JavaScript)
- [ ] Create `PythonToolOrchestrator` extending base class
- [ ] Create `JavaScriptToolOrchestrator` extending base class
- [ ] Test with real repositories (e.g., Flask, React)

### Long-term (Go, Rust, C#, etc.)
- [ ] Create language-specific orchestrators as needed
- [ ] Add language detection to auto-select orchestrator
- [ ] Implement language-agnostic V9ReportGenerator

## 📖 API Reference

### OrchestrationContext

```typescript
interface OrchestrationContext {
  repoPath: string;              // Absolute path to git repository
  branch: 'main' | 'pr';         // Which branch is being analyzed
  language: string;              // e.g., 'Java', 'Python', 'JavaScript'
  modifiedFiles?: string[];      // Optional: pre-computed modified files
  options?: {
    includeAllSeverities?: boolean;  // Force run conditional tools
    skipOptionalTools?: boolean;     // Skip Phase 3
  };
}
```

### ToolResult

```typescript
interface ToolResult {
  tool: string;                  // e.g., 'PMD', 'Semgrep', 'ESLint'
  success: boolean;              // Did the tool run successfully?
  duration: number;              // Execution time in milliseconds
  issues: RawIssue[];           // All issues found by this tool
  rawOutput?: string;           // Original tool output (for debugging)
  error?: string;               // Error message if failed
  metadata: {
    filesScanned: number;
    issuesFound: number;
    severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}
```

### OrchestrationResult

```typescript
interface OrchestrationResult {
  totalDuration: number;         // Total time for all phases
  toolResults: ToolResult[];     // Results from all tools
  totalIssues: number;           // Sum of all issues
  severityCounts: {             // Aggregated severity counts
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  success: boolean;              // Did orchestration complete?
}
```

## 🔗 Related Files

- **Base Class**: `src/two-branch/orchestration/v9-tool-orchestrator-base.ts`
- **Git Utilities**: `src/two-branch/utils/git-utils.ts`
- **Java Implementation**: `src/two-branch/tools/java/java-tool-orchestrator.ts`
- **Test Example**: `src/two-branch/tests/__tests__/test-v9-optimized-report.ts`

---

*V9 Orchestrator Framework - Consistent, Smart, Language-Agnostic Tool Orchestration*
