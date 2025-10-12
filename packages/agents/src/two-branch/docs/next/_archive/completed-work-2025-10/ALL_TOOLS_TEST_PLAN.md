# All Tools Test Plan - Guaranteed Issues for Each Tool

**Date:** October 3, 2025
**Goal:** Test ALL 5 Java tools and find at least 1 issue per tool
**Status:** 🚧 IN PROGRESS

---

## Requirement

> "I want to test all tools and have at least 1 PR with issue/s found per each tool"

We need to validate that EVERY tool works correctly by finding at least 1 issue:

1. ✅ **PMD** - Code quality analysis
2. ⚠️ **Semgrep** - Security analysis
3. ⚠️ **Checkstyle** - Code style checking
4. ⚠️ **Dependency-Check** - CVE vulnerability scanning
5. ⚠️ **SpotBugs** - Bytecode bug detection

---

## Current Test Results (Apache Kafka PR #17620)

| Tool | Issues Found | Status | Notes |
|------|--------------|--------|-------|
| PMD | 2,062 ✅ | Working | HIGH/MEDIUM code quality issues |
| Semgrep | 0 ❌ | No issues | No security vulnerabilities in Kafka trunk |
| Checkstyle | 0 ❌ | Skipped | Smart logic skips when 294 critical/high found |
| Dependency-Check | 0 ⚠️ | Error | Database connection issue |
| SpotBugs | 0 ⚠️ | Not run | Disabled by default (requires compilation) |

**Problem:** Only PMD finds issues. We need repos with guaranteed violations for all tools.

---

## Strategy: Test Multiple Repositories

### Repository 1: WebGoat (OWASP) ✅ RECOMMENDED

**URL:** https://github.com/WebGoat/WebGoat
**Purpose:** Intentionally vulnerable Java web application for security testing
**Language:** Java (Spring Boot)
**Size:** ~500 Java files

**Expected Issues:**

| Tool | Expected | Why |
|------|----------|-----|
| PMD | ✅ 50+ | Code quality issues (dead code, complexity) |
| Semgrep | ✅ 20+ | **SQL injection, XSS, path traversal, auth bypass** |
| Checkstyle | ✅ 30+ | Style violations (naming, formatting) |
| Dependency-Check | ✅ 10+ | **Log4Shell, Spring vulnerabilities, outdated libs** |
| SpotBugs | ✅ 15+ | Null pointers, resource leaks, concurrency bugs |

**Why WebGoat:**
- Designed for security testing (guarantees Semgrep issues)
- Uses vulnerable dependencies (guarantees Dependency-Check CVEs)
- Active development (may have style/quality issues)
- Well-documented (OWASP project)

**Test Command:**
```bash
# Create test file
cat > src/two-branch/tests/__tests__/test-webgoat-all-tools.ts << 'EOF'
#!/usr/bin/env ts-node

/**
 * WebGoat All Tools Test - Validates ALL 5 Java tools find issues
 */

import { JavaToolOrchestrator } from '../../tools/java/java-tool-orchestrator';
import { execSync } from 'child_process';
import * as fs from 'fs';

async function testWebGoat() {
  const repoUrl = 'https://github.com/WebGoat/WebGoat';
  const repoPath = '/tmp/webgoat-repo';

  // Clone WebGoat if not exists
  if (!fs.existsSync(repoPath)) {
    console.log('📥 Cloning WebGoat...');
    execSync(`git clone ${repoUrl} ${repoPath}`, { stdio: 'inherit' });
  }

  console.log('🔍 Running ALL 5 Java tools on WebGoat...\n');

  const orchestrator = new JavaToolOrchestrator();

  // Enable ALL tools (including SpotBugs)
  process.env.ENABLE_SPOTBUGS = 'true';
  process.env.ENABLE_CHECKSTYLE = 'true';

  const results = await orchestrator.runAllTools({
    repoPath,
    branch: 'main',
    language: 'java',
    mode: 'ALL_ISSUES'  // Get all issues, not just critical/high
  });

  console.log('\n═══════════════════════════════════════');
  console.log('  WEBGOAT TEST RESULTS - ALL TOOLS');
  console.log('═══════════════════════════════════════\n');

  const validation = {
    pmd: results.pmd.issues.length > 0,
    semgrep: results.semgrep.issues.length > 0,
    checkstyle: results.checkstyle.issues.length > 0,
    dependencyCheck: results.dependencyCheck.issues.length > 0,
    spotbugs: results.spotbugs.issues.length > 0
  };

  console.log('PMD:', results.pmd.issues.length, 'issues', validation.pmd ? '✅' : '❌');
  console.log('Semgrep:', results.semgrep.issues.length, 'issues', validation.semgrep ? '✅' : '❌');
  console.log('Checkstyle:', results.checkstyle.issues.length, 'issues', validation.checkstyle ? '✅' : '❌');
  console.log('Dependency-Check:', results.dependencyCheck.issues.length, 'issues', validation.dependencyCheck ? '✅' : '❌');
  console.log('SpotBugs:', results.spotbugs.issues.length, 'issues', validation.spotbugs ? '✅' : '❌');

  const allPassed = Object.values(validation).every(v => v === true);

  console.log('\n═══════════════════════════════════════');
  console.log(allPassed ? '✅ ALL TOOLS VALIDATED' : '❌ SOME TOOLS FAILED');
  console.log('═══════════════════════════════════════\n');

  process.exit(allPassed ? 0 : 1);
}

testWebGoat();
EOF

chmod +x src/two-branch/tests/__tests__/test-webgoat-all-tools.ts
npx ts-node src/two-branch/tests/__tests__/test-webgoat-all-tools.ts
```

