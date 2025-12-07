/**
 * GitLab Code Quality Generator
 *
 * Generates GitLab Code Quality reports in Code Climate format
 * for GitLab Merge Request integration.
 *
 * GitLab Code Quality: https://docs.gitlab.com/ee/ci/testing/code_quality.html
 * Code Climate Spec: https://github.com/codeclimate/platform/blob/master/spec/analyzers/SPEC.md
 *
 * Features:
 * - Full Code Climate format compliance
 * - Proper severity mapping for GitLab
 * - Fingerprinting for deduplication across MRs
 * - Categories and remediation points
 * - Content body with descriptions and fix suggestions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { FixReportIssue, IssueSeverity, IssueCategory } from '../types/fix-report-types';

// ============================================================================
// GitLab Code Quality Types (Code Climate Format)
// ============================================================================

/**
 * GitLab Code Quality Issue (Code Climate Format)
 * https://github.com/codeclimate/platform/blob/master/spec/analyzers/SPEC.md#issues
 */
export interface GitLabCodeQualityIssue {
  /** Always 'issue' for Code Climate format */
  type: 'issue';
  /** The rule/check name in format: tool/rule-id */
  check_name: string;
  /** Short description of the issue */
  description: string;
  /** Extended content with markdown body */
  content: {
    body: string;
  };
  /** Issue categories from Code Climate taxonomy */
  categories: GitLabCategory[];
  /** Severity level for GitLab display */
  severity: GitLabSeverity;
  /** Unique fingerprint for deduplication */
  fingerprint: string;
  /** File location */
  location: {
    path: string;
    lines: {
      begin: number;
      end?: number;
    };
    positions?: {
      begin: {
        line: number;
        column?: number;
      };
      end?: {
        line: number;
        column?: number;
      };
    };
  };
  /** Remediation points (effort to fix, 0-10000000) */
  remediation_points?: number;
  /** Other location references */
  other_locations?: Array<{
    path: string;
    lines: {
      begin: number;
      end?: number;
    };
  }>;
}

/**
 * GitLab/Code Climate severity levels
 */
export type GitLabSeverity = 'blocker' | 'critical' | 'major' | 'minor' | 'info';

/**
 * Code Climate categories
 * https://github.com/codeclimate/platform/blob/master/spec/analyzers/SPEC.md#categories
 */
export type GitLabCategory =
  | 'Bug Risk'
  | 'Clarity'
  | 'Compatibility'
  | 'Complexity'
  | 'Duplication'
  | 'Performance'
  | 'Security'
  | 'Style';

// ============================================================================
// Generator Configuration
// ============================================================================

export interface GitLabCodeQualityConfig {
  /** Include fix suggestions in content body */
  includeFixSuggestions?: boolean;
  /** Include code snippets in content body */
  includeCodeSnippets?: boolean;
  /** Include remediation points */
  includeRemediationPoints?: boolean;
  /** Custom tool name prefix */
  toolNamePrefix?: string;
}

const DEFAULT_CONFIG: Required<GitLabCodeQualityConfig> = {
  includeFixSuggestions: true,
  includeCodeSnippets: true,
  includeRemediationPoints: true,
  toolNamePrefix: 'codequal',
};

// ============================================================================
// GitLab Code Quality Generator Class
// ============================================================================

export class GitLabCodeQualityGenerator {
  private config: Required<GitLabCodeQualityConfig>;

