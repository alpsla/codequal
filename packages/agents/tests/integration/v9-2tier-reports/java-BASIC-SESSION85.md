# 🔍 Code Quality Analysis Report

## Repository Information

**Repository:** [spring-projects/spring-petclinic](https://github.com/spring-projects/spring-petclinic)  
**Pull Request:** #950 - name2  
**Author:** MichaelKim2000 (MichaelKim2000@github.com)  
**Organization:** spring-projects  
**Source Branch:** pr-950  
**Target Branch:** main  
**Analysis Date:** January 15, 2026 at 01:54 AM GMT  
**Repository Size:** 106 files | 2,744 lines  
**Analyzer Version:** 9.0.0

## PR Impact

**Files Modified:** 14  
**Lines Added:** +2  
**Lines Deleted:** -1  
**Net Change:** +1 lines  

## Analysis Performance

**Total Duration:** 1m 26s  

## Quality Decision

**Result:** ⛔ **DECLINED** (50 blocking issues)

---

## 📊 Executive Summary

### Quality Score

❌ **0.0/100** (Grade: **F**) - Critical

> Significant quality issues require immediate action

**Score Breakdown**:

**Category Scores** (Repository Health):
- 🔒 Security: 0/100
- ✨ Code Quality: 83/100

**Overall Scores**:
- 📱 **APP Score**: 0/100 (MIN of categories - "weakest link")
- 👨‍💻 **Skill Score**: 1/100 (AVG of categories)

> Scores saved to Supabase for tracking trends over time


> 🚀 **Fix Coverage**: 102 issues (100%) have pattern-based fixes available
> See **AI Fix Recommendations** section below for BASIC vs PRO tier details.




---

### Issue Summary

**Active Issues**: 102 (88 unique types)



**By Severity** (active issues):
- 🔴 Critical: 11 (10.8%)
- 🟠 High: 41 (40.2%)
- 🟡 Medium: 43 (42.2%)
- 🟢 Low: 7 (6.9%)

**By Category & Severity**:

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| 🆕 NEW | 10 | 40 | 40 | 7 | **97** |
| ⚠️ EXISTING_MODIFIED | 0 | 0 | 0 | 0 | **0** |
| ✅ RESOLVED | 0 | 0 | 0 | 0 | **0** |
| 📝 EXISTING_REST | 1 | 1 | 3 | 0 | **5** |
| **TOTAL** | **11** | **41** | **43** | **7** | **102** |

**App Health Score by Category**:

| Category | Critical | High | Medium | Low | Total | Score |
|----------|----------|------|--------|-----|-------|-------|
| 🔒 Security | 11 | 41 | 26 | 6 | **84** | **0/100** |
| ⚡ Performance | 0 | 0 | 0 | 0 | **0** | **100/100** |
| 🏗️ Architecture | 0 | 0 | 0 | 0 | **0** | **100/100** |
| 📦 Dependencies | 0 | 0 | 0 | 0 | **0** | **100/100** |
| ✨ Code Quality | 0 | 0 | 17 | 1 | **18** | **83/100** |
| **TOTAL** | **11** | **41** | **43** | **7** | **102** | - |

> **Score Calculation:** Each category starts at 100 (perfect health), then deducts: Critical (-5), High (-3), Medium (-1), Low (-0.5). Table shows active issues only (excludes RESOLVED). APP Score = MIN(all categories).
>
> 💡 **Tip:** RESOLVED issues (ones you fixed) earn XP instead of penalties! [📖 Full Scoring Guide](https://codequal.dev/docs/scoring-guide)

---

### Decision & Actions

**Blocking Decision**:
- 50 blocking issues (NEW or EXISTING_MODIFIED with critical/high severity)
- ⛔ **PR REQUIRES FIXES BEFORE MERGE**



**Analysis Results**:
- AI-analyzed groups: 88
- Cost-optimized analysis: 13.7% reduction
- Coverage: 100% of detected issues
- Duration: 1m 26s

---

### 🤖 AI Fix Recommendations & Auto-Fix Capability

**BASIC vs PRO Tier Fix System**:

CodeQual offers two subscription tiers with different fix capabilities:

**🆓 BASIC Tier** (Pattern Library + IDE Guidance):
- 📚 **Pattern Fixes**: 89 issues (87.3%) - Pre-learned fixes from 642+ patterns in Supabase
- 💡 **IDE Integration**: Export fixes to VS Code, JetBrains for one-click application
- 📖 **Actionable Guidance**: Clear instructions for 13 active issues needing manual attention

**⭐ PRO Tier** (Full AI-Powered Analysis):
- 🤖 **AI Auto-Fix**: All 102 active issues analyzed with contextual AI fixes
- 🔄 **Pattern Learning**: Every fix improves the pattern library (saves cost over time)
- ✅ **Verification**: AI fixes verified before application (syntax, tests, behavior)
- 📈 **Coverage**: 100% of issues get AI-generated fix suggestions

---

### 🔑 Key Findings

- 🔴 **Action Required**: 50 critical/high severity issues must be fixed before merge
- 🔒 **Security Alert**: 11 critical security vulnerabilities found
- 🔧 **Auto-Fix Available**: 102 issues can be fixed automatically (see IDE integration files)

---

### ⚡ Critical Blockers

⛔ **50 issues must be fixed before merge**

**Breakdown:**
- 🔴 Critical: 10 issues
- 🟠 High: 40 issues

**Primary Focus Areas:** 50 security

**Action Required:**
All blocking issues are detailed in the "Critical Issues" and "High Priority Issues" sections below with:
- ✅ Full AI analysis and explanations
- ✅ Code examples and fix recommendations  
- ✅ IDE integration files for automated fixes

**Priority:**
Review critical issues first, then tackle high-priority issues by category to maximize impact.

---



### 📈 Trends & Recommendations

🚀 **Easy Fixes Available**: 1 issues (1%) can be auto-fixed using your IDE or linter. See **How to Apply Fixes** below.

1. **Immediate Action**: 50 blocking issues (10 critical and 40 high) require review before deployment
2. **Security Training**: Consider security training for the team (84 security issues found)
3. **Code Review Process**: High issue count (97 new) suggests need for more thorough pre-commit review
4. **Automation Opportunity**: 100% of issues auto-fixable - consider pre-commit hooks


## 🔴 Critical Issues (Immediate Action Required)

### 🔴 CVE 2022 22965

**Severity**: CRITICAL | **Tool**: trivy | **Found in**: 3 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: spring-framework: RCE via Data Binding on JDK 9+

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Critical security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-22965 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **3 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🔴 CVE 2021 42392

**Severity**: CRITICAL | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: h2: Remote Code Execution in Console

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Critical security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2021-42392 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🔴 CVE 2022 23221

**Severity**: CRITICAL | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: h2: Loading of custom classes from remote servers through JNDI

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Critical security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-23221 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🔴 CVE 2025 24813

**Severity**: CRITICAL | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: Potential RCE and/or information disclosure and/or information corruption with partial PUT

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Critical security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-24813 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🔴 CVE 2024 1597

**Severity**: CRITICAL | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: pgjdbc: PostgreSQL JDBC Driver allows attacker to inject SQL if using PreferQueryMode=SIMPLE

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Critical security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-1597 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🔴 CVE 2023 20873

**Severity**: CRITICAL | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: spring-boot: Security Bypass With Wildcard Pattern Matching on Cloud Foundry

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Critical security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-20873 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🔴 CVE 2016 1000027

**Severity**: CRITICAL | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: spring: HttpInvokerServiceExporter readRemoteInvocation method untrusted java deserialization

#### 🎯 Why does it matter?

Unsafe deserialization can allow attackers to execute arbitrary code by providing malicious serialized data.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Critical security risk. Remote code execution, denial of service, and authentication bypass. Extremely dangerous in Python (pickle) and Java environments.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2016-1000027 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🔴 CVE 2023 20860

**Severity**: CRITICAL | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: springframework: Security Bypass With Un-Prefixed Double Wildcard Pattern

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Critical security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-20860 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🔴 Java Spring Security Audit Spring Actuator Fully Enabled

**Severity**: CRITICAL | **Tool**: semgrep | **Found in**: 1 files | **Category**: EXISTING_REST

---

#### 📋 What is this issue?

Spring Actuator endpoints are enabled without authentication.

#### 🎯 Why does it matter?

Actuator endpoints expose sensitive information about your application (health, metrics, environment variables).

#### 🔍 Common causes:

- Common code pattern that may need attention

#### ⚠️ Impact if not fixed:

Should be reviewed and addressed to maintain code quality.

#### ⚠️ Risk Assessment

**Overall Risk**: 🔴 **CRITICAL RISK**

Immediate action required - may lead to security breaches, data loss, or system failures

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `src/main/resources/application.properties` (Line 17)

**Code**:

```text
    14 | spring.messages.basename=messages/messages
    15 | 
    16 | # Actuator
>   17 | management.endpoints.web.exposure.include=*
    18 | 
    19 | # Logging
    20 | logging.level.org.springframework=INFO
```

#### 🔧 How to Fix

Spring Boot Actuator is fully enabled. This exposes sensitive endpoints such as /actuator/env, /actuator/logfile, /actuator/heapdump and others. Unless you have Spring Security enabled or another means to protect these endpoints, this functionality is available without authentication, causing a significant security risk.

> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.
> See the IDE Integration section below to export issues for manual fixing.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---



## 🟠 High Priority Issues

### 🟠 Yaml Docker Compose Security No New Privileges

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

Docker container does not have "security_opt: no-new-privileges" enabled.

#### 🎯 Why does it matter?

Without this option, processes can gain additional privileges through setuid binaries, increasing attack surface.

#### 🔍 Common causes:

- Common code pattern that may need attention

#### ⚠️ Impact if not fixed:

Should be reviewed and addressed to maintain code quality.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `docker-compose.yml` (Line 4)

**Code**:

```yaml
     1 | version: "2.2"
     2 | 
     3 | services:
>    4 |   mysql:
     5 |     image: mysql:5.7
     6 |     ports:
     7 |       - "3306:3306"
```

#### 🔧 How to Fix

Add "security_opt: [no-new-privileges:true]" to the service definition in docker-compose.yml.

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 Yaml Docker Compose Security Writable Filesystem Service

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

Docker container filesystem is writable, allowing runtime modifications.

#### 🎯 Why does it matter?

If an attacker gains access, they could modify binaries or inject malicious code. Read-only filesystems prevent this.

#### 🔍 Common causes:

- Common code pattern that may need attention

#### ⚠️ Impact if not fixed:

Should be reviewed and addressed to maintain code quality.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `docker-compose.yml` (Line 4)

**Code**:

```yaml
     1 | version: "2.2"
     2 | 
     3 | services:
>    4 |   mysql:
     5 |     image: mysql:5.7
     6 |     ports:
     7 |       - "3306:3306"
```

#### 🔧 How to Fix

Add "read_only: true" to the service definition and use volumes for data that must be writable.

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 Html Security Audit Missing Integrity

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

External scripts loaded via CDN without Subresource Integrity (SRI) verification.

#### 🎯 Why does it matter?

If the CDN is compromised or serves malicious content, your site could execute untrusted code.

#### 🔍 Common causes:

- Common code pattern that may need attention

#### ⚠️ Impact if not fixed:

Should be reviewed and addressed to maintain code quality.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `src/main/resources/templates/fragments/layout.html` (Line 16)

**Code**:

```text
    13 |   <title>PetClinic :: a Spring Framework demonstration</title>
    14 | 
    15 |   <!--[if lt IE 9]>
>   16 |     <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
    17 |     <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    18 |     <![endif]-->
    19 | 
```

#### 🔧 How to Fix

Add integrity="sha384-..." and crossorigin="anonymous" attributes to <script> and <link> tags for external resources.

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2023 6378

**Severity**: HIGH | **Tool**: trivy | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: logback: serialization vulnerability in logback receiver

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-6378 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2025 52999

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: com.fasterxml.jackson.core/jackson-core: jackson-core Potential StackoverflowError

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-52999 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2020 36518

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: jackson-databind: denial of service via a large depth of nested objects

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2020-36518 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 42003

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: jackson-databind: deep wrapper array nesting wrt UNWRAP_SINGLE_VALUE_ARRAYS

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-42003 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 42004

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: jackson-databind: use of deeply nested arrays

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-42004 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2021 23463

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: h2database: XXE injection vulnerability

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2021-23463 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 45868

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: The web-based admin console in H2 Database Engine before 2.2.220 can b ...

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-45868 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2023 22102

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: mysql-connector-java: Connector/J unspecified vulnerability (CPU October 2023)

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-22102 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 42252

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: request smuggling

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-42252 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 45143

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: JsonErrorReportValve injection

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-45143 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2023 24998

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: FileUpload: FileUpload DoS with excessive parts

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-24998 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2023 46589

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: HTTP request smuggling via malformed trailer headers

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-46589 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2024 34750

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: Improper Handling of Exceptional Conditions

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-34750 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2024 50379

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: RCE due to TOCTOU issue in JSP compilation

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-50379 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2024 56337

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: Incomplete fix for CVE-2024-50379 - RCE due to TOCTOU issue in JSP compilation

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-56337 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2025 48988

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: Apache Tomcat DoS in multipart upload

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-48988 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2025 48989

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: http/2 "MadeYouReset" DoS attack through HTTP/2 control frames

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-48989 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2025 55752

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: org.apache.tomcat/tomcat-catalina: Apache Tomcat: Directory traversal via rewrite with possible RCE

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-55752 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 21724

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: jdbc-postgresql: Unchecked Class Instantiation when providing Plugin Classes

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-21724 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 31197

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: postgresql: SQL Injection in ResultSet.refreshRow() with malicious column names

#### 🎯 Why does it matter?

Injection vulnerabilities allow attackers to execute malicious queries or commands in your database or backend systems.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Database compromise, data theft, data manipulation, and potential system access. OWASP Top 10 A03:2021.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-31197 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2025 22235

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: org.springframework.boot/spring-boot: Spring Boot EndpointRequest.to() creates wrong matcher if actuator endpoint is not exposed

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-22235 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2023 20883

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: spring-boot: Spring Boot Welcome Page DoS Vulnerability

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-20883 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 22970

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: springframework: DoS via data binding to multipartFile or servlet part

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-22970 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 22968

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: Framework: Data Binding Rules Vulnerability

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-22968 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2025 41249

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: org.springframework/spring-core: Spring Framework Annotation Detection Vulnerability

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-41249 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2023 20863

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: springframework: Spring Expression DoS Vulnerability

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-20863 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2024 22243

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: springframework: URL Parsing with Host Validation

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-22243 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2024 22259

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: springframework: URL Parsing with Host Validation

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-22259 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2024 22262

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: springframework: URL Parsing with Host Validation

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-22262 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2024 38816

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: spring-webmvc: Path Traversal Vulnerability in Spring Applications Using RouterFunctions and FileSystemResource

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-38816 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2024 38819

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: org.springframework:spring-webmvc: Path traversal vulnerability in functional web frameworks

#### 🎯 Why does it matter?

Path traversal allows attackers to access files outside the intended directory, potentially exposing sensitive system files.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Exposure of sensitive files (config, credentials, source code), and potential for code execution when combined with file upload.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-38819 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 1471

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: SnakeYaml: Constructor Deserialization Remote Code Execution

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-1471 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 CVE 2022 25857

**Severity**: HIGH | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: snakeyaml: Denial of Service due to missing nested depth limitation for collections

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

High availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-25857 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟠 Python Django Security Django No Csrf Token

**Severity**: HIGH | **Tool**: semgrep | **Found in**: 1 files | **Category**: EXISTING_REST

---

#### 📋 What is this issue?

Django form does not include {% csrf_token %} template tag.

#### 🎯 Why does it matter?

Without CSRF protection, forms are vulnerable to Cross-Site Request Forgery attacks.

#### 🔍 Common causes:

- Common code pattern that may need attention

#### ⚠️ Impact if not fixed:

Should be reviewed and addressed to maintain code quality.

#### ⚡ Risk Assessment

**Overall Risk**: 🟠 **HIGH RISK**

High priority - could cause significant problems in production

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `src/main/resources/templates/pets/createOrUpdateVisitForm.html` (Line 31)

**Code**:

```text
    28 |     </tr>
    29 |   </table>
    30 | 
>   31 |   <form th:object="${visit}" class="form-horizontal" method="post">
    32 |     <div class="form-group has-feedback">
    33 |       <input
    34 |         th:replace="~{fragments/inputField :: input ('Date', 'date', 'date')}"  />
```

#### 🔧 How to Fix

Add {% csrf_token %} inside the <form> tag in your Django template.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---



## 🟡 Medium Priority Issues

### 🟡 UnnecessarySemicolon

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 4 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by pmd as a medium severity problem. Rule: UnnecessarySemicolon

#### 🎯 Why does it matter?

This pattern can lead to technical debt or maintenance issues.

#### 🔍 Common causes:

- Code pattern flagged by pmd
- May need refactoring or review

#### ⚠️ Impact if not fixed:

Consider addressing to improve code quality.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `./src/main/java/org/springframework/samples/petclinic/vet/VetRepository.java` (Line 58)

**Code**:

```java
    55 | 	@Cacheable("vets")
    56 | 	Page<Vet> findAll(Pageable pageable) throws DataAccessException;
    57 | 
>   58 | 	;
    59 | 
    60 | }
    61 | 
```

#### 🔧 How to Fix

Review and refactor based on PMD guidance.

#### 📎 All Occurrences

This issue appears in **4 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2024 38820

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: The fix for CVE-2022-22968 made disallowedFieldspatterns in DataBinder ...

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-38820 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 UseUtilityClass

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by pmd as a medium severity problem. Rule: UseUtilityClass

#### 🎯 Why does it matter?

This pattern can lead to technical debt or maintenance issues.

#### 🔍 Common causes:

- Code pattern flagged by pmd
- May need refactoring or review

#### ⚠️ Impact if not fixed:

Consider addressing to improve code quality.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `./.mvn/wrapper/MavenWrapperDownloader.java` (Line 21)

**Code**:

```java
    18 | import java.nio.channels.*;
    19 | import java.util.Properties;
    20 | 
>   21 | public class MavenWrapperDownloader {
    22 | 
    23 |     private static final String WRAPPER_VERSION = "0.5.6";
    24 |     /**
```

#### 🔧 How to Fix

AI-generated fix pattern for UseUtilityClass

> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.
> See the IDE Integration section below to export issues for manual fixing.

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 Resource Not Properly Closed

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

File, stream, socket, or database connection is opened but not properly closed in finally block or try-with-resources.

#### 🎯 Why does it matter?

Unclosed resources cause resource leaks, file handle exhaustion, and connection pool depletion.

#### 🔍 Common causes:

- Not using try-with-resources (Java 7+)
- Missing finally blocks
- Exception thrown before close() call
- Assuming garbage collector will close resources

#### ⚠️ Impact if not fixed:

Resource leaks leading to "Too many open files" errors, connection pool exhaustion, memory leaks, and eventual application crashes.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `./.mvn/wrapper/MavenWrapperDownloader.java` (Line 109)

**Code**:

```java
   106 |             });
   107 |         }
   108 |         URL website = new URL(urlString);
>  109 |         ReadableByteChannel rbc;
   110 |         rbc = Channels.newChannel(website.openStream());
   111 |         FileOutputStream fos = new FileOutputStream(destination);
   112 |         fos.getChannel().transferFrom(rbc, 0, Long.MAX_VALUE);
```

#### 🔧 How to Fix

Review and refactor based on PMD guidance.

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 UseLocaleWithCaseConversions

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 2 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by pmd as a medium severity problem. Rule: UseLocaleWithCaseConversions

#### 🎯 Why does it matter?

This pattern can lead to technical debt or maintenance issues.

#### 🔍 Common causes:

- Code pattern flagged by pmd
- May need refactoring or review

#### ⚠️ Impact if not fixed:

Consider addressing to improve code quality.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `./src/main/java/org/springframework/samples/petclinic/owner/Owner.java` (Line 133)

**Code**:

```java
   130 | 	 * @return true if pet name is already in use
   131 | 	 */
   132 | 	public Pet getPet(String name, boolean ignoreNew) {
>  133 | 		name = name.toLowerCase();
   134 | 		for (Pet pet : getPets()) {
   135 | 			if (!ignoreNew || !pet.isNew()) {
   136 | 				String compName = pet.getName();
```

#### 🔧 How to Fix

AI-generated fix pattern for UseLocaleWithCaseConversions

> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.
> See the IDE Integration section below to export issues for manual fixing.

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 DoubleBraceInitialization

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 2 files | **Category**: EXISTING_REST

---

#### 📋 What is this issue?

This issue was detected by pmd as a medium severity problem. Rule: DoubleBraceInitialization

#### 🎯 Why does it matter?

This pattern can lead to technical debt or maintenance issues.

#### 🔍 Common causes:

- Code pattern flagged by pmd
- May need refactoring or review

#### ⚠️ Impact if not fixed:

Consider addressing to improve code quality.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `./src/test/java/org/springframework/samples/petclinic/owner/PetTypeFormatterTests.java` (Line 83)

**Code**:

```java
    80 | 	private List<PetType> makePetTypes() {
    81 | 		List<PetType> petTypes = new ArrayList<>();
    82 | 		petTypes.add(new PetType() {
>   83 | 			{
    84 | 				setName("Dog");
    85 | 			}
    86 | 		});
```

#### 🔧 How to Fix

AI-generated fix pattern for DoubleBraceInitialization

> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.
> See the IDE Integration section below to export issues for manual fixing.

#### 📎 All Occurrences

This issue appears in **2 files** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2024 12798

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: logback-core: arbitrary code execution via JaninoEventEvaluator

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-12798 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2025 11226

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: ch.qos.logback/logback-core: Conditional abitrary code execution in logback-core

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-11226 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2023 41080

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: Open Redirect vulnerability in FORM authentication

#### 🎯 Why does it matter?

Server-Side Request Forgery allows attackers to make requests from your server to internal or external resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Access to internal services, cloud metadata theft (AWS credentials), and potential remote code execution. OWASP Top 10 A10:2021.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-41080 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2023 42795

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: improper cleaning of recycled objects could lead to information leak

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-42795 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2023 44487

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: HTTP/2: Multiple HTTP/2 enabled web servers are vulnerable to a DDoS attack (Rapid Reset Attack)

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-44487 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2023 45648

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: incorrectly parsed http trailer headers can cause request smuggling

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-45648 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2024 24549

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: Tomcat: HTTP/2 header handling DoS

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-24549 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2025 49124

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: Apache Tomcat installer for Windows has an untrusted search path vulnerability

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-49124 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2025 49125

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: Apache Tomcat: Security constraint bypass for pre/post-resources

#### 🎯 Why does it matter?

Remote Code Execution is the most severe vulnerability type. Attackers can run arbitrary code on your server with the application's privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Complete system compromise, data theft, malware installation, and lateral movement to other systems. Requires immediate patching. CVSS typically 9.0+.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-49125 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2024 23672

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: Tomcat: WebSocket DoS with incomplete closing handshake

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-23672 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2022 41946

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: postgresql-jdbc: Information leak of prepared statement data due to insecure temporary file permissions

#### 🎯 Why does it matter?

Authentication bypass allows attackers to access protected resources without valid credentials or elevate their privileges.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Unauthorized access to protected resources, potential data breach, and privilege escalation. Compliance violations (SOC2, ISO 27001).

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-41946 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 GHSA 673j Qm5f Xpv8

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by trivy as a medium severity problem. Rule: GHSA-673j-qm5f-xpv8

#### 🎯 Why does it matter?

This pattern can lead to technical debt or maintenance issues.

#### 🔍 Common causes:

- Code pattern flagged by trivy
- May need refactoring or review

#### ⚠️ Impact if not fixed:

Consider addressing to improve code quality.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the GHSA-673j-qm5f-xpv8 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2023 34055

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: spring-boot: org.springframework.boot: spring-boot-actuator class vulnerable to denial of service

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-34055 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2022 22950

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: spring-expression: Denial of service via specially crafted SpEL expression

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-22950 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2023 20861

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: springframework: Spring Expression DoS Vulnerability

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2023-20861 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2024 38808

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: spring-expression: Denial of service when processing a specially crafted Spring Expression Language expression

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-38808 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2024 38809

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: org.springframework:spring-web: Spring Framework DoS via conditional HTTP request

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-38809 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2024 38828

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: org.springframework:spring-webmvc: DoS via Spring MVC controller method with byte[] parameter

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-38828 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2025 41242

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: org.springframework/spring-webmvc: Spring Framework MVC path traversal vulnerability

#### 🎯 Why does it matter?

Path traversal allows attackers to access files outside the intended directory, potentially exposing sensitive system files.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Exposure of sensitive files (config, credentials, source code), and potential for code execution when combined with file upload.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-41242 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2022 38749

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: snakeyaml: Uncaught exception in org.yaml.snakeyaml.composer.Composer.composeSequenceNode

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-38749 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2022 38750

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: snakeyaml: Uncaught exception in org.yaml.snakeyaml.constructor.BaseConstructor.constructObject

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-38750 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2022 38751

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: snakeyaml: Uncaught exception in java.base/java.util.regex.Pattern$Ques.match

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-38751 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2022 38752

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: snakeyaml: Uncaught exception in java.base/java.util.ArrayList.hashCode

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-38752 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 CVE 2022 41854

**Severity**: MEDIUM | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: dev-java/snakeyaml: DoS via stack overflow

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### 📊 Risk Assessment

**Overall Risk**: 🟡 **MODERATE RISK**

Should be addressed - may impact system quality or maintainability

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-41854 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 NoPackage

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by pmd as a medium severity problem. Rule: NoPackage

#### 🎯 Why does it matter?

This pattern can lead to technical debt or maintenance issues.

#### 🔍 Common causes:

- Code pattern flagged by pmd
- May need refactoring or review

#### ⚠️ Impact if not fixed:

Consider addressing to improve code quality.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `./.mvn/wrapper/MavenWrapperDownloader.java` (Line 21)

**Code**:

```java
    18 | import java.nio.channels.*;
    19 | import java.util.Properties;
    20 | 
>   21 | public class MavenWrapperDownloader {
    22 | 
    23 |     private static final String WRAPPER_VERSION = "0.5.6";
    24 |     /**
```

#### 🔧 How to Fix

Add a package declaration to properly organize the class

> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.
> See the IDE Integration section below to export issues for manual fixing.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 EmptyCatchBlock

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by pmd as a medium severity problem. Rule: EmptyCatchBlock

#### 🎯 Why does it matter?

This pattern can lead to technical debt or maintenance issues.

#### 🔍 Common causes:

- Code pattern flagged by pmd
- May need refactoring or review

#### ⚠️ Impact if not fixed:

Consider addressing to improve code quality.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `./.mvn/wrapper/MavenWrapperDownloader.java` (Line 71)

**Code**:

```java
    68 |                     if(mavenWrapperPropertyFileInputStream != null) {
    69 |                         mavenWrapperPropertyFileInputStream.close();
    70 |                     }
>   71 |                 } catch (IOException e) {
    72 |                     // Ignore ...
    73 |                 }
    74 |             }
```

#### 🔧 How to Fix

AI-generated fix pattern for EmptyCatchBlock

> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.
> See the IDE Integration section below to export issues for manual fixing.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 Catching Throwable or Error

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Catching Throwable or Error in exception handlers, which includes system-level errors.

#### 🎯 Why does it matter?

Catching Throwable can hide critical JVM errors like OutOfMemoryError or ThreadDeath that should propagate.

#### 🔍 Common causes:

- Overly broad exception handling
- Misunderstanding Java exception hierarchy
- Trying to prevent all crashes (wrong approach)
- Legacy error handling patterns

#### ⚠️ Impact if not fixed:

System instability, inability to recover from fatal errors, and difficult-to-diagnose runtime issues.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `./.mvn/wrapper/MavenWrapperDownloader.java` (Line 90)

**Code**:

```java
    87 |             downloadFileFromURL(url, outputFile);
    88 |             System.out.println("Done");
    89 |             System.exit(0);
>   90 |         } catch (Throwable e) {
    91 |             System.out.println("- Error downloading");
    92 |             e.printStackTrace();
    93 |             System.exit(1);
```

#### 🔧 How to Fix

Replace Throwable with specific exception types to avoid catching Errors

> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.
> See the IDE Integration section below to export issues for manual fixing.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 UnusedFormalParameter

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Unused code detected (Rule: UnusedFormalParameter). Unused imports or variables clutter the codebase.

#### 🎯 Why does it matter?

Unused code increases maintenance burden, slows module loading, and can indicate incomplete refactoring.

#### 🔍 Common causes:

- Refactoring without cleanup
- Copy-pasted code
- IDE auto-import leftovers
- Abandoned code paths

#### ⚠️ Impact if not fixed:

Code clutter, slower imports, maintenance confusion. Remove unused code.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Code Quality  
**Focus**: Maintaining clean, readable, and maintainable code

#### 📍 Representative Example

**Location**: `./src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java` (Line 112)

**Code**:

```java
   109 | 		}
   110 | 	}
   111 | 
>  112 | 	private String addPaginationModel(int page, Model model, String lastName, Page<Owner> paginated) {
   113 | 		model.addAttribute("listOwners", paginated);
   114 | 		List<Owner> listOwners = paginated.getContent();
   115 | 		model.addAttribute("currentPage", page);
```

#### 🔧 How to Fix

AI-generated fix pattern for UnusedFormalParameter

> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.
> See the IDE Integration section below to export issues for manual fixing.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟡 Complex Boolean Return Logic

**Severity**: MEDIUM | **Tool**: pmd | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

Boolean return can be simplified (e.g., "if (x) return true; else return false;" → "return x;").

#### 🎯 Why does it matter?

Simpler code is easier to read and maintain.

#### 🔍 Common causes:

- Common code pattern that may need attention

#### ⚠️ Impact if not fixed:

May contribute to technical debt. Consider addressing during regular maintenance.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Performance  
**Focus**: Optimizing speed, resource usage, and scalability

#### 📍 Representative Example

**Location**: `./src/test/java/org/springframework/samples/petclinic/owner/OwnerControllerTests.java` (Line 202)

**Code**:

```java
   199 | 						@SuppressWarnings("unchecked")
   200 | 						List<Pet> pets = (List<Pet>) item;
   201 | 						Pet pet = pets.get(0);
>  202 | 						if (pet.getVisits().isEmpty()) {
   203 | 							return false;
   204 | 						}
   205 | 						return true;
```

#### 🔧 How to Fix

AI-generated fix pattern for SimplifyBooleanReturns

> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.
> See the IDE Integration section below to export issues for manual fixing.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---



## 🟢 Low Priority Issues

### 🟢 CVE 2024 12801

**Severity**: LOW | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: logback-core: SaxEventRecorder vulnerable to Server-Side Request Forgery (SSRF) attacks

#### 🎯 Why does it matter?

Server-Side Request Forgery allows attackers to make requests from your server to internal or external resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Access to internal services, cloud metadata theft (AWS credentials), and potential remote code execution. OWASP Top 10 A10:2021.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2024-12801 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟢 CVE 2025 46701

**Severity**: LOW | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: Apache Tomcat: Security constraint bypass for CGI scripts

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-46701 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟢 CVE 2025 55754

**Severity**: LOW | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: org.apache.tomcat/tomcat-juli: tomcat: Apache Tomcat: console manipulation

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-55754 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟢 CVE 2025 61795

**Severity**: LOW | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: tomcat: org.apache.tomcat/tomcat-catalina: Apache Tomcat: Denial of service

#### 🎯 Why does it matter?

Denial of Service vulnerabilities can make your application unavailable to legitimate users. Attackers may exploit performance issues to exhaust system resources.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium availability risk. Application may become slow or unresponsive when processing malicious input. This affects user experience and SLA compliance but does NOT lead to data theft or code execution.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-61795 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟢 CVE 2022 26520

**Severity**: LOW | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: postgresql-jdbc: Arbitrary File Write Vulnerability

#### 🎯 Why does it matter?

Path traversal allows attackers to access files outside the intended directory, potentially exposing sensitive system files.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Exposure of sensitive files (config, credentials, source code), and potential for code execution when combined with file upload.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2022-26520 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟢 CVE 2025 22233

**Severity**: LOW | **Tool**: trivy | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

**Vulnerability Details**: CVE-2024-38820 ensured Locale-independent, lowercase conversion for bo ...

#### 🎯 Why does it matter?

This dependency has a known security vulnerability that could affect your application's security posture.

#### 🔍 Common causes:

- Using outdated dependency versions with known vulnerabilities
- Not regularly updating dependencies (should be weekly/monthly)
- Lack of automated dependency scanning in CI/CD pipeline
- Delayed security patch application
- Using abandoned or unmaintained packages

#### ⚠️ Impact if not fixed:

Medium security risk. Review the vulnerability details above to understand the specific impact. Update to a patched version as recommended.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Security  
**Focus**: Protecting against attacks, vulnerabilities, and unauthorized access

#### 📍 Representative Example

**Location**: `pom.xml` (Line 1)

**Code**:

```xml
>    1 | <?xml version="1.0" encoding="UTF-8"?>
     2 | <project xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://maven.apache.org/POM/4.0.0" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0....
     3 |   <modelVersion>4.0.0</modelVersion>
     4 |   <groupId>org.springframework.samples</groupId>
```

#### 🔧 How to Fix

Review the CVE-2025-22233 violation and apply the recommended fix pattern for trivy.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---


### 🟢 UnnecessaryImport

**Severity**: LOW | **Tool**: pmd | **Found in**: 1 files | **Category**: NEW

---

#### 📋 What is this issue?

This issue was detected by pmd as a low severity problem. Rule: UnnecessaryImport

#### 🎯 Why does it matter?

This pattern can lead to technical debt or maintenance issues.

#### 🔍 Common causes:

- Code pattern flagged by pmd
- May need refactoring or review

#### ⚠️ Impact if not fixed:

Consider addressing to improve code quality.

#### ✨ Risk Assessment

**Overall Risk**: 🟢 **LOW RISK**

Nice to fix - improves code quality and developer experience

**Category**: Architecture  
**Focus**: Improving system design, maintainability, and extensibility

#### 📍 Representative Example

**Location**: `./src/main/java/org/springframework/samples/petclinic/owner/PetController.java` (Line 23)

**Code**:

```java
    20 | import org.springframework.util.StringUtils;
    21 | import org.springframework.validation.BindingResult;
    22 | import org.springframework.web.bind.WebDataBinder;
>   23 | import org.springframework.web.bind.annotation.*;
    24 | 
    25 | import javax.validation.Valid;
    26 | import java.util.Collection;
```

#### 🔧 How to Fix

Removes import statements that are not used in the Java file.

> 💡 **AI Fix Available**: Upgrade to PRO tier to see the AI-generated fix code for this issue.
> See the IDE Integration section below to export issues for manual fixing.

#### 📎 All Occurrences

This issue appears in **1 file** across your codebase.

> 💡 **Auto-fixable**: This issue can be resolved using the 1-click solution in the IDE Integration section below.

---



## 💼 Business Impact Analysis

### Executive Summary
⚠️ **Critical attention required:** 50 blocking issues must be resolved before deployment to avoid security vulnerabilities or system failures.

### Financial Impact
**🚀 CodeQual Value Proposition**

| Metric | Without CodeQual | With CodeQual |
|--------|------------------|---------------|
| **Fix Time** | 75.0 hours (~10 days) | **3 hours** (AI-assisted) |
| **Developer Cost** | $11,253 | **$375** |
| **Time Saved** | - | **97%** |
| **Fix Coverage** | 0% | **100%** (All 102 issues have fix suggestions) |

**Fix Availability by Type:**
- **Pattern Auto-Fix**: 26/102 issues (25%) - high-confidence, instant apply
- **AI-Assisted Fix**: 76/102 issues (75%) - review recommended

**How CodeQual Reduces Fix Time:**
- **PRO Tier**: 1-click apply for all 102 issues (~6 min review + apply)
- **BASIC Tier**: Export to IDE (LSP/SARIF) for semi-automated application
- **All Tiers**: Every issue includes AI-generated fix code

| Risk Metric | Value |
|-------------|-------|
| **Potential Exploit Cost** | $50,000 - $500,000 |
| **Risk Description** | Data breach costs, compliance fines (GDPR: €20M or 4% revenue), remediation, legal fees |
| **ROI** | **133x** (prevention cost vs exploit cost) |

> 💡 **Bottom Line**: CodeQual turns 10 days of manual work into ~3 hours of review + apply, saving **$10,878** per analysis.

### Risk Assessment
- **Immediate Risk:** 🔴 High
  - 50 blocking issues require attention before deployment
  - 10 critical issues need urgent resolution
  - 40 high-severity issues should be prioritized
  
- **Future Risk:** 🟡 Medium
  - Technical debt will compound if 50 backlog issues are not addressed
  - Code maintainability may decrease over time
  - Security vulnerabilities (84) pose ongoing risk

### Risk Matrix by Category
| Category | This PR | Pre-existing | Auto-fixable | Action Required |
|----------|---------|--------------|--------------|-----------------|
| **Security** | 82 | 2 | 1 | 🔴 Critical |
| **Performance** | 0 | 0 | 0 | ⚪ None |
| **Architecture** | 0 | 0 | 0 | ⚪ None |
| **Dependencies** | 0 | 0 | 0 | ⚪ None |
| **Code Quality** | 15 | 3 | 12 | 🟢 Low |

**Legend:**
- **This PR:** Issues in files modified by this PR (NEW + EXISTING_MODIFIED)
- **Pre-existing:** Issues in files NOT touched by this PR (EXISTING_REST)
- **Auto-fixable:** Issues with available 1-click fixes
- **Action Required:** Priority based on severity of issues introduced/modified by this PR

### Recommendations

1. **Immediate Action:** Resolve 50 blocking issues before deployment
2. **Priority:** Address critical blockers first
3. **Planning:** Schedule time for 43 medium-severity issues in upcoming sprints
4. **Continuous Improvement:** Track and reduce 7 low-severity issues over time


**Note:** Each issue group section above includes detailed business impact analysis specific to that issue type.

---

### 💼 Time & Cost Analysis

| Metric | Manual Fix | With CodeQual BASIC |
|--------|------------|---------------------|
| **Developer Time** | 75.0 hours | **23.3 hours** |
| **Cost (@$150/hr)** | $11,253 | **$3,488** |
| **Time Reduction** | — | **69%** ✅ |

**What BASIC includes:**
- ✅ Pattern-based fixes for 26 issues (~1 min)
- ✅ AI recommendations for IDE agents (Cursor, Copilot)
- ✅ Detailed fix guidance for 76 remaining issues

---

### 💡 Upgrade to PRO

**Reduce 23.3 hours to ~30 seconds**

| Feature | BASIC | PRO |
|---------|-------|-----|
| Pattern Fixes | ✅ | ✅ |
| AI Recommendations | ✅ | ✅ |
| Educational Resources | ✅ | ✅ |
| Achievements & XP | ✅ | ✅ |
| Skills Tracking | ✅ | ✅ |
| Community Impact | ✅ | ✅ |
| **Auto-Apply Fixes** | ❌ | ✅ |
| **Historical Analytics** | ✅ 5 PRs | ✅ Unlimited |

[🚀 Upgrade to PRO] — Start your free trial


## 📚 Phased Educational Plan

### 📚 Phase 1: Blocker Issues Training (MUST FIX BEFORE MERGE)
**Quick Learning:** 30-60 min per issue type | **Deep Dive:** 1-2 weeks

**CVE 2022 22965** (3 occurrences):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-22965) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-22965) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**Yaml Docker Compose Security No New Privileges** (2 occurrences):
- [📚 Semgrep: no-new-privileges](https://semgrep.dev/r/yaml.docker-compose.security.no-new-privileges.no-new-privileges)

**Yaml Docker Compose Security Writable Filesystem Service** (2 occurrences):
- [📚 Semgrep: writable-filesystem-service](https://semgrep.dev/r/yaml.docker-compose.security.writable-filesystem-service.writable-filesystem-service)

**Html Security Audit Missing Integrity** (2 occurrences):
- [📚 Semgrep: missing-integrity](https://semgrep.dev/r/html.security.audit.missing-integrity.missing-integrity)

**CVE 2023 6378** (2 occurrences):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2023-6378) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-6378) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2025 52999** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2025-52999) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-52999) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2020 36518** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2020-36518) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-36518) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 42003** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-42003) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-42003) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 42004** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-42004) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-42004) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2021 42392** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2021-42392) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-42392) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 23221** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-23221) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-23221) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2021 23463** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2021-23463) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-23463) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 45868** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-45868) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-45868) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2023 22102** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2023-22102) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-22102) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2025 24813** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2025-24813) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-24813) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 42252** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-42252) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-42252) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 45143** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-45143) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-45143) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2023 24998** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2023-24998) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-24998) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2023 46589** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2023-46589) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-46589) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2024 34750** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2024-34750) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-34750) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2024 50379** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2024-50379) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-50379) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2024 56337** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2024-56337) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-56337) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2025 48988** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2025-48988) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-48988) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2025 48989** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2025-48989) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-48989) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2025 55752** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2025-55752) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-55752) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2024 1597** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2024-1597) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-1597) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 21724** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-21724) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-21724) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 31197** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-31197) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-31197) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2025 22235** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2025-22235) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-22235) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2023 20873** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2023-20873) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-20873) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2023 20883** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2023-20883) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-20883) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 22970** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-22970) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-22970) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 22968** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-22968) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-22968) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2025 41249** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2025-41249) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2025-41249) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2023 20863** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2023-20863) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-20863) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2016 1000027** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2016-1000027) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2016-1000027) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2024 22243** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2024-22243) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-22243) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2024 22259** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2024-22259) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-22259) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2024 22262** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2024-22262) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-22262) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2023 20860** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2023-20860) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2023-20860) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2024 38816** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2024-38816) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-38816) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2024 38819** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2024-38819) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2024-38819) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 1471** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-1471) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-1471) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

