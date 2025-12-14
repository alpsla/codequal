#!/usr/bin/env ts-node
/**
 * Fix Review and Apply Tool - V9 Universal Analysis Report
 *
 * This interactive CLI tool allows you to:
 * 1. Review the V9 Universal Analysis Report
 * 2. Select which fixes to apply (by severity, category, or individually)
 * 3. Commit the selected fixes with a custom message
 * 4. Create a PR with a detailed description of what was fixed and what wasn't
 *
 * Usage:
 *   npx ts-node tests/integration/fix-review-and-apply.ts [command] [options]
 *
 * Commands:
 *   list      - List all fixes from a manifest
 *   review    - Show detailed fix for a specific group
 *   apply     - Apply fixes to the codebase
 *   summary   - Generate JSON summary
 *   commit    - Create commit(s) for selected fixes
 *   pr        - Create a PR with fix description
 *   interactive - Start interactive mode
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execSync, spawnSync } from 'child_process';

// Types for the manifest structure
interface FixFile {
  filename: string;
  url?: string;
  fallback_path: string;
  severity: string;
  category: string;
  rule: string;
  title: string;
  description: string;
  impact: string;
  priority: number;
  occurrences: number;
  autoFixable: boolean;
}

interface Manifest {
  version: string;
  metadata: {
    repository: string;
    total_issues: number;
    total_fix_files: number;
    generated_at: string;
  };
  files: {
    critical: FixFile[];
    high: FixFile[];
    medium: FixFile[];
    low: FixFile[];
  };
}

interface FixDetails {
  version: string;
  group_id: string;
  rule: string;
  tool: string;
  severity: string;
  description: string;
  fix_pattern: {
    type: string;
    fixTier: number;
    fixerTool: string;
    confidence: number;
    example: {
      before: string;
      after: string;
    };
    instructions: string;
    aiPrompt?: {
      systemPrompt: string;
      userPromptTemplate: string;
    };
  };
  locations: Array<{
    file: string;
    line: number;
    snippet: string;
    category: string;
  }>;
  metadata: {
    total_occurrences: number;
    confidence: string;
    safe_auto_apply: boolean;
    estimated_time_seconds: number;
  };
}

interface ReviewSummary {
  severity: string;
  groupId: string;
  rule: string;
  tool: string;
  occurrences: number;
  autoFixable: boolean;
  confidence: string;
  files: string[];
  fixPreview: string;
}

interface CommitInfo {
  title: string;
  body: string;
  files: string[];
  issueCount: number;
  severity: string;
  category: string;
}

// Terminal Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function severityEmoji(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return '\u{1F6A8}'; // Police light
    case 'high':
      return '\u{1F534}'; // Red circle
    case 'medium':
      return '\u{1F7E0}'; // Orange circle
    case 'low':
      return '\u{1F7E1}'; // Yellow circle
    default:
      return '\u{26AA}'; // White circle
  }
}

function categoryEmoji(category: string): string {
  switch (category?.toLowerCase()) {
    case 'security':
      return '\u{1F512}'; // Lock
    case 'dependency_vulnerability':
    case 'dependency':
      return '\u{1F4E6}'; // Package
    case 'code_quality':
    case 'quality':
      return '\u{2728}'; // Sparkles
    case 'performance':
      return '\u{26A1}'; // Lightning
    default:
      return '\u{1F4CB}'; // Clipboard
  }
}

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'test-outputs');

// Helper to load manifest
function loadManifest(manifestPath: string): Manifest {
  const content = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(content) as Manifest;
}

// Helper to load fix details
function loadFixDetails(fixFilePath: string): FixDetails | null {
  try {
    const content = fs.readFileSync(fixFilePath, 'utf-8');
    return JSON.parse(content) as FixDetails;
  } catch {
    console.error(`Cannot load fix file: ${fixFilePath}`);
    return null;
  }
}

// Get all fixes with their details
function getAllFixes(manifestPath: string): Array<{ severity: string; fix: FixFile; details: FixDetails | null }> {
  const manifest = loadManifest(manifestPath);
  const manifestDir = path.dirname(manifestPath);
  const result: Array<{ severity: string; fix: FixFile; details: FixDetails | null }> = [];

  const severities = ['critical', 'high', 'medium', 'low'] as const;
  for (const severity of severities) {
    for (const fix of manifest.files[severity]) {
      const fixFilePath = path.join(manifestDir, fix.fallback_path);
      const details = loadFixDetails(fixFilePath);
      result.push({ severity, fix, details });
    }
  }

  return result;
}

// List all fixes from manifest
function listFixes(manifestPath: string): void {
  const manifest = loadManifest(manifestPath);

  console.log('\n' + '='.repeat(70));
  console.log(colorize('  V9 Universal Analysis Report - Fix Review', 'cyan'));
  console.log('='.repeat(70));
  console.log(`  Repository: ${colorize(manifest.metadata.repository, 'white')}`);
  console.log(`  Total Issues: ${colorize(String(manifest.metadata.total_issues), 'yellow')}`);
  console.log(`  Fix Files: ${colorize(String(manifest.metadata.total_fix_files), 'green')}`);
  console.log(`  Generated: ${colorize(manifest.metadata.generated_at, 'dim')}`);
  console.log('='.repeat(70) + '\n');

  const severities = ['critical', 'high', 'medium', 'low'] as const;
  let index = 1;

  for (const severity of severities) {
    const fixes = manifest.files[severity];
    if (fixes.length === 0) continue;

    console.log(`\n${severityEmoji(severity)} ${colorize(severity.toUpperCase(), 'bold')} (${fixes.length} groups)\n`);

    for (const fix of fixes) {
      const autoFix = fix.autoFixable
        ? colorize('\u{2714} Auto', 'green')
        : colorize('\u{2718} Manual', 'yellow');
      console.log(`  [${colorize(String(index), 'cyan')}] ${fix.rule}`);
      console.log(`      ${categoryEmoji(fix.category)} ${fix.category} | ${fix.occurrences} occurrences | ${autoFix}`);
      console.log('');
      index++;
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log(colorize('Commands:', 'bold'));
  console.log('  review <index>    - Review fix details');
  console.log('  commit [options]  - Create commit with selected fixes');
  console.log('  pr [options]      - Create PR with fix description');
  console.log('  interactive       - Start interactive mode');
}

// Review a specific fix in detail
function reviewFix(manifestPath: string, fixIndex: number): void {
  const allFixes = getAllFixes(manifestPath);

  if (fixIndex < 1 || fixIndex > allFixes.length) {
    console.error(`Invalid index. Valid range: 1-${allFixes.length}`);
    return;
  }

  const { severity, fix, details } = allFixes[fixIndex - 1];

  if (!details) {
    console.error(`Cannot load fix details`);
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`${severityEmoji(severity)} FIX REVIEW: ${colorize(fix.rule, 'cyan')}`);
  console.log('='.repeat(80));

  console.log(`\nSeverity: ${colorize(severity.toUpperCase(), severity === 'critical' ? 'red' : severity === 'high' ? 'yellow' : 'white')}`);
  console.log(`Tool: ${details.tool}`);
  console.log(`Category: ${categoryEmoji(fix.category)} ${fix.category}`);
  console.log(`Occurrences: ${details.metadata.total_occurrences}`);
  console.log(`Confidence: ${details.metadata.confidence}`);
  console.log(`Auto-fixable: ${fix.autoFixable ? colorize('Yes', 'green') : colorize('No (Manual Review)', 'yellow')}`);

  console.log('\n' + colorize('--- Issue Description ---', 'bold'));
  try {
    const desc = JSON.parse(details.description);
    console.log(`What: ${desc.issueDescription?.what || 'N/A'}`);
    console.log(`Why: ${desc.issueDescription?.why || 'N/A'}`);
    if (desc.issueDescription?.impact) {
      console.log(`Impact: ${desc.issueDescription.impact}`);
    }
  } catch {
    console.log(details.description.substring(0, 500));
  }

  console.log('\n' + colorize('--- Affected Locations ---', 'bold'));
  for (const loc of details.locations.slice(0, 5)) {
    console.log(`  ${colorize(loc.file, 'cyan')}:${loc.line}`);
    if (loc.snippet) {
      console.log(`    ${colorize(loc.snippet.substring(0, 80).replace(/\n/g, ' '), 'dim')}...`);
    }
  }
  if (details.locations.length > 5) {
    console.log(`  ... and ${details.locations.length - 5} more locations`);
  }

  console.log('\n' + colorize('--- Fix Preview ---', 'bold'));
  console.log(colorize('BEFORE:', 'red'));
  console.log(details.fix_pattern.example.before || '(No before example)');
  console.log(colorize('\nAFTER:', 'green'));
  console.log(details.fix_pattern.example.after || '(No after example)');

  console.log('\n' + '='.repeat(80));
}

// Generate a fix summary for all issues
function generateSummary(manifestPath: string): ReviewSummary[] {
  const allFixes = getAllFixes(manifestPath);
  const summaries: ReviewSummary[] = [];

  for (const { severity, fix, details } of allFixes) {
    if (details) {
      summaries.push({
        severity,
        groupId: details.group_id,
        rule: details.rule,
        tool: details.tool,
        occurrences: details.metadata.total_occurrences,
        // Use manifest's autoFixable (authoritative) over details.metadata.safe_auto_apply
        autoFixable: fix.autoFixable,
        confidence: details.metadata.confidence,
        files: details.locations.map((l) => l.file),
        fixPreview: details.fix_pattern.example.after.substring(0, 200),
      });
    }
  }

  return summaries;
}

// Generate commit info from selected fixes
function generateCommitInfo(manifestPath: string, selection: {
  severities?: string[];
  categories?: string[];
  indices?: number[];
  all?: boolean;
}): CommitInfo[] {
  const allFixes = getAllFixes(manifestPath);
  const commits: CommitInfo[] = [];

  // Group by category for organized commits
  const byCategory = new Map<string, typeof allFixes>();

  for (let i = 0; i < allFixes.length; i++) {
    const { severity, fix, details } = allFixes[i];
    // Use manifest's autoFixable (authoritative) - skip non-auto-fixable unless explicitly selected
    if (!details || !fix.autoFixable) continue;

    // Check if this fix is selected
    let selected = false;
    if (selection.all) {
      selected = true;
    } else if (selection.severities?.includes(severity)) {
      selected = true;
    } else if (selection.categories?.includes(fix.category)) {
      selected = true;
    } else if (selection.indices?.includes(i + 1)) {
      selected = true;
    }

    if (selected) {
      const cat = fix.category || 'general';
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push({ severity, fix, details });
    }
  }

  // Create commit info for each category
  for (const [category, fixes] of byCategory) {
    const files = new Set<string>();
    let issueCount = 0;
    const rules: string[] = [];

    for (const { details } of fixes) {
      if (details) {
        issueCount += details.metadata.total_occurrences;
        rules.push(details.rule);
        for (const loc of details.locations) {
          files.add(loc.file);
        }
      }
    }

    const uniqueRules = [...new Set(rules)];
    const title = `fix(${category.replace(/_/g, '-')}): auto-fix ${issueCount} ${category.replace(/_/g, ' ')} issues`;

    const body = `## Summary
Auto-fixed ${issueCount} ${category.replace(/_/g, ' ')} issues detected by CodeQual V9 analysis.

## Rules Fixed
${uniqueRules.map(r => `- ${r}`).join('\n')}

## Files Modified
${[...files].slice(0, 10).map(f => `- ${f}`).join('\n')}
${files.size > 10 ? `\n... and ${files.size - 10} more files` : ''}

---
Generated by CodeQual V9 Universal Analysis`;

    commits.push({
      title,
      body,
      files: [...files],
      issueCount,
      severity: fixes[0].severity,
      category,
    });
  }

  return commits;
}

// Generate PR description
function generatePRDescription(manifestPath: string, commits: CommitInfo[]): { title: string; body: string } {
  const manifest = loadManifest(manifestPath);
  const allFixes = getAllFixes(manifestPath);

  const totalIssues = commits.reduce((sum, c) => sum + c.issueCount, 0);
  const totalFiles = new Set(commits.flatMap(c => c.files)).size;

  // Get unfixable issues (manual review required) - use manifest's autoFixable (authoritative)
  const unfixable = allFixes.filter(({ fix }) =>
    !fix.autoFixable
  );

  const title = `fix: auto-fix ${totalIssues} code quality issues via CodeQual V9`;

  let body = `## Summary
This PR applies ${totalIssues} auto-fixes across ${totalFiles} files, generated by CodeQual V9 Universal Analysis.

Repository: ${manifest.metadata.repository}
Analysis Date: ${manifest.metadata.generated_at}

## What was fixed

`;

  for (const commit of commits) {
    body += `### ${categoryEmoji(commit.category)} ${commit.category.replace(/_/g, ' ')} (${commit.issueCount} issues)\n`;
    body += `- Files modified: ${commit.files.length}\n`;
    body += `- Severity: ${commit.severity}\n\n`;
  }

  if (unfixable.length > 0) {
    body += `## What was NOT fixed (requires manual review)

The following ${unfixable.length} issue groups require manual attention:

`;
    for (const { severity, fix, details } of unfixable) {
      if (!details) continue;

      body += `### ${severityEmoji(severity)} ${fix.rule} (${severity.toUpperCase()})\n`;
      body += `- **Occurrences:** ${details.metadata.total_occurrences}\n`;
      body += `- **Category:** ${fix.category}\n`;
      body += `- **Why not auto-fixable:** ${details.metadata.confidence === 'low' ? 'Low confidence fix' : 'Requires human judgment'}\n`;

      try {
        const desc = JSON.parse(details.description);
        if (desc.issueDescription?.why) {
          body += `- **Explanation:** ${desc.issueDescription.why}\n`;
        }
      } catch {
        // Ignore parse errors
      }

      body += '\n';
    }
  }

  body += `## Test Plan
- [ ] Verify all tests pass
- [ ] Review each auto-fix for correctness
- [ ] Run linting to ensure no new issues
- [ ] Manual review of security-related changes

---
Generated by CodeQual V9 Universal Analysis
Report ID: ${manifest.metadata.generated_at}
`;

  return { title, body };
}

// Execute git commit
function executeCommit(commitInfo: CommitInfo, dryRun: boolean = false, customMessage?: string): boolean {
  const message = customMessage || commitInfo.title;
  const fullMessage = `${message}\n\n${commitInfo.body}\n\nGenerated by CodeQual V9`;

  if (dryRun) {
    console.log(colorize('\n[DRY RUN] Would create commit:', 'yellow'));
    console.log(`  Title: ${message}`);
    console.log(`  Files: ${commitInfo.files.length}`);
    console.log(`  Issues: ${commitInfo.issueCount}`);
    return true;
  }

  try {
    // Stage files
    console.log(colorize('Staging files...', 'cyan'));
    execSync('git add -A', { encoding: 'utf8', stdio: 'pipe' });

    // Create commit
    console.log(colorize('Creating commit...', 'cyan'));
    const tempFile = '/tmp/codequal-commit-msg.txt';
    fs.writeFileSync(tempFile, fullMessage);
    execSync(`git commit -F "${tempFile}"`, { encoding: 'utf8', stdio: 'pipe' });
    fs.unlinkSync(tempFile);

    console.log(colorize('\u{2714} Commit created successfully!', 'green'));
    return true;
  } catch (error) {
    console.log(colorize(`\u{2718} Commit failed: ${error}`, 'red'));
    return false;
  }
}

// Create PR using GitHub CLI
function createPR(prInfo: { title: string; body: string }, branchName: string, dryRun: boolean = false): boolean {
  if (dryRun) {
    console.log(colorize('\n[DRY RUN] Would create PR:', 'yellow'));
    console.log('-'.repeat(60));
    console.log(`Branch: ${branchName}`);
    console.log(`Title: ${prInfo.title}`);
    console.log('-'.repeat(60));
    console.log(prInfo.body);
    console.log('-'.repeat(60));
    return true;
  }

  try {
    // Check if gh CLI is available
    const ghVersion = spawnSync('gh', ['--version'], { encoding: 'utf8' });
    if (ghVersion.error) {
      console.log(colorize('GitHub CLI (gh) not found. Install it to create PRs.', 'red'));
      return false;
    }

    // Create branch
    console.log(colorize(`Creating branch: ${branchName}`, 'cyan'));
    execSync(`git checkout -b ${branchName}`, { encoding: 'utf8', stdio: 'pipe' });

    // Stage and commit
    console.log(colorize('Staging changes...', 'cyan'));
    execSync('git add -A', { encoding: 'utf8', stdio: 'pipe' });

    console.log(colorize('Creating commit...', 'cyan'));
    const tempFile = '/tmp/codequal-pr-commit.txt';
    fs.writeFileSync(tempFile, `${prInfo.title}\n\n${prInfo.body}`);
    execSync(`git commit -F "${tempFile}"`, { encoding: 'utf8', stdio: 'pipe' });
    fs.unlinkSync(tempFile);

    // Push branch
    console.log(colorize('Pushing branch...', 'cyan'));
    execSync(`git push -u origin ${branchName}`, { encoding: 'utf8', stdio: 'pipe' });

    // Create PR
    console.log(colorize('Creating PR...', 'cyan'));
    const bodyFile = '/tmp/codequal-pr-body.md';
    fs.writeFileSync(bodyFile, prInfo.body);
    const result = execSync(
      `gh pr create --title "${prInfo.title}" --body-file "${bodyFile}"`,
      { encoding: 'utf8' }
    );
    fs.unlinkSync(bodyFile);

    console.log(colorize('\u{2714} PR created successfully!', 'green'));
    console.log(result);
    return true;
  } catch (error) {
    console.log(colorize(`\u{2718} PR creation failed: ${error}`, 'red'));
    return false;
  }
}

// Interactive CLI Class
class InteractiveCLI {
  private rl: readline.Interface;
  private manifestPath: string;
  private selectedIndices: Set<number> = new Set();

  constructor(manifestPath: string) {
    this.manifestPath = manifestPath;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  close(): void {
    this.rl.close();
  }

  async run(): Promise<void> {
    const manifest = loadManifest(this.manifestPath);

    console.log('\n' + '='.repeat(70));
    console.log(colorize('  CodeQual V9 - Interactive Fix Review & Apply', 'cyan'));
    console.log('='.repeat(70));
    console.log(`  Repository: ${manifest.metadata.repository}`);
    console.log(`  Issues: ${manifest.metadata.total_issues}`);
    console.log('='.repeat(70) + '\n');

    while (true) {
      console.log(colorize('\nMain Menu', 'bold'));
      console.log('-'.repeat(30));
      console.log('  [1] List all fixes');
      console.log('  [2] Review a specific fix');
      console.log('  [3] Select fixes by severity');
      console.log('  [4] Select fixes by category');
      console.log('  [5] Select individual fixes');
      console.log('  [6] Preview commit');
      console.log('  [7] Create commit');
      console.log('  [8] Create PR');
      console.log('  [9] View selection');
      console.log('  [0] Exit');
      console.log();

      const choice = await this.prompt('Select option: ');

      switch (choice) {
        case '1':
          listFixes(this.manifestPath);
          break;

        case '2': {
          const idx = await this.prompt('Enter fix index: ');
          reviewFix(this.manifestPath, parseInt(idx, 10));
          break;
        }

        case '3': {
          console.log('\nSelect severity (comma-separated):');
          console.log('  critical, high, medium, low');
          const sevInput = await this.prompt('Severities: ');
          const severities = sevInput.split(',').map(s => s.trim().toLowerCase());
          this.selectBySeverity(severities);
          break;
        }

        case '4': {
          console.log('\nSelect category (comma-separated):');
          console.log('  security, dependency_vulnerability, code_quality, performance');
          const catInput = await this.prompt('Categories: ');
          const categories = catInput.split(',').map(c => c.trim().toLowerCase());
          this.selectByCategory(categories);
          break;
        }

        case '5': {
          console.log('\nEnter fix indices (comma-separated, e.g., 1,3,5-10):');
          const indInput = await this.prompt('Indices: ');
          this.selectByIndices(indInput);
          break;
        }

        case '6':
          this.previewCommit();
          break;

        case '7': {
          const dryRun = await this.prompt('Dry run? (y/n): ');
          const customMsg = await this.prompt('Custom message (or Enter for default): ');
          this.createCommit(dryRun.toLowerCase() === 'y', customMsg || undefined);
          break;
        }

        case '8': {
          const branchName = await this.prompt('Branch name (default: fix/codequal-auto-fixes): ');
          const prDryRun = await this.prompt('Dry run? (y/n): ');
          this.createPullRequest(
            branchName || 'fix/codequal-auto-fixes',
            prDryRun.toLowerCase() === 'y'
          );
          break;
        }

        case '9':
          console.log(`\nSelected ${this.selectedIndices.size} fixes: ${[...this.selectedIndices].join(', ')}`);
          break;

        case '0':
          console.log(colorize('\nGoodbye!', 'cyan'));
          this.close();
          return;

        default:
          console.log(colorize('Invalid option', 'red'));
      }
    }
  }

  private selectBySeverity(severities: string[]): void {
    const allFixes = getAllFixes(this.manifestPath);

    for (let i = 0; i < allFixes.length; i++) {
      // Use manifest's autoFixable (authoritative) instead of details.metadata.safe_auto_apply
      if (severities.includes(allFixes[i].severity) && allFixes[i].fix.autoFixable) {
        this.selectedIndices.add(i + 1);
      }
    }

    console.log(colorize(`\nSelected ${this.selectedIndices.size} fixes`, 'green'));
  }

  private selectByCategory(categories: string[]): void {
    const allFixes = getAllFixes(this.manifestPath);

    for (let i = 0; i < allFixes.length; i++) {
      // Use manifest's autoFixable (authoritative) instead of details.metadata.safe_auto_apply
      if (categories.includes(allFixes[i].fix.category) && allFixes[i].fix.autoFixable) {
        this.selectedIndices.add(i + 1);
      }
    }

    console.log(colorize(`\nSelected ${this.selectedIndices.size} fixes`, 'green'));
  }

  private selectByIndices(input: string): void {
    const parts = input.split(',');
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
        for (let i = start; i <= end; i++) {
          this.selectedIndices.add(i);
        }
      } else {
        this.selectedIndices.add(parseInt(part.trim(), 10));
      }
    }

    console.log(colorize(`\nSelected ${this.selectedIndices.size} fixes`, 'green'));
  }

  private previewCommit(): void {
    const commits = generateCommitInfo(this.manifestPath, { indices: [...this.selectedIndices] });

    if (commits.length === 0) {
      console.log(colorize('\nNo fixes selected or no auto-fixable fixes in selection', 'yellow'));
      return;
    }

    console.log(colorize('\nCommit Preview', 'bold'));
    console.log('='.repeat(60));

    for (const commit of commits) {
      console.log(`\n${colorize(commit.title, 'cyan')}`);
      console.log('-'.repeat(60));
      console.log(commit.body);
    }
  }

  private createCommit(dryRun: boolean, customMessage?: string): void {
    const commits = generateCommitInfo(this.manifestPath, { indices: [...this.selectedIndices] });

    if (commits.length === 0) {
      console.log(colorize('\nNo fixes selected', 'yellow'));
      return;
    }

    for (const commit of commits) {
      executeCommit(commit, dryRun, customMessage);
    }
  }

  private createPullRequest(branchName: string, dryRun: boolean): void {
    const commits = generateCommitInfo(this.manifestPath, { indices: [...this.selectedIndices] });

    if (commits.length === 0) {
      console.log(colorize('\nNo fixes selected', 'yellow'));
      return;
    }

    const prInfo = generatePRDescription(this.manifestPath, commits);
    createPR(prInfo, branchName, dryRun);
  }
}

// Apply fixes for a severity level
async function applyFixes(manifestPath: string, severity?: string): Promise<void> {
  console.log('\n=== Apply Fixes ===\n');
  console.log('NOTE: This is a preview mode. Actual fix application requires:');
  console.log('  1. The fix executor with API key');
  console.log('  2. Repository clone or local path');
  console.log('\nFor now, showing what would be applied:\n');

  const summary = generateSummary(manifestPath);
  const filtered = severity
    ? summary.filter((s) => s.severity === severity)
    : summary;

  let totalOccurrences = 0;
  const fileSet = new Set<string>();

  for (const fix of filtered) {
    console.log(`[${fix.severity.toUpperCase()}] ${fix.rule} (${fix.occurrences} occurrences)`);
    console.log(`  Tool: ${fix.tool}`);
    console.log(`  Auto-fixable: ${fix.autoFixable ? 'Yes' : 'No'}`);
    console.log(`  Confidence: ${fix.confidence}`);
    console.log(`  Files: ${fix.files.slice(0, 3).join(', ')}${fix.files.length > 3 ? ` (+${fix.files.length - 3} more)` : ''}`);
    console.log('');

    totalOccurrences += fix.occurrences;
    fix.files.forEach((f) => fileSet.add(f));
  }

  console.log('\n--- Summary ---');
  console.log(`Total fix groups: ${filtered.length}`);
  console.log(`Total issues to fix: ${totalOccurrences}`);
  console.log(`Files affected: ${fileSet.size}`);
  console.log(`Auto-fixable: ${filtered.filter((f) => f.autoFixable).length}`);
  console.log(`Manual review: ${filtered.filter((f) => !f.autoFixable).length}`);
}

// Main CLI handler
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
${colorize('Fix Review and Apply Tool - V9 Universal Analysis', 'cyan')}

Usage:
  npx ts-node fix-review-and-apply.ts <command> [options]

Commands:
  list <manifest.json>                    List all fixes
  review <manifest.json> <index>          Review specific fix
  apply <manifest.json> [severity]        Preview fix application
  summary <manifest.json>                 Generate JSON summary
  commit <manifest.json> [options]        Create commit(s)
  pr <manifest.json> [options]            Create PR
  interactive <manifest.json>             Start interactive mode

Commit Options:
  --severity <list>   Comma-separated: critical,high,medium,low
  --category <list>   Comma-separated: security,code_quality,etc
  --indices <list>    Comma-separated: 1,3,5-10
  --all               Select all auto-fixable issues
  --dry-run           Preview without making changes
  --message <msg>     Custom commit message
  --branch <name>     Branch name for PR

Examples:
  # Start interactive mode
  npx ts-node fix-review-and-apply.ts interactive test-outputs/manifest.json

  # Commit all high severity fixes
  npx ts-node fix-review-and-apply.ts commit test-outputs/manifest.json --severity high

  # Create PR with all security fixes
  npx ts-node fix-review-and-apply.ts pr test-outputs/manifest.json --category security --branch fix/security-issues
`);
    return;
  }

  // Parse options
  const options: Record<string, string | boolean> = {};
  for (let i = 2; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        options[key] = args[i + 1];
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  switch (command) {
    case 'list': {
      const manifestPath = args[1];
      if (!manifestPath) {
        console.error('Usage: list <manifest.json>');
        return;
      }
      listFixes(manifestPath);
      break;
    }

    case 'review': {
      const manifestPath = args[1];
      const index = parseInt(args[2], 10);
      if (!manifestPath || isNaN(index)) {
        console.error('Usage: review <manifest.json> <index>');
        return;
      }
      reviewFix(manifestPath, index);
      break;
    }

    case 'apply': {
      const manifestPath = args[1];
      const severity = args[2];
      if (!manifestPath) {
        console.error('Usage: apply <manifest.json> [severity]');
        return;
      }
      await applyFixes(manifestPath, severity);
      break;
    }

    case 'summary': {
      const manifestPath = args[1];
      if (!manifestPath) {
        console.error('Usage: summary <manifest.json>');
        return;
      }
      const summary = generateSummary(manifestPath);
      console.log(JSON.stringify(summary, null, 2));
      break;
    }

    case 'commit': {
      const manifestPath = args[1];
      if (!manifestPath) {
        console.error('Usage: commit <manifest.json> [options]');
        return;
      }

      const selection: {
        severities?: string[];
        categories?: string[];
        indices?: number[];
        all?: boolean;
      } = {};

      if (options['all']) {
        selection.all = true;
      }
      if (options['severity']) {
        selection.severities = (options['severity'] as string).split(',').map(s => s.trim());
      }
      if (options['category']) {
        selection.categories = (options['category'] as string).split(',').map(c => c.trim());
      }
      if (options['indices']) {
        selection.indices = (options['indices'] as string).split(',').map(i => parseInt(i.trim(), 10));
      }

      const commits = generateCommitInfo(manifestPath, selection);
      const dryRun = !!options['dry-run'];
      const customMessage = options['message'] as string;

      for (const commit of commits) {
        executeCommit(commit, dryRun, customMessage);
      }
      break;
    }

    case 'pr': {
      const manifestPath = args[1];
      if (!manifestPath) {
        console.error('Usage: pr <manifest.json> [options]');
        return;
      }

      const selection: {
        severities?: string[];
        categories?: string[];
        indices?: number[];
        all?: boolean;
      } = {};

      if (options['all']) {
        selection.all = true;
      }
      if (options['severity']) {
        selection.severities = (options['severity'] as string).split(',').map(s => s.trim());
      }
      if (options['category']) {
        selection.categories = (options['category'] as string).split(',').map(c => c.trim());
      }
      if (options['indices']) {
        selection.indices = (options['indices'] as string).split(',').map(i => parseInt(i.trim(), 10));
      }

      const commits = generateCommitInfo(manifestPath, selection);
      const prInfo = generatePRDescription(manifestPath, commits);
      const branchName = (options['branch'] as string) || 'fix/codequal-auto-fixes';
      const dryRun = !!options['dry-run'];

      createPR(prInfo, branchName, dryRun);
      break;
    }

    case 'interactive': {
      const manifestPath = args[1];
      if (!manifestPath) {
        console.error('Usage: interactive <manifest.json>');
        return;
      }
      const cli = new InteractiveCLI(manifestPath);
      await cli.run();
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
  }
}

main().catch(console.error);
