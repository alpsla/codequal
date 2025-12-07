# Unified Shared Tools Architecture - All Languages

**Date**: January 13, 2025
**Strategic Decision**: Design unified architecture for TypeScript, Python, Go, Rust, PHP, Ruby (all non-Java languages)

---

## 🎯 Strategic Question

Should we create a unified shared tools architecture for ALL languages, or treat each language separately?

**Answer**: **YES - Create Unified Architecture for Non-Java Languages**

---

## 📊 Language Analysis

### Languages Planned for CodeQual V9

| Language | Key Tools | Tool Startup | Compilation Required | Benefit from Shared Tools |
|----------|-----------|--------------|----------------------|---------------------------|
| **Java** | PMD, Checkstyle, SpotBugs, Semgrep | Slow (JVM) | Yes (SpotBugs) | ❌ Keep Docker |
| **TypeScript** | ESLint, TSC, npm-audit, Semgrep | Fast (Node.js) | No | ✅ YES |
| **Python** | pylint, mypy, bandit, ruff, Semgrep | Fast (Python) | No | ✅ YES |
| **Go** | golangci-lint, staticcheck, gosec, Semgrep | Fast (compiled) | No | ✅ YES |
| **Rust** | clippy, rustfmt, cargo-audit, Semgrep | Medium (compiled) | No | ✅ YES |
| **PHP** | phpstan, psalm, phpcs, Semgrep | Fast (PHP) | No | ✅ YES |
| **Ruby** | rubocop, brakeman, bundler-audit, Semgrep | Fast (Ruby) | No | ✅ YES |

### Key Insight

**Non-Java languages share common characteristics:**
- ✅ Fast tool startup (no JVM overhead)
- ✅ No compilation required for static analysis
- ✅ Benefit significantly from shared tools (50-80% faster)
- ✅ Similar orchestration pattern (scan files → parse output)

**Java is unique:**
- ❌ Slow JVM startup (Docker overhead is negligible compared to JVM)
- ❌ Some tools require compilation (SpotBugs analyzes bytecode)
- ❌ Benefits more from Docker isolation

---

## 🏗️ Recommended Architecture: Unified Shared Tools

### Directory Structure

```
/opt/codequal-tools/
├── bin/                           # All tool binaries
│   ├── eslint                     # TypeScript/JavaScript
│   ├── tsc                        # TypeScript compiler
│   ├── pylint                     # Python
│   ├── mypy                       # Python type checker
│   ├── bandit                     # Python security
│   ├── ruff                       # Python linter (fast)
│   ├── golangci-lint              # Go meta-linter
│   ├── staticcheck                # Go static analyzer
│   ├── gosec                      # Go security
│   ├── clippy-driver              # Rust linter
│   ├── cargo-audit                # Rust security
│   ├── phpstan                    # PHP static analyzer
│   ├── psalm                      # PHP analyzer
│   ├── rubocop                    # Ruby linter
│   ├── brakeman                   # Ruby security
│   └── semgrep                    # Universal security tool
│
├── lib/
│   ├── node_modules/              # JavaScript/TypeScript packages
│   │   ├── eslint/
│   │   ├── typescript/
│   │   ├── @typescript-eslint/
│   │   └── ...
│   ├── python/                    # Python packages
│   │   ├── pylint/
│   │   ├── mypy/
│   │   ├── bandit/
│   │   └── ...
│   ├── go/                        # Go modules (if needed)
│   └── rust/                      # Rust crates (if needed)
│
└── config/                        # Shared configurations
    ├── eslint/
    ├── pylint/
    └── ...
```

### Benefits of Unified Architecture

1. **Single Setup Process** (10 minutes total, not 10 minutes per language)
   ```bash
   # Extract ALL language tools at once
   ./setup-all-language-tools.sh
   ```

2. **Consistent PATH Management**
   ```bash
   # One PATH update, all tools available
   export PATH="/opt/codequal-tools/bin:$PATH"
   ```

