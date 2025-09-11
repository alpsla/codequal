import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VulnerabilityInfo {
  severity: 'info' | 'low' | 'moderate' | 'high' | 'critical';
  module_name: string;
  title: string;
  vulnerable_versions: string;
  recommendation: string;
  cves: string[];
  url?: string;
}

interface NpmAuditResult {
  metadata: {
    totalDependencies: number;
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
      total: number;
    };
  };
  advisories: Record<string, VulnerabilityInfo>;
}

interface MCPFinding {
  type: 'vulnerability';
  severity: string;
  category: 'dependency';
  message: string;
  package: string;
  version: string;
  cve?: string;
  recommendation: string;
  file: string;
  line?: number;
}

export class NpmAuditMCP {
  /**
   * Analyzes a package for dependency vulnerabilities using npm audit
   * @param packagePath Path to the directory containing package.json
   * @returns MCP-formatted security findings
   */
  async analyze(packagePath = '.') {
    try {
      // Run npm audit with JSON output
      const { stdout } = await execAsync('npm audit --json', {
        cwd: packagePath,
        timeout: 60000, // 60 second timeout
      });
      
      const auditResult: NpmAuditResult = JSON.parse(stdout);
      
      // Format for MCP
      return {
        tool: 'npm-audit',
        success: true,
        findings: this.convertToMCPFormat(auditResult),
        metrics: {
          total: auditResult.metadata.totalDependencies,
          vulnerabilities: auditResult.metadata.vulnerabilities
        }
      };
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      // We need to handle this case and still parse the output
      if (this.isNpmAuditError(error)) {
        try {
          const stdout = (error as any).stdout;
          const auditResult: NpmAuditResult = JSON.parse(stdout);
          
          return {
            tool: 'npm-audit',
            success: true,
            findings: this.convertToMCPFormat(auditResult),
            metrics: {
              total: auditResult.metadata.totalDependencies,
              vulnerabilities: auditResult.metadata.vulnerabilities
            }
          };
        } catch (parseError) {
          // If parsing fails, return the original error
          return this.handleError(error);
        }
      }
      
      return this.handleError(error);
    }
  }

  /**
   * Runs npm audit fix to automatically fix vulnerabilities
   * @param packagePath Path to the directory containing package.json
   * @param force Whether to force breaking changes
   */
  async fix(packagePath = '.', force = false) {
    try {
      const command = force ? 'npm audit fix --force' : 'npm audit fix';
      const { stdout, stderr } = await execAsync(command, {
        cwd: packagePath,
        timeout: 120000, // 2 minute timeout for fixes
      });
      
      return {
        tool: 'npm-audit',
        action: 'fix',
        success: true,
        message: stdout || 'Vulnerabilities fixed successfully',
        details: stderr
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Converts npm audit format to MCP findings format
   */
  private convertToMCPFormat(auditResult: NpmAuditResult): MCPFinding[] {
    const findings: MCPFinding[] = [];
    
    // Convert each advisory to MCP format
    for (const [key, advisory] of Object.entries(auditResult.advisories || {})) {
      findings.push({
        type: 'vulnerability',
        severity: advisory.severity,
        category: 'dependency',
        message: advisory.title,
        package: advisory.module_name,
        version: advisory.vulnerable_versions,
        cve: advisory.cves?.join(', '),
        recommendation: advisory.recommendation,
        file: 'package.json', // Dependencies are in package.json
        line: undefined // Line number not available for dependencies
      });
    }
    
    return findings;
  }

  /**
   * Checks if the error is from npm audit (non-zero exit with vulnerabilities)
   */
  private isNpmAuditError(error: unknown): boolean {
    return !!(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'stdout' in error &&
      (error as any).stdout
    );
  }

  /**
   * Handles errors and returns a consistent error response
   */
  private handleError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      tool: 'npm-audit',
      success: false,
      error: errorMessage,
      findings: [],
      metrics: null
    };
  }

  /**
   * Gets a summary of vulnerabilities in a human-readable format
   */
  async getSummary(packagePath = '.'): Promise<string> {
    const result = await this.analyze(packagePath);
    
    if (!result.success) {
      return `Error running npm audit: ${(result as any).error}`;
    }
    
    const vulns = result.metrics?.vulnerabilities;
    if (!vulns || vulns.total === 0) {
      return 'No vulnerabilities found';
    }
    
    const parts = [];
    if (vulns.critical > 0) parts.push(`${vulns.critical} critical`);
    if (vulns.high > 0) parts.push(`${vulns.high} high`);
    if (vulns.moderate > 0) parts.push(`${vulns.moderate} moderate`);
    if (vulns.low > 0) parts.push(`${vulns.low} low`);
    if (vulns.info > 0) parts.push(`${vulns.info} info`);
    
    return `Found ${vulns.total} vulnerabilities: ${parts.join(', ')}`;
  }
}