import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('\n=== Java Model Configurations ===\n');
  
  const roles = ['security', 'performance', 'architecture', 'code_quality', 'dependency'];
  
  for (const role of roles) {
    console.log(`\n📋 Role: ${role}\n${'='.repeat(50)}`);
    
    const { data, error } = await supabase
      .from('model_configurations')
      .select('*')
      .eq('role', role)
      .eq('language', 'java');
    
    if (error) {
      console.error('Error:', error);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log(`   ❌ NO CONFIG FOUND for ${role}/java\n`);
      continue;
    }
    
    data.forEach(r => {
      const size = r.size_category || 'any';
      console.log(`   ✅ ${role}/java/${size}:`);
      console.log(`      Primary: ${r.primary_model}`);
      console.log(`      Fallback: ${r.fallback_model || 'none'}`);
      console.log(`      Weights: ${JSON.stringify(r.weights)}`);
      console.log();
    });
  }
  
  // Summary
  console.log('\n🔍 Missing Configurations:\n' + '='.repeat(50));
  let missing = [];
  
  for (const role of roles) {
    const { data } = await supabase
      .from('model_configurations')
      .select('size_category')
      .eq('role', role)
      .eq('language', 'java');
    
    if (!data || data.length === 0) {
      missing.push(role);
    }
  }
  
  if (missing.length === 0) {
    console.log('✅ All 5 agent roles have java configurations!');
  } else {
    console.log(`❌ Missing: ${missing.join(', ')}\n`);
  }
}

check();
