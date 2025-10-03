# Severity Mapping Rules for CodeQual V9 Analysis

**Date Created**: October 2, 2025
**Status**: CANONICAL - All V9 severity assignments MUST follow these rules
**Purpose**: Define comprehensive, tool-agnostic severity mapping rules to ensure consistent issue categorization

---

## 🎯 Overview

This document defines the canonical severity mapping logic for CodeQual V9 analysis. All static analysis tool outputs (PMD, Semgrep, ESLint, etc.) must be normalized to CodeQual's 4-tier severity system using these rules.

**CodeQual Severity Levels**:
1. **CRITICAL** - Immediate security vulnerabilities, data loss risks, or crashes
2. **HIGH** - Significant bugs, performance issues, or security concerns requiring prompt attention
3. **MEDIUM** - Maintainability issues, code smells, or potential future problems
4. **LOW** - Style violations, minor optimizations, or informational findings

---

## 📊 PMD Priority Levels (Reference)

PMD uses a 5-level priority system where **1 is HIGHEST** and **5 is LOWEST**:

- **Priority 1**: Change absolutely required (highest severity)
- **Priority 2**: Change highly recommended
- **Priority 3**: Change recommended (medium severity)
- **Priority 4**: Change optional
- **Priority 5**: Change for completeness only (lowest severity)

---

## 🏷️ PMD Rule Categories

PMD organizes rules into 8 standard categories:

1. **Security**: Potential security flaws (hard-coded credentials, crypto issues, injection risks)
2. **Error Prone**: Broken constructs, confusing code, or runtime error risks
3. **Best Practices**: Generally accepted best practices violations
4. **Performance**: Suboptimal code that impacts performance
5. **Design**: Design issues and architectural problems
6. **Code Style**: Coding style violations
7. **Documentation**: Missing or inadequate documentation
8. **Multithreading**: Concurrency and thread safety issues

---

## 🔄 Severity Mapping Algorithm

### Algorithm Overview

```
CodeQual Severity = f(PMD_Priority, PMD_Category, Impact_Type)

Where:
- PMD_Priority: 1-5 (1 = highest)
- PMD_Category: Security, Error Prone, Best Practices, etc.
- Impact_Type: Runtime Impact (crashes, data loss) vs Maintainability Impact
```

### Mapping Rules

#### CRITICAL Severity

**Criteria**: Issues that can cause immediate harm, data loss, or security breaches

```
IF (Category == "Security" AND Priority <= 2) → CRITICAL
IF (Category == "Error Prone" AND Priority == 1 AND has_runtime_impact) → CRITICAL
IF (Impact == "Data Loss" OR Impact == "Security Breach") → CRITICAL
```

**Examples**:
- Hard-coded credentials (Security, Priority 1)
- SQL injection vulnerabilities (Security, Priority 1)
- Null pointer dereferences in critical paths (Error Prone, Priority 1)
- Unvalidated user input leading to code execution (Security, Priority 1)
- Cryptographic weaknesses (Security, Priority 1-2)

---

#### HIGH Severity

**Criteria**: Significant bugs, security concerns, or performance issues requiring prompt attention

```
IF (Category == "Security" AND Priority == 3) → HIGH
IF (Category == "Error Prone" AND Priority <= 2) → HIGH
IF (Category == "Performance" AND Priority <= 2) → HIGH
IF (Category == "Multithreading" AND Priority <= 2) → HIGH
IF (Category == "Best Practices" AND Priority == 1 AND has_security_impact) → HIGH
```

**Examples**:
- Resource leaks (Error Prone, Priority 2)
- Potential race conditions (Multithreading, Priority 2)
- Inefficient algorithms with significant performance impact (Performance, Priority 1-2)
- Missing input validation (Security, Priority 3)
- Improper exception handling that hides errors (Error Prone, Priority 2)

---

#### MEDIUM Severity

**Criteria**: Maintainability issues, code smells, or potential future problems

```
IF (Category == "Best Practices" AND Priority <= 3) → MEDIUM
IF (Category == "Design" AND Priority <= 3) → MEDIUM
IF (Category == "Error Prone" AND Priority >= 3 AND no_runtime_impact) → MEDIUM
IF (Category == "Performance" AND Priority >= 3) → MEDIUM
IF (Impact == "Maintainability" OR Impact == "Code Quality") → MEDIUM
```

**Examples**:
- **ConstructorCallsOverridableMethod** (Best Practices, Priority 3, Maintainability Impact) → **MEDIUM**
- Unused variables or methods (Best Practices, Priority 3)
- High cyclomatic complexity (Design, Priority 3)
- Missing logging in error paths (Best Practices, Priority 3)
- Inconsistent naming conventions (Code Style, Priority 2-3)
- God classes or long methods (Design, Priority 2-3)

---

#### LOW Severity

**Criteria**: Style violations, minor optimizations, or informational findings

```
IF (Category == "Code Style" AND Priority >= 3) → LOW
IF (Category == "Documentation" AND Priority >= 3) → LOW
IF (Priority >= 4) → LOW
```

