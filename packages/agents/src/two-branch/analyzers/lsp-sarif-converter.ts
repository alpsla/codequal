/**
 * LSP and SARIF Format Converter
 * 
 * Converts CodeQual's internal fix format to:
 * 1. LSP Code Actions (for Cursor/VSCode)
 * 2. SARIF 2.1.0 (industry standard)
 * 
 * This enables IDEs to apply fixes automatically via Quick Fix menu.
 */

import { EnrichedIssue } from './v9-grouped-report-formatter';
import { IssueGroup } from '../utils/issue-grouping';

// ============================================================================
// LSP Code Actions Types
// ============================================================================

export interface LSPPosition {
  line: number;      // 0-based
  character: number; // 0-based
}

export interface LSPRange {
  start: LSPPosition;
  end: LSPPosition;
}

export interface LSPTextEdit {
  range: LSPRange;
  newText: string;
}

export interface LSPWorkspaceEdit {
  changes: {
    [uri: string]: LSPTextEdit[];
  };
}

export interface LSPCodeAction {
  title: string;
  kind: 'quickfix' | 'refactor' | 'source';
  edit: LSPWorkspaceEdit;
  diagnostics?: LSPDiagnostic[];
}

export interface LSPDiagnostic {
  range: LSPRange;
  severity: 1 | 2 | 3 | 4; // 1=Error, 2=Warning, 3=Information, 4=Hint
  code: string;
  source: string;
  message: string;
}

// ============================================================================
// SARIF 2.1.0 Types
// ============================================================================

export interface SARIFReport {
  version: '2.1.0';
  $schema: 'https://json.schemastore.org/sarif-2.1.0.json';
  runs: SARIFRun[];
}

export interface SARIFRun {
  tool: SARIFTool;
  results: SARIFResult[];
}

export interface SARIFTool {
  driver: {
    name: string;
    version: string;
    informationUri?: string;
    rules: SARIFRule[];
  };
}

export interface SARIFRule {
  id: string;
  shortDescription: { text: string };
  fullDescription?: { text: string };
  help?: { text: string; markdown?: string };
  defaultConfiguration?: {
    level: 'error' | 'warning' | 'note' | 'none';
  };
}

export interface SARIFResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations: SARIFLocation[];
  fixes?: SARIFFix[];
}

export interface SARIFLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region: {
      startLine: number;    // 1-based
      startColumn?: number; // 1-based
      endLine?: number;
      endColumn?: number;
      snippet?: { text: string };
    };
  };
}

export interface SARIFFix {
  description: { text: string };
  artifactChanges: SARIFArtifactChange[];
}

export interface SARIFArtifactChange {
  artifactLocation: { uri: string };
  replacements: SARIFReplacement[];
}

export interface SARIFReplacement {
  deletedRegion: {
    startLine: number;    // 1-based
    startColumn?: number; // 1-based
    endLine?: number;
    endColumn?: number;
  };
  insertedContent: { text: string };
}

// ============================================================================
// Converter Class
// ============================================================================

export class LSPSARIFConverter {
  
  /**
   * Convert CodeQual issues to LSP Code Actions
   * Cursor/VSCode will show these in Quick Fix menu (Ctrl+.)
   */
  public generateLSPCodeActions(
    issues: EnrichedIssue[],
    workspaceRoot: string
  ): LSPCodeAction[] {
    const codeActions: LSPCodeAction[] = [];
    
    // Group issues by file for efficient processing
    const issuesByFile = this.groupIssuesByFile(issues);
    
    for (const [file, fileIssues] of Object.entries(issuesByFile)) {
      for (const issue of fileIssues) {
        if (!issue.fixSuggestion?.correctedCode) continue;
        
        const fileUri = this.toFileUri(file, workspaceRoot);
        const codeAction = this.createLSPCodeAction(issue, fileUri);
        if (codeAction) codeActions.push(codeAction);
      }
    }
    
    return codeActions;
  }
  
  /**
   * Convert CodeQual issues to SARIF 2.1.0 format
   * Industry standard format supported by all major IDEs
   */
  public generateSARIFReport(
    issues: EnrichedIssue[],
    groups: IssueGroup[],
    metadata: {
      repository: string;
      version: string;
      analyzedAt: string;
    }
  ): SARIFReport {
    return {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [{
        tool: this.createSARIFTool(groups, metadata),
        results: this.createSARIFResults(issues)
      }]
    };
  }
  
  // ==========================================================================
  // Private Helper Methods - LSP
  // ==========================================================================
  
