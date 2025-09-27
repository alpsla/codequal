# Tool Output Formats and Parsing Strategies

## Overview
This document provides detailed output formats for each static analysis tool and parsing strategies to extract issues without data loss.

Last Updated: 2025-09-21

## Java Tools

### ✅ PMD
**Status:** WORKING
**Output Format:** Text format with tab-delimited fields

**Sample Output:**
```
./path/to/file.java:123:	RuleName:	Rule message describing the issue
```

**Parsing Strategy:**
```javascript
const parseIssue = (line) => {
  const match = line.match(/^(.+?):(\d+):\s+(.+?):\s+(.+)$/);
  if (match) {
    return {
      file: match[1],
      line: parseInt(match[2]),
      rule: match[3],
      message: match[4]
    };
  }
};
```

**Filter Command:** None needed - parse raw output

---

### ✅ Checkstyle
**Status:** WORKING
**Output Format:** Bracketed severity with file location and check name

**Sample Output:**
```
[WARN] /workspace/./repo/path/to/file.java:17:1: 'package' should be separated from previous line. [EmptyLineSeparator]
[ERROR] /workspace/./repo/path/to/file.java:123:45: Missing semicolon. [MissingSemicolon]
```

**Parsing Strategy:**
```javascript
const parseIssue = (line) => {
  const match = line.match(/^\[(WARN|ERROR|INFO)\]\s+(.+?):(\d+):(\d+):\s+(.+?)\s+\[(.+?)\]$/);
  if (match) {
    return {
      severity: match[1],
      file: match[2].replace('/workspace/./repo/', ''),
      line: parseInt(match[3]),
      column: parseInt(match[4]),
      message: match[5],
      checkName: match[6]
    };
  }
};
```

**Filter Command:** None needed - parse raw output

---

### ✅ Semgrep
**Status:** WORKING (may return 0 issues if code is clean)
**Output Format:** Multi-line format with rule ID and description

**Expected Format (when issues found):**
```
path/to/file.java
  ruleid: java.lang.security.audit.dangerous-exec
  Message: Dangerous command execution
  Line 123: Runtime.getRuntime().exec(userInput);
```

**Parsing Strategy:**
```javascript
// Parse multi-line blocks
const parseBlocks = (output) => {
  const issues = [];
  const lines = output.split('\n');
  let currentIssue = null;

  for (const line of lines) {
    if (!line.startsWith('  ') && line.includes('.java')) {
      currentIssue = { file: line.trim() };
    } else if (line.includes('ruleid:')) {
      if (currentIssue) currentIssue.rule = line.split('ruleid:')[1].trim();
    } else if (line.includes('Message:')) {
      if (currentIssue) currentIssue.message = line.split('Message:')[1].trim();
    } else if (line.includes('Line')) {
      const match = line.match(/Line (\d+):/);
      if (match && currentIssue) {
        currentIssue.line = parseInt(match[1]);
        issues.push(currentIssue);
        currentIssue = null;
      }
    }
  }
  return issues;
};
```

**Note:** 0 findings is valid for clean code

---

### 🔴 SpotBugs
**Status:** BROKEN - Requires compiled bytecode (.class or .jar files)
**Action:** Skip this tool or add compilation step

**Alternative Tools:**
- **Infer** - Facebook's analyzer (works on source)
- **SonarJava** - Works on source code
- **ErrorProne** - Google's bug checker (compile-time)

---

### 🔴 Dependency-Check
**Status:** NOT INSTALLED in current image
**Purpose:** CVE scanning in dependencies

**Expected Format (when working):**
```
VULNERABILITY FOUND
  File: commons-collections-3.2.1.jar
  CVE: CVE-2015-6420
  Severity: HIGH
  Description: Apache Commons Collections vulnerability
```

**Installation Required:**
```dockerfile
RUN wget https://github.com/jeremylong/DependencyCheck/releases/download/v8.4.0/dependency-check-8.4.0-release.zip \
    && unzip dependency-check-8.4.0-release.zip \
    && mv dependency-check/bin/dependency-check.sh /usr/local/bin/dependency-check \
    && chmod +x /usr/local/bin/dependency-check
```

---

## Parsing Implementation

