# Session 103: Complete Native Fixer Validation

## Context
Session 102 tested some native fixers but not all. This session completes the validation of all tier 2 native fixers.

Reference file: `/Users/alpinro/CodePrjects/codequal/packages/agents/src/fix-agent/tool-fixers/tier2-executor.ts`

---

### 1. Test Autoflake (Python - unused imports/variables)
**Goal**: Validate autoflake removes unused imports and variables
**Steps**:
1. Create test Python file with unused imports and variables
2. Run `autoflake --in-place --remove-all-unused-imports --remove-unused-variables`
3. Verify unused code is removed
4. Document which issues autoflake can fix vs what needs AI

---

### 2. Test Black (Python - code formatter)
**Goal**: Validate Black formats Python code correctly
**Steps**:
1. Create test Python file with formatting issues (long lines, inconsistent quotes, spacing)
2. Run `black` on the test file
3. Verify formatting is corrected
4. Document Black's formatting capabilities

---

### 3. Test isort (Python - import sorting)
**Goal**: Validate isort organizes Python imports
**Steps**:
1. Create test Python file with unorganized imports
2. Run `isort` on the test file
3. Verify imports are sorted (stdlib, third-party, local)
4. Document isort's sorting behavior

---

### 4. Test PyUpgrade (Python - syntax upgrades)
**Goal**: Validate PyUpgrade modernizes Python syntax
**Steps**:
1. Create test Python file with old-style syntax (format strings, type hints)
2. Run `pyupgrade --py310-plus` on the test file
3. Verify syntax is modernized (f-strings, modern type hints)
4. Document which upgrades PyUpgrade handles

---

### 5. Install and Test goimports (Go)
**Goal**: Install goimports and validate it fixes Go imports
**Steps**:
1. Check if goimports is installed, if not document installation: `go install golang.org/x/tools/cmd/goimports@latest`
2. Create test Go file with unused imports and formatting issues
3. Run `goimports -w` on the test file
4. Verify unused imports removed and formatting fixed
5. Compare goimports vs gofmt capabilities

---

### 6. Install and Test google-java-format (Java)
**Goal**: Install google-java-format and validate Java formatting
**Steps**:
1. Check if google-java-format is installed, document installation if needed
2. Create test Java file with formatting issues
3. Run `google-java-format --replace` on the test file
4. Verify formatting matches Google Java Style Guide
5. Document limitations (formatting only, not semantic fixes)

---

### 7. Test Sorald (Java - SonarQube rule fixer)
**Goal**: Validate Sorald can fix SonarQube violations
**Steps**:
1. Check if Sorald is installed
2. Create test Java file with common SonarQube violations
3. Run `sorald repair` on the test file
4. Document which SonarQube rules Sorald can auto-fix
5. Compare Sorald capabilities vs PMD (which has no auto-fix)

---

### 8. Test OpenRewrite (Java - recipe-based refactoring)
**Goal**: Validate OpenRewrite for Java refactoring
**Steps**:
1. Check if OpenRewrite Maven plugin is available
2. Document common recipes for security/code quality fixes
3. Test a simple recipe on sample Java code
4. Document how to integrate OpenRewrite with fix-agent

---

### 9. Test clang-format (C/C++ formatting)
**Goal**: Validate clang-format for C/C++ code
**Steps**:
1. Check if clang-format is installed
2. Create test C++ file with formatting issues
3. Run `clang-format -i` on the test file
4. Document formatting capabilities

---

### 10. Test clang-tidy (C/C++ linting with fixes)
**Goal**: Validate clang-tidy auto-fix capabilities
**Steps**:
1. Check if clang-tidy is installed
2. Create test C++ file with common issues
3. Run `clang-tidy --fix` on the test file
4. Document which checks support auto-fix

---

### 11. Test dotnet-format (C# formatting)
**Goal**: Validate dotnet-format for C# code
**Steps**:
1. Check if dotnet CLI is installed
2. Create test C# file with formatting issues
3. Run `dotnet format` on a test project
4. Document formatting capabilities

---

### 12. Create comprehensive fixer capability matrix
**Goal**: Document all tier 2 fixers with their capabilities
**Steps**:
1. Create markdown table with all fixers
2. List: tool name, language, what it fixes, what needs AI
3. Add installation instructions for each tool
4. Add to docs/ for reference

---

### 13. Update tier2-executor with installation checks
**Goal**: Add tool availability checks to executors
**Steps**:
1. Add `isAvailable()` method to ToolExecutorBase if not exists
2. Implement availability check for each executor
3. Return graceful error when tool not installed
4. Log installation instructions when tool missing

---

### 14. Create tier 2 fixer test suite
**Goal**: Automated tests for native fixer validation
**Steps**:
1. Create test file: `packages/agents/src/fix-agent/tool-fixers/__tests__/tier2-executor.test.ts`
2. Add tests for each executor's fix capabilities
3. Mock tool execution for CI environments
4. Test getRecommendedTier2Fixer() function
