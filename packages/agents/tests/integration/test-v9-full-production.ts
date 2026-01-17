#!/usr/bin/env ts-node
/**
 * V9 Full Production Test - Two-Branch Analysis with Real PR Metadata
 *
 * Tests the complete production flow:
 * 1. V9AnalysisService with two-branch comparison
 * 2. Real PR metadata from GitHub
 * 3. Complete mode (all tools including Checkstyle)
 * 4. PRO tier with AI fixes
 *
 * Usage:
 *   cd packages/agents
 *   npx ts-node tests/integration/test-v9-full-production.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { V9AnalysisService } from '../../src/two-branch/api/v9-analysis-service';

// Configuration
const TEST_REPO = 'https://github.com/spring-projects/spring-petclinic.git';
const TEST_PR = 950;
const OUTPUT_DIR = '/tmp/v9-production-reports';

async function runFullProductionTest(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  V9 Full Production Test - Two-Branch Analysis                 ║');
  console.log('║  Spring PetClinic PR #950                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Verify environment
  console.log('Environment check:');
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'NOT SET'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`  OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET'}`);
  console.log('');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase credentials required for full production test');
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const service = new V9AnalysisService();

  // Run PRO tier analysis with complete mode
  console.log('='.repeat(80));
  console.log('Running PRO tier analysis with COMPLETE mode (all tools)...');
  console.log('='.repeat(80));

  const startTime = Date.now();

  const result = await service.analyzePR({
    repositoryUrl: TEST_REPO,
    prNumber: TEST_PR,
    analysisMode: 'complete',  // All tools including Checkstyle
    includeEducation: true
  });

  const duration = (Date.now() - startTime) / 1000;

  console.log('\n' + '='.repeat(80));
  console.log('Analysis Complete');
  console.log('='.repeat(80));

  // Display results
  console.log('\nResults:');
  console.log(`  Analysis ID: ${result.analysisId}`);
  console.log(`  Decision: ${result.decision}`);
  console.log(`  Total Issues: ${result.issues.total}`);
  console.log(`  - NEW: ${result.issues.new}`);
  console.log(`  - EXISTING_MODIFIED: ${result.issues.existingModified}`);
  console.log(`  - RESOLVED: ${result.issues.resolved}`);
  console.log(`  - EXISTING_REST: ${result.issues.existingRest}`);
  console.log(`  Blocking Issues: ${result.issues.blocking}`);
  console.log(`  Duration: ${duration.toFixed(1)}s`);

  // Save reports
  if (result.report?.markdown) {
    const reportPath = path.join(OUTPUT_DIR, 'PRO-complete-report.md');
    fs.writeFileSync(reportPath, result.report.markdown);
    console.log(`\nReport saved: ${reportPath}`);
    console.log(`Report size: ${(result.report.markdown.length / 1024).toFixed(1)} KB`);
  }

  // Validate two-branch comparison
  console.log('\n' + '='.repeat(80));
  console.log('Two-Branch Comparison Validation');
  console.log('='.repeat(80));

  const hasExistingRest = result.issues.existingRest > 0;
  const hasResolved = result.issues.resolved > 0;
  const allNew = result.issues.new === result.issues.total;

  if (allNew && result.issues.total > 50) {
    console.log('❌ WARNING: All issues marked as NEW - two-branch comparison may not be working!');
  } else if (hasExistingRest || hasResolved) {
    console.log('✅ Two-branch comparison working correctly');
    console.log(`   - ${result.issues.existingRest} issues exist on both branches`);
    console.log(`   - ${result.issues.resolved} issues were resolved in this PR`);
    console.log(`   - ${result.issues.new} new issues introduced`);
  } else {
    console.log('⚠️ No EXISTING_REST or RESOLVED issues - may be expected for small PRs');
  }

  // Check metadata
  console.log('\nMetadata:');
  console.log(`  Repository: ${result.metadata.repositoryUrl}`);
  console.log(`  PR Number: ${result.metadata.prNumber}`);
  console.log(`  Base Branch: ${result.metadata.baseBranch}`);
  console.log(`  PR Branch: ${result.metadata.prBranch}`);
  console.log(`  Modified Files: ${result.metadata.modifiedFiles}`);

  console.log('\n' + '='.repeat(80));
  console.log(`Test complete! Reports saved to: ${OUTPUT_DIR}`);
  console.log('='.repeat(80));
}

runFullProductionTest().catch(error => {
  console.error('Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
