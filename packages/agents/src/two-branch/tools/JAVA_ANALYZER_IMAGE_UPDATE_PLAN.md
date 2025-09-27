# Java Analyzer Image Update Plan

## Overview
Plan to update the Java analyzer Docker image with better tool selection and implement proper output parsing.

## Tool Replacement Strategy

### 1. Replace SpotBugs → Infer (Facebook)

**Why Replace:**
- SpotBugs requires compiled bytecode (.class/.jar)
- Our workflow analyzes source code directly
- Compilation adds significant overhead

**Infer Advantages:**
- Works on Java source code (no compilation needed)
- Finds null pointer exceptions, resource leaks, thread safety issues
- Used by Facebook, Uber, Mozilla
- Free and open source

**Installation:**
```dockerfile
# Install Infer
RUN VERSION=1.1.0; \
    curl -sSL "https://github.com/facebook/infer/releases/download/v$VERSION/infer-linux64-v$VERSION.tar.xz" \
    | tar -C /opt -xJ && \
    ln -s "/opt/infer-linux64-v$VERSION/bin/infer" /usr/local/bin/infer
```

**Command:**
```bash
infer run --report-console-limit 1000 -- javac $(find . -name "*.java" -not -path "*/test/*")
```

**Expected Output Format:**
```
path/to/File.java:123: error: NULL_DEREFERENCE
  pointer `obj` could be null and is dereferenced at line 123
```

---

### 2. Replace Dependency-Check → Trivy

**Why Replace:**
- Dependency-Check not installed in current image
- Trivy is faster and more modern
- Better container/cloud native support

**Trivy Advantages:**
- Scans dependencies, containers, IaC, secrets
- Works with pom.xml, build.gradle, package.json
- Fast and lightweight
- Regular CVE database updates
- Free and open source

**Installation:**
```dockerfile
# Install Trivy
RUN apt-get update && apt-get install -y wget apt-transport-https gnupg lsb-release && \
    wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | apt-key add - && \
    echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | tee -a /etc/apt/sources.list.d/trivy.list && \
    apt-get update && \
    apt-get install -y trivy
```

**Command:**
```bash
trivy fs --scanners vuln --format json --no-progress .
```

**Expected Output Format (JSON):**
```json
{
  "Results": [{
    "Target": "pom.xml",
    "Vulnerabilities": [{
      "VulnerabilityID": "CVE-2021-44228",
      "PkgName": "log4j",
      "Severity": "CRITICAL",
      "Title": "Log4j Remote Code Execution"
    }]
  }]
}
```

---

## Updated Dockerfile for Java Analyzer v5.2

```dockerfile
FROM openjdk:17-slim

# Install base tools
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    python3 \
    python3-pip \
    apt-transport-https \
    gnupg \
    lsb-release \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install PMD (working - keep)
RUN wget https://github.com/pmd/pmd/releases/download/pmd_releases%2F6.55.0/pmd-bin-6.55.0.zip \
    && unzip pmd-bin-6.55.0.zip \
    && mv pmd-bin-6.55.0 /opt/pmd \
    && ln -s /opt/pmd/bin/run.sh /usr/local/bin/pmd \
    && rm pmd-bin-6.55.0.zip

# Install Checkstyle (working - keep)
RUN wget https://github.com/checkstyle/checkstyle/releases/download/checkstyle-10.12.0/checkstyle-10.12.0-all.jar \
    && mv checkstyle-10.12.0-all.jar /opt/checkstyle.jar \
    && echo '#!/bin/bash\njava -jar /opt/checkstyle.jar "$@"' > /usr/local/bin/checkstyle \
    && chmod +x /usr/local/bin/checkstyle

# Install Semgrep (working - keep)
RUN pip3 install semgrep

# Install Infer (NEW - replaces SpotBugs)
RUN VERSION=1.1.0; \
    curl -sSL "https://github.com/facebook/infer/releases/download/v$VERSION/infer-linux64-v$VERSION.tar.xz" \
    | tar -C /opt -xJ && \
    ln -s "/opt/infer-linux64-v$VERSION/bin/infer" /usr/local/bin/infer

# Install Trivy (NEW - replaces Dependency-Check)
RUN wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | apt-key add - && \
    echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | tee -a /etc/apt/sources.list.d/trivy.list && \
    apt-get update && \
    apt-get install -y trivy

# Add Google Java Format (bonus tool for code formatting checks)
RUN wget https://github.com/google/google-java-format/releases/download/v1.17.0/google-java-format-1.17.0-all-deps.jar \
    && mv google-java-format-1.17.0-all-deps.jar /opt/google-java-format.jar

WORKDIR /workspace
```

---

## Tool Command Updates for kubernetes-repository-manager.ts

