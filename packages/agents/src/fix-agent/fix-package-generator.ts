/* eslint-disable no-useless-escape */
/**
 * Fix Package Generator
 *
 * Generates downloadable fix packages formatted for different AI tools:
 * - Cursor (Claude Sonnet)
 * - GitHub Copilot (GPT-4)
 * - Claude Desktop
 * - Generic (ChatGPT, etc.)
 *
 * This is the core of the $5 "Analyze" tier - users download this
 * and use their own AI subscription to apply fixes.
 *
 * @module fix-agent/fix-package-generator
 */

import * as fs from 'fs';
import * as path from 'path';
import { FixRequest } from './universal-fix-executor';

// ============================================================================
// Types
// ============================================================================

export interface FixPackageConfig {
  outputDir: string;
  repository: string;
  prNumber?: number;
  branch?: string;
  includeRawData?: boolean;
}

export interface FixPackageResult {
  outputDir: string;
  files: string[];
  totalIssues: number;
  bySeverity: Record<string, number>;
}

// ============================================================================
// Fix Package Generator
// ============================================================================

export class FixPackageGenerator {
  private config: FixPackageConfig;

  constructor(config: FixPackageConfig) {
    this.config = {
      includeRawData: true,
      ...config
    };
  }

  /**
   * Generate complete fix package for all AI tools
   */
  async generate(issues: FixRequest[]): Promise<FixPackageResult> {
    const { outputDir } = this.config;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const files: string[] = [];

    // 1. Generate README
    const readme = this.generateReadme(issues);
    fs.writeFileSync(path.join(outputDir, 'README.md'), readme);
    files.push('README.md');

    // 2. Generate severity-grouped guide
    const severityGuide = this.generateSeverityGuide(issues);
    fs.writeFileSync(path.join(outputDir, 'FIXES-BY-SEVERITY.md'), severityGuide);
    files.push('FIXES-BY-SEVERITY.md');

    // 3. Generate Cursor prompts
    const cursorFiles = await this.generateCursorPrompts(issues);
    files.push(...cursorFiles);

    // 4. Generate Copilot prompts
    const copilotFiles = await this.generateCopilotPrompts(issues);
    files.push(...copilotFiles);

    // 5. Generate generic prompts (Claude Desktop, ChatGPT)
    const genericFiles = await this.generateGenericPrompts(issues);
    files.push(...genericFiles);

    // 6. Generate raw data files (optional)
    if (this.config.includeRawData) {
      const dataFiles = await this.generateDataFiles(issues);
      files.push(...dataFiles);
    }

    // Calculate summary
    const bySeverity = this.countBySeverity(issues);

    return {
      outputDir,
      files,
      totalIssues: issues.length,
      bySeverity
    };
  }

  // ==========================================================================
  // README Generator
  // ==========================================================================

