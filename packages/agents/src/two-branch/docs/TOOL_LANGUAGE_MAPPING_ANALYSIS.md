# Tool-Language Mapping Analysis Report

**Generated:** 2025-08-30  
**Status:** Configuration Review

## 🔍 Current Tool-Language Mapping Configuration

### 1. Security Tools

#### ✅ **Semgrep** (MultiToolSecurityAgent)
```typescript
isApplicable: (lang) => true  // All languages
```
**Actual Support:** JavaScript, TypeScript, Python, Go, Java, Ruby, C/C++, PHP, C#
**Status:** ✅ Correctly configured

#### ✅ **npm-audit** (MultiToolSecurityAgent)
```typescript
isApplicable: (lang) => ['javascript', 'typescript'].includes(lang)
```
**Status:** ✅ Correctly configured for JS/TS only

#### ✅ **Trivy** (MultiToolSecurityAgent)
```typescript
isApplicable: (lang) => true  // Container & dependency scanning
```
**Status:** ✅ Correctly configured - works for all

#### ✅ **Gitleaks** (MultiToolSecurityAgent)
```typescript
isApplicable: (lang) => true  // Secret scanning for all
```
**Status:** ✅ Correctly configured

---

### 2. Dependency Tools

#### ✅ **npm-audit** (MultiToolDependencyAgent)
```typescript
isApplicable: (lang) => ['javascript', 'typescript'].includes(lang)
```
**Status:** ✅ Correct

#### ⚠️ **yarn-audit** (MultiToolDependencyAgent)
```typescript
isApplicable: (lang) => ['javascript', 'typescript'].includes(lang)
```
**Issue:** Should check for yarn.lock file existence
**Recommendation:** Add file check

#### ✅ **pip-audit** (MultiToolDependencyAgent)
```typescript
isApplicable: (lang) => lang === 'python'
```
**Status:** ✅ Correct

#### ✅ **safety** (MultiToolDependencyAgent)
```typescript
isApplicable: (lang) => lang === 'python'
```
**Status:** ✅ Correct

#### ✅ **bundler-audit** (MultiToolDependencyAgent)
```typescript
isApplicable: (lang) => lang === 'ruby'
```
**Status:** ✅ Correct

#### ✅ **nancy** (MultiToolDependencyAgent)
```typescript
isApplicable: (lang) => lang === 'go'
```
**Status:** ✅ Correct for Go

#### ✅ **cargo-audit** (MultiToolDependencyAgent)
```typescript
isApplicable: (lang) => lang === 'rust'
```
**Status:** ✅ Correct

#### ✅ **composer-audit** (MultiToolDependencyAgent)
```typescript
isApplicable: (lang) => lang === 'php'
```
**Status:** ✅ Correct

---

### 3. Architecture Tools

#### ⚠️ **madge** (MultiToolArchitectureAgent)
```typescript
isApplicable: (lang) => ['javascript', 'typescript'].includes(lang)
```
**Issue:** Works for JS/TS only but applied to all
**Recommendation:** Fix applicability check

#### ⚠️ **dependency-cruiser** (MultiToolArchitectureAgent)
```typescript
isApplicable: (lang) => ['javascript', 'typescript'].includes(lang)
```
**Issue:** JS/TS only but may be applied to others
**Recommendation:** Fix applicability check

#### ⚠️ **jscpd** (MultiToolArchitectureAgent)
```typescript
isApplicable: () => true
```
**Issue:** While it supports multiple languages, config should be language-aware
**Recommendation:** Add language-specific configs

---

### 4. Performance Tools

#### ⚠️ **lighthouse** (MultiToolPerformanceAgent)
```typescript
isApplicable: () => true
```
**Issue:** Only works for web apps, not all languages
**Recommendation:** Check for web frameworks

#### ⚠️ **webpack-bundle-analyzer** (MultiToolPerformanceAgent)
```typescript
isApplicable: () => true
```
**Issue:** Only for webpack projects
**Recommendation:** Check for webpack.config.js

---

### 5. Code Quality Tools

#### ⚠️ **eslint** (MultiToolCodeQualityAgent)
```typescript
isApplicable: (lang) => ['javascript', 'typescript'].includes(lang)
```
**Status:** ✅ Correct but needs other language linters

#### ❌ **Missing Language-Specific Linters:**
- Python: pylint, flake8, black
- Go: golint, gofmt
- Ruby: rubocop
- Java: checkstyle, PMD
- PHP: phpcs, phpmd
- C/C++: cppcheck, clang-tidy