  private createLSPCodeAction(
    issue: EnrichedIssue,
    fileUri: string
  ): LSPCodeAction | null {
    if (!issue.fixSuggestion?.correctedCode) return null;
    
    const line = (issue.line || 1) - 1; // Convert to 0-based
    const endLine = line + this.countLines(issue.fixSuggestion.correctedCode);
    
    return {
      title: `Fix: ${this.getTitleFromRule(issue.rule)}`,
      kind: 'quickfix',
      edit: {
        changes: {
          [fileUri]: [{
            range: {
              start: { line, character: 0 },
              end: { line: endLine, character: 0 }
            },
            newText: issue.fixSuggestion.correctedCode
          }]
        }
      },
      diagnostics: [{
        range: {
          start: { line, character: 0 },
          end: { line: line + 1, character: 0 }
        },
        severity: this.mapSeverityToLSP(issue.severity),
        code: issue.rule,
        source: `codequal-${issue.tool}`,
        message: issue.message
      }]
    };
  }
  
  private mapSeverityToLSP(severity: string): 1 | 2 | 3 | 4 {
    switch (severity) {
      case 'critical': return 1; // Error
      case 'high': return 1;     // Error
      case 'medium': return 2;   // Warning
      case 'low': return 3;      // Information
      default: return 4;         // Hint
    }
  }
  
  // ==========================================================================
  // Private Helper Methods - SARIF
  // ==========================================================================
  
  private createSARIFTool(
    groups: IssueGroup[],
    metadata: { repository: string; version: string }
  ): SARIFTool {
    return {
      driver: {
        name: 'CodeQual',
        version: metadata.version || '9.0.0',
        informationUri: `https://github.com/${metadata.repository}`,
        rules: groups.map(group => this.createSARIFRule(group))
      }
    };
  }
  
  private createSARIFRule(group: IssueGroup): SARIFRule {
    // Extract fix suggestion text (handle both string and object formats)
    const fixText = typeof group.fixSuggestion === 'string' 
      ? group.fixSuggestion 
      : group.fixSuggestion?.explanation || 'No fix suggestion available';
    
    return {
      id: group.rule,
      shortDescription: { text: group.rule },
      fullDescription: { text: group.description || group.rule },
      help: {
        text: fixText,
        markdown: fixText !== 'No fix suggestion available' ? `## How to Fix\n\n${fixText}` : undefined
      },
      defaultConfiguration: {
        level: this.mapSeverityToSARIF(group.severity)
      }
    };
  }
  
  private createSARIFResults(issues: EnrichedIssue[]): SARIFResult[] {
    return issues
      .filter(issue => issue.file && issue.line)
      .map(issue => this.createSARIFResult(issue));
  }
  
  private createSARIFResult(issue: EnrichedIssue): SARIFResult {
    const result: SARIFResult = {
      ruleId: issue.rule,
      level: this.mapSeverityToSARIF(issue.severity),
      message: { text: issue.message },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: issue.file },
          region: {
            startLine: issue.line || 1,
            startColumn: issue.column,
            snippet: issue.snippet ? { text: issue.snippet } : undefined
          }
        }
      }]
    };
    
    // Add fix if available
    if (issue.fixSuggestion?.correctedCode) {
      result.fixes = [{
        description: { 
          text: issue.fixSuggestion.explanation || 'Apply suggested fix' 
        },
        artifactChanges: [{
          artifactLocation: { uri: issue.file },
          replacements: [{
            deletedRegion: {
              startLine: issue.line || 1,
              startColumn: issue.column,
              endLine: (issue.line || 1) + this.countLines(issue.fixSuggestion.correctedCode)
            },
            insertedContent: { text: issue.fixSuggestion.correctedCode }
          }]
        }]
      }];
    }
    
    return result;
  }
  
  private mapSeverityToSARIF(severity: string): 'error' | 'warning' | 'note' | 'none' {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'note';
      default: return 'none';
    }
  }
  
  // ==========================================================================
  // Utility Methods
  // ==========================================================================
  
  private groupIssuesByFile(issues: EnrichedIssue[]): Record<string, EnrichedIssue[]> {
    const grouped: Record<string, EnrichedIssue[]> = {};
    for (const issue of issues) {
      if (!issue.file) continue;
      if (!grouped[issue.file]) grouped[issue.file] = [];
      grouped[issue.file].push(issue);
    }
    return grouped;
  }
  
  private toFileUri(file: string, workspaceRoot: string): string {
    // Normalize path separators
    const normalizedFile = file.replace(/\\/g, '/');
    const normalizedRoot = workspaceRoot.replace(/\\/g, '/');
    
    // Remove workspace root if present
    let relativePath = normalizedFile;
    if (normalizedFile.startsWith(normalizedRoot)) {
      relativePath = normalizedFile.substring(normalizedRoot.length);
    }
    
    // Ensure leading slash
    if (!relativePath.startsWith('/')) {
      relativePath = '/' + relativePath;
    }
    
    return `file://${normalizedRoot}${relativePath}`;
  }
  
  private getTitleFromRule(rule: string): string {
    // Convert rule ID to human-readable title
    // e.g., "javascript.lang.security.detect-child-process" -> "Detect Child Process"
    const parts = rule.split('.');
    const lastPart = parts[parts.length - 1];
    return lastPart
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  private countLines(text: string): number {
    return (text.match(/\n/g) || []).length + 1;
  }
}

