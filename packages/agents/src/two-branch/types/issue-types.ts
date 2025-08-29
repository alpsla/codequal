/**
 * Common issue type definitions for all agents
 */

export interface BaseIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
}

export interface SecurityIssue extends BaseIssue {
  type: 'security';
  category: string;
  cwe?: string;
  owasp?: string;
  evidence?: string;
  remediation?: string;
}

export interface PerformanceIssue extends BaseIssue {
  type: 'performance';
  category: string;
  impact: string;
  benchmarkData?: any;
}

export interface CodeQualityIssue extends BaseIssue {
  type: 'code-quality';
  category: string;
  suggestion: string;
  effort: 'low' | 'medium' | 'high';
}

export interface DependencyIssue extends BaseIssue {
  type: 'dependency';
  packageName: string;
  currentVersion: string;
  recommendedVersion?: string;
  vulnerabilities?: string[];
}

export interface ArchitectureIssue extends BaseIssue {
  type: 'architecture';
  pattern: string;
  antiPattern?: boolean;
  recommendation: string;
}

export type Issue = SecurityIssue | PerformanceIssue | CodeQualityIssue | DependencyIssue | ArchitectureIssue;