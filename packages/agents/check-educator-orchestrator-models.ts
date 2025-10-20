import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('\n=== Universal Agent Models (Educator & Orchestrator) ===\n');
  
  const { data, error } = await supabase
    .from('model_configurations')
    .select('*')
    .in('role', ['educator', 'orchestrator'])
    .eq('language', 'java');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No educator/orchestrator configs found\n');
    return;
  }
  
  data.forEach(r => {
    console.log(`📋 ${r.role}/java/${r.size_category || 'any'}:`);
    console.log(`   Primary Model: ${r.primary_model}`);
    console.log(`   Fallback: ${r.fallback_model || 'none'}`);
    console.log(`   Weights: ${JSON.stringify(r.weights)}`);
    console.log(`   Last Updated: ${r.last_updated}`);
    console.log();
  });
  
  console.log('💡 Note: Educator uses Brave Search + AI summarization');
  console.log('   The expensive model is for summarizing search results,');
  console.log('   not for generating content from scratch.\n');
}

check();
