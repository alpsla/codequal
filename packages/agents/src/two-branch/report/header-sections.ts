/**
 * Header and Key Sections Generation Service
 * 
 * Handles generation of report header, key findings, critical blockers, and quick wins.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 */

import { EnrichedIssue } from './types';
import { IssueGroup } from '../utils/issue-grouping';
import { formatDate, formatDuration, getUserFriendlyTitle } from './formatter-utils';

/**
 * Check if a group can be auto-fixed
 */
function canAutoFix(group: IssueGroup): boolean {
  const autoFixableRules = [
    'SystemPrintln',
    'GuardLogStatement',
    'LineLength',
    'WhitespaceAround',
    'WhitespaceAfter',
    'AvoidStarImport',
    'UnusedImports',
    'RedundantImport',
    'SimplifyBooleanReturns',
    'SimplifyBooleanExpressions',
    'ForLoopCanBeForeach',
    'UseStringBufferForStringAppends',
    'ConsecutiveLiteralAppends',
    'MissingJavadocMethod',
    'MissingJavadocType'
  ];
  
  return autoFixableRules.includes(group.rule) || 
         (group.tool === 'checkstyle' && group.rule.toLowerCase().includes('whitespace'));
}

/**
 * Generate report header with repository and PR information
 */
export function generateHeader(
  metadata: any,
  showPerfSubmetrics = true
): string {
  // BUG FIX #71: Support both 'APPROVE' and 'APPROVED' (metadata uses 'APPROVE', but some places use 'APPROVED')
  const icon = (metadata.decision === 'APPROVE' || metadata.decision === 'APPROVED') ? '✅' : '⛔';
  const analysisDate = formatDate(metadata.analyzedAt);
  
  // Calculate net change in lines
  const linesAdded = metadata.linesAdded || 0;
  const linesDeleted = metadata.linesDeleted || 0;
  const netChange = linesAdded - linesDeleted;
  
  // Format duration
  const durationDisplay = formatDuration(metadata.totalDuration);
  
  let header = `# 🔍 Code Quality Analysis Report

## Repository Information

**Repository:** ${metadata.repoUrl ? `[${metadata.repository}](${metadata.repoUrl})` : metadata.repository}  
**Pull Request:** #${metadata.prNumber}${metadata.prTitle ? ` - ${metadata.prTitle}` : ''}  `;
  
  if (metadata.prAuthor) {
    header += `\n**Author:** ${metadata.prAuthor}${metadata.prAuthorEmail ? ` (${metadata.prAuthorEmail})` : ''}  `;
  }
  
  if (metadata.organizationName) {
    header += `\n**Organization:** ${metadata.organizationName}  `;
  }
  
  if (metadata.branch && metadata.baseBranch) {
    header += `\n**Source Branch:** ${metadata.branch}  
**Target Branch:** ${metadata.baseBranch}  `;
  }
  
  header += `\n**Analysis Date:** ${analysisDate}  
**Repository Size:** ${(metadata.totalFiles || 0).toLocaleString()} files`;
  
  if (metadata.totalLinesOfCode) {
    header += ` | ${metadata.totalLinesOfCode.toLocaleString()} lines`;
  }
  
  if (metadata.analyzerVersion) {
    header += `  
**Analyzer Version:** ${metadata.analyzerVersion}`;
  }
  
  // Add PR Impact section if data available
  if (metadata.filesModified || metadata.linesAdded || metadata.linesDeleted) {
    header += `

## PR Impact

**Files Modified:** ${Math.min(metadata.filesModified || 0, metadata.totalFiles || (metadata.filesModified || 0))}  `;
    
    if (metadata.linesAdded !== undefined || metadata.linesDeleted !== undefined) {
      header += `
**Lines Added:** +${linesAdded}  
**Lines Deleted:** -${linesDeleted}  
**Net Change:** ${netChange > 0 ? '+' : ''}${netChange} lines  `;
    }
  }
  
  // Add Analysis Performance section if data available
  if (metadata.totalDuration) {
    header += `

## Analysis Performance

**Total Duration:** ${durationDisplay}  `;
    
    if (showPerfSubmetrics && metadata.cloneTime) {
      header += `
**Clone Time:** ${formatDuration(metadata.cloneTime)}  `;
    }
    
    if (showPerfSubmetrics && metadata.analysisTime) {
      header += `
**Analysis Time:** ${formatDuration(metadata.analysisTime)}  `;
    }
    
    if (showPerfSubmetrics && metadata.reportGenerationTime) {
      header += `
**Report Generation:** ${formatDuration(metadata.reportGenerationTime)}  `;
    }
  }
  
  // Add Decision section
  header += `

## Quality Decision

**Result:** ${icon} **${metadata.decision}**${metadata.blockingCount > 0 ? ` (${metadata.blockingCount} blocking issues)` : ''}

---`;
  
  return header;
}

