/**
 * Update Pattern Confidence Values in Supabase
 *
 * The seed script used default confidence (70%). Update to match local values.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { createClient } from '@supabase/supabase-js';
import { NESTJS_PATTERNS } from '../../src/fix-agent/patterns/nestjs-patterns';

async function updateConfidence(): Promise<void> {
  console.log('\n📊 Updating Pattern Confidence Values...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  const client = createClient(supabaseUrl, supabaseKey);

  for (const localPattern of NESTJS_PATTERNS) {
    console.log(`Updating ${localPattern.ruleId}: ${localPattern.fixConfidence}%`);

    const { error } = await client
      .from('fix_patterns')
      .update({
        confidence: localPattern.fixConfidence,
        updated_at: new Date().toISOString(),
      })
      .eq('rule_id', localPattern.ruleId)
      .eq('tool', localPattern.tool)
      .contains('tags', ['nestjs']);

    if (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    } else {
      console.log(`   ✅ Updated to ${localPattern.fixConfidence}%`);
    }
  }

  console.log('\n✅ Confidence values updated!\n');
}

updateConfidence().catch(console.error);
