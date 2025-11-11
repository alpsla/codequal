# Adding a New Language to V9 Framework - Step-by-Step Guide

**Purpose**: Speed up the process of adding new language support  
**Last Updated**: November 11, 2025 (Session 25)

---

## 📋 Pre-Flight Checklist

Before starting, ensure you have:
- [ ] Language name decided (e.g., `java`, `typescript`, `python`, `go`)
- [ ] 2-3 target repositories with real PRs for testing
- [ ] List of language-specific tools (ESLint, Pylint, etc.)
- [ ] Access to Oracle Cloud for testing

---

## 🎯 Quick Summary

**Time to Add New Language**: ~2-3 hours  
**Files to Create**: 1-2 files  
**Files to Modify**: 1-2 files  
**Existing Assets to Reuse**: ~95% of framework

---

## 📚 Existing Assets You'll Reuse (Don't Recreate!)

### ✅ Universal Framework (Works for ALL Languages)

1. **BaseToolOrchestrator** - `src/two-branch/tools/base-tool-orchestrator.ts`
   - Branch management
   - Parallel tool execution
   - Result aggregation
   - Performance tracking
   - **SESSION 25**: Universal invalid issue filtering

2. **Universal Tools**
   - **Semgrep** - `src/two-branch/tools/universal/semgrep-runner.ts`
   - **Dependency-Check** - `src/two-branch/tools/universal/dependency-check-runner.ts`

3. **Report Generation**
   - `V9GroupedReportFormatter` - Works for all languages
   - **SESSION 25**: Email normalization, Supabase URLs, consistent scoring

4. **Scoring System**
   - `score-calculator.ts` - Universal APP/Skill scoring
   - **SESSION 25**: Fair scoring (only NEW+EXISTING_MODIFIED)

5. **Test Infrastructure**
   - `test-v9-lite-e2e.ts` - Multi-language test runner

---

## 🚀 Step-by-Step Process

### Step 1: Check Existing Infrastructure (5 minutes)

**Check if orchestrator already exists**:
```bash
ls src/two-branch/tools/<language>/
```

**Files you might find**:
- `<language>-tool-orchestrator.ts` - If exists, skip to Step 3
- `<language>-tool-parser.ts` (optional) - Helper for tool output parsing

**Example existing languages**:
- ✅ Java: `java-tool-orchestrator.ts` (COMPLETE)
- ✅ TypeScript: `typescript-tool-orchestrator.ts` (COMPLETE)
- ✅ Python: `python-tool-orchestrator.ts` (COMPLETE)
- ✅ Go: Needs creation
- ✅ Rust: Needs creation

---

### Step 2: Create Language-Specific Orchestrator (30-60 minutes)

**Only needed if orchestrator doesn't exist!**

**Template Location**: Copy from `java-tool-orchestrator.ts` or `typescript-tool-orchestrator.ts`

**File**: `src/two-branch/tools/<language>/<language>-tool-orchestrator.ts`

#### 2.1. Define Tool Configuration

```typescript
export interface <Language>ToolConfig {
  // REQUIRED TOOLS (at least 1-2)
  <primary_tool>: {
    enabled: boolean;
    // tool-specific config
  };
  
  // OPTIONAL TOOLS
  <secondary_tool>?: {
    enabled: boolean;
  };
  
  // Docker config (if using containers)
  docker: {
    mountPath: string;
    <language>Version: string;
    memory: string;
  };
}
```

**Example** (TypeScript):
```typescript
export interface TypeScriptToolConfig {
  eslint: { enabled: boolean; fix: boolean; };        // Primary
  typescript: { enabled: boolean; strict: boolean; }; // Type checking
  semgrep: { enabled: boolean; config: string; };     // Universal (auto-routed)
  // ...
}
```

#### 2.2. Create Orchestrator Class

```typescript
export class <Language>ToolOrchestrator extends BaseToolOrchestrator {
  private config: <Language>ToolConfig;
  
  constructor(
    config: Partial<<Language>ToolConfig> = {},
    dockerImage = 'your-image-name'
  ) {
    super(dockerImage, '/workspace');
    this.config = { ...DEFAULT_<LANGUAGE>_CONFIG, ...config };
  }
  
  // REQUIRED: Implement abstract methods
  protected getLanguageName(): string {
    return '<language>';
  }
  
  protected getToolsToRun(mode: AnalysisMode, branch: string): string[] {
    // Return list of tools: ['tool1', 'tool2', 'semgrep', 'dependency-check']
  }
  
  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    // IMPORTANT: Route universal tools to base class
    if (this.isUniversalTool(toolName)) {
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }
    
    // Handle language-specific tools
    switch (toolName) {
      case '<tool1>': return this.run<Tool1>(repoPath, branch);
      case '<tool2>': return this.run<Tool2>(repoPath, branch);
      default: throw new Error(`Unknown tool: ${toolName}`);
    }
  }
  
  // Implement language-specific tool methods
  private async run<Tool1>(repoPath: string, branch: string): Promise<ToolResult> {
    // Execute tool and return standardized ToolResult
  }
}
```