/**
 * Generate key findings section
 * Highlights the most important insights from the analysis
 */
export function generateKeyFindings(
  issues: EnrichedIssue[],
  groups: IssueGroup[],
  blockingIssues: EnrichedIssue[]
): string {
  const findings: string[] = [];
  
  // Finding 1: Overall quality assessment
  const newIssues = issues.filter(i => i.category === 'NEW');
  const resolvedIssues = issues.filter(i => i.category === 'RESOLVED');
  
  if (newIssues.length === 0 && resolvedIssues.length > 0) {
    findings.push(`✅ **Excellent PR**: No new issues introduced and ${resolvedIssues.length} existing issues fixed`);
  } else if (blockingIssues.length > 0) {
    findings.push(`🔴 **Action Required**: ${blockingIssues.length} critical/high severity issues must be fixed before merge`);
  } else if (newIssues.length < 10) {
    findings.push(`👍 **Good Quality**: Only ${newIssues.length} new issues introduced, manageable to fix`);
  } else {
    findings.push(`⚠️ **Attention Needed**: ${newIssues.length} new issues introduced, consider code review`);
  }
  
  // Finding 2: Most common issue type
  const topGroup = groups.sort((a, b) => b.count - a.count)[0];
  if (topGroup && topGroup.count > 10) {
    findings.push(`📊 **Most Common**: ${getUserFriendlyTitle(topGroup.rule, topGroup.tool)} appears ${topGroup.count} times`);
  }
  
  // Finding 3: Security concerns
  const securityIssues = issues.filter(i => i.detectedCategory === 'Security');
  const criticalSecurity = securityIssues.filter(i => i.severity === 'critical');
  if (criticalSecurity.length > 0) {
    findings.push(`🔒 **Security Alert**: ${criticalSecurity.length} critical security vulnerabilities found`);
  } else if (securityIssues.length > 0) {
    findings.push(`🔒 **Security**: ${securityIssues.length} security issues identified (review recommended)`);
  } else {
    findings.push(`✅ **Security**: No security vulnerabilities detected`);
  }
  
  // Finding 4: Auto-fix availability
  const autoFixable = groups.filter(g => canAutoFix(g));
  if (autoFixable.length > 0) {
    const autoFixableCount = issues.filter(i => 
      autoFixable.some(g => g.rule === i.rule && g.tool === i.tool)
    ).length;
    findings.push(`🔧 **Auto-Fix Available**: ${autoFixableCount} issues can be fixed automatically (see IDE integration files)`);
  }
  
  return findings.map(f => `- ${f}`).join('\n');
}

/**
 * Generate critical blockers section
 * Lists issues that must be fixed before merge, prioritized by severity and impact
 */
