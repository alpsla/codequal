# Tool Status and Future Updates Tracker

## Overview
This document tracks the status of each static analysis tool, known issues, and planned improvements.

Last Updated: 2025-09-21

## Java Tools

### 🔴 SpotBugs
**Status:** BROKEN - Requires compiled bytecode
**Current Issue:**
- Error: `java.io.IOException: No files to analyze could be opened`
- SpotBugs needs .class or .jar files, not .java source files

**Solutions:**
1. **Short-term:** Skip SpotBugs for source-only analysis
2. **Medium-term:** Add build step before SpotBugs
3. **Long-term:** Replace with source-based alternative

**Alternative Tools to Consider:**
- **Infer** - Facebook's static analyzer (works on source)
- **ErrorProne** - Google's Java bug checker (compile-time)
- **SonarJava** - Works on source code
- **FindSecBugs** - Security-focused (also needs bytecode)

**Action:** SKIP for now, replace with Infer or SonarJava

---

### ✅ PMD
**Status:** WORKING
**Output Format:** `./path:line:\tRuleName:\tMessage`

**Performance Issues:**
- Takes 15+ minutes for 5,583 files
- Analyzes test files unnecessarily

**Optimizations:**
1. **Exclude test directories:** `--exclude '**/test/**'`
2. **Use specific rulesets:** Instead of all bestpractices, use:
   - `category/java/errorprone.xml`
   - `category/java/security.xml`
   - `category/java/performance.xml`
3. **Limit to modified files only** for PR analysis

**Command Update:**
```bash
pmd check -d . \
  --exclude '**/test/**' \
  -R category/java/errorprone.xml,category/java/security.xml \
  -f text --no-progress --no-cache
```

---

### ⏳ Checkstyle
**Status:** NOT TESTED YET
**Expected Format:** `[ERROR] /path:line:column: Message [RuleName]`

**Optimizations:**
1. **Exclude tests:** `-e '**/test/**'`
2. **Use custom rules** instead of google_checks.xml for faster execution
3. **Focus on code style issues** only (not covered by other tools)

**Command Update:**
```bash
find . -name "*.java" -not -path "*/test/*" | \
  xargs checkstyle -c /google_checks.xml
```

---

### ⏳ Semgrep
**Status:** NOT TESTED YET
**Expected Format:** Multi-line output with file, rule, and location

**Optimizations:**
1. **Use specific rulesets:** `--config=java.lang.security`
2. **Exclude tests:** `--exclude='*test*'`
3. **JSON output** for easier parsing: `-o results.json`

**Command Update:**
```bash
semgrep --config=auto \
  --exclude='*test*' \
  --json \
  --no-error .
```

---

### ⏳ Dependency-Check
**Status:** NOT TESTED YET
**Purpose:** Vulnerability scanning in dependencies

**Requirements:**
- Needs dependency files (pom.xml, build.gradle)
- Internet connection for CVE database

**Optimization:**
- Cache CVE database locally
- Run only when dependencies change

---

## Python Tools

### 🟡 Bandit
**Status:** CONFIGURED
**Purpose:** Security issues in Python

### 🟡 Pylint
**Status:** CONFIGURED
**Purpose:** Code quality and style

### 🟡 Mypy
**Status:** CONFIGURED
**Purpose:** Type checking

---

## JavaScript/TypeScript Tools

### 🟡 ESLint
**Status:** CONFIGURED
**Purpose:** Code quality and style

### 🟡 TSC
**Status:** CONFIGURED
**Purpose:** TypeScript compilation and type checking

---

## Go Tools

### 🟡 Staticcheck
**Status:** CONFIGURED
**Purpose:** Static analysis

### 🟡 Gosec
**Status:** CONFIGURED
**Purpose:** Security scanning

---

## Proposed Tool Replacements

### Java Ecosystem
1. **Replace SpotBugs with:**
   - **Infer** (Facebook) - Works on source, finds null pointer/resource leaks
   - **SonarJava** - Comprehensive, works on source
   - **ErrorProne** - Google's tool, compile-time checking

2. **Add for better coverage:**
   - **OWASP Dependency Check** - For security vulnerabilities
   - **Nullaway** - Uber's null-safety checker

### Performance Improvements
1. **Parallel execution** when resources available
2. **Incremental analysis** - only analyze changed files
3. **Tool-specific caching** - cache results for unchanged files
4. **Smart file selection** - prioritize critical paths

### Output Parsing Strategy
1. **Tool-specific parsers** for each output format
2. **Fallback to regex** if structured parsing fails
3. **Confidence scoring** based on parser accuracy

## Implementation Priority

### Phase 1 (Immediate)
- [x] Skip SpotBugs
- [x] Exclude test files from PMD
- [ ] Test Checkstyle with optimizations
- [ ] Test Semgrep with specific rules

### Phase 2 (Next Sprint)
- [ ] Implement Infer as SpotBugs replacement
- [ ] Add output parsers for each tool
- [ ] Implement incremental analysis

### Phase 3 (Future)
- [ ] Add ML-based issue categorization
- [ ] Implement cross-tool deduplication
- [ ] Add custom rule creation UI

## Notes
- All tools should respect `.gitignore` patterns
- Consider language-specific tool containers
- Monitor tool execution time and optimize slowest ones first
- Consider SaaS alternatives for resource-intensive tools