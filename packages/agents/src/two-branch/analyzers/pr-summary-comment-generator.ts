/**
 * PR Summary Comment Generator
 *
 * Session 85: Generate concise, actionable PR summary comments
 * for GitHub/GitLab integration.
 *
 * Key principles:
 * - Skip comment if no issues found (don't spam clean PRs)
 * - Show actual risk details, not just counts
 * - PRO: Show what was fixed vs what needs manual review
 * - BASIC: Show identified issues only (educational)
 */

/** Individual issue for PR summary */
export interface PRIssueDetail {
  /** Rule/check that found this issue */
  rule: string;
  /** Issue message/description */
  message: string;
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Category */
  category: 'security' | 'performance' | 'architecture' | 'dependencies' | 'codeQuality';
  /** File path */
  file: string;
  /** Line number */
  line?: number;
  /** Fix status (PRO tier) */
  fixStatus?: 'fixed' | 'pending' | 'failed';
  /** Confidence score for fix (PRO tier) */
  confidence?: number;
}

export interface PRSummaryInput {
  /** Repository name */
  repository: string;
  /** PR number */
  prNumber: number;
  /** PR title */
  prTitle: string;
  /** PR author */
  author: string;
  /** Analysis tier */
  tier: 'basic' | 'pro' | 'enterprise';
  /** Total issues found */
  totalIssues: number;
  /** Issues by severity */
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  /** Issues by category */
  categoryCounts: {
    security: number;
    performance: number;
    architecture: number;
    dependencies: number;
    codeQuality: number;
  };
  /** Score information */
  score: {
    overall: number;
    grade: string;
  };
  /** Blocking decision */
  blocking: {
    isBlocking: boolean;
    blockingCount: number;
  };
  /** Fix information (PRO tier) */
  fixes?: {
    autoFixed: number;
    pendingReview: number;
    alreadyResolved: number;
  };
  /** Files changed */
  filesChanged: number;
  /** Lines added/removed */
  linesChanged: {
    added: number;
    removed: number;
  };
  /** Platform coverage (if multi-platform) */
  platforms?: string[];
  /** Report URL */
  reportUrl?: string;
  /** SARIF URL */
  sarifUrl?: string;
  /** Detailed issues (for risk summaries) */
  issues?: PRIssueDetail[];
}

/**
 * Generate BASIC tier PR summary comment
 *
 * Focus: Show identified risks only (educational)
 * Returns null if no issues found (skip comment)
 */
