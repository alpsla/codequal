/**
 * PRO Tier Report Generator Test with PR #69 Issues
 *
 * Tests:
 * 1. Loading real issues from PR #69 manifest
 * 2. PRO report generation with multi-format output
 * 3. User selection modes (all, by_severity, by_category, individual)
 * 4. Unfixable issue explanations
 *
 * Usage:
 *   npx ts-node --transpile-only tests/integration/test-pro-report-with-pr69.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  PROReportGenerator,
  generatePROReport,
  applyPROSelection,
  type PROUserSelection,
} from '../../src/fix-agent/services/pro-report-generator';
import type { FixReport, FixReportIssue, IssueCategory, IssueSeverity } from '../../src/fix-agent/types/fix-report-types';

const TEST_OUTPUTS_DIR = path.resolve(__dirname, 'test-outputs');
const MANIFEST_FILE = path.join(TEST_OUTPUTS_DIR, 'codequal-pr-#69---v9-footer-fixes-manifest.json');
const OUTPUT_DIR = path.join(TEST_OUTPUTS_DIR, 'pro-report-test');

interface ManifestFile {
  filename: string;
  url: string;
  fallback_path: string;
  severity: string;
  category: string;
  rule: string;
  title: string;
  description: string;
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
    critical: ManifestFile[];
    high: ManifestFile[];
    medium: ManifestFile[];
    low: ManifestFile[];
    info?: ManifestFile[];
  };
}

/**
 * Helper to generate deterministic hash for an issue
 */
function generateIssueHash(filePath: string, lineNumber: number, ruleId: string): string {
  const data = `${filePath}:${lineNumber}:${ruleId}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Map manifest category to IssueCategory type
 */
function mapCategory(category: string): IssueCategory {
  const lower = category.toLowerCase();
  if (lower.includes('security')) return 'security';
  if (lower.includes('quality')) return 'code_quality';
  if (lower.includes('performance')) return 'performance';
  if (lower.includes('architecture')) return 'architecture';
  if (lower.includes('dependency') || lower.includes('vulnerabilit')) return 'dependency_vulnerability';
  if (lower.includes('style')) return 'code_style';
  if (lower.includes('best')) return 'best_practice';
  if (lower.includes('doc')) return 'documentation';
  return 'code_quality';
}

/**
 * Convert manifest files to FixReportIssue format (correct interface)
 */
function manifestToIssues(manifest: Manifest, fixReportId: string): FixReportIssue[] {
  const issues: FixReportIssue[] = [];
  let issueId = 1;

  const processSeverity = (files: ManifestFile[], severity: IssueSeverity) => {
    for (const file of files) {
      // Create one issue per occurrence to simulate real data
      for (let i = 0; i < Math.min(file.occurrences, 5); i++) {
        const filePath = `src/example/${file.rule.split('.').pop()}-${i}.ts`;
        const lineNumber = 10 + i * 10;
        const tool = file.rule.includes('semgrep') ? 'semgrep' :
              file.rule.includes('eslint') ? 'eslint' :
              file.rule.includes('typescript') || file.rule.startsWith('TS') ? 'typescript' :
              file.rule.includes('npm') ? 'npm-audit' : 'analyzer';

        issues.push({
          id: `issue-${issueId++}`,
          fixReportId,
          issueHash: generateIssueHash(filePath, lineNumber, file.rule),

          // Issue location
          filePath,
          lineNumber,
          columnNumber: 1,

          // Classification
          ruleId: file.rule,
          tool,
          category: mapCategory(file.category),
          severity,

          // Issue content
          message: file.title,
          description: file.description,
          codeSnippet: `// Sample code for ${file.rule}`,

          // Issue status
          issueType: 'new',

          // Fix availability
          fixAvailable: file.autoFixable,
          fixSource: file.autoFixable ? 'ai_generated' : undefined,
          fixConfidence: file.autoFixable ? 0.85 : undefined,
          fixedCode: file.autoFixable ? `// Fixed code for ${file.rule}` : undefined,

          // Special handling
          isIntentionalUse: false,

          // User selection
          userSelected: false,

          // Timestamp
          createdAt: new Date(),
        });
      }
    }
  };

  processSeverity(manifest.files.critical || [], 'critical');
  processSeverity(manifest.files.high || [], 'high');
  processSeverity(manifest.files.medium || [], 'medium');
  processSeverity(manifest.files.low || [], 'low');

  return issues;
}

