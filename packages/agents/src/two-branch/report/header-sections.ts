/**
 * Header and Key Sections Generation Service
 *
 * Handles generation of report header, key findings, critical blockers, and quick wins.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 */

import { EnrichedIssue } from './types';
import { IssueGroup } from '../utils/issue-grouping';
import { formatDate, formatDuration, getUserFriendlyTitle } from './formatter-utils';
import { getRuleDescription, guessLanguage } from '../config/rule-descriptions';
import { getScannerToolGuidance } from './fix-capability-utils';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Check if a group can be auto-fixed
 *
 * SESSION 53 REFACTOR: Language-neutral approach
 * CodeQual generates AI fixes for ALL issues, so most are auto-fixable.
 * We only exclude specific patterns that require manual intervention.
 */
function canAutoFix(group: IssueGroup): boolean {
  const ruleLower = group.rule?.toLowerCase() || '';

  // ===== NON-AUTO-FIXABLE PATTERNS =====
  // These require architectural changes or manual decision-making

  // Circular dependencies require architectural refactoring
  if (ruleLower.includes('circular-dependency') || ruleLower.includes('cyclic')) {
    return false;
  }

  // Complex architectural issues
  if (ruleLower.includes('god-class') || ruleLower.includes('god-object')) {
    return false;
  }

  // Issues requiring human judgment on business logic
  if (ruleLower.includes('magic-number') && group.severity === 'low') {
    // Magic numbers often need context to determine correct constant names
    return false;
  }

  // ===== DEFAULT: AUTO-FIXABLE =====
  // CodeQual generates AI fix suggestions for 100% of issues
  // LSP file contains ready-to-apply fixes for IDEs
  // Even complex security issues have AI-generated fix code
  return true;
}

/**
 * Generate report header with repository and PR information
 */
export function generateHeader(
  metadata: any,
  showPerfSubmetrics = true
): string {
  console.log(`\n[DEBUG-PR#] ====== generateHeader ENTRY ======`);
  console.log(`[DEBUG-PR#] metadata.prNumber: ${metadata.prNumber} (type: ${typeof metadata.prNumber})`);
  console.log(`[DEBUG-PR#] metadata.repository: ${metadata.repository}`);
  console.log(`[DEBUG-PR#] About to render: **Pull Request:** #${metadata.prNumber}`);
  console.log(`[DEBUG-PR#] ======================================\n`);

  // SESSION 112: Removed icon variable - Quality Decision section removed (redundant with Quality Assessment)
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
  
  // SESSION 113: Add duration next to Analysis Date per user feedback
  header += `\n**Analysis Date:** ${analysisDate}${metadata.totalDuration ? ` (${durationDisplay})` : ''}
**Repository Size:** ${(metadata.totalFiles || 0).toLocaleString()} files`;

  // SESSION 112: Add tier field to report metadata
  if (metadata.userTier) {
    const tierLabel = metadata.userTier === 'pro' ? '⭐ PRO' :
                      metadata.userTier === 'enterprise' ? '🏢 Enterprise' : '📋 Basic';
    header += `
**Report Tier:** ${tierLabel}`;
  }

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
  
  // SESSION 112: Removed Quality Decision section - redundant with Quality Assessment section

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
  // SESSION 113 FIX: Exclude RESOLVED issues from auto-fix count (they're already fixed)
  const autoFixable = groups.filter(g => canAutoFix(g));
  if (autoFixable.length > 0) {
    const autoFixableCount = issues.filter(i =>
      i.category !== 'RESOLVED' &&  // Exclude already-resolved issues
      autoFixable.some(g => g.rule === i.rule && g.tool === i.tool)
    ).length;
    findings.push(`🔧 **Auto-Fix Available**: ${autoFixableCount} issues can be fixed automatically (see IDE integration files)`);
  }
  
  return findings.map(f => `- ${f}`).join('\n');
}

/**
 * Extract code snippet from a file with line numbers and context
 */
