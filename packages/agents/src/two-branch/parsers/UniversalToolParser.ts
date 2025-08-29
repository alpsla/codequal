/**
 * Universal Tool Parser
 * Standardizes output from different MCP tools into a common format
 * that specialized agents can consume
 */

import { 
  SecurityIssue, 
  PerformanceIssue, 
  CodeQualityIssue,
  DependencyIssue,
  ArchitectureIssue 
} from '../types/issue-types';

// Common structure that all agents can understand
export interface StandardizedToolOutput {
  tool: string;
  timestamp: string;
  language?: string;
  files: FileAnalysis[];
  issues: StandardizedIssue[];
  metrics?: CodeMetrics;
  dependencies?: DependencyInfo[];
  raw?: any; // Original tool output for reference
}

export interface FileAnalysis {
  path: string;
  language: string;
  size: number;
  complexity?: number;
  coverage?: number;
  issues: StandardizedIssue[];
}

export interface StandardizedIssue {
  id: string;
  type: 'security' | 'performance' | 'quality' | 'dependency' | 'architecture' | 'bug';
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  location: {
    file: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
  };
  evidence?: string;
  suggestion?: string;
  cwe?: string;
  owasp?: string;
  references?: string[];
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  duplicatedLines: number;
  testCoverage?: number;
  maintainabilityIndex?: number;
}

export interface DependencyInfo {
  name: string;
  version: string;
  license?: string;
  vulnerabilities?: string[];
  outdated?: boolean;
}

export class UniversalToolParser {
  private toolParsers: Map<string, (output: any) => StandardizedToolOutput>;
  
  constructor() {
    this.toolParsers = new Map();
    this.registerParsers();
  }
  
  private registerParsers(): void {
    // Semgrep parser
    this.toolParsers.set('semgrep', this.parseSemgrepOutput.bind(this));
    
    // ESLint parser
    this.toolParsers.set('eslint', this.parseESLintOutput.bind(this));
    
    // Bandit (Python security) parser
    this.toolParsers.set('bandit', this.parseBanditOutput.bind(this));
    
    // GoSec parser
    this.toolParsers.set('gosec', this.parseGoSecOutput.bind(this));
    
    // JSCPD (duplication) parser
    this.toolParsers.set('jscpd', this.parseJSCPDOutput.bind(this));
    
    // Dependency-check parser
    this.toolParsers.set('dependency-check', this.parseDependencyCheckOutput.bind(this));
    
    // SonarQube parser
    this.toolParsers.set('sonarqube', this.parseSonarQubeOutput.bind(this));
    
    // Snyk parser
    this.toolParsers.set('snyk', this.parseSnykOutput.bind(this));
    
    // Trivy parser
    this.toolParsers.set('trivy', this.parseTrivyOutput.bind(this));
    
    // Pylint parser
    this.toolParsers.set('pylint', this.parsePylintOutput.bind(this));
    
    // RuboCop parser
    this.toolParsers.set('rubocop', this.parseRuboCopOutput.bind(this));
    
    // SpotBugs (Java) parser
    this.toolParsers.set('spotbugs', this.parseSpotBugsOutput.bind(this));
    
    // Checkstyle parser
    this.toolParsers.set('checkstyle', this.parseCheckstyleOutput.bind(this));
    
    // Clippy (Rust) parser
    this.toolParsers.set('clippy', this.parseClippyOutput.bind(this));
    
    // SwiftLint parser
    this.toolParsers.set('swiftlint', this.parseSwiftLintOutput.bind(this));
  }
  
  /**
   * Parse tool output into standardized format
   */
  parse(tool: string, output: any, language?: string): StandardizedToolOutput {
    const parser = this.toolParsers.get(tool.toLowerCase());
    
    if (!parser) {
      // Fallback to generic parser
      return this.genericParse(tool, output, language);
    }
    
    const standardized = parser(output);
    standardized.language = language || standardized.language;
    return standardized;
  }
  
  /**
   * Semgrep SAST tool parser
   */
  private parseSemgrepOutput(output: any): StandardizedToolOutput {
    const results = output.results || [];
    const issues: StandardizedIssue[] = [];
    const fileMap = new Map<string, FileAnalysis>();
    
    for (const result of results) {
      const issue: StandardizedIssue = {
        id: result.check_id || `semgrep-${Date.now()}`,
        type: this.mapSemgrepToType(result.check_id),
        severity: this.mapSemgrepSeverity(result.extra?.severity || 'WARNING'),
        category: result.extra?.metadata?.category || 'security',
        title: result.extra?.message || result.check_id,
        description: result.extra?.metadata?.description || '',
        location: {
          file: result.path,
          line: result.start?.line,
          column: result.start?.col,
          endLine: result.end?.line,
          endColumn: result.end?.col
        },
        evidence: result.extra?.lines,
        suggestion: result.extra?.fix || result.extra?.metadata?.fix,
        cwe: result.extra?.metadata?.cwe,
        owasp: result.extra?.metadata?.owasp,
        references: result.extra?.metadata?.references
      };
      
      issues.push(issue);
      
      // Track file analysis
      if (!fileMap.has(result.path)) {
        fileMap.set(result.path, {
          path: result.path,
          language: this.detectLanguage(result.path),
          size: 0,
          issues: []
        });
      }
      fileMap.get(result.path)!.issues.push(issue);
    }
    
    return {
      tool: 'semgrep',
      timestamp: new Date().toISOString(),
      files: Array.from(fileMap.values()),
      issues,
      raw: output
    };
  }
  
