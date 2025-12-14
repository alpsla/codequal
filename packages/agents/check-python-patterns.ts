import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // First check what columns exist
  const { data: sample, error: sampleErr } = await supabase
    .from('fix_patterns')
    .select('*')
    .limit(3);
  
  if (sampleErr) { 
    console.error('Error:', sampleErr); 
    return; 
  }
  
  if (sample && sample.length > 0) {
    console.log('COLUMNS:', Object.keys(sample[0]).join(', '));
  }
  
  // Get all patterns
  const { data, error } = await supabase
    .from('fix_patterns')
    .select('rule_id, tool');
  
  if (error) { console.error('Error:', error); return; }
  
  console.log('\nTOTAL PATTERNS:', data?.length || 0);
  
  // Group by tool
  const byTool: Record<string, string[]> = {};
  for (const p of data || []) {
    if (!byTool[p.tool]) byTool[p.tool] = [];
    byTool[p.tool].push(p.rule_id);
  }
  
  for (const tool of Object.keys(byTool).sort()) {
    const rules = byTool[tool];
    console.log('\n' + tool + ': ' + rules.length + ' patterns');
    for (const r of rules.slice(0, 20)) {
      console.log('  ' + r);
    }
    if (rules.length > 20) console.log('  ... +' + (rules.length - 20) + ' more');
  }
}

check();
