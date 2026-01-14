# CodeQual Analysis Report

> **Repository**: spring-projects/spring-petclinic
> **PR**: #950 - Add pet vaccination tracking feature
> **Analysis ID**: analysis-b4f7e2d3-1a9c-4d5e-8f2b-c3e6a9d1b7f4
> **Tier**: BASIC
> **Date**: 2026-01-01

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Overall Score** | 72/100 |
| **Grade** | C |
| **Decision** | NEEDS_REVIEW |
| **Total Issues** | 47 |
| **Blocking Issues** | 3 |

### Score Breakdown

| Category | Score | Issues |
|----------|-------|--------|
| Security | 85/100 | 5 |
| Code Quality | 72/100 | 28 |
| Performance | 91/100 | 3 |
| Architecture | 100/100 | 0 |
| Dependencies | 89/100 | 11 |

---

## Issue Summary

| Severity | NEW | EXISTING_MODIFIED | EXISTING_REST | RESOLVED |
|----------|-----|-------------------|---------------|----------|
| Critical | 1 | 0 | 2 | 0 |
| High | 2 | 1 | 4 | 1 |
| Medium | 8 | 5 | 12 | 3 |
| Low | 6 | 3 | 2 | 2 |

---

## Blocking Issues

### 1. SQL Injection Vulnerability

- **File**: `src/main/java/org/springframework/samples/petclinic/vaccination/VaccinationRepository.java`
- **Line**: 45
- **Severity**: CRITICAL
- **Tool**: Semgrep
- **Rule**: `java.lang.security.audit.sqli.string-concat`

**Message**: String concatenation in SQL query detected. Use parameterized queries instead.

#### What is this issue?

This code concatenates user input directly into a SQL query string, creating a SQL injection vulnerability. Attackers could manipulate the `petId` parameter to execute arbitrary SQL commands.

#### Why does it matter?

