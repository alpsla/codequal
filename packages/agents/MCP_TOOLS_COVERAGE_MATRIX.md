# MCP Tools Coverage Matrix Analysis

## Current Coverage Status

### 1. Security Agent Coverage

| Language | Required Tools | Implemented | Gap | Free Alternatives |
|----------|---------------|-------------|-----|-------------------|
| **JavaScript/TypeScript** | Security scanning | ✅ Semgrep | ✅ None | - |
| **Python** | Security scanning | ❌ None | 🔴 Missing | Bandit (free) |
| **Go** | Security scanning | ❌ None | 🔴 Missing | GoSec (free) |
| **Java** | Security scanning | ❌ None | 🔴 Missing | SpotBugs (free) |
| **Ruby** | Security scanning | ❌ None | 🔴 Missing | Brakeman (free) |
| **PHP** | Security scanning | ❌ None | 🔴 Missing | PHPCS-Security-Audit (free) |
| **C/C++** | Security scanning | ❌ None | 🔴 Missing | Flawfinder (free) |
| **Rust** | Security scanning | ❌ None | 🔴 Missing | cargo-audit (free) |

**Security Coverage: 12.5% (1/8 languages)**

### 2. Code Quality Agent Coverage

| Language | Required Tools | Implemented | Gap | Free Alternatives |
|----------|---------------|-------------|-----|-------------------|
| **JavaScript/TypeScript** | Linting | ✅ ESLint | ✅ None | - |
| **Python** | Linting | ❌ None | 🔴 Missing | Pylint, Flake8 (free) |
| **Go** | Linting | ❌ None | 🔴 Missing | golangci-lint (free) |
| **Java** | Linting | ❌ None | 🔴 Missing | Checkstyle, PMD (free) |
| **Ruby** | Linting | ❌ None | 🔴 Missing | RuboCop (free) |
| **PHP** | Linting | ❌ None | 🔴 Missing | PHP_CodeSniffer (free) |
| **C/C++** | Linting | ❌ None | 🔴 Missing | cppcheck (free) |
| **Rust** | Linting | ❌ None | 🔴 Missing | clippy (free) |

**Code Quality Coverage: 12.5% (1/8 languages)**

### 3. Performance Agent Coverage

| Language/Tech | Required Tools | Implemented | Gap | Free Alternatives |
|---------------|---------------|-------------|-----|-------------------|
| **Web/Frontend** | Web performance | ✅ Lighthouse | ✅ None | - |
| **Node.js** | Runtime profiling | ❌ None | 🔴 Missing | clinic.js (free) |
| **Python** | Profiling | ❌ None | 🔴 Missing | py-spy (free) |
| **Go** | Profiling | ❌ None | 🔴 Missing | pprof (free) |
| **Java** | Profiling | ❌ None | 🔴 Missing | async-profiler (free) |
| **Bundle Analysis** | Size analysis | ❌ None | 🔴 Missing | webpack-bundle-analyzer (free) |
| **Database** | Query analysis | ❌ None | 🔴 Missing | explain analyzers (free) |
| **Memory** | Leak detection | ❌ None | 🔴 Missing | heapdump (Node), tracemalloc (Python) |

**Performance Coverage: 12.5% (1/8 categories)**

### 4. Dependency Agent Coverage

| Language | Required Tools | Implemented | Gap | Free Alternatives |
|----------|---------------|-------------|-----|-------------------|
| **JavaScript/Node** | Vulnerability scan | ✅ npm-audit | ✅ None | - |
| **Python** | Vulnerability scan | ❌ None | 🔴 Missing | safety, pip-audit (free) |
| **Go** | Vulnerability scan | ❌ None | 🔴 Missing | nancy, go-mod-audit (free) |
| **Java** | Vulnerability scan | ❌ None | 🔴 Missing | dependency-check (free) |
| **Ruby** | Vulnerability scan | ❌ None | 🔴 Missing | bundler-audit (free) |
| **PHP** | Vulnerability scan | ❌ None | 🔴 Missing | local-php-security-checker (free) |
| **Rust** | Vulnerability scan | ❌ None | 🔴 Missing | cargo-audit (free) |
| **.NET** | Vulnerability scan | ❌ None | 🔴 Missing | dotnet list vulnerable (free) |

**Dependency Coverage: 12.5% (1/8 languages)**

## Critical Gaps Summary

### 🔴 HIGH PRIORITY GAPS (Multi-language support needed)

