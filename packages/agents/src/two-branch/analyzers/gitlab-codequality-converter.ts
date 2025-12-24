/**
 * GitLab Code Quality Format Converter
 *
 * Converts CodeQual's internal issue format to GitLab Code Quality format
 * (based on Code Climate specification).
 *
 * This enables GitLab CI/CD to:
 * 1. Display code quality findings in merge request widgets
 * 2. Show quality degradation/improvement metrics
 * 3. Block merges based on quality gates
 *
 * GitLab Docs: https://docs.gitlab.com/ee/ci/testing/code_quality.html
 */

import { EnrichedIssue } from './v9-grouped-report-formatter';
import { createHash } from 'crypto';

// ============================================================================
// GitLab Code Quality Types (Code Climate-based)
// ============================================================================

/**
 * GitLab Code Quality Issue
 * Based on Code Climate format with simplified fields
 */
export interface GitLabCodeQualityIssue {
  /** Human-readable description of the code quality violation */
  description: string;

  /** Unique name representing the check/rule */
  check_name: string;

  /** Unique fingerprint to identify this specific violation */
  fingerprint: string;

  /** Severity level */
  severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker';

  /** Location of the issue in the codebase */
  location: GitLabLocation;

  /** Optional: Categories for grouping (GitLab extension) */
  categories?: string[];

  /** Optional: External documentation URL */
  content?: {
    body: string;
  };
}

export interface GitLabLocation {
  /** Relative path to the file (no ./ prefix) */
  path: string;

  /** Line-based location (simpler format) */
  lines?: {
    begin: number;
    end?: number;
  };

  /** Position-based location (more precise) */
  positions?: {
    begin: {
      line: number;
      column: number;
    };
    end: {
      line: number;
      column: number;
    };
  };
}

/**
 * GitLab Code Quality Report
 * Must be a single JSON array
 */
export type GitLabCodeQualityReport = GitLabCodeQualityIssue[];

// ============================================================================
// Converter Class
// ============================================================================

export class GitLabCodeQualityConverter {

  /**
   * Convert CodeQual issues to GitLab Code Quality format
   *
   * @param issues - Array of enriched issues from V9 analysis
   * @param repositoryPath - Repository root path (for relative path calculation)
   * @returns GitLab Code Quality report (JSON array)
   */
  public generateGitLabCodeQualityReport(
    issues: EnrichedIssue[],
    repositoryPath?: string
  ): GitLabCodeQualityReport {
    return issues
      .filter(issue => issue.file && issue.line) // GitLab requires file and line
      .map(issue => this.convertToGitLabIssue(issue, repositoryPath));
  }

  // ==========================================================================
  // Private Conversion Methods
  // ==========================================================================

  private convertToGitLabIssue(
    issue: EnrichedIssue,
    repositoryPath?: string
  ): GitLabCodeQualityIssue {
    const relativePath = this.getRelativePath(issue.file, repositoryPath);

    return {
      description: this.formatDescription(issue),
      check_name: this.formatCheckName(issue),
      fingerprint: this.generateFingerprint(issue),
      severity: this.mapSeverity(issue.severity),
      location: this.createLocation(relativePath, issue),
      categories: this.extractCategories(issue),
      content: this.createContent(issue)
    };
  }

  // ==========================================================================
  // Description Formatting
  // ==========================================================================

  /**
   * Format a human-readable description
   * Combines tool name, rule, and message for clarity
   */
  private formatDescription(issue: EnrichedIssue): string {
    const parts: string[] = [];

    // Add severity indicator
    if (issue.severity === 'critical' || issue.severity === 'high') {
      parts.push(`[${issue.severity.toUpperCase()}]`);
    }

    // Add tool name
    if (issue.tool) {
      parts.push(`${issue.tool}:`);
    }

    // Add message (primary description)
    parts.push(issue.message);

    // Add category if available and meaningful
    if (issue.category && issue.category !== 'Unknown') {
      parts.push(`(${issue.category})`);
    }

    return parts.join(' ');
  }

  // ==========================================================================
  // Check Name Formatting
  // ==========================================================================

  /**
   * Format check name (rule identifier)
   * GitLab uses this to group similar issues
   */
  private formatCheckName(issue: EnrichedIssue): string {
    // Use tool + rule for namespacing
    // Example: "pmd/UnusedPrivateField", "checkstyle/JavadocMethod"
    if (issue.tool && issue.rule) {
      return `${issue.tool.toLowerCase()}/${issue.rule}`;
    }

    // Fallback to just rule if tool missing
    return issue.rule || 'unknown-rule';
  }

  // ==========================================================================
  // Fingerprint Generation
  // ==========================================================================

  /**
   * Generate unique fingerprint for this issue
   * Used by GitLab to track the same issue across commits
   *
   * Fingerprint combines:
   * - File path
   * - Line number
   * - Rule
   * - Message (first 100 chars)
   */
  private generateFingerprint(issue: EnrichedIssue): string {
    const components = [
      issue.file || '',
      String(issue.line || 0),
      issue.rule || '',
      (issue.message || '').substring(0, 100) // Limit to avoid fingerprint changes from minor message variations
    ];

    const fingerprintString = components.join('::');

    // Generate MD5 hash (GitLab standard)
    return createHash('md5')
      .update(fingerprintString)
      .digest('hex');
  }