  private generateReadme(issues: FixRequest[]): string {
    const bySeverity = this.countBySeverity(issues);
    const byFile = this.groupByFile(issues);

    return `# CodeQual Fix Package

**Repository:** ${this.config.repository}
${this.config.prNumber ? `**PR:** #${this.config.prNumber}` : ''}
${this.config.branch ? `**Branch:** ${this.config.branch}` : ''}
**Generated:** ${new Date().toISOString()}

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${bySeverity.critical} |
| 🟠 High | ${bySeverity.high} |
| 🟡 Medium | ${bySeverity.medium} |
| 🟢 Low | ${bySeverity.low} |
| **Total** | **${issues.length}** |

**Files affected:** ${Object.keys(byFile).length}

---

## Quick Start

### Using Cursor

1. Open your project in Cursor
2. Open \`cursor/fix-all-high.md\`
3. Copy the entire content
4. Press \`Cmd+K\` (or \`Ctrl+K\`) to open Cursor AI
5. Paste and press Enter
6. Review and accept the changes

For file-by-file fixes, see \`cursor/by-file/\`

### Using GitHub Copilot

1. Open your project in VS Code with Copilot
2. Open \`copilot/fix-all-high.md\`
3. Copy the content
4. Open Copilot Chat (\`Cmd+Shift+I\`)
5. Paste and send
6. Apply suggested changes

### Using Claude Desktop / ChatGPT

1. Open \`generic/fix-all-high.md\`
2. Copy the content
3. Paste into Claude or ChatGPT
4. Copy the fixed code back to your files

### Using CLI (Power Users)

\`\`\`bash
# Set your API key
export OPENROUTER_API_KEY=your-key

# Fix high severity issues
npx codequal-fix --input data/issues.json --severity high

# Preview without applying
npx codequal-fix --input data/issues.json --all --dry-run
\`\`\`

---

## Package Contents

\`\`\`
├── README.md                 # This file
├── FIXES-BY-SEVERITY.md      # All issues grouped by severity
│
├── cursor/                   # Prompts for Cursor AI
│   ├── fix-all-high.md       # Fix all high severity
│   ├── fix-all-medium.md     # Fix all medium severity
│   └── by-file/              # Per-file prompts
│
├── copilot/                  # Prompts for GitHub Copilot
│   ├── fix-all-high.md
│   └── by-file/
│
├── generic/                  # For Claude Desktop, ChatGPT
│   ├── fix-all-high.md
│   └── by-file/
│
└── data/                     # Raw data for CLI/automation
    ├── issues.json
    ├── lsp-actions.json
    └── sarif-report.json
\`\`\`

---

## Why These Fixes Matter

CodeQual doesn't just find issues - we explain **why** they matter:

- 🔒 **Security issues** can lead to data breaches and exploits
- ⚡ **Performance issues** slow down your application
- 🏗️ **Architecture issues** increase technical debt
- 📦 **Dependency issues** expose known vulnerabilities

Each fix prompt includes context to help you understand the problem.

---

*Generated by [CodeQual](https://codequal.dev) - The Auto-Fix Tool You Can Trust*
`;
  }

  // ==========================================================================
  // Cursor Prompt Generator
  // ==========================================================================

  private async generateCursorPrompts(issues: FixRequest[]): Promise<string[]> {
    const cursorDir = path.join(this.config.outputDir, 'cursor');
    const byFileDir = path.join(cursorDir, 'by-file');

    fs.mkdirSync(byFileDir, { recursive: true });

    const files: string[] = [];

    // Generate batch prompts by severity
    const highIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    if (highIssues.length > 0) {
      const prompt = this.generateCursorBatchPrompt(highIssues, 'Critical & High');
      fs.writeFileSync(path.join(cursorDir, 'fix-all-high.md'), prompt);
      files.push('cursor/fix-all-high.md');
    }

    const mediumIssues = issues.filter(i => i.severity === 'medium');
    if (mediumIssues.length > 0) {
      const prompt = this.generateCursorBatchPrompt(mediumIssues, 'Medium');
      fs.writeFileSync(path.join(cursorDir, 'fix-all-medium.md'), prompt);
      files.push('cursor/fix-all-medium.md');
    }

    const lowIssues = issues.filter(i => i.severity === 'low');
    if (lowIssues.length > 0) {
      const prompt = this.generateCursorBatchPrompt(lowIssues, 'Low');
      fs.writeFileSync(path.join(cursorDir, 'fix-all-low.md'), prompt);
      files.push('cursor/fix-all-low.md');
    }

    // Generate per-file prompts
    const byFile = this.groupByFile(issues);
    for (const [file, fileIssues] of Object.entries(byFile)) {
      const safeFileName = this.sanitizeFileName(file);
      const prompt = this.generateCursorFilePrompt(file, fileIssues);
      fs.writeFileSync(path.join(byFileDir, `${safeFileName}.md`), prompt);
      files.push(`cursor/by-file/${safeFileName}.md`);
    }

    return files;
  }

  private generateCursorBatchPrompt(issues: FixRequest[], severityLabel: string): string {
    const byFile = this.groupByFile(issues);
    const fileCount = Object.keys(byFile).length;

    let prompt = `# Cursor: Fix ${severityLabel} Severity Issues

> **Instructions:** Copy this entire prompt, press \`Cmd+K\`, paste, and let Cursor fix all issues.

---

## Task

Fix **${issues.length} ${severityLabel.toLowerCase()} severity issues** across **${fileCount} files**.

## Issues to Fix

`;

    for (const [file, fileIssues] of Object.entries(byFile)) {
      prompt += `### ${file}\n\n`;
      for (const issue of fileIssues) {
        prompt += `- **Line ${issue.line}:** ${issue.message}\n`;
        if (issue.fixSuggestion?.fix) {
          prompt += `  - *Fix:* ${issue.fixSuggestion.fix}\n`;
        }
      }
      prompt += '\n';
    }

    prompt += `## Instructions for Cursor

1. Fix ALL issues listed above
2. Maintain existing code style
3. Don't add comments explaining fixes
4. Preserve all functionality
5. Show me the changes before applying

## Context

These issues were detected by CodeQual's security and quality analysis.
Fixing them will improve code security, performance, and maintainability.
`;

    return prompt;
  }

