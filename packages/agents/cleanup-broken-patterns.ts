import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanupBrokenPatterns() {
  console.log('🧹 Cleaning up broken Python patterns...\n');

  // Get all ruff patterns
  const { data: patterns, error } = await supabase
    .from('fix_patterns')
    .select('id, rule_id, tool, fix_template')
    .eq('tool', 'ruff');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const patternCount = patterns ? patterns.length : 0;
  console.log(`Found ${patternCount} ruff patterns\n`);

  let deletedCount = 0;
  for (const p of patterns || []) {
    const template = JSON.stringify(p.fix_template || '');
    const isBroken =
      template.includes("haven't provided") ||
      template.includes("please share") ||
      template.includes("please provide") ||
      template.includes("Could you") ||
      template.includes("can you share");

    if (isBroken) {
      console.log(`Deleting broken pattern: ${p.rule_id}`);
      const { error: delErr } = await supabase.from('fix_patterns').delete().eq('id', p.id);
      if (!delErr) {
        deletedCount++;
        console.log(`  ✅ Deleted`);
      }
    }
  }

  console.log(`\n✅ Deleted ${deletedCount} broken patterns`);
}

cleanupBrokenPatterns();
