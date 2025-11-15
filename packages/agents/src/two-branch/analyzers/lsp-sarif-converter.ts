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

// Enhanced metadata for IDE AI generation (hybrid approach)
export interface LSPCodeActionData {
  // Issue context
  issue: {
    type: 'code_quality' | 'security' | 'performance' | 'architecture' | 'dependency';
    rule: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
    explanation: {
      what: string;
      why: string;
      impact: string;
    };
  };

  // Code context for AI
  context: {
    originalCode: string;
    surroundingLines?: string[];
    fileType: string;
    framework?: string;
    language?: string;
  };

  // AI prompt (if IDE wants to use it)
  aiPrompt?: string;

  // Validation metadata
  codequalFix: {
    confidence: number;      // 0.0 - 1.0
    source: 'ai_generated' | 'rule_based' | 'template';
    verified: boolean;       // Has this type of fix been validated?
  };

  // Telemetry (for tracking)
  telemetry?: {
    ruleId: string;
    toolName: string;
    issueCount: number;      // How many issues of this type in the PR
  };
}

export interface LSPCodeAction {
  title: string;
  kind: 'quickfix' | 'refactor' | 'source';
  edit: LSPWorkspaceEdit;
  diagnostics?: LSPDiagnostic[];

  // NEW: Enhanced metadata for IDE AI (hybrid approach)
  data?: LSPCodeActionData;
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
   * 
   * Returns:
   * - Individual code actions (one per issue) for granular control
   * - Batch actions (Apply All, Apply by Severity) for one-click fixes
   */
  public generateLSPCodeActions(
    issues: EnrichedIssue[],
    workspaceRoot: string
  ): LSPCodeAction[] {
    const codeActions: LSPCodeAction[] = [];
    
    // Filter issues with fixes
    const fixableIssues = issues.filter(issue => issue.fixSuggestion?.correctedCode);
    
    // ========================================================================
    // BATCH ACTIONS (One-click fixes) - ADDED FIRST so they appear at top
    // ========================================================================
    
    // 1. Apply All Fixes (377 issues)
    if (fixableIssues.length > 0) {
      const allFixesAction = this.createBatchCodeAction(
        `Apply All Fixes (${fixableIssues.length} issues)`,
        fixableIssues,
        workspaceRoot
      );
      if (allFixesAction) codeActions.push(allFixesAction);
    }
    
    // 2. Apply by Severity Groups
    const issuesBySeverity = this.groupIssuesBySeverity(fixableIssues);
    
    if (issuesBySeverity.critical.length > 0) {
      const criticalAction = this.createBatchCodeAction(
        `Apply Critical Fixes (${issuesBySeverity.critical.length} issues)`,
        issuesBySeverity.critical,
        workspaceRoot
      );
      if (criticalAction) codeActions.push(criticalAction);
    }
    
    if (issuesBySeverity.high.length > 0) {
      const highAction = this.createBatchCodeAction(
        `Apply High Severity Fixes (${issuesBySeverity.high.length} issues)`,
        issuesBySeverity.high,
        workspaceRoot
      );
      if (highAction) codeActions.push(highAction);
    }
    
    if (issuesBySeverity.medium.length > 0) {
      const mediumAction = this.createBatchCodeAction(
        `Apply Medium Severity Fixes (${issuesBySeverity.medium.length} issues)`,
        issuesBySeverity.medium,
        workspaceRoot
      );
      if (mediumAction) codeActions.push(mediumAction);
    }
    
    if (issuesBySeverity.low.length > 0) {
      const lowAction = this.createBatchCodeAction(
        `Apply Low Severity Fixes (${issuesBySeverity.low.length} issues)`,
        issuesBySeverity.low,
        workspaceRoot
      );
      if (lowAction) codeActions.push(lowAction);
    }
    
    // ========================================================================
    // INDIVIDUAL ACTIONS (Per-issue fixes) - For granular control
    // ========================================================================
    
    // Group issues by file for efficient processing
    const issuesByFile = this.groupIssuesByFile(fixableIssues);
    
    for (const [file, fileIssues] of Object.entries(issuesByFile)) {
      for (const issue of fileIssues) {
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
  
  /**
   * Create a batch code action that applies multiple fixes across multiple files
   * This enables "Apply All Fixes" and "Apply by Severity" one-click actions
   */
  private createBatchCodeAction(
    title: string,
    issues: EnrichedIssue[],
    workspaceRoot: string
  ): LSPCodeAction | null {
    if (issues.length === 0) return null;

    // Group issues by file URI
    const changesByFile: Record<string, LSPTextEdit[]> = {};
    const diagnostics: LSPDiagnostic[] = [];

    for (const issue of issues) {
      if (!issue.fixSuggestion?.correctedCode || !issue.file) continue;

      const fileUri = this.toFileUri(issue.file, workspaceRoot);
      const line = (issue.line || 1) - 1; // Convert to 0-based
      const endLine = line + this.countLines(issue.fixSuggestion.correctedCode);

      const newEdit: LSPTextEdit = {
        range: {
          start: { line, character: 0 },
          end: { line: endLine, character: 0 }
        },
        newText: issue.fixSuggestion.correctedCode
      };

      // BUG FIX: Check for overlapping ranges (not just same start line)
      // Example: Lines 15-22, 16-23, 17-24 all overlap and conflict
      if (!changesByFile[fileUri]) {
        changesByFile[fileUri] = [];
      }

      const hasOverlap = changesByFile[fileUri].some(existingEdit => {
        const existingStart = existingEdit.range.start.line;
        const existingEnd = existingEdit.range.end.line;
        const newStart = newEdit.range.start.line;
        const newEnd = newEdit.range.end.line;

        // Check if ranges overlap
        return !(newEnd <= existingStart || newStart >= existingEnd);
      });

      if (hasOverlap) {
        // Skip duplicate/overlapping edit, but still add diagnostic for this issue
        diagnostics.push({
          range: {
            start: { line, character: 0 },
            end: { line: line + 1, character: 0 }
          },
          severity: this.mapSeverityToLSP(issue.severity),
          code: issue.rule,
          source: `codequal-${issue.tool}`,
          message: issue.message
        });
        continue;
      }

      // Add non-overlapping edit
      changesByFile[fileUri].push(newEdit);

      // Add diagnostic for this issue
      diagnostics.push({
        range: {
          start: { line, character: 0 },
          end: { line: line + 1, character: 0 }
        },
        severity: this.mapSeverityToLSP(issue.severity),
        code: issue.rule,
        source: `codequal-${issue.tool}`,
        message: issue.message
      });
    }

    if (Object.keys(changesByFile).length === 0) return null;

    return {
      title,
      kind: 'quickfix',
      edit: {
        changes: changesByFile
      },
      diagnostics
    };
  }
  
  private createLSPCodeAction(
    issue: EnrichedIssue,
    fileUri: string
  ): LSPCodeAction | null {
    if (!issue.fixSuggestion?.correctedCode) return null;

    const line = (issue.line || 1) - 1; // Convert to 0-based
    const endLine = line + this.countLines(issue.fixSuggestion.correctedCode);

    // Determine issue type from tool/category
    const issueType = this.determineIssueType(issue);

    // Extract file extension for language detection
    const fileExtension = fileUri.split('.').pop() || '';
    const language = this.getLanguageFromExtension(fileExtension);

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
      }],

      // Enhanced metadata for IDE AI (hybrid approach)
      data: {
        issue: {
          type: issueType,
          rule: issue.rule,
          severity: issue.severity,
          category: issue.category || 'code_quality',
          description: issue.message,
          explanation: {
            what: issue.fixSuggestion?.issueDescription?.what || issue.message,
            why: issue.fixSuggestion?.issueDescription?.why ||
                 `This violates the ${issue.rule} rule`,
            impact: issue.fixSuggestion?.issueDescription?.impact ||
                   `${issue.severity} severity: affects code quality`
          }
        },
        context: {
          originalCode: issue.snippet || '',
          fileType: fileExtension,
          language
        },
        aiPrompt: this.generateAIPrompt(issue, language),
        codequalFix: {
          confidence: (issue.fixSuggestion as any)?.confidence || 0.8,
          source: (issue.fixSuggestion as any)?.source || 'ai_generated',
          verified: false // Will be updated based on user feedback
        },
        telemetry: {
          ruleId: issue.rule,
          toolName: issue.tool,
          issueCount: 1
        }
      }
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
  
  private groupIssuesBySeverity(issues: EnrichedIssue[]): {
    critical: EnrichedIssue[];
    high: EnrichedIssue[];
    medium: EnrichedIssue[];
    low: EnrichedIssue[];
  } {
    const grouped = {
      critical: [] as EnrichedIssue[],
      high: [] as EnrichedIssue[],
      medium: [] as EnrichedIssue[],
      low: [] as EnrichedIssue[]
    };
    
    for (const issue of issues) {
      const severity = (issue.severity || 'low').toLowerCase();
      if (severity === 'critical') {
        grouped.critical.push(issue);
      } else if (severity === 'high') {
        grouped.high.push(issue);
      } else if (severity === 'medium') {
        grouped.medium.push(issue);
      } else {
        grouped.low.push(issue);
      }
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

  /**
   * Determine issue type from tool and category
   */
  private determineIssueType(issue: EnrichedIssue): 'code_quality' | 'security' | 'performance' | 'architecture' | 'dependency' {
    const tool = issue.tool?.toLowerCase() || '';
    const category = issue.category?.toLowerCase() || '';

    // Security tools
    if (tool.includes('semgrep') || tool.includes('snyk') || tool.includes('dependency-check') ||
        category.includes('security') || category.includes('vulnerability')) {
      return 'security';
    }

    // Dependency tools
    if (tool.includes('dependency') || tool.includes('ossindex') ||
        category.includes('dependency')) {
      return 'dependency';
    }

    // Performance tools
    if (tool.includes('performance') || category.includes('performance')) {
      return 'performance';
    }

    // Architecture tools
    if (tool.includes('architecture') || category.includes('architecture')) {
      return 'architecture';
    }

    // Default to code quality
    return 'code_quality';
  }

  /**
   * Get language from file extension
   */
  private getLanguageFromExtension(extension: string): string {
    const extMap: Record<string, string> = {
      'java': 'java',
      'kt': 'kotlin',
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'cs': 'csharp',
      'php': 'php',
      'swift': 'swift',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp'
    };

    return extMap[extension.toLowerCase()] || 'unknown';
  }

  /**
   * Generate AI prompt for IDE's AI to use if they want to generate their own fix
   */
  private generateAIPrompt(issue: EnrichedIssue, language: string): string {
    const rule = issue.rule;
    const message = issue.message;
    const explanation = issue.fixSuggestion?.issueDescription;

    let prompt = `You are a code quality expert. Fix the following ${language} code issue:\n\n`;
    prompt += `Rule: ${rule}\n`;
    prompt += `Issue: ${message}\n\n`;

    if (explanation) {
      prompt += `Context:\n`;
      prompt += `- What: ${explanation.what}\n`;
      prompt += `- Why: ${explanation.why}\n`;
      prompt += `- Impact: ${explanation.impact}\n\n`;
    }

    prompt += `Original code:\n${issue.snippet || '(no snippet available)'}\n\n`;
    prompt += `Please provide a fixed version of this code that resolves the issue while:\n`;
    prompt += `1. Maintaining the original functionality\n`;
    prompt += `2. Following ${language} best practices\n`;
    prompt += `3. Keeping the code style consistent\n`;
    prompt += `4. Avoiding any breaking changes\n\n`;
    prompt += `Return ONLY the corrected code without explanations.`;

    return prompt;
  }
}