  // ==========================================================================
  // Severity Mapping
  // ==========================================================================

  /**
   * Map CodeQual severity to GitLab severity levels
   *
   * CodeQual: critical, high, medium, low
   * GitLab: blocker, critical, major, minor, info
   */
  private mapSeverity(severity: string): 'info' | 'minor' | 'major' | 'critical' | 'blocker' {
    const normalizedSeverity = severity.toLowerCase();

    switch (normalizedSeverity) {
      case 'critical':
        return 'blocker'; // Most severe - blocks merge

      case 'high':
        return 'critical'; // High priority - requires attention

      case 'medium':
        return 'major'; // Moderate priority

      case 'low':
        return 'minor'; // Low priority - nice to fix

      default:
        return 'info'; // Informational only
    }
  }

  // ==========================================================================
  // Location Creation
  // ==========================================================================

  /**
   * Create GitLab location object
   * Uses line-based format (simpler and widely supported)
   */
  private createLocation(
    relativePath: string,
    issue: EnrichedIssue
  ): GitLabLocation {
    const location: GitLabLocation = {
      path: relativePath,
      lines: {
        begin: issue.line || 1
      }
    };

    // Add end line if we can calculate it from the fix
    if (issue.fixSuggestion?.correctedCode) {
      const lineCount = this.countLines(issue.fixSuggestion.correctedCode);
      if (lineCount > 1) {
        location.lines!.end = (issue.line || 1) + lineCount - 1;
      }
    }

    // Add column-based position if available (more precise)
    if (issue.column) {
      location.positions = {
        begin: {
          line: issue.line || 1,
          column: issue.column
        },
        end: {
          line: issue.line || 1,
          column: issue.column + 1 // Minimal span
        }
      };
    }

    return location;
  }

  // ==========================================================================
  // Categories Extraction
  // ==========================================================================

  /**
   * Extract categories for grouping in GitLab
   * Maps to CodeQual's issue types
   */
  private extractCategories(issue: EnrichedIssue): string[] {
    const categories: string[] = [];

    // Add tool-based category
    if (issue.tool) {
      categories.push(issue.tool.toLowerCase());
    }

    // Add type-based category
    const issueType = this.determineIssueType(issue);
    categories.push(issueType);

    // Add severity-based category for filtering
    categories.push(`severity-${issue.severity.toLowerCase()}`);

    // Add language if detectable
    const language = this.detectLanguage(issue.file);
    if (language) {
      categories.push(language);
    }

    return categories;
  }

  /**
   * Determine issue type from tool and category
   */
  private determineIssueType(issue: EnrichedIssue): string {
    const tool = issue.tool?.toLowerCase() || '';
    const category = issue.category?.toLowerCase() || '';

    // Security issues
    if (tool.includes('semgrep') || tool.includes('snyk') ||
        tool.includes('dependency-check') || tool.includes('ossindex') ||
        category.includes('security') || category.includes('vulnerability')) {
      return 'security';
    }

    // Dependency issues
    if (tool.includes('dependency') || category.includes('dependency')) {
      return 'dependency';
    }

    // Performance issues
    if (tool.includes('performance') || category.includes('performance')) {
      return 'performance';
    }

    // Architecture issues
    if (tool.includes('architecture') || category.includes('architecture')) {
      return 'architecture';
    }

    // Style/formatting issues
    if (tool.includes('checkstyle') || tool.includes('eslint') ||
        tool.includes('pylint') || category.includes('style')) {
      return 'style';
    }

    // Bug detection
    if (tool.includes('spotbugs') || tool.includes('pmd') ||
        category.includes('bug') || category.includes('error')) {
      return 'bug-risk';
    }

    // Default to code quality
    return 'code-quality';
  }

  // ==========================================================================
  // Content Creation (Optional Documentation)
  // ==========================================================================

  /**
   * Create optional content body with fix suggestion
   * GitLab displays this in the MR widget
   */
  private createContent(issue: EnrichedIssue): { body: string } | undefined {
    if (!issue.fixSuggestion) return undefined;

    const parts: string[] = [];

    // Add fix explanation
    if (issue.fixSuggestion.explanation) {
      parts.push('**How to Fix:**');
      parts.push(issue.fixSuggestion.explanation);
      parts.push('');
    }

    // Add issue description if available
    if (issue.fixSuggestion.issueDescription) {
      const desc = issue.fixSuggestion.issueDescription;

      if (desc.what) {
        parts.push('**What:**');
        parts.push(desc.what);
        parts.push('');
      }

      if (desc.why) {
        parts.push('**Why:**');
        parts.push(desc.why);
        parts.push('');
      }

      if (desc.impact) {
        parts.push('**Impact:**');
        parts.push(desc.impact);
        parts.push('');
      }
    }

    // Add snippet if available
    if (issue.snippet) {
      parts.push('**Current Code:**');
      parts.push('```');
      parts.push(issue.snippet);
      parts.push('```');
      parts.push('');
    }

    // Add corrected code if available (cleaned of template text)
    if (issue.fixSuggestion.correctedCode) {
      const cleanedCode = this.cleanCorrectedCode(issue.fixSuggestion.correctedCode);
      if (cleanedCode) {
        parts.push('**Suggested Fix:**');
        parts.push('```');
        parts.push(cleanedCode);
        parts.push('```');
      }
    }

    return parts.length > 0 ? { body: parts.join('\n') } : undefined;
  }

