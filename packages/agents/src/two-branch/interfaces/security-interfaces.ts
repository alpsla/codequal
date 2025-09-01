/**
 * Security-specific interfaces for agents
 */

import { SecurityIssue } from './agent-interfaces';

// Re-export SecurityIssue for convenience
export { SecurityIssue };

export interface SecurityToolResult {
  tool: string;
  version?: string;
  issues: SecurityIssue[];
  executionTime?: number;
  errors?: string[];
}

export interface SecurityScanOptions {
  skipCache?: boolean;
  timeout?: number;
  includeDevDependencies?: boolean;
  severityThreshold?: 'critical' | 'high' | 'medium' | 'low';
}

export interface VulnerabilityDetails {
  cve?: string;
  cwe?: string;
  owasp?: string;
  cvss?: number;
  exploitAvailable?: boolean;
  patchAvailable?: boolean;
  references?: string[];
}