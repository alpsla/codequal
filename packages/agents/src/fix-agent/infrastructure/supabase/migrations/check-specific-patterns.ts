/**
 * Check specific patterns that are failing
 * Run: npx ts-node --transpile-only src/fix-agent/infrastructure/supabase/migrations/check-specific-patterns.ts
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Pattern IDs from the log
  const shortIds = ['fef6dd81', '10704f69', '7526f181'];

  for (const shortId of shortIds) {
    const { data, error } = await supabase
      .from('fix_patterns')
      .select('id, rule_id, fix_template, examples')
      .ilike('id', shortId + '%');

    if (error) {
      console.log('Error for', shortId, ':', error.message);
      continue;
    }

    if (data && data.length > 0) {
      const p = data[0];
      const templateValue = p.fix_template?.template;
      const examplesArray = p.examples as Array<{ before?: string; after?: string }> | undefined;

      console.log('\n=== Pattern', shortId, '===');
      console.log('Full ID:', p.id);
      console.log('Rule:', p.rule_id);
      console.log('fix_template:', JSON.stringify(p.fix_template).substring(0, 200));
      console.log('fix_template.template type:', typeof templateValue);
      console.log('fix_template.template value:', templateValue === null ? 'NULL' : templateValue === undefined ? 'UNDEFINED' : templateValue === '' ? 'EMPTY STRING' : 'HAS VALUE: ' + String(templateValue).substring(0, 50));
      console.log('examples type:', Array.isArray(examplesArray) ? 'Array' : typeof examplesArray);
      console.log('examples length:', examplesArray?.length || 0);

      if (examplesArray && examplesArray.length > 0) {
        const firstExample = examplesArray[0];
        console.log('examples[0] keys:', Object.keys(firstExample || {}));
        console.log('examples[0].after type:', typeof firstExample?.after);
        console.log('examples[0].after value:', firstExample?.after === null ? 'NULL' : firstExample?.after === undefined ? 'UNDEFINED' : firstExample?.after === '' ? 'EMPTY STRING' : 'HAS VALUE: ' + String(firstExample?.after).substring(0, 50));
      }
    } else {
      console.log('\n=== Pattern', shortId, '===');
      console.log('NOT FOUND IN DATABASE');
    }
  }
}

main().catch(console.error);
