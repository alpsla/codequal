# Comprehensive Tool Validation Guide

**Purpose**: Create local PRs with intentional violations to test V9 auto-fix functionality across ALL tools and languages.

**Strategy**: Clone any repo → Create local branch → Add violations → Test V9 analysis → Verify auto-fix

---

## 📋 File Naming Convention

**IMPORTANT**: Avoid "test" in filename to prevent filtering!

**✅ GOOD Names**:
- `validation-issues.ts`
- `quality-check-sample.java`
- `autofix-verification.py`
- `code-review-examples.ts`

**❌ BAD Names** (will be filtered):
- `test-autofix-issues.ts`
- `test.ts`
- `anything.test.ts`
- Files in `/test/`, `/__tests__/`, `/spec/` directories

---

## 🔧 TypeScript/JavaScript Tools

### 1. ESLint Violations

**File**: `validation-issues.ts` or add to `src/App.tsx`

```typescript
// ESLint violations for auto-fix testing

// 1. no-unused-vars
const unusedVariable = 123;
let anotherUnused = "test";

// 2. no-debugger
debugger;

// 3. no-var (prefer const/let)
var oldStyleVariable = "should use const or let";

// 4. prefer-const
let shouldBeConst = "never reassigned";

// 5. no-console
console.log("Debug statement");

// 6. eqeqeq (use === instead of ==)
if (x == 5) {
  console.log("Use === instead");
}

// 7. no-else-return
function test(x) {
  if (x > 5) {
    return true;
  } else {
    return false;  // Unnecessary else
  }
}

// 8. prefer-template
const message = "Hello " + name + "!";  // Use template literal

// 9. prefer-arrow-callback
setTimeout(function() {
  console.log("Use arrow function");
}, 1000);

// 10. no-multiple-empty-lines


const afterEmptyLines = true;
```

**Expected**: ~10 ESLint issues, all auto-fixable

---

### 2. TypeScript Violations

**File**: `validation-issues.ts`

```typescript
// TypeScript violations for auto-fix testing

// 1. Implicit any
function noTypeAnnotations(param) {  // TS7006
  return param;
}

// 2. Unused parameter
function unusedParam(x: number, y: number): number {  // @typescript-eslint/no-unused-vars
  return x;
}

// 3. Non-null assertion
const maybeValue: string | null = getValue();
const value = maybeValue!;  // TS2322 - avoid non-null assertion

// 4. Type assertion instead of type annotation
const count = <number>getCount();  // Prefer 'as' syntax

// 5. Missing return type
function missingReturnType(x: number) {  // Should specify return type
  return x * 2;
}

// 6. Any type usage
let anyValue: any = 123;  // Avoid any type

// 7. Duplicate imports (if applicable)
import { Component } from 'react';
import { Component as Comp } from 'react';  // Duplicate
```

**Expected**: ~7 TypeScript issues, some auto-fixable

---

### 3. npm-audit Vulnerabilities

**File**: `package.json`

```json
{
  "name": "validation-project",
  "version": "1.0.0",
  "dependencies": {
    "lodash": "4.17.15",
    "axios": "0.18.0",
    "minimist": "0.0.8",
    "moment": "2.19.3",
    "express": "4.16.0"
  }
}
```

**Run**: `npm install` to create vulnerable `package-lock.json`

**Expected**: Multiple high/critical vulnerabilities from outdated packages

---

### 4. Semgrep Violations (Security)

**File**: `validation-issues.ts` or `validation-issues.js`

```typescript
// Semgrep security violations

// 1. SQL Injection
function getUserData(userId: string) {
  const query = "SELECT * FROM users WHERE id = " + userId;  // SQL injection
  db.query(query);
}

// 2. Command Injection
function executeCommand(userInput: string) {
  exec("ls " + userInput);  // Command injection
}

// 3. Hardcoded Secret
const API_KEY = "sk-1234567890abcdef";  // Hardcoded secret

// 4. Insecure Random
const token = Math.random().toString(36);  // Insecure random

// 5. Eval usage
function processCode(code: string) {
  eval(code);  // Dangerous eval
}

// 6. XSS vulnerability
function renderHTML(userInput: string) {
  document.innerHTML = userInput;  // XSS risk
}
```

**Expected**: ~6 Semgrep security issues

---

## ☕ Java Tools

### 1. PMD Violations

**File**: `ValidationIssues.java`