**CVE 2022 25857** (1 occurrence):
- [🔒 NVD Database](https://nvd.nist.gov/vuln/detail/CVE-2022-25857) - NIST National Vulnerability Database
- [📋 MITRE CVE](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-25857) - Official CVE details
- [🛡️ CISA Known Exploited Vulnerabilities](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) - Check if actively exploited

### 📚 Phase 1.5: Additional Critical/High Issues Training (Not Blockers)
**These issues exist in unchanged files but should be addressed soon.**

**Java Spring Security Audit Spring Actuator Fully Enabled** (1 occurrence):
- [📚 Semgrep: spring-actuator-fully-enabled](https://semgrep.dev/r/java.spring.security.audit.spring-actuator-fully-enabled.spring-actuator-fully-enabled)

**Python Django Security Django No Csrf Token** (1 occurrence):
- [📚 Semgrep: django-no-csrf-token](https://semgrep.dev/r/python.django.security.django-no-csrf-token.django-no-csrf-token)

### 📚 Phase 2: Dedicated Training (Extended Learning)

**Required Time:** 2-4 weeks | **Format:** Self-paced courses and documentation

**Goal:** Address knowledge gaps identified by this analysis to prevent future issues.

**Security Fundamentals** (based on Security issues found):
- [🎓 PortSwigger Web Security Academy](https://portswigger.net/web-security) - Interactive hands-on labs
- [🛡️ OWASP Top 10](https://owasp.org/www-project-top-ten/) - Critical security risks
- [🔒 OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Quick security reference
- [📖 CWE Top 25](https://cwe.mitre.org/top25/) - Most dangerous software weaknesses

> 💡 **Note**: Focus on the knowledge areas above to write better code and avoid similar issues in future PRs.

### 📚 Phase 3: Code Style & Formatting (Optional)

**50 style/formatting issues** can be addressed to improve code consistency.

| Tool | Issues | Reference |
|------|--------|----------|
| trivy | 32 | See tool documentation |
| PMD | 18 | [📚 PMD Rules Reference](https://pmd.github.io/latest/pmd_rules_java.html) |

> 💡 **Tip**: These are style issues with no runtime impact. Fix via IDE auto-format or linter `--fix` commands.

## 👥 Skills Tracking

### MichaelKim2000's Performance

**Overall Score:** 1/100
**Ranking:** #2 of 3 developers
**Team Average:** 7/100

### Category Breakdown

| Category | Your Score | Team Avg | Status |
|----------|------------|----------|--------|
| 🔒 Security | 0/100 | 7/100 | ⚠️ Average |
| ⚡ Performance | 1/100 | 7/100 | ⚠️ Average |
| 🏗️  Architecture | 1/100 | 7/100 | ⚠️ Average |
| 📦 Dependencies | 1/100 | 7/100 | ⚠️ Average |
| ✨ Code Quality | 0/100 | 7/100 | ⚠️ Average |

### 🏆 Top Performers

| Rank | Developer | Score | PRs Analyzed |
|------|-----------|-------|-------------|
| 1 | petclinic-contributor | 20/100 | 5 |
| 2 | **MichaelKim2000** | **1/100** | **160** |

> 💡 **Note:** Scores are based on code quality in your PRs. Higher scores mean fewer issues introduced!

## 🎮 XP Progress & Achievements

### Level 2: Apprentice

**Total XP:** 250
> 📊 **Breakdown:** 10 analyses (250 XP) + 0 high scores (0 XP)

[████████████████░░░░] 83% to next level

### Achievement Collection

| Tier | Unlocked |
|------|----------|
| 🏆 Legendary | 0 |
| 💜 Epic | 0 |
| 💙 Rare | 1 |
| ⚪ Common | 1 |

> 💡 **How to earn more XP:** Fix issues in your PR before analysis! Each resolved issue = +5 XP, critical = +20 XP bonus.
> [📖 Full Scoring Guide](https://codequal.dev/docs/scoring-guide)


## 📜 Professional Certifications

You have earned **2 certifications**
demonstrating expertise in code quality and security practices.

### Recent Certifications

#### Dedicated Developer

Reached the milestone of 10+ code analyses, demonstrating commitment to quality.

| Field | Value |
|-------|-------|
| **Awarded** | January 15, 2026 |
| **Credential ID** | `MIL-2026-dedica` |
| **Category** | Milestone |


---

#### First Analysis Certified

Completed your first code quality analysis, beginning the journey toward excellence.

| Field | Value |
|-------|-------|
| **Awarded** | January 2, 2026 |
| **Credential ID** | `MIL-2026-early-` |
| **Category** | Milestone |


---


[Download Certificates] | [Add to LinkedIn] | [View All (2)]



## 🌟 Community Pattern Library

### Powered by the Community

Your analysis benefits from **community-contributed fix patterns** that provide
instant, proven solutions for common issues.

**What you get with BASIC:**
- ✅ Access to community pattern library
- ✅ Instant pattern-based fixes (when available)
- ✅ Educational insights from tool analysis
- ✅ IDE export formats (SARIF, GitLab, Checkstyle)

**Upgrade to PRO for:**
- 🤖 AI-generated fixes for ALL issues
- 📝 Contribute your own patterns to help others
- 🏆 Recognition on community leaderboards
- ⏱️ Track your community impact


## 📊 Analysis Metadata

### Analysis Coverage
| Metric | Value |
|--------|-------|
| Total Repository Files | 106 |
| Lines of Code | 2,744 |
| Files Modified | 14 |
| Note | Files Modified is clamped to Total Repository Files to avoid overcount (renames/moves) |
| Lines Changed | 3 (+2/-1) |

### Tool Performance
| Tool | Issues Found | Duration |
|------|--------------|----------|
| semgrep | 8 | 11.0s |
| trivy | 76 | 12.7s |
| pmd | 18 | 7.3s |

### Cost Analysis
- **Total Analysis Cost:** $0.0000 (tool-based analysis)
- **Active Tool Runtime:** 5.0s (Billing Metric)


## 💬 PR Comment Template

**Ready-to-paste comment for your pull request:**

```markdown
## ⛔ Code Quality Analysis: DECLINED

Hi @MichaelKim2000! I've completed a comprehensive analysis of your PR.

There are 50 issues that need to be addressed. I've provided detailed fix suggestions for each. Let me know if you need any help! 🚀

### Summary
- **Total Issues:** 102 (88 unique types)
- **Blocking Issues:** 50 ⛔
- **Resolved Issues:** 0 
- **Analysis Time:** 86.2s

### ⛔ Blocking Issues
Please fix these before merge:
- **yaml.docker-compose.security.no-new-privileges.no-new-privileges** in `docker-compose.yml`:4
- **yaml.docker-compose.security.writable-filesystem-service.writable-filesystem-service** in `docker-compose.yml`:4
- **yaml.docker-compose.security.no-new-privileges.no-new-privileges** in `docker-compose.yml`:16
- **yaml.docker-compose.security.writable-filesystem-service.writable-filesystem-service** in `docker-compose.yml`:16
- **html.security.audit.missing-integrity.missing-integrity** in `src/main/resources/templates/fragments/layout.html`:16

... and 45 more

### 💡 Quick Stats
- Auto-fixable: 102/102 issues (88/88 types)
- Critical: 11
- High: 41
- Medium: 43
- Low: 7

> 💡 **Note**: Auto-fixable count is based on IDE capabilities. See manifest file for exact fixable status per issue.
```

> 💡 **Tip**: Copy the markdown above and paste it as a comment on your pull request.

## 🛠️ How to Apply Fixes

> ⚠️ **RECOMMENDATIONS ONLY**: CodeQual provides fix suggestions based on AI analysis. You control whether to apply them. Review all changes before applying to production code.

**Quick Decision Guide**:
- 🎯 **Using an IDE (Cursor, VSCode, IntelliJ)?** → Use **Method 1: LSP** (fastest, 1-click fixes)
- 🏆 **Using GitHub Code Scanning or CI/CD?** → Use **Method 2: SARIF** (industry standard)
- 🦊 **Using GitLab?** → Use **Method 3: GitLab** (native integration)

### 🎯 Method 1: LSP Batch Actions (Best for IDEs) ⚡

**✨ Best for IDEs**: Apply ALL 102 fixes with 1 click!

**Download**: `codequal-lsp-actions.json`
- URL: [Download LSP file](https://ftjhmbbcuqjqmmbaymqb.supabase.co/storage/v1/object/public/v9-attachments/spring-petclinic-pr950-1768442063325/codequal-lsp-actions.json)
- Works with: Cursor, VSCode, IntelliJ, any LSP-compatible IDE

**How LSP Works**:
- 📦 **Single file**: All 102 fixes in one JSON file (no lazy loading)
- ⚡ **Parallel editing**: Batch actions apply fixes to multiple files simultaneously
- 🎯 **Grouped by severity**: Batch actions organized by severity for easy filtering
- 🔄 **IDE-native**: Uses LSP protocol for instant, reliable fixes

**Steps**:
1. Download `codequal-lsp-actions.json`
2. Load file in your IDE (method varies by IDE)
3. Open any file with issues
4. Press `Cmd+.` (or `Ctrl+.`) to open Quick Fix menu
5. Select **"Apply All Fixes (102 issues)"** at top of menu
6. All fixes applied across all files in < 1 second! ✅

**Batch Actions Available**:
- 🔥 **"Apply All Fixes"** - All 102 issues across all files in one click
- 🔴 **"Apply Critical Severity Fixes"** - 1 issues
- 🟡 **"Apply Medium Severity Fixes"** - 11 issues
- 🟢 **"Apply Low Severity Fixes"** - 1 issues
- 📝 Individual fixes available for granular control

> 💡 **How it works**: LSP batch actions group all fixes into a single IDE operation. When you click "Apply All", your IDE applies all 102 fixes across multiple files simultaneously (parallel editing)! All fixes are in one file - no lazy loading needed.

**Three Ways to Use Batch Actions**:

1. **🚀 Apply All (Fastest)** - 1 click for all 102 fixes (~5 seconds)
2. **🎯 Severity Batches** - E.g., "Apply All Low Severity" for safe bulk fixes
3. **👁️ Individual Review** - Review each fix before applying (102 clicks)

---

### 🔄 How CodeQual Fixes Work (Two-Tier System)

**Two Fix Tiers for Maximum Coverage**:

**📚 BASIC Tier (Pattern Library) - FREE**
- Covers 50-60% of common issues with validated patterns
- Speed: Instant (< 1ms per fix)
- Cost: FREE - included in all plans
- Languages: Java, TypeScript, Python, Go, Ruby
- Patterns from: Checkstyle, PMD, ESLint, Ruff, Pylint, RuboCop

**🤖 PRO Tier (AI-Generated) - PREMIUM**
- Covers 100% of issues with AI-generated code
- Speed: 2-5 seconds per fix (real-time generation)
- Cost: Usage-based (AI API calls)
- Contextual: Adapts to your code style and patterns
- Smart: Handles complex refactoring, security fixes

**How Application Works (IDE Integration)**:
```
When you click "Apply Fix" in your IDE:

1. Code unchanged since analysis?
   → Apply pre-generated fix instantly (BASIC or PRO)

2. Code changed after analysis?
   → IDE AI adapts the fix to your changes
   → Ensures fix still applies correctly
```

**Why Trust Batch Apply?**
✅ All fixes tested against your actual code
✅ Only safe, non-breaking changes included
✅ IDE AI fallback handles code changes automatically
✅ Can undo with Cmd+Z if needed

> 💡 **Tip**: BASIC tier fixes are instant and free. PRO tier adds AI coverage for 100% of issues.

---

### 📋 Method 2: SARIF Report (Best for GitHub Code Scanning)

**Download**: `codequal-sarif-report.json`
- URL: [Download SARIF file](https://ftjhmbbcuqjqmmbaymqb.supabase.co/storage/v1/object/public/v9-attachments/spring-petclinic-pr950-1768442063325/codequal-sarif-report.json)
- Works with: GitHub Code Scanning, CI/CD pipelines, VSCode/Cursor (with extension)

**For GitHub Code Scanning**:
1. Upload `codequal-sarif-report.json` to GitHub Actions
2. GitHub automatically displays issues in Security tab
3. Issues appear in PR checks and can block merges

**For VSCode/Cursor (Alternative to LSP)**:
1. Install SARIF Viewer extension from marketplace
2. Open Command Palette (`Cmd+Shift+P`)
3. Run: "SARIF: Open SARIF File"
4. Select `codequal-sarif-report.json`
5. View all issues in Problems panel

> 🏆 **Best for**: GitHub Code Scanning, CI/CD pipelines, permanent diagnostic records

---

### 🦊 Method 3: Code Climate / GitLab Code Quality

**Download**: `codequal-gitlab-codequality.json`
- URL: [Download Code Climate file](https://ftjhmbbcuqjqmmbaymqb.supabase.co/storage/v1/object/public/v9-attachments/spring-petclinic-pr950-1768442063325/codequal-gitlab-codequality.json)
- Works with: GitLab CI/CD, GitHub Actions (via Code Climate), Jenkins, CircleCI
- Format: Code Climate (industry standard)

**GitHub Actions Integration** (via Code Climate):

```yaml
# .github/workflows/code-quality.yml
- name: Upload Code Quality Report
  uses: actions/upload-artifact@v4
  with:
    name: code-quality-report
    path: codequal-gitlab-codequality.json
```

**What you get**:
- 📊 Code Quality metrics in CI/CD pipeline
- 📈 Quality degradation/improvement tracking
- 🚫 Optional quality gates (block merge on critical issues)
- 📋 Standardized issue format for any CI tool

**Features**:
- All 102 issues in Code Climate format
- Severity mapping: Critical→Blocker, High→Critical, Medium→Major, Low→Minor
- File paths, line numbers, and fix suggestions included
- Automatic issue tracking across commits (fingerprints)

> 🎯 **Perfect for**: CI/CD automation, quality gates, multi-platform teams

---

## 🔗 Additional Files

📦 **Manifest file** (for AI assistants with lazy loading): [all-issues-manifest.json](https://ftjhmbbcuqjqmmbaymqb.supabase.co/storage/v1/object/public/v9-attachments/spring-petclinic-pr950-1768442063325/all-issues-manifest.json)
- Contains: All 102 auto-fixable issues with fix patterns
- **Lazy loading**: Critical issues embedded (instant), high/medium/low lazy loaded in background
- **Use with**: AI assistants (Cursor Chat, GitHub Copilot) if LSP doesn't work in your IDE
- **Difference from LSP**: Manifest uses lazy loading by severity; LSP has all fixes in one file

> ⚠️ **Important**: Critical and high-severity auto-fixes require manual code review before applying. Auto-generated fixes are suggestions that should be validated by a developer to ensure they don't introduce regressions or break business logic.


---

*Generated by CodeQual V9 - Grouped Report Format (Bug #34 Lazy Loading)*  
*2026-01-15T01:54:47.835Z*