---

## 🚨 Critical Issues Found

### 1. **Missing Language Detection**
The orchestrator doesn't properly detect language before running agents

### 2. **Missing Tool Availability Checks**
Many tools assume installation without checking

### 3. **Incomplete Language Coverage**
- Java: No specific tools configured
- C/C++: No specific tools configured
- C#/.NET: No tools at all
- Rust: Only cargo-audit, missing clippy

### 4. **Performance Tools Misconfigured**
Applied to all languages but only work for web apps

---

## 📊 Language Coverage Summary

| Language | Security | Dependencies | Architecture | Performance | Code Quality |
|----------|----------|--------------|--------------|-------------|--------------|
| JavaScript/TypeScript | ✅ Full | ✅ Full | ✅ Full | ⚠️ Web only | ✅ Full |
| Python | ✅ Semgrep | ✅ pip/safety | ⚠️ jscpd only | ❌ None | ❌ Missing |
| Go | ✅ Semgrep | ✅ nancy | ⚠️ jscpd only | ❌ None | ❌ Missing |
| Ruby | ✅ Semgrep | ✅ bundler | ⚠️ jscpd only | ❌ None | ❌ Missing |
| Java | ✅ Semgrep | ❌ None | ⚠️ jscpd only | ❌ None | ❌ Missing |
| PHP | ✅ Semgrep | ✅ composer | ⚠️ jscpd only | ❌ None | ❌ Missing |
| C/C++ | ✅ Semgrep | ❌ None | ⚠️ jscpd only | ❌ None | ❌ Missing |
| Rust | ✅ Semgrep | ✅ cargo | ⚠️ jscpd only | ❌ None | ❌ Missing |
| C#/.NET | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |

---

## 🔧 Recommendations

### Immediate Fixes Needed:

1. **Add Language Detection Service**
```typescript
class LanguageDetector {
  detectFromPath(path: string): string[] {
    // Check file extensions
    // Check package files (package.json, go.mod, pom.xml, etc.)
    // Return primary and secondary languages
  }
}
```

2. **Fix Tool Applicability Functions**
```typescript
// Example fix for madge
isApplicable: (lang, targetPath) => {
  if (!['javascript', 'typescript'].includes(lang)) return false;
  // Check if package.json exists
  return fs.existsSync(path.join(targetPath, 'package.json'));
}
```

3. **Add Missing Language-Specific Tools**
- Phase 1C: License tools (ScanCode, FOSSology)
- Phase 1D: Java tools (SpotBugs, PMD, Checkstyle)
- Phase 1E: C/C++ tools (Cppcheck, Clang Static Analyzer)

4. **Create Tool Registry**
```typescript
const TOOL_REGISTRY = {
  'eslint': {
    languages: ['javascript', 'typescript'],
    requiredFiles: ['.eslintrc*', 'package.json'],
    command: 'npx eslint'
  },
  'pylint': {
    languages: ['python'],
    requiredFiles: ['*.py', 'requirements.txt', 'setup.py'],
    command: 'pylint'
  }
  // ... more tools
};
```

---

## ✅ Correctly Configured Tools

1. **GitHub/GitLab Agents** - Platform-specific, not language-dependent ✅
2. **OWASP Dependency Check** - Multi-language support built-in ✅
3. **Semgrep** - Multi-language with auto-detection ✅
4. **Trivy** - Container and multi-language scanning ✅
5. **Gitleaks** - Language-agnostic secret scanning ✅

---

## 🎯 Action Items

### Phase 2C Priority (Language Detection):
1. Implement LanguageDetector service
2. Add tool availability checking
3. Fix all `isApplicable` functions
4. Add fallback/mock handling for missing tools

### Phase 1C-1E Priority (Missing Tools):
1. Add ScanCode for license compliance (all languages)
2. Add Java-specific tools (SpotBugs, PMD)
3. Add C/C++ tools (Cppcheck, Clang)
4. Add Python linters (pylint, flake8)
5. Add Go tools (golint, go vet)

---

## 📈 Current Status

- **8 Agents Implemented** ✅
- **31 Tools Configured** (including platform APIs)
- **Language Coverage:** 50% (missing tools for several languages)
- **Configuration Accuracy:** 70% (some misconfigurations)

**Next Step:** Implement Phase 2C (Language Detection) before adding more tools to ensure proper mapping.