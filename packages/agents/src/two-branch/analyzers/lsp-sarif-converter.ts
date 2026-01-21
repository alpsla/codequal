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
import { classifyIssue } from '../../fix-agent/issue-classifier';
import { routeToFixer, getFixerConfig, EnrichedIssue as FixEnrichedIssue } from '../../fix-agent/fix-router';

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
  // Issue context (optional for batch actions)
  issue?: {
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

  // Fix recommendation (optional for batch actions)
  fix?: {
    recommendation: string;      // How to fix the issue
    bestPractices: string[];     // Best practices to follow
    correctedCode: string;        // The actual fixed code
  };

  // Code context for AI (optional for batch actions)
  context?: {
    originalCode: string;
    surroundingLines?: string[];
    fileType: string;
    framework?: string;
    language?: string;
  };

  // AI prompt (if IDE wants to use it)
  aiPrompt?: string;

  // Validation metadata (optional for batch actions)
  codequalFix?: {
    confidence: number;      // 0.0 - 1.0
    source: 'ai_generated' | 'rule_based' | 'template' | 'ai_needed';  // ai_needed = IDE AI should generate
    verified: boolean;       // Has this type of fix been validated?
  };

  // Three-Tier Fix System (NEW)
  fixTier?: {
    tier: 1 | 2 | 3;                    // 1=Native tool, 2=Dedicated fixer, 3=AI
    fixer: string;                       // Tool name (eslint, ruff, sorald, ai)
    command?: string;                    // Command to execute (e.g., 'eslint --fix')
    issueType: 'style' | 'quality' | 'security' | 'performance' | 'maintainability' | 'compatibility' | 'dependency' | 'unknown';
    fixable: boolean;                    // Can be auto-fixed
    estimatedTime?: number;              // Estimated fix time in ms
    batchable?: boolean;                 // Can be batched with other fixes
  };

  // Telemetry (for tracking)
  telemetry?: {
    ruleId: string;
    toolName: string;
    issueCount: number;      // How many issues of this type in the PR
  };

  // Batch action metadata (only for "Fix All" actions)
  batchSummary?: {
    totalIssues: number;
    filesAffected: number;
    byCategory: { security: number; quality: number; performance: number; style: number };
    bySeverity: { critical: number; high: number; medium: number; low: number };
  };
  topIssueTypes?: { rule: string; count: number; severity: string }[];
  fixTierBreakdown?: { tier1: number; tier2: number; tier3: number; unfixable: number };
}

export interface LSPCodeAction {
  title: string;
  kind: 'quickfix' | 'refactor' | 'source';
  edit?: LSPWorkspaceEdit;  // Optional: omitted for AI-needed actions where IDE generates the fix
  diagnostics?: LSPDiagnostic[];

  // NEW: Enhanced metadata for IDE AI (hybrid approach)
  data?: LSPCodeActionData;
}

export interface LSPDiagnosticRelatedInformation {
  location: {
    uri: string;
    range: LSPRange;
  };
  message: string;
}

export interface LSPDiagnostic {
  range: LSPRange;
  severity: 1 | 2 | 3 | 4; // 1=Error, 2=Warning, 3=Information, 4=Hint
  code: string;
  source: string;
  message: string;
  relatedInformation?: LSPDiagnosticRelatedInformation[];
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
   * SESSION 87: Helper to get correctedCode from either issue.fix or issue.fixSuggestion
   * The AI-fixer stores fixes in issue.fix (string), but some code paths use fixSuggestion.correctedCode
   */
  private getCorrectedCode(issue: any): string | null {
    // Check fixSuggestion.correctedCode first (legacy path)
    if (issue.fixSuggestion?.correctedCode) {
      console.log(`[LSP-SARIF] getCorrectedCode: Found in fixSuggestion for ${issue.rule}`);
      return issue.fixSuggestion.correctedCode;
    }
    // Check issue.fix (AI-fixer path)
    if (typeof issue.fix === 'string' && issue.fix.length > 0) {
      console.log(`[LSP-SARIF] getCorrectedCode: Found in issue.fix (string) for ${issue.rule}`);
      return issue.fix;
    }
    // Check issue.fix.correctedCode (object path)
    if (issue.fix?.correctedCode) {
      console.log(`[LSP-SARIF] getCorrectedCode: Found in issue.fix.correctedCode for ${issue.rule}`);
      return issue.fix.correctedCode;
    }
    console.log(`[LSP-SARIF] getCorrectedCode: NOT FOUND for ${issue.rule} (has fixSuggestion: ${!!issue.fixSuggestion}, has fix: ${!!issue.fix}, fix type: ${typeof issue.fix})`);
    return null;
  }

