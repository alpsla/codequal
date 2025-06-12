/**
 * NPM Audit Direct Adapter
 * Runs npm audit to find security vulnerabilities in dependencies
 */

import { DirectToolAdapter } from './base-adapter';
import {
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface NpmAuditVulnerability {
  name: string;
  severity: 'info' | 'low' | 'moderate' | 'high' | 'critical';
  via: string | { title: string; url: string; severity: string }[];
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean | {
    name: string;
    version: string;
    isSemVerMajor: boolean;
  };
}

interface NpmAuditReport {
  vulnerabilities: Record<string, NpmAuditVulnerability>;
  metadata: {
    vulnerabilities: {
      info: number;
      low: number;
      moderate: number;
      high: number;
      critical: number;
      total: number;
    };
    dependencies: {
      prod: number;
      dev: number;
      optional: number;
      peer: number;
      peerOptional: number;
      total: number;
    };
  };
}

export class NpmAuditDirectAdapter extends DirectToolAdapter {
  readonly id = 'npm-audit-direct';
  readonly name = 'NPM Audit Direct';
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'vulnerability-scanning',
      category: 'security',
      languages: ['javascript', 'typescript'],
      fileTypes: ['package.json', 'package-lock.json']
    },
    {
      name: 'dependency-security',
      category: 'security',
      languages: ['javascript', 'typescript'],
      fileTypes: ['package.json', 'package-lock.json']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 60000, // npm audit can take time for large projects
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  /**
   * Get health check command
   */
  protected getHealthCheckCommand(): { cmd: string; args: string[] } {
    return { cmd: 'npm', args: ['--version'] };
  }
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // Only for security agent
    if (context.agentRole !== 'security') {
      return false;
    }
    
    // Check for package.json or package-lock.json
    return context.pr.files.some(file => 
      file.path === 'package.json' || 
      file.path.endsWith('/package.json') ||
      file.path === 'package-lock.json' ||
      file.path.endsWith('/package-lock.json')
    );
  }
  
  /**
   * Execute npm audit analysis
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Find all package.json files
      const packageJsonFiles = context.pr.files.filter(file => 
        file.path.endsWith('package.json')
      );
      
      if (packageJsonFiles.length === 0) {
        return this.createEmptyResult(startTime);
      }
      
      const findings: ToolFinding[] = [];
      const totalVulnerabilities = {
        info: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
        total: 0
      };
      
      // Analyze each package.json directory
      for (const packageFile of packageJsonFiles) {
        const dir = path.dirname(packageFile.path);
        const workingDir = path.join(process.cwd(), dir);
        
        try {
          // Check if directory exists and has package-lock.json
          await fs.access(workingDir);
          const lockFile = path.join(workingDir, 'package-lock.json');
          
          try {
            await fs.access(lockFile);
          } catch {
            // No lock file, can't run audit
            findings.push({
              type: 'issue',
              severity: 'medium',
              category: 'security',
              message: 'No package-lock.json found - npm audit requires a lock file',
              file: packageFile.path,
              ruleId: 'missing-lock-file'
            });
            continue;
          }
          
          // Run npm audit
          const auditReport = await this.runNpmAudit(workingDir);
          
          // Update total counts
          if (auditReport.metadata?.vulnerabilities) {
            totalVulnerabilities.info += auditReport.metadata.vulnerabilities.info || 0;
            totalVulnerabilities.low += auditReport.metadata.vulnerabilities.low || 0;
            totalVulnerabilities.moderate += auditReport.metadata.vulnerabilities.moderate || 0;
            totalVulnerabilities.high += auditReport.metadata.vulnerabilities.high || 0;
            totalVulnerabilities.critical += auditReport.metadata.vulnerabilities.critical || 0;
            totalVulnerabilities.total += auditReport.metadata.vulnerabilities.total || 0;
          }
          
          // Generate findings from audit report
          const dirFindings = this.generateFindings(auditReport, dir);
          findings.push(...dirFindings);
        } catch (error) {
          // Directory might not exist or npm command failed
          console.warn(`Skipping ${dir}: ${error}`);
        }
      }
      
      // Calculate security score
      const securityScore = this.calculateSecurityScore(totalVulnerabilities);
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          vulnerabilitiesTotal: totalVulnerabilities.total,
          vulnerabilitiesCritical: totalVulnerabilities.critical,
          vulnerabilitiesHigh: totalVulnerabilities.high,
          vulnerabilitiesModerate: totalVulnerabilities.moderate,
          vulnerabilitiesLow: totalVulnerabilities.low,
          vulnerabilitiesInfo: totalVulnerabilities.info,
          securityScore,
          fixableVulnerabilities: findings.filter(f => f.autoFixable).length,
          criticalFindings: totalVulnerabilities.critical,
          highFindings: totalVulnerabilities.high
        }
      };
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'NPM_AUDIT_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Run npm audit and get JSON report
   */
  private async runNpmAudit(workingDir: string): Promise<NpmAuditReport> {
    try {
      // Run npm audit --json
      // Note: npm audit exits with non-zero if vulnerabilities found
      const { stdout } = await execAsync('npm audit --json', {
        cwd: workingDir,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large reports
      }).catch(error => {
        // If we have stdout with JSON, use it despite non-zero exit
        if (error.stdout) {
          return { stdout: error.stdout };
        }
        throw error;
      });
      
      if (!stdout || stdout.trim() === '') {
        return {
          vulnerabilities: {},
          metadata: {
            vulnerabilities: {
              info: 0,
              low: 0,
              moderate: 0,
              high: 0,
              critical: 0,
              total: 0
            },
            dependencies: {
              prod: 0,
              dev: 0,
              optional: 0,
              peer: 0,
              peerOptional: 0,
              total: 0
            }
          }
        };
      }
      
      const auditData = JSON.parse(stdout);
      
      // Handle different npm audit output formats
      if (auditData.auditReportVersion === 2) {
        // npm 7+ format
        return auditData;
      } else {
        // Convert older format to v2 structure
        return this.convertToV2Format(auditData);
      }
    } catch (error) {
      console.error('Error running npm audit:', error);
      return {
        vulnerabilities: {},
        metadata: {
          vulnerabilities: {
            info: 0,
            low: 0,
            moderate: 0,
            high: 0,
            critical: 0,
            total: 0
          },
          dependencies: {
            prod: 0,
            dev: 0,
            optional: 0,
            peer: 0,
            peerOptional: 0,
            total: 0
          }
        }
      };
    }
  }
  
  /**
   * Convert older npm audit format to v2
   */
  private convertToV2Format(auditData: any): NpmAuditReport {
    // Handle older npm audit formats
    const vulnerabilities: Record<string, NpmAuditVulnerability> = {};
    const metadata = auditData.metadata || {};
    
    if (auditData.advisories) {
      // npm 6 format
      Object.entries(auditData.advisories).forEach(([id, advisory]: [string, any]) => {
        vulnerabilities[advisory.module_name] = {
          name: advisory.module_name,
          severity: advisory.severity,
          via: [{
            title: advisory.title,
            url: advisory.url,
            severity: advisory.severity
          }],
          effects: advisory.findings?.map((f: any) => f.paths[0]) || [],
          range: advisory.vulnerable_versions,
          nodes: advisory.findings?.map((f: any) => f.version) || [],
          fixAvailable: advisory.patched_versions !== '<0.0.0'
        };
      });
    }
    
    return {
      vulnerabilities,
      metadata: {
        vulnerabilities: metadata.vulnerabilities || {
          info: 0,
          low: 0,
          moderate: 0,
          high: 0,
          critical: 0,
          total: 0
        },
        dependencies: metadata.dependencies || {
          prod: 0,
          dev: 0,
          optional: 0,
          peer: 0,
          peerOptional: 0,
          total: 0
        }
      }
    };
  }
  
  /**
   * Generate findings from audit report
   */
  private generateFindings(report: NpmAuditReport, directory: string): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Create findings for each vulnerability
    Object.entries(report.vulnerabilities || {}).forEach(([packageName, vuln]) => {
      const severity = this.mapSeverity(vuln.severity);
      const via = Array.isArray(vuln.via) ? vuln.via : [vuln.via];
      
      // Get vulnerability details
      const details = via.map(v => {
        if (typeof v === 'string') return v;
        return `${v.title} (${v.url})`;
      }).join(', ');
      
      const finding: ToolFinding = {
        type: 'issue',
        severity,
        category: 'security',
        message: `Security vulnerability in ${packageName}: ${vuln.severity} severity`,
        file: path.join(directory, 'package.json'),
        ruleId: `npm-audit-${vuln.severity}`,
        documentation: this.formatVulnerabilityDoc(packageName, vuln, details),
        autoFixable: this.isAutoFixable(vuln.fixAvailable)
      };
      
      if (finding.autoFixable) {
        finding.fix = {
          description: this.getFixDescription(vuln.fixAvailable),
          changes: [] // npm audit fix handles this
        };
      }
      
      findings.push(finding);
    });
    
    // Add summary finding if there are many vulnerabilities
    const vulnCount = Object.keys(report.vulnerabilities || {}).length;
    if (vulnCount > 10) {
      findings.unshift({
        type: 'issue',
        severity: 'high',
        category: 'security',
        message: `🚨 ${vulnCount} security vulnerabilities found in dependencies`,
        file: path.join(directory, 'package.json'),
        ruleId: 'multiple-vulnerabilities',
        documentation: this.formatSummaryDoc(report.metadata.vulnerabilities)
      });
    }
    
    return findings;
  }
  
  /**
   * Map npm severity to tool severity
   */
  private mapSeverity(npmSeverity: string): ToolFinding['severity'] {
    switch (npmSeverity) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'moderate': return 'medium';
      case 'low': return 'low';
      case 'info': return 'info';
      default: return 'medium';
    }
  }
  
  /**
   * Check if vulnerability is auto-fixable
   */
  private isAutoFixable(fixAvailable: boolean | any): boolean {
    if (typeof fixAvailable === 'boolean') {
      return fixAvailable;
    }
    return fixAvailable && !fixAvailable.isSemVerMajor;
  }
  
  /**
   * Get fix description
   */
  private getFixDescription(fixAvailable: boolean | any): string {
    if (typeof fixAvailable === 'boolean') {
      return fixAvailable ? 'Run npm audit fix' : 'Manual update required';
    }
    
    if (fixAvailable.isSemVerMajor) {
      return `Update to ${fixAvailable.name}@${fixAvailable.version} (breaking change)`;
    }
    
    return `Run npm audit fix to update to ${fixAvailable.name}@${fixAvailable.version}`;
  }
  
  /**
   * Format vulnerability documentation
   */
  private formatVulnerabilityDoc(packageName: string, vuln: NpmAuditVulnerability, details: string): string {
    let doc = `## Security Vulnerability: ${packageName}\n\n`;
    doc += `**Severity**: ${vuln.severity.toUpperCase()}\n`;
    doc += `**Vulnerable Versions**: ${vuln.range}\n`;
    doc += `**Details**: ${details}\n\n`;
    
    if (vuln.effects && vuln.effects.length > 0) {
      doc += `**Affected Dependencies**:\n`;
      vuln.effects.forEach(effect => {
        doc += `- ${effect}\n`;
      });
      doc += '\n';
    }
    
    if (vuln.fixAvailable) {
      if (typeof vuln.fixAvailable === 'boolean') {
        doc += '✅ **Fix Available**: Run `npm audit fix`\n';
      } else {
        doc += `✅ **Fix Available**: Update to ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`;
        if (vuln.fixAvailable.isSemVerMajor) {
          doc += ' (⚠️ Breaking change)';
        }
        doc += '\n';
      }
    } else {
      doc += '❌ **No automated fix available** - Manual intervention required\n';
    }
    
    return doc;
  }
  
  /**
   * Format summary documentation
   */
  private formatSummaryDoc(vulnerabilities: any): string {
    let doc = '## Security Vulnerability Summary\n\n';
    doc += '| Severity | Count |\n';
    doc += '|----------|-------|\n';
    doc += `| Critical | ${vulnerabilities.critical || 0} |\n`;
    doc += `| High | ${vulnerabilities.high || 0} |\n`;
    doc += `| Moderate | ${vulnerabilities.moderate || 0} |\n`;
    doc += `| Low | ${vulnerabilities.low || 0} |\n`;
    doc += `| Info | ${vulnerabilities.info || 0} |\n`;
    doc += `| **Total** | **${vulnerabilities.total || 0}** |\n\n`;
    
    doc += '### Recommended Actions:\n';
    doc += '1. Run `npm audit fix` to automatically fix compatible issues\n';
    doc += '2. Run `npm audit fix --force` for breaking changes (test thoroughly)\n';
    doc += '3. Review and manually update packages with no automated fixes\n';
    doc += '4. Consider using `npm audit fix --dry-run` to preview changes\n';
    
    return doc;
  }
  
  /**
   * Calculate security score (0-10)
   */
  private calculateSecurityScore(vulnerabilities: any): number {
    if (vulnerabilities.total === 0) return 10;
    
    // Weighted scoring based on severity
    const criticalWeight = 10;
    const highWeight = 5;
    const moderateWeight = 2;
    const lowWeight = 1;
    const infoWeight = 0.5;
    
    const totalWeight = 
      (vulnerabilities.critical * criticalWeight) +
      (vulnerabilities.high * highWeight) +
      (vulnerabilities.moderate * moderateWeight) +
      (vulnerabilities.low * lowWeight) +
      (vulnerabilities.info * infoWeight);
    
    // Scale to 0-10 (10 = no vulnerabilities, 0 = many critical)
    let score = 10 - (totalWeight / 10);
    score = Math.max(0, Math.min(10, score));
    
    return Math.round(score * 10) / 10;
  }
  
  /**
   * Create empty result when no package.json found
   */
  private createEmptyResult(startTime: number): ToolResult {
    return {
      success: true,
      toolId: this.id,
      executionTime: Date.now() - startTime,
      findings: [],
      metrics: {
        vulnerabilitiesTotal: 0,
        vulnerabilitiesCritical: 0,
        vulnerabilitiesHigh: 0,
        vulnerabilitiesModerate: 0,
        vulnerabilitiesLow: 0,
        vulnerabilitiesInfo: 0,
        securityScore: 10,
        fixableVulnerabilities: 0,
        criticalFindings: 0,
        highFindings: 0
      }
    };
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Security vulnerability scanner for npm dependencies',
      author: 'CodeQual',
      homepage: 'https://docs.npmjs.com/cli/v10/commands/npm-audit',
      documentationUrl: 'https://docs.codequal.com/tools/npm-audit',
      supportedRoles: ['security'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      supportedFrameworks: ['node', 'react', 'vue', 'angular', 'express', 'next', 'nuxt'],
      tags: ['npm', 'security', 'vulnerabilities', 'audit', 'dependencies', 'CVE'],
      securityVerified: true,
      lastVerified: new Date('2025-06-11')
    };
  }
}

// Export singleton instance
export const npmAuditDirectAdapter = new NpmAuditDirectAdapter();
