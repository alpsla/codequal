/**
 * Header Section Generator
 *
 * Generates the ReportHeader section for unified reports.
 * Contains repository info, PR info, analysis info, score, decision, and stats.
 *
 * @see unified-report-types.ts for type definitions
 */

import {
  ReportHeader,
  V9AnalysisResultInput,
  FixOrchestrationResultInput,
  Grade,
  DecisionStatus,
  AnalyzedIssue,
} from '../unified-report-types';

/**
 * Generate the header section of a unified report
 */
export function generateHeaderSection(
  analysis: V9AnalysisResultInput,
  fixResult?: FixOrchestrationResultInput
): ReportHeader {
  const scoreBefore = analysis.score;
  const scoreAfter = fixResult?.score ?? scoreBefore;
  const grade = calculateGrade(scoreAfter);

  // Calculate remaining issues (after fixes for PRO)
  const remainingIssues = fixResult
    ? calculateRemainingIssues(analysis.issues, fixResult)
    : analysis.issues;

  // Count blocking issues (only from remaining issues)
  const blockingIssues = remainingIssues.filter(
    (i) => i.status === 'new' && (i.severity === 'critical' || isSecurityBlocker(i))
  );

  // Extract repository info from URL
  const repoInfo = extractRepositoryInfo(analysis.repositoryUrl);

  return {
    repository: {
      url: analysis.repositoryUrl,
      name: repoInfo.name,
      owner: repoInfo.owner,
      defaultBranch: analysis.baseBranch,
    },
    pullRequest: {
      number: analysis.prNumber,
      title: analysis.prTitle,
      author: analysis.prAuthor,
      sourceBranch: analysis.prBranch,
      targetBranch: analysis.baseBranch,
      url: buildPRUrl(analysis.repositoryUrl, analysis.prNumber),
    },
    analysis: {
      id: analysis.id,
      timestamp: analysis.timestamp,
      mode: analysis.mode,
      duration: analysis.duration,
    },
    score: {
      value: scoreAfter,
      grade,
      gradeLabel: getGradeLabel(grade),
      previous: fixResult ? scoreBefore : undefined,
      improvement: fixResult ? scoreAfter - scoreBefore : undefined,
      improvementPercent: fixResult
        ? calculateImprovementPercent(scoreBefore, scoreAfter)
        : undefined,
    },
    decision: {
      status: blockingIssues.length === 0 ? 'APPROVED' : 'DECLINED',
      reason: generateDecisionReason(blockingIssues, remainingIssues),
      blockingIssuesCount: blockingIssues.length,
      previousStatus:
        fixResult && analysis.blockingCount > 0 ? 'DECLINED' : undefined,
    },
    stats: {
      totalIssuesFound: analysis.issues.length,
      issuesByStatus: countByStatus(analysis.issues),
      issuesBySeverity: countBySeverity(analysis.issues),
      issuesFixed: fixResult?.execution.totalFixesApplied,
      issuesRemaining: remainingIssues.length,
      issuesRequiringReview: fixResult?.reviewRequired?.length,
    },
  };
}

/**
 * Calculate grade based on score
 */
export function calculateGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Get human-readable grade label
 */
export function getGradeLabel(grade: Grade): string {
  const labels: Record<Grade, string> = {
    A: 'Excellent',
    B: 'Good',
    C: 'Fair',
    D: 'Poor',
    F: 'Critical',
  };
  return labels[grade];
}

/**
 * Calculate improvement percentage
 */
function calculateImprovementPercent(before: number, after: number): number {
  if (before === 0) return after > 0 ? 100 : 0;
  return Math.round(((after - before) / before) * 100);
}

/**
 * Extract repository name and owner from URL
 */
