#!/usr/bin/env ts-node
/**
 * V9 Real E2E Test with All 5 Java Tools + BUG-119 Model Diversity
 *
 * This test executes the complete V9 flow with:
 * - All 5 Java tools (PMD, Checkstyle, Semgrep, Dependency-Check, SpotBugs)
 * - BUG-119 model diversity (each specialized agent uses different model)
 * - Real tool execution on Apache Kafka
 * - Complete V9 report generation
 *
 * Expected Runtime: 3-5 minutes
 * Expected Outcome: Complete V9 report with model diversity validated
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { V9IntegratedAnalyzer } from './src/two-branch/analyzers/v9-integrated-analyzer';
import * as fs from 'fs';
import { execSync } from 'child_process';

const KAFKA_REPO = '/tmp/kafka-repo';
const KAFKA_URL = 'https://github.com/apache/kafka.git';
const PR_NUMBER = 17620;
const OUTPUT_DIR = '/tmp/v9-reports';

async function runRealE2ETest() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  V9 Real E2E Test - All 5 Tools + BUG-119 Model Diversity   ║');
  console.log('║  Apache Kafka PR #17620                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  // ================================================================
  // STEP 1: Repository Setup
  // ================================================================
  console.log('📁 STEP 1: Repository Setup\n');

  if (!fs.existsSync(KAFKA_REPO)) {
    console.log('   Cloning Apache Kafka...');
    execSync(`git clone ${KAFKA_URL} ${KAFKA_REPO}`, { stdio: 'inherit' });
    console.log('   ✅ Clone complete\n');
  } else {
    console.log('   ✅ Using cached repository\n');
  }

  // Ensure remote exists
  try {
    execSync('git remote get-url origin', { cwd: KAFKA_REPO, stdio: 'ignore' });
  } catch {
    execSync(`git remote add origin ${KAFKA_URL}`, { cwd: KAFKA_REPO, stdio: 'ignore' });
  }

  // Create/verify PR branch
  try {
    execSync('git rev-parse --verify pr-17620', { cwd: KAFKA_REPO, stdio: 'ignore' });
    console.log('   ✅ PR branch exists\n');
  } catch {
    console.log('   Fetching PR branch...');
    execSync(`git fetch origin pull/${PR_NUMBER}/head:pr-17620`, { cwd: KAFKA_REPO, stdio: 'inherit' });
    console.log('   ✅ PR branch created\n');
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // ================================================================
  // STEP 2: V9IntegratedAnalyzer Execution
  // ================================================================
  console.log('🔧 STEP 2: V9 Analysis with All 5 Tools\n');
  console.log('   Tools to execute:');
  console.log('   1. PMD (required) - Java static analysis');
  console.log('   2. Checkstyle (required) - Code style violations');
  console.log('   3. Semgrep (required) - Security vulnerabilities');
  console.log('   4. Dependency-Check (required) - CVE scanning');
  console.log('   5. SpotBugs (optional) - Bytecode analysis\n');

  console.log('   BUG-119 Model Diversity:');
  console.log('   - SecurityAgent → anthropic/claude-opus-4.1');
  console.log('   - PerformanceAgent → deepseek/deepseek-chat-v3.1');
  console.log('   - ArchitectureAgent → anthropic/claude-sonnet-4');
  console.log('   - CodeQualityAgent → gemini-2.5-pro (or from Supabase)');
  console.log('   - DependencyAgent → qwen/qwen3-coder-30b-a3b-instruct\n');

  const analyzer = new V9IntegratedAnalyzer();

  console.log('   Starting analysis...\n');
  const analysisStartTime = Date.now();

  try {
    const result = await analyzer.analyzeRepository(
      KAFKA_URL,
      PR_NUMBER,
      {
        skipCache: false,
        workspace: `kafka-pr-${PR_NUMBER}-${Date.now()}`
      }
    );

    const analysisDuration = Math.round((Date.now() - analysisStartTime) / 1000);
    console.log(`\n   ✅ Analysis complete (${analysisDuration}s)\n`);

    // ================================================================
    // STEP 3: Results Summary
    // ================================================================
    console.log('📊 STEP 3: Analysis Results\n');

    console.log(`   Decision: ${result.decision}`);
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`   Quality Score: ${result.qualityScore}/100 (${result.grade})`);
    console.log(`   Reason: ${result.reason}\n`);

    console.log('   Issue Summary:');
    console.log(`   - New Issues: ${result.newIssues.length}`);
    console.log(`   - Existing Issues: ${result.existingIssues.length}`);
    console.log(`   - Resolved Issues: ${result.resolvedIssues.length}`);
    console.log(`   - Blocking Issues: ${result.blockingIssues.length}`);
    console.log(`   - Backlog Issues: ${result.backlogIssues.length}\n`);

    // Count issues by tool
    const issuesByTool: Record<string, number> = {};
    [...result.newIssues, ...result.existingIssues].forEach(issue => {
      const tool = issue.tool || 'unknown';
      issuesByTool[tool] = (issuesByTool[tool] || 0) + 1;
    });

    console.log('   Issues by Tool:');
    Object.entries(issuesByTool).forEach(([tool, count]) => {
      console.log(`   - ${tool}: ${count}`);
    });
    console.log('');

    // ================================================================
    // STEP 4: Model Diversity Verification
    // ================================================================
    console.log('🎯 STEP 4: BUG-119 Model Diversity Verification\n');

    // Extract agent models from metadata
    if (result.metadata.model && result.metadata.model.agentsUsed) {
      console.log('   Agents and Models Used:');
      result.metadata.model.agentsUsed.forEach((agent: any) => {
        console.log(`   - ${agent.agentName}: ${agent.modelUsed.model} (${agent.modelUsed.provider})`);
      });
      console.log('');

      // Calculate diversity
      const uniqueModels = new Set(
        result.metadata.model.agentsUsed.map((a: any) => a.modelUsed.model)
      );
      const diversityRatio = (uniqueModels.size / result.metadata.model.agentsUsed.length) * 100;
      console.log(`   Model Diversity: ${uniqueModels.size}/${result.metadata.model.agentsUsed.length} (${diversityRatio.toFixed(0)}%)`);
      console.log(`   Unique Models: ${Array.from(uniqueModels).join(', ')}\n`);

      if (diversityRatio >= 50) {
        console.log('   ✅ Good model diversity (≥50%)\n');
      } else {
        console.log('   ⚠️  Low model diversity (<50%) - Consider updating Supabase configs\n');
      }
    } else {
      console.log('   ⚠️  Model tracking data not available in metadata\n');
    }

    // ================================================================
    // STEP 5: Performance Metrics
    // ================================================================
    console.log('⏱️  STEP 5: Performance Metrics\n');

    const totalDuration = Math.round((Date.now() - startTime) / 1000);
    console.log(`   Total Duration: ${totalDuration}s`);
    console.log(`   Analysis Time: ${analysisDuration}s`);
    console.log(`   Repository: ${KAFKA_URL}`);
    console.log(`   PR Number: ${PR_NUMBER}`);
    console.log(`   Modified Files: ${result.modifiedFiles.length}\n`);

    // ================================================================
    // STEP 6: Report Path
    // ================================================================
    console.log('📄 STEP 6: V9 Report\n');

    // The V9IntegratedAnalyzer should have generated a report
    // Check for the most recent report in OUTPUT_DIR
    const reports = fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.startsWith('v9-') && f.endsWith('.md'))
      .map(f => ({
        name: f,
        path: path.join(OUTPUT_DIR, f),
        mtime: fs.statSync(path.join(OUTPUT_DIR, f)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (reports.length > 0) {
      const latestReport = reports[0];
      const reportSize = fs.statSync(latestReport.path).size;
      const reportContent = fs.readFileSync(latestReport.path, 'utf-8');
      const sectionCount = (reportContent.match(/^##[^#]/gm) || []).length;

      console.log(`   ✅ Report Generated: ${latestReport.name}`);
      console.log(`   Path: ${latestReport.path}`);
      console.log(`   Size: ${Math.round(reportSize / 1024)} KB`);
      console.log(`   Sections: ${sectionCount}\n`);

      // Verify critical sections
      const criticalSections = [
        'Executive Summary',
        'Decision',
        'Quality Score',
        'Risk Matrix',
        'Blocking Issues',
        'Educational Resources',
        'Performance Metrics'
      ];

      console.log('   Critical Sections Check:');
      criticalSections.forEach(section => {
        const present = reportContent.includes(section);
        console.log(`   ${present ? '✅' : '❌'} ${section}`);
      });
      console.log('');
    } else {
      console.log('   ⚠️  No V9 report found in output directory\n');
    }

    // ================================================================
    // Summary
    // ================================================================
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ V9 Real E2E Test Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total Duration: ${totalDuration}s`);
    console.log(`Decision: ${result.decision}`);
    console.log(`Quality Score: ${result.qualityScore}/100`);
    console.log(`Total Issues: ${result.newIssues.length + result.existingIssues.length}`);
    console.log(`Blocking Issues: ${result.blockingIssues.length}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Analysis failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run test
runRealE2ETest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