export function generateBasicPRSummary(input: PRSummaryInput): string | null {
  const {
    totalIssues,
    severityCounts,
    categoryCounts,
    score,
    blocking,
    reportUrl,
    sarifUrl,
    issues,
  } = input;

  // Skip comment if no issues found
  if (totalIssues === 0) {
    return null;
  }

  const lines: string[] = [];

  // Header
  lines.push(`## CodeQual Analysis Report`);
  lines.push('');

  // Quick summary
  const emoji = blocking.isBlocking ? ':x:' : ':warning:';
  const decision = blocking.isBlocking
    ? `**${blocking.blockingCount} blocking issues** require fixes before merge`
    : `${totalIssues} issues identified for review`;

  lines.push(`${emoji} ${decision}`);
  lines.push('');

  // Score
  lines.push(`**Score:** ${score.overall}/100 (Grade: **${score.grade}**)`);
  lines.push('');

  // Risk Details by Category (if detailed issues provided)
  if (issues && issues.length > 0) {
    // Group by category
    const byCategory = groupIssuesByCategory(issues);

    // Security Risks
    if (byCategory.security.length > 0) {
      lines.push('### :lock: Security Risks');
      lines.push('');
      byCategory.security.slice(0, 5).forEach(issue => {
        const sev = getSeverityIcon(issue.severity);
        lines.push(`- ${sev} **${issue.rule}**: ${issue.message}`);
        lines.push(`  - \`${issue.file}${issue.line ? `:${issue.line}` : ''}\``);
      });
      if (byCategory.security.length > 5) {
        lines.push(`- _...and ${byCategory.security.length - 5} more security issues_`);
      }
      lines.push('');
    }

    // Performance Risks
    if (byCategory.performance.length > 0) {
      lines.push('### :zap: Performance Risks');
      lines.push('');
      byCategory.performance.slice(0, 5).forEach(issue => {
        const sev = getSeverityIcon(issue.severity);
        lines.push(`- ${sev} **${issue.rule}**: ${issue.message}`);
        lines.push(`  - \`${issue.file}${issue.line ? `:${issue.line}` : ''}\``);
      });
      if (byCategory.performance.length > 5) {
        lines.push(`- _...and ${byCategory.performance.length - 5} more performance issues_`);
      }
      lines.push('');
    }

    // Architecture Risks
    if (byCategory.architecture.length > 0) {
      lines.push('### :building_construction: Architecture Risks');
      lines.push('');
      byCategory.architecture.slice(0, 5).forEach(issue => {
        const sev = getSeverityIcon(issue.severity);
        lines.push(`- ${sev} **${issue.rule}**: ${issue.message}`);
        lines.push(`  - \`${issue.file}${issue.line ? `:${issue.line}` : ''}\``);
      });
      if (byCategory.architecture.length > 5) {
        lines.push(`- _...and ${byCategory.architecture.length - 5} more architecture issues_`);
      }
      lines.push('');
    }

    // Dependency Risks
    if (byCategory.dependencies.length > 0) {
      lines.push('### :package: Dependency Risks');
      lines.push('');
      byCategory.dependencies.slice(0, 5).forEach(issue => {
        const sev = getSeverityIcon(issue.severity);
        lines.push(`- ${sev} **${issue.rule}**: ${issue.message}`);
        lines.push(`  - \`${issue.file}${issue.line ? `:${issue.line}` : ''}\``);
      });
      if (byCategory.dependencies.length > 5) {
        lines.push(`- _...and ${byCategory.dependencies.length - 5} more dependency issues_`);
      }
      lines.push('');
    }

    // Code Quality (show summary only)
    if (byCategory.codeQuality.length > 0) {
      lines.push('### :sparkles: Code Quality');
      lines.push('');
      lines.push(`${byCategory.codeQuality.length} code quality issues found.`);
      lines.push('');
    }
  } else {
    // Fallback to counts if no detailed issues
    lines.push('### Issues by Category');
    lines.push('');
    if (categoryCounts.security > 0) lines.push(`- :lock: **Security**: ${categoryCounts.security} issues`);
    if (categoryCounts.performance > 0) lines.push(`- :zap: **Performance**: ${categoryCounts.performance} issues`);
    if (categoryCounts.architecture > 0) lines.push(`- :building_construction: **Architecture**: ${categoryCounts.architecture} issues`);
    if (categoryCounts.dependencies > 0) lines.push(`- :package: **Dependencies**: ${categoryCounts.dependencies} issues`);
    if (categoryCounts.codeQuality > 0) lines.push(`- :sparkles: **Code Quality**: ${categoryCounts.codeQuality} issues`);
    lines.push('');
  }

  // IDE Integration
  lines.push('### Quick Actions');
  lines.push('');
  lines.push('Download SARIF for one-click fixes in VS Code/JetBrains.');
  lines.push('');

  // Links
  if (reportUrl || sarifUrl) {
    const links = [];
    if (reportUrl) links.push(`[:page_facing_up: Full Report](${reportUrl})`);
    if (sarifUrl) links.push(`[:file_folder: SARIF](${sarifUrl})`);
    lines.push(links.join(' | '));
    lines.push('');
  }

  // Upgrade prompt
  lines.push('---');
  lines.push(':star: **Upgrade to PRO** for AI-powered auto-fixes');
  lines.push('');
  lines.push('<sub>Generated by [CodeQual](https://codequal.dev) | BASIC Tier</sub>');

  return lines.join('\n');
}

/**
 * Generate PRO tier PR summary comment
 *
 * Focus: Show what was fixed vs what needs manual review
 * Returns null if no issues found (skip comment)
 */