---

### Repository 2: Apache Struts (Known CVEs) ✅ GOOD FALLBACK

**URL:** https://github.com/apache/struts
**Purpose:** Web framework with known vulnerabilities (CVE-2017-5638)
**Expected CVEs:** CVE-2017-5638 (RCE), CVE-2017-9791, CVE-2017-9793

**Expected Issues:**

| Tool | Expected | Why |
|------|----------|-----|
| PMD | ✅ 100+ | Large codebase, code quality issues |
| Semgrep | ✅ 10+ | Known security patterns |
| Checkstyle | ✅ 50+ | Style inconsistencies |
| Dependency-Check | ✅ **5+ CVEs** | **Multiple known CVEs** |
| SpotBugs | ✅ 20+ | Concurrency, null pointers |

**Why Struts:**
- Known vulnerable dependencies (guarantees Dependency-Check)
- Mature codebase (likely has PMD/Checkstyle issues)
- Well-tested (good for validation)

---

### Repository 3: Custom Test Files in Kafka ✅ MINIMAL

Create test files directly in Apache Kafka repo with guaranteed violations:

**File 1: TestStyleViolations.java** (for Checkstyle)
```java
// clients/src/main/java/org/apache/kafka/clients/TestStyleViolations.java
package org.apache.kafka.clients;

public class TestStyleViolations {
    // Checkstyle: Method name should start with lowercase
    public void MethodNameShouldBeLowercase() { }

    // Checkstyle: Line too long (>120 characters)
    private String thisIsAReallyLongVariableNameThatExceedsTheMaximumLineLengthAllowedByCheckstyleConfigurationAndWillTriggerAViolation = "test";

    // PMD: Unused private field
    private int unusedField;

    // PMD: Empty method
    public void emptyMethod() { }
}
```

**File 2: TestSecurityIssues.java** (for Semgrep)
```java
// clients/src/main/java/org/apache/kafka/clients/TestSecurityIssues.java
package org.apache.kafka.clients;

import java.sql.*;

public class TestSecurityIssues {
    // Semgrep: SQL injection vulnerability
    public void sqlInjection(String userInput) throws SQLException {
        Connection conn = DriverManager.getConnection("jdbc:h2:mem:test");
        String query = "SELECT * FROM users WHERE id = " + userInput;  // ✅ SQL injection
        Statement stmt = conn.createStatement();
        stmt.execute(query);
    }

    // Semgrep: Path traversal
    public void pathTraversal(String userInput) {
        String filePath = "/var/data/" + userInput;  // ✅ Path traversal
        // Read file...
    }
}
```

**File 3: TestBugPatterns.java** (for SpotBugs)
```java
// clients/src/main/java/org/apache/kafka/clients/TestBugPatterns.java
package org.apache.kafka.clients;

public class TestBugPatterns {
    // SpotBugs: Null pointer dereference
    public String nullPointerDereference() {
        String value = null;
        return value.toString();  // ✅ Guaranteed NPE
    }

    // SpotBugs: Resource leak
    public void resourceLeak() throws Exception {
        java.io.FileInputStream fis = new java.io.FileInputStream("/tmp/test.txt");
        // No close() - resource leak
    }
}
```