3. **Predictable Resource Usage**
   - ~500MB for TypeScript tools
   - ~300MB for Python tools
   - ~200MB for Go tools
   - ~200MB for Rust tools
   - ~100MB for PHP tools
   - ~100MB for Ruby tools
   - **Total: ~1.5GB one-time** (vs 100-300MB PER REPO without shared tools)

4. **Unified Orchestrator Pattern**
   ```typescript
   // Same pattern for all non-Java languages
   class UniversalToolOrchestrator {
     async executeTool(tool: string, repoPath: string) {
       const toolBin = `/opt/codequal-tools/bin/${tool}`;

       if (existsSync(toolBin)) {
         // Use shared tool ✅
         return this.runSharedTool(toolBin, repoPath);
       } else {
         // Fallback to language package manager ⚠️
         return this.runViaPackageManager(tool, repoPath);
       }
     }
   }
   ```

5. **Easy Updates**
   ```bash
   # Update ALL tools at once by re-extracting from Docker
   ./update-all-tools.sh
   ```

---

## 🔄 Architecture Comparison

### Option A: Current Plan (Language-Specific Shared Tools)

**Structure:**
```
/opt/codequal-tools/typescript/
/opt/codequal-tools/python/
/opt/codequal-tools/go/
```

**Pros:**
- ✅ Clear separation per language
- ✅ Easy to understand

**Cons:**
- ❌ Complex PATH management (`PATH=/opt/.../typescript/bin:/opt/.../python/bin:...`)
- ❌ Separate setup process per language
- ❌ Harder to maintain
- ❌ Duplicate Semgrep for each language

---

### Option B: Unified Shared Tools (Recommended ✅)

**Structure:**
```
/opt/codequal-tools/bin/        # All binaries
/opt/codequal-tools/lib/        # All libraries
```

**Pros:**
- ✅ Simple PATH: `/opt/codequal-tools/bin`
- ✅ Single setup process
- ✅ Easy to maintain
- ✅ One Semgrep binary shared across all languages
- ✅ Consistent orchestrator pattern

**Cons:**
- ⚠️ Need to organize `lib/` by language (solved with subdirectories)

**Winner:** Option B ✅

---

### Option C: Keep Docker Containers for Everything

**Structure:**
```
docker run lang-typescript-v4.6 eslint ...
docker run lang-python-v3.2 pylint ...
docker run lang-go-v2.1 golangci-lint ...
```

**Pros:**
- ✅ Consistent with Java pattern
- ✅ Isolated execution

**Cons:**
- ❌ Docker spawn overhead (2-3s per tool)
- ❌ Higher resource usage
- ❌ Slower than shared tools (50-80% slower)

**Verdict:** Not optimal for fast-startup tools

---

## 📋 Implementation Plan

### Phase 1: Extract All Language Tools (One-Time Setup)

Create unified setup script: `setup-unified-shared-tools.sh`

