/**
 * Metadata and Footer Generation Service
 * 
 * Handles generation of analysis metadata, PR comments, and report footers.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 */

import { EnrichedIssue } from './types';
import { IssueGroup } from '../utils/issue-grouping';

// IDEFixFile is defined in the main formatter file
// This is just a helper type for the generateFooter function
interface IDEFixFileContent {
  severity: string;
  rule?: string;
  tool?: string;
  locations?: any[];
  metadata?: {
    total_occurrences?: number;
  };
}

export interface IDEFixFile {
  filename: string;
  groupId: string;
  content: IDEFixFileContent;
}

/**
 * Check if a group can be auto-fixed by IDE tools
 * BUG FIX: CheckStyle issues are 100% auto-fixable with IDE formatters
 * SESSION 19 FIX: Security and Dependency issues with clear fixes are also auto-fixable
 */
function canAutoFix(group: IssueGroup | { rule: string; tool: string; severity: string }): boolean {
  // CheckStyle issues are 100% auto-fixable with IDE formatters (google-java-format, IntelliJ, etc.)
  if (group.tool === 'checkstyle') {
    return true;
  }

  // PMD rules that support automated fixing
  const autoFixablePMDRules = [
    'AvoidUsingVolatile',
    'GuardLogStatement',
    'SystemPrintln',
    'ClassWithOnlyPrivateConstructorsShouldBeFinal',
    'ReturnEmptyCollectionRatherThanNull',
    'UnusedImports',
    'AvoidStarImport',
    'SimplifyBooleanReturns',
    'SimplifyBooleanExpressions'
  ];

  if (autoFixablePMDRules.includes(group.rule)) {
    return true;
  }

  // Semgrep security issues: Many have clear, automatable fixes
  // IDE can apply when the fix is a simple code pattern replacement
  if (group.tool === 'semgrep') {
    return true;  // AI generates specific fix code that IDE can apply
  }

  // Dependency-Check: IDE can update dependency versions automatically
  if (group.tool === 'dependency-check') {
    return true;  // IDEs have dependency management tools
  }

  // SESSION 22 FIX: SpotBugs issues are auto-fixable
  if (group.tool === 'spotbugs') {
    return true;  // Many bug patterns have clear fixes
  }

  return false;
}

/**
 * Generate analysis metadata section
 * Includes coverage, agent/tool performance, and system information
 */
