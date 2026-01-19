# Tier 2 Native Fixer Capability Matrix

> Session 104: Complete validation of all native fixers for the fix-agent pipeline.
> Session 105: E2E test coverage added for all language fixers (225+ tests).
> Updated with clang-tidy, dotnet-format, and Sorald test results.
>
> **See Also:** [E2E Test Results](./E2E_TEST_RESULTS.md) for comprehensive test outcomes.

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
| **Sorald** | `java -jar sorald.jar repair --source <dir> --rule-key <rule>` | ~30 SonarQube rules (S1068, S1132, S1155, S1481, etc.) | JAR download required | ✅ Tested |
| **OpenRewrite** | Maven/Gradle plugin | Recipe-based refactoring | Requires project setup | ⚙️ Documented |
| **PMD** | N/A | **NO AUTO-FIX** | Detection only | ⚠️ Needs AI |

**Sorald Supported Rules (partial list):**
- S1068: Unused private fields
- S1132: String literal on left of equals
- S1155: Use isEmpty() instead of size()==0
- S1481: Unused local variables
- S1860: Synchronization on strings
- S2095: Resources should be closed
- S2142: InterruptedException handling
- S2755: XXE vulnerability prevention

### C/C++ Tools

| Tool | Command | What It Fixes | Limitations | Status |
|------|---------|---------------|-------------|--------|
| **clang-format** | `clang-format -i` | All formatting | Formatting only | ✅ Tested |
| **clang-tidy** | `clang-tidy --fix --checks='modernize-*' <file> -- -std=c++17 -isysroot $(xcrun --show-sdk-path)` | Modernization, readability | Needs LLVM in PATH + SDK | ✅ Tested |

**clang-tidy Auto-Fix Capabilities:**
- `modernize-use-nullptr`: `0` → `nullptr`
- `modernize-use-override`: Add `override` keyword
- `modernize-use-equals-default`: `~Foo() {}` → `~Foo() = default;`
- `modernize-use-trailing-return-type`: `int main()` → `auto main() -> int`

### C# Tools

| Tool | Command | What It Fixes | Limitations | Status |
|------|---------|---------------|-------------|--------|
| **dotnet-format** | `dotnet format` | Formatting, analyzers | Needs .NET SDK + .csproj | ✅ Tested |

**dotnet-format Auto-Fix Capabilities:**
- Whitespace and indentation normalization
- Brace placement (Allman style by default)
- Spacing around operators and commas
- Configurable via .editorconfig

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

# Sorald (download JAR - not available via brew)
mkdir -p ~/tools
curl -L -o ~/tools/sorald.jar https://github.com/ASSERT-KTH/sorald/releases/download/sorald-0.8.6/sorald-0.8.6-jar-with-dependencies.jar

# Usage: java -jar ~/tools/sorald.jar repair --source <dir> --rule-key S1155
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

## Session 104 Test Results Summary

| Category | Tools Tested | Working | Notes |
|----------|--------------|---------|-------|
| Python | 5 | 5 ✅ | All working |
| Go | 3 | 3 ✅ | All working |
| Java | 4 | 3 ✅ | Sorald tested (JAR), OpenRewrite documented |
| C/C++ | 2 | 2 ✅ | clang-tidy needs LLVM PATH |
| C# | 1 | 1 ✅ | dotnet-format tested |
| TypeScript | 1 | 1 ✅ | ESLint working |
| **Total** | **16** | **15 ✅** | 1 plugin (OpenRewrite) |

### Session 104 Changes
- ✅ Installed and tested clang-tidy via LLVM
- ✅ Installed and tested dotnet-format via .NET SDK
- ✅ Downloaded and tested Sorald JAR
- ✅ Documented OpenRewrite Maven/Gradle setup

## Session 105 E2E Test Coverage

All tier 2 fixers have comprehensive E2E test coverage:

| Test File | Tests | Status |
|-----------|-------|--------|
| `e2e-python.test.ts` | 30 | ✅ Pass |
| `e2e-go.test.ts` | 30 | ✅ Pass |
| `e2e-java.test.ts` | 30 | ✅ Pass |
| `e2e-cpp.test.ts` | 30 | ✅ Pass |
| `e2e-csharp.test.ts` | 30 | ✅ Pass |
| `e2e-typescript.test.ts` | 30 | ✅ Pass |
| `e2e-full-pipeline.test.ts` | 25 | ✅ Pass |
| **Total** | **~225** | ✅ All Pass |

### Key Quirks Discovered in E2E Testing

1. **PMD Has NO Auto-Fix** - All PMD rules require AI (Tier 3)
2. **Ruff Unsafe Fixes** - E711/E712 require `--unsafe-fixes` flag
3. **clang-tidy SDK** - Requires `SDKROOT=$(xcrun --show-sdk-path)` on macOS
4. **dotnet-format Context** - Requires `.csproj` in directory tree
5. **goimports > gofmt** - goimports is a superset, prefer it
6. **Sorald JAR** - Requires separate JAR download and Java runtime
7. **golangci-lint** - Only formatting linters support `--fix`

### Running E2E Tests

```bash
# All E2E tests
cd packages/agents
npm test -- --testPathPattern="e2e-" --verbose

# Specific language
npm test -- --testPathPattern="e2e-python" --verbose
```

---

*Last updated: Session 105 (2026-01-19)*