  constructor(config: GitLabCodeQualityConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate GitLab Code Quality report from issues
   */
  generate(issues: FixReportIssue[]): GitLabCodeQualityIssue[] {
    return issues.map(issue => this.buildIssue(issue));
  }

  /**
   * Generate and write report to file
   */
  async generateToFile(
    issues: FixReportIssue[],
    outputPath: string
  ): Promise<string> {
    const report = this.generate(issues);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    return outputPath;
  }

  // ==========================================================================
  // Building Issues
  // ==========================================================================

  private buildIssue(issue: FixReportIssue): GitLabCodeQualityIssue {
    const result: GitLabCodeQualityIssue = {
      type: 'issue',
      check_name: this.buildCheckName(issue),
      description: this.truncate(issue.message, 255),
      content: {
        body: this.buildContentBody(issue),
      },
      categories: this.mapCategories(issue.category),
      severity: this.mapSeverity(issue.severity),
      fingerprint: this.generateFingerprint(issue),
      location: {
        path: issue.filePath,
        lines: {
          begin: issue.lineNumber,
          end: issue.endLine || issue.lineNumber,
        },
      },
    };

    // Add column positions if available
    if (issue.columnNumber) {
      result.location.positions = {
        begin: {
          line: issue.lineNumber,
          column: issue.columnNumber,
        },
      };
      if (issue.endLine && issue.endColumn) {
        result.location.positions.end = {
          line: issue.endLine,
          column: issue.endColumn,
        };
      }
    }

    // Add remediation points
    if (this.config.includeRemediationPoints) {
      result.remediation_points = this.calculateRemediationPoints(issue);
    }

    return result;
  }

  private buildCheckName(issue: FixReportIssue): string {
    const prefix = this.config.toolNamePrefix;
    return `${prefix}/${issue.tool}/${issue.ruleId}`;
  }

  private buildContentBody(issue: FixReportIssue): string {
    const parts: string[] = [];

    // Description
    if (issue.description) {
      parts.push(issue.description);
    } else {
      parts.push(issue.message);
    }

    // Code snippet
    if (this.config.includeCodeSnippets && issue.codeSnippet) {
      parts.push('');
      parts.push('**Current Code:**');
      parts.push('```');
      parts.push(issue.codeSnippet);
      parts.push('```');
    }

    // Fix suggestion
    if (this.config.includeFixSuggestions && issue.fixAvailable && issue.fixedCode) {
      parts.push('');
      parts.push('**Suggested Fix:**');
      parts.push('```');
      parts.push(issue.fixedCode);
      parts.push('```');

      if (issue.fixSource) {
        parts.push('');
        parts.push(`*Fix source: ${issue.fixSource}*`);
      }

      if (issue.fixConfidence) {
        parts.push(`*Confidence: ${Math.round(issue.fixConfidence * 100)}%*`);
      }
    }

    // Intentional use note
    if (issue.isIntentionalUse) {
      parts.push('');
      parts.push('> **Note:** This appears to be intentional usage. Security review recommended.');
    }

    // Rule documentation
    const docUrl = this.getRuleDocUrl(issue.tool, issue.ruleId);
    if (docUrl) {
      parts.push('');
      parts.push(`[View rule documentation](${docUrl})`);
    }

    return parts.join('\n');
  }

  // ==========================================================================
  // Mapping Helpers
  // ==========================================================================

  private mapSeverity(severity: IssueSeverity): GitLabSeverity {
    switch (severity) {
      case 'critical':
        return 'blocker';
      case 'high':
        return 'critical';
      case 'medium':
        return 'major';
      case 'low':
        return 'minor';
      case 'info':
        return 'info';
      default:
        return 'minor';
    }
  }

  private mapCategories(category: IssueCategory): GitLabCategory[] {
    switch (category) {
      case 'security':
      case 'dependency_vulnerability':
        return ['Security', 'Bug Risk'];
      case 'code_quality':
        return ['Bug Risk', 'Clarity'];
      case 'performance':
        return ['Performance'];
      case 'architecture':
        return ['Complexity', 'Clarity'];
      case 'code_style':
        return ['Style'];
      case 'best_practice':
        return ['Clarity', 'Bug Risk'];
      case 'documentation':
        return ['Clarity'];
      default:
        return ['Bug Risk'];
    }
  }

  private calculateRemediationPoints(issue: FixReportIssue): number {
    // Remediation points indicate effort to fix
    // Scale: 0 (trivial) to 10,000,000 (complex refactoring)
    // We use a simpler scale based on severity and fix availability

    let basePoints: number;
    switch (issue.severity) {
      case 'critical':
        basePoints = 100000;
        break;
      case 'high':
        basePoints = 50000;
        break;
      case 'medium':
        basePoints = 20000;
        break;
      case 'low':
        basePoints = 10000;
        break;
      case 'info':
        basePoints = 5000;
        break;
      default:
        basePoints = 10000;
    }

    // Reduce points if auto-fixable
    if (issue.fixAvailable) {
      basePoints = Math.round(basePoints * 0.3);
    }

    // Increase for security issues
    if (issue.category === 'security' || issue.category === 'dependency_vulnerability') {
      basePoints = Math.round(basePoints * 1.5);
    }

    return basePoints;
  }

  private generateFingerprint(issue: FixReportIssue): string {
    // Create a stable fingerprint for deduplication across MRs
    const data = `${issue.filePath}:${issue.lineNumber}:${issue.ruleId}:${issue.tool}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  private getRuleDocUrl(tool: string, ruleId: string): string | undefined {
    switch (tool.toLowerCase()) {
      case 'semgrep':
        return `https://semgrep.dev/r/${ruleId}`;
      case 'eslint':
        return `https://eslint.org/docs/rules/${ruleId}`;
      case 'typescript-eslint':
        return `https://typescript-eslint.io/rules/${ruleId}`;
      case 'pmd':
        return `https://pmd.github.io/latest/pmd_rules_java.html`;
      case 'checkstyle':
        return `https://checkstyle.org/checks.html`;
      case 'bandit':
        return `https://bandit.readthedocs.io/en/latest/plugins/`;
      case 'gosec':
        return `https://github.com/securego/gosec#available-rules`;
      case 'rubocop':
        return `https://docs.rubocop.org/rubocop/cops.html`;
      case 'phpcs':
        return `https://github.com/squizlabs/PHP_CodeSniffer/wiki`;
      case 'clippy':
        return `https://rust-lang.github.io/rust-clippy/stable/`;
      case 'ruff':
        return `https://docs.astral.sh/ruff/rules/${ruleId}`;
      case 'dependency-check':
      case 'npm-audit':
      case 'trivy':
      case 'snyk':
        return `https://nvd.nist.gov/vuln/search`;
      default:
        return undefined;
    }
  }

  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
      return str;
    }
    return str.substring(0, maxLength - 3) + '...';
  }
}

