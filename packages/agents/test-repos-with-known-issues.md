# Test Repositories with Known Issues

## Purpose
Validate that all 5 Java tools can detect real issues, not just PMD style violations.

## Repositories with Known Security Issues

### 1. **WebGoat** (OWASP Vulnerable Web Application)
- **URL**: https://github.com/WebGoat/WebGoat
- **Purpose**: Intentionally vulnerable for teaching
- **Expected Findings**:
  - Semgrep: SQL injection, XSS, insecure deserialization
  - Dependency-Check: Known CVEs in dependencies
  - PMD: Code quality issues
  - SpotBugs: Security bugs
  - Checkstyle: Style violations

### 2. **Damn Vulnerable Java EE Application**
- **URL**: https://github.com/appsecco/dvja
- **Purpose**: Intentionally vulnerable Java EE app
- **Expected Findings**:
  - Semgrep: Multiple security vulnerabilities
  - Dependency-Check: Outdated dependencies with CVEs
  - PMD: Security-related code smells
  
### 3. **JavaVulnerableLab**
- **URL**: https://github.com/CSPF-Founder/JavaVulnerableLab
- **Purpose**: Vulnerable Java app for security training
- **Expected Findings**:
  - Semgrep: OWASP Top 10 vulnerabilities
  - Dependency-Check: Known CVEs
  - SpotBugs: Security bugs

### 4. **Spring Boot with Known CVEs**
- **URL**: https://github.com/spring-projects/spring-boot (older release branch)
- **Branch**: v2.3.x or v2.4.x (known CVEs)
- **Expected Findings**:
  - Dependency-Check: CVEs in older Spring versions
  - Semgrep: Potential security issues

### 5. **Apache Struts (with known CVEs)**
- **URL**: https://github.com/apache/struts (older versions)
- **Branch**: STRUTS_2_3_X (known remote code execution CVEs)
- **Expected Findings**:
  - Dependency-Check: Critical CVEs
  - Semgrep: Remote code execution patterns
  - SpotBugs: Security vulnerabilities

## Why Current Repos Show 0 Issues for Other Tools

### Spring Petclinic
- **Clean Reference Implementation**: Designed as best-practice example
- **No Security Vulnerabilities**: Well-maintained, no intentional flaws
- **Current Dependencies**: All up-to-date, no known CVEs
- **Result**: PMD finds style issues, but no security problems

### Micronaut/Quarkus Guides
- **Tutorial Code**: Clean examples for learning
- **Modern Frameworks**: Latest versions, actively maintained
- **No CVEs**: Dependencies are current
- **Result**: Style violations only

## Recommended Test Strategy

### Phase 1: Validate Tools Work
Test with repositories that SHOULD have issues:
1. WebGoat (definitely has vulnerabilities)
2. JavaVulnerableLab (intentionally vulnerable)
3. DVJA (multiple security issues)

### Phase 2: Validate on Production Code
Test with real-world repositories:
1. Older versions with known CVEs
2. Large open-source projects with history
3. Active projects with security patches

## Quick Test Command

```bash
# Test WebGoat (should find security issues)
REPO_URL="https://github.com/WebGoat/WebGoat"
REPO_DIR="/tmp/webgoat-test"

rm -rf "$REPO_DIR"
git clone --depth=10 "$REPO_URL" "$REPO_DIR"
cd "$REPO_DIR"
git checkout -B main origin/main

ln -sf "$REPO_DIR" /tmp/kafka-repo

cd ~/codequal/packages/agents
npx ts-node src/two-branch/tests/__tests__/test-java-all-modes.ts
```

## Expected Results

If tools are working correctly:
- **WebGoat** should show:
  - Semgrep: 50+ security issues
  - Dependency-Check: 10+ CVEs
  - PMD: 1000+ code quality issues
  - SpotBugs: 20+ security bugs
  - Checkstyle: 100+ style violations

