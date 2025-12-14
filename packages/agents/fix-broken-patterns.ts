import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanBrokenPatterns() {
  // Find E402 patterns
  const { data, error } = await supabase
    .from('fix_patterns')
    .select('id, rule_id, fix_template')
    .eq('rule_id', 'E402');
  
  if (error) { console.error('Error:', error); return; }
  
  console.log('E402 patterns found:', data?.length || 0);
  
  for (const p of data || []) {
    const template = JSON.stringify(p.fix_template || '');
    const isBroken = template.includes("haven't provided") || 
                     template.includes('AI error') ||
                     template.includes('you haven');
    
    if (isBroken) {
      console.log('Deleting broken pattern:', p.id);
      const { error: delError } = await supabase.from('fix_patterns').delete().eq('id', p.id);
      if (delError) console.error('Delete error:', delError);
      else console.log('  ✅ Deleted');
    } else {
      console.log('Pattern seems OK:', p.id);
      console.log('  Template preview:', template.substring(0, 150));
    }
  }
}

cleanBrokenPatterns();
