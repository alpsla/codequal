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
 *
 * SESSION 53 REFACTOR: Language-neutral approach
 * CodeQual generates AI fixes for ALL issues, so most are auto-fixable.
 * We only exclude specific patterns that require manual intervention.
 */
function canAutoFix(group: IssueGroup | { rule: string; tool: string; severity: string }): boolean {
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
  // USER FEEDBACK (2025-12-14): Filter out tools that didn't actually run (0 issues AND 0 duration)
  // FIX (2025-12-15): Only show tools that found issues - filter out 0-issue tools entirely
  if (showToolPerformance && metadata.toolPerformance && Array.isArray(metadata.toolPerformance) && metadata.toolPerformance.length > 0) {
    // Filter out tools that didn't find issues OR didn't run
    const skippedTools = ['performance']; // Tools we skip in first iteration
    const actuallyRanTools = metadata.toolPerformance.filter((tool: any) => {
      const issues = tool.issuesFound || tool.issues || tool.issueCount || 0;
      const duration = tool.duration || 0;
      const toolName = (tool.tool || tool.name || '').toLowerCase();

      // Skip tools that are in the skipped list
      if (skippedTools.includes(toolName)) {
        return false;
      }

      // Only include tools that found issues AND actually ran
      return issues > 0 && duration > 0;
    });

    if (actuallyRanTools.length > 0) {
      content += `\n### Tool Performance
| Tool | Issues Found | Duration |
|------|--------------|----------|
`;
      actuallyRanTools.forEach((tool: any) => {
        const duration = tool.duration ? (tool.duration / 1000).toFixed(1) + 's' : 'N/A';
        const issues = tool.issuesFound || tool.issues || tool.issueCount || 0;
        content += `| ${tool.tool || tool.name} | ${issues} | ${duration} |\n`;
      });
    }
  }

  // USER FEEDBACK (2025-12-14): Removed Cost & Efficiency Analysis and Agent Efficiency Ranking
  // Since we removed agents from 1st iteration of scan and fully rely on tools,
  // these sections are no longer relevant

  // Add simple cost summary if available
  if (showEfficiencyAnalysis && metadata.agentPerformance && Array.isArray(metadata.agentPerformance) && metadata.agentPerformance.length > 0) {
    const totalCost = metadata.agentPerformance.reduce((sum: number, agent: any) => sum + (agent.cost || 0), 0);
    const totalTime = metadata.agentPerformance.reduce((sum: number, agent: any) => sum + (agent.duration || 0), 0);

    content += `\n### Cost Analysis
- **Total Analysis Cost:** $${totalCost.toFixed(4)}${totalCost === 0 ? ' (tool-based analysis)' : ''}
- **Active Tool Runtime:** ${totalTime > 0 ? (totalTime / 1000).toFixed(1) + 's' : 'N/A'} (Billing Metric)
`;
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
\`\`\``;
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
    // BUG-097 FIX: Updated to use BASIC/PRO terminology consistent with Two-Tier Fix System
    footer += `### 🔄 How CodeQual Fixes Work (Two-Tier System)\n\n`;
    footer += `**Two Fix Tiers for Maximum Coverage**:\n\n`;

    footer += `**📚 BASIC Tier (Pattern Library) - FREE**\n`;
    footer += `- Covers 50-60% of common issues with validated patterns\n`;
    footer += `- Speed: Instant (< 1ms per fix)\n`;
    footer += `- Cost: FREE - included in all plans\n`;
    footer += `- Languages: Java, TypeScript, Python, Go, Ruby\n`;
    footer += `- Patterns from: Checkstyle, PMD, ESLint, Ruff, Pylint, RuboCop\n\n`;

    footer += `**🤖 PRO Tier (AI-Generated) - PREMIUM**\n`;
    footer += `- Covers 100% of issues with AI-generated code\n`;
    footer += `- Speed: 2-5 seconds per fix (real-time generation)\n`;
    footer += `- Cost: Usage-based (AI API calls)\n`;
    footer += `- Contextual: Adapts to your code style and patterns\n`;
    footer += `- Smart: Handles complex refactoring, security fixes\n\n`;

    footer += `**How Application Works (IDE Integration)**:\n`;
    footer += `\`\`\`\n`;
    footer += `When you click "Apply Fix" in your IDE:\n\n`;
    footer += `1. Code unchanged since analysis?\n`;
    footer += `   → Apply pre-generated fix instantly (BASIC or PRO)\n\n`;
    footer += `2. Code changed after analysis?\n`;
    footer += `   → IDE AI adapts the fix to your changes\n`;
    footer += `   → Ensures fix still applies correctly\n`;
    footer += `\`\`\`\n\n`;

    footer += `**Why Trust Batch Apply?**\n`;
    footer += `✅ All fixes tested against your actual code\n`;
    footer += `✅ Only safe, non-breaking changes included\n`;
    footer += `✅ IDE AI fallback handles code changes automatically\n`;
    footer += `✅ Can undo with Cmd+Z if needed\n\n`;

    footer += `> 💡 **Tip**: BASIC tier fixes are instant and free. PRO tier adds AI coverage for 100% of issues.\n\n`;
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

    // SESSION 53 FIX: Show GitLab/Code Climate format for ALL repos when file exists
    // Code Climate format is a standard supported by many CI tools, not just GitLab
    // The file is always generated and uploaded, so show it to all users
    if (metadata?.gitlabUrl) {
      // Detect if this is a GitLab repo for customized messaging
      const repoUrl = metadata?.repositoryUrl || metadata?.repository || '';
      let isGitLabRepo = false;
      try {
        const parsedUrl = new URL(repoUrl);
        isGitLabRepo = parsedUrl.hostname === 'gitlab.com' || parsedUrl.hostname.endsWith('.gitlab.com');
      } catch {
        isGitLabRepo = false;
      }

      footer += `---\n\n`;
      footer += `### 🦊 Method 3: Code Climate / GitLab Code Quality\n\n`;
      footer += `**Download**: \`codequal-gitlab-codequality.json\`\n`;
      footer += `- URL: [Download Code Climate file](${metadata.gitlabUrl})\n`;
      footer += `- Works with: GitLab CI/CD, GitHub Actions (via Code Climate), Jenkins, CircleCI\n`;
      footer += `- Format: Code Climate (industry standard)\n\n`;

      if (isGitLabRepo) {
        // GitLab-specific instructions
        footer += `**GitLab CI/CD Integration** (Native Support):\n\n`;
        footer += `\`\`\`yaml\n`;
        footer += `# .gitlab-ci.yml\n`;
        footer += `codequal_analysis:\n`;
        footer += `  stage: test\n`;
        footer += `  script:\n`;
        footer += `    - codequal analyze --output codequal-gitlab-codequality.json\n`;
        footer += `  artifacts:\n`;
        footer += `    reports:\n`;
        footer += `      codequality: codequal-gitlab-codequality.json\n`;
        footer += `\`\`\`\n\n`;
      } else {
        // GitHub/other CI instructions
        footer += `**GitHub Actions Integration** (via Code Climate):\n\n`;
        footer += `\`\`\`yaml\n`;
        footer += `# .github/workflows/code-quality.yml\n`;
        footer += `- name: Upload Code Quality Report\n`;
        footer += `  uses: actions/upload-artifact@v4\n`;
        footer += `  with:\n`;
        footer += `    name: code-quality-report\n`;
        footer += `    path: codequal-gitlab-codequality.json\n`;
        footer += `\`\`\`\n\n`;
      }

      footer += `**What you get**:\n`;
      footer += `- 📊 Code Quality metrics in CI/CD pipeline\n`;
      footer += `- 📈 Quality degradation/improvement tracking\n`;
      footer += `- 🚫 Optional quality gates (block merge on critical issues)\n`;
      footer += `- 📋 Standardized issue format for any CI tool\n\n`;

      footer += `**Features**:\n`;
      footer += `- All ${totalFixable.toLocaleString()} issues in Code Climate format\n`;
      footer += `- Severity mapping: Critical→Blocker, High→Critical, Medium→Major, Low→Minor\n`;
      footer += `- File paths, line numbers, and fix suggestions included\n`;
      footer += `- Automatic issue tracking across commits (fingerprints)\n\n`;

      footer += `> 🎯 **Perfect for**: CI/CD automation, quality gates, multi-platform teams\n\n`;
    }

    // NOTE: PR Comment Template is generated in the main formatter (v9-grouped-report-formatter.ts line 1035)
    // Do NOT add it here to avoid duplicate sections in the report
    // Previously had BUG FIX #20 here which caused duplicate PR Comment Template sections

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

