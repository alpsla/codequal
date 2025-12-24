/**
 * Verify Corgea Cost Tracking Tables in Supabase
 * Run: npx ts-node tests/integration/verify-cost-tables.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  console.log('=== Verifying Corgea Cost Tracking Tables ===\n');

  // 1. Check corgea_subscription
  console.log('1. corgea_subscription table:');
  const { data: sub, error: subErr } = await supabase
    .from('corgea_subscription')
    .select('*');

  if (subErr) {
    console.log('   ❌ Error:', subErr.message);
  } else {
    console.log('   ✅ Table exists, rows:', sub?.length || 0);
    if (sub && sub.length > 0) {
      console.log('   Data:', JSON.stringify(sub[0], null, 2));
    }
  }

  // 2. Check corgea_usage_log
  console.log('\n2. corgea_usage_log table:');
  const { data: log, error: logErr } = await supabase
    .from('corgea_usage_log')
    .select('*')
    .limit(1);

  if (logErr) {
    console.log('   ❌ Error:', logErr.message);
  } else {
    console.log('   ✅ Table exists, sample rows:', log?.length || 0);
  }

  // 3. Check fix_cost_comparison view
  console.log('\n3. fix_cost_comparison view:');
  const { data: view, error: viewErr } = await supabase
    .from('fix_cost_comparison')
    .select('*');

  if (viewErr) {
    console.log('   ❌ Error:', viewErr.message);
  } else {
    console.log('   ✅ View exists');
    if (view && view.length > 0) {
      console.log('   Data:', JSON.stringify(view[0], null, 2));
    }
  }

  // 4. Check ai_fixer_research (dependency)
  console.log('\n4. ai_fixer_research table (dependency):');
  const { data: research, error: researchErr } = await supabase
    .from('ai_fixer_research')
    .select('id, config_name, avg_cost, research_date')
    .order('research_date', { ascending: false })
    .limit(1);

  if (researchErr) {
    console.log('   ⚠️ Error:', researchErr.message);
    console.log('   Note: This table is needed for AI-fixer cost comparison');
  } else {
    console.log('   ✅ Table exists, latest entry:', research?.length || 0);
    if (research && research.length > 0) {
      console.log('   Latest:', JSON.stringify(research[0], null, 2));
    }
  }

  console.log('\n=== Verification Complete ===');
}

verify().catch(console.error);