// ============================================================================
// Factory and Convenience Functions
// ============================================================================

/**
 * Create a GitLab Code Quality generator instance
 */
export function createGitLabCodeQualityGenerator(
  config?: GitLabCodeQualityConfig
): GitLabCodeQualityGenerator {
  return new GitLabCodeQualityGenerator(config);
}

/**
 * Generate GitLab Code Quality report from issues
 */
export function generateGitLabCodeQuality(
  issues: FixReportIssue[],
  config?: GitLabCodeQualityConfig
): GitLabCodeQualityIssue[] {
  const generator = new GitLabCodeQualityGenerator(config);
  return generator.generate(issues);
}

/**
 * Generate and write GitLab Code Quality report to file
 */
export async function generateGitLabCodeQualityToFile(
  issues: FixReportIssue[],
  outputPath: string,
  config?: GitLabCodeQualityConfig
): Promise<string> {
  const generator = new GitLabCodeQualityGenerator(config);
  return generator.generateToFile(issues, outputPath);
}

// ============================================================================
// GitLab CI Configuration Helper
// ============================================================================

/**
 * Generate GitLab CI job configuration for code quality
 */
export function generateGitLabCIJobConfig(): string {
  return `# Add to .gitlab-ci.yml
code_quality:
  stage: test
  image: node:18-alpine
  script:
    - npm ci
    - npm run analyze -- --output-format gitlab
  artifacts:
    reports:
      codequality: codequal-gitlab-codequality.json
    paths:
      - codequal-gitlab-codequality.json
    expire_in: 1 week
  rules:
    - if: $CI_MERGE_REQUEST_IID
`;
}