  /**
   * BUG-LSP-001 FIX: Clean correctedCode to remove template patterns
   * Handles patterns like "X should be: Y" that slip through from pattern storage
   */
  private cleanCorrectedCode(code: string): string {
    if (!code) return code;

    let cleaned = code;

    // Check for template patterns embedded in code (not comments)
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
          cleaned = parts[parts.length - 1].trim();
          // If the "after" part still looks like template text, return empty
          if (cleaned.includes('should be:') || cleaned.includes('}}')) {
            return ''; // Reject this fix entirely
          }
        }
      }
    }

    // If code contains "should be:" anywhere (not in comments), reject it
    if (/(?<!\/\/.*)\bshould be:/i.test(cleaned)) {
      return ''; // Reject this fix entirely
    }

    return cleaned.trim();
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get relative path from absolute path
   * GitLab requires relative paths without ./ prefix
   */
  private getRelativePath(filePath: string, repositoryPath?: string): string {
    if (!filePath) return 'unknown';

    // Normalize path separators
    let normalized = filePath.replace(/\\/g, '/');

    // Remove repository path if present
    if (repositoryPath) {
      const normalizedRepo = repositoryPath.replace(/\\/g, '/');
      if (normalized.startsWith(normalizedRepo)) {
        normalized = normalized.substring(normalizedRepo.length);
      }
    }

    // Remove leading ./ or /
    normalized = normalized.replace(/^\.?\//, '');

    return normalized;
  }

  /**
   * Count lines in a text string
   */
  private countLines(text: string): number {
    if (!text) return 1;
    return (text.match(/\n/g) || []).length + 1;
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string | null {
    if (!filePath) return null;

    const extension = filePath.split('.').pop()?.toLowerCase();
    if (!extension) return null;

    const languageMap: Record<string, string> = {
      // Java ecosystem
      'java': 'java',
      'kt': 'kotlin',
      'scala': 'scala',

      // JavaScript/TypeScript
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',

      // Python
      'py': 'python',

      // Ruby
      'rb': 'ruby',

      // Go
      'go': 'go',

      // Rust
      'rs': 'rust',

      // C/C++
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'h': 'c',
      'hpp': 'cpp',

      // C#
      'cs': 'csharp',

      // PHP
      'php': 'php',

      // Swift
      'swift': 'swift',

      // Others
      'sh': 'shell',
      'bash': 'shell',
      'yml': 'yaml',
      'yaml': 'yaml',
      'json': 'json',
      'xml': 'xml'
    };

    return languageMap[extension] || null;
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate that the report meets GitLab requirements
   * Throws error if validation fails
   */
  public validateReport(report: GitLabCodeQualityReport): void {
    if (!Array.isArray(report)) {
      throw new Error('GitLab Code Quality report must be a JSON array');
    }

    for (const issue of report) {
      // Required fields
      if (!issue.description) {
        throw new Error(`Issue missing required field: description`);
      }
      if (!issue.check_name) {
        throw new Error(`Issue missing required field: check_name`);
      }
      if (!issue.fingerprint) {
        throw new Error(`Issue missing required field: fingerprint`);
      }
      if (!issue.severity) {
        throw new Error(`Issue missing required field: severity`);
      }

      // Valid severity
      const validSeverities = ['info', 'minor', 'major', 'critical', 'blocker'];
      if (!validSeverities.includes(issue.severity)) {
        throw new Error(`Invalid severity: ${issue.severity}. Must be one of: ${validSeverities.join(', ')}`);
      }

      // Location required
      if (!issue.location || !issue.location.path) {
        throw new Error(`Issue missing required field: location.path`);
      }

      // Line number required (either lines.begin or positions.begin.line)
      const hasLines = issue.location.lines?.begin;
      const hasPositions = issue.location.positions?.begin?.line;
      if (!hasLines && !hasPositions) {
        throw new Error(`Issue missing required field: location line number`);
      }
    }
  }

  /**
   * Get statistics about the generated report
   */
  public getReportStatistics(report: GitLabCodeQualityReport): {
    totalIssues: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byTool: Record<string, number>;
  } {
    const stats = {
      totalIssues: report.length,
      bySeverity: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byTool: {} as Record<string, number>
    };

    for (const issue of report) {
      // Count by severity
      stats.bySeverity[issue.severity] = (stats.bySeverity[issue.severity] || 0) + 1;

      // Count by category
      if (issue.categories) {
        for (const category of issue.categories) {
          stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        }
      }

      // Count by tool (extracted from check_name)
      const tool = issue.check_name.split('/')[0];
      stats.byTool[tool] = (stats.byTool[tool] || 0) + 1;
    }

    return stats;
  }
}