  /**
   * SESSION 87: Helper to check if an issue has a valid fix
   */
  private hasFix(issue: any): boolean {
    return !!this.getCorrectedCode(issue);
  }

  /**
   * BUG-072 FIX: Clean correctedCode to remove problematic AI patterns
   * Strips "// Should be changed to:" comments and before/after comparison text
   * 
   * BUG-LSP-001 FIX: Also handles template patterns embedded in code like:
   * "public static void main(String[] args) {\n\nshould be:\n\n..."
   */
  /**
   * Clean and validate correctedCode before applying
   * BUG-LSP-004: Added file context validation to prevent mismatched fixes
   */
  private cleanCorrectedCode(code: string, targetFile?: string): string {
    if (!code) return code;

    let cleaned = code;

    // BUG-LSP-001 FIX: Check for template patterns embedded in code (not comments)
    // Pattern: "X should be: Y" or "X\n\nshould be:\n\nY"
    const templatePatterns = [
      /\n\nshould be:\n\n/i,
      /\n\nchange to:\n\n/i,
      /\n\nreplace with:\n\n/i,
      /\n\ninstead of:\n\n/i,
    ];

    for (const pattern of templatePatterns) {
      if (pattern.test(cleaned)) {
        // Split on the pattern and take the "after" part
        const parts = cleaned.split(pattern);
        if (parts.length >= 2) {
          // Take the last part (the "after" code)
          cleaned = parts[parts.length - 1].trim();
          // If the "after" part still looks like template text, return empty
          if (cleaned.includes('should be:') || cleaned.includes('}}')) {
            console.warn('[LSP-SARIF] Detected template text in correctedCode, rejecting fix');
            return ''; // Reject this fix entirely
          }
        }
      }
    }

    // BUG-LSP-004 FIX: Validate fix matches target file context
    if (targetFile && !this.isFixAppropriateForFile(cleaned, targetFile)) {
      console.warn(`[LSP-SARIF] Fix content doesn't match target file ${targetFile}, rejecting`);
      return ''; // Reject mismatched fix
    }

    // If code contains "should be:" anywhere (not in comments), it's likely template text
    if (/(?<!\/\/.*)\bshould be:/i.test(cleaned)) {
      console.warn('[LSP-SARIF] Detected "should be:" in code, rejecting fix');
      return ''; // Reject this fix entirely
    }

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
   * BUG-LSP-004 FIX: Validate that fix content is appropriate for the target file
   * Prevents applying Pet.java code to MavenWrapperDownloader.java
   *
   * SESSION 87: Enhanced validation to catch more context-specific patterns
   */
  private isFixAppropriateForFile(fixContent: string, targetFile: string): boolean {
    if (!fixContent || !targetFile) return true; // No validation possible

    const fileName = targetFile.split('/').pop()?.toLowerCase() || '';
    const code = fixContent.trim();

    // Extract class name from file (e.g., "Pet.java" -> "pet")
    const targetClassName = fileName.replace(/\.(java|ts|js|py|kt|scala|go|rs)$/i, '');

    // SESSION 87: RULE 1 - Reject large code blocks (likely context-specific)
    const lineCount = code.split('\n').length;
    if (lineCount > 15) {
      console.warn(`[LSP-SARIF] Fix too large (${lineCount} lines) for ${targetClassName} - likely context-specific`);
      return false;
    }

    // Check for obvious mismatches - fix contains class definitions for different classes
    const classDefPattern = /\b(class|interface|enum)\s+(\w+)/gi;
    const matches = [...fixContent.matchAll(classDefPattern)];

    for (const match of matches) {
      const definedClass = match[2].toLowerCase();
      // If fix defines a class that doesn't match target file name, it's likely wrong
      if (definedClass !== targetClassName &&
          !targetClassName.includes(definedClass) &&
          !definedClass.includes(targetClassName)) {
        // Exception: Test files can contain test classes
        if (!fileName.includes('test') && !definedClass.includes('test')) {
          console.warn(`[LSP-SARIF] Fix defines class '${definedClass}' but target is '${targetClassName}'`);
          return false;
        }
      }
    }

    // SESSION 87: RULE 2 - Check for project-specific imports
    const suspiciousImports = [
      /from\s+["'][.\/]+[^"']+["']/,  // Relative imports like from "./socket"
      /import\s+.*from\s+["']@[^"']+["']/,  // Scoped packages like @company/pkg
      /import\s+\{[^}]+\}\s+from\s+["']engine\.io/i,  // Specific package imports
    ];

    for (const pattern of suspiciousImports) {
      if (pattern.test(code)) {
        console.warn(`[LSP-SARIF] Fix contains project-specific imports for ${targetClassName}`);
        return false;
      }
    }

    // SESSION 87: RULE 3 - Check for context-specific code patterns (medium-sized fixes)
    if (lineCount > 5) {
      const contextSpecificPatterns = [
        /\bthis\.context\./,           // Specific object references
        /getServletContext\(\)/,       // Very specific API calls
        /asciidoctorTask/i,            // Project-specific names
        /submittedQuestions/,          // Business-logic specific
        /secQuestionStore/,            // Business-logic specific
      ];

      for (const pattern of contextSpecificPatterns) {
        if (pattern.test(code)) {
          console.warn(`[LSP-SARIF] Fix contains context-specific code for ${targetClassName}`);
          return false;
        }
      }
    }

    // Check for method signatures that reference completely different entities
    // e.g., "public Pet getPet(" in a non-Pet file
    const methodPatterns = [
      /\bpublic\s+(\w+)\s+get(\w+)\s*\(/gi,  // getter methods
      /\bpublic\s+void\s+set(\w+)\s*\(/gi,   // setter methods
    ];

    for (const pattern of methodPatterns) {
      const methodMatches = [...fixContent.matchAll(pattern)];
      for (const match of methodMatches) {
        const entityName = (match[1] || match[2] || '').toLowerCase();
        // If method references an entity not related to target file
        if (entityName.length > 3 && // Ignore short names like "int", "Pet"
            !targetClassName.includes(entityName) &&
            !entityName.includes(targetClassName) &&
            !['void', 'string', 'int', 'long', 'list', 'set', 'map', 'boolean'].includes(entityName)) {

          // Check if file might be a utility/wrapper that could legitimately contain this
          if (!fileName.includes('util') && !fileName.includes('helper') && !fileName.includes('wrapper')) {
            console.warn(`[LSP-SARIF] Fix contains '${entityName}' method but target is '${targetClassName}'`);
            return false;
          }
        }
      }
    }

    // Generic fixes (imports, simple refactors) should pass through
    // Only reject fixes that clearly belong to a different context
    return true;
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

    // SESSION 87: Filter issues with fixes (check both issue.fix and fixSuggestion.correctedCode)
    const fixableIssues = issues.filter(issue => this.hasFix(issue));

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

    // Group issues by file for efficient processing - NOW INCLUDES ALL ISSUES
    const allIssuesByFile = this.groupIssuesByFile(issues);

    for (const [file, fileIssues] of Object.entries(allIssuesByFile)) {
      for (const issue of fileIssues) {
        const fileUri = this.toFileUri(file, workspaceRoot);
        const hasFix = this.hasFix(issue);  // SESSION 87: Check both fix locations

        if (hasFix) {
          // Issue has pre-generated fix - create full Code Action with edit
          const codeAction = this.createLSPCodeAction(issue, fileUri);
          if (codeAction) codeActions.push(codeAction);
        } else {
          // Issue WITHOUT fix - create diagnostic action with rich metadata for IDE AI
          const diagnosticAction = this.createLSPDiagnosticAction(issue, fileUri);
          if (diagnosticAction) codeActions.push(diagnosticAction);
        }
      }
    }

    return codeActions;
  }

  /**
   * Create LSP Code Action for issues WITHOUT pre-generated fixes
   * Includes rich metadata so IDE AIs (Cursor, Copilot) can generate fixes on-demand
   */
  private createLSPDiagnosticAction(
    issue: EnrichedIssue,
    fileUri: string
  ): LSPCodeAction | null {
    if (!issue.file || !issue.line) return null;

    const line = (issue.line || 1) - 1; // Convert to 0-based
    const issueType = this.determineIssueType(issue);
    const fileExtension = fileUri.split('.').pop() || '';
    const language = this.getLanguageFromExtension(fileExtension);

    // Generate comprehensive explanation for IDE AI
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
      title: `[AI Fix Needed] ${this.getTitleFromRule(issue.rule)}`,
      kind: 'quickfix',  // Standard quickfix kind - metadata indicates AI needed
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

      // Rich metadata for IDE AI to generate fix
      data: {
        issue: {
          type: issueType,
          rule: issue.rule,
          severity: issue.severity,
          category: issue.category || 'code_quality',
          description: issue.message || this.generateDefaultWhat(issue),
          explanation
        },
        fix: {
          recommendation: issue.fixSuggestion?.fix ||
            issue.fixSuggestion?.explanation ||
            this.generateFixRecommendation(issue),
          bestPractices: issue.fixSuggestion?.bestPractices ||
            this.generateBestPractices(issue),
          correctedCode: null  // No pre-generated fix - IDE AI should generate
        },
        context: {
          originalCode: issue.snippet || '',
          surroundingLines: this.getSurroundingLines(issue),
          fileType: fileExtension,
          framework: this.detectFramework(issue.file),
          language
        },
        aiPrompt: this.generateAIPrompt(issue, language),
        codequalFix: {
          confidence: 0,      // No fix yet
          source: 'ai_needed' as const,  // Indicates AI generation required
          verified: false
        },
        fixTier: {
          tier: 3 as const,   // Tier 3 = AI fix required
          fixer: 'ide-ai',
          issueType: issueType as any,
          fixable: true,      // Can be fixed by IDE AI
          batchable: false
        },
        telemetry: {
          ruleId: issue.rule,
          toolName: issue.tool || 'unknown',
          issueCount: 1
        }
      }
    };
  }

  /**
   * Generate fix recommendation for issues without pre-generated fixes
   */
  private generateFixRecommendation(issue: EnrichedIssue): string {
    const rule = issue.rule || '';
    const message = issue.message || '';

    // Generate contextual recommendation based on issue type
    if (rule.includes('security') || rule.includes('injection') || rule.includes('xss')) {
      return `Security issue detected: ${message}. Sanitize user input, use parameterized queries, or apply proper encoding.`;
    }
    if (rule.includes('performance') || rule.includes('complexity')) {
      return `Performance issue detected: ${message}. Consider optimizing the code path or reducing complexity.`;
    }
    if (rule.includes('deprecated')) {
      return `Deprecated API usage: ${message}. Update to use the recommended modern alternative.`;
    }

    return `Issue detected: ${message}. Review the code and apply the appropriate fix based on best practices.`;
  }

  /**
   * Generate best practices for issues without pre-generated fixes
   */
  private generateBestPractices(issue: EnrichedIssue): string[] {
    const practices: string[] = [];
    const rule = issue.rule || '';

    if (rule.includes('security')) {
      practices.push('Always validate and sanitize user input');
      practices.push('Use parameterized queries for database operations');
      practices.push('Apply principle of least privilege');
    }
    if (rule.includes('error') || rule.includes('exception')) {
      practices.push('Handle errors gracefully with proper error messages');
      practices.push('Log errors for debugging but avoid exposing sensitive info');
    }
    if (rule.includes('performance')) {
      practices.push('Avoid unnecessary computations in loops');
      practices.push('Use caching where appropriate');
    }

    if (practices.length === 0) {
      practices.push('Follow language-specific coding standards');
      practices.push('Write self-documenting code');
      practices.push('Consider edge cases and error handling');
    }

    return practices;
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
      workspaceRoot?: string;  // Optional: for converting absolute paths to relative
    }
  ): SARIFReport {
    return {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [{
        tool: this.createSARIFTool(groups, metadata),
        results: this.createSARIFResults(issues, metadata.workspaceRoot)
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
      // SESSION 87: Get correctedCode from either fix or fixSuggestion
      const correctedCode = this.getCorrectedCode(issue);
      if (!correctedCode || !issue.file) continue;

      // BUG-LSP-001 FIX: Clean the code and skip if it returns empty (rejected template text)
      // BUG-LSP-004 FIX: Also validate fix matches target file context
      const cleanedCode = this.cleanCorrectedCode(correctedCode, issue.file);
      if (!cleanedCode) continue; // Skip issues with template/invalid/mismatched fixes

      const fileUri = this.toFileUri(issue.file, workspaceRoot);
      const line = (issue.line || 1) - 1; // Convert to 0-based
      const endLine = line + this.countLines(cleanedCode);

      const newEdit: LSPTextEdit = {
        range: {
          start: { line, character: 0 },
          end: { line: endLine, character: 0 }
        },
        newText: cleanedCode
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
          message: issue.message,
          // BUG-LSP-002 FIX: Include file path in diagnostic
          relatedInformation: [{
            location: {
              uri: fileUri,
              range: {
                start: { line, character: 0 },
                end: { line: line + 1, character: 0 }
              }
            },
            message: `Issue in ${issue.file} (fix skipped - overlapping with another fix)`
          }]
        });
        continue;
      }

      // Add non-overlapping edit
      changesByFile[fileUri].push(newEdit);

      // Add diagnostic for this issue with file reference
      diagnostics.push({
        range: {
          start: { line, character: 0 },
          end: { line: line + 1, character: 0 }
        },
        severity: this.mapSeverityToLSP(issue.severity),
        code: issue.rule,
        source: `codequal-${issue.tool}`,
        message: issue.message,
        // BUG-LSP-002 FIX: Include file path in diagnostic for IDE navigation
        relatedInformation: [{
          location: {
            uri: fileUri,
            range: {
              start: { line, character: 0 },
              end: { line: line + 1, character: 0 }
            }
          },
          message: `Issue in ${issue.file}`
        }]
      });
    }

    if (Object.keys(changesByFile).length === 0) return null;

    // BUG-LSP-003 FIX: Build summary metadata for batch action
    const issuesByCategory = this.categorizeIssues(issues);
    const issuesBySeverity = this.groupIssuesBySeverity(issues);

    return {
      title,
      kind: 'quickfix',
      edit: {
        changes: changesByFile
      },
      diagnostics,
      // BUG-LSP-003 FIX: Add rich metadata to batch actions
      data: {
        batchSummary: {
          totalIssues: issues.length,
          filesAffected: Object.keys(changesByFile).length,
          byCategory: {
            security: issuesByCategory.security?.length || 0,
            quality: issuesByCategory.quality?.length || 0,
            performance: issuesByCategory.performance?.length || 0,
            style: issuesByCategory.style?.length || 0
          },
          bySeverity: {
            critical: issuesBySeverity.critical.length,
            high: issuesBySeverity.high.length,
            medium: issuesBySeverity.medium.length,
            low: issuesBySeverity.low.length
          }
        },
        // Include top 5 issue types for quick reference
        topIssueTypes: this.getTopIssueTypes(issues, 5),
        // Fix tier breakdown
        fixTierBreakdown: this.getFixTierBreakdown(issues)
      }
    };
  }

  /**
   * Categorize issues by type (security, quality, performance, style)
   */
  private categorizeIssues(issues: EnrichedIssue[]): Record<string, EnrichedIssue[]> {
    const categories: Record<string, EnrichedIssue[]> = {
      security: [],
      quality: [],
      performance: [],
      style: []
    };

    for (const issue of issues) {
      const category = (issue.detectedCategory || issue.category || 'quality').toLowerCase();
      if (category.includes('security')) {
        categories.security.push(issue);
      } else if (category.includes('performance')) {
        categories.performance.push(issue);
      } else if (category.includes('style') || category.includes('lint')) {
        categories.style.push(issue);
      } else {
        categories.quality.push(issue);
      }
    }

    return categories;
  }

  /**
   * Get top N issue types by frequency
   */
  private getTopIssueTypes(issues: EnrichedIssue[], limit: number): Array<{ rule: string; count: number; severity: string }> {
    const counts: Record<string, { count: number; severity: string }> = {};

    for (const issue of issues) {
      if (!counts[issue.rule]) {
        counts[issue.rule] = { count: 0, severity: issue.severity };
      }
      counts[issue.rule].count++;
    }

    return Object.entries(counts)
      .map(([rule, data]) => ({ rule, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get fix tier breakdown (Tier 1: native tools, Tier 2: dedicated fixers, Tier 3: AI)
   * Infers tier from tool type and fix availability
   */
  private getFixTierBreakdown(issues: EnrichedIssue[]): { tier1: number; tier2: number; tier3: number; unfixable: number } {
    const breakdown = { tier1: 0, tier2: 0, tier3: 0, unfixable: 0 };

    // Tier 1 tools: native formatters/linters with --fix
    const tier1Tools = ['eslint', 'prettier', 'stylelint', 'ruff', 'black', 'isort', 'gofmt', 'rustfmt'];
    // Tier 2 tools: dedicated security/quality fixers
    const tier2Tools = ['semgrep', 'sorald', 'spotbugs', 'checkstyle', 'pmd', 'bandit'];

    for (const issue of issues) {
      // SESSION 87: Check both fix locations
      if (!this.hasFix(issue)) {
        breakdown.unfixable++;
        continue;
      }

      const toolLower = (issue.tool || '').toLowerCase();
      if (tier1Tools.some(t => toolLower.includes(t))) {
        breakdown.tier1++;
      } else if (tier2Tools.some(t => toolLower.includes(t))) {
        breakdown.tier2++;
      } else {
        // AI-generated fixes or unknown tools
        breakdown.tier3++;
      }
    }

    return breakdown;
  }

  private createLSPCodeAction(
    issue: EnrichedIssue,
    fileUri: string
  ): LSPCodeAction | null {
    // SESSION 87: Get correctedCode from either fix or fixSuggestion
    const correctedCode = this.getCorrectedCode(issue);
    if (!correctedCode) return null;

    const line = (issue.line || 1) - 1; // Convert to 0-based
    const endLine = line + this.countLines(correctedCode);

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

    // BUG-LSP-004 FIX: Validate fix matches target file before creating action
    // SESSION 87: Use correctedCode extracted earlier (from issue.fix or fixSuggestion)
    const cleanedCode = this.cleanCorrectedCode(correctedCode, issue.file);
    if (!cleanedCode) return null; // Fix rejected - doesn't match file context

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
            newText: cleanedCode
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
          correctedCode: correctedCode  // SESSION 87: Use extracted correctedCode
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
        },
        // Three-Tier Fix System - Add fix routing information
        fixTier: this.getFixTierInfo(issue)
      }
    };
  }

  /**
   * Get fix tier information for an issue using the Three-Tier Fix System
   * Tier 1: Native tool fixes (eslint --fix, ruff --fix)
   * Tier 2: Dedicated fixer tools (Sorald, autoflake, OpenRewrite)
   * Tier 3: AI-generated fixes (fallback)
   */
  private getFixTierInfo(issue: EnrichedIssue): LSPCodeActionData['fixTier'] {
    try {
      // Classify the issue to get type and fixability
      const classification = classifyIssue(issue.rule, issue.tool);

      // Create enriched issue for routing
      const enrichedForRouting: FixEnrichedIssue = {
        id: `${issue.rule}-${issue.line}`,
        ruleId: issue.rule,
        tool: issue.tool,
        message: issue.message,
        file: issue.file,
        line: issue.line || 1,
        severity: issue.severity as 'critical' | 'high' | 'medium' | 'low',
        category: issue.category
      };

      // Route the issue to get fixer information
      const routed = routeToFixer(enrichedForRouting);
      const fixerConfig = getFixerConfig(routed.route.fixer);

      return {
        tier: routed.route.tier,
        fixer: routed.route.fixer,
        command: routed.route.command || fixerConfig?.command,
        issueType: classification.issueType,
        fixable: classification.fixable,
        estimatedTime: routed.route.estimatedTime || fixerConfig?.estimatedTime,
        batchable: routed.route.batchable ?? fixerConfig?.batchable
      };
    } catch (error) {
      // Fallback to AI tier if classification fails
      return {
        tier: 3,
        fixer: 'ai',
        issueType: 'unknown',
        fixable: false,
        estimatedTime: 3000,
        batchable: true
      };
    }
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

  private createSARIFResults(issues: EnrichedIssue[], workspaceRoot?: string): SARIFResult[] {
    return issues
      .filter(issue => issue.file && issue.line)
      .map(issue => this.createSARIFResult(issue, workspaceRoot));
  }

  private createSARIFResult(issue: EnrichedIssue, workspaceRoot?: string): SARIFResult {
    // Convert file path to relative if workspaceRoot is provided
    const filePath = workspaceRoot
      ? this.toRelativePath(issue.file, workspaceRoot)
      : issue.file;

    const result: SARIFResult = {
      ruleId: issue.rule,
      level: this.mapSeverityToSARIF(issue.severity),
      message: { text: issue.message },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: filePath },
          region: {
            startLine: issue.line || 1,
            startColumn: issue.column,
            snippet: issue.snippet ? { text: issue.snippet } : undefined
          }
        }
      }]
    };

