/**
 * Universal Tool Parser
 * 
 * Transforms outputs from various MCP tools into a standardized format
 * that specialized agents can consume consistently
 */

export interface StandardizedFinding {
  // Core identification
  id: string;
  toolSource: string;
  type: 'security' | 'performance' | 'code-quality' | 'dependency' | 'accessibility' | 'seo';
  
  // Severity and priority
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  priority: number; // 1-10 scale
  confidence: number; // 0-100 percentage
  
  // Issue details
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  
  // Location information
  location: {
    file?: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    url?: string;
    component?: string;
    function?: string;
  };
  
  // Evidence and code
  evidence?: {
    codeSnippet?: string;
    context?: string[];
    stackTrace?: string;
    screenshot?: string;
    affectedResources?: string[];
  };
  
  // Technical details
  technical?: {
    cwe?: string[];
    cve?: string[];
    owasp?: string[];
    rule?: string;
    metric?: string;
    value?: number;
    unit?: string;
    threshold?: number;
  };
  
  // Remediation
  remediation?: {
    effort: 'trivial' | 'easy' | 'moderate' | 'complex' | 'major';
    automaticFix?: boolean;
    fixAvailable?: string;
    recommendations: string[];
    references?: string[];
    estimatedTime?: string;
  };
  
  // Metadata
  metadata?: {
    falsePositive?: boolean;
    suppressions?: string[];
    tags?: string[];
    relatedIssues?: string[];
    firstDetected?: Date;
    lastSeen?: Date;
  };
}

export interface ParsedToolResult {
  tool: string;
  version?: string;
  timestamp: Date;
  success: boolean;
  findings: StandardizedFinding[];
  metrics: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  };
  summary?: string;
  rawOutput?: any;
}

export class UniversalToolParser {
  private findingIdCounter = 0;
  
  /**
   * Main entry point - detects tool type and parses accordingly
   */
  parse(toolOutput: any): ParsedToolResult {
    // Detect tool type
    const toolType = this.detectToolType(toolOutput);
    
    // Parse based on tool type
    switch (toolType) {
      case 'semgrep':
        return this.parseSemgrep(toolOutput);
      case 'eslint':
        return this.parseESLint(toolOutput);
      case 'npm-audit':
        return this.parseNpmAudit(toolOutput);
      case 'lighthouse':
        return this.parseLighthouse(toolOutput);
      // Planned free tools - currently fallback to generic
      case 'bandit':
        return this.parseBandit(toolOutput);
      case 'gosec':
        return this.parseGoSec(toolOutput);
      case 'rubocop':
        return this.parseRuboCop(toolOutput);
      case 'phpstan':
        return this.parsePHPStan(toolOutput);
      case 'pylint':
        return this.parsePylint(toolOutput);
      case 'tslint':
        return this.parseTSLint(toolOutput);
      // Paid services - not implemented
      // case 'sonarqube': // Paid service
      // case 'snyk': // Paid service
      default:
        return this.parseGeneric(toolOutput);
    }
  }
  
  /**
   * Detects the tool type from output structure
   */
  private detectToolType(output: any): string {
    if (output.tool) return output.tool;
    
    // Check for tool-specific markers
    if (output.results && Array.isArray(output.results) && output.results[0]?.check_id) {
      return 'semgrep';
    }
    if (output.findings && output.metrics?.vulnerabilities) {
      return 'npm-audit';
    }
    if (output.categories && output.audits) {
      return 'lighthouse';
    }
    if (Array.isArray(output) && output[0]?.messages) {
      return 'eslint';
    }
    if (output.issues && output.components) {
      return 'sonarqube';
    }
    if (output.vulnerabilities && output.licensesPolicy) {
      return 'snyk';
    }
    
    return 'unknown';
  }
  
