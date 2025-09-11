#!/usr/bin/env npx ts-node

/**
 * V9 Full Integration Test
 * Tests the complete V9 analyzer with real issue detection
 */

import { V9AnalyzerFactory } from './src/two-branch/analyzers/v9-analyzer-factory';
import { V9ReportFormatter } from './src/two-branch/analyzers/v9-report-formatter-complete';
import { V9PRCommentGenerator } from './src/two-branch/analyzers/v9-pr-comment-generator';
import { RepositoryUtilsFactory } from './src/two-branch/utils/repository-utils-factory';
import * as fs from 'fs';
import * as path from 'path';

// Test target
const TARGET = {
  name: 'Apache Kafka',
  repoUrl: 'https://github.com/apache/kafka',
  prNumber: 17620,
  language: 'java' as const
};

async function runFullIntegration() {
  console.log('🚀 V9 Full Integration Test\n');
  console.log('='.repeat(80));
  console.log(`Repository: ${TARGET.name}`);
  console.log(`PR #${TARGET.prNumber}`);
  console.log(`Language: ${TARGET.language}`);
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();

  try {
    // 1. Setup repository manager
    console.log('📁 Setting up repository manager...');
    const repoManager = RepositoryUtilsFactory.getRepoManager({
      cacheDir: '/tmp/codequal/cache',
      workspaceDir: '/tmp/codequal/workspaces'
    });

    // Parse repo URL
    const urlParts = TARGET.repoUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repo = urlParts[1];

    // 2. Setup repository
    console.log('📥 Setting up repository cache...');
    await repoManager.setupRepo({
      owner,
      repo,
      defaultBranch: 'trunk'
    });

    // 3. Create PR workspace
    console.log('🔄 Creating PR workspace...');
    const workspace = await repoManager.createPRWorkspace(
      owner,
      repo,
      TARGET.prNumber
    );
    console.log(`  Workspace: ${workspace.path}`);
    console.log(`  Changed files: ${workspace.changedFiles.length}\n`);

    // 4. Setup file selector
    console.log('📂 Selecting files for analysis...');
    const fileSelector = RepositoryUtilsFactory.getFileSelector();
    const selectedFiles = await fileSelector.selectFiles({
      repository: TARGET.repoUrl,
      prNumber: TARGET.prNumber,
      baseBranch: workspace.baseBranch,
      prBranch: workspace.prBranch,
      language: TARGET.language,
      repoPath: workspace.path,
      maxFiles: 500
    });
    
    console.log(`  Total selected: ${selectedFiles.totalSelected}`);
    console.log(`  PR changes: ${selectedFiles.prChangedFiles.length}`);
    console.log(`  Critical files: ${selectedFiles.criticalFiles.length}`);
    console.log(`  Entry points: ${selectedFiles.entryPoints.length}\n`);

    // 5. Create analyzer
    console.log('🔍 Creating V9 analyzer...');
    const analyzerFactory = new V9AnalyzerFactory();
    const analyzer = analyzerFactory.createAnalyzer(TARGET.language);
    
    // 6. Prepare analysis context
    const context = {
      repository: {
        url: TARGET.repoUrl,
        owner,
        name: repo,
        defaultBranch: workspace.baseBranch
      },
      pullRequest: {
        number: TARGET.prNumber,
        branch: workspace.prBranch,
        baseBranch: workspace.baseBranch,
        files: workspace.changedFiles.map(f => ({
          path: f,
          additions: 10,
          deletions: 5,
          changes: 15
        }))
      },
      selectedFiles: selectedFiles.prChangedFiles.concat(
        selectedFiles.criticalFiles.slice(0, 50),
        selectedFiles.entryPoints.slice(0, 20)
      ),
      workspacePath: workspace.path
    };

    // 7. Run analysis
    console.log('🔧 Running V9 analysis...');
    const results = await analyzer.analyze(context);
    
    console.log(`\n✅ Analysis complete!`);
    console.log(`  Issues found: ${results.issues.length}`);
    console.log(`  - Critical: ${results.issues.filter(i => i.severity === 'critical').length}`);
    console.log(`  - High: ${results.issues.filter(i => i.severity === 'high').length}`);
    console.log(`  - Medium: ${results.issues.filter(i => i.severity === 'medium').length}`);
    console.log(`  - Low: ${results.issues.filter(i => i.severity === 'low').length}\n`);

    // 8. Generate report
    console.log('📄 Generating V9 report...');
    const formatter = new V9ReportFormatter();
    const report = await formatter.format({
      ...results,
      metadata: {
        repository: TARGET.name,
        prNumber: TARGET.prNumber,
        analyzedAt: new Date().toISOString(),
        filesAnalyzed: selectedFiles.totalSelected,
        duration: (Date.now() - startTime) / 1000
      }
    });

    // 9. Generate PR comment
    console.log('💬 Generating PR comment...');
    const commentGenerator = new V9PRCommentGenerator();
    const prComment = await commentGenerator.generate(results);

    // 10. Save outputs
    const timestamp = Date.now();
    const reportPath = path.join(
      process.cwd(),
      `v9-full-integration-${TARGET.prNumber}-${timestamp}.md`
    );
    const commentPath = path.join(
      process.cwd(),
      `v9-pr-comment-${TARGET.prNumber}-${timestamp}.md`
    );

    fs.writeFileSync(reportPath, report);
    fs.writeFileSync(commentPath, prComment);

    console.log(`\n✅ Reports saved:`);
    console.log(`  Report: ${reportPath}`);
    console.log(`  PR Comment: ${commentPath}\n`);

    // 11. Print summary
    console.log('='.repeat(80));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Repository: ${TARGET.name}`);
    console.log(`PR #${TARGET.prNumber}`);
    console.log(`Files Analyzed: ${selectedFiles.totalSelected}`);
    console.log(`Issues Found: ${results.issues.length}`);
    console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`Decision: ${results.prDecision || 'REVIEW REQUIRED'}`);
    console.log('='.repeat(80));

    // Cleanup
    await repoManager.cleanupWorkspace(owner, repo, TARGET.prNumber);
    await repoManager.close();

    // Verify critical sections exist
    console.log('\n🔍 Verifying report sections...');
    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    const requiredSections = [
      '## Executive Summary',
      '## Issues Found',
      '## Code Quality Metrics',
      '## Security Analysis',
      '## Performance Analysis',
      '## Recommendations'
    ];

    const missingSections = requiredSections.filter(
      section => !reportContent.includes(section)
    );

    if (missingSections.length > 0) {
      console.error('❌ Missing sections:', missingSections);
      process.exit(1);
    } else {
      console.log('✅ All required sections present!');
    }

    console.log('\n🎉 V9 Full Integration Test PASSED!\n');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
runFullIntegration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});