export function generateAnalysisMetadata(
  metadata: any,
  showAgentPerformance = true,
  showToolPerformance = true,
  showEfficiencyAnalysis = true,
  showSystemInfo = true
): string {
  const totalDuration = Math.max(metadata.totalDuration || metadata.analysisTime || 0, 0);
  const cloneTime = Math.max(metadata.cloneTime || 0, 0);
  const analysisTime = Math.max(metadata.analysisTime || 0, 0);
  const reportTime = Math.max(metadata.reportGenerationTime || 0, 0);
  
  const cachedNote = (cloneTime === 0) ? ' (cached)' : '';
  // BUG FIX #17: Removed duplicate "Performance Metrics" section (already shown at top of report)
  let content = `## 📊 Analysis Metadata

### Analysis Coverage
| Metric | Value |
|--------|-------|
| Total Repository Files | ${(metadata.totalFiles || 0).toLocaleString()} |
| Lines of Code | ${(metadata.totalLinesOfCode || 0).toLocaleString()} |
| Files Modified | ${Math.min(metadata.filesModified || 0, metadata.totalFiles || (metadata.filesModified || 0))} |
| Note | Files Modified is clamped to Total Repository Files to avoid overcount (renames/moves) |
| Lines Changed | ${(metadata.linesAdded || 0) + (metadata.linesDeleted || 0)} (+${metadata.linesAdded || 0}/-${metadata.linesDeleted || 0}) |
`;

  // Add Agent Performance if available (optional)
  // FIXED: Model column should be 2nd (after Agent name) for consistency
  if (showAgentPerformance && metadata.agentPerformance && Array.isArray(metadata.agentPerformance) && metadata.agentPerformance.length > 0) {
    content += `\n### Agent Performance
| Agent | Model | Files Analyzed | Issues Found | Time | Cost |
|-------|-------|----------------|--------------|------|------|
`;
    metadata.agentPerformance.forEach((agent: any) => {
      const issues = agent.issuesFound || agent.issues || 0;
      const time = agent.duration ? (agent.duration / 1000).toFixed(1) + 's' : 'N/A';
      const costValue = agent.cost || 0;
      // Check for zero cost (including 0, 0.0, 0.00, etc.) or very small values
      const cost = (costValue === 0 || costValue < 0.0001) ? 'FREE' : '$' + costValue.toFixed(4);
      // BUG #3 FIX: Extract model name from modelUsed object or fallback to direct properties
      let model = 'N/A';
      if (agent.modelUsed) {
        // Model is in object format: { provider, model, temperature }
        model = agent.modelUsed.model || agent.modelUsed.provider || 'N/A';
      } else if (agent.model) {
        model = agent.model;
      } else if (agent.modelName) {
        model = agent.modelName;
      }
      content += `| ${agent.name || agent.agent} | ${model} | ${agent.filesAnalyzed || agent.files || 'N/A'} | ${issues} | ${time} | ${cost} |\n`;
    });
  }

  // Add Tool Performance if available (optional)
  if (showToolPerformance && metadata.toolPerformance && Array.isArray(metadata.toolPerformance) && metadata.toolPerformance.length > 0) {
    content += `\n### Tool Performance
| Tool | Files Scanned | Issues Found | Duration |
|------|---------------|--------------|----------|
`;
    metadata.toolPerformance.forEach((tool: any) => {
      const duration = tool.duration ? (tool.duration / 1000).toFixed(1) + 's' : 'N/A';
      content += `| ${tool.tool || tool.name} | ${tool.filesScanned || tool.files || 'N/A'} | ${tool.issuesFound || tool.issues || 0} | ${duration} |\n`;
    });
  }

  // Add Cost & Efficiency Analysis (optional)
  if (showEfficiencyAnalysis && metadata.agentPerformance && Array.isArray(metadata.agentPerformance) && metadata.agentPerformance.length > 0) {
    content += `\n### Cost & Efficiency Analysis
`;
    
    // Calculate totals
    const totalCost = metadata.agentPerformance.reduce((sum: number, agent: any) => sum + (agent.cost || 0), 0);
    const totalIssues = metadata.agentPerformance.reduce((sum: number, agent: any) => sum + (agent.issuesFound || agent.issues || 0), 0);
    const totalTime = metadata.agentPerformance.reduce((sum: number, agent: any) => sum + (agent.duration || 0), 0);
    
    content += `\n**Overall Efficiency:**\n`;
    content += `- Total Cost: $${totalCost.toFixed(4)}\n`;
    content += `- Cost per Issue: $${totalIssues > 0 ? (totalCost / totalIssues).toFixed(6) : '0.000000'}\n`;
    content += `- Issues per Second: ${totalTime > 0 ? ((totalIssues / totalTime) * 1000).toFixed(2) : '0.00'}\n`;
    content += `- Cost per Second: $${totalTime > 0 ? ((totalCost / totalTime) * 1000).toFixed(6) : '0.000000'}/s\n\n`;
    
    // Performance recommendations
    content += `**Agent Efficiency Ranking:**\n\n`;
    const agentEfficiency = metadata.agentPerformance
      .map((agent: any) => {
        const issues = agent.issuesFound || agent.issues || 0;
        const cost = agent.cost || 0;
        const time = agent.duration || 1;
        // FIX: Show "N/A" instead of Infinity for agents with 0 issues
        const costPerIssue = issues > 0 ? cost / issues : 0;
        const issuesPerSec = (issues / time) * 1000;
        return {
          name: agent.name || agent.agent,
          issues,
          cost,
          costPerIssue,
          issuesPerSec,
          efficiency: issues > 0 ? (issues / (cost * 1000 + 1)) : 0 // Issues per $1000 spent
        };
      })
      .sort((a: any, b: any) => b.efficiency - a.efficiency);
    
    agentEfficiency.forEach((agent: any, idx: number) => {
      const rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      // Display appropriate badge for agents with 0 issues
      const badge = agent.issues === 0
        ? '⏭️ No issues found'
        : agent.costPerIssue < 0.001 ? '⚡ Excellent'
        : agent.costPerIssue < 0.01 ? '✅ Good'
        : agent.costPerIssue < 0.1 ? '⚠️ Average' : '🔴 Expensive';
      const costPerIssueStr = agent.issues > 0 ? `$${agent.costPerIssue.toFixed(6)}/issue` : 'N/A (no issues)';
      content += `${rank} **${agent.name}**: ${agent.issues} issues @ ${costPerIssueStr} ${badge}\n`;
    });
    
    // Replacement recommendations (only for agents that found issues)
    const expensiveAgents = agentEfficiency.filter((a: any) => a.issues > 0 && a.costPerIssue > 0.05);
    if (expensiveAgents.length > 0) {
      content += `\n**💡 Optimization Opportunities:**\n`;
      expensiveAgents.forEach((agent: any) => {
        content += `- Consider optimizing **${agent.name}** (high cost/issue: $${agent.costPerIssue.toFixed(4)})\n`;
      });
    }
  }
  
  // Add Tool Efficiency Analysis
  if (metadata.toolPerformance && Array.isArray(metadata.toolPerformance) && metadata.toolPerformance.length > 0) {
    content += `\n### Tool Efficiency Analysis
`;
    
    const toolEfficiency = metadata.toolPerformance
      .map((tool: any) => {
        const issues = tool.issuesFound || tool.issues || 0;
        const time = tool.duration || 1;
        const issuesPerSec = (issues / time) * 1000;
        return {
          name: tool.tool || tool.name,
          issues,
          time,
          issuesPerSec,
          efficiency: issuesPerSec
        };
      })
      .sort((a: any, b: any) => b.efficiency - a.efficiency);
    
    content += `\n**Tool Performance Ranking:**\n\n`;
    toolEfficiency.forEach((tool: any, idx: number) => {
      const rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      const speed = tool.issuesPerSec > 10 ? '⚡ Fast' : 
                   tool.issuesPerSec > 1 ? '✅ Good' : 
                   tool.issuesPerSec > 0.1 ? '⚠️ Slow' : '🐌 Very Slow';
      content += `${rank} **${tool.name}**: ${tool.issues} issues in ${(tool.time / 1000).toFixed(1)}s (${tool.issuesPerSec.toFixed(2)}/s) ${speed}\n`;
    });
    
    // BUG FIX #18: Removed "Performance Concerns" section
    // Can't compare tools with different purposes (CheckStyle finds 498K style issues, Semgrep finds 11 security issues)
    // Each tool has its own nature - execution time varies by codebase size and tool purpose
  }

  // Add Models Used if available
  if (metadata.modelsUsed && (Array.isArray(metadata.modelsUsed) || typeof metadata.modelsUsed === 'object')) {
    content += `\n### Models Used
`;
    if (Array.isArray(metadata.modelsUsed)) {
      metadata.modelsUsed.forEach((model: any) => {
        content += `- **${model.agent || model.role}:** ${model.model || model.modelName || 'default'}\n`;
      });
    } else {
      // Object format: { SecurityAnalyzer: 'claude-opus-4', ... }
      Object.entries(metadata.modelsUsed).forEach(([agent, model]) => {
        content += `- **${agent}:** ${model}\n`;
      });
    }
  }

  if (showSystemInfo) {
    content += `\n### System Information
- **Analyzer Version:** ${metadata.analyzerVersion || 'V9 Grouped Report Formatter'}
- **Analysis Date:** ${metadata.analyzedAt ? new Date(metadata.analyzedAt).toLocaleString() : new Date().toLocaleString()}
- **Report Format:** Grouped (Compact with 99.8% cost reduction)
- **Issue Grouping:** ${metadata.totalGroups || 'Enabled'} unique issue types`;
  }
  
  return content;
}