export function generateProPRSummary(input: PRSummaryInput): string | null {
  const {
    prNumber,
    totalIssues,
    score,
    blocking,
    fixes,
    reportUrl,
    sarifUrl,
    issues,
  } = input;

  // Skip comment if no issues found
  if (totalIssues === 0) {
    return null;
  }

  const lines: string[] = [];

  // Header
  lines.push(`## CodeQual Analysis Report :robot:`);
  lines.push('');

  // Fix summary
  if (fixes) {
    const totalActive = fixes.autoFixed + fixes.pendingReview;
    const fixRate = totalActive > 0 ? Math.round((fixes.autoFixed / totalActive) * 100) : 100;

    lines.push(`**Fix Rate:** ${fixRate}% (${fixes.autoFixed}/${totalActive} auto-fixed)`);
    lines.push('');
  }

  // Score
  const scoreEmoji = getScoreEmoji(score.overall);
  lines.push(`**Score:** ${scoreEmoji} ${score.overall}/100 (Grade: **${score.grade}**)`);
  lines.push('');

  // Decision
  if (blocking.isBlocking) {
    lines.push(`:x: **${blocking.blockingCount} blocking issues** require attention`);
  } else if (fixes && fixes.pendingReview === 0) {
    lines.push(':white_check_mark: **Ready to merge** - All issues resolved');
  } else {
    lines.push(':yellow_circle: **Review recommended** - Some issues need manual review');
  }
  lines.push('');

  // Show Fixed vs Pending with details
  if (issues && issues.length > 0) {
    const fixedIssues = issues.filter(i => i.fixStatus === 'fixed');
    const pendingIssues = issues.filter(i => i.fixStatus === 'pending' || i.fixStatus === 'failed');

    // FIXED ISSUES (collapsible)
    if (fixedIssues.length > 0) {
      lines.push('<details>');
      lines.push(`<summary>:white_check_mark: <strong>Auto-Fixed (${fixedIssues.length})</strong></summary>`);
      lines.push('');

      // Group fixed by category
      const fixedByCategory = groupIssuesByCategory(fixedIssues);

      if (fixedByCategory.security.length > 0) {
        lines.push('**:lock: Security**');
        fixedByCategory.security.forEach(issue => {
          const conf = issue.confidence ? ` (${issue.confidence}%)` : '';
          lines.push(`- ~~${issue.rule}~~${conf}: \`${issue.file}\``);
        });
        lines.push('');
      }

      if (fixedByCategory.performance.length > 0) {
        lines.push('**:zap: Performance**');
        fixedByCategory.performance.forEach(issue => {
          const conf = issue.confidence ? ` (${issue.confidence}%)` : '';
          lines.push(`- ~~${issue.rule}~~${conf}: \`${issue.file}\``);
        });
        lines.push('');
      }

      if (fixedByCategory.architecture.length > 0) {
        lines.push('**:building_construction: Architecture**');
        fixedByCategory.architecture.forEach(issue => {
          const conf = issue.confidence ? ` (${issue.confidence}%)` : '';
          lines.push(`- ~~${issue.rule}~~${conf}: \`${issue.file}\``);
        });
        lines.push('');
      }

      if (fixedByCategory.dependencies.length > 0) {
        lines.push('**:package: Dependencies**');
        fixedByCategory.dependencies.forEach(issue => {
          const conf = issue.confidence ? ` (${issue.confidence}%)` : '';
          lines.push(`- ~~${issue.rule}~~${conf}: \`${issue.file}\``);
        });
        lines.push('');
      }

      if (fixedByCategory.codeQuality.length > 0) {
        lines.push(`**:sparkles: Code Quality** (${fixedByCategory.codeQuality.length} fixed)`);
        lines.push('');
      }

      lines.push('</details>');
      lines.push('');
    }

    // PENDING ISSUES (always visible if blocking)
    if (pendingIssues.length > 0) {
      lines.push(`### :hourglass: Pending Manual Review (${pendingIssues.length})`);
      lines.push('');

      // Group pending by category
      const pendingByCategory = groupIssuesByCategory(pendingIssues);

      if (pendingByCategory.security.length > 0) {
        lines.push('**:lock: Security** - Manual review required');
        pendingByCategory.security.forEach(issue => {
          const sev = getSeverityIcon(issue.severity);
          lines.push(`- ${sev} **${issue.rule}**: ${issue.message}`);
          lines.push(`  - \`${issue.file}${issue.line ? `:${issue.line}` : ''}\``);
        });
        lines.push('');
      }

      if (pendingByCategory.performance.length > 0) {
        lines.push('**:zap: Performance** - Manual review required');
        pendingByCategory.performance.forEach(issue => {
          const sev = getSeverityIcon(issue.severity);
          lines.push(`- ${sev} **${issue.rule}**: ${issue.message}`);
          lines.push(`  - \`${issue.file}${issue.line ? `:${issue.line}` : ''}\``);
        });
        lines.push('');
      }

      if (pendingByCategory.architecture.length > 0) {
        lines.push('**:building_construction: Architecture** - Manual review required');
        pendingByCategory.architecture.forEach(issue => {
          const sev = getSeverityIcon(issue.severity);
          lines.push(`- ${sev} **${issue.rule}**: ${issue.message}`);
          lines.push(`  - \`${issue.file}${issue.line ? `:${issue.line}` : ''}\``);
        });
        lines.push('');
      }

      if (pendingByCategory.dependencies.length > 0) {
        lines.push('**:package: Dependencies** - Manual review required');
        pendingByCategory.dependencies.forEach(issue => {
          const sev = getSeverityIcon(issue.severity);
          lines.push(`- ${sev} **${issue.rule}**: ${issue.message}`);
          lines.push(`  - \`${issue.file}${issue.line ? `:${issue.line}` : ''}\``);
        });
        lines.push('');
      }

      if (pendingByCategory.codeQuality.length > 0) {
        lines.push(`**:sparkles: Code Quality** - ${pendingByCategory.codeQuality.length} issues need review`);
        lines.push('');
      }
    }
  }

  // Apply fixes CLI
  if (fixes && fixes.autoFixed > 0) {
    lines.push('### Apply Fixes');
    lines.push('');
    lines.push('```bash');
    lines.push(`codequal apply --pr ${prNumber}`);
    lines.push('```');
    lines.push('');

    // Time saved
    const timeSaved = fixes.autoFixed * 10;
    const hours = Math.floor(timeSaved / 60);
    const mins = timeSaved % 60;
    lines.push(`**Time Saved:** ~${hours > 0 ? `${hours}h ` : ''}${mins}m`);
    lines.push('');
  }

  // Links
  if (reportUrl || sarifUrl) {
    const links = [];
    if (reportUrl) links.push(`[:page_facing_up: Full Report](${reportUrl})`);
    if (sarifUrl) links.push(`[:file_folder: SARIF](${sarifUrl})`);
    lines.push(links.join(' | '));
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('<sub>Generated by [CodeQual](https://codequal.dev) | PRO Tier | AI-Powered Fixes</sub>');

  return lines.join('\n');
}

/**
 * Generate PR summary based on tier
 * Returns null if no issues found (skip comment for clean PRs)
 */
export function generatePRSummary(input: PRSummaryInput): string | null {
  if (input.tier === 'basic') {
    return generateBasicPRSummary(input);
  } else {
    return generateProPRSummary(input);
  }
}

/**
 * Check if PR comment should be posted
 */
export function shouldPostPRComment(input: PRSummaryInput): boolean {
  return input.totalIssues > 0;
}

// Helper functions

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    security: ':lock:',
    performance: ':zap:',
    architecture: ':building_construction:',
    dependencies: ':package:',
    codeQuality: ':sparkles:',
    codequality: ':sparkles:',
  };
  return icons[category.toLowerCase()] || ':clipboard:';
}