### Generic Parser Structure
```javascript
class ToolOutputParser {
  constructor(toolName) {
    this.toolName = toolName;
    this.parsers = {
      'pmd': this.parsePMD,
      'checkstyle': this.parseCheckstyle,
      'semgrep': this.parseSemgrep,
      'spotbugs': this.parseSpotBugs,
      'dependency-check': this.parseDependencyCheck
    };
  }

  parse(output) {
    const parser = this.parsers[this.toolName];
    if (!parser) {
      console.warn(`No parser for tool: ${this.toolName}`);
      return [];
    }

    try {
      const issues = parser.call(this, output);
      console.log(`Parsed ${issues.length} issues from ${this.toolName}`);
      return issues;
    } catch (error) {
      console.error(`Error parsing ${this.toolName} output:`, error);
      return [];
    }
  }

  parsePMD(output) {
    const issues = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (!line.trim() || line.startsWith('===')) continue;

      const match = line.match(/^(.+?):(\d+):\s+(.+?):\s+(.+)$/);
      if (match) {
        issues.push({
          tool: 'pmd',
          file: match[1],
          line: parseInt(match[2]),
          rule: match[3],
          message: match[4],
          severity: this.guessSeverity(match[3], match[4])
        });
      }
    }
    return issues;
  }

  parseCheckstyle(output) {
    const issues = [];
    const lines = output.split('\n');

    for (const line of lines) {
      const match = line.match(/^\[(WARN|ERROR|INFO)\]\s+(.+?):(\d+):(\d+):\s+(.+?)\s+\[(.+?)\]$/);
      if (match) {
        issues.push({
          tool: 'checkstyle',
          severity: match[1].toLowerCase(),
          file: match[2].replace('/workspace/./repo/', '').replace('/workspace/', ''),
          line: parseInt(match[3]),
          column: parseInt(match[4]),
          message: match[5],
          rule: match[6]
        });
      }
    }
    return issues;
  }

  parseSemgrep(output) {
    const issues = [];
    const lines = output.split('\n');
    let currentIssue = null;

    for (const line of lines) {
      // File path (not indented)
      if (!line.startsWith(' ') && line.includes('.')) {
        if (currentIssue && currentIssue.line) {
          issues.push(currentIssue);
        }
        currentIssue = {
          tool: 'semgrep',
          file: line.trim()
        };
      }
      // Rule ID (indented)
      else if (line.includes('ruleid:')) {
        if (currentIssue) {
          currentIssue.rule = line.split('ruleid:')[1].trim();
        }
      }
      // Message (indented)
      else if (line.includes('Message:')) {
        if (currentIssue) {
          currentIssue.message = line.split('Message:')[1].trim();
        }
      }
      // Line number and code
      else if (line.match(/^\s+Line\s+(\d+):/)) {
        const match = line.match(/Line\s+(\d+):\s*(.*)$/);
        if (match && currentIssue) {
          currentIssue.line = parseInt(match[1]);
          currentIssue.code = match[2];
          currentIssue.severity = this.guessSeverityFromRule(currentIssue.rule);
        }
      }
    }

    // Add last issue if exists
    if (currentIssue && currentIssue.line) {
      issues.push(currentIssue);
    }

    return issues;
  }

  parseSpotBugs(output) {
    // SpotBugs needs compiled bytecode - skip for now
    console.warn('SpotBugs requires compiled bytecode - skipping');
    return [];
  }

  parseDependencyCheck(output) {
    const issues = [];
    // Parser for when Dependency-Check is properly installed
    const vulnerabilityPattern = /CVE-\d{4}-\d+/g;
    const matches = output.match(vulnerabilityPattern);

    if (matches) {
      matches.forEach(cve => {
        issues.push({
          tool: 'dependency-check',
          type: 'vulnerability',
          cve: cve,
          severity: 'high', // Would need proper parsing
          message: `Vulnerability ${cve} found in dependencies`
        });
      });
    }

    return issues;
  }

  guessSeverity(rule, message) {
    const critical = ['security', 'injection', 'xss', 'sql'];
    const high = ['nullpointer', 'resource', 'memory', 'thread'];
    const medium = ['complexity', 'duplicate', 'unused'];

    const combined = `${rule} ${message}`.toLowerCase();

    if (critical.some(keyword => combined.includes(keyword))) return 'critical';
    if (high.some(keyword => combined.includes(keyword))) return 'high';
    if (medium.some(keyword => combined.includes(keyword))) return 'medium';
    return 'low';
  }

  guessSeverityFromRule(rule) {
    if (!rule) return 'medium';

    if (rule.includes('security') || rule.includes('injection')) return 'critical';
    if (rule.includes('audit') || rule.includes('dangerous')) return 'high';
    if (rule.includes('performance') || rule.includes('best-practice')) return 'medium';
    return 'low';
  }
}

module.exports = ToolOutputParser;
```

## Zero Issues Handling

When a tool returns 0 issues, it can mean:

1. **Clean Code:** No issues found (valid result)
2. **Tool Error:** Tool failed to run properly
3. **Configuration Issue:** Tool misconfigured

### Detection Strategy:
```javascript
const validateToolOutput = (output, toolName) => {
  // Check for error indicators
  const errorPatterns = [
    /command not found/i,
    /no such file/i,
    /permission denied/i,
    /error:/i,
    /exception/i
  ];

  for (const pattern of errorPatterns) {
    if (pattern.test(output)) {
      return { valid: false, reason: 'Tool execution error' };
    }
  }

  // Check for successful execution markers
  const successMarkers = {
    'pmd': /Processing started/i,
    'checkstyle': /Starting audit/i,
    'semgrep': /Running \d+ rules/i,
    'spotbugs': /Analyzing/i
  };

  const marker = successMarkers[toolName];
  if (marker && !marker.test(output)) {
    return { valid: false, reason: 'Tool may not have run' };
  }

  return { valid: true, reason: 'Clean code - no issues found' };
};
```

## Summary

### Working Tools with Confirmed Formats:
- **PMD:** Tab-delimited format `file:line:\tRule:\tMessage`
- **Checkstyle:** Bracketed format `[SEVERITY] file:line:col: Message [Check]`
- **Semgrep:** Multi-line blocks with file, rule, message, line

### Tools Needing Work:
- **SpotBugs:** Skip (needs bytecode) or add compilation
- **Dependency-Check:** Not installed - needs to be added to image

### Key Improvements:
1. Remove all grep filters - parse raw output
2. Handle 0 issues as potentially valid
3. Validate tool execution before parsing
4. Use tool-specific parsers for accuracy
5. Maintain issue context and metadata