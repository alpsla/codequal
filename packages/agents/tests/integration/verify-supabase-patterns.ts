/**
 * Verify patterns stored in Supabase
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
  // Query guidance patterns
  const { data: patterns, error } = await supabase
    .from('fix_pattern_guidance')
    .select('rule_id, language, tool, prompt_additions, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('=== Guidance Patterns in Supabase ===');
  console.log('Total:', patterns?.length || 0);
  console.log('');
  console.log('Patterns (by most recently updated):');
  for (const p of patterns || []) {
    const hasPrompt = p.prompt_additions ? 'Yes' : 'No';
    console.log(`  ${p.rule_id} (${p.language}/${p.tool}) - prompt: ${hasPrompt} - updated: ${p.updated_at}`);
  }

  // Also check failure tracking status
  const { data: failures } = await supabase
    .from('fix_failure_tracking')
    .select('rule_id, failure_count, review_status, reviewed_at');

  console.log('');
  console.log('=== Failure Tracking Status ===');
  for (const f of failures || []) {
    console.log(`  ${f.rule_id}: ${f.failure_count} failures - status: ${f.review_status} - reviewed: ${f.reviewed_at || 'N/A'}`);
  }
}

verify();