  /**
   * ESLint parser
   */
  private parseESLintOutput(output: any): StandardizedToolOutput {
    const results = Array.isArray(output) ? output : [output];
    const issues: StandardizedIssue[] = [];
    const files: FileAnalysis[] = [];
    
    for (const file of results) {
      const fileIssues: StandardizedIssue[] = [];
      
      for (const message of (file.messages || [])) {
        const issue: StandardizedIssue = {
          id: `eslint-${file.filePath}-${message.line}-${message.column}`,
          type: 'quality',
          severity: message.severity === 2 ? 'high' : 'medium',
          category: 'code-style',
          title: message.ruleId || 'ESLint violation',
          description: message.message,
          location: {
            file: file.filePath,
            line: message.line,
            column: message.column,
            endLine: message.endLine,
            endColumn: message.endColumn
          },
          suggestion: message.fix ? 'Auto-fixable' : undefined
        };
        
        issues.push(issue);
        fileIssues.push(issue);
      }
      
      files.push({
        path: file.filePath,
        language: 'javascript',
        size: 0,
        issues: fileIssues
      });
    }
    
    return {
      tool: 'eslint',
      timestamp: new Date().toISOString(),
      files,
      issues,
      raw: output
    };
  }
  
  /**
   * Bandit (Python security) parser
   */
  private parseBanditOutput(output: any): StandardizedToolOutput {
    const results = output.results || [];
    const issues: StandardizedIssue[] = [];
    
    for (const result of results) {
      issues.push({
        id: `bandit-${result.test_id}`,
        type: 'security',
        severity: this.mapBanditSeverity(result.issue_severity),
        category: result.test_name,
        title: result.issue_text,
        description: `${result.issue_text} (Confidence: ${result.issue_confidence})`,
        location: {
          file: result.filename,
          line: result.line_number,
          column: result.col_offset
        },
        evidence: result.code,
        cwe: result.issue_cwe?.id?.toString()
      });
    }
    
    return {
      tool: 'bandit',
      timestamp: new Date().toISOString(),
      language: 'python',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }
  
  /**
   * GoSec parser
   */
  private parseGoSecOutput(output: any): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];
    const issuesData = output.Issues || [];
    
    for (const issue of issuesData) {
      issues.push({
        id: `gosec-${issue.rule_id}`,
        type: 'security',
        severity: this.mapGoSecSeverity(issue.severity),
        category: issue.details,
        title: issue.details,
        description: `${issue.details} - ${issue.code}`,
        location: {
          file: issue.file,
          line: parseInt(issue.line),
          column: parseInt(issue.column)
        },
        evidence: issue.code,
        cwe: issue.cwe?.id
      });
    }
    
    return {
      tool: 'gosec',
      timestamp: new Date().toISOString(),
      language: 'go',
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }
  
  /**
   * JSCPD (duplication detector) parser
   */
  private parseJSCPDOutput(output: any): StandardizedToolOutput {
    const duplicates = output.duplicates || [];
    const issues: StandardizedIssue[] = [];
    
    for (const dup of duplicates) {
      issues.push({
        id: `jscpd-${dup.firstFile?.name}-${dup.firstFile?.start}`,
        type: 'quality',
        severity: 'medium',
        category: 'duplication',
        title: 'Duplicate code detected',
        description: `${dup.lines} lines duplicated between files`,
        location: {
          file: dup.firstFile?.name,
          line: dup.firstFile?.start,
          endLine: dup.firstFile?.end
        },
        evidence: dup.fragment,
        suggestion: 'Consider extracting duplicate code into a shared function'
      });
    }
    
    return {
      tool: 'jscpd',
      timestamp: new Date().toISOString(),
      files: this.groupIssuesByFile(issues),
      issues,
      metrics: {
        linesOfCode: output.statistics?.total || 0,
        cyclomaticComplexity: 0,
        duplicatedLines: output.statistics?.duplicated || 0,
        testCoverage: 0
      },
      raw: output
    };
  }
  
