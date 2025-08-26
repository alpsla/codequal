#!/usr/bin/env npx ts-node --transpile-only

/**
 * Regenerate HTML report from existing JSON data
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

async function regenerateHTML() {
  // Load existing JSON data
  const jsonPath = '/Users/alpinro/Code Prjects/codequal/packages/agents/test-reports/pr-analysis-v8-2025-08-25T18-51-36-141Z.json';
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  // Create a proper ComparisonResult structure
  const comparisonResult: any = {
    success: true,
    mainBranch: {
      name: 'main',
      issues: data.mainBranchIssues || []
    },
    prBranch: {
      name: `PR #700`,
      issues: data.prBranchIssues || []
    },
    // Extract actual issues from categorized wrapper
    newIssues: (data.categorized?.newIssues || []).map((item: any) => item.issue || item),
    resolvedIssues: (data.categorized?.fixedIssues || []).map((item: any) => item.issue || item),
    unchangedIssues: (data.categorized?.unchangedIssues || []).map((item: any) => item.issue || item),
    repositoryUrl: data.repositoryUrl,
    prNumber: data.prNumber,
    metadata: data.metadata
  };
  
  console.log('📊 Data Summary:');
  console.log(`  Main branch issues: ${comparisonResult.mainBranch.issues.length}`);
  console.log(`  PR branch issues: ${comparisonResult.prBranch.issues.length}`);
  console.log(`  New issues: ${comparisonResult.newIssues.length}`);
  console.log(`  Fixed issues: ${comparisonResult.resolvedIssues.length}`);
  console.log(`  Unchanged issues: ${comparisonResult.unchangedIssues.length}`);
  
  // Generate report
  const reportGenerator = new ReportGeneratorV8Final();
  const htmlReport = await reportGenerator.generateReport(comparisonResult);
  
  // Save new HTML report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(process.cwd(), 'test-reports', `pr-analysis-v8-regenerated-${timestamp}.html`);
  fs.writeFileSync(outputPath, htmlReport);
  
  console.log(`\n✅ HTML report regenerated: ${outputPath}`);
  console.log('📂 Opening in browser...');
  
  // Open in browser
  exec(`open "${outputPath}"`);
}

regenerateHTML().catch(console.error);