```java
public class ValidationIssues {

    // 1. UnusedPrivateField
    private int unusedField = 0;

    // 2. LocalVariableCouldBeFinal
    public void method1() {
        int x = 5;  // Could be final
        System.out.println(x);
    }

    // 3. AvoidUsingShortType
    public short calculate(short value) {
        return value;
    }

    // 4. UselessParentheses
    public boolean check() {
        return (true);
    }

    // 5. SimplifyBooleanReturns
    public boolean test(int x) {
        if (x > 5) {
            return true;
        } else {
            return false;
        }
    }

    // 6. CollapsibleIfStatements
    public void nested(int x, int y) {
        if (x > 0) {
            if (y > 0) {
                System.out.println("Both positive");
            }
        }
    }

    // 7. EmptyCatchBlock
    public void tryCatch() {
        try {
            riskyOperation();
        } catch (Exception e) {
            // Empty catch block
        }
    }

    // 8. SystemPrintln
    public void debug() {
        System.out.println("Debug message");
    }
}
```

**Expected**: ~8 PMD issues, many auto-fixable

---

### 2. Checkstyle Violations

**File**: `ValidationIssues.java`

```java
// Checkstyle violations

public class ValidationIssues
{  // Opening brace should be on same line

    private int x;  // Missing Javadoc comment

    public void method1( ) {  // Extra whitespace
        int  y=5;  // Missing whitespace around =
        if(y>0){  // Missing whitespace
            System.out.println( "test" );  // Extra whitespace
        }
    }

    public void method2()
    {  // Opening brace on new line
        // Magic number
        int size = 100;
    }

    // Line length violation (make this line extremely long to exceed 120 characters limit which is a common checkstyle rule)
    public void veryLongMethodName() { String veryLongVariableName = "This is a very long string that exceeds the maximum line length"; }
}
```

**Expected**: ~10 Checkstyle issues, many auto-fixable

---

### 3. SpotBugs Violations

**File**: `ValidationIssues.java`

```java
import java.util.*;

public class ValidationIssues {

    // 1. Inefficient use of keySet
    public void iterateMap(Map<String, String> map) {
        for (String key : map.keySet()) {
            String value = map.get(key);  // Use entrySet instead
        }
    }

    // 2. Equals method always returns false
    @Override
    public boolean equals(Object obj) {
        return false;
    }

    // 3. Comparison of String objects using ==
    public boolean compareStrings(String s1, String s2) {
        return s1 == s2;  // Use .equals()
    }

    // 4. Null pointer dereference
    public void nullCheck(String value) {
        if (value == null) {
            int length = value.length();  // Null pointer
        }
    }

    // 5. Return value ignored
    public void fileCheck(String filename) {
        new File(filename).mkdir();  // Return value ignored
    }

    // 6. Synchronization on boxed primitive
    private Integer lock = 1;
    public void sync() {
        synchronized(lock) {  // Don't sync on boxed primitive
            // Do something
        }
    }
}
```

**Expected**: ~6 SpotBugs issues

---

### 4. Dependency-Check Vulnerabilities

**File**: `pom.xml`

```xml
<dependencies>
    <!-- Log4j vulnerability (Log4Shell) -->
    <dependency>
        <groupId>org.apache.logging.log4j</groupId>
        <artifactId>log4j-core</artifactId>
        <version>2.14.1</version>
    </dependency>

    <!-- Spring Framework vulnerability -->
    <dependency>
        <groupId>org.springframework</groupId>
        <artifactId>spring-core</artifactId>
        <version>4.3.0.RELEASE</version>
    </dependency>

    <!-- Jackson vulnerability -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.9.0</version>
    </dependency>
</dependencies>
```

**Expected**: Multiple high/critical CVEs

---

## 🐍 Python Tools

### 1. Pylint Violations

**File**: `validation_issues.py`

```python
# Pylint violations for auto-fix testing

# 1. Unused import
import sys
import os

# 2. Unused variable
def unused_var():
    x = 5
    y = 10
    return x

# 3. Missing docstring
def no_docstring(param1, param2):
    return param1 + param2

# 4. Line too long
very_long_variable_name = "This is a very long string that exceeds the maximum line length of 100 characters which is a common Pylint rule"

# 5. Wrong import order (should be stdlib, third-party, local)
from mymodule import something
import json

# 6. Constant name should be UPPER_CASE
my_constant = 3.14159

# 7. Redefining built-in
def len(x):
    return 0

# 8. Unnecessary pass
def empty_function():
    pass
    pass  # Duplicate pass

# 9. Simplifiable if
def check(value):
    if value == True:  # Should be: if value:
        return True

# 10. Missing final newline
print("End of file")
```

**Expected**: ~10 Pylint issues, many auto-fixable

---

### 2. Bandit Violations (Security)

**File**: `validation_issues.py`

