/**
 * Routing Decisions Monitor
 *
 * Monitors the fix_routing_decisions table to track:
 * - Which fix sources are being used (native, pattern, ai-fixer)
 * - Cost analysis (AI-Fixer vs Corgea)
 * - Fallback rates
 * - Language distribution
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

async function monitorRoutingDecisions() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     ROUTING DECISIONS MONITORING                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Check if table exists and has data
  const { data: decisions, error } = await supabase
    .from('fix_routing_decisions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.log('Query error:', error.message);
    return;
  }

  console.log('📊 Total recent routing decisions: ' + (decisions?.length || 0) + '\n');

  if (!decisions || decisions.length === 0) {
    console.log('ℹ️ No routing decisions recorded yet.');
    console.log('   This table tracks fix source selection (native, pattern, ai-fixer)\n');
    return;
  }

  // Analyze routing decisions
  const sourceStats: Record<string, number> = {};
  const languageStats: Record<string, number> = {};
  let totalCost = 0;
  let totalPatternSavings = 0;
  let fallbackCount = 0;

  for (const d of decisions) {
    sourceStats[d.selected_source] = (sourceStats[d.selected_source] || 0) + 1;
    languageStats[d.language || 'unknown'] = (languageStats[d.language || 'unknown'] || 0) + 1;

    if (d.ai_fixer_cost_cents) {
      totalCost += parseFloat(d.ai_fixer_cost_cents);
    }
    if (d.pattern_cost_savings_cents) {
      totalPatternSavings += parseFloat(d.pattern_cost_savings_cents);
    }
    if (d.was_fallback) {
      fallbackCount++;
    }
  }

  console.log('📦 Routing by Source:');
  for (const [source, count] of Object.entries(sourceStats)) {
    const pct = ((count / decisions.length) * 100).toFixed(1);
    console.log('   ' + source + ': ' + count + ' (' + pct + '%)');
  }

  console.log('\n🔤 Routing by Language:');
  for (const [lang, count] of Object.entries(languageStats)) {
    console.log('   ' + lang + ': ' + count);
  }

  console.log('\n💰 Cost Summary:');
  console.log('   AI-Fixer total cost: ' + totalCost.toFixed(2) + '¢');
  console.log('   Pattern savings: ' + totalPatternSavings.toFixed(2) + '¢');
  console.log('   Fallback rate: ' + ((fallbackCount / decisions.length) * 100).toFixed(1) + '%');

  console.log('\n📝 Recent Decisions (last 10):');
  console.log('─'.repeat(70));

  for (const d of decisions.slice(0, 10)) {
    const ruleShort = (d.rule_id || 'unknown').slice(0, 50);
    const source = d.selected_source || 'unknown';
    const cost = d.ai_fixer_cost_cents ? parseFloat(d.ai_fixer_cost_cents).toFixed(2) + '¢' : 'FREE';
    const fallback = d.was_fallback ? ' [FALLBACK]' : '';
    const time = new Date(d.created_at).toLocaleString();

    console.log('• Rule: ' + ruleShort);
    console.log('  Source: ' + source + ' | Cost: ' + cost + fallback);
    console.log('  Lang: ' + (d.language || 'unknown') + ' | Time: ' + time);
    console.log('');
  }

  // Check for Corgea comparison data
  const { data: corgeaData } = await supabase
    .from('fix_routing_decisions')
    .select('corgea_cost_cents, ai_fixer_cost_cents, rule_id')
    .not('corgea_cost_cents', 'is', null);

  if (corgeaData && corgeaData.length > 0) {
    console.log('─'.repeat(70));
    console.log('🔄 Corgea vs AI-Fixer Cost Comparisons: ' + corgeaData.length + ' decisions\n');

    const corgeaTotal = corgeaData.reduce((sum, d) => sum + (parseFloat(d.corgea_cost_cents) || 0), 0);
    const aiTotal = corgeaData.reduce((sum, d) => sum + (parseFloat(d.ai_fixer_cost_cents) || 0), 0);
    const savings = corgeaTotal - aiTotal;
    const savingsPct = corgeaTotal > 0 ? ((savings / corgeaTotal) * 100).toFixed(1) : 'N/A';

    console.log('   Corgea total cost:    ' + corgeaTotal.toFixed(2) + '¢');
    console.log('   AI-Fixer total cost:  ' + aiTotal.toFixed(2) + '¢');
    console.log('   Savings with AI-Fixer: ' + savings.toFixed(2) + '¢ (' + savingsPct + '%)');
  } else {
    console.log('\nℹ️ No Corgea cost comparison data found yet.');
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('ROUTING SUMMARY');
  console.log('═'.repeat(70));

  const primarySource = Object.entries(sourceStats).sort((a, b) => b[1] - a[1])[0];
  console.log('Primary fix source: ' + primarySource[0] + ' (' + primarySource[1] + ' uses)');
  console.log('Total AI costs: ' + totalCost.toFixed(2) + '¢');
  console.log('Pattern-based savings: ' + totalPatternSavings.toFixed(2) + '¢');
  console.log('Fallback rate: ' + ((fallbackCount / decisions.length) * 100).toFixed(1) + '%');
}

monitorRoutingDecisions().catch(console.error);