**File 4: pom.xml with vulnerable dependency** (for Dependency-Check)
```xml
<!-- Add to Apache Kafka's pom.xml (temporary for testing) -->
<dependency>
    <groupId>log4j</groupId>
    <artifactId>log4j</artifactId>
    <version>1.2.17</version>  <!-- ✅ CVE-2021-44228 Log4Shell -->
</dependency>
```

**Test Command:**
```bash
# Create test files
./create-test-files.sh

# Run all tools
npm run test:v9:full

# Validate results
npx ts-node src/two-branch/tests/__tests__/validate-all-tools.ts
```

---

## Recommended Approach: Hybrid Strategy

### Phase 1: Quick Validation with WebGoat (1 hour)

1. Clone WebGoat repository
2. Run all 5 tools
3. Validate each tool finds at least 1 issue
4. Document results

**Expected Outcome:**
- ✅ PMD: 50+ issues
- ✅ Semgrep: 20+ security issues
- ✅ Checkstyle: 30+ style violations
- ✅ Dependency-Check: 10+ CVEs
- ✅ SpotBugs: 15+ bug patterns

### Phase 2: Create Minimal Test Files (30 mins)

1. Add 3 test files to Apache Kafka
2. Commit to test branch
3. Run V9 analysis
4. Validate specific violations

**Expected Outcome:**
- ✅ Checkstyle: Method name violation
- ✅ Semgrep: SQL injection detected
- ✅ SpotBugs: Null pointer dereference

### Phase 3: Test Apache Struts (Optional - 30 mins)

1. Clone Apache Struts
2. Run Dependency-Check only
3. Validate CVE detection
4. Document known vulnerabilities found

**Expected Outcome:**
- ✅ Dependency-Check: CVE-2017-5638, CVE-2017-9791

---

## Implementation Scripts

### Script 1: WebGoat Test Runner

```bash
#!/bin/bash
# scripts/test-webgoat-all-tools.sh

echo "🚀 Testing ALL 5 Tools with WebGoat"
echo ""

# Clone WebGoat
if [ ! -d "/tmp/webgoat-repo" ]; then
  echo "📥 Cloning WebGoat..."
  git clone https://github.com/WebGoat/WebGoat /tmp/webgoat-repo
fi

# Enable all tools
export ENABLE_SPOTBUGS=true
export ENABLE_CHECKSTYLE=true
export NODE_ENV=test

# Run test
echo "🔍 Running all tools..."
npx ts-node src/two-branch/tests/__tests__/test-webgoat-all-tools.ts

echo ""
echo "✅ WebGoat test complete!"
```

### Script 2: Create Test Files in Kafka

```bash
#!/bin/bash
# scripts/create-kafka-test-files.sh

echo "📝 Creating test files in Apache Kafka..."

# Navigate to Kafka repo
cd /tmp/kafka-repo

# Create test branch
git checkout -b test-all-tools-validation

# Create TestStyleViolations.java
cat > clients/src/main/java/org/apache/kafka/clients/TestStyleViolations.java << 'EOF'
package org.apache.kafka.clients;

public class TestStyleViolations {
    public void MethodNameShouldBeLowercase() { }
    private String thisIsAReallyLongVariableNameThatExceedsTheMaximumLineLengthAllowedByCheckstyleConfigurationAndWillTriggerAViolation = "test";
    private int unusedField;
    public void emptyMethod() { }
}
EOF

# Create TestSecurityIssues.java
cat > clients/src/main/java/org/apache/kafka/clients/TestSecurityIssues.java << 'EOF'
package org.apache.kafka.clients;

import java.sql.*;

public class TestSecurityIssues {
    public void sqlInjection(String userInput) throws SQLException {
        Connection conn = DriverManager.getConnection("jdbc:h2:mem:test");
        String query = "SELECT * FROM users WHERE id = " + userInput;
        Statement stmt = conn.createStatement();
        stmt.execute(query);
    }
}
EOF

# Create TestBugPatterns.java
cat > clients/src/main/java/org/apache/kafka/clients/TestBugPatterns.java << 'EOF'
package org.apache.kafka.clients;

public class TestBugPatterns {
    public String nullPointerDereference() {
        String value = null;
        return value.toString();
    }
}
EOF

# Commit changes
git add clients/src/main/java/org/apache/kafka/clients/Test*.java
git commit -m "test: Add test files for all-tools validation"

echo "✅ Test files created and committed!"
echo ""
echo "📍 Branch: test-all-tools-validation"
echo "📁 Files:"
echo "   - TestStyleViolations.java (Checkstyle + PMD)"
echo "   - TestSecurityIssues.java (Semgrep)"
echo "   - TestBugPatterns.java (SpotBugs)"
```

