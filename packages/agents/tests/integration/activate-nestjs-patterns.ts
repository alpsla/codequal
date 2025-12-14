/**
 * Activate NestJS Patterns in Supabase
 *
 * Updates the status of our NestJS patterns from 'pending_review' to 'active'
 * so they can be used for pattern reuse.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { createClient } from '@supabase/supabase-js';

async function activatePatterns(): Promise<void> {
  console.log('\n🔄 Activating NestJS Patterns in Supabase...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  const client = createClient(supabaseUrl, supabaseKey);

  // Find all NestJS patterns that are pending_review
  const { data: pendingPatterns, error: fetchError } = await client
    .from('fix_patterns')
    .select('id, rule_id, tool, name, status, confidence')
    .eq('status', 'pending_review')
    .contains('tags', ['nestjs']);

  if (fetchError) {
    console.log('Error fetching patterns:', fetchError);
    return;
  }

  console.log(`Found ${pendingPatterns?.length || 0} pending NestJS patterns\n`);

  if (!pendingPatterns || pendingPatterns.length === 0) {
    console.log('No patterns to activate');
    return;
  }

  // Update each pattern to active
  let activated = 0;
  let failed = 0;

  for (const pattern of pendingPatterns) {
    console.log(`Activating: ${pattern.rule_id} (${pattern.id.substring(0, 8)}...)`);

    const { error: updateError } = await client
      .from('fix_patterns')
      .update({
        status: 'active',
        verified: true,
        safe_for_auto_apply: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pattern.id);

    if (updateError) {
      console.log(`   ❌ Failed: ${updateError.message}`);
      failed++;
    } else {
      console.log(`   ✅ Activated`);
      activated++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('ACTIVATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Activated: ${activated}`);
  console.log(`  Failed:    ${failed}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Verify the update
  const { data: activePatterns } = await client
    .from('fix_patterns')
    .select('id, rule_id, tool, status')
    .eq('status', 'active')
    .contains('tags', ['nestjs']);

  console.log(`Verified: ${activePatterns?.length || 0} active NestJS patterns\n`);

  for (const p of activePatterns || []) {
    console.log(`  ✅ ${p.rule_id} | ${p.tool} | ${p.status}`);
  }
}

activatePatterns().catch(console.error);
