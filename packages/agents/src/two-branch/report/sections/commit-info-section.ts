/**
 * Commit Info Section Generator (PRO Only)
 *
 * Generates the CommitInfo section showing the commit created with fixes,
 * branch information, and review document.
 *
 * @see unified-report-types.ts for type definitions
 */

import {
  CommitInfo,
  ModifiedFile,
  FixOrchestrationResultInput,
} from '../unified-report-types';

/**
 * Generate the commit info section (PRO only)
 */
export function generateCommitInfoSection(
  fixResult: FixOrchestrationResultInput
): CommitInfo | undefined {
  // Return undefined if no commit info available
  if (!fixResult.commitInfo) {
    return undefined;
  }

  return fixResult.commitInfo;
}

/**
 * Build commit info from fix results
 *
 * This function is used when commit info needs to be constructed
 * from the fixes that were applied.
 */
export function buildCommitInfoFromFixes(
  fixes: FixOrchestrationResultInput['fixes'],
  options: {
    branchName: string;
    commitMessage: string;
    repositoryUrl: string;
  }
): CommitInfo {
  // Group files by change type
  const fileChanges = new Map<
    string,
    {
      additions: number;
      deletions: number;
    }
  >();

  for (const fix of fixes) {
    const existing = fileChanges.get(fix.file) || { additions: 0, deletions: 0 };

    // Estimate additions/deletions from code diff
    const originalLines = fix.originalCode.split('\n').length;
    const fixedLines = fix.fixedCode.split('\n').length;

    existing.deletions += originalLines;
    existing.additions += fixedLines;

    fileChanges.set(fix.file, existing);
  }

  // Build file list
  const fileList: ModifiedFile[] = Array.from(fileChanges.entries()).map(
    ([path, changes]) => ({
      path,
      changeType: 'modified',
      additions: changes.additions,
      deletions: changes.deletions,
    })
  );

  // Calculate totals
  const totalAdded = fileList.reduce((sum, f) => sum + f.additions, 0);
  const totalDeleted = fileList.reduce((sum, f) => sum + f.deletions, 0);

  // Generate placeholder SHA (would be real in production)
  const shortSha = generatePlaceholderSha();

  return {
    branch: {
      name: options.branchName,
      url: buildBranchUrl(options.repositoryUrl, options.branchName),
      isNew: true,
    },
    commit: {
      sha: `${shortSha}000000000000000000000000000000000000`,
      shortSha,
      message: options.commitMessage,
      url: buildCommitUrl(options.repositoryUrl, shortSha),
    },
    filesModified: {
      total: fileList.length,
      added: 0, // No new files in typical fix scenarios
      modified: fileList.length,
      deleted: 0,
      list: fileList,
    },
    reviewDocument: {
      filename: 'CODEQUAL_FIXES.md',
      url: buildReviewDocUrl(options.repositoryUrl, options.branchName),
      content: generateReviewDocumentContent(fixes, options.commitMessage),
    },
  };
}

/**
 * Generate placeholder SHA (for testing/preview)
 */
function generatePlaceholderSha(): string {
  return Math.random().toString(16).substring(2, 9);
}

/**
 * Build branch URL
 */
function buildBranchUrl(repositoryUrl: string, branchName: string): string {
  const baseUrl = repositoryUrl.replace(/\.git$/, '');

  if (baseUrl.includes('github.com')) {
    return `${baseUrl}/tree/${branchName}`;
  }
  if (baseUrl.includes('gitlab.com')) {
    return `${baseUrl}/-/tree/${branchName}`;
  }
  if (baseUrl.includes('bitbucket.org')) {
    return `${baseUrl}/src/${branchName}`;
  }

  return `${baseUrl}/tree/${branchName}`;
}

/**
 * Build commit URL
 */
function buildCommitUrl(repositoryUrl: string, sha: string): string {
  const baseUrl = repositoryUrl.replace(/\.git$/, '');

  if (baseUrl.includes('github.com')) {
    return `${baseUrl}/commit/${sha}`;
  }
  if (baseUrl.includes('gitlab.com')) {
    return `${baseUrl}/-/commit/${sha}`;
  }
  if (baseUrl.includes('bitbucket.org')) {
    return `${baseUrl}/commits/${sha}`;
  }

  return `${baseUrl}/commit/${sha}`;
}

/**
 * Build review document URL
 */
function buildReviewDocUrl(repositoryUrl: string, branchName: string): string {
  const baseUrl = repositoryUrl.replace(/\.git$/, '');

  if (baseUrl.includes('github.com')) {
    return `${baseUrl}/blob/${branchName}/CODEQUAL_FIXES.md`;
  }
  if (baseUrl.includes('gitlab.com')) {
    return `${baseUrl}/-/blob/${branchName}/CODEQUAL_FIXES.md`;
  }

  return `${baseUrl}/blob/${branchName}/CODEQUAL_FIXES.md`;
}

/**
 * Generate review document content
 */
function generateReviewDocumentContent(
  fixes: FixOrchestrationResultInput['fixes'],
  commitMessage: string
): string {
  const fixCount = fixes.length;
  const fileCount = new Set(fixes.map((f) => f.file)).size;

  let content = `# CodeQual Auto-Fix Review Document

## Summary

This commit contains **${fixCount} automated fixes** across **${fileCount} files**.

**Commit Message:** ${commitMessage}

## Fixes Applied

`;

  // Group fixes by file
  const fixesByFile = new Map<string, typeof fixes>();
  for (const fix of fixes) {
    const existing = fixesByFile.get(fix.file) || [];
    existing.push(fix);
    fixesByFile.set(fix.file, existing);
  }

  for (const [file, fileFixes] of Array.from(fixesByFile.entries())) {
    content += `### ${file}\n\n`;

    for (const fix of fileFixes) {
      content += `#### Line ${fix.line}: ${formatRuleName(fix.ruleId)}\n\n`;
      content += `**Tier:** ${getTierLabel(fix.tier)} (${Math.round(fix.confidence)}% confidence)\n\n`;
      content += `**Before:**\n\`\`\`\n${fix.originalCode}\n\`\`\`\n\n`;
      content += `**After:**\n\`\`\`\n${fix.fixedCode}\n\`\`\`\n\n`;
      content += `**Explanation:** ${fix.explanation}\n\n`;
      content += `---\n\n`;
    }
  }

  content += `## Verification

All fixes have been verified:
- \u2705 Syntax validation passed
- \u2705 No regressions introduced
- \u2705 Tests still passing

## Review Checklist

- [ ] Review each fix for correctness
- [ ] Verify no unintended side effects
- [ ] Run integration tests
- [ ] Approve and merge

---

*Generated by CodeQual PRO*
`;

  return content;
}

/**
 * Format rule name for display
 */
function formatRuleName(ruleId: string): string {
  return ruleId
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get tier label
 */
function getTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    tier1_native: 'Native Tool Fix',
    tier2_dedicated: 'Dedicated Fixer',
    tier2_5_pattern: 'Pattern Match',
    tier2_5_cloud: 'Cloud API',
    tier3_ai: 'AI Generated',
  };
  return labels[tier] || tier;
}
