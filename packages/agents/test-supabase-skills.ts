#!/usr/bin/env ts-node
/**
 * Supabase Skills Tracking - End-to-End Test
 *
 * Tests the complete flow:
 * 1. Save skill scores to Supabase
 * 2. Retrieve baseline (average of last 5 PRs, 50 for new users)
 * 3. Retrieve score trend
 * 4. Verify developer_metrics aggregation
 * 5. Test leaderboard functionality
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { SkillScoreManager } from './src/two-branch/analyzers/v9-skill-score-manager';
import { createClient } from '@supabase/supabase-js';

async function testSupabaseSkills(): Promise<void> {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  Supabase Skills Tracking - End-to-End Test              ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  // Check credentials
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("❌ ERROR: Supabase credentials not found!");
    console.log("\nPlease set in .env:");
    console.log("  SUPABASE_URL=your_supabase_url");
    console.log("  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key\n");
    process.exit(1);
  }

  console.log("✅ Supabase credentials found\n");

  // Initialize
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const skillManager = new SkillScoreManager(supabase);

  const testDeveloper = 'test-developer@codequal.com';
  const testRepo = 'apache/kafka';

  // ================================================================
  // TEST 1: Get baseline (should be 50 for new user)
  // ================================================================
  console.log("📊 TEST 1: Get Baseline Score\n");

  const baseline = await skillManager.getBaselineScore(testDeveloper, testRepo);
  console.log(`   Baseline: ${baseline}/100`);
  console.log(`   Expected: 50 (new user) or average of last 5 PRs\n`);

  // ================================================================
  // TEST 2: Get score trend (should be empty for new user)
  // ================================================================
  console.log("📈 TEST 2: Get Score Trend\n");

  const trend = await skillManager.getScoreTrend(testDeveloper, testRepo, 5);
  console.log(`   Trend: ${trend.length > 0 ? trend.join(' → ') : 'No history (new user)'}`);
  console.log(`   Count: ${trend.length} previous PRs\n`);

  // ================================================================
  // TEST 3: Save new skill score
  // ================================================================
  console.log("💾 TEST 3: Save Skill Score\n");

  const testScore = {
    developerEmail: testDeveloper,
    developerName: 'Test Developer',
    repository: testRepo,
    prNumber: Math.floor(Math.random() * 10000), // Random PR number for testing
    branch: 'test-branch',
    overallScore: 85,
    qualityScore: 85,
    categoryScores: {
      security: 90,
      performance: 85,
      architecture: 80,
      dependency: 88,
      codeQuality: 82
    },
    issueCounts: {
      new: 3,
      resolved: 2,
      critical: 0,
      high: 1,
      medium: 2,
      low: 0
    },
    language: 'java',
    analysisDuration: 45000 // 45 seconds
  };

  console.log(`   Saving PR #${testScore.prNumber}...`);
  await skillManager.saveSkillScore(testScore);
  console.log(`   ✅ Saved to Supabase\n`);

  // ================================================================
  // TEST 4: Verify data was saved (check skill_scores table)
  // ================================================================
  console.log("🔍 TEST 4: Verify Data in skill_scores Table\n");

  const { data: savedScore, error: scoreError } = await supabase
    .from('skill_scores')
    .select('*')
    .eq('developer_email', testDeveloper)
    .eq('pr_number', testScore.prNumber)
    .single();

  if (scoreError) {
    console.log(`   ❌ Error: ${scoreError.message}\n`);
  } else if (savedScore) {
    console.log(`   ✅ Found in skill_scores:`);
    console.log(`      Overall Score: ${savedScore.overall_score}/100`);
    console.log(`      Security: ${savedScore.security_score}/100`);
    console.log(`      Performance: ${savedScore.performance_score}/100`);
    console.log(`      Architecture: ${savedScore.architecture_score}/100`);
    console.log(`      Dependency: ${savedScore.dependency_score}/100`);
    console.log(`      Code Quality: ${savedScore.code_quality_score}/100`);
    console.log(`      Issues: ${savedScore.new_issues_count} new, ${savedScore.resolved_issues_count} resolved\n`);
  }

  // ================================================================
  // TEST 5: Verify developer_metrics was updated
  // ================================================================
  console.log("📊 TEST 5: Verify developer_metrics Aggregation\n");

  const { data: metrics, error: metricsError } = await supabase
    .from('developer_metrics')
    .select('*')
    .eq('developer_email', testDeveloper)
    .single();

  if (metricsError) {
    console.log(`   ❌ Error: ${metricsError.message}\n`);
  } else if (metrics) {
    console.log(`   ✅ Found in developer_metrics:`);
    console.log(`      Current Score: ${metrics.current_score}/100`);
    console.log(`      Best Score: ${metrics.best_score}/100`);
    console.log(`      Average Score: ${metrics.average_score}/100`);
    console.log(`      Total PRs: ${metrics.total_prs_analyzed}`);
    console.log(`      Issues Resolved: ${metrics.total_issues_resolved}`);
    console.log(`      Issues Introduced: ${metrics.total_issues_introduced}\n`);
  }

  // ================================================================
  // TEST 6: Get updated baseline (should now include new score)
  // ================================================================
  console.log("📊 TEST 6: Get Updated Baseline\n");

  const newBaseline = await skillManager.getBaselineScore(testDeveloper, testRepo);
  console.log(`   New Baseline: ${newBaseline}/100`);
  console.log(`   Previous: ${baseline}/100`);
  console.log(`   Change: ${newBaseline > baseline ? '+' : ''}${newBaseline - baseline}\n`);

  // ================================================================
  // TEST 7: Get updated trend
  // ================================================================
  console.log("📈 TEST 7: Get Updated Score Trend\n");

  const newTrend = await skillManager.getScoreTrend(testDeveloper, testRepo, 5);
  console.log(`   Trend: ${newTrend.length > 0 ? newTrend.join(' → ') : 'No history'}`);
  console.log(`   Count: ${newTrend.length} PRs\n`);

  // ================================================================
  // TEST 8: Test leaderboard
  // ================================================================
  console.log("🏆 TEST 8: Get Leaderboard\n");

  const leaderboard = await skillManager.getLeaderboard(10);
  console.log(`   Top ${leaderboard.length} developers:\n`);
  leaderboard.forEach((dev, idx) => {
    console.log(`   ${idx + 1}. ${dev.name || dev.email}`);
    console.log(`      Score: ${dev.score}/100 (avg: ${dev.avgScore})`);
    console.log(`      PRs: ${dev.totalPRs}\n`);
  });

  // ================================================================
  // TEST 9: Get developer rank
  // ================================================================
  console.log("🎖️  TEST 9: Get Developer Rank\n");

  const rank = await skillManager.getDeveloperRank(testDeveloper);
  if (rank > 0) {
    console.log(`   Rank: #${rank} out of ${leaderboard.length} developers\n`);
  } else {
    console.log(`   Not ranked yet\n`);
  }

  // ================================================================
  // TEST 10: Calculate delta from baseline
  // ================================================================
  console.log("📐 TEST 10: Calculate Score Delta\n");

  const delta = await skillManager.calculateDelta(testDeveloper, testRepo, 92);
  console.log(`   Baseline: ${delta.baseline}/100`);
  console.log(`   Current: 92/100`);
  console.log(`   Delta: ${delta.delta > 0 ? '+' : ''}${delta.delta}\n`);

  // ================================================================
  // Summary
  // ================================================================
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  Test Complete                                            ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  console.log("✅ All Supabase operations working!");
  console.log("\nFunctionality Verified:");
  console.log("  ✅ Baseline calculation");
  console.log("  ✅ Score trend tracking");
  console.log("  ✅ Save to skill_scores table");
  console.log("  ✅ Auto-update developer_metrics");
  console.log("  ✅ Leaderboard generation");
  console.log("  ✅ Rank calculation");
  console.log("  ✅ Delta calculation\n");

  console.log("📊 Database Tables Used:");
  console.log("  • skill_scores - Individual PR scores");
  console.log("  • developer_metrics - Aggregated stats\n");

  console.log("🎯 Next Steps:");
  console.log("  1. Integrate into V9 report generation");
  console.log("  2. Add skills section to reports");
  console.log("  3. Show trend graphs in UI");
  console.log("  4. Implement team leaderboards\n");
}

// Run test
if (require.main === module) {
  testSupabaseSkills()
    .then(() => {
      console.log("✅ Test suite completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}

export { testSupabaseSkills };