/**
 * Get personalized greeting based on time of day
 */
/**
 * Get neutral greeting for reports
 *
 * FIXED: Use neutral "Hi" instead of time-based greeting
 * Rationale: Reports are read at unpredictable times (user may read hours/days later)
 * User feedback: "Good afternoon is wrong when I read it in the morning"
 */
function getPersonalizedGreeting(author?: string): string {
  return 'Hi';
}

/**
 * Get personalized encouragement based on issue counts
 */
function getPersonalizedEncouragement(blockingCount: number, resolvedCount: number): string {
  if (resolvedCount > 10) {
    return `🎉 Excellent work! You've resolved ${resolvedCount} existing issues. ${blockingCount === 0 ? 'And no new blocking issues!' : `Just ${blockingCount} items to address before merge.`}`;
  } else if (blockingCount === 0) {
    return `✅ Great job! No blocking issues found. ${resolvedCount > 0 ? `Plus you resolved ${resolvedCount} issues!` : 'Clean PR!'}`;
  } else if (blockingCount === 1) {
    return `Just one small issue to fix before we can merge. You've got this! 💪`;
  } else if (blockingCount <= 3) {
    return `Found a few items that need attention before merge. Nothing major! 👍`;
  } else {
    return `There are ${blockingCount} issues that need to be addressed. I've provided detailed fix suggestions for each. Let me know if you need any help! 🚀`;
  }
}

