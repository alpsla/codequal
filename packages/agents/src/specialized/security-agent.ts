/**
 * Security Agent
 * Specialized agent for security issue analysis
 */

import { BaseAgent } from '../base/base-agent';
import { AnalysisResult } from '../agent';
import { AgentCapability } from '../types/agent-types';

export interface SecurityContext {
  repositoryPath: string;
  branchName: string;
  files: string[];
  vulnerabilityDatabase?: any;
  cweMapping?: Map<string, string>;
  owaspTop10?: string[];
  toolResults?: any;
}

export interface SecurityVulnerability {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  cwe?: string;
  owasp?: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  evidence?: any;
  remediation?: string;
}

export class SecurityAgent extends BaseAgent {
  private readonly agentName = 'SecurityAgent';
  
  capabilities: AgentCapability[] = [
    { 
      name: 'SQL Injection Detection', 
      description: 'Detect SQL injection vulnerabilities', 
      tools: ['semgrep', 'bandit'] 
    },
    { 
      name: 'XSS Vulnerability Scanning', 
      description: 'Find XSS vulnerabilities', 
      tools: ['eslint-plugin-security'] 
    },
    { 
      name: 'Authentication Bypass Analysis', 
      description: 'Check for auth bypass issues', 
      tools: ['custom-auth-analyzer'] 
    },
    { 
      name: 'Data Validation Checks', 
      description: 'Validate input sanitization', 
      tools: ['joi-validator'] 
    },
    { 
      name: 'Cryptographic Analysis', 
      description: 'Check crypto implementations', 
      tools: ['crypto-analyzer'] 
    }
  ];

  async analyze(context: any): Promise<AnalysisResult> {
    try {
      // Mock security analysis
      const mockResults = context.toolResults || [];
      const vulnerabilities = this.extractVulnerabilities(mockResults);

      if (vulnerabilities.length === 0) {
        return {
          insights: [],
          suggestions: [],
          metadata: {
            securityScan: 'completed',
            vulnerabilities: 0,
            agent: this.agentName
          }
        };
      }

      // Convert vulnerabilities to insights and suggestions
      const insights = vulnerabilities.map(vuln => ({
        type: 'security',
        severity: this.mapSeverity(vuln.severity),
        message: vuln.description || vuln.title || 'Security vulnerability detected',
        location: vuln.location
      }));

      const suggestions = vulnerabilities
        .filter(vuln => vuln.remediation)
        .map(vuln => ({
          file: vuln.location?.file || 'unknown',
          line: vuln.location?.line || 0,
          suggestion: vuln.remediation || 'Apply security fix'
        }));

      return {
        insights,
        suggestions,
        metadata: {
          securityScan: 'completed',
          vulnerabilities: vulnerabilities.length,
          severityDistribution: this.countBySeverity(vulnerabilities),
          agent: this.agentName
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected formatResult(rawResult: any): AnalysisResult {
    // Convert raw security results to AnalysisResult format
    return {
      insights: rawResult.insights || [],
      suggestions: rawResult.suggestions || [],
      metadata: rawResult.metadata || { agent: this.agentName }
    };
  }

  private mapSeverity(severity: 'critical' | 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
    // Map critical to high since AnalysisResult only supports high/medium/low
    return severity === 'critical' ? 'high' : severity;
  }

  private extractVulnerabilities(toolResults: any[]): SecurityVulnerability[] {
    // Mock vulnerability extraction
    return [
      {
        id: 'SEC-001',
        type: 'sql-injection',
        severity: 'high',
        category: 'injection',
        title: 'SQL Injection Vulnerability',
        description: 'Potential SQL injection found in database query',
        cwe: 'CWE-89',
        location: {
          file: 'src/database/queries.ts',
          line: 45
        },
        remediation: 'Use parameterized queries instead of string concatenation'
      }
    ];
  }

  private countBySeverity(vulnerabilities: SecurityVulnerability[]) {
    return vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private generateKeyInsights(vulnerabilities: SecurityVulnerability[]): string[] {
    const insights = [];
    const highSeverity = vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high');
    
    if (highSeverity.length > 0) {
      insights.push(`${highSeverity.length} high-severity security issues require immediate attention`);
    }
    
    const categories = [...new Set(vulnerabilities.map(v => v.type))];
    if (categories.length > 1) {
      insights.push(`Multiple vulnerability categories found: ${categories.join(', ')}`);
    }
    
    return insights;
  }
}