import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

interface SemgrepFinding {
  check_id: string;
  path: string;
  start: {
    line: number;
    col: number;
  };
  end: {
    line: number;
    col: number;
  };
  extra: {
    message: string;
    metadata?: {
      category?: string;
      cwe?: string[];
      owasp?: string[];
      confidence?: string;
      likelihood?: string;
      impact?: string;
      references?: string[];
    };
    severity?: string;
    lines?: string;
    rendered_fix?: string;
  };
}

interface SemgrepResult {
  results: SemgrepFinding[];
  errors: any[];
  version: string;
}

interface MCPSecurityFinding {
  type: 'security';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  rule: string;
  message: string;
  file: string;
  line: number;
  column?: number;
  cwe?: string;
  owasp?: string;
  codeSnippet?: string;
  fix?: string;
  confidence?: string;
}

export class SemgrepMCP {
  private rulesets: Map<string, string> = new Map([
    ['javascript', 'auto'],
    ['typescript', 'auto'],
    ['python', 'auto'],
    ['java', 'auto'],
    ['go', 'auto'],
    ['ruby', 'auto'],
    ['php', 'auto'],
    ['csharp', 'auto'],
    ['rust', 'auto'],
    ['kotlin', 'auto'],
    ['swift', 'auto'],
    ['scala', 'auto']
  ]);