    // Add fix if available and valid for this file
    // SESSION 87: Check both fix locations
    const sarifCorrectedCode = this.getCorrectedCode(issue);
    if (sarifCorrectedCode) {
      // BUG-LSP-004 FIX: Validate fix matches target file context
      const cleanedCode = this.cleanCorrectedCode(sarifCorrectedCode, issue.file);
      if (cleanedCode) {
        result.fixes = [{
          description: {
            text: issue.fixSuggestion.explanation || 'Apply suggested fix'
          },
          artifactChanges: [{
            artifactLocation: { uri: filePath },
            replacements: [{
              deletedRegion: {
                startLine: issue.line || 1,
                startColumn: issue.column,
                endLine: (issue.line || 1) + this.countLines(cleanedCode)
              },
              insertedContent: { text: cleanedCode }
            }]
          }]
        }];
      }
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

  /**
   * Convert absolute file path to relative path by removing workspace root
   * Used by both LSP (with file:// prefix) and SARIF (without prefix)
   */
  private toRelativePath(file: string, workspaceRoot: string): string {
    // Normalize path separators
    const normalizedFile = file.replace(/\\/g, '/');
    const normalizedRoot = workspaceRoot.replace(/\\/g, '/').replace(/\/$/, '');

    // Remove workspace root if present to get relative path
    let relativePath = normalizedFile;
    if (normalizedFile.startsWith(normalizedRoot)) {
      relativePath = normalizedFile.substring(normalizedRoot.length);
    }

    // Remove leading slash for relative path
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }

    return relativePath;
  }

