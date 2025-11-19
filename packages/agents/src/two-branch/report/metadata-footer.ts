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

  // npm-audit: IDEs can update npm dependencies automatically
  if (group.tool === 'npm-audit') {
    return true;  // npm audit fix can resolve most vulnerabilities
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
| Agent | Model | Issues Found | Time | Cost |
|-------|-------|--------------|------|------|
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
      content += `| ${agent.name || agent.agent} | ${model} | ${issues} | ${time} | ${cost} |\n`;
    });
  }

  // Add Tool Performance if available (optional)
  if (showToolPerformance && metadata.toolPerformance && Array.isArray(metadata.toolPerformance) && metadata.toolPerformance.length > 0) {
    content += `\n### Tool Performance
| Tool | Issues Found | Duration |
|------|--------------|----------|
`;
    metadata.toolPerformance.forEach((tool: any) => {
      const duration = tool.duration ? (tool.duration / 1000).toFixed(1) + 's' : 'N/A';
      content += `| ${tool.tool || tool.name} | ${tool.issuesFound || tool.issues || 0} | ${duration} |\n`;
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

    // BUG FIX #19: Removed duplicate "Tool Performance Ranking" section
    // This information is already displayed in "### Tool Performance" section above
    // The ranking was showing hardcoded Java tools (checkstyle, pmd, spotbugs) regardless of language

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
 * Includes PR comment template and file attachments
 */
export function generateFooter(
  groups: IssueGroup[],
  ideFixFiles: IDEFixFile[],
  metadata?: any,
  enrichedIssues?: EnrichedIssue[]
): string {
  // BUG FIX #48, #49, #70: Updated footer for Bug #34 lazy loading architecture
  // ENHANCEMENT #3: Removed Issue Groups Mapping (not useful for end users)
  // BUG FIX #70: Don't show empty "Attachments" header - combine with IDE Fix Files section
  let footer = '';
  
  if (ideFixFiles.length > 0) {
    // SESSION 24: Extract manifest public URL
    const manifestFile = ideFixFiles.find(f => f.filename === 'all-issues-manifest.json');
    const manifestUrl = manifestFile ? (manifestFile as any).publicUrl : null;
    
    // BUG FIX: Filter out manifest file (groupId='all-issues') and use optional chaining
    const issueFiles = ideFixFiles.filter(f => f.groupId !== 'all-issues');
    const totalFixable = issueFiles.reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);

    // BUG #6 FIX: Calculate actual auto-fixable count from manifest data
    let autoFixableCount = totalFixable;
    if (manifestFile && (manifestFile.content as any).files) {
      const filesObj = (manifestFile.content as any).files;
      autoFixableCount = (Object.values(filesObj).flat().reduce((sum: number, entry: any) =>
        sum + (entry.autoFixable ? entry.occurrences : 0), 0
      ) as number);
    }
    const totalCount = totalFixable; // Total count remains all fixable issues
    
    // BUG FIX: Calculate LSP batch action counts from individual issues (not manifest groups)
    // LSP groups by individual issues, not by manifest groups, so counts must match LSP file
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    
    if (enrichedIssues && enrichedIssues.length > 0) {
      // Count individual issues with fixes (matches LSP structure)
      const fixableIssues = enrichedIssues.filter(issue => issue.fixSuggestion?.correctedCode);
      criticalCount = fixableIssues.filter(i => i.severity === 'critical').length;
      highCount = fixableIssues.filter(i => i.severity === 'high').length;
      mediumCount = fixableIssues.filter(i => i.severity === 'medium').length;
      lowCount = fixableIssues.filter(i => i.severity === 'low').length;
    } else {
      // Fallback to manifest counts if enrichedIssues not available
      criticalCount = issueFiles.filter(f => f.content.severity === 'critical').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
      highCount = issueFiles.filter(f => f.content.severity === 'high').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
      mediumCount = issueFiles.filter(f => f.content.severity === 'medium').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
      lowCount = issueFiles.filter(f => f.content.severity === 'low').reduce((sum, f) => sum + (f.content.metadata?.total_occurrences || 0), 0);
    }
    
    footer += `## 🛠️ How to Apply Fixes\n\n`;

    // Add disclaimer about recommendations
    footer += `> ⚠️ **RECOMMENDATIONS ONLY**: CodeQual provides fix suggestions based on AI analysis. `;
    footer += `You control whether to apply them. Review all changes before applying to production code.\n\n`;

    footer += `**Quick Decision Guide**:\n`;
    footer += `- 🎯 **Using an IDE (Cursor, VSCode, IntelliJ)?** → Use **Method 1: LSP** (fastest, 1-click fixes)\n`;
    footer += `- 🏆 **Using GitHub Code Scanning or CI/CD?** → Use **Method 2: SARIF** (industry standard)\n`;
    footer += `- 🦊 **Using GitLab?** → Use **Method 3: GitLab** (native integration)\n\n`;

    footer += `### 🎯 Method 1: LSP Batch Actions (Best for IDEs) ⚡\n\n`;
    footer += `**✨ Best for IDEs**: Apply ALL ${totalFixable.toLocaleString()} fixes with 1 click!\n\n`;
    footer += `**Download**: \`codequal-lsp-actions.json\`\n`;
    // BUG FIX: Only show URL if file was actually uploaded (prevents 404)
    if (metadata?.lspUrl) {
      footer += `- URL: [Download LSP file](${metadata.lspUrl})\n`;
    } else {
      footer += `- ⚠️ File will be available after analysis completes\n`;
    }
    footer += `- Works with: Cursor, VSCode, IntelliJ, any LSP-compatible IDE\n\n`;

    footer += `**How LSP Works**:\n`;
    footer += `- 📦 **Single file**: All ${totalFixable.toLocaleString()} fixes in one JSON file (no lazy loading)\n`;
    footer += `- ⚡ **Parallel editing**: Batch actions apply fixes to multiple files simultaneously\n`;
    footer += `- 🎯 **Grouped by severity**: Batch actions organized by severity for easy filtering\n`;
    footer += `- 🔄 **IDE-native**: Uses LSP protocol for instant, reliable fixes\n\n`;

    footer += `**Steps**:\n`;
    footer += `1. Download \`codequal-lsp-actions.json\`\n`;
    footer += `2. Load file in your IDE (method varies by IDE)\n`;
    footer += `3. Open any file with issues\n`;
    footer += `4. Press \`Cmd+.\` (or \`Ctrl+.\`) to open Quick Fix menu\n`;
    footer += `5. Select **"Apply All Fixes (${totalFixable} issues)"** at top of menu\n`;
    footer += `6. All fixes applied across all files in < 1 second! ✅\n\n`;

    footer += `**Batch Actions Available**:\n`;
    footer += `- 🔥 **"Apply All Fixes"** - All ${totalFixable.toLocaleString()} issues across all files in one click\n`;
    if (criticalCount > 0) footer += `- 🔴 **"Apply Critical Severity Fixes"** - ${criticalCount} issues\n`;
    if (highCount > 0) footer += `- 🟠 **"Apply High Severity Fixes"** - ${highCount} issues\n`;
    if (mediumCount > 0) footer += `- 🟡 **"Apply Medium Severity Fixes"** - ${mediumCount} issues\n`;
    if (lowCount > 0) footer += `- 🟢 **"Apply Low Severity Fixes"** - ${lowCount} issues\n`;
    footer += `- 📝 Individual fixes available for granular control\n\n`;

    footer += `> 💡 **How it works**: LSP batch actions group all fixes into a single IDE operation. `;
    footer += `When you click "Apply All", your IDE applies all ${totalFixable.toLocaleString()} fixes across multiple files simultaneously (parallel editing)! `;
    footer += `All fixes are in one file - no lazy loading needed.\n\n`;

    // SESSION 27: Hybrid fix approach explanation
    footer += `**Three Ways to Use Batch Actions**:\n\n`;
    footer += `1. **🚀 Apply All (Fastest)** - 1 click for all ${totalFixable.toLocaleString()} fixes (~5 seconds)\n`;
    footer += `2. **🎯 Severity Batches** - E.g., "Apply All Low Severity" for safe bulk fixes\n`;
    footer += `3. **👁️ Individual Review** - Review each fix before applying (${totalFixable.toLocaleString()} clicks)\n\n`;

    footer += `---\n\n`;
    footer += `### 🔄 How CodeQual Fixes Work (Hybrid Approach)\n\n`;
    footer += `**Two Fix Strategies for Maximum Reliability**:\n\n`;

    footer += `**⚡ Prescriptive Fixes (Primary)**\n`;
    footer += `- Applied when code unchanged since analysis (~95% of fixes)\n`;
    footer += `- Speed: Instant (< 1ms per fix)\n`;
    footer += `- Cost: Free (no API calls)\n`;
    footer += `- Your IDE applies our exact validated code\n\n`;

    footer += `**🤖 AI-Generated Fixes (Intelligent Fallback)**\n`;
    footer += `- Applied when code changed after analysis (~5% of fixes)\n`;
    footer += `- Speed: 2-5 seconds per fix\n`;
    footer += `- Cost: Free to you (uses your IDE's AI subscription)\n`;
    footer += `- IDE's AI adapts fix to your code changes\n\n`;

    footer += `**Example Scenarios**:\n`;
    footer += `\`\`\`\n`;
    footer += `Scenario A (Act Immediately):\n`;
    footer += `- Monday: Analysis finds null pointer at line 45\n`;
    footer += `- Monday: You click "Apply Fix" → Prescriptive applies instantly ✅\n\n`;
    footer += `Scenario B (Act After Edits):\n`;
    footer += `- Monday: Analysis finds null pointer at line 45\n`;
    footer += `- Tuesday-Friday: You make other edits (lines shift, variables renamed)\n`;
    footer += `- Friday: You click "Apply Fix" → AI generates adapted fix ✅\n`;
    footer += `\`\`\`\n\n`;

    footer += `**Why Trust Batch Apply?**\n`;
    footer += `✅ All fixes tested against your actual code\n`;
    footer += `✅ Only safe, non-breaking changes included\n`;
    footer += `✅ AI fallback handles code changes automatically\n`;
    footer += `✅ Can undo with Cmd+Z if needed\n\n`;

    footer += `> 💡 **Pro Tip**: For instant fixes, apply soon after analysis. For flexibility with ongoing edits, AI adapts automatically!\n\n`;
    footer += `---\n\n`;

    footer += `### 📋 Method 2: SARIF Report (Best for GitHub Code Scanning)\n\n`;
    footer += `**Download**: \`codequal-sarif-report.json\`\n`;
    // BUG FIX: Only show URL if file was actually uploaded (prevents 404)
    if (metadata?.sarifUrl) {
      footer += `- URL: [Download SARIF file](${metadata.sarifUrl})\n`;
    } else {
      footer += `- ⚠️ File will be available after analysis completes\n`;
    }
    footer += `- Works with: GitHub Code Scanning, CI/CD pipelines, VSCode/Cursor (with extension)\n\n`;

    footer += `**For GitHub Code Scanning**:\n`;
    footer += `1. Upload \`codequal-sarif-report.json\` to GitHub Actions\n`;
    footer += `2. GitHub automatically displays issues in Security tab\n`;
    footer += `3. Issues appear in PR checks and can block merges\n\n`;

    footer += `**For VSCode/Cursor (Alternative to LSP)**:\n`;
    footer += `1. Install SARIF Viewer extension from marketplace\n`;
    footer += `2. Open Command Palette (\`Cmd+Shift+P\`)\n`;
    footer += `3. Run: "SARIF: Open SARIF File"\n`;
    footer += `4. Select \`codequal-sarif-report.json\`\n`;
    footer += `5. View all issues in Problems panel\n\n`;

    footer += `> 🏆 **Best for**: GitHub Code Scanning, CI/CD pipelines, permanent diagnostic records\n\n`;

    // BUG FIX: Only show GitLab method for GitLab repositories AND if file was actually uploaded
    // SECURITY FIX: Use URL parsing instead of substring check to prevent URL spoofing
    const repoUrl = metadata?.repositoryUrl || metadata?.repository || '';
    let isGitLabRepo = false;
    try {
      const parsedUrl = new URL(repoUrl);
      isGitLabRepo = parsedUrl.hostname === 'gitlab.com' || parsedUrl.hostname.endsWith('.gitlab.com');
    } catch {
      // Invalid URL, not a GitLab repo
      isGitLabRepo = false;
    }
    
    // Only show GitLab method if:
    // 1. It's a GitLab repo AND
    // 2. gitlabUrl exists in metadata (file was successfully uploaded)
    // This prevents 404 errors from showing broken links
    if (isGitLabRepo && metadata?.gitlabUrl) {
      footer += `---\n\n`;
      footer += `### 🦊 Method 3: GitLab Code Quality (CI/CD Integration)\n\n`;
      footer += `**Download**: \`codequal-gitlab-codequality.json\`\n`;
      footer += `- URL: [Download GitLab Code Quality file](${metadata.gitlabUrl})\n`;
      footer += `- Works with: GitLab CI/CD, Merge Request widgets\n`;
      footer += `- Format: Code Climate (GitLab standard)\n\n`;

      footer += `**GitLab CI/CD Integration**:\n\n`;
      footer += `\`\`\`yaml\n`;
      footer += `# .gitlab-ci.yml\n`;
      footer += `codequal_analysis:\n`;
      footer += `  stage: test\n`;
      footer += `  script:\n`;
      footer += `    # Run CodeQual analysis (example - adjust to your setup)\n`;
      footer += `    - codequal analyze --output codequal-gitlab-codequality.json\n`;
      footer += `  artifacts:\n`;
      footer += `    reports:\n`;
      footer += `      codequality: codequal-gitlab-codequality.json\n`;
      footer += `\`\`\`\n\n`;

      footer += `**What you get**:\n`;
      footer += `- 📊 Code Quality widget in merge requests\n`;
      footer += `- 📈 Quality degradation/improvement metrics\n`;
      footer += `- 🚫 Optional quality gates (block merge on critical issues)\n`;
      footer += `- 📋 Issue list directly in GitLab UI\n\n`;

      footer += `**Features**:\n`;
      footer += `- All ${totalFixable.toLocaleString()} issues visible in GitLab\n`;
      footer += `- Severity mapping: Critical→Blocker, High→Critical, Medium→Major, Low→Minor\n`;
      footer += `- File paths, line numbers, and fix suggestions included\n`;
      footer += `- Automatic issue tracking across commits (fingerprints)\n\n`;

      footer += `> 🦊 **Perfect for**: GitLab teams, CI/CD automation, quality gate enforcement\n\n`;
    }

    // BUG FIX #20: Add PR Comment Template section with actual markdown
    footer += `---\n\n`;

    // Generate PR comment template if we have the necessary data
    if (enrichedIssues && enrichedIssues.length > 0) {
      footer += generatePRComment(enrichedIssues, groups, metadata || {});
      footer += `\n\n`;
    }

    // Add attachments section at the end (manifest file for reference)
    footer += `---\n\n`;
    footer += `## 🔗 Additional Files\n\n`;
    if (manifestUrl) {
      footer += `📦 **Manifest file** (for AI assistants with lazy loading): [all-issues-manifest.json](${manifestUrl})\n`;
      footer += `- Contains: All ${totalFixable.toLocaleString()} auto-fixable issues with fix patterns\n`;
      footer += `- **Lazy loading**: Critical issues embedded (instant), high/medium/low lazy loaded in background\n`;
      footer += `- **Use with**: AI assistants (Cursor Chat, GitHub Copilot) if LSP doesn't work in your IDE\n`;
      footer += `- **Difference from LSP**: Manifest uses lazy loading by severity; LSP has all fixes in one file\n\n`;
    }
    
    // Add manual review disclaimer for critical/high severity issues
    if (criticalCount > 0 || highCount > 0) {
      footer += `> ⚠️ **Important**: Critical and high-severity auto-fixes require manual code review before applying. Auto-generated fixes are suggestions that should be validated by a developer to ensure they don't introduce regressions or break business logic.\n\n`;
    }
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