  /**
   * Analyzes code for security vulnerabilities using Semgrep
   * @param targetPath Path to the directory or file to analyze
   * @param language Optional language to optimize rules
   * @param customRules Optional custom rules file or registry
   * @returns MCP-formatted security findings
   */
  async analyze(targetPath = '.', language?: string, customRules?: string) {
    try {
      // Determine which rules to use
      const rules = customRules || this.getRulesForLanguage(language);
      
      // Build Semgrep command
      const command = this.buildSemgrepCommand(targetPath, rules);
      
      // Execute Semgrep
      const { stdout, stderr } = await execAsync(command, {
        cwd: path.dirname(targetPath),
        timeout: 300000, // 5 minute timeout for large repos
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });
      
      // Parse results
      const semgrepResult: SemgrepResult = JSON.parse(stdout);
      
      // Convert to MCP format
      return {
        tool: 'semgrep',
        success: true,
        language,
        findings: this.convertToMCPFormat(semgrepResult),
        metrics: {
          total: semgrepResult.results.length,
          errors: semgrepResult.errors.length,
          bySeverity: this.countBySeverity(semgrepResult.results)
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Runs Semgrep with OWASP Top 10 rules
   */
  async analyzeOWASP(targetPath = '.', language?: string) {
    return this.analyze(targetPath, language, 'p/owasp-top-ten');
  }

  /**
   * Runs Semgrep with security audit rules
   */
  async securityAudit(targetPath = '.', language?: string) {
    return this.analyze(targetPath, language, 'p/security-audit');
  }

  /**
   * Runs Semgrep for specific CWE categories
   */
  async analyzeCWE(targetPath = '.', cweIds: string[]) {
    const rules = cweIds.map(cwe => `p/cwe-${cwe}`).join(' --config ');
    return this.analyze(targetPath, undefined, rules);
  }

  /**
   * Builds the Semgrep command based on options
   */
  private buildSemgrepCommand(targetPath: string, rules: string): string {
    const baseCommand = 'semgrep';
    const outputFormat = '--json';
    const configFlag = '--config';
    
    // Additional flags for better analysis
    const flags = [
      '--metrics=off', // Disable telemetry
      '--quiet', // Reduce noise
      '--no-git-ignore', // Scan all files
      '--timeout=30', // 30 second timeout per rule
      '--max-memory=2000', // 2GB memory limit
    ];
    
    return `${baseCommand} ${outputFormat} ${flags.join(' ')} ${configFlag} ${rules} ${targetPath}`;
  }

  /**
   * Gets appropriate Semgrep rules for a language
   */
  private getRulesForLanguage(language?: string): string {
    if (!language) return 'auto';
    
    const normalizedLang = language.toLowerCase();
    
    // Language-specific security rulesets
    const languageRules: Record<string, string> = {
      javascript: 'p/javascript',
      typescript: 'p/typescript',
      python: 'p/python',
      java: 'p/java',
      go: 'p/golang',
      ruby: 'p/ruby',
      php: 'p/php',
      csharp: 'p/csharp',
      rust: 'p/rust',
      kotlin: 'p/kotlin',
      swift: 'p/swift',
      scala: 'p/scala'
    };
    
    return languageRules[normalizedLang] || 'auto';
  }

  /**
   * Converts Semgrep findings to MCP format
   */
  private convertToMCPFormat(semgrepResult: SemgrepResult): MCPSecurityFinding[] {
    return semgrepResult.results.map(finding => {
      const severity = this.mapSeverity(finding.extra.severity);
      const category = this.extractCategory(finding);
      
      return {
        type: 'security',
        severity,
        category,
        rule: finding.check_id,
        message: finding.extra.message,
        file: finding.path,
        line: finding.start.line,
        column: finding.start.col,
        cwe: this.extractCWE(finding),
        owasp: this.extractOWASP(finding),
        codeSnippet: finding.extra.lines,
        fix: finding.extra.rendered_fix,
        confidence: finding.extra.metadata?.confidence
      };
    });
  }

  /**
   * Maps Semgrep severity to MCP severity
   */
  private mapSeverity(semgrepSeverity?: string): MCPSecurityFinding['severity'] {
    const severityMap: Record<string, MCPSecurityFinding['severity']> = {
      'ERROR': 'critical',
      'WARNING': 'high',
      'INFO': 'medium',
      'INVENTORY': 'low',
      'EXPERIMENTAL': 'info'
    };
    
    return severityMap[semgrepSeverity?.toUpperCase() || ''] || 'medium';
  }

  /**
   * Extracts category from Semgrep finding
   */
  private extractCategory(finding: SemgrepFinding): string {
    // Try to extract from metadata
    if (finding.extra.metadata?.category) {
      return finding.extra.metadata.category;
    }
    
    // Extract from check_id (e.g., "javascript.express.security.injection.tainted-sql")
    const parts = finding.check_id.split('.');
    const securityIndex = parts.indexOf('security');
    
    if (securityIndex !== -1 && parts[securityIndex + 1]) {
      return parts[securityIndex + 1];
    }
    
    // Default categories based on patterns
    const checkId = finding.check_id.toLowerCase();
    if (checkId.includes('injection') || checkId.includes('sqli')) return 'injection';
    if (checkId.includes('xss')) return 'xss';
    if (checkId.includes('csrf')) return 'csrf';
    if (checkId.includes('auth')) return 'authentication';
    if (checkId.includes('crypto')) return 'cryptography';
    if (checkId.includes('path') || checkId.includes('traversal')) return 'path-traversal';
    if (checkId.includes('ssrf')) return 'ssrf';
    if (checkId.includes('xxe')) return 'xxe';
    if (checkId.includes('command')) return 'command-injection';
    if (checkId.includes('hardcoded') || checkId.includes('secret')) return 'secrets';
    
    return 'security';
  }

  /**
   * Extracts CWE IDs from finding
   */
  private extractCWE(finding: SemgrepFinding): string | undefined {
    const cweList = finding.extra.metadata?.cwe;
    if (cweList && cweList.length > 0) {
      return cweList.join(', ');
    }
    return undefined;
  }

  /**
   * Extracts OWASP categories from finding
   */
  private extractOWASP(finding: SemgrepFinding): string | undefined {
    const owaspList = finding.extra.metadata?.owasp;
    if (owaspList && owaspList.length > 0) {
      return owaspList.join(', ');
    }
    return undefined;
  }

  /**
   * Counts findings by severity
   */
  private countBySeverity(findings: SemgrepFinding[]): Record<string, number> {
    const counts: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    findings.forEach(finding => {
      const severity = this.mapSeverity(finding.extra.severity);
      counts[severity]++;
    });
    
    return counts;
  }

  /**
   * Handles errors and returns consistent error response
   */
  private handleError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if Semgrep is not installed
    if (errorMessage.includes('command not found') || errorMessage.includes('not recognized')) {
      return {
        tool: 'semgrep',
        success: false,
        error: 'Semgrep is not installed. Please install it using: pip install semgrep',
        findings: [],
        metrics: null
      };
    }
    
    return {
      tool: 'semgrep',
      success: false,
      error: errorMessage,
      findings: [],
      metrics: null
    };
  }

  /**
   * Gets a summary of security findings
   */
  async getSummary(targetPath = '.', language?: string): Promise<string> {
    const result = await this.analyze(targetPath, language);
    
    if (!result.success) {
      return `Error running Semgrep: ${(result as any).error}`;
    }
    
    const metrics = result.metrics;
    if (!metrics || metrics.total === 0) {
      return 'No security issues found';
    }
    
    const severities = metrics.bySeverity as Record<string, number>;
    const parts = [];
    
    if (severities.critical > 0) parts.push(`${severities.critical} critical`);
    if (severities.high > 0) parts.push(`${severities.high} high`);
    if (severities.medium > 0) parts.push(`${severities.medium} medium`);
    if (severities.low > 0) parts.push(`${severities.low} low`);
    if (severities.info > 0) parts.push(`${severities.info} info`);
    
    return `Found ${metrics.total} security issues: ${parts.join(', ')}`;
  }

  /**
   * Checks if Semgrep is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      await execAsync('semgrep --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Installs Semgrep using pip
   */
  async install(): Promise<boolean> {
    try {
      await execAsync('pip install semgrep');
      return true;
    } catch {
      return false;
    }
  }
}

export default SemgrepMCP;