#### 2.3. Tool Execution Pattern

Each tool method should return `ToolResult`:
```typescript
private async runToolX(repoPath: string, branch: string): Promise<ToolResult> {
  const startTime = Date.now();
  
  try {
    logger.info(`🔍 Running ToolX...`);
    
    // Execute tool (Docker, npx, or direct command)
    const { stdout } = await execAsync(`tool-command ${repoPath}`);
    
    // Parse results
    const issues: RawIssue[] = this.parseToolXOutput(stdout);
    
    // IMPORTANT: BaseToolOrchestrator will filter invalid issues automatically
    // No need to filter 'unknown' files here!
    
    const duration = Date.now() - startTime;
    logger.info(`✅ ToolX complete: ${issues.length} issues in ${duration}ms`);
    
    return {
      tool: 'toolx',
      success: true,
      duration,
      issues,
      metadata: this.calculateMetadata(issues)
    };
    
  } catch (error: any) {
    return this.createFailedResult('toolx', error.message);
  }
}
```

---

### Step 3: Add Test Scenarios (15 minutes)

**File**: `tests/integration/test-v9-lite-e2e.ts`

**Add 1-2 test scenarios** to `TEST_SCENARIOS` array:

```typescript
// ========================================================================
// <LANGUAGE> TESTS
// ========================================================================

// Test X: <Repository Name>
{
  name: '<Repo> PR #<number>',
  repoUrl: 'https://github.com/<owner>/<repo>',
  testMode: 'pr-review',
  prNumber: <number>,
  language: '<language>',  // SESSION 25: Multi-language support
  expectedFramework: '<framework>',
  expectedToolCount: 3  // Adjust based on your tools
}
```

**Tips for choosing test repositories**:
- ✅ Use popular open-source projects (active, many PRs)
- ✅ Choose PRs that are already merged (stable)
- ✅ Start with smaller repos (<10k files) for faster testing
- ✅ Pick PRs with some issues (not perfect code)
- ❌ Avoid huge repos like VSCode (slow to clone/analyze)

**Good Examples**:
- Java: Spring PetClinic (4k files, ~600 issues)
- TypeScript: CodeQual itself (2k files, fast to test)
- Python: Flask or requests library

---

### Step 4: Verify Tools on Oracle Cloud (10 minutes)

**SSH to Oracle Cloud**:
```bash
export SSH_KEY="/path/to/key"
export ORACLE_IP="your-ip"
ssh -i "$SSH_KEY" opc@${ORACLE_IP}
```

**Check required tools**:
```bash
# Universal tools (should already be installed)
semgrep --version           # ✅ v1.45.0
dependency-check.sh --version  # ✅ v12.1.0

# Language runtime
<language> --version        # e.g., python --version, node --version

# Language-specific tools (check if installed)
<tool1> --version          # e.g., pylint --version, eslint --version

# If using npx/pip (no global install needed)
npx <tool> --version       # Auto-installs if needed
```

**Installation (if needed)**:
```bash
# For npm-based tools (TypeScript, JavaScript)
npm install -g <tool>      # May need sudo

# For pip-based tools (Python)
pip install <tool>

# For Go tools
go install <tool>@latest
```

**Best Practice**: Use `npx`/`pip install --user` to avoid sudo requirements

---

### Step 5: Run Initial Test (20-40 minutes)

**Push code to main**:
```bash
git add .
git commit -m "feat(tests): add <language> test scenarios"
git push origin main
```

**Sync Oracle Cloud**:
```bash
ssh -i "$SSH_KEY" opc@${ORACLE_IP} "cd ~/codequal && git pull origin main"
```

**Run test**:
```bash
ssh -i "$SSH_KEY" opc@${ORACLE_IP} "
  cd ~/codequal/packages/agents && 
  npx tsx tests/integration/test-v9-lite-e2e.ts 2>&1 | 
  tee ~/v9-<language>-test.log
"
```