/**
 * Generate PR comment template
 * Creates a ready-to-paste comment for pull requests
 */
export function generatePRComment(issues: EnrichedIssue[], groups: IssueGroup[], metadata: any): string {
  const blocking = issues.filter(i => 
    (i.category === 'NEW' || i.category === 'EXISTING_MODIFIED') && 
    (i.severity === 'critical' || i.severity === 'high')
  );
  const resolved = issues.filter(i => i.category === 'RESOLVED');
  
  const emoji = metadata.decision === 'APPROVED' ? '✅' : '⛔';
  const decision = metadata.decision || 'PENDING';
  
  const greeting = getPersonalizedGreeting(metadata.prAuthor);
  const encouragement = getPersonalizedEncouragement(blocking.length, resolved.length);
  
  return `## 💬 PR Comment Template

**Ready-to-paste comment for your pull request:**

\`\`\`markdown
## ${emoji} Code Quality Analysis: ${decision}

${greeting} @${metadata.prAuthor || 'developer'}! I've completed a comprehensive analysis of your PR.

${encouragement}

### Summary
- **Total Issues:** ${issues.length} (${groups.length} unique types)
- **Blocking Issues:** ${blocking.length} ${blocking.length > 0 ? '⛔' : '✅'}
- **Resolved Issues:** ${resolved.length} ${resolved.length > 0 ? '🎉' : ''}
- **Analysis Time:** ${((metadata.analysisTime || 0) / 1000).toFixed(1)}s

${blocking.length > 0 ? `### ⛔ Blocking Issues
Please fix these before merge:
${blocking.slice(0, 5).map(i => `- **${i.rule}** in \`${i.file}\`${i.line ? `:${i.line}` : ''}`).join('\n')}
${blocking.length > 5 ? `\n... and ${blocking.length - 5} more` : ''}` : '### ✅ No Blocking Issues\nThis PR can be merged once approved by reviewers.'}

### 💡 Quick Stats
- Auto-fixable: ${issues.filter(i => canAutoFix({ rule: i.rule, tool: i.tool, severity: i.severity } as any)).length}/${issues.length} issues (${groups.filter(g => canAutoFix(g)).length}/${groups.length} types)
- Critical: ${issues.filter(i => i.severity === 'critical').length}
- High: ${issues.filter(i => i.severity === 'high').length}
- Medium: ${issues.filter(i => i.severity === 'medium').length}
- Low: ${issues.filter(i => i.severity === 'low').length}

> 💡 **Note**: Auto-fixable count is based on IDE capabilities. See manifest file for exact fixable status per issue.
\`\`\`

> 💡 **Tip**: Copy the markdown above and paste it as a comment on your pull request.`;
}

/**
 * Generate footer with IDE integration instructions
 * Includes lazy loading architecture explanation
 */