**Examples**:
- Missing Javadoc comments (Documentation, Priority 4)
- Inconsistent indentation (Code Style, Priority 4)
- Unnecessary parentheses (Code Style, Priority 5)
- Variable naming suggestions (Code Style, Priority 4)
- Comment formatting issues (Documentation, Priority 5)

---

## 🔍 Special Case: ConstructorCallsOverridableMethod

**Rule**: ConstructorCallsOverridableMethod
**PMD Category**: Best Practices
**PMD Default Priority**: 3 (Medium)
**Impact Type**: Maintainability (potential subtle bugs, NOT immediate crashes)

### Severity Determination

**CodeQual Severity**: **MEDIUM** (NOT CRITICAL or HIGH)

**Rationale**:
1. **Category**: Best Practices (not Security or Error Prone)
2. **Priority**: Typically 3 (medium in PMD's scale)
3. **Impact**: Maintainability risk, not runtime crash
4. **False Positive Rate**: High (known issues with overloaded methods, super calls, Lombok)

### Why NOT Critical?

- **Does NOT cause immediate crashes** - requires specific subclass override to trigger
- **Does NOT expose security vulnerabilities** - no data breach or injection risk
- **Does NOT cause data loss** - may cause NullPointerException in rare cases
- **Impact is conditional** - only problematic if subclass overrides the method AND accesses uninitialized fields

### Why NOT High?

- **Not a guaranteed bug** - many cases are false positives
- **Easily mitigated** - make method final or private
- **Low probability** - requires specific inheritance pattern to cause issues

### Correct Classification: MEDIUM

- **Maintainability concern** - violates inheritance best practices
- **Potential future issue** - may cause problems if code evolves
- **Code quality improvement** - should be addressed but not urgent
- **Refactoring recommended** - but doesn't block deployment

---

## 🛠️ Tool-Specific Mappings

### PMD (Java, Apex)

| PMD Priority | Category           | CodeQual Severity | Notes                                    |
|--------------|--------------------|-------------------|------------------------------------------|
| 1            | Security           | CRITICAL          | Immediate security risk                  |
| 1            | Error Prone        | CRITICAL/HIGH     | Depends on runtime impact                |
| 2            | Security           | CRITICAL          | Significant security concern             |
| 2            | Error Prone        | HIGH              | Likely runtime error                     |
| 3            | Security           | HIGH              | Potential security issue                 |
| 3            | Best Practices     | MEDIUM            | Maintainability concern (e.g., Constructor calls) |
| 3            | Design             | MEDIUM            | Code smell or design issue               |
| 4            | Any                | LOW               | Optional improvement                     |
| 5            | Any                | LOW               | Informational only                       |

### Semgrep (Multi-language)

| Semgrep Severity | Rule Category      | CodeQual Severity | Notes                                    |
|------------------|--------------------|-------------------|------------------------------------------|
| ERROR            | Security           | CRITICAL          | Security vulnerability confirmed         |
| WARNING          | Security           | HIGH              | Potential security issue                 |
| WARNING          | Best Practices     | MEDIUM            | Code quality concern                     |
| INFO             | Any                | LOW               | Informational finding                    |

### ESLint (JavaScript/TypeScript)

| ESLint Level | Rule Category      | CodeQual Severity | Notes                                    |
|--------------|--------------------|-------------------|------------------------------------------|
| error        | Security           | HIGH              | Potential vulnerability                  |
| error        | Best Practices     | MEDIUM            | Code quality issue                       |
| warn         | Any                | LOW               | Style or minor issue                     |

### Dependency-Check (CVE Scanning)

| CVSS Score   | CVE Type           | CodeQual Severity | Notes                                    |
|--------------|--------------------|-------------------|------------------------------------------|
| 9.0-10.0     | Any                | CRITICAL          | Critical vulnerability                   |
| 7.0-8.9      | Any                | HIGH              | High severity CVE                        |
| 4.0-6.9      | Any                | MEDIUM            | Medium severity CVE                      |
| 0.1-3.9      | Any                | LOW               | Low severity CVE                         |

---

## ⚖️ Decision Logic Integration

### PR Approval/Decline Rules

**CRITICAL**:
```typescript
if (NEW issues with severity == CRITICAL in MODIFIED files) {
  decision = 'DECLINED';
  blocking = true;
}
```

**HIGH**:
```typescript
if (NEW issues with severity == HIGH in MODIFIED files && count > threshold) {
  decision = 'DECLINED';
  blocking = true;
}
```

**MEDIUM**:
```typescript
if (NEW issues with severity == MEDIUM in MODIFIED files) {
  decision = 'APPROVED WITH CONDITIONS';
  blocking = false; // Backlog
}
```

**LOW**:
```typescript
if (NEW issues with severity == LOW) {
  decision = 'APPROVED';
  blocking = false; // Informational only
}
```

### Key Principles

1. **Only NEW issues block** - Pre-existing issues don't affect decision
2. **Only MODIFIED files matter** - Issues in unchanged files don't block
3. **CRITICAL always blocks** - No threshold, even 1 critical issue declines PR
4. **HIGH has threshold** - Configurable (default: 10+ HIGH issues decline)
5. **MEDIUM goes to backlog** - Doesn't block but tracked for future work
6. **LOW is informational** - Never blocks, optional to fix

---

## 📝 Implementation Guidelines

### 1. Severity Assignment Code

```typescript
export function determineCodeQualSeverity(
  toolName: string,
  toolPriority: number | string,
  category: string,
  ruleId: string,
  description: string
): 'critical' | 'high' | 'medium' | 'low' {

  // Normalize inputs
  const normalizedCategory = category.toLowerCase();
  const priority = typeof toolPriority === 'string'
    ? parseInt(toolPriority, 10)
    : toolPriority;

  // Special case: ConstructorCallsOverridableMethod
  if (ruleId.includes('ConstructorCallsOverridableMethod')) {
    return 'medium'; // ALWAYS MEDIUM, never critical/high
  }

  // CRITICAL: Security priority 1-2 or error prone with runtime impact
  if (normalizedCategory === 'security' && priority <= 2) {
    return 'critical';
  }

  if (normalizedCategory === 'error prone' && priority === 1) {
    const hasRuntimeImpact = checkRuntimeImpact(description);
    return hasRuntimeImpact ? 'critical' : 'high';
  }

  // HIGH: Security priority 3, error prone priority 2, performance/threading priority 1-2
  if (normalizedCategory === 'security' && priority === 3) {
    return 'high';
  }

  if (normalizedCategory === 'error prone' && priority === 2) {
    return 'high';
  }

  if ((normalizedCategory === 'performance' || normalizedCategory === 'multithreading')
      && priority <= 2) {
    return 'high';
  }

  // MEDIUM: Best practices priority 1-3, design priority 1-3
  if ((normalizedCategory === 'best practices' || normalizedCategory === 'design')
      && priority <= 3) {
    return 'medium';
  }

  // LOW: Priority 4-5 or code style/documentation
  if (priority >= 4 || normalizedCategory === 'code style' || normalizedCategory === 'documentation') {
    return 'low';
  }

  // Default: MEDIUM (safety fallback)
  return 'medium';
}

function checkRuntimeImpact(description: string): boolean {
  const runtimeKeywords = [
    'null pointer', 'crash', 'exception', 'data loss',
    'memory leak', 'deadlock', 'race condition'
  ];

  return runtimeKeywords.some(keyword =>
    description.toLowerCase().includes(keyword)
  );
}
```

### 2. Example Usage

```typescript
// PMD ConstructorCallsOverridableMethod
const severity1 = determineCodeQualSeverity(
  'PMD',
  3,
  'Best Practices',
  'ConstructorCallsOverridableMethod',
  'Overridable method called during object construction'
);
// Result: 'medium'

// PMD Security Issue
const severity2 = determineCodeQualSeverity(
  'PMD',
  1,
  'Security',
  'HardCodedCryptoKey',
  'Hard coded cryptographic key detected'
);
// Result: 'critical'

// PMD Error Prone with runtime impact
const severity3 = determineCodeQualSeverity(
  'PMD',
  1,
  'Error Prone',
  'NullPointerException',
  'Potential null pointer exception detected'
);
// Result: 'critical'
```

---

## 🧪 Testing Severity Mapping

### Unit Test Examples

```typescript
describe('Severity Mapping', () => {
  it('should classify ConstructorCallsOverridableMethod as MEDIUM', () => {
    const severity = determineCodeQualSeverity(
      'PMD',
      3,
      'Best Practices',
      'ConstructorCallsOverridableMethod',
      'Overridable method addMetric called during object construction'
    );
    expect(severity).toBe('medium');
  });

  it('should classify security priority 1 as CRITICAL', () => {
    const severity = determineCodeQualSeverity(
      'PMD',
      1,
      'Security',
      'HardCodedCredentials',
      'Hard coded password detected'
    );
    expect(severity).toBe('critical');
  });

  it('should classify best practices priority 3 as MEDIUM', () => {
    const severity = determineCodeQualSeverity(
      'PMD',
      3,
      'Best Practices',
      'UnusedPrivateMethod',
      'Unused private method detected'
    );
    expect(severity).toBe('medium');
  });
});
```

---

## 📚 References

- [PMD Java Rules Documentation](https://pmd.github.io/pmd/pmd_rules_java.html)
- [PMD Best Practices Category](https://pmd.github.io/pmd/pmd_rules_java_bestpractices.html)
- [PMD ConstructorCallsOverridableMethod GitHub Issues](https://github.com/pmd/pmd/issues/2348)
- [CVSS Severity Ratings](https://www.first.org/cvss/specification-document)
- [CodeQual V9 Critical Knowledge Base](./next/V9_CRITICAL_KNOWLEDGE_BASE.md)

---

## 🔄 Version History

| Version | Date       | Changes                                          | Author  |
|---------|------------|--------------------------------------------------|---------|
| 1.0     | 2025-10-02 | Initial comprehensive severity mapping rules     | Claude  |

---

**IMPORTANT**: This document is CANONICAL. All V9 severity assignments MUST follow these rules. Any deviation must be documented and approved.

---

*Last Updated: October 2, 2025*
*Document Owner: V9 Architecture Team*
*Review Cycle: Quarterly*
