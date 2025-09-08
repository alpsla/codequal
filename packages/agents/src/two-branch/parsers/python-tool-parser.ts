/**
 * Python Tool Output Parser
 * Parses real output from Python analysis tools:
 * - Pylint (code quality and style)
 * - Bandit (security vulnerabilities)
 * - mypy (type checking)
 * - safety (dependency vulnerabilities)
 * - pytest (test results)
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

export interface PythonIssue {
  id: string;
  type: 'security' | 'performance' | 'quality' | 'bug' | 'style' | 'type-error';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  column?: number;
  message: string;
  suggestion?: string;
  tool: string;
  category?: string;
  code?: string;
  help?: string;
  symbol?: string;
}

export interface PythonToolResult {
  tool: string;
  executionTime: number;
  exitCode: number;
  issues: PythonIssue[];
  rawOutput?: string;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export class PythonToolParser {
  
  /**
   * Run Pylint and parse its output
   */
  async runPylint(repoPath: string, files?: string[]): Promise<PythonToolResult> {
    const startTime = Date.now();
    let issues: PythonIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run pylint with JSON output for better parsing
      const fileArgs = files && files.length > 0 ? files.join(' ') : '.';
      const command = `cd ${repoPath} && python -m pylint --output-format=json ${fileArgs} 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,  // 10MB buffer
        timeout: 120000  // 2 minute timeout
      });
      
      rawOutput = stdout + stderr;
      
      // Parse JSON output
      try {
        const pylintOutput = JSON.parse(stdout);
        if (Array.isArray(pylintOutput)) {
          issues = this.parsePylintMessages(pylintOutput);
        }
      } catch (e) {
        // Fallback to text parsing
        issues = this.parsePylintTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // Even if pylint fails, try to parse any output
      if (rawOutput.includes('[') && rawOutput.includes(']')) {
        try {
          const jsonStart = rawOutput.indexOf('[');
          const jsonEnd = rawOutput.lastIndexOf(']') + 1;
          const jsonStr = rawOutput.substring(jsonStart, jsonEnd);
          const pylintOutput = JSON.parse(jsonStr);
          issues = this.parsePylintMessages(pylintOutput);
        } catch {
          issues = this.parsePylintTextOutput(rawOutput);
        }
      } else {
        issues = this.parsePylintTextOutput(rawOutput);
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'pylint',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000), // Limit output size
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run Bandit and parse its output
   */
  async runBandit(repoPath: string, files?: string[]): Promise<PythonToolResult> {
    const startTime = Date.now();
    let issues: PythonIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run bandit with JSON output
      const fileArgs = files && files.length > 0 ? files.join(' ') : '-r .';
      const command = `cd ${repoPath} && bandit ${fileArgs} -f json 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 5 * 1024 * 1024,
        timeout: 60000
      });
      
      rawOutput = stdout;
      
      // Parse JSON output
      try {
        const banditResult = JSON.parse(stdout);
        if (banditResult.results) {
          issues = this.parseBanditResults(banditResult.results);
        }
      } catch (e) {
        // Fallback to text parsing
        issues = this.parseBanditTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // Try to parse any available output
      try {
        const banditResult = JSON.parse(rawOutput);
        if (banditResult.results) {
          issues = this.parseBanditResults(banditResult.results);
        }
      } catch {
        issues = this.parseBanditTextOutput(rawOutput);
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'bandit',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run mypy and parse its output
   */
  async runMypy(repoPath: string, files?: string[]): Promise<PythonToolResult> {
    const startTime = Date.now();
    let issues: PythonIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run mypy with JSON output if available, otherwise parse text
      const fileArgs = files && files.length > 0 ? files.join(' ') : '.';
      const command = `cd ${repoPath} && mypy ${fileArgs} --no-error-summary 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 5 * 1024 * 1024,
        timeout: 60000
      });
      
      rawOutput = stdout + stderr;
      
      // Parse mypy text output (mypy doesn't have native JSON output)
      issues = this.parseMypyTextOutput(rawOutput);

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // Try to parse any available output
      issues = this.parseMypyTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'mypy',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run safety and parse its output
   */
  async runSafety(repoPath: string): Promise<PythonToolResult> {
    const startTime = Date.now();
    let issues: PythonIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run safety check with JSON output
      const command = `cd ${repoPath} && safety check --json 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 5 * 1024 * 1024,
        timeout: 60000
      });
      
      rawOutput = stdout;
      
      // Parse JSON output
      try {
        const safetyResult = JSON.parse(stdout);
        if (Array.isArray(safetyResult)) {
          issues = this.parseSafetyVulnerabilities(safetyResult);
        }
      } catch (e) {
        // Fallback to text parsing
        issues = this.parseSafetyTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // Try to parse any available output
      try {
        const safetyResult = JSON.parse(rawOutput);
        if (Array.isArray(safetyResult)) {
          issues = this.parseSafetyVulnerabilities(safetyResult);
        }
      } catch {
        issues = this.parseSafetyTextOutput(rawOutput);
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'safety',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Parse Pylint JSON messages
   */
  private parsePylintMessages(messages: any[]): PythonIssue[] {
    const issues: PythonIssue[] = [];
    
    for (const msg of messages) {
      issues.push({
        id: `pylint-${msg.message_id}-${msg.line}-${msg.column}`,
        type: this.mapPylintType(msg.type, msg.message_id),
        severity: this.mapPylintSeverity(msg.type),
        file: msg.path,
        line: msg.line,
        column: msg.column,
        message: msg.message,
        tool: 'pylint',
        category: msg.message_id,
        code: msg.symbol,
        symbol: msg.obj
      });
    }
    
    return issues;
  }

  /**
   * Parse Pylint text output (fallback)
   */
  private parsePylintTextOutput(output: string): PythonIssue[] {
    const issues: PythonIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern: filename:line:column: message_id: message (symbol)
    const pylintRegex = /^(.+?):(\d+):(\d+):\s+([A-Z]\d{4}):\s+(.+?)\s+\((.+?)\)$/;
    
    for (const line of lines) {
      const match = line.match(pylintRegex);
      if (match) {
        issues.push({
          id: `pylint-${match[4]}-${match[2]}-${match[3]}`,
          type: this.mapPylintType(match[4].charAt(0), match[4]),
          severity: this.mapPylintSeverity(match[4].charAt(0)),
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[5],
          tool: 'pylint',
          category: match[4],
          code: match[6]
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse Bandit results
   */
  private parseBanditResults(results: any[]): PythonIssue[] {
    const issues: PythonIssue[] = [];
    
    for (const result of results) {
      issues.push({
        id: `bandit-${result.test_id}-${result.line_number}`,
        type: 'security',
        severity: this.mapBanditSeverity(result.issue_severity),
        file: result.filename,
        line: result.line_number,
        column: result.col_offset,
        message: result.issue_text,
        tool: 'bandit',
        category: result.test_name,
        code: result.test_id,
        help: result.more_info
      });
    }
    
    return issues;
  }

  /**
   * Parse Bandit text output (fallback)
   */
  private parseBanditTextOutput(output: string): PythonIssue[] {
    const issues: PythonIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern for Bandit output
    const issueStartRegex = /^>>\s+Issue:\s+\[(.+?)\]\s+(.+)$/;
    const severityRegex = /^\s+Severity:\s+(.+?)\s+Confidence:\s+(.+)$/;
    const locationRegex = /^\s+Location:\s+(.+?):(\d+)$/;
    
    let currentIssue: Partial<PythonIssue> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const issueMatch = line.match(issueStartRegex);
      if (issueMatch) {
        if (currentIssue && currentIssue.file) {
          issues.push(currentIssue as PythonIssue);
        }
        
        currentIssue = {
          id: `bandit-${Date.now()}-${i}`,
          type: 'security',
          message: issueMatch[2],
          tool: 'bandit',
          category: issueMatch[1]
        };
      }
      
      const severityMatch = line.match(severityRegex);
      if (severityMatch && currentIssue) {
        currentIssue.severity = this.mapBanditSeverity(severityMatch[1]);
      }
      
      const locationMatch = line.match(locationRegex);
      if (locationMatch && currentIssue) {
        currentIssue.file = locationMatch[1];
        currentIssue.line = parseInt(locationMatch[2]);
      }
    }
    
    if (currentIssue && currentIssue.file) {
      issues.push(currentIssue as PythonIssue);
    }
    
    return issues;
  }

  /**
   * Parse mypy text output
   */
  private parseMypyTextOutput(output: string): PythonIssue[] {
    const issues: PythonIssue[] = [];
    const lines = output.split('\n');
    
    // Pattern: filename:line: error_type: message
    const mypyRegex = /^(.+?):(\d+):\s+(error|warning|note):\s+(.+)$/;
    
    for (const line of lines) {
      const match = line.match(mypyRegex);
      if (match) {
        issues.push({
          id: `mypy-${Date.now()}-${issues.length}`,
          type: 'type-error',
          severity: match[3] === 'error' ? 'high' : 'medium',
          file: match[1],
          line: parseInt(match[2]),
          message: match[4],
          tool: 'mypy',
          category: match[3]
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse safety vulnerabilities
   */
  private parseSafetyVulnerabilities(vulnerabilities: any[]): PythonIssue[] {
    const issues: PythonIssue[] = [];
    
    for (const vuln of vulnerabilities) {
      issues.push({
        id: vuln.vulnerability_id || `safety-${Date.now()}`,
        type: 'security',
        severity: this.mapSafetySeverity(vuln.severity || vuln.advisory),
        file: 'requirements.txt',
        line: 1,
        message: `${vuln.package_name} ${vuln.analyzed_version}: ${vuln.advisory}`,
        suggestion: `Update ${vuln.package_name} to ${vuln.safe_version || 'latest safe version'}`,
        tool: 'safety',
        category: 'dependency-vulnerability',
        help: vuln.more_info_url
      });
    }
    
    return issues;
  }

  /**
   * Parse safety text output (fallback)
   */
  private parseSafetyTextOutput(output: string): PythonIssue[] {
    const issues: PythonIssue[] = [];
    const lines = output.split('\n');
    
    // Look for vulnerability patterns
    const vulnRegex = /^(.+?)\s+<(.+?)>\s+installed (.+?),\s+(.+)$/;
    
    for (const line of lines) {
      const match = line.match(vulnRegex);
      if (match) {
        issues.push({
          id: `safety-${Date.now()}-${issues.length}`,
          type: 'security',
          severity: 'high',
          file: 'requirements.txt',
          line: 1,
          message: `${match[1]} ${match[3]}: ${match[4]}`,
          suggestion: `Update ${match[1]} to safe version`,
          tool: 'safety'
        });
      }
    }
    
    return issues;
  }

  /**
   * Map Pylint type to issue type
   */
  private mapPylintType(type: string, messageId?: string): PythonIssue['type'] {
    // Check message ID for specific categories
    if (messageId) {
      if (messageId.startsWith('E')) return 'bug';  // Error
      if (messageId.startsWith('W')) return 'quality';  // Warning
      if (messageId.startsWith('C')) return 'style';  // Convention
      if (messageId.startsWith('R')) return 'quality';  // Refactor
    }
    
    switch (type?.toLowerCase()) {
      case 'error':
      case 'e':
        return 'bug';
      case 'warning':
      case 'w':
        return 'quality';
      case 'convention':
      case 'c':
        return 'style';
      case 'refactor':
      case 'r':
        return 'quality';
      default:
        return 'quality';
    }
  }

  /**
   * Map Pylint severity
   */
  private mapPylintSeverity(type: string): PythonIssue['severity'] {
    switch (type?.toLowerCase()) {
      case 'error':
      case 'e':
        return 'high';
      case 'warning':
      case 'w':
        return 'medium';
      case 'convention':
      case 'c':
      case 'refactor':
      case 'r':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Map Bandit severity
   */
  private mapBanditSeverity(severity: string): PythonIssue['severity'] {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'critical';
      case 'medium':
        return 'high';
      case 'low':
        return 'medium';
      default:
        return 'medium';
    }
  }

  /**
   * Map Safety severity
   */
  private mapSafetySeverity(advisory: string): PythonIssue['severity'] {
    if (!advisory) return 'high';
    
    const lowerAdvisory = advisory.toLowerCase();
    if (lowerAdvisory.includes('critical') || lowerAdvisory.includes('rce')) {
      return 'critical';
    }
    if (lowerAdvisory.includes('high') || lowerAdvisory.includes('vulnerability')) {
      return 'high';
    }
    if (lowerAdvisory.includes('medium') || lowerAdvisory.includes('update')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(issues: PythonIssue[]) {
    return {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }
}

export default PythonToolParser;