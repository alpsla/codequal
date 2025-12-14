import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectPatterns() {
  // Get a few ruff patterns (Python)
  const { data: ruffPatterns } = await supabase
    .from('fix_patterns')
    .select('rule_id, tool, fix_template, examples, confidence')
    .eq('tool', 'ruff')
    .limit(3);
  
  console.log('=== RUFF PATTERNS (Python) ===');
  for (const p of ruffPatterns || []) {
    console.log('\nRule:', p.rule_id);
    console.log('Confidence:', p.confidence);
    console.log('Fix Template:', JSON.stringify(p.fix_template, null, 2).substring(0, 500));
    console.log('Examples:', JSON.stringify(p.examples, null, 2)?.substring(0, 500));
  }

  // Get a few PMD patterns (Java)
  const { data: pmdPatterns } = await supabase
    .from('fix_patterns')
    .select('rule_id, tool, fix_template, examples, confidence')
    .eq('tool', 'pmd')
    .limit(3);
  
  console.log('\n\n=== PMD PATTERNS (Java) ===');
  for (const p of pmdPatterns || []) {
    console.log('\nRule:', p.rule_id);
    console.log('Confidence:', p.confidence);
    console.log('Fix Template:', JSON.stringify(p.fix_template, null, 2).substring(0, 500));
    console.log('Examples:', JSON.stringify(p.examples, null, 2)?.substring(0, 500));
  }
}

inspectPatterns();
