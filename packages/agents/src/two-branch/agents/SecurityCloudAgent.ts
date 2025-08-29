/**
 * Security Cloud Agent
 * Handles security analysis using cloud-based tools
 */

import { BaseCloudAgent, AgentAnalysisResult } from './BaseCloudAgent';

export class SecurityCloudAgent extends BaseCloudAgent {
  constructor(cloudUrl?: string, redisUrl?: string) {
    super(
      'SecurityAgent',
      ['semgrep', 'bandit', 'npm-audit'],
      cloudUrl,
      redisUrl
    );
  }

  /**
   * Transform security tool results to standard format
   */
  protected transformResults(
    tool: string,
    results: any,
    cached: boolean
  ): AgentAnalysisResult {
    const issues: AgentAnalysisResult['issues'] = [];

    switch (tool) {
      case 'semgrep':
        if (results.results) {
          for (const result of results.results) {
            issues.push({
              type: 'security',
              severity: this.mapSemgrepSeverity(result.extra?.severity || 'WARNING'),
              file: result.path,
              line: result.start?.line,
              message: result.extra?.message || result.check_id,
              rule: result.check_id
            });
          }
        }
        break;

      case 'bandit':
        if (results.results) {
          for (const result of results.results) {
            issues.push({
              type: 'security',
              severity: this.mapBanditSeverity(result.issue_severity),
              file: result.filename,
              line: result.line_number,
              message: result.issue_text,
              rule: result.test_id
            });
          }
        }
        break;

      case 'npm-audit':
        if (results.vulnerabilities) {
          for (const [name, vuln] of Object.entries(results.vulnerabilities)) {
            const v = vuln as any;
            issues.push({
              type: 'dependency',
              severity: this.mapNpmSeverity(v.severity),
              message: `${name}: ${v.title || v.overview}`,
              rule: `npm-${v.cve || v.id}`
            });
          }
        }
        break;
    }

    return {
      tool,
      status: 'success',
      issues,
      cached,
      metrics: {
        totalIssues: issues.length,
        criticalCount: issues.filter(i => i.severity === 'critical').length,
        highCount: issues.filter(i => i.severity === 'high').length
      }
    };
  }

  /**
   * Map Semgrep severity to standard
   */
  private mapSemgrepSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity.toUpperCase()) {
      case 'ERROR':
        return 'critical';
      case 'WARNING':
        return 'high';
      case 'INFO':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Map Bandit severity to standard
   */
  private mapBanditSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity.toUpperCase()) {
      case 'HIGH':
        return 'critical';
      case 'MEDIUM':
        return 'high';
      case 'LOW':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Map npm audit severity to standard
   */
  private mapNpmSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'moderate':
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Fallback to local security analysis if cloud is down
   */
  protected async fallbackAnalysis(repository: string): Promise<AgentAnalysisResult[]> {
    console.warn('[SecurityAgent] Using mock data for fallback');
    
    // In production, this could run local tools or return cached results
    return [{
      tool: 'security-fallback',
      status: 'success',
      issues: [{
        type: 'security',
        severity: 'medium',
        message: 'Cloud service unavailable - using fallback analysis',
        rule: 'fallback-001'
      }],
      cached: true
    }];
  }
}