```bash
#!/bin/bash
# Setup unified shared tools for all non-Java languages

set -e

echo "🚀 Setting up unified shared tools for all languages..."

# Create directory structure
sudo mkdir -p /opt/codequal-tools/{bin,lib/{node_modules,python,go,rust}}
sudo chown -R opc:opc /opt/codequal-tools

# === TypeScript/JavaScript Tools ===
echo "📦 Extracting TypeScript/JavaScript tools..."
docker run --rm \
  -v /opt/codequal-tools:/output \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-typescript-v4.6-arm \
  bash -c "
    # Copy binaries
    cp \$(which eslint) /output/bin/ 2>/dev/null || echo 'ESLint not in PATH, trying alternate locations...'
    cp \$(which tsc) /output/bin/ 2>/dev/null || echo 'TSC not in PATH, trying alternate locations...'

    # Copy node_modules
    if [ -d /usr/local/lib/node_modules ]; then
      cp -r /usr/local/lib/node_modules/* /output/lib/node_modules/
    elif [ -d /node_modules ]; then
      cp -r /node_modules/* /output/lib/node_modules/
    fi

    echo 'TypeScript tools extracted!'
  "

# === Python Tools ===
echo "📦 Extracting Python tools..."
docker run --rm \
  -v /opt/codequal-tools:/output \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-python-v3.2-arm \
  bash -c "
    # Copy binaries
    cp \$(which pylint) /output/bin/ 2>/dev/null || true
    cp \$(which mypy) /output/bin/ 2>/dev/null || true
    cp \$(which bandit) /output/bin/ 2>/dev/null || true
    cp \$(which ruff) /output/bin/ 2>/dev/null || true

    # Copy Python packages
    cp -r /usr/local/lib/python*/site-packages/* /output/lib/python/ 2>/dev/null || true

    echo 'Python tools extracted!'
  "

# === Go Tools ===
echo "📦 Extracting Go tools..."
docker run --rm \
  -v /opt/codequal-tools:/output \
  iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-go-v2.1-arm \
  bash -c "
    # Copy binaries
    cp \$(which golangci-lint) /output/bin/ 2>/dev/null || true
    cp \$(which staticcheck) /output/bin/ 2>/dev/null || true
    cp \$(which gosec) /output/bin/ 2>/dev/null || true

    echo 'Go tools extracted!'
  "

# === Universal Semgrep ===
echo "📦 Extracting Semgrep (universal)..."
docker run --rm \
  -v /opt/codequal-tools:/output \
  returntocorp/semgrep:latest \
  bash -c "
    cp \$(which semgrep) /output/bin/ 2>/dev/null || true
    echo 'Semgrep extracted!'
  "

# Set environment variables
echo "🔧 Configuring environment..."
cat >> ~/.bashrc << 'EOF'

# CodeQual Unified Shared Tools (All Languages)
export CODEQUAL_TOOLS_PATH="/opt/codequal-tools"
export PATH="$CODEQUAL_TOOLS_PATH/bin:$PATH"
export NODE_PATH="$CODEQUAL_TOOLS_PATH/lib/node_modules:$NODE_PATH"
export PYTHONPATH="$CODEQUAL_TOOLS_PATH/lib/python:$PYTHONPATH"

EOF

source ~/.bashrc

# Verify installation
echo "✅ Verifying installation..."
echo "TypeScript:"
which eslint && eslint --version
which tsc && tsc --version

echo "Python:"
which pylint && pylint --version
which mypy && mypy --version

echo "Go:"
which golangci-lint && golangci-lint --version

echo "Universal:"
which semgrep && semgrep --version

echo "🎉 Unified shared tools setup complete!"
echo "📊 Disk usage:"
du -sh /opt/codequal-tools
```

---

### Phase 2: Create Unified Tool Parser

Create `UniversalToolParser` that works for all languages:

```typescript
/**
 * Universal Tool Parser - Works for ALL non-Java languages
 *
 * Supports:
 * - TypeScript: ESLint, TSC
 * - Python: pylint, mypy, bandit, ruff
 * - Go: golangci-lint, staticcheck, gosec
 * - Universal: Semgrep
 */

import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ToolConfig {
  name: string;           // e.g., 'eslint', 'pylint', 'golangci-lint'
  language: string;       // e.g., 'typescript', 'python', 'go'
  configFile?: string;    // e.g., '.eslintrc.json', 'pylintrc'
  outputFormat: 'json' | 'xml' | 'text';
  fallbackCommand?: string;  // e.g., 'npx eslint', 'pip install pylint && pylint'
}

export class UniversalToolParser {
  private sharedToolsPath: string;

  constructor() {
    this.sharedToolsPath = process.env.CODEQUAL_TOOLS_PATH || '/opt/codequal-tools';
  }

  /**
   * Execute a tool with automatic fallback
   */
  async executeTool(
    config: ToolConfig,
    repoPath: string,
    files?: string[]
  ): Promise<ToolResult> {
    const toolBin = `${this.sharedToolsPath}/bin/${config.name}`;

    // Check if shared tool exists
    if (existsSync(toolBin)) {
      console.log(`[${config.name}] ✅ Using shared tools from: ${this.sharedToolsPath}`);
      return this.runSharedTool(toolBin, config, repoPath, files);
    }

    // Fallback to package manager
    if (config.fallbackCommand) {
      console.log(`[${config.name}] ⚠️  Shared tools not found, falling back to: ${config.fallbackCommand}`);
      return this.runFallbackTool(config, repoPath, files);
    }

    throw new Error(`${config.name} not found in shared tools and no fallback configured`);
  }

  /**
   * Run tool from shared tools
   */
  private async runSharedTool(
    toolBin: string,
    config: ToolConfig,
    repoPath: string,
    files?: string[]
  ): Promise<ToolResult> {
    const startTime = Date.now();

    // Build command based on tool
    let command: string;

    switch (config.name) {
      case 'eslint':
        command = this.buildESLintCommand(toolBin, config, repoPath, files);
        break;
      case 'pylint':
        command = this.buildPylintCommand(toolBin, config, repoPath, files);
        break;
      case 'golangci-lint':
        command = this.buildGolangCILintCommand(toolBin, config, repoPath);
        break;
      default:
        command = this.buildGenericCommand(toolBin, config, repoPath, files);
    }

    console.log(`[${config.name} Debug] Command: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000
    });

    const duration = Date.now() - startTime;

    // Parse output based on format
    return this.parseOutput(config, stdout, stderr, duration);
  }

  /**
   * Build ESLint command
   */
  private buildESLintCommand(
    toolBin: string,
    config: ToolConfig,
    repoPath: string,
    files?: string[]
  ): string {
    const fileArgs = files && files.length > 0 ? files.join(' ') : '.';
    const configFlag = config.configFile ? `--config ${config.configFile}` : '';

    return `cd ${repoPath} && ${toolBin} ${fileArgs} ${configFlag} --format json`;
  }

  /**
   * Build pylint command
   */
  private buildPylintCommand(
    toolBin: string,
    config: ToolConfig,
    repoPath: string,
    files?: string[]
  ): string {
    const fileArgs = files && files.length > 0 ? files.join(' ') : '.';
    const configFlag = config.configFile ? `--rcfile ${config.configFile}` : '';

    return `cd ${repoPath} && ${toolBin} ${fileArgs} ${configFlag} --output-format=json`;
  }

  /**
   * Build golangci-lint command
   */
  private buildGolangCILintCommand(
    toolBin: string,
    config: ToolConfig,
    repoPath: string
  ): string {
    const configFlag = config.configFile ? `-c ${config.configFile}` : '';

    return `cd ${repoPath} && ${toolBin} run ${configFlag} --out-format=json`;
  }

  /**
   * Parse tool output
   */
  private parseOutput(
    config: ToolConfig,
    stdout: string,
    stderr: string,
    duration: number
  ): ToolResult {
    // Tool-specific parsers
    switch (config.name) {
      case 'eslint':
        return this.parseESLintOutput(stdout, duration);
      case 'pylint':
        return this.parsePylintOutput(stdout, duration);
      case 'golangci-lint':
        return this.parseGolangCILintOutput(stdout, duration);
      default:
        return this.parseGenericOutput(config, stdout, stderr, duration);
    }
  }
}
```

---

### Phase 3: Update Orchestrators

**Keep Java separate:**
- `JavaToolOrchestrator` - Uses Docker containers (current implementation)

**Unify all others:**
- `UniversalToolOrchestrator` - Uses shared tools (TypeScript, Python, Go, Rust, etc.)

```typescript
// File: src/two-branch/tools/universal-tool-orchestrator.ts

export class UniversalToolOrchestrator extends BaseToolOrchestrator {
  private parser: UniversalToolParser;
  private language: string;

  constructor(language: 'typescript' | 'python' | 'go' | 'rust') {
    super('', '');  // No Docker image needed
    this.language = language;
    this.parser = new UniversalToolParser();
  }

