/**
 * Tool Output Parser
 * Parses raw output from static analysis tools into structured Issue objects
 */

export interface Issue {
  tool: string;
  file: string;
  line: number;
  column?: number;
  rule: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  code?: string;
}

export class ToolOutputParser {
  private toolParsers: Map<string, (output: string) => Issue[]> = new Map([
    ['pmd', this.parsePMD.bind(this)],
    ['checkstyle', this.parseCheckstyle.bind(this)],
    ['semgrep', this.parseSemgrep.bind(this)],
    ['infer', this.parseInfer.bind(this)],
    ['trivy', this.parseTrivy.bind(this)],
    ['spotbugs', this.parseSpotBugs.bind(this)]
  ]);

  /**
   * Parse tool output into structured issues
   */
  parse(toolName: string, output: string): Issue[] {
    // Skip if no output or error messages
    if (!output || output.trim() === '') {
      console.log(`No output from ${toolName}`);
      return [];
    }

    // Check for tool execution errors
    const validation = this.validateToolOutput(output, toolName);
    if (!validation.valid) {
      console.warn(`${toolName} validation failed: ${validation.reason}`);
      return [];
    }

    const parser = this.toolParsers.get(toolName.toLowerCase());
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

  /**
   * Validate tool output for errors
   */
  private validateToolOutput(output: string, toolName: string): { valid: boolean; reason: string } {
    // Check for error indicators
    const errorPatterns = [
      /command not found/i,
      /no such file/i,
      /permission denied/i,
      /java\.io\.IOException: No files to analyze/i,
      /dependency-check: not found/i
    ];

    for (const pattern of errorPatterns) {
      if (pattern.test(output)) {
        return { valid: false, reason: 'Tool execution error' };
      }
    }

    // Check for successful execution markers
    const successMarkers: Record<string, RegExp> = {
      'pmd': /Processing started|\.java:\d+:/i,
      'checkstyle': /Starting audit|\[WARN\]|\[ERROR\]/i,
      'semgrep': /Running \d+ rules|"results":|ruleid:/i,
      'spotbugs': /Analyzing|The following classes needed/i,
      'infer': /Capturing|Analyzing|No issues found|error:/i,
      'trivy': /Vulnerability|"Results"|Scanning/i
    };

    const marker = successMarkers[toolName.toLowerCase()];
    if (marker && !marker.test(output)) {
      // If no success marker but also no error, might be clean code
      if (output.includes('No issues found') ||
          output.includes('0 issues') ||
          output.includes('BUILD SUCCESSFUL')) {
        return { valid: true, reason: 'Clean code - no issues found' };
      }
      return { valid: false, reason: 'Tool may not have run properly' };
    }

    return { valid: true, reason: 'Tool executed successfully' };
  }

  /**
   * Parse PMD output
   * Format: ./path/file.java:123:	RuleName:	Message
   */
  private parsePMD(output: string): Issue[] {
    const issues: Issue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (!line.trim() || line.startsWith('===') || line.includes('Processing started')) continue;

      // Match PMD format with tab separators
      const match = line.match(/^(.+?):(\d+):\s+(.+?):\s+(.+)$/);
      if (match) {
        issues.push({
          tool: 'pmd',
          file: match[1].replace('./', '').replace('/workspace/repo/', ''),
          line: parseInt(match[2]),
          rule: match[3],
          message: match[4],
          severity: this.guessPMDSeverity(match[3], match[4])
        });
      }
    }
    return issues;
  }

  /**
   * Parse Checkstyle output
   * Format: [SEVERITY] /path/file.java:line:col: Message [CheckName]
   */
  private parseCheckstyle(output: string): Issue[] {
    const issues: Issue[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (!line.trim() || line.includes('Starting audit') || line.includes('Audit done')) continue;

      const match = line.match(/^\[(WARN|ERROR|INFO)\]\s+(.+?):(\d+):(\d+):\s+(.+?)\s+\[(.+?)\]$/);
      if (match) {
        issues.push({
          tool: 'checkstyle',
          severity: match[1].toLowerCase() === 'error' ? 'high' : 'medium',
          file: match[2]
            .replace('/workspace/./repo/', '')
            .replace('/workspace/repo/', '')
            .replace('/workspace/', ''),
          line: parseInt(match[3]),
          column: parseInt(match[4]),
          message: match[5],
          rule: match[6]
        });
      }
    }
    return issues;
  }