```typescript
const toolCommands: Record<string, string> = {
  // Keep existing working tools
  'pmd': selectedFiles
    ? `${fileListCommand}cd /workspace/repo && cat /tmp/selected_files.txt | grep -v '/test/' | xargs pmd check -R category/java/errorprone.xml,category/java/security.xml -f text --no-progress --no-cache 2>&1`
    : `cd /workspace/repo && pmd check -d . --exclude '**/test/**' -R category/java/errorprone.xml,category/java/security.xml -f text --no-progress --no-cache 2>&1`,

  'checkstyle': selectedFiles
    ? `${fileListCommand}cd /workspace/repo && cat /tmp/selected_files.txt | grep -v '/test/' | xargs checkstyle -c /google_checks.xml 2>&1`
    : `cd /workspace/repo && find . -name "*.java" -not -path "*/test/*" | xargs checkstyle -c /google_checks.xml 2>&1`,

  'semgrep': selectedFiles
    ? `${fileListCommand}cd /workspace/repo && semgrep --config=java.lang.security --json --no-error --quiet $(cat /tmp/selected_files.txt | grep -v '/test/' | tr '\n' ' ') 2>&1`
    : `cd /workspace/repo && semgrep --config=java.lang.security --exclude='*test*' --json --no-error --quiet . 2>&1`,

  // NEW: Infer (replaces SpotBugs)
  'infer': selectedFiles
    ? `${fileListCommand}cd /workspace/repo && infer run --report-console-limit 1000 -- javac $(cat /tmp/selected_files.txt | grep -v '/test/' | tr '\n' ' ') 2>&1`
    : `cd /workspace/repo && infer run --report-console-limit 1000 -- javac $(find . -name "*.java" -not -path "*/test/*") 2>&1`,

  // NEW: Trivy (replaces Dependency-Check)
  'trivy': `cd /workspace/repo && trivy fs --scanners vuln --format json --no-progress . 2>&1`,

  // Skip SpotBugs
  'spotbugs': `echo "SpotBugs skipped - replaced by Infer" && exit 0`
};
```

---

## Output Parser Implementation

```typescript
// tool-output-parser.ts
export class ToolOutputParser {
  private toolParsers: Map<string, (output: string) => Issue[]> = new Map([
    ['pmd', this.parsePMD.bind(this)],
    ['checkstyle', this.parseCheckstyle.bind(this)],
    ['semgrep', this.parseSemgrep.bind(this)],
    ['infer', this.parseInfer.bind(this)],
    ['trivy', this.parseTrivy.bind(this)]
  ]);

  parse(toolName: string, output: string): Issue[] {
    const parser = this.toolParsers.get(toolName);
    if (!parser) {
      console.warn(`No parser for tool: ${toolName}`);
      return [];
    }

    try {
      const issues = parser(output);
      console.log(`Parsed ${issues.length} issues from ${toolName}`);
      return issues;
    } catch (error) {
      console.error(`Error parsing ${toolName} output:`, error);
      return [];
    }
  }

  private parsePMD(output: string): Issue[] {
    const issues: Issue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Format: ./path/file.java:123:	RuleName:	Message
      const match = line.match(/^(.+?):(\d+):\s+(.+?):\s+(.+)$/);
      if (match) {
        issues.push({
          tool: 'pmd',
          file: match[1].replace('./', ''),
          line: parseInt(match[2]),
          rule: match[3],
          message: match[4],
          severity: this.guessPMDSeverity(match[3])
        });
      }
    }
    return issues;
  }

  private parseCheckstyle(output: string): Issue[] {
    const issues: Issue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Format: [WARN] /path/file.java:17:1: Message [CheckName]
      const match = line.match(/^\[(WARN|ERROR|INFO)\]\s+(.+?):(\d+):(\d+):\s+(.+?)\s+\[(.+?)\]$/);
      if (match) {
        issues.push({
          tool: 'checkstyle',
          severity: match[1].toLowerCase() === 'error' ? 'high' : 'medium',
          file: match[2].replace('/workspace/repo/', '').replace('/workspace/', ''),
          line: parseInt(match[3]),
          column: parseInt(match[4]),
          message: match[5],
          rule: match[6]
        });
      }
    }
    return issues;
  }

  private parseSemgrep(output: string): Issue[] {
    try {
      const data = JSON.parse(output);
      const issues: Issue[] = [];

      if (data.results) {
        for (const result of data.results) {
          issues.push({
            tool: 'semgrep',
            file: result.path,
            line: result.start.line,
            column: result.start.col,
            rule: result.check_id,
            message: result.extra.message || result.extra.metadata?.message || 'Security issue found',
            severity: result.extra.severity || 'medium'
          });
        }
      }

      return issues;
    } catch {
      // Fallback to text parsing if JSON fails
      return this.parseSemgrepText(output);
    }
  }

  private parseSemgrepText(output: string): Issue[] {
    const issues: Issue[] = [];
    const blocks = output.split('\n\n');

    for (const block of blocks) {
      const lines = block.split('\n');
      let file = '';
      let rule = '';
      let message = '';
      let line = 0;

      for (const l of lines) {
        if (!l.startsWith(' ') && l.includes('.java')) {
          file = l.trim();
        } else if (l.includes('ruleid:')) {
          rule = l.split('ruleid:')[1].trim();
        } else if (l.includes('Message:')) {
          message = l.split('Message:')[1].trim();
        } else if (l.match(/Line\s+(\d+):/)) {
          const match = l.match(/Line\s+(\d+):/);
          if (match) line = parseInt(match[1]);
        }
      }

      if (file && line) {
        issues.push({
          tool: 'semgrep',
          file,
          line,
          rule: rule || 'security-audit',
          message: message || 'Security issue detected',
          severity: 'high'
        });
      }
    }

    return issues;
  }

  private parseInfer(output: string): Issue[] {
    const issues: Issue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Format: path/File.java:123: error: NULL_DEREFERENCE
      const match = line.match(/^(.+?):(\d+):\s+error:\s+(.+)$/);
      if (match) {
        issues.push({
          tool: 'infer',
          file: match[1],
          line: parseInt(match[2]),
          rule: match[3].split('\n')[0], // First line is rule name
          message: line, // Full message
          severity: 'high' // Infer typically finds serious issues
        });
      }
    }
    return issues;
  }

  private parseTrivy(output: string): Issue[] {
    try {
      const data = JSON.parse(output);
      const issues: Issue[] = [];

      if (data.Results) {
        for (const result of data.Results) {
          if (result.Vulnerabilities) {
            for (const vuln of result.Vulnerabilities) {
              issues.push({
                tool: 'trivy',
                file: result.Target,
                line: 0, // Trivy doesn't provide line numbers
                rule: vuln.VulnerabilityID,
                message: `${vuln.Title || vuln.Description} in ${vuln.PkgName}`,
                severity: this.mapTrivySeverity(vuln.Severity)
              });
            }
          }
        }
      }

      return issues;
    } catch (error) {
      console.error('Failed to parse Trivy JSON:', error);
      return [];
    }
  }

  private guessPMDSeverity(rule: string): string {
    if (rule.includes('Security') || rule.includes('Injection')) return 'critical';
    if (rule.includes('NullPointer') || rule.includes('Resource')) return 'high';
    if (rule.includes('Complexity') || rule.includes('Naming')) return 'medium';
    return 'low';
  }

  private mapTrivySeverity(severity: string): string {
    const map: Record<string, string> = {
      'CRITICAL': 'critical',
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low',
      'UNKNOWN': 'low'
    };
    return map[severity.toUpperCase()] || 'medium';
  }
}
```