  /**
   * Parse Semgrep output
   */
  private parseSemgrep(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (output.findings) {
      // Already processed by MCP wrapper
      for (const finding of output.findings) {
        findings.push(this.standardizeFinding({
          toolSource: 'semgrep',
          type: 'security',
          severity: finding.severity,
          title: finding.message,
          description: finding.message,
          category: finding.category,
          location: {
            file: finding.file,
            line: finding.line,
            column: finding.column
          },
          evidence: {
            codeSnippet: finding.codeSnippet
          },
          technical: {
            cwe: finding.cwe ? [finding.cwe] : undefined,
            owasp: finding.owasp ? [finding.owasp] : undefined,
            rule: finding.rule
          },
          remediation: {
            effort: this.estimateEffort(finding.severity),
            automaticFix: !!finding.fix,
            fixAvailable: finding.fix,
            recommendations: finding.confidence === 'high' 
              ? ['Review and fix this security issue immediately']
              : ['Review this potential security issue']
          }
        }));
      }
    }
    
    return this.createResult('semgrep', findings, output);
  }
  
  /**
   * Parse ESLint output
   */
  private parseESLint(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (output.findings) {
      // Already processed by MCP wrapper
      for (const finding of output.findings) {
        findings.push(this.standardizeFinding({
          toolSource: 'eslint',
          type: 'code-quality',
          severity: this.mapESLintSeverity(finding.severity),
          title: finding.message,
          description: finding.message,
          category: finding.category,
          location: {
            file: finding.file,
            line: finding.line,
            column: finding.column,
            endLine: finding.endLine,
            endColumn: finding.endColumn
          },
          technical: {
            rule: finding.rule
          },
          remediation: {
            effort: finding.fixable ? 'trivial' : 'easy',
            automaticFix: finding.fixable,
            fixAvailable: finding.fix,
            recommendations: finding.suggestions || ['Fix this code quality issue']
          }
        }));
      }
    }
    
    return this.createResult('eslint', findings, output);
  }
  
  /**
   * Parse npm audit output
   */
  private parseNpmAudit(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (output.findings) {
      for (const finding of output.findings) {
        findings.push(this.standardizeFinding({
          toolSource: 'npm-audit',
          type: 'dependency',
          severity: this.mapNpmSeverity(finding.severity),
          title: finding.message,
          description: `Vulnerability in ${finding.package} ${finding.version}`,
          category: 'dependency',
          subCategory: 'vulnerability',
          location: {
            file: finding.file || 'package.json'
          },
          technical: {
            cve: finding.cve ? [finding.cve] : undefined
          },
          remediation: {
            effort: 'easy',
            automaticFix: true,
            recommendations: [finding.recommendation]
          }
        }));
      }
    }
    
    return this.createResult('npm-audit', findings, output);
  }
  
  /**
   * Parse Lighthouse output
   */
  private parseLighthouse(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (output.findings) {
      for (const finding of output.findings) {
        findings.push(this.standardizeFinding({
          toolSource: 'lighthouse',
          type: 'performance',
          severity: finding.severity,
          title: finding.message,
          description: finding.impact,
          category: finding.category,
          location: {
            url: finding.url
          },
          technical: {
            metric: finding.metric,
            value: finding.value,
            unit: finding.unit
          },
          evidence: {
            affectedResources: finding.resources?.map((r: any) => r.url)
          },
          remediation: {
            effort: this.estimatePerformanceEffort(finding.severity),
            automaticFix: false,
            recommendations: finding.recommendations || []
          }
        }));
      }
    }
    
    return this.createResult('lighthouse', findings, output);
  }
  
  /**
   * Parse SonarQube output - NOT IMPLEMENTED (paid service)
   */
  private parseSonarQube(output: any): ParsedToolResult {
    // SonarQube is a paid service - not implemented
    return this.parseGeneric(output);
  }
  