1. **Python Ecosystem** (Very Common)
   - Security: Bandit
   - Quality: Pylint/Flake8
   - Dependencies: pip-audit
   - Performance: py-spy

2. **Go Ecosystem** (Growing Usage)
   - Security: GoSec
   - Quality: golangci-lint
   - Dependencies: nancy
   - Performance: pprof

3. **Java Ecosystem** (Enterprise)
   - Security: SpotBugs
   - Quality: Checkstyle/PMD
   - Dependencies: dependency-check
   - Performance: async-profiler

### 🟡 MEDIUM PRIORITY GAPS

4. **Ruby Ecosystem**
   - Security: Brakeman
   - Quality: RuboCop
   - Dependencies: bundler-audit

5. **PHP Ecosystem**
   - Security: PHPCS-Security-Audit
   - Quality: PHP_CodeSniffer
   - Dependencies: local-php-security-checker

### 🟢 LOWER PRIORITY GAPS

6. **C/C++ Ecosystem**
   - Security: Flawfinder
   - Quality: cppcheck

7. **Rust Ecosystem**
   - Security: cargo-audit
   - Quality: clippy
   - Dependencies: cargo-audit

8. **.NET/C# Ecosystem**
   - Dependencies: dotnet list vulnerable

## Recommended Implementation Priority

### Phase 1: Core Language Support (Immediate)
```typescript
// Add these tools to achieve 50% coverage
const phase1Tools = {
  python: {
    security: 'bandit',
    quality: 'pylint',
    dependencies: 'pip-audit'
  },
  go: {
    security: 'gosec',
    quality: 'golangci-lint',
    dependencies: 'nancy'
  },
  java: {
    security: 'spotbugs',
    quality: 'checkstyle',
    dependencies: 'dependency-check'
  }
};
```

### Phase 2: Extended Language Support (Next Sprint)
```typescript
const phase2Tools = {
  ruby: {
    security: 'brakeman',
    quality: 'rubocop',
    dependencies: 'bundler-audit'
  },
  php: {
    security: 'phpcs-security-audit',
    quality: 'phpcs',
    dependencies: 'local-php-security-checker'
  }
};
```

### Phase 3: Systems Languages (Future)
```typescript
const phase3Tools = {
  cpp: {
    security: 'flawfinder',
    quality: 'cppcheck'
  },
  rust: {
    security: 'cargo-audit',
    quality: 'clippy',
    dependencies: 'cargo-audit'
  }
};
```

## Tool Implementation Checklist

### For Each New Tool:
- [ ] Create MCP wrapper in `src/mcp-wrappers/`
- [ ] Add parser in `UniversalToolParser`
- [ ] Test with real repositories
- [ ] Update documentation
- [ ] Add to language router

## Language Detection Requirements

We also need to implement language detection to automatically select appropriate tools:

```typescript
interface LanguageDetection {
  primary: string;           // Main language
  secondary: string[];        // Other languages
  frameworks: string[];       // React, Django, Rails, etc.
  packageManagers: string[];  // npm, pip, gem, cargo, etc.
}
```

## Coverage Metrics

### Current Overall Coverage:
- **Languages Covered**: 1/8 (12.5%)
- **Security Tools**: 1/8 (12.5%)
- **Quality Tools**: 1/8 (12.5%)
- **Performance Tools**: 1/8 (12.5%)
- **Dependency Tools**: 1/8 (12.5%)

### Target Coverage (Phase 1):
- **Languages Covered**: 4/8 (50%)
- **Security Tools**: 4/8 (50%)
- **Quality Tools**: 4/8 (50%)
- **Performance Tools**: 2/8 (25%)
- **Dependency Tools**: 4/8 (50%)

### Full Coverage (All Phases):
- **Languages Covered**: 8/8 (100%)
- **Security Tools**: 8/8 (100%)
- **Quality Tools**: 8/8 (100%)
- **Performance Tools**: 4/8 (50%)
- **Dependency Tools**: 8/8 (100%)

## Conclusion

**Critical Finding**: We currently only cover JavaScript/TypeScript ecosystems (12.5% coverage).

**Immediate Need**: Implement Python, Go, and Java tools to reach 50% coverage of common languages.

**All Recommended Tools**: Are free and open-source, avoiding licensing costs.

**Next Steps**:
1. Implement Python tools (Bandit, Pylint, pip-audit)
2. Implement Go tools (GoSec, golangci-lint, nancy)
3. Implement Java tools (SpotBugs, Checkstyle, dependency-check)
4. Add language detection service
5. Update orchestrator routing logic