  // Helper methods
  private mapSemgrepToType(checkId: string): StandardizedIssue['type'] {
    if (checkId?.includes('security')) return 'security';
    if (checkId?.includes('performance')) return 'performance';
    if (checkId?.includes('bug')) return 'bug';
    return 'quality';
  }
  
  private mapSemgrepSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toUpperCase()) {
      case 'ERROR': return 'critical';
      case 'WARNING': return 'high';
      case 'INFO': return 'medium';
      default: return 'low';
    }
  }
  
  private mapBanditSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'critical';
      case 'MEDIUM': return 'high';
      case 'LOW': return 'medium';
      default: return 'low';
    }
  }
  
  private mapGoSecSeverity(severity: string): StandardizedIssue['severity'] {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'critical';
      case 'MEDIUM': return 'high';
      case 'LOW': return 'medium';
      default: return 'low';
    }
  }
  
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rb': 'ruby',
      'php': 'php',
      'cs': 'csharp',
      'cpp': 'cpp',
      'cc': 'cpp',
      'c': 'c',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'm': 'objectivec',
      'scala': 'scala',
      'r': 'r',
      'dart': 'dart'
    };
    return langMap[ext || ''] || 'unknown';
  }
  
  private groupIssuesByFile(issues: StandardizedIssue[]): FileAnalysis[] {
    const fileMap = new Map<string, FileAnalysis>();
    
    for (const issue of issues) {
      const filePath = issue.location.file;
      if (!fileMap.has(filePath)) {
        fileMap.set(filePath, {
          path: filePath,
          language: this.detectLanguage(filePath),
          size: 0,
          issues: []
        });
      }
      fileMap.get(filePath)!.issues.push(issue);
    }
    
    return Array.from(fileMap.values());
  }
  
  // Additional parsers for other tools...
  private parseDependencyCheckOutput(output: any): StandardizedToolOutput {
    // Implementation for OWASP dependency check
    return this.genericParse('dependency-check', output);
  }
  
  private parseSonarQubeOutput(output: any): StandardizedToolOutput {
    // Implementation for SonarQube
    return this.genericParse('sonarqube', output);
  }
  
  private parseSnykOutput(output: any): StandardizedToolOutput {
    // Implementation for Snyk
    return this.genericParse('snyk', output);
  }
  
  private parseTrivyOutput(output: any): StandardizedToolOutput {
    // Implementation for Trivy
    return this.genericParse('trivy', output);
  }
  
  private parsePylintOutput(output: any): StandardizedToolOutput {
    // Implementation for Pylint
    return this.genericParse('pylint', output);
  }
  
  private parseRuboCopOutput(output: any): StandardizedToolOutput {
    // Implementation for RuboCop
    return this.genericParse('rubocop', output);
  }
  
  private parseSpotBugsOutput(output: any): StandardizedToolOutput {
    // Implementation for SpotBugs
    return this.genericParse('spotbugs', output);
  }
  
  private parseCheckstyleOutput(output: any): StandardizedToolOutput {
    // Implementation for Checkstyle
    return this.genericParse('checkstyle', output);
  }
  
  private parseClippyOutput(output: any): StandardizedToolOutput {
    // Implementation for Clippy
    return this.genericParse('clippy', output);
  }
  
  private parseSwiftLintOutput(output: any): StandardizedToolOutput {
    // Implementation for SwiftLint
    return this.genericParse('swiftlint', output);
  }
  
  /**
   * Generic parser for unknown tools
   */
  private genericParse(tool: string, output: any, language?: string): StandardizedToolOutput {
    const issues: StandardizedIssue[] = [];
    
    // Try to extract issues from common formats
    if (Array.isArray(output)) {
      for (const item of output) {
        if (item.file || item.path || item.location) {
          issues.push(this.extractGenericIssue(item));
        }
      }
    } else if (output.issues || output.results || output.findings) {
      const items = output.issues || output.results || output.findings;
      for (const item of items) {
        issues.push(this.extractGenericIssue(item));
      }
    }
    
    return {
      tool,
      timestamp: new Date().toISOString(),
      language,
      files: this.groupIssuesByFile(issues),
      issues,
      raw: output
    };
  }
  
  private extractGenericIssue(item: any): StandardizedIssue {
    return {
      id: item.id || `${Date.now()}-${Math.random()}`,
      type: item.type || 'quality',
      severity: item.severity || 'medium',
      category: item.category || 'general',
      title: item.title || item.message || 'Issue detected',
      description: item.description || item.details || '',
      location: {
        file: item.file || item.path || item.location?.file || 'unknown',
        line: item.line || item.location?.line,
        column: item.column || item.location?.column
      },
      evidence: item.evidence || item.code,
      suggestion: item.suggestion || item.fix
    };
  }
}