/**
 * Create FixReport from manifest
 */
function createFixReport(manifest: Manifest): FixReport {
  return {
    id: `report-pr69-${Date.now()}`,
    repositoryUrl: `https://github.com/${manifest.metadata.repository}`,
    prNumber: 69,
    baseBranch: 'main',
    headBranch: 'v9-footer-fixes',
    userTier: 'pro',
    totalIssues: manifest.metadata.total_issues,
    fixableIssues: 0, // Will be calculated
    autoFixedCount: 0,
    manualReviewCount: 0,
    intentionalUseCount: 0,
    apiCostUsd: 0,
    patternReuseCount: 0,
    status: 'completed',
    createdAt: new Date(manifest.metadata.generated_at),
  };
}

async function runTests() {
  console.log('═'.repeat(70));
  console.log('PRO TIER REPORT GENERATOR TEST WITH PR #69');
  console.log('═'.repeat(70));
  console.log();

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load manifest
  console.log('📂 Loading PR #69 manifest...');
  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error(`❌ Manifest file not found: ${MANIFEST_FILE}`);
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
  console.log(`   Repository: ${manifest.metadata.repository}`);
  console.log(`   Total issues: ${manifest.metadata.total_issues}`);
  console.log(`   Generated: ${manifest.metadata.generated_at}`);
  console.log();

  // Create report first (need id for issues)
  const report = createFixReport(manifest);

  // Convert to issues
  console.log('🔄 Converting manifest to FixReportIssue format...');
  const issues = manifestToIssues(manifest, report.id);

  // Update stats
  report.fixableIssues = issues.filter(i => i.fixAvailable).length;
  report.manualReviewCount = issues.filter(i => !i.fixAvailable).length;
  report.totalIssues = issues.length;

  console.log(`   Converted ${issues.length} issues`);
  console.log(`   Auto-fixable: ${report.fixableIssues}`);
  console.log(`   Manual review: ${report.manualReviewCount}`);
  console.log();

  // Test 1: Generate PRO Report with all formats
  console.log('═'.repeat(70));
  console.log('TEST 1: Generate PRO Report with Multi-Format Output');
  console.log('═'.repeat(70));

  let proReport: Awaited<ReturnType<typeof generatePROReport>> | null = null;

  try {
    proReport = await generatePROReport(report, issues, {
      outputDir: OUTPUT_DIR,
      generateSARIF: true,
      generateGitLab: true,
    });

    console.log('✅ PRO Report generated successfully!');
    console.log();
    console.log('   Statistics:');
    console.log(`   - Total issues: ${proReport.stats.total}`);
    console.log(`   - Auto-fixable: ${proReport.stats.autoFixable}`);
    console.log(`   - Manual review: ${proReport.stats.manualReview}`);
    console.log(`   - Intentional use: ${proReport.stats.intentionalUse}`);
    console.log(`   - Fix rate: ${(proReport.stats.fixRate * 100).toFixed(1)}%`);
    console.log(`   - Pattern reuse: ${proReport.stats.patternReuse}`);
    console.log(`   - API cost: $${proReport.stats.costUsd.toFixed(4)}`);
    console.log();

    // Check selection options (flat array with different modes)
    const severityOptions = proReport.selectionOptions.filter(
      opt => opt.mode === 'by_severity' || opt.id.startsWith('severity-')
    );
    const categoryOptions = proReport.selectionOptions.filter(
      opt => opt.mode === 'by_category' || opt.id.startsWith('category-')
    );
    console.log('   Selection Options for UI:');
    console.log(`   - Total options: ${proReport.selectionOptions.length}`);
    console.log(`   - Severity groups: ${severityOptions.length}`);
    console.log(`   - Category groups: ${categoryOptions.length}`);
    console.log();
    console.log('   Available Options:');
    proReport.selectionOptions.slice(0, 5).forEach(opt => {
      console.log(`     • ${opt.label} (${opt.count} issues)`);
    });
    console.log();

    // Check unfixable explanations
    console.log('   Unfixable Explanations:');
    console.log(`   - ${proReport.unfixableExplanations.length} unique rules explained`);
    if (proReport.unfixableExplanations.length > 0) {
      proReport.unfixableExplanations.slice(0, 3).forEach(exp => {
        console.log(`     • ${exp.ruleId}: ${exp.reason}`);
      });
    }
    console.log();

    // Check output strings
    console.log('   Output Formats Generated:');
    if (proReport.outputs.sarif) {
      const sarifObj = JSON.parse(proReport.outputs.sarif);
      console.log(`   ✅ SARIF: ${sarifObj.runs[0].results.length} results`);
    }
    if (proReport.outputs.gitlabCodeQuality) {
      const glObj = JSON.parse(proReport.outputs.gitlabCodeQuality);
      console.log(`   ✅ GitLab Code Quality: ${glObj.length} issues`);
    }
    console.log(`   ✅ Markdown Summary: ${proReport.outputs.markdownSummary.length} chars`);
    console.log(`   ✅ HTML Report: ${proReport.outputs.htmlReport.length} chars`);
    console.log(`   ✅ JSON Data: ${proReport.outputs.jsonData.length} chars`);
    if (proReport.outputs.lspCodeActions) {
      console.log(`   ✅ LSP Code Actions: ${proReport.outputs.lspCodeActions.length} chars`);
    }
    console.log();

    // Save outputs to files for inspection
    if (proReport.outputs.sarif) {
      fs.writeFileSync(path.join(OUTPUT_DIR, 'pro-report.sarif'), proReport.outputs.sarif);
    }
    if (proReport.outputs.gitlabCodeQuality) {
      fs.writeFileSync(path.join(OUTPUT_DIR, 'pro-report-gitlab.json'), proReport.outputs.gitlabCodeQuality);
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, 'pro-report.md'), proReport.outputs.markdownSummary);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'pro-report.html'), proReport.outputs.htmlReport);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'pro-report-data.json'), proReport.outputs.jsonData);
    console.log('   ✅ Output files written to:', OUTPUT_DIR);
    console.log();

  } catch (error: any) {
    console.error('❌ Test 1 failed:', error.message);
    console.error(error.stack);
  }

  // Test 2: User Selection - By Severity (High only)
  console.log('═'.repeat(70));
  console.log('TEST 2: User Selection - High Severity Only');
  console.log('═'.repeat(70));

  try {
    const highOnlySelection: PROUserSelection = {
      mode: 'by_severity',
      severities: ['high'],
      commitStyle: 'grouped',
    };

    const highResult = await applyPROSelection(report, issues, highOnlySelection);

    console.log('✅ High severity selection applied!');
    console.log(`   Issues selected: ${highResult.appliedCount}`);
    console.log(`   Commit previews: ${highResult.commitPreviews.length}`);
    if (highResult.commitPreviews.length > 0) {
      console.log(`   First commit: "${highResult.commitPreviews[0].title}"`);
      console.log(`   Files affected: ${highResult.commitPreviews[0].files.length}`);
    }
    console.log();

  } catch (error: any) {
    console.error('❌ Test 2 failed:', error.message);
  }

  // Test 3: User Selection - By Category (Security only)
  console.log('═'.repeat(70));
  console.log('TEST 3: User Selection - Security Category Only');
  console.log('═'.repeat(70));

  try {
    const securityOnlySelection: PROUserSelection = {
      mode: 'by_category',
      categories: ['security'],
      commitStyle: 'per_file',
    };

    const securityResult = await applyPROSelection(report, issues, securityOnlySelection);

    console.log('✅ Security category selection applied!');
    console.log(`   Issues selected: ${securityResult.appliedCount}`);
    console.log(`   Commit previews: ${securityResult.commitPreviews.length}`);
    console.log();

  } catch (error: any) {
    console.error('❌ Test 3 failed:', error.message);
  }

  // Test 4: User Selection - Individual Issues
  console.log('═'.repeat(70));
  console.log('TEST 4: User Selection - Individual Issues (First 5)');
  console.log('═'.repeat(70));

  try {
    const individualSelection: PROUserSelection = {
      mode: 'individual',
      issueIds: issues.slice(0, 5).map(i => i.id),
      commitStyle: 'single',
    };

    const individualResult = await applyPROSelection(report, issues, individualSelection);

    console.log('✅ Individual selection applied!');
    console.log(`   Issues selected: ${individualResult.appliedCount}`);
    console.log(`   Commit previews: ${individualResult.commitPreviews.length}`);
    if (individualResult.commitPreviews.length > 0) {
      console.log(`   Commit title: "${individualResult.commitPreviews[0].title}"`);
    }
    console.log();

  } catch (error: any) {
    console.error('❌ Test 4 failed:', error.message);
  }

  // Test 5: Fix All Auto-fixable
  console.log('═'.repeat(70));
  console.log('TEST 5: Fix All Auto-fixable Issues');
  console.log('═'.repeat(70));

  try {
    const fixAllSelection: PROUserSelection = {
      mode: 'all',
      commitStyle: 'grouped',
    };

    const fixAllResult = await applyPROSelection(report, issues, fixAllSelection);

    console.log('✅ Fix all applied!');
    console.log(`   Issues selected: ${fixAllResult.appliedCount}`);
    console.log(`   Skipped (not auto-fixable): ${fixAllResult.skippedCount}`);
    console.log(`   Commit previews: ${fixAllResult.commitPreviews.length}`);
    console.log();

  } catch (error: any) {
    console.error('❌ Test 5 failed:', error.message);
  }

  // Test 6: Verify Selection Options from Generated Report
  console.log('═'.repeat(70));
  console.log('TEST 6: Selection Options Analysis');
  console.log('═'.repeat(70));

  try {
    if (proReport) {
      console.log('✅ Selection options from PRO report:');
      console.log();

      // Group by mode for display
      const byMode: Record<string, typeof proReport.selectionOptions> = {};
      for (const opt of proReport.selectionOptions) {
        const mode = opt.mode || 'other';
        if (!byMode[mode]) byMode[mode] = [];
        byMode[mode].push(opt);
      }

      for (const [mode, options] of Object.entries(byMode)) {
        console.log(`   ${mode.toUpperCase()} Options:`);
        options.forEach(opt => {
          console.log(`   - ${opt.label}: ${opt.count} issues (enabled: ${opt.enabled})`);
        });
        console.log();
      }
    } else {
      console.log('⚠️ PRO report not available (Test 1 may have failed)');
    }

  } catch (error: any) {
    console.error('❌ Test 6 failed:', error.message);
  }

  // Summary
  console.log('═'.repeat(70));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(70));
  console.log();
  console.log('PR #69 Issue Statistics:');

  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byTool: Record<string, number> = {};

  issues.forEach(issue => {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
    byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
  });

  console.log();
  console.log('By Severity:');
  Object.entries(bySeverity).sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a[0]] || 4) - (order[b[0]] || 4);
  }).forEach(([sev, count]) => {
    console.log(`  ${sev.toUpperCase()}: ${count}`);
  });

  console.log();
  console.log('By Category:');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  console.log();
  console.log('By Tool:');
  Object.entries(byTool).sort((a, b) => b[1] - a[1]).forEach(([tool, count]) => {
    console.log(`  ${tool}: ${count}`);
  });

  console.log();
  console.log('Output files saved to:', OUTPUT_DIR);
  console.log('═'.repeat(70));
}

// Run tests
runTests().catch(console.error);