  private toFileUri(file: string, workspaceRoot: string): string {
    const relativePath = this.toRelativePath(file, workspaceRoot);
    // Return relative file URI - IDE will resolve relative to workspace
    // This ensures portability across different machines/environments
    return `file://${relativePath}`;
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
   * SESSION 113 FIX: Return values must match the fixTier.issueType interface
   * Valid values: 'style' | 'quality' | 'security' | 'performance' | 'maintainability' | 'compatibility' | 'dependency' | 'unknown'
   */
  private determineIssueType(issue: EnrichedIssue): 'style' | 'quality' | 'security' | 'performance' | 'maintainability' | 'compatibility' | 'dependency' | 'unknown' {
    const tool = issue.tool?.toLowerCase() || '';
    const category = issue.category?.toLowerCase() || '';
    const rule = issue.rule?.toLowerCase() || '';
    const detectedCategory = issue.detectedCategory?.toLowerCase() || '';

    // Security tools and categories
    if (tool.includes('semgrep') || tool.includes('snyk') || tool.includes('dependency-check') ||
      tool.includes('gitleaks') || tool.includes('trivy') || tool.includes('grype') ||
      category.includes('security') || category.includes('vulnerability') ||
      detectedCategory.includes('security')) {
      return 'security';
    }

    // Dependency tools
    if (tool.includes('dependency') || tool.includes('ossindex') ||
      category.includes('dependency') || detectedCategory.includes('dependenc')) {
      return 'dependency';
    }

    // Performance tools
    if (tool.includes('performance') || category.includes('performance') ||
      detectedCategory.includes('performance')) {
      return 'performance';
    }

    // Architecture/Maintainability tools - map to 'maintainability' (architecture not in interface)
    if (tool.includes('architecture') || category.includes('architecture') ||
      detectedCategory.includes('architecture') || rule.includes('design')) {
      return 'maintainability';
    }

    // Style issues (formatting, whitespace, naming)
    if (rule.includes('whitespace') || rule.includes('format') || rule.includes('indent') ||
      rule.includes('naming') || rule.includes('style') || rule.includes('tab') ||
      tool.includes('prettier') || tool.includes('stylint')) {
      return 'style';
    }

    // Default to quality (not 'code_quality' which isn't in the interface)
    return 'quality';
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