  private generateCursorFilePrompt(file: string, issues: FixRequest[]): string {
    const language = this.detectLanguage(file);

    let prompt = `# Cursor: Fix Issues in ${file}

> **Instructions:** Open \`${file}\`, press \`Cmd+K\`, paste this prompt.

---

## Task

Fix **${issues.length} issues** in this ${language} file.

## Issues

`;

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      prompt += `### ${i + 1}. Line ${issue.line}: ${issue.rule}

**Problem:** ${issue.message}

**Severity:** ${this.getSeverityEmoji(issue.severity)} ${issue.severity.toUpperCase()}

`;
      if (issue.fixSuggestion?.fix) {
        prompt += `**Recommended Fix:** ${issue.fixSuggestion.fix}\n\n`;
      }
      if (issue.fixSuggestion?.bestPractices?.length) {
        prompt += `**Best Practices:**\n${issue.fixSuggestion.bestPractices.map(bp => `- ${bp}`).join('\n')}\n\n`;
      }
    }

    prompt += `---

## Instructions

1. Fix all ${issues.length} issues
2. Keep the code style consistent
3. Don't add explanatory comments
4. Show changes before applying
`;

    return prompt;
  }

  // ==========================================================================
  // Copilot Prompt Generator
  // ==========================================================================

  private async generateCopilotPrompts(issues: FixRequest[]): Promise<string[]> {
    const copilotDir = path.join(this.config.outputDir, 'copilot');
    const byFileDir = path.join(copilotDir, 'by-file');

    fs.mkdirSync(byFileDir, { recursive: true });

    const files: string[] = [];

    // Copilot works best with shorter, focused prompts
    const highIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    if (highIssues.length > 0) {
      const prompt = this.generateCopilotBatchPrompt(highIssues, 'high');
      fs.writeFileSync(path.join(copilotDir, 'fix-all-high.md'), prompt);
      files.push('copilot/fix-all-high.md');
    }

    const mediumIssues = issues.filter(i => i.severity === 'medium');
    if (mediumIssues.length > 0) {
      const prompt = this.generateCopilotBatchPrompt(mediumIssues, 'medium');
      fs.writeFileSync(path.join(copilotDir, 'fix-all-medium.md'), prompt);
      files.push('copilot/fix-all-medium.md');
    }

    // Per-file prompts
    const byFile = this.groupByFile(issues);
    for (const [file, fileIssues] of Object.entries(byFile)) {
      const safeFileName = this.sanitizeFileName(file);
      const prompt = this.generateCopilotFilePrompt(file, fileIssues);
      fs.writeFileSync(path.join(byFileDir, `${safeFileName}.md`), prompt);
      files.push(`copilot/by-file/${safeFileName}.md`);
    }

    return files;
  }

  private generateCopilotBatchPrompt(issues: FixRequest[], severity: string): string {
    const byFile = this.groupByFile(issues);

    let prompt = `# GitHub Copilot: Fix ${severity.toUpperCase()} Severity Issues

Open Copilot Chat (Cmd+Shift+I) and paste this prompt.

---

@workspace Fix these ${issues.length} code quality issues:

`;

    for (const [file, fileIssues] of Object.entries(byFile)) {
      prompt += `## ${file}\n`;
      for (const issue of fileIssues) {
        prompt += `- Line ${issue.line}: ${issue.message}\n`;
      }
      prompt += '\n';
    }

    prompt += `
Fix all issues while maintaining code style. Don't add comments.
`;

    return prompt;
  }

  private generateCopilotFilePrompt(file: string, issues: FixRequest[]): string {
    let prompt = `# Copilot: Fix ${file}

Open the file, then open Copilot Chat and paste:

---

@workspace /fix Fix these issues in the current file:

`;

    for (const issue of issues) {
      prompt += `- Line ${issue.line}: ${issue.message}\n`;
    }

    return prompt;
  }

  // ==========================================================================
  // Generic Prompt Generator (Claude Desktop, ChatGPT)
  // ==========================================================================

  private async generateGenericPrompts(issues: FixRequest[]): Promise<string[]> {
    const genericDir = path.join(this.config.outputDir, 'generic');
    const byFileDir = path.join(genericDir, 'by-file');

    fs.mkdirSync(byFileDir, { recursive: true });

    const files: string[] = [];

    // Batch prompt for high severity
    const highIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    if (highIssues.length > 0) {
      const prompt = this.generateGenericBatchPrompt(highIssues, 'Critical & High');
      fs.writeFileSync(path.join(genericDir, 'fix-all-high.md'), prompt);
      files.push('generic/fix-all-high.md');
    }

    const mediumIssues = issues.filter(i => i.severity === 'medium');
    if (mediumIssues.length > 0) {
      const prompt = this.generateGenericBatchPrompt(mediumIssues, 'Medium');
      fs.writeFileSync(path.join(genericDir, 'fix-all-medium.md'), prompt);
      files.push('generic/fix-all-medium.md');
    }

    // Per-file prompts
    const byFile = this.groupByFile(issues);
    for (const [file, fileIssues] of Object.entries(byFile)) {
      const safeFileName = this.sanitizeFileName(file);
      const prompt = this.generateGenericFilePrompt(file, fileIssues);
      fs.writeFileSync(path.join(byFileDir, `${safeFileName}.md`), prompt);
      files.push(`generic/by-file/${safeFileName}.md`);
    }

    return files;
  }

  private generateGenericBatchPrompt(issues: FixRequest[], severityLabel: string): string {
    const byFile = this.groupByFile(issues);

    let prompt = `# Fix ${severityLabel} Severity Code Issues

I need help fixing ${issues.length} code quality issues. Please provide the corrected code for each file.

## Issues by File

`;

    for (const [file, fileIssues] of Object.entries(byFile)) {
      const language = this.detectLanguage(file);
      prompt += `### ${file} (${language})\n\n`;

      for (const issue of fileIssues) {
        prompt += `**Line ${issue.line} - ${issue.rule}**\n`;
        prompt += `Problem: ${issue.message}\n`;
        if (issue.fixSuggestion?.fix) {
          prompt += `Suggested fix: ${issue.fixSuggestion.fix}\n`;
        }
        prompt += '\n';
      }
    }

    prompt += `## Instructions

1. Provide the complete fixed code for each file
2. Maintain the existing code style
3. Don't add comments explaining the fixes
4. Wrap each file's code in a code block with the filename

Example response format:
\`\`\`typescript
// filename.ts
// ... fixed code ...
\`\`\`
`;

    return prompt;
  }

  private generateGenericFilePrompt(file: string, issues: FixRequest[]): string {
    const language = this.detectLanguage(file);

    let prompt = `# Fix Issues in ${file}

Please fix these ${issues.length} issues in this ${language} file.

## Issues

`;

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      prompt += `### Issue ${i + 1}: Line ${issue.line}

**Rule:** ${issue.rule}
**Severity:** ${issue.severity.toUpperCase()}
**Problem:** ${issue.message}

`;
      if (issue.fixSuggestion?.fix) {
        prompt += `**Suggested Fix:** ${issue.fixSuggestion.fix}\n\n`;
      }
    }

    prompt += `## Instructions

Please provide the complete fixed file. Maintain existing style, don't add explanatory comments.
`;

    return prompt;
  }

  // ==========================================================================
  // Severity Guide Generator
  // ==========================================================================

  private generateSeverityGuide(issues: FixRequest[]): string {
    const bySeverity = {
      critical: issues.filter(i => i.severity === 'critical'),
      high: issues.filter(i => i.severity === 'high'),
      medium: issues.filter(i => i.severity === 'medium'),
      low: issues.filter(i => i.severity === 'low')
    };

    let guide = `# All Issues by Severity

**Repository:** ${this.config.repository}
**Total Issues:** ${issues.length}

---

`;

    for (const [severity, sevIssues] of Object.entries(bySeverity)) {
      if (sevIssues.length === 0) continue;

      const emoji = this.getSeverityEmoji(severity);
      guide += `## ${emoji} ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${sevIssues.length})\n\n`;

      const byFile = this.groupByFile(sevIssues);
      for (const [file, fileIssues] of Object.entries(byFile)) {
        guide += `### ${file}\n\n`;
        for (const issue of fileIssues) {
          guide += `- **Line ${issue.line}:** ${issue.message}\n`;
          if (issue.fixSuggestion?.fix) {
            guide += `  - *Fix:* ${issue.fixSuggestion.fix}\n`;
          }
        }
        guide += '\n';
      }
    }

    return guide;
  }

  // ==========================================================================
  // Data Files Generator
  // ==========================================================================

  private async generateDataFiles(issues: FixRequest[]): Promise<string[]> {
    const dataDir = path.join(this.config.outputDir, 'data');
    fs.mkdirSync(dataDir, { recursive: true });

    const files: string[] = [];

    // Write issues.json
    fs.writeFileSync(
      path.join(dataDir, 'issues.json'),
      JSON.stringify(issues, null, 2)
    );
    files.push('data/issues.json');

    return files;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private groupByFile(issues: FixRequest[]): Record<string, FixRequest[]> {
    const groups: Record<string, FixRequest[]> = {};
    for (const issue of issues) {
      if (!issue.file) continue;
      if (!groups[issue.file]) groups[issue.file] = [];
      groups[issue.file].push(issue);
    }
    // Sort issues within each file by line
    for (const file of Object.keys(groups)) {
      groups[file].sort((a, b) => a.line - b.line);
    }
    return groups;
  }

  private countBySeverity(issues: FixRequest[]): Record<string, number> {
    return {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };
  }

  private getSeverityEmoji(severity: string): string {
    const emojis: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return emojis[severity] || '⚪';
  }

  private detectLanguage(file: string): string {
    const ext = path.extname(file).toLowerCase().slice(1);
    const langMap: Record<string, string> = {
      ts: 'TypeScript', tsx: 'TypeScript',
      js: 'JavaScript', jsx: 'JavaScript',
      java: 'Java', kt: 'Kotlin',
      py: 'Python', rb: 'Ruby',
      go: 'Go', rs: 'Rust',
      cs: 'C#', php: 'PHP',
      yaml: 'YAML', yml: 'YAML',
      json: 'JSON', md: 'Markdown',
      sh: 'Shell', dockerfile: 'Dockerfile'
    };
    return langMap[ext] || ext || 'code';
  }

  private sanitizeFileName(file: string): string {
    return file
      .replace(/[\/\\]/g, '_')
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .replace(/_+/g, '_');
  }
}