  /**
   * Parse SonarQube output - STUB KEPT FOR REFERENCE
   */
  private parseSonarQubeReference(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (output.issues) {
      for (const issue of output.issues) {
        findings.push(this.standardizeFinding({
          toolSource: 'sonarqube',
          type: this.mapSonarType(issue.type),
          severity: this.mapSonarSeverity(issue.severity),
          title: issue.message,
          description: issue.message,
          category: issue.type,
          location: {
            file: issue.component?.replace(/^.*:/, ''),
            line: issue.line
          },
          technical: {
            rule: issue.rule
          },
          remediation: {
            effort: this.mapSonarEffort(issue.effort),
            automaticFix: false,
            recommendations: ['Review and fix this issue']
          }
        }));
      }
    }
    
    return this.createResult('sonarqube', findings, output);
  }
  
  /**
   * Parse Snyk output - NOT IMPLEMENTED (paid service)
   */
  private parseSnyk(output: any): ParsedToolResult {
    // Snyk is a paid service - not implemented
    return this.parseGeneric(output);
  }
  
  /**
   * Parse Snyk output - STUB KEPT FOR REFERENCE
   */
  private parseSnykReference(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (output.vulnerabilities) {
      for (const vuln of output.vulnerabilities) {
        findings.push(this.standardizeFinding({
          toolSource: 'snyk',
          type: 'security',
          severity: this.mapSnykSeverity(vuln.severity),
          title: vuln.title,
          description: vuln.description,
          category: 'dependency',
          subCategory: vuln.type,
          location: {
            file: vuln.from?.join(' > ')
          },
          technical: {
            cve: vuln.identifiers?.CVE,
            cwe: vuln.identifiers?.CWE
          },
          remediation: {
            effort: vuln.isUpgradable ? 'easy' : 'moderate',
            automaticFix: vuln.isUpgradable,
            recommendations: vuln.fixedIn ? 
              [`Upgrade to ${vuln.fixedIn.join(' or ')}`] : 
              ['No fix available yet']
          }
        }));
      }
    }
    
    return this.createResult('snyk', findings, output);
  }
  
  /**
   * Parse Bandit (Python) output
   */
  private parseBandit(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (output.results) {
      for (const result of output.results) {
        findings.push(this.standardizeFinding({
          toolSource: 'bandit',
          type: 'security',
          severity: this.mapBanditSeverity(result.issue_severity),
          title: result.issue_text,
          description: result.issue_text,
          category: 'security',
          location: {
            file: result.filename,
            line: result.line_number,
            column: result.col_offset
          },
          evidence: {
            codeSnippet: result.code
          },
          technical: {
            cwe: result.issue_cwe ? [result.issue_cwe] : undefined,
            rule: result.test_id
          },
          remediation: {
            effort: this.mapBanditConfidence(result.issue_confidence),
            automaticFix: false,
            recommendations: ['Review and fix this security issue']
          }
        }));
      }
    }
    
    return this.createResult('bandit', findings, output);
  }
  
  /**
   * Parse GoSec output
   */
  private parseGoSec(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (output.Issues) {
      for (const issue of output.Issues) {
        findings.push(this.standardizeFinding({
          toolSource: 'gosec',
          type: 'security',
          severity: this.mapGoSecSeverity(issue.severity),
          title: issue.details,
          description: issue.details,
          category: 'security',
          location: {
            file: issue.file,
            line: parseInt(issue.line),
            column: parseInt(issue.column)
          },
          evidence: {
            codeSnippet: issue.code
          },
          technical: {
            cwe: issue.cwe ? [issue.cwe] : undefined,
            rule: issue.rule_id
          },
          remediation: {
            effort: this.mapGoSecConfidence(issue.confidence),
            automaticFix: false,
            recommendations: ['Review and fix this security issue']
          }
        }));
      }
    }
    
    return this.createResult('gosec', findings, output);
  }
  
