# Category Scoring Guide for CodeQual Reports

This guide defines how to score and present the 5 main analysis categories in all reports.

---

## Standard Category Structure

Each of the 5 main categories should follow this format:

```markdown
## [#]. [Category] Analysis

### Score: XX/100 (Grade: [Letter])

**Score Breakdown:**
- Subcategory 1: XX/100 (Brief explanation)
- Subcategory 2: XX/100 (Brief explanation)
- Subcategory 3: XX/100 (Brief explanation)
- Subcategory 4: XX/100 (Brief explanation)
- Subcategory 5: XX/100 (Brief explanation)

### [Detailed Analysis Sections...]
```

---

## 1. Security Analysis

### Scoring Components (Equal Weight - 20% each)

```markdown
## Security Analysis

### Score: 85/100 (Grade: B)

**Score Breakdown:**
- Vulnerability Prevention: 90/100 (No critical vulnerabilities)
- Authentication & Authorization: 88/100 (Strong RBAC implemented)
- Data Protection: 85/100 (Encryption in transit, at-rest pending)
- Input Validation: 82/100 (Some endpoints lack validation)
- Security Testing: 80/100 (Manual pen testing only)
```

### Grade Mapping
- 95-100: A+ (Exceptional security posture)
- 90-94: A (Excellent, industry best practices)
- 85-89: A- (Very good, minor improvements)
- 80-84: B+ (Good, some gaps)
- 75-79: B (Acceptable, notable improvements needed)
- 70-74: B- (Below average, significant work required)
- 65-69: C+ (Poor, major vulnerabilities)
- 60-64: C (Very poor, critical issues)
- Below 60: F (Failing, immediate action required)

### Subcategory Definitions

1. **Vulnerability Prevention** - OWASP coverage, CVE scanning
2. **Authentication & Authorization** - Access controls, session management
3. **Data Protection** - Encryption, privacy, secure storage
4. **Input Validation** - Sanitization, parameterization, boundaries
5. **Security Testing** - Automated scanning, pen testing, monitoring

---

## 2. Performance Analysis

### Scoring Components

```markdown
## Performance Analysis

### Score: 88/100 (Grade: B+)

**Score Breakdown:**
- Response Time: 92/100 (P95 < 200ms achieved)
- Throughput: 85/100 (Handles 5K RPS, target 6K)
- Resource Efficiency: 90/100 (CPU 45%, Memory 60%)
- Scalability: 86/100 (Horizontal scaling with manual intervention)
- Reliability: 87/100 (99.9% uptime, target 99.99%)
```

### Subcategory Definitions

1. **Response Time** - Latency metrics (P50, P95, P99)
2. **Throughput** - Requests/transactions per second
3. **Resource Efficiency** - CPU, memory, I/O utilization
4. **Scalability** - Ability to handle load increases
5. **Reliability** - Uptime, error rates, recovery time

### Performance Benchmarks
- Response Time: <100ms (100/100), <200ms (90/100), <500ms (70/100)
- Throughput: Meets/exceeds target (90+), 80% of target (70-89)
- Resource Usage: <50% (95/100), 50-70% (85/100), >70% (70/100)

---

## 3. Code Quality Analysis

### Scoring Components

```markdown
## Code Quality Analysis

### Score: 83/100 (Grade: B)

**Score Breakdown:**
- Test Coverage: 85/100 (85% coverage, 90% target)
- Code Complexity: 88/100 (Avg cyclomatic: 3.2)
- Maintainability: 82/100 (Technical debt: 68 hours)
- Documentation: 78/100 (Missing API docs)
- Standards Compliance: 82/100 (ESLint warnings: 23)
```

### Subcategory Definitions

1. **Test Coverage** - Unit, integration, E2E test percentages
2. **Code Complexity** - Cyclomatic complexity, cognitive complexity
3. **Maintainability** - Technical debt, code smells, duplication
4. **Documentation** - Inline comments, API docs, README completeness
5. **Standards Compliance** - Linting, formatting, naming conventions

### Quality Thresholds
- Test Coverage: >90% (95/100), >80% (85/100), >70% (75/100)
- Cyclomatic Complexity: <3 (95/100), <5 (85/100), <10 (70/100)
- Technical Debt: <20h (95/100), <50h (85/100), <100h (70/100)

---

## 4. Architecture Analysis

### Scoring Components