// ============================================================================
// Convenience Function
// ============================================================================

/**
 * Generate fix package from LSP actions file
 */
export async function generateFixPackageFromLSP(
  lspActionsPath: string,
  outputDir: string,
  config: Omit<FixPackageConfig, 'outputDir'>
): Promise<FixPackageResult> {
  // Read and parse LSP actions
  const content = fs.readFileSync(lspActionsPath, 'utf-8');
  const lspActions = JSON.parse(content);

  // Convert to fix requests (skip batch actions - first 5)
  const issues: FixRequest[] = [];
  const individualActions = lspActions.slice(5);

  for (const action of individualActions) {
    const data = action.data;
    const diagnostic = action.diagnostics?.[0];
    const changes = action.edit?.changes;

    if (!changes) continue;

    const fileUri = Object.keys(changes)[0];
    if (!fileUri) continue;

    // Extract relative path
    const file = fileUri
      .replace(/^file:\/\/[^/]*/, '')
      .replace(/^\/tmp\/[^/]+\//, '');

    issues.push({
      file,
      line: (diagnostic?.range?.start?.line || 0) + 1,
      column: diagnostic?.range?.start?.character,
      severity: data?.issue?.severity || 'medium',
      rule: diagnostic?.code || data?.issue?.rule || 'unknown',
      message: diagnostic?.message || action.title,
      category: data?.issue?.category,
      fixSuggestion: data?.fix
    });
  }

  // Generate package
  const generator = new FixPackageGenerator({ ...config, outputDir });
  return generator.generate(issues);
}
