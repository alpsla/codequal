/**
 * Generate PRO Tier Reports Test
 *
 * This script generates SARIF (GitHub) and GitLab Code Quality reports
 * from existing fix files to test the new report generators.
 *
 * Uses direct imports to avoid dependency chain issues.
 */

import * as fs from 'fs';
import * as path from 'path';

// Direct imports to avoid chain dependencies
import { SARIFGenerator } from '../../src/fix-agent/providers/sarif-generator';
import {
  GitLabCodeQualityGenerator,
  generateGitLabCIJobConfig,
} from '../../src/fix-agent/providers/gitlab-codequality-generator';
import { FixReportIssue, IssueSeverity, IssueCategory } from '../../src/fix-agent/types/fix-report-types';

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'test-outputs');
const ATTACHMENTS_DIR = path.join(OUTPUT_DIR, 'attachments');
const MANIFEST_FILE = path.join(OUTPUT_DIR, 'codequal-pr-#69---v9-footer-fixes-manifest.json');

// Fix file structure
interface FixFileLocation {
  file: string;
  line: number;
  snippet?: string;
  category?: string;
}

interface FixFile {
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
    example?: {
      before: string;
      after: string;
    };
    instructions?: string;
  };
  locations: FixFileLocation[];
}

// Manifest structure
interface Manifest {
  version: string;
  metadata: {
    repository: string;
    total_issues: number;
    total_fix_files: number;
    generated_at: string;
  };
  files: {
    critical: ManifestFileEntry[];
    high: ManifestFileEntry[];
    medium: ManifestFileEntry[];
    low: ManifestFileEntry[];
    info?: ManifestFileEntry[];
  };
}

interface ManifestFileEntry {
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

function mapSeverity(severity: string): IssueSeverity {
  const mapping: Record<string, IssueSeverity> = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    info: 'info',
  };
  return mapping[severity.toLowerCase()] || 'medium';
}

function mapCategory(category: string): IssueCategory {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('security')) return 'security';
  if (categoryLower.includes('vulnerability')) return 'dependency_vulnerability';
  if (categoryLower.includes('quality')) return 'code_quality';
  if (categoryLower.includes('performance')) return 'performance';
  if (categoryLower.includes('style')) return 'code_style';
  return 'code_quality';
}

function loadFixFilesFromManifest(manifest: Manifest): FixReportIssue[] {
  const issues: FixReportIssue[] = [];
  let issueId = 1;

  // Process all severity levels
  const allFiles = [
    ...(manifest.files.critical || []),
    ...(manifest.files.high || []),
    ...(manifest.files.medium || []),
    ...(manifest.files.low || []),
    ...(manifest.files.info || []),
  ];

  for (const fileEntry of allFiles) {
    const fixFilePath = path.join(ATTACHMENTS_DIR, fileEntry.filename);

    if (!fs.existsSync(fixFilePath)) {
      console.log(`  Skipping missing file: ${fileEntry.filename}`);
      continue;
    }

    try {
      const fixFile: FixFile = JSON.parse(fs.readFileSync(fixFilePath, 'utf-8'));

      for (const location of fixFile.locations) {
        issues.push({
          id: `issue-${issueId++}`,
          ruleId: fixFile.rule,
          tool: fixFile.tool,
          severity: mapSeverity(fixFile.severity),
          category: mapCategory(fileEntry.category),
          filePath: location.file,
          lineNumber: location.line,
          message: fixFile.description.substring(0, 200),
          description: fixFile.description,
          codeSnippet: location.snippet,
          fixAvailable: fileEntry.autoFixable,
          fixedCode: fixFile.fix_pattern.example?.after,
          fixSource: fixFile.fix_pattern.type as any,
          fixConfidence: fixFile.fix_pattern.confidence / 100,
          isIntentionalUse: location.category === 'EXISTING_REST',
        });
      }
    } catch (error: any) {
      console.log(`  Error loading ${fileEntry.filename}: ${error.message}`);
    }
  }

  return issues;
}