  /**
   * Parse RuboCop output
   */
  private parseRuboCop(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (output.files) {
      for (const file of output.files) {
        for (const offense of file.offenses || []) {
          findings.push(this.standardizeFinding({
            toolSource: 'rubocop',
            type: 'code-quality',
            severity: this.mapRuboCopSeverity(offense.severity),
            title: offense.message,
            description: offense.message,
            category: offense.cop_name?.split('/')[0] || 'style',
            location: {
              file: file.path,
              line: offense.location.line,
              column: offense.location.column
            },
            technical: {
              rule: offense.cop_name
            },
            remediation: {
              effort: offense.correctable ? 'trivial' : 'easy',
              automaticFix: offense.correctable,
              recommendations: ['Fix this style/quality issue']
            }
          }));
        }
      }
    }
    
    return this.createResult('rubocop', findings, output);
  }
  
  /**
   * Parse PHPStan output
   */
  private parsePHPStan(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (output.files) {
      for (const [file, errors] of Object.entries(output.files)) {
        for (const error of (errors as any).messages || []) {
          findings.push(this.standardizeFinding({
            toolSource: 'phpstan',
            type: 'code-quality',
            severity: 'medium',
            title: error.message,
            description: error.message,
            category: 'type-safety',
            location: {
              file,
              line: error.line
            },
            remediation: {
              effort: 'moderate',
              automaticFix: false,
              recommendations: ['Fix this type safety issue']
            }
          }));
        }
      }
    }
    
    return this.createResult('phpstan', findings, output);
  }
  
  /**
   * Parse Pylint output
   */
  private parsePylint(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (Array.isArray(output)) {
      for (const message of output) {
        findings.push(this.standardizeFinding({
          toolSource: 'pylint',
          type: 'code-quality',
          severity: this.mapPylintType(message.type),
          title: message.message,
          description: message.message,
          category: message.message_id?.charAt(0) || 'general',
          location: {
            file: message.path,
            line: message.line,
            column: message.column
          },
          technical: {
            rule: message.message_id
          },
          remediation: {
            effort: 'easy',
            automaticFix: false,
            recommendations: ['Fix this code quality issue']
          }
        }));
      }
    }
    
    return this.createResult('pylint', findings, output);
  }
  
  /**
   * Parse TSLint output (legacy)
   */
  private parseTSLint(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    if (Array.isArray(output)) {
      for (const file of output) {
        for (const failure of file.failures || []) {
          findings.push(this.standardizeFinding({
            toolSource: 'tslint',
            type: 'code-quality',
            severity: failure.severity === 'error' ? 'high' : 'medium',
            title: failure.failure,
            description: failure.failure,
            category: 'typescript',
            location: {
              file: file.name,
              line: failure.startPosition.line,
              column: failure.startPosition.character
            },
            technical: {
              rule: failure.ruleName
            },
            remediation: {
              effort: 'easy',
              automaticFix: failure.fix !== undefined,
              recommendations: ['Migrate to ESLint', 'Fix this TypeScript issue']
            }
          }));
        }
      }
    }
    
    return this.createResult('tslint', findings, output);
  }
  
  /**
   * Parse generic/unknown tool output
   */
  private parseGeneric(output: any): ParsedToolResult {
    const findings: StandardizedFinding[] = [];
    
    // Try to extract findings from common patterns
    const possibleArrays = [
      output.findings,
      output.issues,
      output.results,
      output.vulnerabilities,
      output.problems,
      output.errors,
      output.warnings
    ];
    
    for (const arr of possibleArrays) {
      if (Array.isArray(arr)) {
        for (const item of arr) {
          findings.push(this.standardizeFinding({
            toolSource: 'unknown',
            type: 'code-quality',
            severity: this.guessSeverity(item),
            title: item.message || item.title || item.description || 'Unknown issue',
            description: item.description || item.message || '',
            category: item.category || item.type || 'general',
            location: {
              file: item.file || item.path || item.location,
              line: item.line || item.lineNumber
            },
            remediation: {
              effort: 'moderate',
              automaticFix: false,
              recommendations: ['Review this issue']
            }
          }));
        }
        break;
      }
    }
    
    return this.createResult('unknown', findings, output);
  }
  