  /**
   * Parse Semgrep output (JSON or text format)
   */
  private parseSemgrep(output: string): Issue[] {
    // Try JSON parsing first
    if (output.trim().startsWith('{') || output.trim().startsWith('[')) {
      try {
        const data = JSON.parse(output);
        const issues: Issue[] = [];

        if (data.results) {
          for (const result of data.results) {
            issues.push({
              tool: 'semgrep',
              file: result.path,
              line: result.start?.line || 0,
              column: result.start?.col,
              rule: result.check_id || 'security-audit',
              message: result.extra?.message || result.extra?.metadata?.message || 'Security issue found',
              severity: this.mapSemgrepSeverity(result.extra?.severity)
            });
          }
        }

        return issues;
      } catch {
        // Fall through to text parsing
      }
    }

    // Text format parsing
    return this.parseSemgrepText(output);
  }

  /**
   * Parse Semgrep text output
   */
  private parseSemgrepText(output: string): Issue[] {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    let currentIssue: Partial<Issue> | null = null;

    for (const line of lines) {
      // File path (not indented)
      if (!line.startsWith(' ') && line.includes('.')) {
        if (currentIssue && currentIssue.line) {
          issues.push(currentIssue as Issue);
        }
        currentIssue = {
          tool: 'semgrep',
          file: line.trim(),
          severity: 'medium'
        };
      }
      // Rule ID (indented)
      else if (line.includes('ruleid:') && currentIssue) {
        currentIssue.rule = line.split('ruleid:')[1].trim();
        currentIssue.severity = this.guessSeverityFromRule(currentIssue.rule);
      }
      // Message (indented)
      else if (line.includes('Message:') && currentIssue) {
        currentIssue.message = line.split('Message:')[1].trim();
      }
      // Line number and code
      else if (line.match(/^\s+Line\s+(\d+):/) && currentIssue) {
        const match = line.match(/Line\s+(\d+):\s*(.*)$/);
        if (match) {
          currentIssue.line = parseInt(match[1]);
          currentIssue.code = match[2];
        }
      }
    }

    // Add last issue if exists
    if (currentIssue && currentIssue.line && currentIssue.file && currentIssue.rule && currentIssue.message) {
      issues.push(currentIssue as Issue);
    }

    return issues;
  }

  /**
   * Parse Infer output
   * Format: path/File.java:123: error: NULL_DEREFERENCE
   */
  private parseInfer(output: string): Issue[] {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    let currentIssue: string[] = [];
    let inIssue = false;

    for (const line of lines) {
      // New issue starts with file:line: error:
      if (line.match(/^[^:]+\.java:\d+:\s+error:/)) {
        // Save previous issue if exists
        if (currentIssue.length > 0) {
          const parsed = this.parseInferIssue(currentIssue.join('\n'));
          if (parsed) issues.push(parsed);
        }
        currentIssue = [line];
        inIssue = true;
      } else if (inIssue && line.trim() && !line.startsWith('Found ')) {
        currentIssue.push(line);
      } else if (line.trim() === '') {
        inIssue = false;
      }
    }

    // Don't forget the last issue
    if (currentIssue.length > 0) {
      const parsed = this.parseInferIssue(currentIssue.join('\n'));
      if (parsed) issues.push(parsed);
    }

    return issues;
  }

  /**
   * Parse a single Infer issue
   */
  private parseInferIssue(issueText: string): Issue | null {
    const lines = issueText.split('\n');
    const firstLine = lines[0];
    const match = firstLine.match(/^(.+?):(\d+):\s+error:\s+(.+)$/);

    if (match) {
      return {
        tool: 'infer',
        file: match[1],
        line: parseInt(match[2]),
        rule: match[3].split(/\s+/)[0], // First word is usually the error type
        message: lines.join(' '),
        severity: 'high' // Infer typically finds serious issues
      };
    }

    return null;
  }