### Script 3: Validation Report Generator

```typescript
// scripts/validate-all-tools.ts

interface ToolValidation {
  tool: string;
  expected: number;
  actual: number;
  passed: boolean;
  sampleIssues: string[];
}

function validateResults(results: any): ToolValidation[] {
  return [
    {
      tool: 'PMD',
      expected: 1,
      actual: results.pmd?.issues?.length || 0,
      passed: (results.pmd?.issues?.length || 0) > 0,
      sampleIssues: results.pmd?.issues?.slice(0, 3).map((i: any) => i.rule) || []
    },
    {
      tool: 'Semgrep',
      expected: 1,
      actual: results.semgrep?.issues?.length || 0,
      passed: (results.semgrep?.issues?.length || 0) > 0,
      sampleIssues: results.semgrep?.issues?.slice(0, 3).map((i: any) => i.rule) || []
    },
    // ... etc for all 5 tools
  ];
}

// Generate markdown report
function generateReport(validations: ToolValidation[]): string {
  const allPassed = validations.every(v => v.passed);

  return `
# All Tools Validation Report

**Date:** ${new Date().toISOString()}
**Status:** ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}

## Results

| Tool | Expected | Actual | Status | Sample Issues |
|------|----------|--------|--------|---------------|
${validations.map(v =>
  `| ${v.tool} | ${v.expected}+ | ${v.actual} | ${v.passed ? '✅' : '❌'} | ${v.sampleIssues.join(', ')} |`
).join('\n')}

## Conclusion

${allPassed
  ? '✅ All 5 tools validated successfully! Each tool found at least 1 issue.'
  : '❌ Some tools did not find issues. Review configuration and test cases.'}
`;
}
```

---

## Timeline

| Phase | Task | Effort | Status |
|-------|------|--------|--------|
| 1 | Test WebGoat repository | 1 hour | 🚧 Pending |
| 2 | Create test files in Kafka | 30 mins | 🚧 Pending |
| 3 | Run all tools on both repos | 30 mins | 🚧 Pending |
| 4 | Generate validation report | 30 mins | 🚧 Pending |
| **Total** | | **2.5 hours** | |

---

## Expected Final Results

**After completing all phases:**

| Tool | Kafka (Test Files) | WebGoat | Apache Struts | Total Validated |
|------|-------------------|---------|---------------|-----------------|
| PMD | ✅ 3 issues | ✅ 50+ issues | ✅ 100+ issues | ✅ Yes |
| Semgrep | ✅ 2 issues | ✅ 20+ issues | ✅ 10+ issues | ✅ Yes |
| Checkstyle | ✅ 4 issues | ✅ 30+ issues | ✅ 50+ issues | ✅ Yes |
| Dependency-Check | ⚠️ 0 (fix DB) | ✅ 10+ CVEs | ✅ 5+ CVEs | ✅ Yes |
| SpotBugs | ✅ 2 issues | ✅ 15+ issues | ✅ 20+ issues | ✅ Yes |

---

## Next Steps

1. 🚧 Run WebGoat test (1 hour)
   ```bash
   ./scripts/test-webgoat-all-tools.sh
   ```

2. 🚧 Create Kafka test files (30 mins)
   ```bash
   ./scripts/create-kafka-test-files.sh
   ```

3. 🚧 Fix Dependency-Check database connection
   ```bash
   # Check Oracle PostgreSQL connection
   ssh -i keys/oracle/ssh-key-2025-05-08.key ubuntu@129.213.49.128
   psql -h localhost -U depcheck_scanner -d nvd
   ```

4. 🚧 Generate validation report
   ```bash
   npx ts-node scripts/validate-all-tools.ts > ALL_TOOLS_VALIDATION_REPORT.md
   ```

---

**Status:** 🚧 Ready to Execute
**Estimated Time:** 2.5 hours
**Expected Outcome:** All 5 tools validated with at least 1 issue each