```python
# Bandit security violations

import pickle
import subprocess
import yaml

# 1. Use of pickle (B301)
def load_data(filename):
    with open(filename, 'rb') as f:
        data = pickle.load(f)  # Insecure deserialization
    return data

# 2. Use of exec (B102)
def execute_code(code):
    exec(code)  # Dangerous code execution

# 3. Hardcoded password (B105)
PASSWORD = "admin123"
API_KEY = "sk-1234567890"

# 4. Shell injection (B602)
def run_command(user_input):
    subprocess.call("ls " + user_input, shell=True)  # Command injection

# 5. Insecure YAML load (B506)
def load_config(filename):
    with open(filename) as f:
        config = yaml.load(f)  # Use yaml.safe_load
    return config

# 6. Try-except-pass (B110)
try:
    risky_operation()
except Exception:
    pass  # Swallowing exceptions

# 7. Weak cryptographic key (B303)
from Crypto.Cipher import AES
key = b'weakkey123'  # Weak key
```

**Expected**: ~7 Bandit security issues

---

## 🚀 Quick Test Script

Create this script to test all languages:

**File**: `scripts/testing/oracle/oracle-run-comprehensive-validation.sh`

```bash
#!/bin/bash
# Comprehensive tool validation test

set -e

export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"
export ORACLE_USER="opc"

echo "🎯 Comprehensive Tool Validation Test"
echo "======================================"
echo ""

# Test scenarios
REPOS=(
  "facebook/react:TypeScript/JavaScript"
  "spring-projects/spring-petclinic:Java"
  "pallets/flask:Python"
)

for repo in "${REPOS[@]}"; do
  IFS=':' read -r repo_url language <<< "$repo"

  echo "📦 Testing: $repo_url ($language)"
  echo "---"

  # Run V9 test
  ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
    "cd ~/codequal/packages/agents && \
     npx ts-node tests/integration/test-v9-lite-e2e.ts"

  # Download report
  LATEST=$(ssh -i "$SSH_KEY" $ORACLE_USER@$ORACLE_IP \
    'ls -t ~/codequal/packages/agents/tests/integration/test-outputs/*.md | head -1')

  scp -i "$SSH_KEY" "$ORACLE_USER@$ORACLE_IP:$LATEST" test-outputs/

  echo "✅ Test complete for $language"
  echo ""
done

echo "✅ All validation tests complete!"
```

---

## 📊 Expected Results

For each language, you should see:

### TypeScript/JavaScript
- **ESLint**: ~10 issues (all auto-fixable)
- **TypeScript**: ~7 issues (some auto-fixable)
- **npm-audit**: 5-10 vulnerabilities
- **Semgrep**: ~6 security issues

### Java
- **PMD**: ~8 issues (many auto-fixable)
- **Checkstyle**: ~10 issues (many auto-fixable)
- **SpotBugs**: ~6 issues
- **Dependency-Check**: 3-5 CVEs

### Python
- **Pylint**: ~10 issues (many auto-fixable)
- **Bandit**: ~7 security issues
- **Safety**: Dependency vulnerabilities

---

## 🔄 Testing Workflow

```bash
# 1. Clone repo
git clone https://github.com/facebook/react.git /tmp/react-validation
cd /tmp/react-validation

# 2. Create validation branch
git checkout -b validation-issues

# 3. Add violation file (avoid "test" in name!)
cat > src/validation-issues.ts << 'EOF'
[paste violations from above]
EOF

# 4. Add vulnerable dependencies
cat > package.json << 'EOF'
[paste vulnerable package.json]
EOF

# 5. Commit
git add -A
git commit -m "feat: Add validation issues for auto-fix testing"

# 6. Run V9 analysis
npx ts-node tests/integration/test-v9-lite-e2e.ts

# 7. Verify in report:
# - All tools detect issues
# - Auto-fix suggestions generated
# - LSP/SARIF files created
```

---

## ✅ Validation Checklist

After running tests, verify:

- [ ] **ESLint**: Detects violations, generates fixes
- [ ] **TypeScript**: Detects type issues
- [ ] **npm-audit**: Finds vulnerabilities
- [ ] **Semgrep**: Detects security issues
- [ ] **PMD**: Finds Java code quality issues
- [ ] **Checkstyle**: Detects style violations
- [ ] **SpotBugs**: Finds bugs
- [ ] **Dependency-Check**: Identifies CVEs
- [ ] **Pylint**: Detects Python issues
- [ ] **Bandit**: Finds Python security issues
- [ ] **Report**: Shows "Apply ALL X fixes with 1 click!"
- [ ] **LSP/SARIF**: Files generated and downloadable

---

**Last Updated**: November 14, 2025
**Strategy**: Local PR testing with intentional violations
**Goal**: Verify V9 auto-fix across ALL tools and languages
