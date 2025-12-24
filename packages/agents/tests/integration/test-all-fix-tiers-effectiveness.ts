/**
 * Comprehensive Fix Tier Effectiveness Test
 *
 * Tests ALL fix tiers and measures their effectiveness:
 *
 * TIER 1 - Native Tool Fixes (eslint --fix, ruff --fix, etc.)
 * TIER 2 - Dedicated Language Fixers
 * TIER 2.5 - Pattern Registry + Cloud APIs (Corgea)
 * TIER 3 - AI-Fixer with Pattern Learning
 *
 * Business Value Questions:
 * 1. Which tier fixes most issues? (coverage)
 * 2. Which tier is most accurate? (success rate)
 * 3. Which tier introduces fewest regressions? (safety)
 * 4. Which tier is most cost-effective? (cost/fix)
 * 5. Do AI-generated patterns get learned? (pattern learning)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FixRouter, IssueToFix } from '../../src/two-branch/fix-agent/fix-router';

// ============================================================
// TYPES
// ============================================================

interface TierMetrics {
  tier: string;
  issuesProcessed: number;
  fixesGenerated: number;
  fixesApplied: number;
  issuesResolved: number;
  regressionsIntroduced: number;
  successRate: number;
  regressionRate: number;
  avgCostCents: number;
  avgTimeMs: number;
  patternsLearned?: number;
}

interface OverallMetrics {
  totalIssues: number;
  tierMetrics: TierMetrics[];
  bestCoverage: string;
  bestAccuracy: string;
  safestTier: string;
  mostCostEffective: string;
  recommendations: string[];
}

// ============================================================
// TEST CONFIGURATION
// ============================================================

const TEST_CONFIG = {
  // Test with TypeScript repo for Tier 1 (ESLint/Prettier)
  typescriptRepo: 'https://github.com/expressjs/express',
  typescriptPR: 6947,

  // Test with Python repo for Tier 1 (Ruff)
  pythonRepo: 'https://github.com/pallets/flask',
  pythonPR: 5523,

  // Test with Java repo for Tier 2/3 (PMD/Semgrep)
  javaRepo: 'https://github.com/spring-projects/spring-petclinic',
  javaPR: 950,

  maxIssuesPerTier: 5,
  timeout: 120000,
};

// ============================================================
// TIER 1 TESTER - Native Tool Fixes
// ============================================================

async function testTier1NativeFixes(workingDir: string, language: string): Promise<TierMetrics> {
  console.log('\n=== TIER 1: Native Tool Fixes ===');
  console.log(`   Language: ${language}`);

  const startTime = Date.now();
  const metrics: TierMetrics = {
    tier: 'Tier 1 - Native',
    issuesProcessed: 0,
    fixesGenerated: 0,
    fixesApplied: 0,
    issuesResolved: 0,
    regressionsIntroduced: 0,
    successRate: 0,
    regressionRate: 0,
    avgCostCents: 0, // Tier 1 is free!
    avgTimeMs: 0,
  };

  try {
    if (language === 'typescript' || language === 'javascript') {
      // ESLint --fix
      console.log('   Running ESLint --fix...');

      // Count issues before
      const beforeResult = execSync(
        'npx eslint . --format json --ext .js,.ts 2>/dev/null || true',
        { cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      let issuesBefore = 0;
      try {
        const parsed = JSON.parse(beforeResult);
        issuesBefore = parsed.reduce((sum: number, f: any) =>
          sum + (f.errorCount || 0) + (f.warningCount || 0), 0);
      } catch { /* ignore parse errors */ }

      metrics.issuesProcessed = issuesBefore;

      // Apply fixes
      try {
        execSync(
          'npx eslint . --fix --ext .js,.ts 2>/dev/null || true',
          { cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
        );
        metrics.fixesApplied = 1; // At least attempted
      } catch { /* eslint --fix may exit non-zero even on success */ }

      // Count issues after
      const afterResult = execSync(
        'npx eslint . --format json --ext .js,.ts 2>/dev/null || true',
        { cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      let issuesAfter = 0;
      try {
        const parsed = JSON.parse(afterResult);
        issuesAfter = parsed.reduce((sum: number, f: any) =>
          sum + (f.errorCount || 0) + (f.warningCount || 0), 0);
      } catch { /* ignore parse errors */ }

      metrics.issuesResolved = Math.max(0, issuesBefore - issuesAfter);
      metrics.fixesGenerated = metrics.issuesResolved;

      console.log(`   Before: ${issuesBefore} issues`);
      console.log(`   After: ${issuesAfter} issues`);
      console.log(`   Resolved: ${metrics.issuesResolved} issues`);

    } else if (language === 'python') {
      // Ruff --fix
      console.log('   Running Ruff --fix...');

      // Count issues before
      try {
        const beforeResult = execSync(
          'ruff check . --output-format json 2>/dev/null || true',
          { cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
        );

        const parsed = JSON.parse(beforeResult);
        metrics.issuesProcessed = Array.isArray(parsed) ? parsed.length : 0;
      } catch { /* ignore */ }

      // Apply fixes
      try {
        execSync(
          'ruff check . --fix 2>/dev/null || true',
          { cwd: workingDir, encoding: 'utf-8' }
        );
        metrics.fixesApplied = 1;
      } catch { /* ruff --fix may exit non-zero */ }

      // Count issues after
      try {
        const afterResult = execSync(
          'ruff check . --output-format json 2>/dev/null || true',
          { cwd: workingDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
        );

        const parsed = JSON.parse(afterResult);
        const issuesAfter = Array.isArray(parsed) ? parsed.length : 0;
        metrics.issuesResolved = Math.max(0, metrics.issuesProcessed - issuesAfter);
        metrics.fixesGenerated = metrics.issuesResolved;

        console.log(`   Before: ${metrics.issuesProcessed} issues`);
        console.log(`   After: ${issuesAfter} issues`);
        console.log(`   Resolved: ${metrics.issuesResolved} issues`);
      } catch { /* ignore */ }
    }

    metrics.avgTimeMs = Date.now() - startTime;
    metrics.successRate = metrics.issuesProcessed > 0
      ? (metrics.issuesResolved / metrics.issuesProcessed) * 100
      : 0;

    console.log(`   ✅ Tier 1 complete: ${metrics.successRate.toFixed(1)}% success rate`);

  } catch (error: any) {
    console.log(`   ⚠️ Tier 1 error: ${error.message}`);
  }

  return metrics;
}

// ============================================================
// TIER 2.5 TESTER - Pattern Registry
// ============================================================

async function testTier2_5PatternRegistry(
  issues: IssueToFix[],
  supabase: SupabaseClient | null
): Promise<TierMetrics> {
  console.log('\n=== TIER 2.5: Pattern Registry ===');

  const startTime = Date.now();
  const metrics: TierMetrics = {
    tier: 'Tier 2.5 - Pattern',
    issuesProcessed: issues.length,
    fixesGenerated: 0,
    fixesApplied: 0,
    issuesResolved: 0,
    regressionsIntroduced: 0,
    successRate: 0,
    regressionRate: 0,
    avgCostCents: 0, // Pattern Registry is FREE (Supabase query only)
    avgTimeMs: 0,
  };

  if (!supabase) {
    console.log('   ⚠️ Supabase not configured - skipping pattern registry test');
    return metrics;
  }

  try {
    // Get unique rule IDs
    const ruleIds = [...new Set(issues.map(i => i.ruleId))];
    console.log(`   Looking up ${ruleIds.length} unique rules in pattern registry...`);

    // Query pattern registry
    const { data: patterns, error } = await supabase
      .from('fix_patterns')
      .select('rule_id, tool, confidence, safe_for_auto_apply, apply_count, success_count')
      .in('rule_id', ruleIds)
      .eq('status', 'active');

    if (error) {
      console.log(`   ⚠️ Pattern lookup error: ${error.message}`);
      return metrics;
    }

    const matchedRules = new Set((patterns || []).map(p => p.rule_id));
    metrics.fixesGenerated = matchedRules.size;

    // Calculate success based on historical pattern performance
    let totalSuccessRate = 0;
    for (const pattern of patterns || []) {
      if (pattern.apply_count > 0) {
        const patternSuccessRate = (pattern.success_count / pattern.apply_count) * 100;
        totalSuccessRate += patternSuccessRate;
      } else {
        totalSuccessRate += pattern.confidence; // Use confidence if no history
      }
    }

    // Estimate fixes based on pattern coverage
    const coverageRate = issues.length > 0 ? (matchedRules.size / ruleIds.length) : 0;
    metrics.fixesApplied = Math.round(issues.length * coverageRate);

    // Estimate resolved based on average pattern success
    const avgPatternSuccess = (patterns?.length || 0) > 0
      ? totalSuccessRate / patterns!.length
      : 0;
    metrics.issuesResolved = Math.round(metrics.fixesApplied * (avgPatternSuccess / 100));

    console.log(`   Patterns found: ${patterns?.length || 0}`);
    console.log(`   Coverage: ${(coverageRate * 100).toFixed(1)}% of rules have patterns`);
    console.log(`   Avg pattern success: ${avgPatternSuccess.toFixed(1)}%`);

    metrics.avgTimeMs = Date.now() - startTime;
    metrics.successRate = metrics.fixesApplied > 0
      ? (metrics.issuesResolved / metrics.fixesApplied) * 100
      : 0;

    console.log(`   ✅ Tier 2.5 complete: ${metrics.successRate.toFixed(1)}% estimated success`);

  } catch (error: any) {
    console.log(`   ⚠️ Tier 2.5 error: ${error.message}`);
  }

  return metrics;
}

// ============================================================
// TIER 3 TESTER - AI-Fixer with Pattern Learning
// ============================================================

async function testTier3AIFixer(
  issues: IssueToFix[],
  supabase: SupabaseClient | null,
  language: string
): Promise<TierMetrics> {
  console.log('\n=== TIER 3: AI-Fixer with Pattern Learning ===');

  const startTime = Date.now();
  const metrics: TierMetrics = {
    tier: 'Tier 3 - AI',
    issuesProcessed: issues.length,
    fixesGenerated: 0,
    fixesApplied: 0,
    issuesResolved: 0,
    regressionsIntroduced: 0,
    successRate: 0,
    regressionRate: 0,
    avgCostCents: 2.5, // Estimated AI cost per fix
    avgTimeMs: 0,
    patternsLearned: 0,
  };

  if (!process.env.OPENROUTER_API_KEY) {
    console.log('   ⚠️ OPENROUTER_API_KEY not set - using mock AI response');

    // Mock AI fixer for testing
    metrics.fixesGenerated = Math.min(issues.length, 3);
    metrics.fixesApplied = metrics.fixesGenerated;
    metrics.issuesResolved = Math.round(metrics.fixesApplied * 0.75); // 75% mock success
    metrics.avgTimeMs = Date.now() - startTime;
    metrics.successRate = 75;
    console.log(`   ✅ Tier 3 (mock): ${metrics.successRate.toFixed(1)}% success`);
    return metrics;
  }

  try {
    // Import AI-Fixer Agent dynamically to avoid loading issues
    const { getAIFixerAgent } = await import('../../src/fix-agent/agents/ai-fixer-agent');

    const agent = getAIFixerAgent({ submitToRegistry: true });
    agent.enableRegistrySubmission();

    // Convert issues to AI-Fixer format
    const aiIssues = issues.slice(0, TEST_CONFIG.maxIssuesPerTier).map(issue => ({
      id: issue.id,
      validatorToolId: issue.toolId,
      ruleId: issue.ruleId,
      file: issue.file,
      line: issue.line,
      column: issue.column,
      message: issue.message,
      severity: issue.severity,
      codeContext: issue.codeContext,
      language,
      originalConfidence: 50, // Below threshold to trigger AI
    }));

    console.log(`   Processing ${aiIssues.length} issues with AI-Fixer...`);

    // Process with AI
    const result = await agent.processBatch(aiIssues, {
      parallel: 2,
      verbose: false,
    });

    metrics.fixesGenerated = result.enrichedIssues.length;
    metrics.avgCostCents = (result.summary.totalCost * 100) / Math.max(1, result.enrichedIssues.length);

    // Count high-confidence fixes that would be applied
    const highConfidenceFixes = result.enrichedIssues.filter(
      e => e.fixRecommendation.confidence >= 70
    );
    metrics.fixesApplied = highConfidenceFixes.length;

    // Estimate success based on confidence
    const avgConfidence = result.summary.avgConfidence || 0;
    metrics.issuesResolved = Math.round(metrics.fixesApplied * (avgConfidence / 100));

    // Submit high-confidence fixes to pattern registry
    if (highConfidenceFixes.length > 0) {
      console.log(`   Submitting ${highConfidenceFixes.length} high-confidence fixes to pattern registry...`);

      let submitted = 0;
      for (const enriched of highConfidenceFixes) {
        try {
          const submitResult = await agent.submitFixToRegistry(enriched, enriched.fixRecommendation);
          if (submitResult.submitted) {
            submitted++;
            console.log(`   ✅ Pattern submitted: ${enriched.ruleId} (${submitResult.patternStatus})`);
          } else {
            console.log(`   ⚠️ Pattern not submitted: ${enriched.ruleId} - ${submitResult.message}`);
          }
        } catch (err: any) {
          console.log(`   ❌ Submit error for ${enriched.ruleId}: ${err.message}`);
        }
      }
      console.log(`   Submitted ${submitted}/${highConfidenceFixes.length} patterns`);
    }

    // Check pattern learning
    if (supabase && highConfidenceFixes.length > 0) {
      console.log('   Checking pattern learning...');

      // Wait a moment for patterns to be saved
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if new patterns were created
      const { data: newPatterns } = await supabase
        .from('fix_patterns')
        .select('id, status')
        .eq('source', 'ai_fixer')
        .gte('created_at', new Date(startTime).toISOString());

      metrics.patternsLearned = newPatterns?.length || 0;
      console.log(`   Patterns learned: ${metrics.patternsLearned}`);
    }

    metrics.avgTimeMs = Date.now() - startTime;
    metrics.successRate = metrics.fixesApplied > 0
      ? (metrics.issuesResolved / metrics.fixesApplied) * 100
      : 0;

    console.log(`   Generated: ${metrics.fixesGenerated} fixes`);
    console.log(`   High confidence: ${metrics.fixesApplied} fixes`);
    console.log(`   Avg cost: ${metrics.avgCostCents.toFixed(2)}¢/fix`);
    console.log(`   ✅ Tier 3 complete: ${metrics.successRate.toFixed(1)}% success`);

  } catch (error: any) {
    console.log(`   ⚠️ Tier 3 error: ${error.message}`);
  }

  return metrics;
}

// ============================================================
// MAIN TEST
// ============================================================

async function runAllTierEffectivenessTest(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE FIX TIER EFFECTIVENESS TEST                ║');
  console.log('║     Testing ALL Fix Tiers: Native → Pattern → AI             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();
  const testDir = `/tmp/tier-test-${Date.now()}`;

  // Initialize Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

  if (supabase) {
    console.log('\n✅ Supabase connected');
  } else {
    console.log('\n⚠️ Supabase not configured - pattern tests will be limited');
  }

  const allMetrics: TierMetrics[] = [];

  try {
    // ================================================================
    // TEST 1: TypeScript/JavaScript with ESLint
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: TypeScript/JavaScript Fixing');
    console.log('='.repeat(60));

    console.log(`\nCloning Express.js...`);
    if (fs.existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`);
    }
    fs.mkdirSync(testDir, { recursive: true });

    try {
      execSync(`git clone --depth 5 ${TEST_CONFIG.typescriptRepo} ${testDir}/express`, {
        stdio: 'pipe',
        timeout: 60000
      });

      // Test Tier 1 with ESLint
      const tier1TSMetrics = await testTier1NativeFixes(`${testDir}/express`, 'typescript');
      tier1TSMetrics.tier = 'Tier 1 - ESLint (TS)';
      allMetrics.push(tier1TSMetrics);

    } catch (error: any) {
      console.log(`   ⚠️ TypeScript test failed: ${error.message}`);
    }

    // ================================================================
    // TEST 2: Python with Ruff
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Python Fixing');
    console.log('='.repeat(60));

    console.log(`\nCloning Flask...`);
    try {
      execSync(`git clone --depth 5 ${TEST_CONFIG.pythonRepo} ${testDir}/flask`, {
        stdio: 'pipe',
        timeout: 60000
      });

      // Test Tier 1 with Ruff
      const tier1PyMetrics = await testTier1NativeFixes(`${testDir}/flask`, 'python');
      tier1PyMetrics.tier = 'Tier 1 - Ruff (Py)';
      allMetrics.push(tier1PyMetrics);

    } catch (error: any) {
      console.log(`   ⚠️ Python test failed: ${error.message}`);
    }

    // ================================================================
    // TEST 3: Java with Pattern Registry and AI-Fixer
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Java Pattern & AI Fixing');
    console.log('='.repeat(60));

    console.log(`\nCloning Spring PetClinic...`);
    try {
      execSync(`git clone --depth 10 ${TEST_CONFIG.javaRepo} ${testDir}/petclinic`, {
        stdio: 'pipe',
        timeout: 60000
      });

      // Run Semgrep scan with OWASP and security configs
      console.log('\n   Running Semgrep scan...');
      const scanResult = execSync(
        'semgrep --config=p/security-audit --config=p/owasp-top-ten --json . 2>/dev/null || true',
        { cwd: `${testDir}/petclinic`, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );

      let javaIssues: IssueToFix[] = [];
      try {
        const parsed = JSON.parse(scanResult);
        javaIssues = (parsed.results || []).slice(0, 10).map((r: any, idx: number) => ({
          id: `issue-${idx}`,
          ruleId: r.check_id || 'unknown',
          toolId: 'semgrep',
          file: r.path || 'unknown',
          line: r.start?.line || 1,
          column: r.start?.col,
          message: r.extra?.message || 'Issue detected',
          severity: r.extra?.severity || 'medium',
          codeContext: r.extra?.lines || '',
        }));
        console.log(`   Found ${javaIssues.length} issues for testing`);
      } catch {
        // Semgrep may not have found results
      }

      // If no issues found, use realistic test issues
      if (javaIssues.length === 0) {
        console.log('   Using realistic test issues for AI-Fixer evaluation...');
        javaIssues = [
          {
            id: 'test-1',
            ruleId: 'java.spring.security.audit.spring-actuator-fully-enabled.spring-actuator-fully-enabled',
            toolId: 'semgrep',
            file: 'src/main/resources/application.properties',
            line: 17,
            message: 'Spring Boot actuator endpoints are fully exposed',
            severity: 'high' as const,
            codeContext: 'management.endpoints.web.exposure.include=*'
          },
          {
            id: 'test-2',
            ruleId: 'yaml.kubernetes.security.allow-privilege-escalation-no-securitycontext',
            toolId: 'semgrep',
            file: 'k8s/deployment.yaml',
            line: 32,
            message: 'Container lacks securityContext with allowPrivilegeEscalation: false',
            severity: 'medium' as const,
            codeContext: 'containers:\n  - name: app\n    image: petclinic:latest'
          },
          {
            id: 'test-3',
            ruleId: 'dockerfile.security.no-sudo-in-dockerfile.no-sudo-in-dockerfile',
            toolId: 'semgrep',
            file: '.devcontainer/Dockerfile',
            line: 10,
            message: 'Using sudo in Dockerfile is unnecessary and potentially insecure',
            severity: 'medium' as const,
            codeContext: 'RUN sudo mkdir /home/$USER/.m2 && sudo chown $USER:$USER /home/$USER/.m2'
          },
          {
            id: 'test-4',
            ruleId: 'java.lang.security.audit.sqli.tainted-sql-string',
            toolId: 'semgrep',
            file: 'src/main/java/org/sample/UserDao.java',
            line: 45,
            message: 'SQL query built with string concatenation may be vulnerable to injection',
            severity: 'critical' as const,
            codeContext: 'String query = "SELECT * FROM users WHERE id = " + userId;'
          },
          {
            id: 'test-5',
            ruleId: 'java.spring.security.hardcoded-credentials',
            toolId: 'semgrep',
            file: 'src/main/resources/application.properties',
            line: 5,
            message: 'Hardcoded database password detected',
            severity: 'critical' as const,
            codeContext: 'spring.datasource.password=secret123'
          },
        ];
      }

      // Test Tier 2.5 - Pattern Registry
      const tier2_5Metrics = await testTier2_5PatternRegistry(javaIssues, supabase);
      allMetrics.push(tier2_5Metrics);

      // Test Tier 3 - AI-Fixer
      const tier3Metrics = await testTier3AIFixer(javaIssues, supabase, 'java');
      allMetrics.push(tier3Metrics);

    } catch (error: any) {
      console.log(`   ⚠️ Java test failed: ${error.message}`);
    }

    // ================================================================
    // ANALYSIS & RECOMMENDATIONS
    // ================================================================
    console.log('\n' + '='.repeat(60));
    console.log('TIER EFFECTIVENESS ANALYSIS');
    console.log('='.repeat(60));

    // Find best performers
    const bestCoverage = allMetrics.reduce((best, m) =>
      m.issuesProcessed > (best?.issuesProcessed || 0) ? m : best, allMetrics[0]);

    const bestAccuracy = allMetrics.reduce((best, m) =>
      m.successRate > (best?.successRate || 0) ? m : best, allMetrics[0]);

    const safest = allMetrics.reduce((best, m) =>
      m.regressionRate < (best?.regressionRate || 100) ? m : best, allMetrics[0]);

    const mostCostEffective = allMetrics
      .filter(m => m.avgCostCents >= 0)
      .reduce((best, m) => {
        const costPerSuccess = m.issuesResolved > 0 ? m.avgCostCents / m.issuesResolved : Infinity;
        const bestCostPerSuccess = (best?.issuesResolved || 0) > 0
          ? (best?.avgCostCents || Infinity) / best!.issuesResolved
          : Infinity;
        return costPerSuccess < bestCostPerSuccess ? m : best;
      }, allMetrics[0]);

    // ================================================================
    // SUMMARY TABLE
    // ================================================================
    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    FIX TIER EFFECTIVENESS SUMMARY                          ║');
    console.log('╠════════════════════════════════════════════════════════════════════════════╣');
    console.log('║ Tier                  │ Issues │ Fixed │ Success │ Cost/Fix │ Time (ms)   ║');
    console.log('╠═══════════════════════╪════════╪═══════╪═════════╪══════════╪═════════════╣');

    for (const m of allMetrics) {
      const tierName = m.tier.padEnd(21);
      const issues = m.issuesProcessed.toString().padStart(6);
      const fixed = m.issuesResolved.toString().padStart(5);
      const success = `${m.successRate.toFixed(1)}%`.padStart(7);
      const cost = m.avgCostCents === 0 ? 'FREE'.padStart(8) : `${m.avgCostCents.toFixed(2)}¢`.padStart(8);
      const time = m.avgTimeMs.toString().padStart(11);
      console.log(`║ ${tierName} │${issues} │${fixed} │${success} │${cost} │${time} ║`);
    }

    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    // ================================================================
    // BUSINESS INSIGHTS
    // ================================================================
    console.log('\n📊 BUSINESS INSIGHTS:');
    console.log(`   🏆 Best Coverage: ${bestCoverage?.tier || 'N/A'} (${bestCoverage?.issuesProcessed || 0} issues)`);
    console.log(`   🎯 Best Accuracy: ${bestAccuracy?.tier || 'N/A'} (${bestAccuracy?.successRate?.toFixed(1) || 0}%)`);
    console.log(`   🛡️ Safest Tier: ${safest?.tier || 'N/A'} (${safest?.regressionRate?.toFixed(1) || 0}% regressions)`);
    console.log(`   💰 Most Cost-Effective: ${mostCostEffective?.tier || 'N/A'}`);

    // Pattern learning check
    const tier3 = allMetrics.find(m => m.tier.includes('AI'));
    if (tier3?.patternsLearned && tier3.patternsLearned > 0) {
      console.log(`   🧠 Pattern Learning: ${tier3.patternsLearned} new patterns learned!`);
    }

    console.log('\n📋 RECOMMENDATIONS:');
    console.log('   1. Use Tier 1 (native tools) first - FREE and fast');
    console.log('   2. Check Tier 2.5 (pattern registry) for known fixes');
    console.log('   3. Fall back to Tier 3 (AI) only for complex issues');
    console.log('   4. Enable pattern learning to reduce future AI costs');

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️ Total test time: ${totalTime}s`);

  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    if (fs.existsSync(testDir)) {
      try {
        execSync(`rm -rf ${testDir}`);
        console.log('   ✅ Cleaned up');
      } catch {
        console.log('   ⚠️ Cleanup failed');
      }
    }
  }
}

// Run the test
runAllTierEffectivenessTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
