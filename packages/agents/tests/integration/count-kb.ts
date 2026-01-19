import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function countPatterns() {
  // SESSION 96: Check BOTH tables
  // fix_patterns = AI-generated patterns from auto-filling
  // fix_pattern_guidance = Manually seeded patterns with guidance

  const { data: aiPatterns, error: aiErr } = await supabase
    .from('fix_patterns')
    .select('rule_id, tool, confidence, apply_count, status');

  const { data: guidancePatterns, error: guidErr } = await supabase
    .from('fix_pattern_guidance')
    .select('rule_id, language, tool');

  if (aiErr) {
    console.log('Error (fix_patterns):', aiErr.message);
  }
  if (guidErr) {
    console.log('Error (fix_pattern_guidance):', guidErr.message);
  }

  console.log('=== KB Pattern Statistics ===');
  console.log('');
  console.log('--- AI-Generated Patterns (fix_patterns) ---');
  console.log('Total:', aiPatterns?.length || 0);

  const byRule = new Map<string, number>();
  for (const p of aiPatterns || []) {
    byRule.set(p.rule_id, (byRule.get(p.rule_id) || 0) + 1);
  }

  console.log('\nBy rule:');
  for (const [rule, count] of Array.from(byRule.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log('  ' + rule + ': ' + count);
  }
  console.log('Unique rules:', byRule.size);

  // Status breakdown
  const byStatus = new Map<string, number>();
  for (const p of aiPatterns || []) {
    byStatus.set(p.status || 'unknown', (byStatus.get(p.status || 'unknown') || 0) + 1);
  }

  console.log('\nBy status:');
  for (const [status, count] of Array.from(byStatus.entries()).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + status + ': ' + count);
  }

  console.log('');
  console.log('--- Guidance Patterns (fix_pattern_guidance) ---');
  console.log('Total:', guidancePatterns?.length || 0);

  const { data: failures } = await supabase
    .from('fix_failure_tracking')
    .select('rule_id');

  console.log('');
  console.log('--- Failure Tracking ---');
  console.log('Failures tracked:', failures?.length || 0);
}

countPatterns();