```markdown
## Architecture Analysis

### Score: 87/100 (Grade: B+)

**Score Breakdown:**
- Design Patterns: 90/100 (SOLID principles, clean architecture)
- Modularity: 88/100 (Well-separated concerns, minor coupling)
- Scalability Design: 85/100 (Vertical scaling ready, horizontal planned)
- Resilience: 84/100 (Basic retry logic, needs circuit breakers)
- API Design: 86/100 (RESTful, versioning missing)
```

### Subcategory Definitions

1. **Design Patterns** - Appropriate pattern usage, SOLID principles
2. **Modularity** - Separation of concerns, coupling, cohesion
3. **Scalability Design** - Architecture supports growth
4. **Resilience** - Fault tolerance, error recovery, graceful degradation
5. **API Design** - Consistency, versioning, documentation

### Architecture Maturity Levels
- Level 5 (95-100): Microservices, event-driven, fully distributed
- Level 4 (85-94): Service-oriented, good separation, async patterns
- Level 3 (75-84): Modular monolith, clear boundaries
- Level 2 (65-74): Basic separation, some coupling
- Level 1 (Below 65): Monolithic, high coupling

---

## 5. Dependencies Analysis

### Scoring Components

```markdown
## Dependencies Analysis

### Score: 92/100 (Grade: A-)

**Score Breakdown:**
- Security: 88/100 (2 low-severity vulnerabilities)
- License Compliance: 100/100 (All MIT/Apache compatible)
- Version Currency: 90/100 (90% on latest, 10% one major behind)
- Bundle Efficiency: 92/100 (Well tree-shaken, minimal bloat)
- Maintenance Health: 94/100 (All actively maintained)
```

### Subcategory Definitions

1. **Security** - Known vulnerabilities, CVE status
2. **License Compliance** - License compatibility with project
3. **Version Currency** - How up-to-date dependencies are
4. **Bundle Efficiency** - Size optimization, tree-shaking, duplication
5. **Maintenance Health** - Active maintenance, community support

### Dependency Health Metrics
- Security: 0 vulnerabilities (100/100), 1-2 low (90/100), any critical (0/100)
- Versions: All latest (100/100), <6 months old (90/100), >1 year (70/100)
- Bundle Size: Decreased (100/100), <5% increase (90/100), >10% increase (70/100)

---

## Overall Score Calculation

The overall repository score is calculated as:

```
Overall Score = (
  Security × 0.30 +      // 30% weight - highest priority
  Performance × 0.20 +   // 20% weight
  Code Quality × 0.20 +  // 20% weight
  Architecture × 0.20 +  // 20% weight
  Dependencies × 0.10    // 10% weight - lowest priority
)
```

### Example Calculation
```
Security: 85/100 × 0.30 = 25.5
Performance: 88/100 × 0.20 = 17.6
Code Quality: 83/100 × 0.20 = 16.6
Architecture: 87/100 × 0.20 = 17.4
Dependencies: 92/100 × 0.10 = 9.2

Overall Score: 86.3/100 (Grade: B+)
```

---

## Scoring Consistency Rules

1. **Always show XX/100 format** - Never use percentages
2. **Include letter grades** - Use standard academic scale
3. **Provide 5 subcategories** - Each with its own score
4. **Explain each score** - Brief reason in parentheses
5. **Be objective** - Base on measurable metrics
6. **Show trends** - Use ↑↓→ to indicate changes from previous
7. **Highlight concerns** - Anything below 70 needs attention

---

## PR Impact on Scores

Show how the PR affected each score:

```markdown
### Score Impact
| Category | Before | After | Change | Trend |
|----------|--------|-------|--------|-------|
| Security | 82/100 | 85/100 | +3 | ↑ |
| Performance | 85/100 | 88/100 | +3 | ↑ |
| Code Quality | 84/100 | 83/100 | -1 | ↓ |
| Architecture | 87/100 | 87/100 | 0 | → |
| Dependencies | 90/100 | 92/100 | +2 | ↑ |
| **Overall** | **84.8** | **86.3** | **+1.5** | **↑** |
```

---

## Special Considerations

### For Critical Issues
If any critical security or performance issue exists:
- Cap the category score at 69/100 (C+)
- Add ⚠️ or 🚨 visual indicator
- Highlight in executive summary

### For New Projects
First analysis should note:
- "Baseline scores established"
- No trend indicators
- Focus on absolute values

### For Major Refactors
- Show both old and new architecture scores
- Explain scoring methodology changes
- Provide migration score impact

---

This standardized scoring ensures consistency across all CodeQual reports and makes it easy for users to understand their code health at a glance.