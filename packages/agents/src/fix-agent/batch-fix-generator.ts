/* eslint-disable no-useless-escape */
/**
 * Batch Fix Generator
 *
 * Generates universal fix artifacts that work across all IDEs:
 * 1. Interactive Fix Guide (Markdown) - Copy-paste prompts for any AI
 * 2. Automated Fix Script (Shell/Node) - API-based automation
 * 3. Aider Commands - For aider CLI users
 * 
 * @module fix-agent/batch-fix-generator
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface FixIssue {
  file: string;
  line: number;
  column?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  message: string;
  snippet?: string;
  category?: string;
  tool?: string;
  fixSuggestion?: {
    explanation?: string;
    fix?: string;
    correctedCode?: string;
    bestPractices?: string[];
  };
}

export interface ManifestFile {
  filename: string;
  url?: string;
  fallback_path?: string;
  severity: string;
  category: string;
  rule: string;
  title: string;
  description: string;
  occurrences: number;
  autoFixable: boolean;
}

export interface Manifest {
  version: string;
  metadata: {
    repository: string;
    total_issues: number;
    total_fix_files: number;
    generated_at: string;
  };
  files: {
    critical: ManifestFile[];
    high: ManifestFile[];
    medium: ManifestFile[];
    low: ManifestFile[];
  };
}

export interface BatchFixConfig {
  workspaceRoot: string;
  outputDir: string;
  includeFileContent: boolean;
  maxIssuesPerPrompt: number;
  aiProvider?: 'openrouter' | 'anthropic' | 'openai';
}

export interface FileFixGroup {
  file: string;
  issues: FixIssue[];
  content?: string;
  language: string;
}

// ============================================================================
// Batch Fix Generator Class
// ============================================================================

export class BatchFixGenerator {
  private config: BatchFixConfig;

  constructor(config: Partial<BatchFixConfig> = {}) {
    this.config = {
      workspaceRoot: config.workspaceRoot || process.cwd(),
      outputDir: config.outputDir || './codequal-fixes',
      includeFileContent: config.includeFileContent ?? true,
      maxIssuesPerPrompt: config.maxIssuesPerPrompt || 20,
      aiProvider: config.aiProvider || 'openrouter'
    };
  }

  /**
   * Generate all fix artifacts from issues
   */
  async generateAllArtifacts(
    issues: FixIssue[],
    metadata: { repository: string; prNumber?: number }
  ): Promise<{
    markdownGuide: string;
    shellScript: string;
    aiderCommands: string;
    nodeScript: string;
  }> {
    // Group issues by file
    const fileGroups = this.groupIssuesByFile(issues);

    // Generate artifacts
    const markdownGuide = this.generateMarkdownGuide(fileGroups, metadata);
    const shellScript = this.generateShellScript(fileGroups, metadata);
    const aiderCommands = this.generateAiderCommands(fileGroups, metadata);
    const nodeScript = this.generateNodeScript(fileGroups, metadata);

    return {
      markdownGuide,
      shellScript,
      aiderCommands,
      nodeScript
    };
  }

  /**
   * Group issues by file for efficient batch processing
   */
  private groupIssuesByFile(issues: FixIssue[]): FileFixGroup[] {
    const groups = new Map<string, FixIssue[]>();

    for (const issue of issues) {
      if (!issue.file) continue;
      
      const existing = groups.get(issue.file) || [];
      existing.push(issue);
      groups.set(issue.file, existing);
    }

    const result: FileFixGroup[] = [];

    for (const [file, fileIssues] of Array.from(groups.entries())) {
      // Sort issues by line number
      fileIssues.sort((a, b) => (a.line || 0) - (b.line || 0));
      
      // Try to read file content if configured
      let content: string | undefined;
      if (this.config.includeFileContent) {
        try {
          const filePath = path.isAbsolute(file) 
            ? file 
            : path.join(this.config.workspaceRoot, file);
          content = fs.readFileSync(filePath, 'utf-8');
        } catch {
          // File not accessible, continue without content
        }
      }

      result.push({
        file,
        issues: fileIssues,
        content,
        language: this.detectLanguage(file)
      });
    }

    // Sort by number of issues (most issues first)
    result.sort((a, b) => b.issues.length - a.issues.length);

    return result;
  }

  /**
   * Generate Interactive Fix Guide (Markdown)
   * This is the most universal format - works with any AI
   */
  private generateMarkdownGuide(
    fileGroups: FileFixGroup[],
    metadata: { repository: string; prNumber?: number }
  ): string {
    const totalIssues = fileGroups.reduce((sum, g) => sum + g.issues.length, 0);
    const severityCounts = this.countBySeverity(fileGroups);

    let md = `# CodeQual Batch Fix Guide

**Repository:** ${metadata.repository}
${metadata.prNumber ? `**PR:** #${metadata.prNumber}` : ''}
**Generated:** ${new Date().toISOString()}
**Total Issues:** ${totalIssues} across ${fileGroups.length} files

## Issue Summary

| Severity | Count | Action |
|----------|-------|--------|
| 🔴 Critical | ${severityCounts.critical} | Must fix before merge |
| 🟠 High | ${severityCounts.high} | Should fix before merge |
| 🟡 Medium | ${severityCounts.medium} | Recommended to fix |
| 🟢 Low | ${severityCounts.low} | Nice to have |

---

## Quick Start

### Option 1: Copy-Paste to AI (Any IDE)
1. Find the file you want to fix below
2. Copy the "AI Prompt" section
3. Paste into your AI assistant (Cursor, Copilot, ChatGPT, Claude)
4. Apply the returned fix

### Option 2: Automated Script
\`\`\`bash
# Fix all issues
./codequal-fix.sh --all

# Fix only high severity
./codequal-fix.sh --severity high

# Preview changes without applying
./codequal-fix.sh --dry-run
\`\`\`

### Option 3: Use with Aider
\`\`\`bash
# Run the generated aider commands
source codequal-aider-commands.sh
\`\`\`

---

## Files to Fix

`;

    // Generate sections for each file
    for (const group of fileGroups) {
      md += this.generateFileSection(group);
    }

    // Add batch prompts for severity groups
    md += this.generateBatchPromptSection(fileGroups);

    return md;
  }

  /**
   * Generate section for a single file
   */
  private generateFileSection(group: FileFixGroup): string {
    const severityIcon = this.getSeverityIcon(this.getHighestSeverity(group.issues));
    
    let section = `### ${severityIcon} ${group.file}
**Issues:** ${group.issues.length} | **Language:** ${group.language}

#### Issues in this file:
`;

    for (const issue of group.issues) {
      section += `- **[${issue.severity.toUpperCase()}]** Line ${issue.line}: ${issue.message}\n`;
      if (issue.fixSuggestion?.fix) {
        section += `  - *Fix:* ${issue.fixSuggestion.fix.substring(0, 100)}...\n`;
      }
    }

    // Generate AI prompt for this file
    section += `
#### AI Prompt (Copy & Paste)
\`\`\`
${this.generateFilePrompt(group)}
\`\`\`

`;

    // Add current code if available
    if (group.content) {
      const relevantLines = this.extractRelevantLines(group);
      section += `#### Relevant Code
\`\`\`${group.language}
${relevantLines}
\`\`\`

`;
    }

    section += `---

`;

    return section;
  }

  /**
   * Generate AI prompt for fixing all issues in a file
   */
  private generateFilePrompt(group: FileFixGroup): string {
    let prompt = `Fix the following ${group.issues.length} code quality issues in this ${group.language} file.

FILE: ${group.file}

ISSUES TO FIX:
`;

    for (let i = 0; i < group.issues.length; i++) {
      const issue = group.issues[i];
      prompt += `
${i + 1}. [${issue.severity.toUpperCase()}] Line ${issue.line}: ${issue.rule}
   Problem: ${issue.message}`;
      
      if (issue.fixSuggestion?.fix) {
        prompt += `
   Recommended Fix: ${issue.fixSuggestion.fix}`;
      }
      
      if (issue.snippet) {
        prompt += `
   Code: ${issue.snippet.split('\n')[0]}`;
      }
    }

    prompt += `

INSTRUCTIONS:
1. Fix ALL listed issues
2. Maintain existing code style and formatting
3. Do NOT add comments explaining the fixes
4. Preserve all existing functionality
5. Return the COMPLETE fixed file content

${group.content ? `CURRENT FILE CONTENT:
\`\`\`${group.language}
${group.content}
\`\`\`` : '(File content not available - please provide the current file content)'}`;

    return prompt;
  }

  /**
   * Generate batch prompt section for fixing by severity
   */
  private generateBatchPromptSection(fileGroups: FileFixGroup[]): string {
    let section = `## Batch Fix Prompts

