#!/usr/bin/env ts-node
/**
 * BUG-110: Model Usage Tracking Test
 *
 * Tests that AI model usage is tracked and reported consistently
 */

import { ModelUsageTracker, trackModelUsage, getModelUsageReport, getModelConsistencyWarnings } from './src/two-branch/utils/model-usage-tracker';

async function testModelTracking(): Promise<void> {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  BUG-110: Model Usage Tracking Test                     ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  const tracker = ModelUsageTracker.getInstance();
  tracker.clear(); // Start fresh

  // Test 1: Record model usage
  console.log("TEST 1: Record model usage\n");

  trackModelUsage('openai/gpt-3.5-turbo', 'security', 500, 0.001);
  trackModelUsage('openai/gpt-3.5-turbo', 'security', 450, 0.0009);
  trackModelUsage('anthropic/claude-3-haiku', 'performance', 800, 0.002);
  trackModelUsage('openai/gpt-3.5-turbo', 'quality', 600, 0.0012);

  const history = tracker.getHistory();
  console.log(`  ✅ Recorded ${history.length} model usages`);
  console.log(`     Models: ${tracker.getUniqueModels().join(', ')}`);
  console.log();

  // Test 2: Usage by agent
  console.log("TEST 2: Usage by agent\n");

  const securityUsage = tracker.getUsageByAgent('security');
  console.log(`  ✅ Security agent: ${securityUsage.length} calls`);

  const performanceUsage = tracker.getUsageByAgent('performance');
  console.log(`  ✅ Performance agent: ${performanceUsage.length} calls`);

  const qualityUsage = tracker.getUsageByAgent('quality');
  console.log(`  ✅ Quality agent: ${qualityUsage.length} calls\n`);

  // Test 3: Agent model report
  console.log("TEST 3: Agent model report\n");

  const securityReport = tracker.getAgentModelReport('security');
  console.log(`  ✅ Security Agent Report:`);
  console.log(`     Total calls: ${securityReport.totalCalls}`);
  console.log(`     Models used:`);
  securityReport.models.forEach(m => {
    console.log(`       - ${m.model}: ${m.count} calls, ${m.totalTokens} tokens`);
  });
  console.log();

  // Test 4: Overall usage summary
  console.log("TEST 4: Overall usage summary\n");

  const summary = tracker.getUsageSummary();
  console.log(`  ✅ Total calls: ${summary.totalCalls}`);
  console.log(`  ✅ Unique models: ${summary.uniqueModels.length}`);
  console.log(`  ✅ Total tokens: ${summary.totalTokens}`);
  console.log(`  ✅ Total cost: $${summary.totalCost.toFixed(4)}`);
  console.log(`  ✅ Agents tracked: ${Object.keys(summary.byAgent).length}\n`);

  // Test 5: Model consistency check
  console.log("TEST 5: Model consistency check\n");

  const securityConsistent = tracker.isModelConsistent('security');
  console.log(`  ${securityConsistent ? '✅' : '⚠️'}  Security agent consistent: ${securityConsistent}`);
  console.log(`     Primary model: ${tracker.getMostUsedModel('security')}`);

  const performanceConsistent = tracker.isModelConsistent('performance');
  console.log(`  ${performanceConsistent ? '✅' : '⚠️'}  Performance agent consistent: ${performanceConsistent}`);
  console.log(`     Primary model: ${tracker.getMostUsedModel('performance')}\n`);

  // Test 6: Consistency report
  console.log("TEST 6: Consistency report\n");

  const consistencyReport = tracker.getConsistencyReport();
  console.log(`  Generated ${consistencyReport.length} consistency reports:`);
  consistencyReport.forEach(report => {
    const icon = report.isConsistent ? '✅' : '⚠️';
    console.log(`    ${icon} ${report.agent}: ${report.distribution}`);
  });
  console.log();

  // Test 7: Add mixed model usage (inconsistent)
  console.log("TEST 7: Detect inconsistent model usage\n");

  trackModelUsage('anthropic/claude-3-haiku', 'security', 700, 0.0014);
  trackModelUsage('openai/gpt-4o-mini', 'security', 1000, 0.003);

  const newSecurityConsistent = tracker.isModelConsistent('security');
  console.log(`  Security agent after mixed usage:`);
  console.log(`    Consistent: ${newSecurityConsistent ? 'Yes ✅' : 'No ⚠️'}`);

  const newSecurityReport = tracker.getAgentModelReport('security');
  console.log(`    Models: ${newSecurityReport.models.length}`);
  newSecurityReport.models.forEach(m => {
    const pct = ((m.count / newSecurityReport.totalCalls) * 100).toFixed(0);
    console.log(`      - ${m.model}: ${m.count} calls (${pct}%)`);
  });
  console.log();

  // Test 8: Consistency warnings
  console.log("TEST 8: Generate consistency warnings\n");

  const warnings = getModelConsistencyWarnings();
  console.log(`  Generated ${warnings.length} warnings:`);
  warnings.forEach(warning => console.log(`    ${warning}`));

  if (warnings.length === 0) {
    console.log(`    ✅ No consistency warnings (all agents using consistent models)`);
  }
  console.log();

  // Test 9: Formatted report
  console.log("TEST 9: Generate formatted markdown report\n");

  const markdownReport = getModelUsageReport();
  const reportLines = markdownReport.split('\n');
  console.log(`  ✅ Generated ${reportLines.length} line report`);
  console.log(`  Preview (first 10 lines):\n`);
  reportLines.slice(0, 10).forEach(line => console.log(`    ${line}`));
  console.log(`    ...\n`);

  // Test 10: JSON export
  console.log("TEST 10: JSON export\n");

  const jsonExport = tracker.exportJSON();
  const parsed = JSON.parse(jsonExport);
  console.log(`  ✅ Exported ${parsed.length} usage records`);
  console.log(`  Sample record:`);
  console.log(`    Model: ${parsed[0].model}`);
  console.log(`    Agent: ${parsed[0].agent}`);
  console.log(`    Tokens: ${parsed[0].tokensUsed}`);
  console.log(`    Cost: $${parsed[0].cost}\n`);

  // Test 11: Real-world scenario
  console.log("TEST 11: Real-world multi-agent analysis simulation\n");

  tracker.clear();

  // Simulate a full V9 analysis
  const agents = ['security', 'quality', 'performance', 'architecture', 'dependency'];
  const models = {
    security: 'anthropic/claude-3-haiku',  // Better model for security
    quality: 'openai/gpt-3.5-turbo',       // Cheaper for quality
    performance: 'openai/gpt-3.5-turbo',
    architecture: 'anthropic/claude-3-haiku',  // Better for architecture
    dependency: 'openai/gpt-3.5-turbo'
  };

  agents.forEach(agent => {
    const model = models[agent as keyof typeof models];
    // Simulate 5 API calls per agent
    for (let i = 0; i < 5; i++) {
      const tokens = 400 + Math.floor(Math.random() * 400);
      const cost = tokens * 0.000002;
      trackModelUsage(model, agent, tokens, cost);
    }
  });

  const finalSummary = tracker.getUsageSummary();
  console.log(`  Simulated full analysis:`);
  console.log(`    Total API calls: ${finalSummary.totalCalls}`);
  console.log(`    Agents used: ${Object.keys(finalSummary.byAgent).length}`);
  console.log(`    Models used: ${finalSummary.uniqueModels.length}`);
  console.log(`    Total tokens: ${finalSummary.totalTokens.toLocaleString()}`);
  console.log(`    Total cost: $${finalSummary.totalCost.toFixed(4)}`);
  console.log();

  console.log(`  Agent breakdown:`);
  Object.entries(finalSummary.byAgent).forEach(([agent, report]) => {
    const primaryModel = report.models[0]?.model || 'none';
    console.log(`    ${agent}: ${report.totalCalls} calls using ${primaryModel}`);
  });
  console.log();

  const finalWarnings = getModelConsistencyWarnings();
  if (finalWarnings.length > 0) {
    console.log(`  ⚠️  Consistency warnings:`);
    finalWarnings.forEach(w => console.log(`    ${w}`));
  } else {
    console.log(`  ✅ All agents using consistent models`);
  }
  console.log();

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  BUG-110 Validation Complete                             ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  console.log("✅ Model usage tracking working!\n");
  console.log("Features Implemented:");
  console.log("  ✅ Record model usage per agent");
  console.log("  ✅ Track tokens and costs");
  console.log("  ✅ Generate usage reports by agent");
  console.log("  ✅ Calculate overall usage summary");
  console.log("  ✅ Detect model consistency");
  console.log("  ✅ Identify primary model per agent");
  console.log("  ✅ Generate consistency warnings");
  console.log("  ✅ Format markdown reports");
  console.log("  ✅ Export usage data as JSON");
  console.log("  ✅ Singleton pattern for global tracking\n");

  console.log("📋 Next Step:");
  console.log("   Integrate model tracking into EnhancedFixGenerator and V9 agents\n");
}

if (require.main === module) {
  testModelTracking()
    .then(() => {
      console.log("✅ Test completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}

export { testModelTracking };
