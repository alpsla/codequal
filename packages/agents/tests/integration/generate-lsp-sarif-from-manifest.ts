/**
 * Generate LSP and SARIF files from existing V9 manifest and fix data
 * This script reads an existing manifest.json and generates the LSP/SARIF files
 */

import * as fs from 'fs';
import * as path from 'path';
import { LSPSARIFConverter } from '../../src/two-branch/analyzers/lsp-sarif-converter';
import type { EnrichedIssue } from '../../src/two-branch/analyzers/v9-grouped-report-formatter';
import type { IssueGroup } from '../../src/two-branch/utils/issue-grouping';

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
  };
}

async function generateLSPSARIFFiles(manifestPath: string, outputDir: string) {
  console.log('📋 Reading manifest:', manifestPath);

  // Read manifest
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const manifest: Manifest = JSON.parse(manifestContent);

  console.log(`\n✅ Found ${manifest.metadata.total_issues} issues from ${manifest.metadata.repository}\n`);

  // Collect all fix files
  const allFiles = [
    ...manifest.files.critical,
    ...manifest.files.high,
    ...manifest.files.medium,
    ...manifest.files.low
  ];

  // Load fix data and convert to EnrichedIssue format
  const allIssues: EnrichedIssue[] = [];
  const issueGroups: IssueGroup[] = [];

  const manifestDir = path.dirname(manifestPath);

  for (const fileInfo of allFiles) {
    const fixFilePath = path.join(manifestDir, fileInfo.fallback_path);

    if (!fs.existsSync(fixFilePath)) {
      console.warn(`⚠️  Fix file not found: ${fixFilePath}`);
      continue;
    }

    console.log(`📄 Loading: ${fileInfo.filename}`);

    const fixContent = fs.readFileSync(fixFilePath, 'utf-8');
    const fixData = JSON.parse(fixContent);

    // Extract tool from rule (format: "tool.category.subcategory.rule-name.rule-name")
    const ruleParts = fileInfo.rule.split('.');
    const tool = ruleParts[0]; // First part is the tool (java, semgrep, etc.)

    // Convert each location to an EnrichedIssue
    if (fixData.locations && fixData.locations.length > 0) {
      for (const location of fixData.locations) {
        const issue: EnrichedIssue = {
          file: location.file,
          line: location.line,
          column: location.column || 0,
          rule: fileInfo.rule,
          tool: fixData.tool || tool,
          severity: fileInfo.severity as any,
          message: fixData.description || fileInfo.description,
          category: location.category || 'NEW',
          detectedCategory: fileInfo.category,
          snippet: location.snippet || ''
        };

        // Add fix suggestion if available
        if (fixData.fix_pattern) {
          issue.fixSuggestion = {
            fix: fixData.fix_pattern.instructions || fixData.description,
            correctedCode: fixData.fix_pattern.example?.after || '',
            explanation: fixData.fix_pattern.instructions || ''
          };
        }

        allIssues.push(issue);
      }
    }

    // Create issue group
    issueGroups.push({
      rule: fileInfo.rule,
      tool: tool,
      severity: fileInfo.severity as any,
      count: fileInfo.occurrences,
      description: fileInfo.description,
      category: fileInfo.category,
      examples: [],
      aiAnalyzed: true,
      costSaved: 0
    });
  }

  console.log(`\n✅ Loaded ${allIssues.length} total issues from ${issueGroups.length} groups\n`);

  // Generate LSP and SARIF files
  const converter = new LSPSARIFConverter();
  const workspaceRoot = path.join(manifestDir, '..');

  console.log('🔧 Generating LSP Code Actions...');
  const lspActions = converter.generateLSPCodeActions(allIssues, workspaceRoot);

  console.log('🔧 Generating SARIF Report...');
  const sarifReport = converter.generateSARIFReport(allIssues, issueGroups, {
    repository: manifest.metadata.repository,
    version: '9.0.0',
    analyzedAt: manifest.metadata.generated_at
  });

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write files
  const lspPath = path.join(outputDir, 'codequal-lsp-actions.json');
  const sarifPath = path.join(outputDir, 'codequal-sarif-report.json');

  fs.writeFileSync(lspPath, JSON.stringify(lspActions, null, 2));
  fs.writeFileSync(sarifPath, JSON.stringify(sarifReport, null, 2));

  console.log(`\n✅ Generated files:`);
  console.log(`   📄 LSP Actions: ${lspPath}`);
  console.log(`      - ${lspActions.length} code actions`);
  console.log(`      - Includes batch actions for all severities`);
  console.log(`   📄 SARIF Report: ${sarifPath}`);
  console.log(`      - ${sarifReport.runs[0].results.length} results`);
  console.log(`      - ${sarifReport.runs[0].tool.driver.rules.length} rules`);

  console.log(`\n🎯 Next Steps:`);
  console.log(`   1. Open Cursor IDE`);
  console.log(`   2. Open the codebase: ${manifest.metadata.repository}`);
  console.log(`   3. Open any file with issues`);
  console.log(`   4. Press Cmd+. to open Quick Fix menu`);
  console.log(`   5. Verify "Apply All Fixes" appears at top`);
  console.log(`   6. Verify severity-grouped batch actions work\n`);

  return { lspPath, sarifPath, lspActions, sarifReport };
}

// Main execution
const manifestPath = process.argv[2] || path.join(__dirname, 'test-outputs/spring-petclinic-pr-#950-manifest.json');
const outputDir = process.argv[3] || path.join(__dirname, 'test-outputs/lsp-sarif-output');

generateLSPSARIFFiles(manifestPath, outputDir)
  .then(() => {
    console.log('✅ SUCCESS!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ERROR:', error);
    process.exit(1);
  });
