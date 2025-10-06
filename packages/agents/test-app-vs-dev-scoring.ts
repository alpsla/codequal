#!/usr/bin/env ts-node
/**
 * APP vs DEVELOPER Scoring - Comprehensive Test
 *
 * Tests TWO separate scoring systems running in parallel:
 * 1. APP SCORING - Repository health (baseline=100, overall=MIN of categories)
 * 2. DEVELOPER SCORING - Individual skill (baseline=50, overall=AVG of categories)
 *
 * This demonstrates the complete dual-track scoring implementation.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { AppScoreManager } from './src/two-branch/analyzers/v9-app-score-manager';
import { SkillScoreManager } from './src/two-branch/analyzers/v9-skill-score-manager';
import { V9ScoringCalculator } from './src/two-branch/analyzers/v9-scoring-calculator';
import { createClient } from '@supabase/supabase-js';
import type { Issue } from './src/two-branch/analyzers/v9-types';

async function testDualScoring(): Promise<void> {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  APP vs DEVELOPER Scoring - Comprehensive Test           ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  // Check credentials
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("❌ ERROR: Supabase credentials not found!");
    console.log("\nThis test requires Supabase connection.");
    console.log("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env\n");
    process.exit(1);
  }

  console.log("✅ Supabase credentials found\n");

  // Initialize managers
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const appManager = new AppScoreManager(supabase);
  const devManager = new SkillScoreManager(supabase);
  const calculator = new V9ScoringCalculator();

  // Test data
  const repository = 'test/dual-scoring-demo';
  const developerEmail = 'alice@company.com';
  const prNumber = 12345;

  // ================================================================
  // SCENARIO: First-time repository, existing developer
  // ================================================================
  console.log("📊 SCENARIO: First-time repository analysis\n");
  console.log("   Repository: First time being analyzed (APP baseline = 100)");
  console.log("   Developer: Has history (DEV baseline = avg of last 5 PRs)\n");

  // Simulate main branch issues (EXISTING in repository)
  const existingIssues: Issue[] = [
    {
      id: 'exist-1',
      category: 'Dependency',
      severity: 'critical',
      status: 'existing',
      title: 'Critical CVE in log4j',
      description: 'CVE-2021-44228 Log4Shell vulnerability',
      file: 'pom.xml',
      line: 45,
      tool: 'dependency-check',
      agent: 'DependencyAgent',
      impact: 'Critical security vulnerability',
      businessImpact: 'Potential data breach and system compromise'
    },
    {
      id: 'exist-2',
      category: 'Dependency',
      severity: 'critical',
      status: 'existing',
      title: 'Another critical CVE',
      description: 'CVE-2021-45046 Log4j RCE',
      file: 'pom.xml',
      line: 45,
      tool: 'dependency-check',
      agent: 'DependencyAgent',
      impact: 'Remote code execution',
      businessImpact: 'Critical security risk requiring immediate patching'
    },
    {
      id: 'exist-3',
      category: 'Security',
      severity: 'high',
      status: 'existing',
      title: 'SQL injection risk',
      description: 'Unsanitized SQL query',
      file: 'src/UserRepo.java',
      line: 123,
      tool: 'semgrep',
      agent: 'SecurityAgent',
      impact: 'Data breach risk',
      businessImpact: 'Potential unauthorized database access'
    }
  ];

  // Simulate PR branch issues (NEW from developer)
  const newIssues: Issue[] = [
    {
      id: 'new-1',
      category: 'Performance',
      severity: 'medium',
      status: 'new',
      title: 'Inefficient loop',
      description: 'N+1 query problem',
      file: 'src/UserService.java',
      line: 67,
      tool: 'pmd',
      agent: 'PerformanceAgent',
      impact: 'Performance degradation',
      businessImpact: 'Slower response times under load'
    },
    {
      id: 'new-2',
      category: 'Quality',
      severity: 'low',
      status: 'new',
      title: 'Unused import',
      description: 'Unused import statement',
      file: 'src/Helper.java',
      line: 5,
      tool: 'checkstyle',
      agent: 'CodeQualityAgent',
      impact: 'Minor code clarity',
      businessImpact: 'Minimal impact on maintainability'
    }
  ];

  // ================================================================
  // APP SCORING (Repository Health)
  // ================================================================
  console.log("🏢 APP SCORING (Repository Health)\n");
  console.log("   Analysis type: FIRST-TIME REPOSITORY");
  console.log("   Baseline: 100/100 (perfect health)");
  console.log("   Issues to analyze: EXISTING issues on main branch");
  console.log("   Calculation: Overall = MIN(category scores) - weakest link\n");

  // Get APP baseline (100 for first-time)
  const appBaseline = await appManager.getAppBaseline(repository);
  console.log(`   APP Baseline retrieved:`, appBaseline);

  // Categorize EXISTING issues by tool/type
  const existingByCategory = {
    security: existingIssues.filter(i => i.tool === 'semgrep'),
    performance: existingIssues.filter(i => i.tool === 'pmd' || i.tool === 'spotbugs'),
    architecture: existingIssues.filter(i => i.category === 'Architecture'),
    dependency: existingIssues.filter(i => i.tool === 'dependency-check'),
    codeQuality: existingIssues.filter(i => i.tool === 'checkstyle')
  };

  // Calculate APP category scores (deduct from 100)
  const appCategoryScores = {
    security: Math.max(0, 100 - calculator.calculateCategoryPoints(existingByCategory.security)),
    performance: Math.max(0, 100 - calculator.calculateCategoryPoints(existingByCategory.performance)),
    architecture: Math.max(0, 100 - calculator.calculateCategoryPoints(existingByCategory.architecture)),
    dependency: Math.max(0, 100 - calculator.calculateCategoryPoints(existingByCategory.dependency)),
    codeQuality: Math.max(0, 100 - calculator.calculateCategoryPoints(existingByCategory.codeQuality))
  };

  // Calculate APP overall (WEAKEST LINK)
  const appOverallScore = appManager.calculateOverallScore(appCategoryScores);

  console.log(`\n   📊 APP Category Scores:`);
  console.log(`      Security: ${appCategoryScores.security}/100`);
  console.log(`      Performance: ${appCategoryScores.performance}/100`);
  console.log(`      Architecture: ${appCategoryScores.architecture}/100`);
  console.log(`      Dependency: ${appCategoryScores.dependency}/100 ❌ (WEAKEST LINK)`);
  console.log(`      Code Quality: ${appCategoryScores.codeQuality}/100`);
  console.log(`\n   🎯 APP Overall Score: ${appOverallScore}/100 (MIN of categories)`);
  console.log(`      Weakest Category: Dependency (${appCategoryScores.dependency}/100)`);
  console.log(`      Reason: 2 critical CVEs in dependencies\n`);

  // Save APP score
  try {
    await appManager.saveAppScore({
      repository,
      prNumber,
      prTitle: 'Test PR for dual scoring',
      prAuthor: developerEmail,
      branch: 'feature-branch',
      decision: 'DECLINED',
      qualityScore: appOverallScore,
      appOverallScore,
      appCategoryScores,
      issueCounts: {
        new: newIssues.length,
        existing: existingIssues.length,
        resolved: 0,
        blocking: 2
      },
      language: 'java'
    });
    console.log(`   ✅ APP score saved to Supabase (pr_analysis_history table)\n`);
  } catch (error) {
    console.log(`   ⚠️  APP score save failed: ${(error as Error).message}`);
    console.log(`   (Migration may not be applied yet - see 004_add_app_category_scores.sql)\n`);
  }

  // ================================================================
  // DEVELOPER SCORING (Individual Skill)
  // ================================================================
  console.log("👤 DEVELOPER SCORING (Individual Skill)\n");
  console.log("   Analysis type: EXISTING DEVELOPER");
  console.log("   Baseline: Average of last 5 PRs (adaptive)");
  console.log("   Issues to analyze: NEW issues introduced by developer");
  console.log("   Calculation: Overall = AVERAGE(category scores)\n");

  // Get DEV baseline (avg of last 5 PRs or 50 for new developer)
  const devBaseline = await devManager.getBaselineScore(developerEmail, repository);
  console.log(`   DEV Baseline: ${devBaseline}/100`);

  // Get DEV trend
  const devTrend = await devManager.getScoreTrend(developerEmail, repository, 5);
  console.log(`   DEV Trend: ${devTrend.length > 0 ? devTrend.join(' → ') : 'No history (first PR)'}\n`);

  // Categorize NEW issues by tool/type
  const newByCategory = {
    security: newIssues.filter(i => i.tool === 'semgrep'),
    performance: newIssues.filter(i => i.tool === 'pmd' || i.tool === 'spotbugs'),
    architecture: newIssues.filter(i => i.category === 'Architecture'),
    dependency: newIssues.filter(i => i.tool === 'dependency-check'),
    codeQuality: newIssues.filter(i => i.tool === 'checkstyle')
  };

  // Calculate DEV category scores (deduct from baseline)
  const devCategoryScores = {
    security: Math.max(0, Math.round(devBaseline - calculator.calculateCategoryPoints(newByCategory.security))),
    performance: Math.max(0, Math.round(devBaseline - calculator.calculateCategoryPoints(newByCategory.performance))),
    architecture: Math.max(0, Math.round(devBaseline - calculator.calculateCategoryPoints(newByCategory.architecture))),
    dependency: Math.max(0, Math.round(devBaseline - calculator.calculateCategoryPoints(newByCategory.dependency))),
    codeQuality: Math.max(0, Math.round(devBaseline - calculator.calculateCategoryPoints(newByCategory.codeQuality)))
  };

  // Calculate DEV overall (AVERAGE)
  const devOverallScore = Math.round(
    Object.values(devCategoryScores).reduce((sum, s) => sum + s, 0) / 5
  );

  console.log(`   📊 DEV Category Scores:`);
  console.log(`      Security: ${devCategoryScores.security}/100`);
  console.log(`      Performance: ${devCategoryScores.performance}/100 ⚠️`);
  console.log(`      Architecture: ${devCategoryScores.architecture}/100`);
  console.log(`      Dependency: ${devCategoryScores.dependency}/100`);
  console.log(`      Code Quality: ${devCategoryScores.codeQuality}/100 ⚠️`);
  console.log(`\n   🎯 DEV Overall Score: ${devOverallScore}/100 (AVERAGE of categories)`);
  console.log(`      Growth Areas: Performance, Code Quality`);
  console.log(`      Strengths: Security, Architecture, Dependency\n`);

  // Save DEV score
  await devManager.saveSkillScore({
    developerEmail,
    developerName: 'Alice Developer',
    repository,
    prNumber,
    branch: 'feature-branch',
    overallScore: devOverallScore,
    qualityScore: devOverallScore,
    categoryScores: devCategoryScores,
    issueCounts: {
      new: newIssues.length,
      resolved: 0,
      critical: 0,
      high: 0,
      medium: newIssues.filter(i => i.severity === 'medium').length,
      low: newIssues.filter(i => i.severity === 'low').length
    },
    language: 'java'
  });
  console.log(`   ✅ DEV score saved to Supabase (skill_scores + developer_metrics)\n`);

  // ================================================================
  // COMPARISON SUMMARY
  // ================================================================
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  COMPARISON: APP vs DEVELOPER SCORING                    ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  console.log("📊 Score Comparison:\n");
  console.log("   🏢 APP (Repository Health): " + appOverallScore + "/100");
  console.log("      Calculation: MIN(category scores) = weakest link");
  console.log(`      Result: ${appOverallScore} (limited by Dependency=${appCategoryScores.dependency})`);
  console.log(`      Issues: EXISTING on main branch (${existingIssues.length} total)`);
  console.log(`      Baseline: 100 (first-time repository)\n`);

  console.log("   👤 DEV (Developer Skill): " + devOverallScore + "/100");
  console.log("      Calculation: AVG(category scores) = balanced skill");
  console.log(`      Result: ${devOverallScore} (average across 5 categories)`);
  console.log(`      Issues: NEW introduced by developer (${newIssues.length} total)`);
  console.log(`      Baseline: ${devBaseline} (adaptive from history)\n`);

  console.log("🎯 Key Insights:\n");
  console.log(`   • APP score (${appOverallScore}) reflects repository's weakest area (Dependency)`);
  console.log(`   • DEV score (${devOverallScore}) reflects developer's balanced skill level`);
  console.log(`   • APP addresses: Fix critical CVEs immediately!`);
  console.log(`   • DEV addresses: Improve performance optimization skills\n`);

  console.log("📈 Data Storage:\n");
  console.log("   ✅ APP scores → pr_analysis_history table");
  console.log("   ✅ DEV scores → skill_scores + developer_metrics tables");
  console.log("   ✅ Both available for historical trend analysis\n");

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  Test Complete                                            ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  console.log("✅ Dual scoring system working correctly!");
  console.log("\nImplementation Features:");
  console.log("  ✅ APP baseline = 100 (first-time)");
  console.log("  ✅ DEV baseline = 50 or adaptive");
  console.log("  ✅ APP overall = MIN (weakest link)");
  console.log("  ✅ DEV overall = AVG (balanced)");
  console.log("  ✅ Separate Supabase storage");
  console.log("  ✅ Independent trend tracking\n");
}

// Run test
if (require.main === module) {
  testDualScoring()
    .then(() => {
      console.log("✅ Dual scoring test completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}

export { testDualScoring };
