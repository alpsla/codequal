/**
 * Fix Broken Patterns Migration
 *
 * SESSION 48: Instead of deleting broken patterns, we mark them with confidence=0
 * so they get skipped during pattern reuse but are preserved for potential regeneration.
 *
 * A broken pattern is one where:
 * - fix_template.template is null or empty AND
 * - examples[].after is also null or empty
 *
 * Run: npx ts-node src/fix-agent/infrastructure/supabase/migrations/cleanup-broken-patterns.ts
 */

import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables - correct paths for Oracle environment
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });  // packages/agents/.env
dotenv.config({ path: path.join(__dirname, '../../../../../../../.env') });  // root .env

import { createClient } from '@supabase/supabase-js';

interface BrokenPattern {
  id: string;
  rule_id: string;
  tool: string;
  fix_template: {
    template?: string;
  };
  examples: Array<{
    before?: string;
    after?: string;
    fileName?: string;
  }>;
  confidence: number;
  created_at: string;
}

async function fixBrokenPatterns() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  PATTERN DATABASE - FIX BROKEN PATTERNS                              ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  Strategy: Set confidence=0 for unusable patterns                    ║');
  console.log('║  This allows pattern reuse to skip them gracefully                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // First, count patterns
  const { count: totalCount, error: countError } = await supabase
    .from('fix_patterns')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting patterns:', countError);
    return;
  }
  console.log(`Total patterns in database: ${totalCount}`);

  // Get all patterns to check
  const { data: allPatterns, error: fetchError } = await supabase
    .from('fix_patterns')
    .select('id, rule_id, tool, fix_template, examples, confidence, created_at')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Error fetching patterns:', fetchError);
    return;
  }

  // Filter patterns that have empty templates AND no valid examples
  const brokenPatterns = (allPatterns as BrokenPattern[])?.filter(p => {
    const template = p.fix_template?.template;
    const hasValidTemplate = template && template.trim().length > 0;
    const hasValidExample = p.examples?.some(ex => ex.after && ex.after.trim().length > 0);
    return !hasValidTemplate && !hasValidExample;
  }) || [];

  console.log(`\nFound ${brokenPatterns.length} broken patterns (empty template AND no example.after)\n`);

  if (brokenPatterns.length === 0) {
    console.log('No broken patterns found. Database is clean!');
    return;
  }

  // Show breakdown by tool
  const byTool: Record<string, number> = {};
  for (const p of brokenPatterns) {
    byTool[p.tool] = (byTool[p.tool] || 0) + 1;
  }

  console.log('Broken patterns by tool:');
  for (const [tool, count] of Object.entries(byTool).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tool}: ${count}`);
  }

  // Show sample of patterns to fix
  console.log('\nSample of patterns to fix:');
  brokenPatterns.slice(0, 10).forEach(p => {
    const hasTemplate = p.fix_template?.template?.length || 0;
    const hasExample = p.examples?.[0]?.after?.length || 0;
    console.log(`   ${p.id.substring(0, 8)} | ${p.rule_id.substring(0, 50).padEnd(50)} | T:${hasTemplate} E:${hasExample}`);
  });
  if (brokenPatterns.length > 10) {
    console.log(`   ... and ${brokenPatterns.length - 10} more`);
  }

  // Fix in batches by setting confidence to 0
  const batchSize = 50;
  let fixedCount = 0;

  console.log('\nFixing broken patterns (setting confidence=0)...');

  for (let i = 0; i < brokenPatterns.length; i += batchSize) {
    const batch = brokenPatterns.slice(i, i + batchSize);
    const ids = batch.map(p => p.id);

    const { error: updateError, count } = await supabase
      .from('fix_patterns')
      .update({
        confidence: 0,
        tags: ['broken', 'empty-template', 'needs-regeneration']
      })
      .in('id', ids);

    if (updateError) {
      console.error(`Error updating batch ${Math.floor(i / batchSize) + 1}:`, updateError);
      continue;
    }

    fixedCount += batch.length;
    console.log(`   Batch ${Math.floor(i / batchSize) + 1}: Updated ${batch.length} patterns`);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                                             ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total patterns in database:   ${totalCount?.toString().padEnd(38)}║`);
  console.log(`║  Broken patterns found:        ${brokenPatterns.length.toString().padEnd(38)}║`);
  console.log(`║  Patterns fixed (conf=0):      ${fixedCount.toString().padEnd(38)}║`);
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║  These patterns will be skipped during pattern reuse and             ║');
  console.log('║  regenerated via AI when encountered next.                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
}

// Run the migration
fixBrokenPatterns()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