  protected async executeTool(
    toolName: string,
    repoPath: string,
    branch: 'base' | 'pr',
    options: OrchestrationOptions
  ): Promise<ToolResult> {
    const config = this.getToolConfig(toolName);
    return this.parser.executeTool(config, repoPath, options.changedFiles);
  }

  private getToolConfig(toolName: string): ToolConfig {
    // Language-specific tool configuration
    const configs = {
      typescript: {
        eslint: { name: 'eslint', language: 'typescript', configFile: '.eslintrc.json', outputFormat: 'json', fallbackCommand: 'npx eslint' },
        tsc: { name: 'tsc', language: 'typescript', outputFormat: 'text', fallbackCommand: 'npx tsc' }
      },
      python: {
        pylint: { name: 'pylint', language: 'python', configFile: 'pylintrc', outputFormat: 'json', fallbackCommand: 'pip install pylint && pylint' },
        mypy: { name: 'mypy', language: 'python', outputFormat: 'text', fallbackCommand: 'pip install mypy && mypy' }
      },
      go: {
        'golangci-lint': { name: 'golangci-lint', language: 'go', configFile: '.golangci.yml', outputFormat: 'json' }
      }
    };

    return configs[this.language][toolName];
  }
}
```

---

## 📊 Expected Performance

### Disk Usage Comparison

| Approach | TypeScript | Python | Go | Total (3 languages) |
|----------|------------|--------|-----|---------------------|
| **Per-Repo Install** | 300MB/repo | 200MB/repo | 150MB/repo | 650MB/repo |
| **Docker Containers** | 0MB (in image) | 0MB (in image) | 0MB (in image) | 0MB |
| **Unified Shared Tools** | 500MB one-time | 300MB one-time | 200MB one-time | 1GB one-time ✅ |

**For 10 repositories:**
- Per-Repo: 6.5GB ❌
- Docker: 0GB ✅
- Shared Tools: 1GB ✅

---

### Execution Time Comparison

| Approach | First Repo | Second Repo | 10 Repos Total |
|----------|-----------|-------------|----------------|
| **Per-Repo Install** | 35s (install + run) | 35s | 350s |
| **Docker Containers** | 8s (spawn + run) | 8s | 80s |
| **Unified Shared Tools** | 5s (run only) | 5s | 50s ✅ |

**Winner:** Unified Shared Tools (50s vs 80s vs 350s)

---

## ✅ Decision: Unified Architecture for All Non-Java Languages

### Why This is the Right Choice

1. **Simplicity** - One setup process, one PATH, one maintenance workflow
2. **Performance** - 50-80% faster than Docker, 86% faster than per-repo installs
3. **Resource Efficiency** - 1GB total vs 650MB per repo
4. **Consistency** - Same pattern for TypeScript, Python, Go, Rust, PHP, Ruby
5. **Scalability** - Easy to add new languages (extract from Docker → add to shared tools)
6. **Maintainability** - Update all tools at once by re-extracting from Docker

### Java Stays Separate

**Why Java is different:**
- JVM startup cost is significant (Docker overhead is negligible)
- SpotBugs requires compiled bytecode
- Docker containers work well for JVM tools
- No benefit from shared tools approach

---

## 🚀 Recommendation

**DO NOT** set up TypeScript shared tools yet!

**INSTEAD:**
1. ✅ Design unified architecture (this document)
2. ✅ Create `setup-unified-shared-tools.sh` script
3. ✅ Create `UniversalToolParser` for all languages
4. ✅ Test with TypeScript first (prove the concept)
5. ✅ Expand to Python, Go, etc. (same infrastructure)

**Benefits:**
- One-time setup for ALL future languages
- Consistent orchestration pattern
- Easy to extend
- Future-proof architecture

---

## 📚 Next Steps

1. **Review this unified architecture** - Does it make sense?
2. **Create unified setup script** - Extract all language tools
3. **Create UniversalToolParser** - Works for all languages
4. **Test with TypeScript** - Prove the concept
5. **Document the pattern** - For future language additions

**Status**: Architecture design complete - Ready for review and implementation