### Fix All Critical & High Issues

Copy this prompt to fix all blocking issues at once:

\`\`\`
I need to fix multiple code quality issues across several files. Please help me fix each file one by one.

`;

    const criticalHighGroups = fileGroups.filter(g => 
      g.issues.some(i => i.severity === 'critical' || i.severity === 'high')
    );

    for (const group of criticalHighGroups.slice(0, 10)) { // Limit to 10 files
      const blockingIssues = group.issues.filter(i => 
        i.severity === 'critical' || i.severity === 'high'
      );
      
      section += `FILE: ${group.file}
Issues:
${blockingIssues.map((i, idx) => `${idx + 1}. Line ${i.line}: ${i.message}`).join('\n')}

`;
    }

    section += `Please provide the fixed code for each file, maintaining existing style and functionality.
\`\`\`

`;

    return section;
  }

  /**
   * Generate Shell Script for automated fixing
   */
  private generateShellScript(
    fileGroups: FileFixGroup[],
    metadata: { repository: string; prNumber?: number }
  ): string {
    // Build the files section separately to avoid complex template nesting
    const filesSection = fileGroups.map(g => {
      const highestSeverity = this.getHighestSeverity(g.issues);
      // Escape backslashes first, then other special shell characters
      const prompt = this.generateFilePrompt(g)
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

      return `
# ${g.file} (${g.issues.length} issues)
if [[ "$SEVERITY_FILTER" == "all" || "$SEVERITY_FILTER" == "${highestSeverity}" ]]; then
  PROMPT='${prompt.replace(/'/g, "'\"'\"'")}'
  fix_file "${g.file}" "$PROMPT"
fi`;
    }).join('\n');

    const commitLine = metadata.prNumber ? 'echo "Don\'t forget to commit and push your changes."' : '';

    return `#!/bin/bash
# CodeQual Automated Fix Script
# Repository: ${metadata.repository}
# Generated: ${new Date().toISOString()}

set -e

# Configuration
OPENROUTER_API_KEY="\${OPENROUTER_API_KEY:-}"
MODEL="anthropic/claude-sonnet-4-20250514"
DRY_RUN=false
SEVERITY_FILTER="all"

# Parse arguments
while [[ \$# -gt 0 ]]; do
  case \$1 in
    --dry-run) DRY_RUN=true; shift ;;
    --severity) SEVERITY_FILTER="\$2"; shift 2 ;;
    --all) SEVERITY_FILTER="all"; shift ;;
    --api-key) OPENROUTER_API_KEY="\$2"; shift 2 ;;
    *) echo "Unknown option: \$1"; exit 1 ;;
  esac
done

# Check for API key
if [ -z "\$OPENROUTER_API_KEY" ]; then
  echo "Error: OPENROUTER_API_KEY not set"
  echo "Set it with: export OPENROUTER_API_KEY=your-key"
  echo "Or run with: --api-key your-key"
  exit 1
fi

echo "CodeQual Batch Fix"
echo "====================="
echo "Mode: \${DRY_RUN:+Dry Run}\${DRY_RUN:-Apply}"
echo "Severity: \$SEVERITY_FILTER"
echo ""

# Function to fix a file using AI
fix_file() {
  local file="\$1"
  local prompt="\$2"

  echo "Fixing: \$file"

  # Call OpenRouter API
  local response=\$(curl -s https://openrouter.ai/api/v1/chat/completions \\
    -H "Authorization: Bearer \$OPENROUTER_API_KEY" \\
    -H "Content-Type: application/json" \\
    -d "{
      \\"model\\": \\"\$MODEL\\",
      \\"messages\\": [{\\"role\\": \\"user\\", \\"content\\": \\"\$prompt\\"}],
      \\"temperature\\": 0.1
    }")

  # Extract fixed content
  local fixed_content=\$(echo "\$response" | jq -r '.choices[0].message.content')

  if [ "\$DRY_RUN" = true ]; then
    echo "Would update: \$file"
    echo "--- Preview ---"
    echo "\$fixed_content" | head -20
    echo "..."
  else
    # Backup original
    cp "\$file" "\$file.bak"

    # Write fixed content
    echo "\$fixed_content" > "\$file"
    echo "Fixed: \$file (backup: \$file.bak)"
  fi
}

# Files to fix
${filesSection}

echo ""
echo "Batch fix complete!"
${commitLine}
`;
  }

  /**
   * Generate Aider-compatible commands
   */
  private generateAiderCommands(
    fileGroups: FileFixGroup[],
    metadata: { repository: string; prNumber?: number }
  ): string {
    let script = `#!/bin/bash
# CodeQual Aider Commands
# Repository: ${metadata.repository}
# Generated: ${new Date().toISOString()}
#
# Usage: source codequal-aider-commands.sh
# Then run individual commands or use fix_all function

`;

    // Generate individual fix commands
    for (const group of fileGroups) {
      const topIssue = group.issues[0];
      const issueList = group.issues.map(i => 
        `Line ${i.line}: ${i.message}`
      ).join('; ');

      script += `# ${group.file} (${group.issues.length} issues)
alias fix_${this.sanitizeForAlias(group.file)}='aider --message "Fix these issues in ${group.file}: ${issueList.substring(0, 500)}"'

`;
    }

    // Generate fix_all function
    script += `
# Fix all files
fix_all() {
  echo "🔧 Running all fixes with aider..."
${fileGroups.map(g => `  fix_${this.sanitizeForAlias(g.file)}`).join('\n')}
  echo "✅ All fixes applied!"
}

# Fix by severity
fix_critical() {
  echo "🔴 Fixing critical issues..."
${fileGroups.filter(g => g.issues.some(i => i.severity === 'critical'))
  .map(g => `  fix_${this.sanitizeForAlias(g.file)}`).join('\n') || '  echo "No critical issues"'}
}

fix_high() {
  echo "🟠 Fixing high severity issues..."
${fileGroups.filter(g => g.issues.some(i => i.severity === 'high'))
  .map(g => `  fix_${this.sanitizeForAlias(g.file)}`).join('\n') || '  echo "No high severity issues"'}
}

echo "CodeQual Aider commands loaded!"
echo "Available commands:"
echo "  fix_all      - Fix all issues"
echo "  fix_critical - Fix critical issues only"
echo "  fix_high     - Fix high severity issues"
${fileGroups.slice(0, 5).map(g => 
  `echo "  fix_${this.sanitizeForAlias(g.file)} - Fix ${g.file}"`
).join('\n')}
`;

    return script;
  }

  /**
   * Generate Node.js script for programmatic fixing
   */
  private generateNodeScript(
    fileGroups: FileFixGroup[],
    metadata: { repository: string; prNumber?: number }
  ): string {
    return `#!/usr/bin/env node
/**
 * CodeQual Automated Fix Script (Node.js)
 * Repository: ${metadata.repository}
 * Generated: ${new Date().toISOString()}
 * 
 * Usage:
 *   node codequal-fix.mjs --all
 *   node codequal-fix.mjs --severity high
 *   node codequal-fix.mjs --dry-run
 */

import fs from 'fs';
import path from 'path';

// Configuration
const config = {
  apiKey: process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY,
  apiUrl: process.env.OPENROUTER_API_KEY 
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.anthropic.com/v1/messages',
  model: 'anthropic/claude-sonnet-4-20250514',
  dryRun: process.argv.includes('--dry-run'),
  severityFilter: getArgValue('--severity') || 'all'
};

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  return idx > -1 ? process.argv[idx + 1] : null;
}

// Issue data
const fileGroups = ${JSON.stringify(fileGroups.map(g => ({
  file: g.file,
  issues: g.issues.map(i => ({
    line: i.line,
    severity: i.severity,
    rule: i.rule,
    message: i.message,
    fix: i.fixSuggestion?.fix
  })),
  language: g.language
})), null, 2)};

async function fixFile(group) {
  console.log(\`📝 Processing: \${group.file} (\${group.issues.length} issues)\`);
  
  // Read current file content
  let content;
  try {
    content = fs.readFileSync(group.file, 'utf-8');
  } catch (e) {
    console.log(\`  ⚠️  Cannot read file: \${group.file}\`);
    return;
  }
  
  // Generate prompt
  const prompt = generatePrompt(group, content);
  
  if (config.dryRun) {
    console.log(\`  🔍 Dry run - would fix \${group.issues.length} issues\`);
    return;
  }
  
  // Call AI API
  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${config.apiKey}\`,
        ...(config.apiUrl.includes('anthropic') ? {
          'anthropic-version': '2023-06-01'
        } : {})
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8000,
        temperature: 0.1
      })
    });
    
    const data = await response.json();
    let fixedContent = data.choices?.[0]?.message?.content 
      || data.content?.[0]?.text;
    
    if (!fixedContent) {
      console.log(\`  ❌ No response from AI\`);
      return;
    }
    
    // Extract code block if present
    const codeMatch = fixedContent.match(/\\\`\\\`\\\`[\\w]*\\n([\\s\\S]*?)\\n\\\`\\\`\\\`/);
    if (codeMatch) {
      fixedContent = codeMatch[1];
    }
    
    // Backup and write
    fs.copyFileSync(group.file, \`\${group.file}.bak\`);
    fs.writeFileSync(group.file, fixedContent);
    console.log(\`  ✅ Fixed: \${group.file}\`);
    
  } catch (e) {
    console.log(\`  ❌ Error: \${e.message}\`);
  }
}

function generatePrompt(group, content) {
  let prompt = \`Fix the following \${group.issues.length} code quality issues in this \${group.language} file.

FILE: \${group.file}

ISSUES TO FIX:
\`;

  group.issues.forEach((issue, i) => {
    prompt += \`
\${i + 1}. [\${issue.severity.toUpperCase()}] Line \${issue.line}: \${issue.rule}
   Problem: \${issue.message}\`;
    if (issue.fix) {
      prompt += \`
   Fix: \${issue.fix}\`;
    }
  });

  prompt += \`

CURRENT FILE CONTENT:
\\\`\\\`\\\`\${group.language}
\${content}
\\\`\\\`\\\`

Return ONLY the complete fixed file content, no explanations.\`;

  return prompt;
}

function shouldProcess(group) {
  if (config.severityFilter === 'all') return true;
  return group.issues.some(i => i.severity === config.severityFilter);
}

async function main() {
  console.log('🔧 CodeQual Batch Fix');
  console.log('=====================');
  console.log(\`Mode: \${config.dryRun ? 'Dry Run' : 'Apply'}\`);
  console.log(\`Severity: \${config.severityFilter}\`);
  console.log('');
  
  if (!config.apiKey && !config.dryRun) {
    console.log('❌ Error: API key not set');
    console.log('Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY');
    process.exit(1);
  }
  
  for (const group of fileGroups) {
    if (shouldProcess(group)) {
      await fixFile(group);
    }
  }
  
  console.log('');
  console.log('🎉 Batch fix complete!');
}

main().catch(console.error);
`;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private detectLanguage(file: string): string {
    const ext = path.extname(file).toLowerCase().slice(1);
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript',
      js: 'javascript', jsx: 'javascript', mjs: 'javascript',
      java: 'java', kt: 'kotlin',
      py: 'python', rb: 'ruby',
      go: 'go', rs: 'rust',
      cs: 'csharp', php: 'php',
      swift: 'swift', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
      yaml: 'yaml', yml: 'yaml',
      json: 'json', xml: 'xml', html: 'html', css: 'css',
      sh: 'shell', bash: 'shell',
      dockerfile: 'dockerfile', md: 'markdown'
    };
    return langMap[ext] || ext || 'text';
  }

  private countBySeverity(groups: FileFixGroup[]): Record<string, number> {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const group of groups) {
      for (const issue of group.issues) {
        counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      }
    }
    return counts;
  }

  private getHighestSeverity(issues: FixIssue[]): string {
    const order = ['critical', 'high', 'medium', 'low'];
    for (const sev of order) {
      if (issues.some(i => i.severity === sev)) return sev;
    }
    return 'low';
  }

  private getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[severity] || '⚪';
  }

  private extractRelevantLines(group: FileFixGroup): string {
    if (!group.content) return '';
    
    const lines = group.content.split('\n');
    const relevantLineNumbers = new Set<number>();
    
    // Collect relevant line numbers with context
    for (const issue of group.issues) {
      const line = issue.line || 1;
      for (let i = Math.max(0, line - 3); i < Math.min(lines.length, line + 3); i++) {
        relevantLineNumbers.add(i);
      }
    }
    
    // Build output with line numbers
    const sortedLines = Array.from(relevantLineNumbers).sort((a, b) => a - b);
    let result = '';
    let lastLine = -2;
    
    for (const lineNum of sortedLines) {
      if (lineNum > lastLine + 1) {
        result += '\n// ...\n';
      }
      result += `${lineNum + 1}: ${lines[lineNum]}\n`;
      lastLine = lineNum;
    }
    
    return result.trim();
  }

  private sanitizeForAlias(file: string): string {
    return file
      .replace(/[\/\\]/g, '_')
      .replace(/\./g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  }

  private matchesSeverityFilter(filter: string, severity: string): boolean {
    if (filter === 'all') return true;
    if (filter === 'blocking') return severity === 'critical' || severity === 'high';
    return filter === severity;
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

export async function generateBatchFixes(
  issues: FixIssue[],
  outputDir: string,
  metadata: { repository: string; prNumber?: number }
): Promise<void> {
  const generator = new BatchFixGenerator({
    outputDir,
    includeFileContent: true
  });

  const artifacts = await generator.generateAllArtifacts(issues, metadata);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write all artifacts
  fs.writeFileSync(
    path.join(outputDir, 'codequal-fix-guide.md'),
    artifacts.markdownGuide
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'codequal-fix.sh'),
    artifacts.shellScript
  );
  fs.chmodSync(path.join(outputDir, 'codequal-fix.sh'), '755');
  
  fs.writeFileSync(
    path.join(outputDir, 'codequal-aider-commands.sh'),
    artifacts.aiderCommands
  );
  fs.chmodSync(path.join(outputDir, 'codequal-aider-commands.sh'), '755');
  
  fs.writeFileSync(
    path.join(outputDir, 'codequal-fix.mjs'),
    artifacts.nodeScript
  );

  console.log(`✅ Generated batch fix artifacts in ${outputDir}/`);
  console.log('   - codequal-fix-guide.md  (Interactive guide)');
  console.log('   - codequal-fix.sh        (Shell script)');
  console.log('   - codequal-aider-commands.sh (Aider commands)');
  console.log('   - codequal-fix.mjs       (Node.js script)');
}