export function generateCriticalBlockers(
  groups: IssueGroup[],
  blockingIssues: EnrichedIssue[]
): string {
  if (blockingIssues.length === 0) {
    return `✅ **No critical blockers** - PR can be merged once reviewed\n\nAll identified issues are either low/medium severity or in unchanged code.`;
  }
  
  // Group blockers by rule and compute priority score (severity > category > spread)
  const severityWeight = (sev: string) => sev === 'critical' ? 100 : sev === 'high' ? 60 : 0;
  const categoryWeight = (cat?: string) => {
    const c = (cat || '').toLowerCase();
    if (c === 'security') return 30;
    if (c === 'performance') return 15;
    if (c === 'architecture') return 10;
    return 5; // quality/dependency
  };

  const blockerGroups = groups
    .filter(g => (g.severity === 'critical' || g.severity === 'high'))
    .filter(g => blockingIssues.some(i => i.rule === g.rule && i.tool === g.tool && i.severity === g.severity))
    .map(g => {
      const matches = blockingIssues.filter(i => i.rule === g.rule && i.tool === g.tool && i.severity === g.severity);
      const filesSpread = new Set(matches.map(i => i.file)).size;
      const score = severityWeight(g.severity) + categoryWeight(g.detectedCategory) + Math.min(20, Math.round(Math.log2(Math.max(1, filesSpread)) * 10));
      return { group: g, matches, filesSpread, score };
    })
    .sort((a, b) => b.score - a.score);
  
  let content = `⛔ **${blockingIssues.length} issues must be fixed before merge**\n\n`;
  content += `**Fix Order (highest priority first):**\n\n`;
  
  blockerGroups.forEach((entry, idx) => {
    const { group, matches, filesSpread, score } = entry;
    const icon = group.severity === 'critical' ? '🔴' : '🟠';
    content += `${idx + 1}. ${icon} **${getUserFriendlyTitle(group.rule, group.tool)}**\n`;
    content += `   - Severity: ${group.severity.toUpperCase()}\n`;
    content += `   - Category: ${group.detectedCategory || 'Code Quality'}\n`;
  content += `   - Occurrences: ${group.count} (in ${filesSpread} files)\n`;
  content += `   - Priority Score: ${score}\n`;
  content += `     *(Priority = Severity[${severityWeight(group.severity)}] + Category[${categoryWeight(group.detectedCategory)}] + File Spread[log₂(${filesSpread})×10])*\n`;
  // Include all example locations for clarity (may be long for large spreads)
    const examples = matches.map(i => `${i.file}:${i.line || 0}`);
    if (examples.length > 0) {
      content += `   - Examples:\n`;
      examples.forEach(ex => { content += `     • ${ex}\n`; });
    }
    content += `\n`;
  });
  
  // BUG FIX #29: Add detailed Priority Score explanation footnote
  content += `\n---\n\n`;
  content += `**📘 Priority Score Calculation**\n\n`;
  content += `The Priority Score helps you focus on the most impactful issues first. It combines three factors:\n\n`;
  content += `1. **Severity Weight** (0-100 points):\n`;
  content += `   - Critical: 100 points (security vulnerabilities, system crashes)\n`;
  content += `   - High: 60 points (data loss, performance degradation)\n`;
  content += `   - Medium: 0 points (not blocking)\n`;
  content += `   - Low: 0 points (not blocking)\n\n`;
  content += `2. **Category Weight** (0-30 points):\n`;
  content += `   - Security: +30 points (highest risk)\n`;
  content += `   - Performance: +15 points (affects UX)\n`;
  content += `   - Architecture: +10 points (technical debt)\n`;
  content += `   - Code Quality/Dependencies: +5 points (maintainability)\n\n`;
  content += `3. **File Spread** (0-20 points):\n`;
  content += `   - log₂(files) × 10 (capped at 20)\n`;
  content += `   - 1 file = 0 points\n`;
  content += `   - 2 files = 10 points\n`;
  content += `   - 4 files = 20 points (max)\n`;
  content += `   - Rationale: Issues spread across many files require more effort to fix\n\n`;
  content += `**Formula**: \`Priority = Severity + Category + File Spread\`\n\n`;
  content += `**Example**: A critical security issue in 4 files = 100 + 30 + 20 = **150 points**\n`;
  
  return content;
}

/**
 * Generate quick wins section
 * Highlights easy-to-fix issues that provide immediate value
 */
export function generateQuickWins(
  groups: IssueGroup[],
  autoFixableGroups: IssueGroup[]
): string {
  if (autoFixableGroups.length === 0) {
    return `No auto-fixable issues identified. Manual fixes required for all issues.`;
  }
  
  // Sort by impact (high count + low severity = quick win)
  const quickWins = autoFixableGroups
    .filter(g => g.severity === 'medium' || g.severity === 'low')
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 quick wins
  
  if (quickWins.length === 0) {
    return `Auto-fix available for ${autoFixableGroups.length} critical/high issues (not quick wins, but important).`;
  }
  
  let content = `**${quickWins.reduce((sum, g) => sum + g.count, 0)} issues** can be fixed automatically with **minimal effort**:\n\n`;
  
  quickWins.forEach((group, idx) => {
    content += `${idx + 1}. **${getUserFriendlyTitle(group.rule, group.tool)}** (${group.count} occurrences)\n`;
    content += `   - Effort: Low (automated fix available)\n`;
    content += `   - Impact: Improves code quality and consistency\n`;
    content += `   - Action: Download IDE fix file from attachments\n\n`;
  });
  
  content += `> 💡 **Tip**: Use Cursor IDE integration to apply all fixes with one click!`;
  
  return content;
}

