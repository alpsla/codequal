# Session 104: Install and Test Missing Native Fixers

## Context
Session 103 validated 11 native fixers but found 4 tools not installed. This session installs and tests the missing tools.

Missing tools from Session 103:
- Sorald (Java SonarQube fixer)
- clang-tidy (C/C++ linting with fixes)
- dotnet-format (C# formatting)
- OpenRewrite (Java Maven plugin)

---

### 1. Install clang-tidy via LLVM
**Goal**: Install clang-tidy which is part of LLVM tools
**Steps**:
1. Run `brew install llvm`
2. Add LLVM to PATH: `export PATH="/opt/homebrew/opt/llvm/bin:$PATH"`
3. Verify installation: `clang-tidy --version`
4. Document the installation in TIER2_FIXER_MATRIX.md

---

### 2. Test clang-tidy auto-fix capabilities
**Goal**: Validate which clang-tidy checks support auto-fix
**Steps**:
1. Create test C++ file with modernization issues (auto, nullptr, override)
2. Run `clang-tidy --fix --checks='modernize-*' test.cpp`
3. Document which checks support --fix
4. Create before/after examples

---

### 3. Install dotnet SDK
**Goal**: Install .NET SDK for dotnet-format
**Steps**:
1. Run `brew install dotnet`
2. Verify installation: `dotnet --version`
3. Document the installation

---

### 4. Test dotnet-format capabilities
**Goal**: Validate dotnet-format on C# code
**Steps**:
1. Create minimal C# project with formatting issues
2. Run `dotnet format` on the project
3. Document what dotnet-format fixes
4. Note: requires .csproj file

---

### 5. Install Sorald (Java SonarQube fixer)
**Goal**: Install Sorald for Java SonarQube rule fixes
**Steps**:
1. Check brew: `brew install sorald` or download JAR
2. Verify installation: `sorald --version`
3. Document supported SonarQube rules
4. If not available via brew, document JAR download from GitHub

---

### 6. Test Sorald auto-fix capabilities
**Goal**: Validate Sorald on Java SonarQube violations
**Steps**:
1. Create test Java file with SonarQube violations (S1068, S1144, etc.)
2. Run `sorald repair --source <file>`
3. Document which SonarQube rules Sorald can fix
4. Compare to PMD (which has no auto-fix)

---

### 7. Document OpenRewrite setup
**Goal**: Document how to use OpenRewrite Maven plugin
**Steps**:
1. Create sample pom.xml with OpenRewrite plugin
2. Document common recipes for code quality
3. Show example: `mvn rewrite:run -Drewrite.recipeArtifactCoordinates=...`
4. Note: This is a project-level tool, not CLI

---

### 8. Update TIER2_FIXER_MATRIX.md with new findings
**Goal**: Update documentation with installation results
**Steps**:
1. Update tool status for newly installed tools
2. Add detailed capabilities for clang-tidy
3. Add dotnet-format capabilities
4. Add Sorald supported rules list
5. Update installation instructions

---

### 9. Add new executors if tools work
**Goal**: Ensure tier2-executor.ts has working executors
**Steps**:
1. Verify ClangTidyExecutor works with installed tool
2. Verify DotnetFormatExecutor works with installed tool
3. Add SoraldExecutor if Sorald is installed
4. Update checkInstalled() to work correctly

---

### 10. Run comprehensive tier 2 availability check
**Goal**: Verify all tier 2 tools are properly detected
**Steps**:
1. Create script to check all tool availability
2. Run getAllTier2ToolsStatus() and log results
3. Verify installation hints are correct
4. Document final tool coverage

---

### 11. Update test suite with new tools
**Goal**: Add tests for newly installed tools
**Steps**:
1. Add dry-run tests for clang-tidy
2. Add dry-run tests for dotnet-format
3. Add tests for Sorald if installed
4. Verify all executors are covered

---

### 12. Create installation script for CI/CD
**Goal**: Document how to install all tier 2 tools in CI
**Steps**:
1. Create shell script with all tool installations
2. Support macOS (brew) and Linux (apt)
3. Add to docs/CI_TOOL_INSTALLATION.md
4. Test script runs without errors
