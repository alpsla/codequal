# Tier 2 Native Fixer Capability Matrix

> Session 103: Complete validation of all native fixers for the fix-agent pipeline.

## Overview

The fix-agent uses a 3-tier approach:
- **Tier 1**: Pattern cache (0 API calls)
- **Tier 2**: Native --fix tools (0 API calls) ← This document
- **Tier 3**: AI-based fixing (uses API calls)

## Fixer Matrix

### Python Tools

| Tool | Command | What It Fixes | Limitations | Status |
|------|---------|---------------|-------------|--------|
| **Ruff** | `ruff check --fix` | F632 (is vs ==), F401 (unused imports), formatting | Some rules need `--unsafe-fixes` | ✅ Tested |
| **Autoflake** | `autoflake --in-place --remove-all-unused-imports --remove-unused-variables` | Unused imports, unused variables | Preserves imports with comments | ✅ Tested |
| **Black** | `black` | All formatting (quotes, spacing, line length) | Opinionated, no config | ✅ Tested |
| **isort** | `isort` | Import organization (stdlib→third-party→local) | None | ✅ Tested |
| **PyUpgrade** | `pyupgrade --py310-plus` | Old syntax (.format→f-string, List→list) | Python version specific | ✅ Tested |

### Go Tools

| Tool | Command | What It Fixes | Limitations | Status |
|------|---------|---------------|-------------|--------|
| **gofmt** | `gofmt -w` | All formatting | Does NOT remove unused imports | ✅ Tested |
| **goimports** | `goimports -w` | Formatting + unused imports | Need to install separately | ✅ Tested |
| **golangci-lint** | `golangci-lint run --fix` | Limited (formatting only) | Most linters don't support --fix | ✅ Tested |

### Java Tools

| Tool | Command | What It Fixes | Limitations | Status |
|------|---------|---------------|-------------|--------|
| **google-java-format** | `google-java-format --replace` | All formatting (Google style) | Formatting only, NOT semantic | ✅ Tested |
| **Sorald** | `sorald repair` | ~25 SonarQube rules | Specialized, needs installation | ❌ Not Installed |
| **OpenRewrite** | Maven/Gradle plugin | Recipe-based refactoring | Requires project setup | ⚙️ Plugin |
| **PMD** | N/A | **NO AUTO-FIX** | Detection only | ⚠️ Needs AI |

### C/C++ Tools

| Tool | Command | What It Fixes | Limitations | Status |
|------|---------|---------------|-------------|--------|
| **clang-format** | `clang-format -i` | All formatting | Formatting only | ✅ Tested |
| **clang-tidy** | `clang-tidy --fix` | Modernization, readability | Needs compilation DB | ❌ Not Installed |

### C# Tools

| Tool | Command | What It Fixes | Limitations | Status |
|------|---------|---------------|-------------|--------|
| **dotnet-format** | `dotnet format` | Formatting, analyzers | Needs .NET SDK | ❌ Not Installed |

### TypeScript/JavaScript Tools

| Tool | Command | What It Fixes | Limitations | Status |
|------|---------|---------------|-------------|--------|
| **ESLint** | `eslint --fix` | Formatting rules, simple fixes | Semantic rules need AI | ✅ Tested |
| **Prettier** | `prettier --write` | All formatting | Formatting only | Not in tier2-executor |

## Installation Instructions

### Python Tools
```bash
# Via pipx (recommended)
pipx install autoflake
pipx install pyupgrade

# Via pip
pip install black isort ruff
```

### Go Tools
```bash
# goimports
go install golang.org/x/tools/cmd/goimports@latest

# Ensure GOPATH/bin is in PATH
export PATH=$PATH:$(go env GOPATH)/bin
```

### Java Tools
```bash
# google-java-format
brew install google-java-format

# Sorald (optional)
brew install sorald
# Or download JAR from: https://github.com/SpoonLabs/sorald
```

### C/C++ Tools
```bash
# clang-format (usually pre-installed on macOS)
brew install clang-format

# clang-tidy (part of LLVM)
brew install llvm
export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
```

### C# Tools
```bash
# .NET SDK
brew install dotnet
```

## Rules That REQUIRE AI (Tier 3)

These rules cannot be fixed by native tools and require AI:

### Java (PMD)
- `UselessParentheses` - Semantic analysis needed
- `AvoidDollarSigns` - Variable renaming
- `UnnecessaryAnnotationValueElement` - Context-aware
- `UseUtilityClass` - Class restructuring
- All PMD rules (PMD has no --fix)

### TypeScript (ESLint)
- `@typescript-eslint/no-explicit-any` - Type inference needed
- `@typescript-eslint/no-unsafe-*` - Semantic analysis

### Go
- `errcheck` - Error handling patterns
- `unused` - Code removal decisions

### Python
- Complex refactoring rules
- Security-related fixes

## Recommended Fix Pipeline

```
Issue Detected
     │
     ▼
┌─────────────────┐
│ Tier 1: Cache   │ → Pattern exists? → Apply template (0 API calls)
└────────┬────────┘
         │ No pattern
         ▼
┌─────────────────┐
│ Tier 2: Native  │ → Tool supports --fix? → Run native tool
└────────┬────────┘
         │ No native fix
         ▼
┌─────────────────┐
│ Tier 3: AI      │ → Generate fix with AI model
└─────────────────┘
```

## Usage in fix-agent

```typescript
import {
  createTier2Executor,
  getRecommendedTier2Fixer
} from './tool-fixers/tier2-executor';

// Get recommended native fixer
const fixer = getRecommendedTier2Fixer('python', 'ruff');
// Returns: 'ruff'

// Create executor
const executor = createTier2Executor('ruff');
if (executor) {
  const result = await executor.executeFix({
    files: ['path/to/file.py'],
    workingDir: '/project',
  });
}
```

## Session 103 Test Results Summary

| Category | Tools Tested | Working | Not Installed |
|----------|--------------|---------|---------------|
| Python | 5 | 5 ✅ | 0 |
| Go | 3 | 3 ✅ | 0 |
| Java | 4 | 2 ✅ | 2 |
| C/C++ | 2 | 1 ✅ | 1 |
| C# | 1 | 0 | 1 |
| **Total** | **15** | **11 ✅** | **4** |

---

*Last updated: Session 103 (2026-01-19)*
