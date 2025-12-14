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
      // SESSION 50 FIX: Use 'pylint' directly (not python -m) with --recursive=y
      // 'python -m pylint' doesn't support recursive scanning in all versions
      const fileArgs = files && files.length > 0 ? files.join(' ') : '.';
      const command = `cd ${repoPath} && pylint --recursive=y --output-format=json ${fileArgs} 2>&1`;
      
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

      // Parse JSON output - SESSION 50 FIX: Extract JSON from mixed output
      // Bandit outputs log lines before JSON (e.g., "[main] INFO...", "Working... ━━━")
      issues = this.parseBanditOutput(rawOutput);

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // SESSION 50 FIX: Bandit exits with code 1 when issues found
      // The JSON output is still in error.stdout, just need to extract it
      issues = this.parseBanditOutput(rawOutput);
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
      // Run mypy with better arguments for real-world codebases
      // SESSION 50 FIX: Add flags to handle common issues (duplicate modules, missing imports)
      const fileArgs = files && files.length > 0 ? files.join(' ') : '.';
      const command = `cd ${repoPath} && mypy ${fileArgs} --no-error-summary --ignore-missing-imports --explicit-package-bases 2>&1`;
      
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
   * Parse Bandit output - extracts JSON from mixed output
   * SESSION 50 FIX: Bandit outputs log lines before JSON, need to extract JSON portion
   */
  private parseBanditOutput(output: string): PythonIssue[] {
    if (!output || output.trim().length === 0) {
      return [];
    }

    // Try to find JSON in the output (Bandit outputs log lines before JSON)
    // Look for the start of JSON object: { followed by "errors" or "results"
    const jsonStartIndex = output.indexOf('{\n  "errors"');
    if (jsonStartIndex === -1) {
      // Try alternate pattern
      const altStart = output.indexOf('{');
      if (altStart !== -1 && output.substring(altStart).includes('"results"')) {
        // Found JSON, extract from { to the matching }
        const jsonPart = output.substring(altStart);
        try {
          const banditResult = JSON.parse(jsonPart);
          if (banditResult.results) {
            return this.parseBanditResults(banditResult.results);
          }
        } catch {
          // JSON parsing failed, try to extract just the JSON
        }
      }
      // Fall back to text parsing
      return this.parseBanditTextOutput(output);
    }

    // Extract JSON from the start position to the end
    const jsonPart = output.substring(jsonStartIndex);
    try {
      const banditResult = JSON.parse(jsonPart);
      if (banditResult.results) {
        return this.parseBanditResults(banditResult.results);
      }
      return [];
    } catch {
      // JSON parsing failed, fall back to text parsing
      return this.parseBanditTextOutput(output);
    }
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

  // ============================================================
  // SESSION 51: NEW TOOLS - Ruff (replaces Pylint) & pip-audit (replaces Safety)
  // ============================================================

  /**
   * Run Ruff and parse its output
   * Ruff is 10-100x faster than Pylint and includes security rules
   *
   * Benefits over Pylint:
   * - 10-100x faster execution
   * - Built-in security rules (similar to flake8-bandit)
   * - Single tool replaces multiple linters
   * - Active development and modern Python support
   */
  async runRuff(repoPath: string, files?: string[]): Promise<PythonToolResult> {
    const startTime = Date.now();
    let issues: PythonIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run ruff with JSON output
      // --select ALL enables all available rules
      // --ignore E501 ignores line length (often noisy)
      const fileArgs = files && files.length > 0 ? files.join(' ') : '.';
      const command = `cd ${repoPath} && ruff check ${fileArgs} --output-format json 2>&1`;

      const { stdout, stderr } = await exec(command, {
        maxBuffer: 10 * 1024 * 1024,  // 10MB buffer
        timeout: 120000  // 2 minute timeout
      });

      rawOutput = stdout + stderr;

      // Parse JSON output
      issues = this.parseRuffOutput(rawOutput);

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // Ruff exits with code 1 when issues found, still parse output
      issues = this.parseRuffOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;

    return {
      tool: 'ruff',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Parse Ruff JSON output
   */
  private parseRuffOutput(output: string): PythonIssue[] {
    if (!output || output.trim().length === 0) {
      return [];
    }

    try {
      // Ruff outputs a JSON array directly
      // Find array start in case there's any prefix output
      const jsonStart = output.indexOf('[');
      if (jsonStart === -1) {
        return this.parseRuffTextOutput(output);
      }

      const jsonPart = output.substring(jsonStart);
      const ruffResults = JSON.parse(jsonPart);

      if (!Array.isArray(ruffResults)) {
        return this.parseRuffTextOutput(output);
      }

      return this.parseRuffResults(ruffResults);

    } catch {
      return this.parseRuffTextOutput(output);
    }
  }

  /**
   * Parse Ruff JSON results
   */
  private parseRuffResults(results: any[]): PythonIssue[] {
    const issues: PythonIssue[] = [];

    for (const result of results) {
      issues.push({
        id: `ruff-${result.code}-${result.location?.row || 0}-${result.location?.column || 0}`,
        type: this.mapRuffType(result.code),
        severity: this.mapRuffSeverity(result.code),
        file: result.filename,
        line: result.location?.row || 1,
        column: result.location?.column || 0,
        message: result.message,
        tool: 'ruff',
        category: result.code,
        code: result.code,
        help: result.url
      });
    }

    return issues;
  }

  /**
   * Parse Ruff text output (fallback)
   */
  private parseRuffTextOutput(output: string): PythonIssue[] {
    const issues: PythonIssue[] = [];
    const lines = output.split('\n');

    // Pattern: filename:line:column: code message
    const ruffRegex = /^(.+?):(\d+):(\d+):\s+([A-Z]+\d+)\s+(.+)$/;

    for (const line of lines) {
      const match = line.match(ruffRegex);
      if (match) {
        issues.push({
          id: `ruff-${match[4]}-${match[2]}-${match[3]}`,
          type: this.mapRuffType(match[4]),
          severity: this.mapRuffSeverity(match[4]),
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[5],
          tool: 'ruff',
          category: match[4],
          code: match[4]
        });
      }
    }

    return issues;
  }

  /**
   * Map Ruff code to issue type
   * Ruff codes: E=pycodestyle errors, W=pycodestyle warnings, F=pyflakes,
   * C=mccabe, I=isort, N=pep8-naming, D=pydocstyle, UP=pyupgrade,
   * S=flake8-bandit (security), B=flake8-bugbear, A=flake8-builtins
   */
  private mapRuffType(code: string): PythonIssue['type'] {
    if (!code) return 'quality';

    const prefix = code.charAt(0);
    switch (prefix) {
      case 'S':  // flake8-bandit security rules
        return 'security';
      case 'E':  // pycodestyle errors
        return 'bug';
      case 'W':  // pycodestyle warnings
        return 'style';
      case 'F':  // pyflakes
        return 'bug';
      case 'B':  // flake8-bugbear
        return 'bug';
      case 'C':  // mccabe complexity
        return 'performance';
      default:
        return 'quality';
    }
  }

  /**
   * Map Ruff code to severity
   */
  private mapRuffSeverity(code: string): PythonIssue['severity'] {
    if (!code) return 'medium';

    const prefix = code.charAt(0);
    switch (prefix) {
      case 'S':  // Security rules - always high/critical
        // S1xx = low, S2xx = medium, S3xx-S7xx = high
        const secNum = parseInt(code.substring(1));
        if (secNum >= 300) return 'high';
        if (secNum >= 200) return 'medium';
        return 'low';
      case 'E':  // Errors
        return 'high';
      case 'F':  // Pyflakes (undefined names, etc.)
        return 'high';
      case 'B':  // Bugbear (likely bugs)
        return 'medium';
      case 'W':  // Warnings
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Run pip-audit and parse its output
   * pip-audit is maintained by PyPA, more reliable than Safety
   *
   * Benefits over Safety:
   * - Maintained by Python Packaging Authority (PyPA)
   * - Uses official PyPI vulnerability database
   * - No authentication required (Safety now requires it)
   * - Better maintained, more reliable
   */
  async runPipAudit(repoPath: string): Promise<PythonToolResult> {
    const startTime = Date.now();
    let issues: PythonIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run pip-audit with JSON output
      // SESSION 51 FIX: Don't use 2>&1 - pip-audit writes status to stderr, JSON to stdout
      // When vulnerabilities found, exits with code 1 but stdout still contains JSON
      // Try requirements.txt first, fallback to environment scan
      const requirementsTxt = `${repoPath}/requirements.txt`;
      const fs = require('fs');
      const command = fs.existsSync(requirementsTxt)
        ? `cd ${repoPath} && pip-audit --format json -r requirements.txt`
        : `cd ${repoPath} && pip-audit --format json`;

      const { stdout, stderr } = await exec(command, {
        maxBuffer: 5 * 1024 * 1024,
        timeout: 120000  // 2 minutes (needs to download vulnerability DB)
      });

      rawOutput = stdout;
      // Parse JSON output
      issues = this.parsePipAuditOutput(rawOutput);

    } catch (error: any) {
      exitCode = error.code || 1;
      // SESSION 51 FIX: pip-audit exits with code 1 when vulnerabilities found
      // The JSON output is still in error.stdout
      rawOutput = error.stdout || '';
      if (rawOutput) {
        issues = this.parsePipAuditOutput(rawOutput);
      }
      // Log for debugging
      if (issues.length === 0 && rawOutput) {
        console.warn(`[pip-audit] No issues parsed from output. Raw output preview: ${rawOutput.substring(0, 200)}`);
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;

    return {
      tool: 'pip-audit',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Parse pip-audit JSON output
   */
  private parsePipAuditOutput(output: string): PythonIssue[] {
    if (!output || output.trim().length === 0) {
      return [];
    }

    try {
      // pip-audit outputs JSON object with dependencies array
      // Find JSON start in case there's prefix output
      const jsonStart = output.indexOf('{');
      if (jsonStart === -1) {
        // Try array format
        const arrayStart = output.indexOf('[');
        if (arrayStart === -1) {
          return this.parsePipAuditTextOutput(output);
        }
        const jsonPart = output.substring(arrayStart);
        const results = JSON.parse(jsonPart);
        return this.parsePipAuditResults(results);
      }

      const jsonPart = output.substring(jsonStart);
      const result = JSON.parse(jsonPart);

      // Handle both formats: {dependencies: [...]} or [{...}]
      if (result.dependencies) {
        return this.parsePipAuditResults(result.dependencies);
      } else if (Array.isArray(result)) {
        return this.parsePipAuditResults(result);
      }

      return [];

    } catch {
      return this.parsePipAuditTextOutput(output);
    }
  }

  /**
   * Parse pip-audit JSON results
   */
  private parsePipAuditResults(dependencies: any[]): PythonIssue[] {
    const issues: PythonIssue[] = [];

    for (const dep of dependencies) {
      // Skip packages without vulnerabilities
      if (!dep.vulns || dep.vulns.length === 0) {
        continue;
      }

      for (const vuln of dep.vulns) {
        issues.push({
          id: vuln.id || `pip-audit-${dep.name}-${Date.now()}`,
          type: 'security',
          severity: this.mapPipAuditSeverity(vuln),
          file: 'requirements.txt',
          line: 1,
          message: `${dep.name} ${dep.version}: ${vuln.description || vuln.id}`,
          suggestion: vuln.fix_versions?.length
            ? `Update ${dep.name} to ${vuln.fix_versions.join(' or ')}`
            : `Update ${dep.name} to latest secure version`,
          tool: 'pip-audit',
          category: 'dependency-vulnerability',
          code: vuln.id,
          help: vuln.link
        });
      }
    }

    return issues;
  }

  /**
   * Parse pip-audit text output (fallback)
   */
  private parsePipAuditTextOutput(output: string): PythonIssue[] {
    const issues: PythonIssue[] = [];
    const lines = output.split('\n');

    // Pattern: Name    Version    ID    Fix Versions
    // Skip header line
    let inTable = false;

    for (const line of lines) {
      // Detect table start (line with dashes)
      if (line.includes('---')) {
        inTable = true;
        continue;
      }

      if (!inTable) continue;

      // Parse table row
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 3) {
        issues.push({
          id: parts[2] || `pip-audit-${Date.now()}-${issues.length}`,
          type: 'security',
          severity: 'high',
          file: 'requirements.txt',
          line: 1,
          message: `${parts[0]} ${parts[1]}: Vulnerability ${parts[2]}`,
          suggestion: parts[3] ? `Update to ${parts[3]}` : 'Update to latest secure version',
          tool: 'pip-audit',
          category: 'dependency-vulnerability',
          code: parts[2]
        });
      }
    }

    return issues;
  }

  /**
   * Map pip-audit vulnerability to severity
   */
  private mapPipAuditSeverity(vuln: any): PythonIssue['severity'] {
    // Check for CVSS score or severity field
    if (vuln.severity) {
      const sev = vuln.severity.toLowerCase();
      if (sev === 'critical') return 'critical';
      if (sev === 'high') return 'high';
      if (sev === 'medium') return 'medium';
      if (sev === 'low') return 'low';
    }

    // Check description for severity keywords
    const desc = (vuln.description || vuln.id || '').toLowerCase();
    if (desc.includes('critical') || desc.includes('rce') || desc.includes('remote code')) {
      return 'critical';
    }
    if (desc.includes('high') || desc.includes('arbitrary') || desc.includes('injection')) {
      return 'high';
    }

    // Default to high for security vulnerabilities
    return 'high';
  }
}

export default PythonToolParser;