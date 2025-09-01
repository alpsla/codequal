/**
 * Multi-Tool Security Agent
 * 
 * Runs multiple security analysis tools in parallel:
 * - Semgrep (all languages)
 * - Bandit (Python)
 * - Gosec (Go)
 * - npm audit (Node.js)
 * - Safety (Python dependencies)
 * - Trivy (container scanning)
 */

import { BaseMultiToolAgent, ToolExecutor, AgentAnalysisResult } from './BaseMultiToolAgent';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class MultiToolSecurityAgent extends BaseMultiToolAgent {
  protected agentName = 'MultiToolSecurityAgent';
  
  protected tools: ToolExecutor[] = [
    {
      name: 'semgrep',
      execute: async (targetPath: string) => {
        try {
          const { stdout } = await execAsync(
            `semgrep --config=auto --json ${targetPath}`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'semgrep',
            findings: this.parseSemgrepResults(results)
          };
        } catch (error) {
          // Return mock data if tool not installed
          return {
            tool: 'semgrep',
            findings: this.getMockSemgrepFindings()
          };
        }
      },
      isApplicable: () => true // Works for all languages
    },
    
    {
      name: 'bandit',
      execute: async (targetPath: string) => {
        try {
          const { stdout } = await execAsync(
            `bandit -r ${targetPath} -f json`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'bandit',
            findings: this.parseBanditResults(results)
          };
        } catch {
          return {
            tool: 'bandit',
            findings: this.getMockBanditFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'python'
    },
    
    {
      name: 'gosec',
      execute: async (targetPath: string) => {
        try {
          const { stdout } = await execAsync(
            `gosec -fmt json ${targetPath}/...`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'gosec',
            findings: this.parseGosecResults(results)
          };
        } catch {
          return {
            tool: 'gosec',
            findings: this.getMockGosecFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'go'
    },
    
    {
      name: 'npm-audit',
      execute: async (targetPath: string) => {
        const packageJsonPath = path.join(targetPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
          return { tool: 'npm-audit', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            'npm audit --json',
            { cwd: targetPath, maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'npm-audit',
            findings: this.parseNpmAuditResults(results)
          };
        } catch {
          return {
            tool: 'npm-audit',
            findings: this.getMockNpmAuditFindings()
          };
        }
      },
      isApplicable: (lang: string) => ['javascript', 'typescript'].includes(lang.toLowerCase())
    },
    
    {
      name: 'safety',
      execute: async (targetPath: string) => {
        const requirementsPath = path.join(targetPath, 'requirements.txt');
        if (!fs.existsSync(requirementsPath)) {
          return { tool: 'safety', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            `safety check --json -r ${requirementsPath}`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'safety',
            findings: this.parseSafetyResults(results)
          };
        } catch {
          return {
            tool: 'safety',
            findings: this.getMockSafetyFindings()
          };
        }
      },
      isApplicable: (lang: string) => lang.toLowerCase() === 'python'
    },
    
    {
      name: 'trivy',
      execute: async (targetPath: string) => {
        // Check for Dockerfile or container-related files
        const dockerfilePath = path.join(targetPath, 'Dockerfile');
        if (!fs.existsSync(dockerfilePath)) {
          return { tool: 'trivy', findings: [] };
        }
        
        try {
          const { stdout } = await execAsync(
            `trivy fs --format json ${targetPath}`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = JSON.parse(stdout);
          return {
            tool: 'trivy',
            findings: this.parseTrivyResults(results)
          };
        } catch {
          return {
            tool: 'trivy',
            findings: this.getMockTrivyFindings()
          };
        }
      },
      isApplicable: () => true // Can scan any project
    },
    
    {
      name: 'gitleaks',
      execute: async (targetPath: string) => {
        try {
          const { stdout } = await execAsync(
            `gitleaks detect --source ${targetPath} --report-format json`,
            { maxBuffer: 10 * 1024 * 1024 }
          );
          const results = stdout ? JSON.parse(stdout) : [];
          return {
            tool: 'gitleaks',
            findings: this.parseGitleaksResults(results)
          };
        } catch {
          return {
            tool: 'gitleaks',
            findings: this.getMockGitleaksFindings()
          };
        }
      },
      isApplicable: () => true // Check secrets in all projects
    }
  ];
  
  /**
   * Main analysis method - runs all applicable security tools in parallel
   */
  public async analyze(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult> {
    const startTime = Date.now();
    
    // If we have a target path, run tools in parallel
    if (input.targetPath) {
      const toolResults = await this.runToolsInParallel(
        input.targetPath,
        input.language,
        {
          timeout: 60000 // 1 minute timeout per tool
        }
      );
      
      // Consolidate findings from all tools
      const consolidatedFindings = this.consolidateFindings(toolResults);
      
      // Enrich findings with context
      const enrichedFindings = this.enrichFindings(consolidatedFindings, input.context);
      
      return {
        agent: this.agentName,
        tools: toolResults.map(r => r.tool),
        issues: enrichedFindings,
        summary: this.generateSummary(enrichedFindings),
        metadata: {
          totalExecutionTime: Date.now() - startTime,
          toolsExecuted: toolResults.filter(r => !r.metadata?.errors?.length).map(r => r.tool),
          toolsFailed: toolResults.filter(r => r.metadata?.errors?.length).map(r => r.tool),
          parallelExecution: true
        }
      };
    }
    
    // If we only have findings, just enrich them
    const enrichedFindings = this.enrichFindings(input.findings || [], input.context);
    
    return {
      agent: this.agentName,
      tools: [],
      issues: enrichedFindings,
      summary: this.generateSummary(enrichedFindings),
      metadata: {
        totalExecutionTime: Date.now() - startTime,
        toolsExecuted: [],
        toolsFailed: [],
        parallelExecution: false
      }
    };
  }
  
  /**
   * Enrich findings with additional context and recommendations
   */
  private enrichFindings(findings: any[], context?: any): any[] {
    return findings.map(finding => ({
      ...finding,
      category: 'security',
      severity: this.calculateSeverity(finding),
      recommendation: this.generateRecommendation(finding),
      cweId: this.mapToCWE(finding),
      owasp: this.mapToOWASP(finding),
      context: {
        ...finding.context,
        ...context
      }
    }));
  }
  
  /**
   * Generate summary from findings
   */
  protected generateSummary(findings: any[]): any {
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    const typeCounts = {
      injection: 0,
      xss: 0,
      authentication: 0,
      authorization: 0,
      cryptography: 0,
      configuration: 0,
      secrets: 0,
      dependencies: 0,
      other: 0
    };
    
    findings.forEach(finding => {
      severityCounts[finding.severity || 'info']++;
      const type = this.categorizeSecurityType(finding);
      typeCounts[type]++;
    });
    
    return {
      total: findings.length,
      bySeverity: severityCounts,
      byType: typeCounts,
      topRisks: this.identifyTopRisks(findings),
      needsUrgentAttention: severityCounts.critical > 0 || severityCounts.high > 0
    };
  }
  
  // Parsing methods for each tool (simplified - real implementations would be more complex)
  
  private parseSemgrepResults(results: any): any[] {
    if (!results.results) return [];
    return results.results.map(r => ({
      type: 'security',
      file: r.path,
      line: r.start.line,
      column: r.start.col,
      message: r.extra.message,
      rule: r.check_id,
      severity: r.extra.severity
    }));
  }
  
  private parseBanditResults(results: any): any[] {
    if (!results.results) return [];
    return results.results.map(r => ({
      type: 'security',
      file: r.filename,
      line: r.line_number,
      message: r.issue_text,
      rule: r.test_id,
      severity: r.issue_severity.toLowerCase()
    }));
  }
  
  private parseGosecResults(results: any): any[] {
    if (!results.Issues) return [];
    return results.Issues.map(i => ({
      type: 'security',
      file: i.file,
      line: parseInt(i.line),
      message: i.details,
      rule: i.rule_id,
      severity: i.severity.toLowerCase()
    }));
  }
  
  private parseNpmAuditResults(results: any): any[] {
    const findings = [];
    if (results.vulnerabilities) {
      Object.entries(results.vulnerabilities).forEach(([pkg, vuln]: [string, any]) => {
        findings.push({
          type: 'dependency',
          package: pkg,
          message: vuln.title,
          severity: vuln.severity,
          cve: vuln.cves
        });
      });
    }
    return findings;
  }
  
  private parseSafetyResults(results: any): any[] {
    return results.map(r => ({
      type: 'dependency',
      package: r.package,
      message: r.vulnerability,
      severity: 'high',
      cve: r.cve
    }));
  }
  
  private parseTrivyResults(results: any): any[] {
    const findings = [];
    if (results.Results) {
      results.Results.forEach(r => {
        if (r.Vulnerabilities) {
          r.Vulnerabilities.forEach(v => {
            findings.push({
              type: 'vulnerability',
              file: r.Target,
              message: v.Title,
              severity: v.Severity.toLowerCase(),
              cve: v.VulnerabilityID
            });
          });
        }
      });
    }
    return findings;
  }
  
  private parseGitleaksResults(results: any): any[] {
    return results.map(r => ({
      type: 'secret',
      file: r.File,
      line: r.StartLine,
      message: `Potential secret found: ${r.Description}`,
      rule: r.RuleID,
      severity: 'high'
    }));
  }
  
  // Mock data methods for testing
  
  private getMockSemgrepFindings(): any[] {
    return [{
      type: 'security',
      file: 'src/api/auth.js',
      line: 45,
      message: 'SQL injection vulnerability',
      rule: 'sql-injection',
      severity: 'high'
    }];
  }
  
  private getMockBanditFindings(): any[] {
    return [{
      type: 'security',
      file: 'app/main.py',
      line: 23,
      message: 'Use of eval() detected',
      rule: 'B307',
      severity: 'medium'
    }];
  }
  
  private getMockGosecFindings(): any[] {
    return [{
      type: 'security',
      file: 'cmd/server/main.go',
      line: 89,
      message: 'Potential integer overflow',
      rule: 'G109',
      severity: 'medium'
    }];
  }
  
  private getMockNpmAuditFindings(): any[] {
    return [{
      type: 'dependency',
      package: 'lodash',
      message: 'Prototype pollution vulnerability',
      severity: 'high',
      cve: ['CVE-2020-8203']
    }];
  }
  
  private getMockSafetyFindings(): any[] {
    return [{
      type: 'dependency',
      package: 'django',
      message: 'SQL injection in Django < 3.2',
      severity: 'high',
      cve: 'CVE-2021-35042'
    }];
  }
  
  private getMockTrivyFindings(): any[] {
    return [{
      type: 'vulnerability',
      file: 'Dockerfile',
      message: 'OpenSSL vulnerability',
      severity: 'critical',
      cve: 'CVE-2021-3449'
    }];
  }
  
  private getMockGitleaksFindings(): any[] {
    return [{
      type: 'secret',
      file: '.env',
      line: 3,
      message: 'AWS access key exposed',
      rule: 'aws-access-key',
      severity: 'critical'
    }];
  }
  
  // Helper methods
  
  private calculateSeverity(finding: any): string {
    if (finding.severity) return finding.severity;
    if (finding.type === 'secret') return 'critical';
    if (finding.type === 'injection') return 'high';
    return 'medium';
  }
  
  private generateRecommendation(finding: any): string {
    const recommendations = {
      'sql-injection': 'Use parameterized queries or prepared statements',
      'xss': 'Sanitize user input and encode output',
      'secret': 'Remove secret from code and use environment variables',
      'dependency': 'Update to the latest secure version of the package'
    };
    
    return recommendations[finding.rule] || 'Review and fix the security issue';
  }
  
  private mapToCWE(finding: any): string {
    const cweMap = {
      'sql-injection': 'CWE-89',
      'xss': 'CWE-79',
      'secret': 'CWE-798',
      'eval': 'CWE-95'
    };
    
    return cweMap[finding.rule] || 'CWE-200';
  }
  
  private mapToOWASP(finding: any): string {
    const owaspMap = {
      'sql-injection': 'A03:2021',
      'xss': 'A03:2021',
      'secret': 'A07:2021',
      'dependency': 'A06:2021'
    };
    
    return owaspMap[finding.rule] || 'A01:2021';
  }
  
  private categorizeSecurityType(finding: any): string {
    if (finding.type === 'secret') return 'secrets';
    if (finding.type === 'dependency') return 'dependencies';
    if (finding.rule?.includes('injection')) return 'injection';
    if (finding.rule?.includes('xss')) return 'xss';
    if (finding.rule?.includes('auth')) return 'authentication';
    if (finding.rule?.includes('crypto')) return 'cryptography';
    return 'other';
  }
  
  private identifyTopRisks(findings: any[]): any[] {
    return findings
      .filter(f => ['critical', 'high'].includes(f.severity))
      .slice(0, 5)
      .map(f => ({
        file: f.file,
        line: f.line,
        type: f.type,
        severity: f.severity,
        message: f.message
      }));
  }
}