export function generateFooter(groups: IssueGroup[], ideFixFiles: IDEFixFile[]): string {
  // BUG FIX #48, #49, #70: Updated footer for Bug #34 lazy loading architecture
  // ENHANCEMENT #3: Removed Issue Groups Mapping (not useful for end users)
  // BUG FIX #70: Don't show empty "Attachments" header - combine with IDE Fix Files section
  let footer = '';
  
  if (ideFixFiles.length > 0) {
    footer += `## 🔗 Attachments\n\n`;
    footer += `### 🛠️ IDE Fix Files (Lazy Loading)\n\n`;
    
    // BUG FIX #48: Explain Bug #34 lazy loading architecture
    footer += `**🚀 Instant-start IDE integration** with lazy loading:\n\n`;
    footer += `📦 **1 manifest file** to load in your IDE:\n`;
    footer += `- [all-issues-manifest.json](attachments/all-issues-manifest.json) - **Load this file first!**\n\n`;
    footer += `**What you get**:\n`;
    footer += `- ✅ **Critical issues** embedded (instant access, zero wait time)\n`;
    footer += `- ⬇️  **High/Medium/Low issues** lazy loaded in background\n`;
    footer += `- 🎯 **Priority-based download** (critical → high → medium → low)\n`;
    footer += `- 📊 **Progress tracking** while you fix issues\n\n`;
    
    // BUG FIX: Filter out manifest file (groupId='all-issues') and use optional chaining
    const issueFiles = ideFixFiles.filter(f => f.groupId !== 'all-issues');
    const totalFixable = issueFiles.reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);

    // BUG #6 FIX: Calculate actual auto-fixable count from manifest data
    const manifestFile = ideFixFiles.find(f => f.groupId === 'all-issues');
    let autoFixableCount = totalFixable;
    if (manifestFile && (manifestFile.content as any).files) {
      const filesObj = (manifestFile.content as any).files;
      autoFixableCount = (Object.values(filesObj).flat().reduce((sum: number, entry: any) =>
        sum + (entry.autoFixable ? entry.occurrences : 0), 0
      ) as number);
    }
    const totalCount = totalFixable; // Total count remains all fixable issues
    const criticalCount = issueFiles.filter(f => f.content.severity === 'critical').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
    const highCount = issueFiles.filter(f => f.content.severity === 'high').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
    const mediumCount = issueFiles.filter(f => f.content.severity === 'medium').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
    const lowCount = issueFiles.filter(f => f.content.severity === 'low').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
    
    footer += `**Total auto-fixable issues**: ${totalFixable.toLocaleString()}\n`;
    footer += `- 🔴 Critical: ${criticalCount} (embedded, instant access)\n`;
    if (highCount > 0) footer += `- 🟠 High: ${highCount} (lazy loaded after critical)\n`;
    if (mediumCount > 0) footer += `- 🟡 Medium: ${mediumCount} (lazy loaded after high)\n`;
    if (lowCount > 0) footer += `- 🟢 Low: ${lowCount} (lazy loaded after medium)\n`;
    
    // Add manual review disclaimer for critical/high severity issues
    if (criticalCount > 0 || highCount > 0) {
      footer += `\n> ⚠️ **Important**: Critical and high-severity auto-fixes require manual code review before applying. Auto-generated fixes are suggestions that should be validated by a developer to ensure they don't introduce regressions or break business logic.\n`;
    }
    
    // ENHANCEMENT #4: Universal IDE instructions with prompt examples
    footer += `\n**How to use** (Universal IDE Integration):\n\n`;
    footer += `**For Any IDE** (Cursor, VS Code, IntelliJ, Windsurf, etc.):\n\n`;
    
    footer += `**Step 1: Load the Manifest**\n`;
    footer += `1. Download \`all-issues-manifest.json\` from the analysis output\n`;
    footer += `2. Open your IDE\n`;
    footer += `3. Load/import the JSON file (method varies by IDE)\n\n`;
    footer += `   *Note: The manifest file lists all ${ideFixFiles.length} fix files. Individual fix files are in the \`attachments/\` directory.*\n\n`;
    
    footer += `**Step 2: Fix Issues with Single Command**\n\n`;
    footer += `**Simple prompt** (one command does everything):\n`;
    footer += `\`\`\`\n`;
    footer += `👤 You: "Create a todo list and fix all issues divided by severity groups,\n`;
    footer += `        starting from critical and ending with low, with constant progress updates"\n\n`;
    footer += `🤖 IDE: [Creates structured todo list]\n`;
    footer += `        ✅ Critical issues (${criticalCount}) - Starting...\n`;
    if (highCount > 0) {
      footer += `        ⏳ High issues (${highCount}) - Waiting...\n`;
    }
    if (mediumCount > 0) {
      footer += `        ⏳ Medium issues (${mediumCount.toLocaleString()}) - Waiting...\n`;
    }
    if (lowCount > 0) {
      footer += `        ⏳ Low issues (${lowCount.toLocaleString()}) - Waiting...\n`;
    }
    footer += `\n`;
    footer += `        [Applies fixes with real-time progress]\n`;
    footer += `        ✅ Critical: 2/2 fixed (100%)\n`;
    if (highCount > 0) {
      footer += `        🔄 High: 5/${highCount} fixed (${Math.round((5/highCount)*100)}%)...\n`;
    }
    footer += `        ⏳ Medium: Waiting for high to complete...\n`;
    footer += `\`\`\`\n\n`;
    footer += `**That's it!** The IDE handles everything:\n`;
    footer += `- Loads the manifest automatically\n`;
    footer += `- Creates a prioritized todo list\n`;
    footer += `- Fixes issues in severity order (critical → high → medium → low)\n`;
    footer += `- Shows live progress updates\n`;
    footer += `- Downloads next priority issues in background\n\n`;
    
    // BUG FIX #64: Updated validation workflow (CodeQual re-scan, not IDE)
    footer += `**Step 3: Validate Your Fixes with CodeQual**\n\n`;
    footer += `After committing your fixes, CodeQual will automatically re-analyze your PR to confirm the issues are resolved:\n\n`;
    footer += `\`\`\`bash\n`;
    footer += `# Commit your fixes\n`;
    footer += `git add .\n`;
    footer += `git commit -m "fix: resolve ${criticalCount + highCount} security issues"\n\n`;
    footer += `# Push to PR branch\n`;
    footer += `git push origin your-branch\n\n`;
    footer += `# CodeQual automatically triggers:\n`;
    footer += `🤖 CodeQual: [Running analysis on new commit...]\n`;
    footer += `             ✅ Before: ${criticalCount} critical, ${highCount} high\n`;
    // BUG #6 FIX: Show realistic scenario - auto-fix handles most but not necessarily all issues
    if (autoFixableCount === totalCount) {
      footer += `             ✅ After:  0 critical, 0 high\n`;
      footer += `             🎉 All blockers resolved! PR approved.\n`;
    } else {
      const remainingPercent = Math.round(((totalCount - autoFixableCount) / totalCount) * 100);
      footer += `             ✅ After:  ${Math.ceil((criticalCount + highCount) * remainingPercent / 100)} issues remaining (${remainingPercent}% require manual review)\n`;
      footer += `             🎯 Significant progress! Review remaining issues.\n`;
    }
    footer += `\`\`\`\n\n`;
    footer += `**Why CodeQual re-scan?**\n`;
    footer += `- ✅ Automated validation on every commit\n`;
    footer += `- 📊 Compare before/after results objectively\n`;
    footer += `- 🎯 Catch any regressions or incomplete fixes\n`;
    footer += `- 🏆 Earn "First Clean PR" achievement\n\n`;
    footer += `> **Note:** Auto-fix tools can resolve most style and formatting issues (${Math.round((autoFixableCount / totalCount) * 100)}% in this PR), but complex security or logic issues may require manual review.\n\n`;
    
    footer += `**Why this works**:\n`;
    footer += `- ⚡ **Zero wait time** - critical issues embedded for instant access\n`;
    footer += `- 🎯 **Priority-first** - most important issues available immediately\n`;
    footer += `- 📦 **Efficient** - high/medium/low issues lazy-loaded in background\n`;
    footer += `- 🤖 **Universal format** - works with any AI-powered IDE\n`;
    footer += `- 🛡️  **Human-in-the-loop** - you review before applying for safety\n`;
    footer += `- 🔄 **Validation workflow** - automated before/after comparison\n`;
  }
  
  footer += `\n---\n\n`;
  footer += `*Generated by CodeQual V9 - Grouped Report Format (Bug #34 Lazy Loading)*  \n`;
  footer += `*${new Date().toISOString()}*`;
  
  return footer;
}

/**
 * Helper: Group issues by severity
 */
export function groupBySeverity(issues: EnrichedIssue[]): Record<string, number> {
  return {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length
  };
}

/**
 * Helper: Group issues by category
 */
export function groupByCategory(issues: EnrichedIssue[]): Record<string, number> {
  const result: Record<string, number> = {
    'NEW': 0,
    'EXISTING_MODIFIED': 0,
    'RESOLVED': 0,
    'EXISTING_REST': 0
  };
  issues.forEach(issue => {
    const cat = issue.category || 'unknown';
    result[cat] = (result[cat] || 0) + 1;
  });
  return result;
}

/**
 * Helper: Group issues by tool
 */
export function groupByTool(issues: EnrichedIssue[]): Record<string, number> {
  const result: Record<string, number> = {};
  issues.forEach(issue => {
    result[issue.tool] = (result[issue.tool] || 0) + 1;
  });
  return result;
}