  /**
   * Standardize a finding with defaults
   */
  private standardizeFinding(partial: Partial<StandardizedFinding>): StandardizedFinding {
    return {
      id: `finding-${++this.findingIdCounter}`,
      toolSource: partial.toolSource || 'unknown',
      type: partial.type || 'code-quality',
      severity: partial.severity || 'medium',
      priority: this.calculatePriority(partial.severity || 'medium', partial.confidence),
      confidence: partial.confidence || this.calculateConfidence(partial),
      title: partial.title || 'Unknown issue',
      description: partial.description || partial.title || '',
      category: partial.category || 'general',
      subCategory: partial.subCategory,
      location: partial.location || {},
      evidence: partial.evidence,
      technical: partial.technical,
      remediation: partial.remediation || {
        effort: 'moderate',
        automaticFix: false,
        recommendations: []
      },
      metadata: partial.metadata
    };
  }
  
  /**
   * Create result object
   */
  private createResult(tool: string, findings: StandardizedFinding[], rawOutput: any): ParsedToolResult {
    const metrics = this.calculateMetrics(findings);
    
    return {
      tool,
      timestamp: new Date(),
      success: true,
      findings,
      metrics,
      summary: this.generateSummary(tool, metrics),
      rawOutput
    };
  }
  
  /**
   * Calculate metrics from findings
   */
  private calculateMetrics(findings: StandardizedFinding[]) {
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    for (const finding of findings) {
      bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
      byType[finding.type] = (byType[finding.type] || 0) + 1;
      byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
    }
    
    return {
      total: findings.length,
      bySeverity,
      byType,
      byCategory
    };
  }
  
  /**
   * Generate summary text
   */
  private generateSummary(tool: string, metrics: any): string {
    if (metrics.total === 0) {
      return `${tool}: No issues found`;
    }
    
    const parts = [];
    if (metrics.bySeverity.critical > 0) {
      parts.push(`${metrics.bySeverity.critical} critical`);
    }
    if (metrics.bySeverity.high > 0) {
      parts.push(`${metrics.bySeverity.high} high`);
    }
    if (metrics.bySeverity.medium > 0) {
      parts.push(`${metrics.bySeverity.medium} medium`);
    }
    
    return `${tool}: ${metrics.total} issues (${parts.join(', ')})`;
  }
  
  // Severity mapping functions
  private mapESLintSeverity(severity: string): StandardizedFinding['severity'] {
    return severity === 'error' ? 'high' : 'medium';
  }
  
  private mapNpmSeverity(severity: string): StandardizedFinding['severity'] {
    const map: Record<string, StandardizedFinding['severity']> = {
      critical: 'critical',
      high: 'high',
      moderate: 'medium',
      low: 'low',
      info: 'info'
    };
    return map[severity] || 'medium';
  }
  
  private mapSonarType(type: string): StandardizedFinding['type'] {
    if (type === 'VULNERABILITY' || type === 'SECURITY_HOTSPOT') return 'security';
    if (type === 'BUG') return 'code-quality';
    if (type === 'CODE_SMELL') return 'code-quality';
    return 'code-quality';
  }
  
  private mapSonarSeverity(severity: string): StandardizedFinding['severity'] {
    const map: Record<string, StandardizedFinding['severity']> = {
      BLOCKER: 'critical',
      CRITICAL: 'critical',
      MAJOR: 'high',
      MINOR: 'medium',
      INFO: 'low'
    };
    return map[severity] || 'medium';
  }
  
  private mapSonarEffort(effort: string): StandardizedFinding['remediation']['effort'] {
    if (!effort) return 'moderate';
    const minutes = parseInt(effort);
    if (minutes <= 5) return 'trivial';
    if (minutes <= 30) return 'easy';
    if (minutes <= 120) return 'moderate';
    if (minutes <= 480) return 'complex';
    return 'major';
  }
  
