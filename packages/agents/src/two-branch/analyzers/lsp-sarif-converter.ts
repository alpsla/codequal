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

  // Fix recommendation
  fix: {
    recommendation: string;      // How to fix the issue
    bestPractices: string[];     // Best practices to follow
    correctedCode: string;        // The actual fixed code
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
   * BUG-072 FIX: Clean correctedCode to remove problematic AI patterns
   * Strips "// Should be changed to:" comments and before/after comparison text
   */
  private cleanCorrectedCode(code: string): string {
    if (!code) return code;

    let cleaned = code;

    // Remove "// Should be changed to:" and similar comment patterns
    cleaned = cleaned.replace(/\/\/\s*Should be changed to:?\s*\n?/gi, '');
    cleaned = cleaned.replace(/\/\/\s*Change to:?\s*\n?/gi, '');
    cleaned = cleaned.replace(/\/\/\s*Replace with:?\s*\n?/gi, '');
    cleaned = cleaned.replace(/\/\/\s*Before:?\s*\n?/gi, '');
    cleaned = cleaned.replace(/\/\/\s*After:?\s*\n?/gi, '');
    cleaned = cleaned.replace(/\/\/\s*Original:?\s*\n?/gi, '');
    cleaned = cleaned.replace(/\/\/\s*Fixed:?\s*\n?/gi, '');

    // Remove "/* ... */" block comment versions
    cleaned = cleaned.replace(/\/\*\s*Should be changed to:?\s*\*\/\s*\n?/gi, '');
    cleaned = cleaned.replace(/\/\*\s*Before:?\s*\*\/\s*\n?/gi, '');
    cleaned = cleaned.replace(/\/\*\s*After:?\s*\*\/\s*\n?/gi, '');

    // If the code has duplicate blocks (before/after), keep only the last one
    // Pattern: code block, then comment, then similar code block
    const lines = cleaned.split('\n');
    const halfPoint = Math.floor(lines.length / 2);

    // Check if first half and second half are similar (indicating before/after)
    if (lines.length >= 4) {
      const firstHalf = lines.slice(0, halfPoint).join('\n').trim();
      const secondHalf = lines.slice(halfPoint).join('\n').trim();

      // If they're very similar (same structure), keep only the second half
      if (this.areSimilarCodeBlocks(firstHalf, secondHalf)) {
        cleaned = secondHalf;
      }
    }

    return cleaned.trim();
  }

  /**
   * Check if two code blocks are similar (likely before/after versions)
   */
  private areSimilarCodeBlocks(code1: string, code2: string): boolean {
    // Simple heuristic: same number of lines and similar structure
    const lines1 = code1.split('\n').filter(l => l.trim());
    const lines2 = code2.split('\n').filter(l => l.trim());

    if (Math.abs(lines1.length - lines2.length) > 2) return false;

    // Check if structure is similar (same keywords at line starts)
    let matchCount = 0;
    const minLength = Math.min(lines1.length, lines2.length);

    for (let i = 0; i < minLength; i++) {
      const keyword1 = lines1[i].trim().split(/\s+/)[0];
      const keyword2 = lines2[i].trim().split(/\s+/)[0];
      if (keyword1 === keyword2) matchCount++;
    }

    // If >60% of keywords match, they're probably before/after versions
    return matchCount / minLength > 0.6;
  }

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
        newText: this.cleanCorrectedCode(issue.fixSuggestion.correctedCode)
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

      // BUG-085 FIX: Also check for duplicate/adjacent fixes with identical newText
      // This prevents generating multiple identical imports on consecutive lines
      const hasDuplicateFix = changesByFile[fileUri].some(existingEdit => {
        // Same fix text
        if (existingEdit.newText !== newEdit.newText) return false;

        const existingStart = existingEdit.range.start.line;
        const newStart = newEdit.range.start.line;

        // Within 10 lines of each other (likely same issue group)
        return Math.abs(existingStart - newStart) <= 10;
      });

      if (hasOverlap || hasDuplicateFix) {
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

    // ENHANCEMENT: Ensure all explanation fields are populated with meaningful content
    const explanation = {
      what: issue.fixSuggestion?.issueDescription?.what ||
        issue.message ||
        this.generateDefaultWhat(issue),
      why: issue.fixSuggestion?.issueDescription?.why ||
        this.generateDefaultWhy(issue),
      impact: issue.fixSuggestion?.issueDescription?.impact ||
        this.generateDefaultImpact(issue.severity, issue.category)
    };

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
            newText: this.cleanCorrectedCode(issue.fixSuggestion.correctedCode)
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
          description: issue.message || this.generateDefaultWhat(issue),  // ENSURE NOT EMPTY
          explanation                                                       // ENSURE ALL FIELDS
        },
        fix: {
          recommendation: issue.fixSuggestion?.fix || issue.fixSuggestion?.explanation || '',
          bestPractices: issue.fixSuggestion?.bestPractices || [],
          correctedCode: issue.fixSuggestion.correctedCode
        },
        context: {
          originalCode: issue.snippet || '',
          surroundingLines: this.getSurroundingLines(issue),              // NEW
          fileType: fileExtension,
          framework: this.detectFramework(issue.file),                     // NEW
          language
        },
        aiPrompt: this.generateAIPrompt(issue, language),
        codequalFix: {
          confidence: (issue.fixSuggestion as any)?.confidence || 0.8,
          source: this.determineFixSource(issue),                          // NEW
          verified: false
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
    // BUG FIX: Always provide meaningful help text, never show "No fix suggestion available"
    let fixText: string;

    if (typeof group.fixSuggestion === 'string') {
      fixText = group.fixSuggestion;
    } else if (group.fixSuggestion?.explanation) {
      fixText = group.fixSuggestion.explanation;
    } else if (group.fixSuggestion?.fix) {
      // Use the 'fix' field if explanation is missing
      fixText = group.fixSuggestion.fix;
    } else if (group.description) {
      // Fallback to group description
      fixText = `${group.description}. Review the code and apply appropriate fixes based on the rule: ${group.rule}`;
    } else {
      // Last resort: Generate helpful text based on rule
      fixText = `Fix ${group.rule} violations. This issue was detected by ${group.tool} and requires attention.`;
    }

    return {
      id: group.rule,
      shortDescription: { text: group.rule },
      fullDescription: { text: group.description || group.rule },
      help: {
        text: fixText,
        markdown: `## How to Fix\n\n${fixText}`
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
            insertedContent: { text: this.cleanCorrectedCode(issue.fixSuggestion.correctedCode) }
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
   /**
   * ENHANCEMENT: Generate default "what" description if not provided by AI
   */
  private generateDefaultWhat(issue: EnrichedIssue): string {
    return `Issue detected by ${issue.tool}: ${issue.rule}`;
  }

  /**
   * ENHANCEMENT: Generate default "why" explanation if not provided by AI
   */
  private generateDefaultWhy(issue: EnrichedIssue): string {
    const categoryExplanations: Record<string, string> = {
      security: 'This pattern can lead to security vulnerabilities and potential exploits',
      performance: 'This pattern can cause performance degradation and slow response times',
      architecture: 'This pattern violates architectural best practices and increases technical debt',
      dependency: 'This dependency has known vulnerabilities or compatibility issues',
      code_quality: 'This pattern reduces code maintainability and readability'
    };

    const category = issue.category?.toLowerCase() || 'code_quality';
    return categoryExplanations[category] || `This violates the ${issue.rule} rule`;
  }

  /**
   * ENHANCEMENT: Generate default impact description based on severity
   */
  private generateDefaultImpact(severity: string, category?: string): string {
    const impacts: Record<string, string> = {
      critical: 'Could lead to security breaches, data loss, or system compromise. Requires immediate attention.',
      high: 'May cause significant problems in production, security vulnerabilities, or system instability.',
      medium: 'Should be addressed to maintain code quality, prevent future issues, and ensure system reliability.',
      low: 'Minor issue that should be fixed for code consistency and best practices.'
    };

    return impacts[severity] || 'Should be addressed to improve code quality';
  }

  /**
   * ENHANCEMENT: Extract surrounding lines from snippet for better context
   */
  private getSurroundingLines(issue: EnrichedIssue): string[] | undefined {
    if (!issue.snippet) return undefined;

    const lines = issue.snippet.split('\n');
    // Return up to 10 lines of context
    return lines.slice(0, Math.min(10, lines.length));
  }

  /**
   * ENHANCEMENT: Detect framework from file path for better context
   */
  private detectFramework(filePath: string): string | undefined {
    const path = filePath.toLowerCase();

    if (path.includes('react') || path.includes('.jsx') || path.includes('.tsx')) return 'React';
    if (path.includes('vue')) return 'Vue';
    if (path.includes('angular')) return 'Angular';
    if (path.includes('next')) return 'Next.js';
    if (path.includes('express')) return 'Express';
    if (path.includes('nest')) return 'NestJS';

    return undefined;
  }

  /**
   * ENHANCEMENT: Determine fix source more accurately
   */
  private determineFixSource(issue: EnrichedIssue): 'ai_generated' | 'rule_based' | 'template' {
    // Check if fixSuggestion has explicit source
    const fixSuggestion = issue.fixSuggestion as any;
    if (fixSuggestion?.source) return fixSuggestion.source;

    // Infer from tool type
    const tool = issue.tool?.toLowerCase() || '';

    if (tool === 'eslint' || tool === 'typescript') return 'rule_based';
    if (tool === 'semgrep') return 'template';

    // Default to AI-generated for other tools
    return 'ai_generated';
  }

  // Generate AI prompt for IDE's AI to use if they want to generate their own fix
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