function formatCategory(category: string): string {
  const names: Record<string, string> = {
    security: 'Security',
    performance: 'Performance',
    architecture: 'Architecture',
    dependencies: 'Dependencies',
    codeQuality: 'Code Quality',
    codequality: 'Code Quality',
  };
  return names[category.toLowerCase()] || category;
}

function getScoreEmoji(score: number): string {
  if (score >= 90) return ':star:';
  if (score >= 70) return ':yellow_circle:';
  if (score >= 50) return ':orange_circle:';
  return ':red_circle:';
}

function getSeverityIcon(severity: string): string {
  const icons: Record<string, string> = {
    critical: ':red_circle:',
    high: ':orange_circle:',
    medium: ':yellow_circle:',
    low: ':green_circle:',
  };
  return icons[severity.toLowerCase()] || ':white_circle:';
}

interface GroupedIssues {
  security: PRIssueDetail[];
  performance: PRIssueDetail[];
  architecture: PRIssueDetail[];
  dependencies: PRIssueDetail[];
  codeQuality: PRIssueDetail[];
}

function groupIssuesByCategory(issues: PRIssueDetail[]): GroupedIssues {
  return {
    security: issues.filter(i => i.category === 'security'),
    performance: issues.filter(i => i.category === 'performance'),
    architecture: issues.filter(i => i.category === 'architecture'),
    dependencies: issues.filter(i => i.category === 'dependencies'),
    codeQuality: issues.filter(i => i.category === 'codeQuality'),
  };
}