**Monitor progress** (in another terminal):
```bash
ssh -i "$SSH_KEY" opc@${ORACLE_IP} "tail -f ~/v9-<language>-test.log | grep -E 'Testing|Total Issues|TEST PASSED|TEST FAILED'"
```

---

### Step 6: Review Results & Iterate (30-60 minutes)

**Download report**:
```bash
REPORT=$(ssh -i "$SSH_KEY" opc@${ORACLE_IP} "ls -t ~/codequal/packages/agents/tests/integration/test-outputs/*<repo-name>*.md | head -1")

scp -i "$SSH_KEY" "opc@${ORACLE_IP}:$REPORT" "./test-outputs/<language>-test-report.md"
```

**Check for issues**:
1. Did all tools execute? (Check for "succeeded" count)
2. Are issue counts reasonable? (Not 0, not 100,000)
3. Do issues have valid file paths? (No "unknown")
4. Is the manifest URL generated? (Supabase URL present)
5. Is the PR author real? (Not "test-user")

**Common Issues & Fixes**:

| Issue | Cause | Fix |
|-------|-------|-----|
| Tool not found | Not installed | Install globally or use npx/pip |
| Permission denied | Docker/file permissions | Check user permissions |
| 0 issues found | Tool config wrong | Check tool execution command |
| Unknown file locations | Tool output parsing | Review parser implementation |
| Test timeout | Large repository | Use smaller repo or increase timeout |

---

### Step 7: Commit & Document (15 minutes)

**If test passes**, commit the results:
```bash
git add tests/integration/test-outputs/<language>-*
git commit -m "test(<language>): verify V9 framework works for <language>

Results:
- Tools: X/X succeeded
- Issues: N total
- All Session 25 fixes verified (email normalization, fair scoring, etc.)
- Report size: X KB
- Duration: X seconds"

git push origin main
```

**Update documentation**:
- `QUICK_START_NEXT_SESSION.md` - Add language to completed list
- `V9_CRITICAL_KNOWLEDGE_BASE.md` - Note language support
- This guide - Add to "Verified Languages" section below

---

## ✅ Verified Languages

### Java ✅
- **Orchestrator**: `java-tool-orchestrator.ts`
- **Tools**: PMD, Checkstyle, SpotBugs, Semgrep, Dependency-Check
- **Test Repo**: Spring PetClinic PR #950
- **Status**: Production-ready
- **Session**: 19-25

### TypeScript ✅
- **Orchestrator**: `typescript-tool-orchestrator.ts`
- **Tools**: ESLint, TSC, Semgrep, Dependency-Check
- **Test Repo**: CodeQual PR #50 (pending)
- **Status**: Infrastructure complete, testing in progress
- **Session**: 25+

### Python ⏳
- **Orchestrator**: `python-tool-orchestrator.ts`
- **Tools**: Pylint, Bandit, mypy, Semgrep, Dependency-Check
- **Test Repo**: TBD
- **Status**: Infrastructure complete, not yet tested
- **Session**: 26+

---

## 🎓 Key Principles

### 1. **Reuse > Recreate**
- 95% of framework is language-agnostic
- Only create language-specific tool execution
- Extend `BaseToolOrchestrator`, don't copy it

### 2. **Universal Tools First**
- Semgrep (security) works for ALL languages
- Dependency-Check (CVE) works for 7+ languages
- Route these to universal runners automatically

