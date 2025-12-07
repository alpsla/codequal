/**
 * Inspect and delete broken patterns
 * Run on Oracle: npx ts-node --transpile-only src/fix-agent/infrastructure/supabase/migrations/inspect-and-delete-broken.ts
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🔍 Inspecting broken patterns...\n');

  // First, get all patterns - need to paginate to get more than 1000
  let allPatterns: Array<{ id: string; rule_id: string; fix_template: any; examples: any }> = [];
  let offset = 0;
  const pageSize = 1000;

  console.log('📥 Fetching all patterns from Supabase (paginated)...');

  let hasMoreData = true;
  while (hasMoreData) {
    const { data, error } = await supabase
      .from('fix_patterns')
      .select('id, rule_id, fix_template, examples')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Error fetching patterns:', error);
      return;
    }

    if (!data || data.length === 0) {
      hasMoreData = false;
      continue;
    }

    allPatterns = allPatterns.concat(data);
    console.log(`   Fetched ${data.length} patterns (total: ${allPatterns.length})`);

    if (data.length < pageSize) {
      hasMoreData = false;
    } else {
      offset += pageSize;
    }
  }

  console.log(`\n📊 Total patterns: ${allPatterns.length}\n`);

  // Find broken patterns - those without usable template or examples
  const brokenPatterns: Array<{ id: string; rule_id: string; reason: string }> = [];

  for (const p of allPatterns || []) {
    const template = p.fix_template?.template;
    const hasValidTemplate = template && typeof template === 'string' && template.trim().length > 0;

    // Check examples more thoroughly
    const examples = p.examples as Array<{ before?: string; after?: string }> | undefined;
    const hasValidExample = examples && examples.length > 0 &&
      examples[0]?.after &&
      typeof examples[0].after === 'string' &&
      examples[0].after.trim().length > 0;

    if (!hasValidTemplate && !hasValidExample) {
      let reason = 'No template';
      if (examples && examples.length > 0) {
        if (!examples[0]?.after) {
          reason += ', example has no after';
        } else if (typeof examples[0].after !== 'string') {
          reason += ', example.after is not string: ' + typeof examples[0].after;
        } else if (examples[0].after.trim().length === 0) {
          reason += ', example.after is empty string';
        }
      } else {
        reason += ', no examples';
      }
      brokenPatterns.push({ id: p.id, rule_id: p.rule_id, reason });
    }
  }

  console.log(`🚨 Found ${brokenPatterns.length} broken patterns:\n`);

  // Group by rule_id
  const byRule = new Map<string, number>();
  for (const p of brokenPatterns) {
    byRule.set(p.rule_id, (byRule.get(p.rule_id) || 0) + 1);
  }

  for (const [rule, count] of Array.from(byRule.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`   ${rule}: ${count} broken patterns`);
  }

  if (brokenPatterns.length === 0) {
    console.log('✅ No broken patterns found!');
    return;
  }

  console.log('\n🗑️  Deleting broken patterns...');

  // Delete in batches
  const batchSize = 100;
  let deletedCount = 0;

  for (let i = 0; i < brokenPatterns.length; i += batchSize) {
    const batch = brokenPatterns.slice(i, i + batchSize);
    const ids = batch.map(p => p.id);

    const { error: deleteError, count } = await supabase
      .from('fix_patterns')
      .delete({ count: 'exact' })
      .in('id', ids);

    if (deleteError) {
      console.error(`Error deleting batch ${Math.floor(i / batchSize) + 1}:`, deleteError);
      continue;
    }

    deletedCount += count || 0;
    console.log(`   Batch ${Math.floor(i / batchSize) + 1}: Deleted ${count} patterns`);
  }

  console.log(`\n✅ Deleted ${deletedCount} broken patterns`);

  // Verify remaining
  const { count: remaining } = await supabase
    .from('fix_patterns')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Remaining patterns: ${remaining}`);
}

main().catch(console.error);
