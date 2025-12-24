/**
 * Pattern Learning Monitoring Test
 *
 * Monitors the complete fix pattern lifecycle:
 *
 * 1. SCAN → Find issues
 * 2. PATTERN LOOKUP → Check if pattern exists (FREE - Supabase query)
 * 3. AI-FIXER → Generate fix if no pattern (COSTS $$$ - AI API call)
 * 4. VERIFICATION → Validate fix quality (syntax, type, lint, security)
 * 5. PATTERN CREATION → Submit to registry if verified (FREE - Supabase insert)
 * 6. PATTERN ACTIVATION → Admin approval or auto-approve (FREE)
 *
 * COST BREAKDOWN:
 * - Pattern Lookup: FREE (Supabase query)
 * - Pattern Application: FREE (string transformation)
 * - AI-Fixer: ~2-5¢/fix (OpenRouter API)
 * - Verification: FREE (local checks)
 * - Pattern Storage: FREE (Supabase insert)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// TYPES
// ============================================================

interface StepMetrics {
  step: string;
  duration: number;
  success: boolean;
  cost: number;
  details: Record<string, any>;
}

interface PatternStats {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  bySource: Record<string, number>;
  byTool: Record<string, number>;
  avgConfidence: number;
  avgSuccessRate: number;
}

interface VerificationStats {
  total: number;
  passed: number;
  failed: number;
  avgScore: number;
  avgAttempts: number;
  commonFailures: Array<{ reason: string; count: number }>;
}

// ============================================================
// MAIN MONITORING TEST
// ============================================================

async function runPatternLearningMonitor(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     PATTERN LEARNING MONITORING TEST                         ║');
  console.log('║     Tracking: Creation → Verification → Activation           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Check Supabase connection
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
    console.log('   Cannot monitor pattern learning without database connection\n');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Connected to Supabase\n');

  const allMetrics: StepMetrics[] = [];

  // ================================================================
  // STEP 1: Pattern Registry Stats
  // ================================================================
  console.log('='.repeat(60));
  console.log('STEP 1: CURRENT PATTERN REGISTRY STATS');
  console.log('='.repeat(60));

  const patternStats = await getPatternStats(supabase);
  allMetrics.push({
    step: 'Pattern Registry Query',
    duration: patternStats.queryTime,
    success: true,
    cost: 0,
    details: patternStats.stats,
  });

  console.log('\n📊 Pattern Registry Overview:');
  console.log(`   Total Patterns: ${patternStats.stats.total}`);
  console.log(`   Active: ${patternStats.stats.active}`);
  console.log(`   Pending Review: ${patternStats.stats.pending}`);
  console.log(`   Rejected: ${patternStats.stats.rejected}`);
  console.log(`   Avg Confidence: ${patternStats.stats.avgConfidence.toFixed(1)}%`);
  console.log(`   Avg Success Rate: ${patternStats.stats.avgSuccessRate.toFixed(1)}%`);

  console.log('\n📦 Patterns by Source:');
  for (const [source, count] of Object.entries(patternStats.stats.bySource)) {
    console.log(`   ${source}: ${count}`);
  }

  console.log('\n🔧 Patterns by Tool:');
  for (const [tool, count] of Object.entries(patternStats.stats.byTool)) {
    console.log(`   ${tool}: ${count}`);
  }

  // ================================================================
  // STEP 2: Pattern Lookup Performance
  // ================================================================
  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: PATTERN LOOKUP PERFORMANCE');
  console.log('='.repeat(60));

  const testRules = [
    'java.spring.security.audit.spring-actuator-fully-enabled.spring-actuator-fully-enabled',
    'dockerfile.security.no-sudo-in-dockerfile.no-sudo-in-dockerfile',
    'yaml.kubernetes.security.allow-privilege-escalation-no-securitycontext',
    'javascript.express.security.audit.xss-direct-response-write',
    'python.lang.security.audit.insecure-file-permissions',
  ];

  console.log(`\n🔍 Testing lookup for ${testRules.length} rules...\n`);

  for (const ruleId of testRules) {
    const start = Date.now();
    const { data: patterns } = await supabase
      .from('fix_patterns')
      .select('id, confidence, safe_for_auto_apply, apply_count, success_count, status')
      .eq('rule_id', ruleId)
      .eq('status', 'active');

    const duration = Date.now() - start;
    const found = patterns && patterns.length > 0;

    allMetrics.push({
      step: `Lookup: ${ruleId.slice(0, 40)}...`,
      duration,
      success: true,
      cost: 0,
      details: { found, count: patterns?.length || 0 },
    });

    const status = found ? '✅' : '⚠️';
    const shortRule = ruleId.length > 50 ? ruleId.slice(0, 50) + '...' : ruleId;
    console.log(`   ${status} ${shortRule}`);
    console.log(`      Found: ${patterns?.length || 0} patterns | Time: ${duration}ms | Cost: FREE`);

    if (found && patterns!.length > 0) {
      const p = patterns![0];
      const successRate = p.apply_count > 0 ? (p.success_count / p.apply_count * 100).toFixed(1) : 'N/A';
      console.log(`      Best: ${p.confidence}% confidence | ${successRate}% success | Auto-apply: ${p.safe_for_auto_apply}`);
    }
  }

  // ================================================================
  // STEP 3: Recent Pattern Activity
  // ================================================================
  console.log('\n' + '='.repeat(60));
  console.log('STEP 3: RECENT PATTERN ACTIVITY (Last 24 Hours)');
  console.log('='.repeat(60));

  const recentActivity = await getRecentPatternActivity(supabase);

  console.log('\n📈 Recent Activity:');
  console.log(`   Patterns Created: ${recentActivity.created}`);
  console.log(`   Patterns Activated: ${recentActivity.activated}`);
  console.log(`   Patterns Applied: ${recentActivity.applied}`);
  console.log(`   Successful Fixes: ${recentActivity.successful}`);

  if (recentActivity.recentPatterns.length > 0) {
    console.log('\n📝 Latest Patterns:');
    for (const p of recentActivity.recentPatterns.slice(0, 5)) {
      console.log(`   • ${p.rule_id.slice(0, 50)}`);
      console.log(`     Source: ${p.source} | Status: ${p.status} | Created: ${p.created_at}`);
    }
  }

  // ================================================================
  // STEP 4: Verification Stats
  // ================================================================
  console.log('\n' + '='.repeat(60));
  console.log('STEP 4: AI-FIXER VERIFICATION STATS');
  console.log('='.repeat(60));

  // Query routing decisions for AI-fixer performance
  const { data: routingData } = await supabase
    .from('fix_routing_decisions')
    .select('*')
    .eq('selected_source', 'ai_fixer')
    .order('created_at', { ascending: false })
    .limit(100);

  if (routingData && routingData.length > 0) {
    const totalDecisions = routingData.length;
    const avgCost = routingData.reduce((sum, r) => sum + (parseFloat(r.ai_fixer_cost_cents) || 0), 0) / totalDecisions;
    const fallbacks = routingData.filter(r => r.was_fallback).length;

    console.log('\n🤖 AI-Fixer Performance (Last 100 decisions):');
    console.log(`   Total Decisions: ${totalDecisions}`);
    console.log(`   Avg Cost: ${avgCost.toFixed(2)}¢/fix`);
    console.log(`   Fallback Rate: ${((fallbacks / totalDecisions) * 100).toFixed(1)}%`);

    // Group by language
    const byLanguage: Record<string, number> = {};
    for (const r of routingData) {
      byLanguage[r.language || 'unknown'] = (byLanguage[r.language || 'unknown'] || 0) + 1;
    }

    console.log('\n   By Language:');
    for (const [lang, count] of Object.entries(byLanguage)) {
      console.log(`      ${lang}: ${count}`);
    }
  } else {
    console.log('\n   ℹ️ No AI-Fixer routing decisions found');
  }

  // ================================================================
  // STEP 5: Pattern Application Tracking
  // ================================================================
  console.log('\n' + '='.repeat(60));
  console.log('STEP 5: PATTERN APPLICATION TRACKING');
  console.log('='.repeat(60));

  // Get top performing patterns
  const { data: topPatterns } = await supabase
    .from('fix_patterns')
    .select('rule_id, tool, apply_count, success_count, revert_count, confidence')
    .eq('status', 'active')
    .gt('apply_count', 0)
    .order('apply_count', { ascending: false })
    .limit(10);

  if (topPatterns && topPatterns.length > 0) {
    console.log('\n🏆 Top Performing Patterns:');
    console.log('   ─────────────────────────────────────────────────────────────');
    console.log('   Rule                                    │ Applied │ Success │ Reverts');
    console.log('   ─────────────────────────────────────────────────────────────');

    for (const p of topPatterns) {
      const shortRule = p.rule_id.slice(0, 40).padEnd(40);
      const successRate = p.apply_count > 0
        ? ((p.success_count / p.apply_count) * 100).toFixed(0)
        : 'N/A';
      console.log(`   ${shortRule} │ ${p.apply_count.toString().padStart(7)} │ ${(successRate + '%').padStart(7)} │ ${p.revert_count}`);
    }
    console.log('   ─────────────────────────────────────────────────────────────');
  } else {
    console.log('\n   ℹ️ No patterns with application history found');
  }

  // ================================================================
  // STEP 6: Cost Analysis
  // ================================================================
  console.log('\n' + '='.repeat(60));
  console.log('STEP 6: COST ANALYSIS');
  console.log('='.repeat(60));

  console.log('\n💰 Fix Tier Cost Breakdown:');
  console.log('   ─────────────────────────────────────────────────────────────');
  console.log('   Tier                    │ Cost/Fix    │ Speed    │ Notes');
  console.log('   ─────────────────────────────────────────────────────────────');
  console.log('   Tier 1: Native Tools    │ FREE        │ <1s      │ eslint --fix, ruff --fix');
  console.log('   Tier 2.5: Pattern Lookup│ FREE        │ <100ms   │ Supabase query');
  console.log('   Tier 2.5: Pattern Apply │ FREE        │ <10ms    │ String transformation');
  console.log('   Tier 3: AI-Fixer        │ 2-5¢        │ 2-5s     │ OpenRouter API');
  console.log('   Tier 3: Pattern Store   │ FREE        │ <50ms    │ Supabase insert');
  console.log('   ─────────────────────────────────────────────────────────────');

  // Calculate total savings from pattern reuse
  if (topPatterns && topPatterns.length > 0) {
    const totalApplications = topPatterns.reduce((sum, p) => sum + p.apply_count, 0);
    const aiCostPerFix = 3.5; // cents
    const savedCents = totalApplications * aiCostPerFix;

    console.log('\n   📊 Pattern Reuse Savings:');
    console.log(`      Total pattern applications: ${totalApplications}`);
    console.log(`      AI cost avoided: ${savedCents.toFixed(0)}¢ ($${(savedCents / 100).toFixed(2)})`);
    console.log(`      Avg time saved: ${(totalApplications * 3)}s (vs AI generation)`);
  }

  // ================================================================
  // SUMMARY
  // ================================================================
  console.log('\n' + '='.repeat(60));
  console.log('MONITORING SUMMARY');
  console.log('='.repeat(60));

  const totalTime = allMetrics.reduce((sum, m) => sum + m.duration, 0);
  const totalCost = allMetrics.reduce((sum, m) => sum + m.cost, 0);

  console.log('\n📋 Metrics Collected:');
  for (const m of allMetrics.slice(0, 10)) {
    const status = m.success ? '✅' : '❌';
    const costStr = m.cost === 0 ? 'FREE' : `${m.cost.toFixed(2)}¢`;
    console.log(`   ${status} ${m.step.slice(0, 45).padEnd(45)} │ ${m.duration}ms │ ${costStr}`);
  }

  console.log(`\n⏱️ Total monitoring time: ${totalTime}ms`);
  console.log(`💰 Total cost: ${totalCost === 0 ? 'FREE' : totalCost.toFixed(2) + '¢'}`);

  console.log('\n✅ Pattern learning monitoring complete');
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function getPatternStats(supabase: SupabaseClient): Promise<{ stats: PatternStats; queryTime: number }> {
  const start = Date.now();

  const { data: patterns } = await supabase
    .from('fix_patterns')
    .select('status, source, tool, confidence, apply_count, success_count');

  const queryTime = Date.now() - start;

  if (!patterns || patterns.length === 0) {
    return {
      stats: {
        total: 0,
        active: 0,
        pending: 0,
        rejected: 0,
        bySource: {},
        byTool: {},
        avgConfidence: 0,
        avgSuccessRate: 0,
      },
      queryTime,
    };
  }

  const stats: PatternStats = {
    total: patterns.length,
    active: patterns.filter(p => p.status === 'active').length,
    pending: patterns.filter(p => p.status === 'pending_review').length,
    rejected: patterns.filter(p => p.status === 'rejected').length,
    bySource: {},
    byTool: {},
    avgConfidence: 0,
    avgSuccessRate: 0,
  };

  // Group by source and tool
  for (const p of patterns) {
    stats.bySource[p.source || 'unknown'] = (stats.bySource[p.source || 'unknown'] || 0) + 1;
    stats.byTool[p.tool || 'unknown'] = (stats.byTool[p.tool || 'unknown'] || 0) + 1;
  }

  // Calculate averages
  stats.avgConfidence = patterns.reduce((sum, p) => sum + (p.confidence || 0), 0) / patterns.length;

  const patternsWithHistory = patterns.filter(p => p.apply_count > 0);
  if (patternsWithHistory.length > 0) {
    stats.avgSuccessRate = patternsWithHistory.reduce((sum, p) =>
      sum + (p.success_count / p.apply_count * 100), 0) / patternsWithHistory.length;
  }

  return { stats, queryTime };
}

async function getRecentPatternActivity(supabase: SupabaseClient): Promise<{
  created: number;
  activated: number;
  applied: number;
  successful: number;
  recentPatterns: any[];
}> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Recent patterns
  const { data: recentPatterns } = await supabase
    .from('fix_patterns')
    .select('rule_id, source, status, created_at')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false });

  // Count by status
  const created = recentPatterns?.length || 0;
  const activated = recentPatterns?.filter(p => p.status === 'active').length || 0;

  // Recent applications (from patterns with updated apply_count)
  const { data: activePatterns } = await supabase
    .from('fix_patterns')
    .select('apply_count, success_count')
    .gte('updated_at', oneDayAgo);

  const applied = activePatterns?.reduce((sum, p) => sum + (p.apply_count || 0), 0) || 0;
  const successful = activePatterns?.reduce((sum, p) => sum + (p.success_count || 0), 0) || 0;

  return {
    created,
    activated,
    applied,
    successful,
    recentPatterns: recentPatterns || [],
  };
}

// Run the monitor
runPatternLearningMonitor().catch(error => {
  console.error('Monitor failed:', error);
  process.exit(1);
});
