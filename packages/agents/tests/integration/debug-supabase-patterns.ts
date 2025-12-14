/**
 * Debug Supabase Patterns
 *
 * Check what patterns are actually stored and why lookup might be failing
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../.env') });

import { createClient } from '@supabase/supabase-js';

async function debugPatterns(): Promise<void> {
  console.log('\n🔍 Debugging Supabase Patterns...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  const client = createClient(supabaseUrl, supabaseKey);

  // 1. Get all patterns
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('ALL PATTERNS IN fix_patterns TABLE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const { data: allPatterns, error: allError } = await client
    .from('fix_patterns')
    .select('id, rule_id, tool, name, status, confidence, tags, created_at')
    .order('created_at', { ascending: false });

  if (allError) {
    console.log('Error fetching patterns:', allError);
    return;
  }

  console.log(`Total patterns: ${allPatterns?.length || 0}\n`);

  // Group by tags containing 'nestjs'
  const nestjsPatterns = allPatterns?.filter(p =>
    p.tags?.includes('nestjs') || p.name?.includes('nestjs')
  ) || [];

  console.log(`NestJS patterns (by tag/name): ${nestjsPatterns.length}\n`);

  console.log('┌────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ ID (first 8) │ Rule ID                    │ Tool       │ Status  │ Conf  │');
  console.log('├────────────────────────────────────────────────────────────────────────────┤');

  for (const p of allPatterns?.slice(0, 20) || []) {
    const id = (p.id || '').substring(0, 8);
    const ruleId = (p.rule_id || '').substring(0, 24).padEnd(24);
    const tool = (p.tool || '').substring(0, 10).padEnd(10);
    const status = (p.status || '').substring(0, 7).padEnd(7);
    const conf = (p.confidence?.toString() || '').padEnd(4);
    const hasNestjs = p.tags?.includes('nestjs') ? '🟢' : '  ';
    console.log(`│ ${id.padEnd(12)} │ ${ruleId} │ ${tool} │ ${status} │ ${conf}% │ ${hasNestjs}`);
  }

  console.log('└────────────────────────────────────────────────────────────────────────────┘');

  // 2. Check specifically for our patterns
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('CHECKING FOR SPECIFIC NESTJS PATTERNS');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const targetRules = ['TS2339', 'TS2304', 'TS2322', 'TS2503', 'TS2688', 'dependency-vulnerability'];

  for (const ruleId of targetRules) {
    const { data, error } = await client
      .from('fix_patterns')
      .select('id, rule_id, tool, name, status, confidence, tags')
      .eq('rule_id', ruleId);

    if (error) {
      console.log(`❌ Error looking up ${ruleId}: ${error.message}`);
      continue;
    }

    if (data && data.length > 0) {
      console.log(`✅ ${ruleId}: Found ${data.length} pattern(s)`);
      for (const p of data) {
        console.log(`   - ${p.id.substring(0, 8)}... | ${p.tool} | ${p.status} | ${p.confidence}%`);
        console.log(`     Tags: ${(p.tags || []).join(', ')}`);
      }
    } else {
      console.log(`❌ ${ruleId}: Not found`);
    }
  }

  // 3. Check the lookup function behavior
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('TESTING LOOKUP FUNCTION QUERY');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Try the same query the lookup function uses
  const { data: lookupData, error: lookupError } = await client
    .from('fix_patterns')
    .select('*')
    .eq('rule_id', 'TS2339')
    .eq('tool', 'typescript')
    .eq('status', 'active')
    .order('confidence', { ascending: false });

  if (lookupError) {
    console.log(`Lookup query error: ${lookupError.message}`);
  } else {
    console.log(`Lookup for TS2339 + typescript + active: ${lookupData?.length || 0} results`);
    if (lookupData && lookupData.length > 0) {
      console.log('First result:', JSON.stringify(lookupData[0], null, 2).substring(0, 500));
    }
  }

  // Try without status filter
  const { data: noStatusData } = await client
    .from('fix_patterns')
    .select('id, rule_id, tool, status, tags')
    .eq('rule_id', 'TS2339')
    .eq('tool', 'typescript');

  console.log(`\nLookup for TS2339 + typescript (no status filter): ${noStatusData?.length || 0} results`);
  for (const p of noStatusData || []) {
    console.log(`   - ${p.id.substring(0, 8)}... | status: ${p.status} | tags: ${(p.tags || []).join(', ')}`);
  }

  // 4. Check what status values exist
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('STATUS VALUE DISTRIBUTION');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const statusCounts: Record<string, number> = {};
  for (const p of allPatterns || []) {
    const status = p.status || 'null';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`  ${status}: ${count}`);
  }
}

debugPatterns().catch(console.error);