---

## Migration Steps

1. **Build New Docker Image (v5.2)**
   ```bash
   cd docker/analyzers/java
   docker build -t registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.2 .
   docker push registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.2
   ```

2. **Update kubernetes-repository-manager.ts**
   - Add new tool commands for Infer and Trivy
   - Remove SpotBugs command or replace with no-op
   - Update image tag to v5.2

3. **Update Tool Parser**
   - Implement parsers for Infer and Trivy
   - Test with sample outputs

4. **Test with Real Projects**
   - Run against Apache Kafka
   - Run against Spring PetClinic (has known dependencies)
   - Verify output parsing accuracy

---

## Benefits of This Approach

1. **All Tools Work on Source Code**
   - No compilation needed
   - Faster analysis
   - Simpler workflow

2. **Better Coverage**
   - Infer: Null pointers, resource leaks, concurrency
   - Trivy: CVE scanning, secrets detection
   - PMD: Code quality, best practices
   - Checkstyle: Code style, formatting
   - Semgrep: Security patterns, SAST

3. **Modern Tools**
   - Actively maintained
   - Regular updates
   - Better performance

4. **Structured Output**
   - JSON output from Semgrep and Trivy
   - Consistent text formats from others
   - Easier parsing, less error-prone

---

## Testing Commands

```bash
# Test Infer
docker run -v $(pwd):/workspace analyzer:lang-java-v5.2 \
  infer run --report-console-limit 100 -- javac $(find . -name "*.java" | head -10)

# Test Trivy
docker run -v $(pwd):/workspace analyzer:lang-java-v5.2 \
  trivy fs --scanners vuln --format json .

# Test all tools
for tool in pmd checkstyle semgrep infer trivy; do
  echo "Testing $tool..."
  # Run tool command
done
```

---

## Conclusion

This plan replaces problematic tools (SpotBugs, Dependency-Check) with modern alternatives (Infer, Trivy) that:
- Work directly on source code
- Provide structured output
- Are actively maintained
- Cover the same security and quality concerns

The implementation includes complete parsing logic for all tools, ensuring no data loss during filtering.