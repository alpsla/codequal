/**
 * Common interfaces for all agents in the two-branch system
 */

export interface FileInfo {
  path: string;
  content: string;
  branch?: string;  // Made optional to match existing usage
  fullPath?: string;
  size?: number;
  extension?: string;
  language?: string;
}

export interface BranchAnalysisResult {
  branch: string;
  issues: SecurityIssue[];
  metrics?: {
    filesAnalyzed: number;
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
}

export interface SecurityIssue {
  id: string;
  type: 'security' | 'code-quality' | 'performance' | 'reliability' | 'compliance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  tool: string;
  branch: string;
  confidence?: number;
  cwe?: string;
  cve?: string;  // Added CVE field
  owasp?: string;
  effort?: string;
  debt?: string;
  tags?: string[];
  suggestion?: string;
  evidence?: string;
  remediation?: string;
  metrics?: any;  // Added metrics field for additional data
  package?: string;  // For dependency issues
  version?: string;  // Current version
  fixVersion?: string;  // Recommended version
}