/**
 * Example outputs - Note: Returns null if no issues found
 */
export const EXAMPLE_BASIC_SUMMARY = `
## CodeQual Analysis Report

:warning: 12 issues identified for review

**Score:** 78/100 (Grade: **C**)

### :lock: Security Risks

- :orange_circle: **HardcodedCredentials**: API key exposed in configuration
  - \`src/config/api.config.ts:15\`
- :yellow_circle: **InsecureRandom**: Using Math.random() for token generation
  - \`src/auth/token.service.ts:42\`

### :zap: Performance Risks

- :orange_circle: **N+1Query**: Multiple database calls in loop
  - \`src/services/user.service.ts:78\`

### :building_construction: Architecture Risks

- :yellow_circle: **CircularDependency**: Circular import detected
  - \`src/modules/auth/index.ts:5\`

### :sparkles: Code Quality

8 code quality issues found.

### Quick Actions

Download SARIF for one-click fixes in VS Code/JetBrains.

[:page_facing_up: Full Report](https://codequal.dev/reports/123) | [:file_folder: SARIF](https://storage.codequal.dev/sarif/123.json)

---
:star: **Upgrade to PRO** for AI-powered auto-fixes

<sub>Generated by [CodeQual](https://codequal.dev) | BASIC Tier</sub>
`;

export const EXAMPLE_PRO_SUMMARY = `
## CodeQual Analysis Report :robot:

**Fix Rate:** 83% (10/12 auto-fixed)

**Score:** :yellow_circle: 78/100 (Grade: **C**)

:yellow_circle: **Review recommended** - Some issues need manual review

<details>
<summary>:white_check_mark: <strong>Auto-Fixed (10)</strong></summary>

**:lock: Security**
- ~~HardcodedCredentials~~ (95%): \`src/config/api.config.ts\`

**:zap: Performance**
- ~~N+1Query~~ (92%): \`src/services/user.service.ts\`

**:sparkles: Code Quality** (8 fixed)

</details>

### :hourglass: Pending Manual Review (2)

**:building_construction: Architecture** - Manual review required
- :yellow_circle: **CircularDependency**: Circular import between auth and user modules
  - \`src/modules/auth/index.ts:5\`

**:lock: Security** - Manual review required
- :yellow_circle: **InsecureRandom**: Math.random() used - consider crypto.randomBytes()
  - \`src/auth/token.service.ts:42\`

### Apply Fixes

\`\`\`bash
codequal apply --pr 950
\`\`\`

**Time Saved:** ~1h 40m

[:page_facing_up: Full Report](https://codequal.dev/reports/123) | [:file_folder: SARIF](https://storage.codequal.dev/sarif/123.json)

---
<sub>Generated by [CodeQual](https://codequal.dev) | PRO Tier | AI-Powered Fixes</sub>
`;