SQL injection is OWASP Top 10 (#3). Successful exploitation could lead to:
- Unauthorized data access
- Data modification or deletion
- Database server compromise

#### Recommendation

Use parameterized queries with named parameters:

```java
String query = "SELECT * FROM vaccinations WHERE pet_id = :petId";
entityManager.createNativeQuery(query, Vaccination.class)
    .setParameter("petId", petId)
    .getResultList();
```

#### Best Practices

1. Always use parameterized queries
2. Use Spring Data JPA repository methods where possible
3. Validate input with `@Positive` annotation

#### Educational Resources

- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Spring Data JPA Query Methods](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/#jpa.query-methods)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)

---

### 2. Hardcoded API Key

- **File**: `src/main/resources/application.properties`
- **Line**: 23
- **Severity**: CRITICAL
- **Tool**: Gitleaks
- **Rule**: `generic-api-key`

**Message**: Detected hardcoded API key in configuration file.

#### What is this issue?

A hardcoded API key was detected in the configuration file. This key will be committed to version control, potentially exposing it to anyone with repository access.

#### Why does it matter?

Exposed credentials can lead to unauthorized API access, financial charges, and data breaches.

#### Recommendation

Replace hardcoded value with environment variable:

```properties
vaccination.api.key=${VACCINATION_API_KEY:}
```

#### Best Practices

1. Use environment variables for all secrets
2. Add `.env` files to `.gitignore`
3. Consider HashiCorp Vault or AWS Secrets Manager
4. Rotate the exposed key immediately

#### Educational Resources

- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12-Factor App: Config](https://12factor.net/config)

---

### 3. Missing Input Validation

- **File**: `src/main/java/org/springframework/samples/petclinic/vaccination/VaccinationController.java`
- **Line**: 67
- **Severity**: HIGH
- **Tool**: Semgrep
- **Rule**: `java.spring.security.audit.controller-no-validation`

**Message**: Controller method accepts user input without validation annotations.

#### Recommendation

Add `@Valid` annotation and Bean Validation constraints:

```java
@PostMapping("/vaccinations")
public ResponseEntity<Vaccination> createVaccination(
    @Valid @RequestBody VaccinationDTO dto) {
    // ...
}
```

---

## All Issues by Category

### Security Issues (5)

| # | File | Line | Rule | Severity |
|---|------|------|------|----------|
| 1 | VaccinationRepository.java | 45 | sqli.string-concat | CRITICAL |
| 2 | application.properties | 23 | generic-api-key | CRITICAL |
| 3 | VaccinationController.java | 67 | controller-no-validation | HIGH |
| 4 | VaccinationService.java | 112 | path-traversal | MEDIUM |
| 5 | DataLoader.java | 89 | insecure-random | LOW |

### Code Quality Issues (28)

| # | File | Line | Rule | Severity |
|---|------|------|------|----------|
| 1 | VaccinationController.java | 34 | MethodTooLong | MEDIUM |
| 2 | VaccinationService.java | 45 | CyclomaticComplexity | HIGH |
| ... | ... | ... | ... | ... |

*Full list in SARIF export*

### Dependencies (11)

| # | Package | Version | Vulnerability | Severity |
|---|---------|---------|---------------|----------|
| 1 | log4j-core | 2.14.0 | CVE-2021-44228 | HIGH |
| 2 | jackson-databind | 2.12.3 | CVE-2022-42003 | HIGH |
| ... | ... | ... | ... | ... |

---

## Educational Resources

Based on issues found in this PR:

### Security Learning Path

1. **SQL Injection Prevention** - 3 issues related
   - [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
   - [Spring Data JPA Best Practices](https://docs.spring.io/spring-data/jpa/docs/current/reference/html/)

2. **Secrets Management** - 1 issue related
   - [12-Factor App Config](https://12factor.net/config)
   - [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.external-config)

3. **Input Validation** - 5 issues related
   - [Bean Validation Tutorial](https://docs.oracle.com/javaee/7/tutorial/bean-validation.htm)
   - [Spring Validation](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#validation)

### Recommended Courses

- [OWASP Top 10 for Java Developers](https://owasp.org/www-project-top-ten/)
- [Spring Security in Action](https://www.manning.com/books/spring-security-in-action)

---

## Gamification & Progress

### XP Earned This Session

| Action | XP |
|--------|-----|
| Complete Analysis | +10 |
| Resolve 6 Issues (You) | +30 |
| High Fix Bonus (1x) | +15 |
| **Total** | **55 XP** |

### Your Stats

- **Current Level**: 1 (Newcomer)
- **XP Progress**: 55 / 100 (55%)
- **Next Level**: Apprentice

### Skills Development

| Skill | Level | XP | Progress |
|-------|-------|-----|----------|
| Security | 1 | 10 | 20% |
| Quality | 1 | 30 | 60% |
| Performance | 1 | 10 | 20% |
| Architecture | 1 | 0 | 0% |
| Dependencies | 1 | 10 | 20% |

### Achievements

| Achievement | Status |
|-------------|--------|
| First Analysis | Earned |
| Security Champion (10 fixes) | 1/10 |
| Bug Squasher (50 fixes) | 6/50 |

---

## IDE Integration

### Export Formats Available

| Format | Use Case | Download |
|--------|----------|----------|
| **SARIF** | VS Code, GitHub Code Scanning | [analysis.sarif](./analysis.sarif) |
| **GitLab** | GitLab Code Quality | [gl-code-quality.json](./gl-code-quality.json) |
| **LSP** | Language Servers | [issues.lsp.json](./issues.lsp.json) |

### VS Code Integration

Install the CodeQual extension to see issues inline:

```bash
code --install-extension codequal.vscode-codequal
```

Then import the SARIF file for inline issue display with fix recommendations.

---

## Pattern Contribution (Opt-In)

> **Help improve CodeQual for everyone!**

If you fix an issue manually and want to contribute the pattern:

1. Fix the issue in your code
2. Run: `codequal contribute --file <path> --line <line>`
3. Your pattern will be reviewed and added to our library

**Rewards**:
- +50 XP per approved pattern
- Recognition on the contributors leaderboard
- Help other developers get instant fixes

[Learn More About Contributing →](https://codequal.dev/contribute)

---

## Business Impact

| Metric | Value |
|--------|-------|
| Risk Score | 28/100 |
| Technical Debt | 23.5 hours |
| Priority Actions | 3 blocking issues |

---

*Generated by CodeQual v9 - BASIC Tier*
*Analysis Duration: 45.3s | Cost: $0.00*