  /**
   * Parse Trivy output (JSON format)
   */
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
                file: result.Target || 'dependencies',
                line: 0, // Trivy doesn't provide line numbers
                rule: vuln.VulnerabilityID || 'CVE',
                message: `${vuln.Title || vuln.Description || 'Vulnerability'} in ${vuln.PkgName}${vuln.InstalledVersion ? ` v${vuln.InstalledVersion}` : ''}`,
                severity: this.mapTrivySeverity(vuln.Severity)
              });
            }
          }
        }
      }

      return issues;
    } catch (error) {
      console.error('Failed to parse Trivy JSON:', error);
      // Try to extract CVEs from text
      return this.parseTrivyText(output);
    }
  }

  /**
   * Fallback text parser for Trivy
   */
  private parseTrivyText(output: string): Issue[] {
    const issues: Issue[] = [];
    const cvePattern = /CVE-\d{4}-\d+/g;
    const matches = output.match(cvePattern);

    if (matches) {
      const uniqueCVEs = [...new Set(matches)];
      uniqueCVEs.forEach(cve => {
        issues.push({
          tool: 'trivy',
          file: 'dependencies',
          line: 0,
          rule: cve,
          message: `Vulnerability ${cve} found in dependencies`,
          severity: 'high'
        });
      });
    }

    return issues;
  }

  /**
   * Parse SpotBugs output (for backward compatibility)
   */
  private parseSpotBugs(output: string): Issue[] {
    // SpotBugs needs compiled bytecode - skip for now
    if (output.includes('No files to analyze')) {
      console.warn('SpotBugs requires compiled bytecode - skipping');
      return [];
    }

    const issues: Issue[] = [];
    // Basic pattern matching for SpotBugs text output
    const bugPattern = /^([HML])\s+(.+?)\s+(.+?):(\d+)/gm;
    let match;

    while ((match = bugPattern.exec(output)) !== null) {
      issues.push({
        tool: 'spotbugs',
        file: match[3],
        line: parseInt(match[4]),
        rule: match[2],
        message: match[2],
        severity: match[1] === 'H' ? 'high' : match[1] === 'M' ? 'medium' : 'low'
      });
    }

    return issues;
  }

  /**
   * Guess severity from PMD rule name
   */
  private guessPMDSeverity(rule: string, message: string): 'critical' | 'high' | 'medium' | 'low' {
    const combined = `${rule} ${message}`.toLowerCase();

    const critical = ['security', 'injection', 'xss', 'sql', 'xxe', 'deserializ'];
    const high = ['nullpointer', 'resource', 'memory', 'thread', 'deadlock', 'race'];
    const medium = ['complexity', 'duplicate', 'unused', 'empty', 'naming'];

    if (critical.some(keyword => combined.includes(keyword))) return 'critical';
    if (high.some(keyword => combined.includes(keyword))) return 'high';
    if (medium.some(keyword => combined.includes(keyword))) return 'medium';
    return 'low';
  }

  /**
   * Guess severity from Semgrep rule
   */
  private guessSeverityFromRule(rule: string): 'critical' | 'high' | 'medium' | 'low' {
    if (!rule) return 'medium';

    const lower = rule.toLowerCase();
    if (lower.includes('security') || lower.includes('injection') || lower.includes('rce')) return 'critical';
    if (lower.includes('audit') || lower.includes('dangerous') || lower.includes('unsafe')) return 'high';
    if (lower.includes('performance') || lower.includes('best-practice')) return 'medium';
    return 'low';
  }

  /**
   * Map Semgrep severity
   */
  private mapSemgrepSeverity(severity?: string): 'critical' | 'high' | 'medium' | 'low' {
    if (!severity) return 'medium';

    const map: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      'error': 'critical',
      'warning': 'high',
      'info': 'medium',
      'note': 'low'
    };

    return map[severity.toLowerCase()] || 'medium';
  }

  /**
   * Map Trivy severity
   */
  private mapTrivySeverity(severity?: string): 'critical' | 'high' | 'medium' | 'low' {
    if (!severity) return 'medium';

    const map: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'unknown': 'low',
      'negligible': 'low'
    };

    return map[severity.toLowerCase()] || 'medium';
  }

  /**
   * Combine and deduplicate issues from multiple tools
   */
  static combineIssues(toolOutputs: Map<string, Issue[]>): Issue[] {
    const allIssues: Issue[] = [];

    for (const [tool, issues] of toolOutputs) {
      allIssues.push(...issues);
    }

    // Deduplicate by file+line+rule
    const seen = new Set<string>();
    const uniqueIssues: Issue[] = [];

    for (const issue of allIssues) {
      const key = `${issue.file}:${issue.line}:${issue.rule}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueIssues.push(issue);
      }
    }

    // Sort by severity then by file and line
    uniqueIssues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      const fileDiff = a.file.localeCompare(b.file);
      if (fileDiff !== 0) return fileDiff;

      return a.line - b.line;
    });

    return uniqueIssues;
  }
}

export default ToolOutputParser;