### 3. **Test with Real PRs**
- Use actual open-source repositories
- Choose merged PRs (stable, won't disappear)
- Validate complete business flow

### 4. **Session 25 Fixes Auto-Apply**
All these work automatically for new languages:
- ✅ Email normalization (formatter)
- ✅ Fair skill scoring (score-calculator)
- ✅ Invalid issue filtering (base-tool-orchestrator)
- ✅ Supabase URLs (formatter)
- ✅ Real PR author (test infrastructure)

---

## 📊 Language-Specific Checklist

For each language, you need:

### Required (Must Have)
- [ ] Tool orchestrator extending `BaseToolOrchestrator`
- [ ] At least 1 code quality tool (ESLint, Pylint, etc.)
- [ ] At least 1 test scenario with real PR
- [ ] Tool availability on Oracle Cloud verified

### Recommended (Should Have)
- [ ] 2-3 test repositories (different frameworks)
- [ ] Tool output parser (if complex parsing needed)
- [ ] 3-4 tools total (quality, security, dependencies, performance)

### Optional (Nice to Have)
- [ ] Framework detection (Spring, React, Django, etc.)
- [ ] Advanced tools (performance profilers, etc.)
- [ ] Custom severity mappings

---

## 🛠️ Tool Selection Matrix

### Security (Pick 1-2)
- **Semgrep** ✅ - Universal, works for ALL languages (use this!)
- Language-specific: Bandit (Python), gosec (Go), etc.

### Code Quality (Pick 1)
- **ESLint** - TypeScript/JavaScript
- **Pylint** - Python
- **golangci-lint** - Go
- **RuboCop** - Ruby
- **Clippy** - Rust

### Dependencies (Pick 1)
- **Dependency-Check** ✅ - Universal CVE scanner (use this!)
- npm-audit (TypeScript), Safety (Python), etc.

### Type Checking (Optional)
- **TSC** - TypeScript
- **mypy** - Python
- Built into language - Go, Rust

### Performance (Optional)
- JMH (Java), lighthouse (Web), py-spy (Python)

---

## 📝 Code Templates

### Minimal Orchestrator (30 lines)

```typescript
import { BaseToolOrchestrator, ToolResult, RawIssue } from '../base-tool-orchestrator';

export class <Language>ToolOrchestrator extends BaseToolOrchestrator {
  constructor() {
    super('docker-image-name', '/workspace');
  }
  
  protected getLanguageName(): string {
    return '<language>';
  }
  
  protected getToolsToRun(mode, branch): string[] {
    return ['tool1', 'semgrep', 'dependency-check']; // Universal tools auto-routed
  }
  
  protected async executeTool(toolName, repoPath, branch, options): Promise<ToolResult> {
    // Route universal tools (automatic)
    if (this.isUniversalTool(toolName)) {
      return this.executeUniversalTool(toolName, repoPath, branch, options);
    }
    
    // Language-specific tools
    switch (toolName) {
      case 'tool1': return this.runTool1(repoPath, branch);
      default: throw new Error(`Unknown tool: ${toolName}`);
    }
  }
  
  private async runTool1(repoPath, branch): Promise<ToolResult> {
    // Execute tool, parse output, return ToolResult
    // BaseToolOrchestrator will automatically filter invalid issues!
  }
}
```

### Test Scenario Template

```typescript
{
  name: '<Repo> PR #<number>',
  repoUrl: 'https://github.com/<owner>/<repo>',
  testMode: 'pr-review',
  prNumber: <number>,
  language: '<language>',
  expectedFramework: '<framework>',
  expectedToolCount: 3
}
```

---

## ⚠️ Common Pitfalls to Avoid

### 1. **Don't Recreate BaseToolOrchestrator Logic**
❌ Bad: Copy orchestration logic from Java orchestrator  
✅ Good: Extend BaseToolOrchestrator, only add language-specific tools

### 2. **Don't Manually Filter Invalid Issues**
❌ Bad: Add `if (file === 'unknown') return;` in your tool method  
✅ Good: Return all issues, BaseToolOrchestrator filters automatically (SESSION 25)

### 3. **Don't Hardcode Scoring Logic**
❌ Bad: Calculate skill scores in language orchestrator  
✅ Good: Return issues, score-calculator handles all languages

### 4. **Don't Skip Universal Tools**
❌ Bad: Implement Semgrep as language-specific tool  
✅ Good: Include 'semgrep' in getToolsToRun(), it routes automatically

### 5. **Don't Create Custom Report Formatters**
❌ Bad: Create `<Language>ReportFormatter`  
✅ Good: Use `V9GroupedReportFormatter` (works for all languages)

---

## 🧪 Testing Workflow

### Local Development
```bash
# Make changes
vim src/two-branch/tools/<language>/<language>-tool-orchestrator.ts

# Verify build
npx tsc --noEmit

# Commit
git commit -m "feat(<language>): add <language> orchestrator"
git push origin main
```

### Oracle Cloud Testing
```bash
# Sync cloud
ssh ... "cd ~/codequal && git pull origin main"

# Run test
ssh ... "cd ~/codequal/packages/agents && npx tsx tests/integration/test-v9-lite-e2e.ts"

# Download report
scp ... "opc@...:~/codequal/packages/agents/tests/integration/test-outputs/..." .
```

### Iteration Cycle
1. Run test on Oracle (4-5 min)
2. Review report locally
3. Fix issues in code
4. Commit & push
5. Repeat until all tools work

---

## 📈 Success Criteria

A language is "complete" when:
- [ ] Test passes (TEST PASSED shown)
- [ ] All expected tools execute successfully
- [ ] Issues found (reasonable count, not 0 or 100k)
- [ ] No "unknown" file locations in report
- [ ] Manifest URL generated (Supabase)
- [ ] Real PR author shown (not test-user)
- [ ] Skill scores consistent (Executive Summary = Skills Tracking)
- [ ] Auto-fixable coverage > 50%

---

## 🚀 Time Estimates

| Task | Time | Complexity |
|------|------|------------|
| Check existing infrastructure | 5 min | ⭐ Easy |
| Create orchestrator (if needed) | 30-60 min | ⭐⭐ Medium |
| Add test scenarios | 15 min | ⭐ Easy |
| Verify tools on Oracle | 10 min | ⭐ Easy |
| Run initial test | 20-40 min | ⭐ Easy |
| Review & iterate | 30-60 min | ⭐⭐ Medium |
| Final commit & docs | 15 min | ⭐ Easy |
| **Total** | **2-3 hours** | ⭐⭐ Medium |

---

## 🎯 Quick Start Commands

```bash
# 1. Check existing infrastructure
ls src/two-branch/tools/<language>/

# 2. If orchestrator exists, skip creation and go to step 3

# 3. Add test scenarios to test-v9-lite-e2e.ts
vim tests/integration/test-v9-lite-e2e.ts

# 4. Verify tools on Oracle
ssh -i "$SSH_KEY" opc@${ORACLE_IP} "semgrep --version && <tool> --version"

# 5. Push & sync
git add . && git commit -m "feat(<language>): add test scenarios" && git push origin main
ssh -i "$SSH_KEY" opc@${ORACLE_IP} "cd ~/codequal && git pull origin main"

# 6. Run test
ssh -i "$SSH_KEY" opc@${ORACLE_IP} "cd ~/codequal/packages/agents && npx tsx tests/integration/test-v9-lite-e2e.ts"

# 7. Download & review
REPORT=$(ssh -i "$SSH_KEY" opc@${ORACLE_IP} "ls -t ~/codequal/packages/agents/tests/integration/test-outputs/*.md | head -1")
scp -i "$SSH_KEY" "opc@${ORACLE_IP}:$REPORT" ./report.md
```

---

## 📚 Reference Files

### Must Read
1. `base-tool-orchestrator.ts` - Base class you'll extend
2. `java-tool-orchestrator.ts` - Complete example (best reference)
3. `typescript-tool-orchestrator.ts` - Another complete example
4. `test-v9-lite-e2e.ts` - Multi-language test infrastructure

### Supporting Files
- `universal-tool-config.ts` - Tool configuration system
- `score-calculator.ts` - Scoring algorithm
- `v9-grouped-report-formatter.ts` - Report generation

---

## 🎉 Success Example: Java

**What existed**: Nothing  
**Time taken**: 8 sessions (Sessions 17-25)  
**What was built**:
- Java orchestrator
- 5 tools integrated (PMD, Checkstyle, SpotBugs, Semgrep, Dependency-Check)
- 4 test scenarios
- 627 issues detected on Spring PetClinic
- All Session 25 fixes verified

**Key insight**: Once infrastructure was right, adding test scenarios took only 15 minutes!

---

## 💡 Pro Tips

1. **Start with existing orchestrator as template** - Don't write from scratch
2. **Test with small repos first** - Faster iteration
3. **Use npx/pip for tools** - Avoids global install issues
4. **Check Oracle Cloud, not local** - Avoid Docker daemon issues
5. **Review existing language-parsers** - May already exist!
6. **Universal tools are free** - Semgrep + Dependency-Check work everywhere
7. **Session 25 fixes auto-apply** - No extra work needed for scoring/filtering

---

## ❓ FAQ

**Q: Do I need to create a parser?**  
A: Only if tool output is complex. Many tools can be parsed inline.

**Q: What if my language tool isn't in Docker?**  
A: Use `npx`, `pip install --user`, or direct execution. Docker is optional.

**Q: How do I handle language-specific severity mappings?**  
A: Create a `map<Tool>Severity()` method in your orchestrator.

**Q: Can I skip Semgrep or Dependency-Check?**  
A: You can, but they're universal and free. Highly recommended to include.

**Q: What if the test fails?**  
A: Check the log on Oracle Cloud (`~/v9-<language>-test.log`), fix the issue, push, and re-run.

---

**Next Language to Add**: TypeScript (in progress - Session 25)  
**After That**: Python (Session 26)

**Remember**: With Session 25 universal fixes, adding a new language is now much faster than before!
