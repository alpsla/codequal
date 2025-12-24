/**
 * Test Fix Routing Mode Configuration
 *
 * This script:
 * 1. Creates the routing configuration table (if not exists)
 * 2. Shows current routing mode and configuration
 * 3. Allows switching between manual/automatic modes
 * 4. Tests routing decisions
 *
 * Usage:
 *   npx ts-node tests/integration/test-routing-mode.ts              # Show status
 *   npx ts-node tests/integration/test-routing-mode.ts --corgea     # Switch to Corgea
 *   npx ts-node tests/integration/test-routing-mode.ts --ai-fixer   # Switch to AI-fixer
 *   npx ts-node tests/integration/test-routing-mode.ts --automatic  # Enable automatic mode
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function showStatus() {
  console.log('=== Fix Routing Configuration ===\n');

  // Check if routing config table exists
  const { data: configData, error: configErr } = await supabase
    .from('fix_routing_config')
    .select('*')
    .eq('id', 'current')
    .single();

  if (configErr) {
    console.log('❌ Routing config table not found or empty');
    console.log('   Run the migration: 20251220_fix_routing_config.sql');
    console.log('   Error:', configErr.message);
    return null;
  }

  console.log('📊 Current Configuration:');
  console.log(`   Mode: ${configData.routing_mode.toUpperCase()}`);
  console.log(`   Preferred Source: ${configData.manual_preferred_source}`);
  console.log(`   Reason: ${configData.manual_reason || 'Not specified'}`);
  console.log(`   Data Collection Target: ${configData.data_collection_target_fixes} fixes`);
  console.log(`   Started: ${configData.data_collection_started_at || 'Not started'}`);
  console.log(`   Last Changed: ${configData.last_mode_change_at}`);
  console.log(`   Changed By: ${configData.last_mode_change_by || 'System'}`);

  // Get cost comparison
  const { data: comparison } = await supabase
    .from('fix_cost_comparison')
    .select('*')
    .single();

  if (comparison) {
    console.log('\n💰 Cost Comparison:');
    console.log(`   AI-fixer: ${comparison.ai_fixer_cost_per_fix_cents?.toFixed(2) || '?'}¢/fix`);
    console.log(`   Corgea: ${comparison.corgea_cost_per_fix_cents?.toFixed(2) || '0'}¢/fix (${comparison.corgea_fixes_used} fixes used)`);
    console.log(`   Recommended: ${comparison.recommended_source}`);
  }

  // Get routing decisions count
  const { count: decisionCount } = await supabase
    .from('fix_routing_decisions')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 Routing Decisions Logged: ${decisionCount || 0}`);

  if (decisionCount && decisionCount > 0) {
    const { data: stats } = await supabase
      .from('fix_routing_decisions')
      .select('selected_source');

    if (stats) {
      const corgeaCount = stats.filter((s: any) => s.selected_source === 'corgea').length;
      const aiFixerCount = stats.filter((s: any) => s.selected_source === 'ai_fixer').length;
      const nativeCount = stats.filter((s: any) => s.selected_source === 'native').length;
      const patternCount = stats.filter((s: any) => s.selected_source === 'pattern_registry').length;

      console.log(`   Corgea: ${corgeaCount} | AI-fixer: ${aiFixerCount} | Native: ${nativeCount} | Pattern: ${patternCount}`);
    }
  }

  return configData;
}

async function switchToManual(source: 'corgea' | 'ai_fixer', reason: string) {
  console.log(`\n🔄 Switching to MANUAL mode with ${source}...`);

  const { error } = await supabase
    .from('fix_routing_config')
    .update({
      routing_mode: 'manual',
      manual_preferred_source: source,
      manual_reason: reason,
      last_mode_change_at: new Date().toISOString(),
      last_mode_change_by: 'test-routing-mode.ts',
      data_collection_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', 'current');

  if (error) {
    console.log('❌ Failed to switch mode:', error.message);
    return false;
  }

  console.log(`✅ Switched to MANUAL mode`);
  console.log(`   Preferred source: ${source}`);
  console.log(`   Reason: ${reason}`);
  return true;
}

async function switchToAutomatic(reason: string) {
  console.log('\n🔄 Switching to AUTOMATIC mode...');

  const { error } = await supabase
    .from('fix_routing_config')
    .update({
      routing_mode: 'automatic',
      manual_reason: reason,
      last_mode_change_at: new Date().toISOString(),
      last_mode_change_by: 'test-routing-mode.ts',
      updated_at: new Date().toISOString()
    })
    .eq('id', 'current');

  if (error) {
    console.log('❌ Failed to switch mode:', error.message);
    return false;
  }

  console.log('✅ Switched to AUTOMATIC mode');
  console.log('   The system will now select the cheapest source based on cost data');
  return true;
}

async function testRoutingDecision() {
  console.log('\n🧪 Testing Routing Decision...');

  // Simulate a routing decision query using the function
  const { data, error } = await supabase.rpc('get_routing_recommendation', {
    issue_severity: 'high',
    issue_category: 'security'
  });

  if (error) {
    console.log('   ⚠️ get_routing_recommendation function not available');
    console.log('   Using view-based decision...');

    const { data: comparison } = await supabase
      .from('fix_cost_comparison')
      .select('recommended_source, routing_mode, manual_preferred_source')
      .single();

    if (comparison) {
      console.log(`   Mode: ${comparison.routing_mode}`);
      console.log(`   Recommended source: ${comparison.recommended_source}`);
    }
    return;
  }

  if (data && data.length > 0) {
    const rec = data[0];
    console.log(`   Source: ${rec.source}`);
    console.log(`   Reason: ${rec.reason}`);
    console.log(`   Cost: ${rec.estimated_cost_cents?.toFixed(2)}¢`);
    console.log(`   Mode: ${rec.mode}`);
    console.log(`   Is Fallback: ${rec.is_fallback}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Show current status
  const config = await showStatus();

  if (!config) {
    console.log('\n⚠️ Please run the Supabase migration first:');
    console.log('   20251220_fix_routing_config.sql');
    return;
  }

  // Handle command line arguments
  if (args.includes('--corgea')) {
    await switchToManual('corgea', 'Testing Corgea for data collection');
    await showStatus();
  } else if (args.includes('--ai-fixer')) {
    await switchToManual('ai_fixer', 'Testing AI-fixer for data collection');
    await showStatus();
  } else if (args.includes('--automatic')) {
    await switchToAutomatic('Sufficient data collected, enabling cost-optimized routing');
    await showStatus();
  } else if (args.includes('--test')) {
    await testRoutingDecision();
  } else {
    // Show help
    console.log('\n📋 Available Commands:');
    console.log('   --corgea     Switch to manual mode with Corgea');
    console.log('   --ai-fixer   Switch to manual mode with AI-fixer');
    console.log('   --automatic  Enable automatic cost-optimized routing');
    console.log('   --test       Test a routing decision');
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