function extractRepositoryInfo(repoUrl: string): { name: string; owner: string } {
  // Handle HTTPS URLs: https://github.com/owner/repo.git
  if (repoUrl.startsWith('http://') || repoUrl.startsWith('https://')) {
    const urlPath = repoUrl.split('/').slice(3);
    if (urlPath.length >= 2) {
      const owner = urlPath[0];
      let name = urlPath[1];
      if (name.endsWith('.git')) {
        name = name.slice(0, -4);
      }
      return { name, owner };
    }
  }

  // Handle SSH URLs: git@github.com:owner/repo.git
  if (repoUrl.startsWith('git@')) {
    const colonIndex = repoUrl.indexOf(':');
    if (colonIndex > 0) {
      let repoPath = repoUrl.slice(colonIndex + 1);
      if (repoPath.endsWith('.git')) {
        repoPath = repoPath.slice(0, -4);
      }
      const parts = repoPath.split('/');
      if (parts.length >= 2) {
        return { owner: parts[0], name: parts[1] };
      }
    }
  }

  return { name: 'unknown', owner: 'unknown' };
}

/**
 * Build PR URL from repository URL and PR number
 */
function buildPRUrl(repoUrl: string, prNumber: number): string {
  const { owner, name } = extractRepositoryInfo(repoUrl);

  // Determine provider from URL
  if (repoUrl.includes('github.com')) {
    return `https://github.com/${owner}/${name}/pull/${prNumber}`;
  }
  if (repoUrl.includes('gitlab.com')) {
    return `https://gitlab.com/${owner}/${name}/-/merge_requests/${prNumber}`;
  }
  if (repoUrl.includes('bitbucket.org')) {
    return `https://bitbucket.org/${owner}/${name}/pull-requests/${prNumber}`;
  }

  // Default to GitHub format
  return `https://github.com/${owner}/${name}/pull/${prNumber}`;
}

/**
 * Check if an issue is a security blocker
 */
function isSecurityBlocker(issue: AnalyzedIssue): boolean {
  return issue.category === 'security' && issue.severity === 'high';
}

/**
 * Calculate remaining issues after fixes
 */
function calculateRemainingIssues(
  issues: AnalyzedIssue[],
  fixResult: FixOrchestrationResultInput
): AnalyzedIssue[] {
  const fixedIssueIds = new Set(fixResult.fixes.map((f) => f.issueId));
  return issues.filter((i) => !fixedIssueIds.has(i.id) && i.status !== 'resolved');
}

/**
 * Generate decision reason text
 */
function generateDecisionReason(
  blockingIssues: AnalyzedIssue[],
  allIssues: AnalyzedIssue[]
): string {
  if (blockingIssues.length === 0) {
    if (allIssues.length === 0) {
      return 'No issues found. PR meets quality standards.';
    }
    return `${allIssues.length} non-blocking issues found. PR can be merged.`;
  }

  const criticalCount = blockingIssues.filter((i) => i.severity === 'critical').length;
  const highSecurityCount = blockingIssues.filter(
    (i) => i.category === 'security' && i.severity === 'high'
  ).length;

  const reasons: string[] = [];
  if (criticalCount > 0) {
    reasons.push(`${criticalCount} critical issue${criticalCount > 1 ? 's' : ''}`);
  }
  if (highSecurityCount > 0) {
    reasons.push(
      `${highSecurityCount} high-severity security issue${highSecurityCount > 1 ? 's' : ''}`
    );
  }

  return `${blockingIssues.length} blocking issue${blockingIssues.length > 1 ? 's' : ''} must be fixed: ${reasons.join(', ')}.`;
}

/**
 * Count issues by status
 */
function countByStatus(issues: AnalyzedIssue[]): {
  new: number;
  existing: number;
  resolved: number;
} {
  return {
    new: issues.filter((i) => i.status === 'new').length,
    existing: issues.filter(
      (i) => i.status === 'existing_modified' || i.status === 'existing_rest'
    ).length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
  };
}

/**
 * Count issues by severity
 */
function countBySeverity(issues: AnalyzedIssue[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  return {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  };
}