async function main() {
  console.log('='.repeat(60));
  console.log('PRO Tier Report Generation Test');
  console.log('='.repeat(60));
  console.log('');

  // Check if manifest exists
  if (!fs.existsSync(MANIFEST_FILE)) {
    console.error(`Manifest file not found: ${MANIFEST_FILE}`);
    console.log('Available files in output directory:');
    const files = fs.readdirSync(OUTPUT_DIR);
    files.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  }

  // Load manifest
  console.log(`Loading manifest: ${path.basename(MANIFEST_FILE)}`);
  const manifestContent = fs.readFileSync(MANIFEST_FILE, 'utf-8');
  const manifest: Manifest = JSON.parse(manifestContent);

  console.log(`\n📊 Manifest Summary:`);
  console.log(`  Repository: ${manifest.metadata.repository}`);
  console.log(`  Total Issues: ${manifest.metadata.total_issues}`);
  console.log(`  Total Fix Files: ${manifest.metadata.total_fix_files}`);
  console.log(`  Generated At: ${manifest.metadata.generated_at}`);

  // Count by severity
  console.log(`\n  Issues by Severity:`);
  console.log(`    Critical: ${manifest.files.critical?.length || 0} files`);
  console.log(`    High: ${manifest.files.high?.length || 0} files`);
  console.log(`    Medium: ${manifest.files.medium?.length || 0} files`);
  console.log(`    Low: ${manifest.files.low?.length || 0} files`);

  // Load issues from fix files
  console.log('\n  Loading issues from fix files...');
  const issues = loadFixFilesFromManifest(manifest);
  console.log(`  Loaded ${issues.length} issues from fix files`);

  if (issues.length === 0) {
    console.error('\n❌ No issues loaded. Check if attachments directory exists.');
    console.log(`Looking in: ${ATTACHMENTS_DIR}`);
    if (fs.existsSync(ATTACHMENTS_DIR)) {
      console.log('Files in attachments:', fs.readdirSync(ATTACHMENTS_DIR));
    }
    process.exit(1);
  }

  // Generate SARIF Report
  console.log('\n' + '-'.repeat(60));
  console.log('Generating SARIF Report (GitHub Code Scanning)');
  console.log('-'.repeat(60));

  const sarifGenerator = new SARIFGenerator({
    toolName: 'CodeQual',
    toolVersion: '9.0.0',
    toolInformationUri: 'https://codequal.dev',
    includeFixSuggestions: true,
    includeCodeSnippets: true,
    generateFingerprints: true,
  });

  const sarifPath = path.join(OUTPUT_DIR, 'codequal-sarif-report-v2.json');
  await sarifGenerator.generateToFile(issues, sarifPath, {
    repository: manifest.metadata.repository,
    analyzedAt: manifest.metadata.generated_at,
  });

  const sarifStats = fs.statSync(sarifPath);
  console.log(`✅ SARIF Report generated: ${path.basename(sarifPath)}`);
  console.log(`   Size: ${(sarifStats.size / 1024).toFixed(1)} KB`);

  // Read and show SARIF summary
  const sarifContent = JSON.parse(fs.readFileSync(sarifPath, 'utf-8'));
  console.log(`   Schema: ${sarifContent.$schema}`);
  console.log(`   Version: ${sarifContent.version}`);
  console.log(`   Rules: ${sarifContent.runs[0].tool.driver.rules.length}`);
  console.log(`   Results: ${sarifContent.runs[0].results.length}`);
  console.log(`   Results with fixes: ${sarifContent.runs[0].results.filter((r: any) => r.fixes?.length > 0).length}`);

  // Generate GitLab Code Quality Report
  console.log('\n' + '-'.repeat(60));
  console.log('Generating GitLab Code Quality Report');
  console.log('-'.repeat(60));

  const gitlabGenerator = new GitLabCodeQualityGenerator({
    includeFixSuggestions: true,
    includeCodeSnippets: true,
    includeRemediationPoints: true,
    toolNamePrefix: 'codequal',
  });

  const gitlabPath = path.join(OUTPUT_DIR, 'codequal-gitlab-codequality-v2.json');
  await gitlabGenerator.generateToFile(issues, gitlabPath);

  const gitlabStats = fs.statSync(gitlabPath);
  console.log(`✅ GitLab Code Quality Report generated: ${path.basename(gitlabPath)}`);
  console.log(`   Size: ${(gitlabStats.size / 1024).toFixed(1)} KB`);

  // Read and show GitLab summary
  const gitlabContent = JSON.parse(fs.readFileSync(gitlabPath, 'utf-8'));
  console.log(`   Total Issues: ${gitlabContent.length}`);

  // Count by severity
  const bySeverity: Record<string, number> = {};
  gitlabContent.forEach((issue: any) => {
    bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
  });
  console.log(`   By Severity:`);
  Object.entries(bySeverity).forEach(([sev, count]) => {
    console.log(`     - ${sev}: ${count}`);
  });

  // Count unique categories
  const categories = new Set<string>();
  gitlabContent.forEach((issue: any) => {
    issue.categories.forEach((cat: string) => categories.add(cat));
  });
  console.log(`   Categories: ${Array.from(categories).join(', ')}`);

  // Generate GitLab CI Config
  console.log('\n' + '-'.repeat(60));
  console.log('GitLab CI Job Configuration');
  console.log('-'.repeat(60));
  console.log(generateGitLabCIJobConfig());

  // Show sample entries
  console.log('\n' + '-'.repeat(60));
  console.log('Sample Report Entries');
  console.log('-'.repeat(60));

  console.log('\n📄 Sample SARIF Result:');
  const sampleSarif = sarifContent.runs[0].results[0];
  console.log(JSON.stringify({
    ruleId: sampleSarif.ruleId,
    level: sampleSarif.level,
    message: sampleSarif.message.text.substring(0, 100) + '...',
    location: sampleSarif.locations[0].physicalLocation.artifactLocation.uri,
    hasFix: !!sampleSarif.fixes?.length,
  }, null, 2));

  console.log('\n📄 Sample GitLab Code Quality Issue:');
  const sampleGitlab = gitlabContent[0];
  console.log(JSON.stringify({
    type: sampleGitlab.type,
    check_name: sampleGitlab.check_name,
    severity: sampleGitlab.severity,
    categories: sampleGitlab.categories,
    location: sampleGitlab.location.path,
    description: sampleGitlab.description.substring(0, 100) + '...',
  }, null, 2));

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Report Generation Complete!');
  console.log('='.repeat(60));
  console.log(`\nGenerated files:`);
  console.log(`  1. ${sarifPath}`);
  console.log(`  2. ${gitlabPath}`);
  console.log(`\nThese reports can be used with:`);
  console.log(`  - GitHub Code Scanning (upload SARIF via Actions)`);
  console.log(`  - GitLab Merge Request Code Quality widget`);
}

main().catch(console.error);
