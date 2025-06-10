import { AnalysisResult } from '@codequal/core';

export class DependencyAgent {
  private config: any;
  
  constructor(config: any) {
    this.config = config;
  }

  async analyze(context: {
    prData: any;
    deepwikiContext: any;
    toolResults: any;
    vectorContext: any;
  }): Promise<AnalysisResult> {
    const { toolResults, deepwikiContext } = context;
    
    // Process dependency scan results (npm audit, snyk, etc.)
    const findings = this.processDependencyFindings(toolResults);
    const vulnerabilities = this.categorizeVulnerabilities(findings);
    const outdatedPackages = this.identifyOutdated(toolResults);
    
    return {
      insights: vulnerabilities.map((vuln, index) => ({
        type: 'vulnerability',
        severity: vuln.severity as 'high' | 'medium' | 'low',
        message: `${vuln.package} - ${vuln.vulnerability}: ${vuln.description}`,
        location: {
          file: 'package.json'
        }
      })),
      suggestions: [
        ...vulnerabilities.map((vuln, index) => ({
          file: 'package.json',
          line: 1,
          suggestion: `Update ${vuln.package} to ${vuln.fixedIn}`,
          code: `"${vuln.package}": "${vuln.fixedIn}"`
        })),
        ...outdatedPackages.map((pkg, index) => ({
          file: 'package.json',
          line: 1,
          suggestion: `Update ${pkg.name} to ${pkg.latest}`,
          code: `"${pkg.name}": "${pkg.latest}"`
        }))
      ],
      metadata: {
        role: 'dependency',
        vulnerabilityCount: vulnerabilities.length,
        outdatedCount: outdatedPackages.length,
        score: this.calculateHealthScore(vulnerabilities, outdatedPackages)
      }
    };
  }

  private processDependencyFindings(toolResults: any): any[] {
    if (!toolResults || !toolResults.findings) {
      return [];
    }
    
    return toolResults.findings.map((finding: any) => ({
      package: finding.package || finding.module,
      version: finding.version,
      vulnerability: finding.vulnerability || finding.cve,
      severity: finding.severity,
      description: finding.description,
      fixedIn: finding.fixedIn || finding.patched_versions
    }));
  }

  private categorizeVulnerabilities(findings: any[]): any[] {
    return findings.filter(f => f.vulnerability);
  }

  private identifyOutdated(toolResults: any): any[] {
    if (!toolResults || !toolResults.outdated) {
      return [];
    }
    
    return toolResults.outdated.map((pkg: any) => ({
      name: pkg.name,
      current: pkg.current,
      latest: pkg.latest,
      wanted: pkg.wanted,
      type: pkg.type || 'dependencies'
    }));
  }

  private generateAssessment(vulnerabilities: any[], outdated: any[]): string {
    if (vulnerabilities.some(v => v.severity === 'critical')) {
      return 'Critical security vulnerabilities detected - immediate action required';
    } else if (vulnerabilities.some(v => v.severity === 'high')) {
      return 'High severity vulnerabilities found - updates recommended';
    } else if (outdated.length > 20) {
      return 'Many outdated packages - maintenance needed';
    } else {
      return 'Dependencies are reasonably healthy with minor updates needed';
    }
  }

  private calculateHealthScore(vulnerabilities: any[], outdated: any[]): number {
    let score = 10;
    
    // Deduct for vulnerabilities
    vulnerabilities.forEach(v => {
      switch (v.severity) {
        case 'critical': score -= 3; break;
        case 'high': score -= 2; break;
        case 'medium': score -= 1; break;
        case 'low': score -= 0.5; break;
      }
    });
    
    // Deduct for outdated packages
    score -= Math.min(outdated.length * 0.1, 2);
    
    return Math.max(0, score);
  }

  private generateRecommendations(vulnerabilities: any[], outdated: any[]): any[] {
    const recommendations = [];
    
    // Critical vulnerabilities first
    const critical = vulnerabilities.filter(v => v.severity === 'critical');
    if (critical.length > 0) {
      recommendations.push({
        id: 'rec-dep-001',
        priority: 'critical' as const,
        category: 'security',
        action: `Fix ${critical.length} critical vulnerabilities immediately`,
        rationale: 'Critical vulnerabilities can be actively exploited',
        effort: 'low' as const,
        impact: 'high' as const
      });
    }
    
    // Update strategy
    if (outdated.length > 10) {
      recommendations.push({
        id: 'rec-dep-002',
        priority: 'medium' as const,
        category: 'maintenance',
        action: 'Implement regular dependency update schedule',
        rationale: 'Reduce technical debt and security exposure',
        effort: 'medium' as const,
        impact: 'medium' as const
      });
    }
    
    return recommendations;
  }

  private groupBySeverity(vulnerabilities: any[]): Record<string, number> {
    return vulnerabilities.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByPackage(vulnerabilities: any[]): Record<string, number> {
    return vulnerabilities.reduce((acc, v) => {
      acc[v.package] = (acc[v.package] || 0) + 1;
      return acc;
    }, {});
  }

  private determineUpdateStrategy(vulnerabilities: any[], outdated: any[]): string {
    if (vulnerabilities.some(v => v.severity === 'critical')) {
      return 'emergency-patch';
    } else if (vulnerabilities.length > 5 || outdated.length > 20) {
      return 'scheduled-maintenance';
    } else {
      return 'gradual-update';
    }
  }

  private checkLicenses(deepwikiContext: any): any {
    const blockedLicenses = deepwikiContext?.dependencies?.blockedLicenses || ['GPL', 'AGPL'];
    
    return {
      compliant: true, // Would check actual licenses
      blockedLicenses,
      warnings: []
    };
  }
}
