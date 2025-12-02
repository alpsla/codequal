/**
 * Fix Manifest Generator
 *
 * Generates a comprehensive manifest for batch fixing that includes:
 * 1. Issue summary grouped by severity
 * 2. Ready-to-run commands for each severity level
 * 3. GitHub/GitLab integration commands
 * 4. Human-readable fix guide
 *
 * This is the "1-click" solution - users just run the command they need.
 *
 * @module fix-agent/fix-manifest-generator
 */

import * as fs from 'fs';
import * as path from 'path';
import { FixRequest } from './universal-fix-executor';

// ============================================================================
// Types
// ============================================================================

export interface ManifestMetadata {
  repository: string;
  prNumber?: number;
  branch?: string;
  commit?: string;
  generatedAt?: string;
  analyzedAt?: string;
}

export interface SeverityGroup {
  severity: 'critical' | 'high' | 'medium' | 'low';
  count: number;
  files: string[];
  issues: FixRequest[];
  command: string;
}

export interface FixManifest {
  version: string;
  metadata: ManifestMetadata;
  summary: {
    totalIssues: number;
    totalFiles: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  };
  groups: SeverityGroup[];
  commands: {
    fixAll: string;
    fixCritical: string;
    fixHigh: string;
    fixMedium: string;
    fixLow: string;
    dryRun: string;
    gitCommit: string;
    createPR: string;
  };
  files: {
    lspActions: string;
    sarif?: string;
    manifest: string;
    guide: string;
  };
}

// ============================================================================
// Generator Class
// ============================================================================

export class FixManifestGenerator {
  private outputDir: string;
  private metadata: ManifestMetadata;

