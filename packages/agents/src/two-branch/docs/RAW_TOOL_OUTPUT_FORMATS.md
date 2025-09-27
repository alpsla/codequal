# Raw Tool Output Formats Documentation

## Overview
This document captures the raw output formats from each static analysis tool when run WITHOUT any filtering. This is critical for implementing intelligent parsing that captures all issues without loss.

## PMD Output Format
**Format:** Plain text with tab-separated values
```
./path/to/file.java:lineNumber:\tRuleName:\tRule message.
```

**Example:**
```
./clients/src/test/java/org/apache/kafka/clients/consumer/RoundRobinAssignorTest.java:197:	JUnit5TestShouldBePackagePrivate:	JUnit 5 tests should be package-private.
./clients/src/test/java/org/apache/kafka/clients/consumer/RoundRobinAssignorTest.java:197:	JUnitTestContainsTooManyAsserts:	Unit tests should not contain more than 1 assert(s).
```

**Parsing Strategy:**
- Split by tabs to extract: file, line number, rule name, message
- No grep filtering needed - parse all lines that match the pattern

## SpotBugs Output Format
**Format:** Text UI output (when using -textui flag)
**Note:** SpotBugs expects compiled bytecode (.class files) or JAR files, not source .java files
```
Exception in thread "main" java.io.IOException: No files to analyze could be opened
```

**Fix Required:**
- SpotBugs needs to analyze compiled code, not source
- Command should be: `spotbugs -textui -effort:max -low ./build/classes` or similar
- Or analyze JAR files: `spotbugs -textui -effort:max -low ./build/libs/*.jar`

## Checkstyle Output Format
**Format:** Plain text with file path and line/column
```
[ERROR] /path/to/file.java:line:column: Error message [CheckName]
[WARN] /path/to/file.java:line:column: Warning message [CheckName]
```

**Example (expected):**
```
[ERROR] /workspace/src/main/java/Example.java:10:5: Missing Javadoc comment [JavadocMethod]
[WARN] /workspace/src/main/java/Example.java:15:9: Line is longer than 100 characters [LineLength]
```

**Parsing Strategy:**
- Parse lines starting with [ERROR] or [WARN]
- Extract severity, file path, line, column, message, and check name

## Semgrep Output Format
**Format:** JSON or text output (configurable)
```
path/to/file.java
  ruleid: Message about the issue
  line:column
```

**Example (expected):**
```
src/main/java/SecurityExample.java
  java.security.audit.crypto.weak-hash
  15:8 MD5 is a weak hash function
```

**Parsing Strategy:**
- Parse file paths followed by rule violations
- Extract file, rule ID, location, and message

## Dependency-Check Output Format
**Format:** XML/JSON/HTML report of vulnerable dependencies
```
dependency-name: version
  CVE-ID: Description
  Severity: HIGH/MEDIUM/LOW
```

**Parsing Strategy:**
- Parse vulnerability entries
- Extract dependency, CVE, severity, and description

## Key Findings

1. **Output Filtering Problem:** Our previous grep filters were removing valid issues
   - PMD: Works well with raw output
   - SpotBugs: Needs compiled code, not source files
   - Checkstyle: Should work with raw output
   - Semgrep: Should work with raw output

2. **Zero Issues Root Cause:**
   - Over-aggressive grep filtering in tool commands
   - SpotBugs trying to analyze source files instead of bytecode
   - Some tools may need specific file lists or patterns

3. **Solution Approach:**
   - Remove ALL grep filters from tool commands
   - Capture complete raw output
   - Parse output in V9ToolOrchestrator using format-specific parsers
   - Handle tool-specific requirements (e.g., SpotBugs needs compiled code)

## Implementation Plan

1. **Fix SpotBugs Command:**
   ```typescript
   'spotbugs': `cd /workspace/repo && find . -name "*.jar" -o -name "*.class" | xargs spotbugs -textui -effort:max -low -maxHeap 2048 2>&1`
   ```

2. **Remove All Filters:**
   - ✅ Already completed in kubernetes-repository-manager.ts

3. **Implement Smart Parsing:**
   - Create parser for each tool's output format
   - Extract all issues without filtering
   - Validate parsed data before processing

## Testing Status
- PMD: ✅ Raw output captured, format documented
- SpotBugs: ❌ Needs fix for bytecode analysis
- Checkstyle: 🔄 In progress
- Semgrep: 🔄 In progress
- Dependency-Check: 📅 Pending