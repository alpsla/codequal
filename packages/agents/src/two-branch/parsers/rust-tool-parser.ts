/**
 * Rust Tool Output Parser
 * Parses real output from Rust analysis tools:
 * - Clippy (linting and code quality)
 * - cargo-audit (security vulnerabilities)
 * - cargo-outdated (dependency management)
 */

import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);

export interface RustIssue {
  id: string;
  type: 'security' | 'performance' | 'quality' | 'bug' | 'style';
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
}

export interface RustToolResult {
  tool: string;
  executionTime: number;
  exitCode: number;
  issues: RustIssue[];
  rawOutput?: string;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export class RustToolParser {
  
  /**
   * Run Clippy and parse its output
   */
  async runClippy(repoPath: string, files?: string[]): Promise<RustToolResult> {
    const startTime = Date.now();
    let issues: RustIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run clippy with JSON output for better parsing
      const command = files && files.length > 0
        ? `cd ${repoPath} && cargo clippy --message-format=json -- -W clippy::all 2>&1`
        : `cd ${repoPath} && cargo clippy --message-format=json -- -W clippy::all 2>&1`;
      
      const { stdout, stderr } = await exec(command, { 
        maxBuffer: 10 * 1024 * 1024,  // 10MB buffer
        timeout: 120000  // 2 minute timeout
      });
      
      rawOutput = stdout + stderr;
      
      // Parse JSON output line by line
      const lines = rawOutput.split('\n');
      for (const line of lines) {
        if (line.trim() && line.startsWith('{')) {
          try {
            const msg = JSON.parse(line);
            if (msg.reason === 'compiler-message' && msg.message) {
              const issue = this.parseClippyMessage(msg.message);
              if (issue) {
                issues.push(issue);
              }
            }
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      }

      // If no JSON output, try parsing text output
      if (issues.length === 0) {
        issues = this.parseClippyTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // Even if clippy fails, try to parse any output
      issues = this.parseClippyTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'clippy',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000), // Limit output size
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run cargo-audit and parse its output
   */
  async runCargoAudit(repoPath: string): Promise<RustToolResult> {
    const startTime = Date.now();
    let issues: RustIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run cargo audit with JSON output
      const { stdout, stderr } = await exec(
        `cd ${repoPath} && cargo audit --json 2>&1`,
        { 
          maxBuffer: 5 * 1024 * 1024,
          timeout: 60000
        }
      );
      
      rawOutput = stdout;
      
      // Parse JSON output
      try {
        const auditResult = JSON.parse(stdout);
        if (auditResult.vulnerabilities) {
          issues = this.parseCargoAuditVulnerabilities(auditResult.vulnerabilities);
        }
      } catch (e) {
        // Fallback to text parsing
        issues = this.parseCargoAuditTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // Try to parse any available output
      issues = this.parseCargoAuditTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'cargo-audit',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Run cargo-outdated and parse its output
   */
  async runCargoOutdated(repoPath: string): Promise<RustToolResult> {
    const startTime = Date.now();
    let issues: RustIssue[] = [];
    let exitCode = 0;
    let rawOutput = '';

    try {
      // Run cargo outdated
      const { stdout, stderr } = await exec(
        `cd ${repoPath} && cargo outdated --format json 2>&1`,
        { 
          maxBuffer: 5 * 1024 * 1024,
          timeout: 60000
        }
      );
      
      rawOutput = stdout;
      
      // Parse JSON output
      try {
        const outdatedResult = JSON.parse(stdout);
        if (outdatedResult.dependencies) {
          issues = this.parseCargoOutdatedDependencies(outdatedResult.dependencies);
        }
      } catch (e) {
        // Fallback to text parsing
        issues = this.parseCargoOutdatedTextOutput(rawOutput);
      }

    } catch (error: any) {
      exitCode = error.code || 1;
      rawOutput = error.stdout || error.message;
      // Try to parse any available output
      issues = this.parseCargoOutdatedTextOutput(rawOutput);
    }

    const executionTime = (Date.now() - startTime) / 1000;
    
    return {
      tool: 'cargo-outdated',
      executionTime,
      exitCode,
      issues,
      rawOutput: rawOutput.substring(0, 5000),
      summary: this.generateSummary(issues)
    };
  }

  /**
   * Parse Clippy JSON message format
   */
  private parseClippyMessage(message: any): RustIssue | null {
    if (!message.spans || message.spans.length === 0) {
      return null;
    }

    const primarySpan = message.spans.find((s: any) => s.is_primary) || message.spans[0];
    
    return {
      id: `clippy-${Date.now()}-${Math.random()}`,
      type: this.mapClippyLevel(message.level),
      severity: this.mapClippySeverity(message.level),
      file: primarySpan.file_name,
      line: primarySpan.line_start,
      column: primarySpan.column_start,
      message: message.message,
      suggestion: message.children?.map((c: any) => c.message).join(' '),
      tool: 'clippy',
      category: message.code?.code,
      help: message.children?.find((c: any) => c.level === 'help')?.message
    };
  }

  /**
   * Parse Clippy text output (fallback)
   */
  private parseClippyTextOutput(output: string): RustIssue[] {
    const issues: RustIssue[] = [];
    const lines = output.split('\n');
    
    const warningRegex = /^(warning|error):\s+(.+?)$/;
    const locationRegex = /^\s+-->\s+(.+?):(\d+):(\d+)$/;
    
    let currentIssue: Partial<RustIssue> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const warningMatch = line.match(warningRegex);
      if (warningMatch) {
        if (currentIssue && currentIssue.file) {
          issues.push(currentIssue as RustIssue);
        }
        
        currentIssue = {
          id: `clippy-${Date.now()}-${i}`,
          type: warningMatch[1] === 'error' ? 'bug' : 'quality',
          severity: warningMatch[1] === 'error' ? 'high' : 'medium',
          message: warningMatch[2],
          tool: 'clippy'
        };
      }
      
      const locationMatch = line.match(locationRegex);
      if (locationMatch && currentIssue) {
        currentIssue.file = locationMatch[1];
        currentIssue.line = parseInt(locationMatch[2]);
        currentIssue.column = parseInt(locationMatch[3]);
      }
    }
    
    if (currentIssue && currentIssue.file) {
      issues.push(currentIssue as RustIssue);
    }
    
    return issues;
  }

  /**
   * Parse cargo-audit vulnerabilities
   */
  private parseCargoAuditVulnerabilities(vulnerabilities: any): RustIssue[] {
    const issues: RustIssue[] = [];
    
    for (const vuln of vulnerabilities.list || []) {
      issues.push({
        id: vuln.advisory?.id || `cargo-audit-${Date.now()}`,
        type: 'security',
        severity: this.mapAuditSeverity(vuln.advisory?.cvss),
        file: 'Cargo.toml',
        line: 1,
        message: `${vuln.advisory?.title || 'Security vulnerability'} in ${vuln.package?.name} ${vuln.package?.version}`,
        suggestion: `Update ${vuln.package?.name} to ${vuln.versions?.patched?.[0] || 'latest version'}`,
        tool: 'cargo-audit',
        category: vuln.advisory?.categories?.join(', '),
        help: vuln.advisory?.description
      });
    }
    
    return issues;
  }

  /**
   * Parse cargo-audit text output (fallback)
   */
  private parseCargoAuditTextOutput(output: string): RustIssue[] {
    const issues: RustIssue[] = [];
    const lines = output.split('\n');
    
    const vulnRegex = /^Crate:\s+(.+)$/;
    const versionRegex = /^Version:\s+(.+)$/;
    const titleRegex = /^Title:\s+(.+)$/;
    
    let currentVuln: any = {};
    
    for (const line of lines) {
      if (line.match(vulnRegex)) {
        if (currentVuln.crate) {
          issues.push({
            id: `cargo-audit-${Date.now()}-${issues.length}`,
            type: 'security',
            severity: 'high',
            file: 'Cargo.toml',
            line: 1,
            message: `Security vulnerability: ${currentVuln.title || 'Unknown'} in ${currentVuln.crate} ${currentVuln.version || ''}`,
            tool: 'cargo-audit'
          });
        }
        currentVuln = { crate: line.match(vulnRegex)![1] };
      } else if (line.match(versionRegex)) {
        currentVuln.version = line.match(versionRegex)![1];
      } else if (line.match(titleRegex)) {
        currentVuln.title = line.match(titleRegex)![1];
      }
    }
    
    if (currentVuln.crate) {
      issues.push({
        id: `cargo-audit-${Date.now()}-${issues.length}`,
        type: 'security',
        severity: 'high',
        file: 'Cargo.toml',
        line: 1,
        message: `Security vulnerability: ${currentVuln.title || 'Unknown'} in ${currentVuln.crate} ${currentVuln.version || ''}`,
        tool: 'cargo-audit'
      });
    }
    
    return issues;
  }

  /**
   * Parse cargo-outdated dependencies
   */
  private parseCargoOutdatedDependencies(dependencies: any[]): RustIssue[] {
    const issues: RustIssue[] = [];
    
    for (const dep of dependencies) {
      if (dep.outdated) {
        issues.push({
          id: `cargo-outdated-${dep.name}`,
          type: 'quality',
          severity: dep.compatible ? 'low' : 'medium',
          file: 'Cargo.toml',
          line: 1,
          message: `Outdated dependency: ${dep.name} ${dep.version} -> ${dep.latest}`,
          suggestion: `Update ${dep.name} to ${dep.latest}`,
          tool: 'cargo-outdated',
          category: 'dependency'
        });
      }
    }
    
    return issues;
  }

  /**
   * Parse cargo-outdated text output (fallback)
   */
  private parseCargoOutdatedTextOutput(output: string): RustIssue[] {
    const issues: RustIssue[] = [];
    const lines = output.split('\n');
    
    // Look for table format: Name  Project  Compat  Latest
    const depRegex = /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/;
    
    for (const line of lines) {
      const match = line.match(depRegex);
      if (match && match[1] !== 'Name' && match[2] !== '---') {
        if (match[2] !== match[4]) {  // Current version != Latest
          issues.push({
            id: `cargo-outdated-${match[1]}`,
            type: 'quality',
            severity: match[2] === match[3] ? 'low' : 'medium',
            file: 'Cargo.toml',
            line: 1,
            message: `Outdated dependency: ${match[1]} ${match[2]} -> ${match[4]}`,
            suggestion: `Update ${match[1]} to ${match[4]}`,
            tool: 'cargo-outdated'
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * Map Clippy level to issue type
   */
  private mapClippyLevel(level: string): RustIssue['type'] {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'bug';
      case 'warning':
        if (level.includes('perf')) return 'performance';
        if (level.includes('style')) return 'style';
        return 'quality';
      default:
        return 'quality';
    }
  }

  /**
   * Map Clippy severity
   */
  private mapClippySeverity(level: string): RustIssue['severity'] {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'high';
      case 'warning':
        return 'medium';
      case 'note':
      case 'help':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Map audit CVSS score to severity
   */
  private mapAuditSeverity(cvss?: string): RustIssue['severity'] {
    if (!cvss) return 'high';
    
    const score = parseFloat(cvss);
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(issues: RustIssue[]) {
    return {
      total: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }
}

export default RustToolParser;