  constructor(
    outputDir: string,
    metadata: ManifestMetadata
  ) {
    this.outputDir = outputDir;
    this.metadata = {
      ...metadata,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate complete manifest from issues
   */
  async generate(issues: FixRequest[]): Promise<FixManifest> {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Group by severity
    const groups = this.groupBySeverity(issues);

    // Calculate summary
    const summary = this.calculateSummary(issues);

    // Generate commands
    const commands = this.generateCommands();

    // Create manifest
    const manifest: FixManifest = {
      version: '1.0.0',
      metadata: this.metadata,
      summary,
      groups,
      commands,
      files: {
        lspActions: 'codequal-lsp-actions.json',
        sarif: 'codequal-sarif-report.json',
        manifest: 'codequal-fix-manifest.json',
        guide: 'CODEQUAL-FIX-GUIDE.md'
      }
    };

    // Write all artifacts
    await this.writeArtifacts(manifest, issues);

    return manifest;
  }

  /**
   * Group issues by severity
   */
  private groupBySeverity(issues: FixRequest[]): SeverityGroup[] {
    const groups: SeverityGroup[] = [];
    const severities: Array<'critical' | 'high' | 'medium' | 'low'> = [
      'critical', 'high', 'medium', 'low'
    ];

    for (const severity of severities) {
      const severityIssues = issues.filter(i => i.severity === severity);
      const files = Array.from(new Set(severityIssues.map(i => i.file)));

      if (severityIssues.length > 0) {
        groups.push({
          severity,
          count: severityIssues.length,
          files,
          issues: severityIssues,
          command: `npx codequal-fix --lsp-actions codequal-lsp-actions.json --severity ${severity}`
        });
      }
    }

    return groups;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(issues: FixRequest[]): FixManifest['summary'] {
    const bySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    const byCategory: Record<string, number> = {};
    const files = new Set<string>();

    for (const issue of issues) {
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;

      if (issue.category) {
        byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      }

      if (issue.file) {
        files.add(issue.file);
      }
    }

    return {
      totalIssues: issues.length,
      totalFiles: files.size,
      bySeverity,
      byCategory
    };
  }

  /**
   * Generate command strings
   */
  private generateCommands(): FixManifest['commands'] {
    const lspFile = 'codequal-lsp-actions.json';

    return {
      fixAll: `npx codequal-fix --lsp-actions ${lspFile} --all`,
      fixCritical: `npx codequal-fix --lsp-actions ${lspFile} --severity critical`,
      fixHigh: `npx codequal-fix --lsp-actions ${lspFile} --severity critical,high`,
      fixMedium: `npx codequal-fix --lsp-actions ${lspFile} --severity medium`,
      fixLow: `npx codequal-fix --lsp-actions ${lspFile} --severity low`,
      dryRun: `npx codequal-fix --lsp-actions ${lspFile} --all --dry-run`,
      gitCommit: 'git add -A && git commit -m "fix: apply CodeQual auto-fixes"',
      createPR: 'gh pr create --title "fix: CodeQual auto-fixes" --body "Automated fixes from CodeQual analysis"'
    };
  }

  /**
   * Write all artifacts to output directory
   */
  private async writeArtifacts(
    manifest: FixManifest,
    issues: FixRequest[]
  ): Promise<void> {
    // Write manifest JSON
    fs.writeFileSync(
      path.join(this.outputDir, 'codequal-fix-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Write issues JSON (for CLI)
    fs.writeFileSync(
      path.join(this.outputDir, 'codequal-issues.json'),
      JSON.stringify(issues, null, 2)
    );

    // Write human-readable guide
    const guide = this.generateGuide(manifest);
    fs.writeFileSync(
      path.join(this.outputDir, 'CODEQUAL-FIX-GUIDE.md'),
      guide
    );

    // Write shell script for easy execution
    const script = this.generateShellScript(manifest);
    const scriptPath = path.join(this.outputDir, 'codequal-fix.sh');
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, '755');

    console.log(`\n✅ Generated fix artifacts in ${this.outputDir}/`);
    console.log('   - codequal-fix-manifest.json');
    console.log('   - codequal-issues.json');
    console.log('   - CODEQUAL-FIX-GUIDE.md');
    console.log('   - codequal-fix.sh');
  }

  /**
   * Generate human-readable fix guide
   */
  private generateGuide(manifest: FixManifest): string {
    const { summary, groups, commands, metadata } = manifest;

    return `# CodeQual Fix Guide

**Repository:** ${metadata.repository}
${metadata.prNumber ? `**PR:** #${metadata.prNumber}` : ''}
${metadata.branch ? `**Branch:** ${metadata.branch}` : ''}
**Generated:** ${metadata.generatedAt}

---

## Summary

| Severity | Issues | Action |
|----------|--------|--------|
| 🔴 Critical | ${summary.bySeverity.critical} | Fix immediately |
| 🟠 High | ${summary.bySeverity.high} | Fix before merge |
| 🟡 Medium | ${summary.bySeverity.medium} | Recommended |
| 🟢 Low | ${summary.bySeverity.low} | Nice to have |
| **Total** | **${summary.totalIssues}** | |

**Files affected:** ${summary.totalFiles}

---

## Quick Start (1-Click Fixes)

### Prerequisites

1. Set your API key:
\`\`\`bash
export OPENROUTER_API_KEY=your-key-here
# OR
export ANTHROPIC_API_KEY=your-key-here
\`\`\`

2. Install dependencies (if not already):
\`\`\`bash
npm install
\`\`\`

### Fix Commands

#### Fix Critical & High Severity (Recommended)
\`\`\`bash
${commands.fixHigh}
\`\`\`

#### Fix All Issues
\`\`\`bash
${commands.fixAll}
\`\`\`

#### Preview Changes (Dry Run)
\`\`\`bash
${commands.dryRun}
\`\`\`

#### Fix by Severity

| Severity | Command |
|----------|---------|
| Critical | \`${commands.fixCritical}\` |
| High | \`${commands.fixHigh}\` |
| Medium | \`${commands.fixMedium}\` |
| Low | \`${commands.fixLow}\` |

---

## After Fixing

### Commit Changes
\`\`\`bash
${commands.gitCommit}
\`\`\`

### Create PR
\`\`\`bash
${commands.createPR}
\`\`\`

### Or Use the Shell Script
\`\`\`bash
./codequal-fix.sh --high      # Fix critical + high
./codequal-fix.sh --all       # Fix all
./codequal-fix.sh --commit    # Fix all and commit
\`\`\`

---

## Issues by Severity

${groups.map(g => `### ${this.getSeverityEmoji(g.severity)} ${g.severity.charAt(0).toUpperCase() + g.severity.slice(1)} (${g.count} issues)

**Files:** ${g.files.length}

${g.issues.slice(0, 10).map(i =>
  `- **${i.file}:${i.line}** - ${i.message.substring(0, 80)}${i.message.length > 80 ? '...' : ''}`
).join('\n')}
${g.issues.length > 10 ? `\n*...and ${g.issues.length - 10} more*` : ''}

\`\`\`bash
${g.command}
\`\`\`
`).join('\n')}

---

## Alternative: Manual IDE Fix

If you prefer using your IDE's AI assistant:

1. Open \`codequal-lsp-actions.json\` in VS Code/Cursor
2. Use the extension to load fixes
3. Apply via Quick Fix menu (Ctrl+.)

---

*Generated by CodeQual - AI-Powered Code Quality*
`;
  }

  /**
   * Generate shell script for easy execution
   */
  private generateShellScript(manifest: FixManifest): string {
    return `#!/bin/bash
# CodeQual Fix Script
# Repository: ${manifest.metadata.repository}
# Generated: ${manifest.metadata.generatedAt}

set -e

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

# Check for API key
if [ -z "$OPENROUTER_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "\${RED}Error: No API key found\${NC}"
    echo "Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY"
    exit 1
fi

# Default values
SEVERITY="critical,high"
DRY_RUN=""
COMMIT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --all|-a)
            SEVERITY="critical,high,medium,low"
            shift
            ;;
        --critical)
            SEVERITY="critical"
            shift
            ;;
        --high)
            SEVERITY="critical,high"
            shift
            ;;
        --medium)
            SEVERITY="critical,high,medium"
            shift
            ;;
        --low)
            SEVERITY="critical,high,medium,low"
            shift
            ;;
        --dry-run|-d)
            DRY_RUN="--dry-run"
            shift
            ;;
        --commit|-c)
            COMMIT="yes"
            shift
            ;;
        --help|-h)
            echo "CodeQual Fix Script"
            echo ""
            echo "Usage: ./codequal-fix.sh [options]"
            echo ""
            echo "Options:"
            echo "  --all, -a      Fix all severity levels"
            echo "  --critical     Fix critical only"
            echo "  --high         Fix critical + high (default)"
            echo "  --medium       Fix critical + high + medium"
            echo "  --low          Fix all levels"
            echo "  --dry-run, -d  Preview without applying"
            echo "  --commit, -c   Auto-commit after fixing"
            echo "  --help, -h     Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "\${GREEN}🔧 CodeQual Batch Fix\${NC}"
echo "=========================="
echo "Severity: $SEVERITY"
echo ""

# Run fix command
npx ts-node ./packages/agents/src/fix-agent/cli.ts \\
    --lsp-actions ./codequal-lsp-actions.json \\
    --severity "$SEVERITY" \\
    $DRY_RUN

# Auto-commit if requested
if [ "$COMMIT" = "yes" ] && [ -z "$DRY_RUN" ]; then
    echo ""
    echo -e "\${YELLOW}📝 Committing changes...\${NC}"
    git add -A
    git commit -m "fix: apply CodeQual auto-fixes

Severity levels fixed: $SEVERITY

🤖 Generated with CodeQual"
    echo -e "\${GREEN}✅ Changes committed\${NC}"
fi

echo ""
echo -e "\${GREEN}🎉 Done!\${NC}"
`;
  }

  /**
   * Get emoji for severity
   */
  private getSeverityEmoji(severity: string): string {
    const emojis: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return emojis[severity] || '⚪';
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Generate manifest from LSP actions file
 */
export async function generateManifestFromLSP(
  lspActionsPath: string,
  outputDir: string,
  metadata: ManifestMetadata
): Promise<FixManifest> {
  // Read LSP actions
  const content = fs.readFileSync(lspActionsPath, 'utf-8');
  const lspActions = JSON.parse(content);

  // Convert to fix requests (skip batch actions)
  const issues: FixRequest[] = [];
  const individualActions = lspActions.slice(5);

  for (const action of individualActions) {
    const data = action.data;
    const diagnostic = action.diagnostics?.[0];
    const changes = action.edit?.changes;

    if (!changes) continue;

    const fileUri = Object.keys(changes)[0];
    if (!fileUri) continue;

    const file = fileUri.replace(/^file:\/\/[^/]*/, '').replace(/^\/tmp\/[^/]+\//, '');

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

  // Generate manifest
  const generator = new FixManifestGenerator(outputDir, metadata);
  return generator.generate(issues);
}