async function extractCodeSnippet(
  filePath: string,
  line: number,
  contextLines = 2
): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const start = Math.max(0, line - contextLines - 1);
    const end = Math.min(lines.length, line + contextLines);

    let snippet = '';
    for (let i = start; i < end; i++) {
      const lineNum = i + 1;
      const marker = lineNum === line ? '>' : ' ';
      snippet += `${marker} ${lineNum.toString().padStart(4)} | ${lines[i]}\n`;
    }

    return snippet;
  } catch (error) {
    return `// Could not extract code snippet: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Generate critical blockers section
 * Lists issues that must be fixed before merge, prioritized by severity and impact
 */
export async function generateCriticalBlockers(
  groups: IssueGroup[],
  blockingIssues: EnrichedIssue[],
  repoPath?: string
): Promise<string> {
  // BUG #92 FIX: Changed from detailed issue listing to summary-only to eliminate duplication
  // All blocking issues are shown in detail in the "Critical Issues" and "High Priority Issues" sections
  
  if (blockingIssues.length === 0) {
    return `✅ **No critical blockers** - PR can be merged once reviewed\n\nAll identified issues are either low/medium severity or in unchanged code.`;
  }

  // Count by severity
  const criticalCount = blockingIssues.filter(i => i.severity === 'critical').length;
  const highCount = blockingIssues.filter(i => i.severity === 'high').length;

  // Count by category
  const byCategory = blockingIssues.reduce((acc, i) => {
    const cat = i.detectedCategory || 'Code Quality';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(byCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([cat, count]) => `${count} ${cat.toLowerCase()}`)
    .join(', ');

  // SESSION 113 FIX: Dynamic section references based on actual severities present
  const sectionRefs = criticalCount > 0 && highCount > 0
    ? '"Critical Issues" and "High Priority Issues" sections'
    : criticalCount > 0
    ? '"Critical Issues" section'
    : '"High Priority Issues" section';

  const priorityAdvice = criticalCount > 0
    ? 'Review critical issues first, then tackle high-priority issues by category to maximize impact.'
    : 'Review high-priority issues by category to maximize impact.';

  return `⛔ **${blockingIssues.length} issues must be fixed before merge**

**Breakdown:**
${criticalCount > 0 ? `- 🔴 Critical: ${criticalCount} issue${criticalCount > 1 ? 's' : ''}\n` : ''}${highCount > 0 ? `- 🟠 High: ${highCount} issue${highCount > 1 ? 's' : ''}\n` : ''}
**Primary Focus Areas:** ${topCategories}

**Action Required:**
All blocking issues are detailed in the ${sectionRefs} below with:
- ✅ Full AI analysis and explanations
- ✅ Code examples and fix recommendations
- ✅ IDE integration files for automated fixes

**Priority:**
${priorityAdvice}`;
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

/**
 * Generate scanner tool guidance section for Tier 3 (scanner-only) tools
 * This shows users what they get even without auto-fix capabilities
 *
 * Session 57 Part 7: Integrated into report generation
 */
export function generateScannerGuidanceSection(issues: EnrichedIssue[]): string {
  // Group issues by tool
  const toolCounts = new Map<string, number>();
  for (const issue of issues) {
    toolCounts.set(issue.tool, (toolCounts.get(issue.tool) || 0) + 1);
  }

  // Get scanner guidance for each tool
  const scannerTools: Array<{ tool: string; count: number; guidance: ReturnType<typeof getScannerToolGuidance> }> = [];
  for (const [tool, count] of toolCounts.entries()) {
    const guidance = getScannerToolGuidance(tool);
    if (guidance) {
      scannerTools.push({ tool, count, guidance });
    }
  }

  if (scannerTools.length === 0) {
    return '';
  }

  let section = '## 🔍 Scanner Tool Insights\n\n';
  section += '*These tools provide valuable analysis even without auto-fix capabilities. ';
  section += 'Review the findings and apply fixes manually using the guidance below.*\n\n';

  for (const { tool, count, guidance } of scannerTools) {
    if (!guidance) continue;

    section += `### ${guidance.tool} (${count} issues)\n\n`;
    section += `**Category:** ${guidance.category}\n\n`;

    section += `**What You Get:**\n`;
    for (const item of guidance.whatYouGet) {
      section += `- ✓ ${item}\n`;
    }
    section += '\n';

    section += `**How to Fix:**\n`;
    for (const item of guidance.howToFix) {
      section += `- ${item}\n`;
    }
    section += '\n';

    if (guidance.resources && guidance.resources.length > 0) {
      section += `**Resources:**\n`;
      for (const resource of guidance.resources) {
        section += `- ${resource}\n`;
      }
      section += '\n';
    }
  }

  return section;
}

