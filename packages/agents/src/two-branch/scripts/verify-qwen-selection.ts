#!/usr/bin/env npx ts-node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyQwenSelection() {
  console.log('\n✅ VERIFICATION: Analysis Role Model Selection\n');
  console.log('Expected: qwen/qwen3-coder-30b-a3b-instruct for all analysis roles\n');
  
  const roles = ['security', 'performance', 'code_quality', 'architecture', 'dependency'];
  
  for (const role of roles) {
    const { data } = await supabase
      .from('model_configurations')
      .select('primary_model, fallback_model')
      .eq('role', role)
      .eq('language', 'java')
      .single();
    
    const primary = data?.primary_model || 'not found';
    const fallback = data?.fallback_model || 'not found';
    const isQwen = primary.includes('qwen3-coder-30b');
    const badge = isQwen ? '✅' : '❌';
    
    console.log(`${badge} ${role.toUpperCase().padEnd(15)}: ${primary}`);
    console.log(`   Fallback: ${fallback}\n`);
  }
  
  // Count Qwen usage across all languages
  const { data: all } = await supabase
    .from('model_configurations')
    .select('primary_model, role')
    .in('role', roles);
  
  const qwenCount = all?.filter(c => c.primary_model?.includes('qwen3-coder-30b')).length || 0;
  const total = all?.length || 0;
  
  console.log('═'.repeat(60));
  console.log(`Qwen3 Coder 30B usage: ${qwenCount}/${total} configs (${(qwenCount/total*100).toFixed(1)}%)`);
  
  if (qwenCount === total) {
    console.log('✅ SUCCESS: All analysis roles using Qwen3 Coder 30B!');
  } else {
    console.log(`⚠️  Only ${qwenCount}/${total} using Qwen`);
  }
  console.log('═'.repeat(60) + '\n');
}

verifyQwenSelection().catch(console.error);