  private mapSnykSeverity(severity: string): StandardizedFinding['severity'] {
    const map: Record<string, StandardizedFinding['severity']> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };
    return map[severity.toLowerCase()] || 'medium';
  }
  
  private mapBanditSeverity(severity: string): StandardizedFinding['severity'] {
    const map: Record<string, StandardizedFinding['severity']> = {
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low'
    };
    return map[severity] || 'medium';
  }
  
  private mapBanditConfidence(confidence: string): StandardizedFinding['remediation']['effort'] {
    const map: Record<string, StandardizedFinding['remediation']['effort']> = {
      HIGH: 'easy',
      MEDIUM: 'moderate',
      LOW: 'complex'
    };
    return map[confidence] || 'moderate';
  }
  
  private mapGoSecSeverity(severity: string): StandardizedFinding['severity'] {
    const map: Record<string, StandardizedFinding['severity']> = {
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low'
    };
    return map[severity] || 'medium';
  }
  
  private mapGoSecConfidence(confidence: string): StandardizedFinding['remediation']['effort'] {
    const map: Record<string, StandardizedFinding['remediation']['effort']> = {
      HIGH: 'easy',
      MEDIUM: 'moderate',
      LOW: 'complex'
    };
    return map[confidence] || 'moderate';
  }
  
  private mapRuboCopSeverity(severity: string): StandardizedFinding['severity'] {
    const map: Record<string, StandardizedFinding['severity']> = {
      error: 'high',
      warning: 'medium',
      convention: 'low',
      refactor: 'info',
      fatal: 'critical'
    };
    return map[severity] || 'medium';
  }
  
  private mapPylintType(type: string): StandardizedFinding['severity'] {
    const map: Record<string, StandardizedFinding['severity']> = {
      error: 'high',
      warning: 'medium',
      convention: 'low',
      refactor: 'info',
      fatal: 'critical'
    };
    return map[type] || 'medium';
  }
  
  private guessSeverity(item: any): StandardizedFinding['severity'] {
    const severityField = item.severity || item.level || item.priority || item.type;
    if (!severityField) return 'medium';
    
    const normalized = severityField.toString().toLowerCase();
    if (normalized.includes('critical') || normalized.includes('fatal')) return 'critical';
    if (normalized.includes('high') || normalized.includes('error')) return 'high';
    if (normalized.includes('medium') || normalized.includes('warn')) return 'medium';
    if (normalized.includes('low') || normalized.includes('info')) return 'low';
    
    return 'medium';
  }
  
  private calculatePriority(severity: StandardizedFinding['severity'], confidence?: number): number {
    const severityScore = {
      critical: 10,
      high: 8,
      medium: 5,
      low: 3,
      info: 1
    }[severity];
    
    const confidenceFactor = (confidence || 75) / 100;
    return Math.round(severityScore * confidenceFactor);
  }
  
  private calculateConfidence(partial: Partial<StandardizedFinding>): number {
    // Base confidence on available information
    let confidence = 50;
    
    if (partial.location?.file && partial.location?.line) confidence += 20;
    if (partial.evidence?.codeSnippet) confidence += 15;
    if (partial.technical?.rule || partial.technical?.cwe) confidence += 10;
    if (partial.remediation?.recommendations?.length) confidence += 5;
    
    return Math.min(confidence, 100);
  }
  
  private estimateEffort(severity: string): StandardizedFinding['remediation']['effort'] {
    const map: Record<string, StandardizedFinding['remediation']['effort']> = {
      critical: 'complex',
      high: 'moderate',
      medium: 'easy',
      low: 'trivial',
      info: 'trivial'
    };
    return map[severity] || 'moderate';
  }
  
  private estimatePerformanceEffort(severity: string): StandardizedFinding['remediation']['effort'] {
    if (severity === 'critical') return 'major';
    if (severity === 'high') return 'complex';
    if (severity === 'medium') return 'moderate';
    return 'easy';
  }
}

export default UniversalToolParser;