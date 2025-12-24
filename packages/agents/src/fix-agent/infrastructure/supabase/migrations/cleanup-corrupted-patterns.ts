/**
 * Cleanup Corrupted Patterns Migration
 *
 * Identifies and removes patterns that contain incomplete AI responses
 * (e.g., AI asking for more context instead of providing a fix)
 *
 * Run: npx ts-node src/fix-agent/infrastructure/supabase/migrations/cleanup-corrupted-patterns.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const CORRUPTED_PHRASES = [
  'could you please provide',
  'i need to see',
  'please provide the',
  'can you share',
  'i would need',
  'the complete code',
  'the actual code',
  'provide the complete',
  'share the code',
  'need more context',
  'without seeing',
  'cannot provide a fix',
  'unable to provide',
  'need to see the',
  'please share',
  'can you provide'
];

async function cleanupCorruptedPatterns(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Scanning for corrupted patterns...\n');

  // Fetch all patterns
  const { data: patterns, error } = await supabase
    .from('fix_patterns')
    .select('id, rule_id, tool, fix_template, examples, confidence, created_at');

  if (error) {
    console.error('❌ Failed to fetch patterns:', error.message);
    process.exit(1);
  }

  if (!patterns || patterns.length === 0) {
    console.log('✅ No patterns found in database');
    return;
  }

  console.log(`📊 Found ${patterns.length} total patterns\n`);

  const corruptedPatterns: Array<{
    id: string;
    rule_id: string;
    tool: string;
    reason: string;
    snippet: string;
  }> = [];

  for (const pattern of patterns) {
    // Check fix_template
    const template = pattern.fix_template?.template || '';
    const exampleAfter = pattern.examples?.[0]?.after || '';
    const content = (template + ' ' + exampleAfter).toLowerCase();

    for (const phrase of CORRUPTED_PHRASES) {
      if (content.includes(phrase)) {
        corruptedPatterns.push({
          id: pattern.id,
          rule_id: pattern.rule_id,
          tool: pattern.tool,
          reason: `Contains: "${phrase}"`,
          snippet: content.substring(0, 100) + '...'
        });
        break;
      }
    }
  }

  if (corruptedPatterns.length === 0) {
    console.log('✅ No corrupted patterns found!');
    return;
  }

  console.log(`⚠️  Found ${corruptedPatterns.length} corrupted patterns:\n`);
  console.log('=' .repeat(80));

  for (const p of corruptedPatterns) {
    console.log(`\n📛 Pattern: ${p.id.substring(0, 8)}...`);
    console.log(`   Rule: ${p.rule_id}`);
    console.log(`   Tool: ${p.tool}`);
    console.log(`   Reason: ${p.reason}`);
    console.log(`   Snippet: ${p.snippet}`);
  }

  console.log('\n' + '=' .repeat(80));

  // Check if --delete flag is passed
  const shouldDelete = process.argv.includes('--delete');

  if (!shouldDelete) {
    console.log('\n⚠️  DRY RUN - No patterns deleted');
    console.log('   To delete corrupted patterns, run with --delete flag:');
    console.log('   npx ts-node src/fix-agent/infrastructure/supabase/migrations/cleanup-corrupted-patterns.ts --delete\n');
    return;
  }

  // Delete corrupted patterns
  console.log('\n🗑️  Deleting corrupted patterns...\n');

  let deleted = 0;
  let failed = 0;

  for (const p of corruptedPatterns) {
    const { error: deleteError } = await supabase
      .from('fix_patterns')
      .delete()
      .eq('id', p.id);

    if (deleteError) {
      console.log(`   ❌ Failed to delete ${p.id.substring(0, 8)}: ${deleteError.message}`);
      failed++;
    } else {
      console.log(`   ✅ Deleted ${p.id.substring(0, 8)} (${p.rule_id})`);
      deleted++;
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Deleted: ${deleted}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📦 Remaining: ${patterns.length - deleted}`);
}

cleanupCorruptedPatterns().catch(console.error);
