import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('\n=== Checking Supabase for security models ===\n');
  
  const { data, error } = await supabase
    .from('model_configurations')
    .select('*')
    .eq('role', 'security')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data?.length || 0} security configurations:\n`);
  data?.forEach((config: any) => {
    console.log(`✓ Model: ${config.model}`);
    console.log(`  Role: ${config.role} | Lang: ${config.language || 'any'} | Size: ${config.repo_size || 'any'}`);
    console.log(`  Score: ${config.total_score?.toFixed(3) || 'N/A'}`);
    console.log(`  Quality: ${config.quality_score?.toFixed(2) || 'N/A'} | Speed: ${config.speed_score?.toFixed(2) || 'N/A'} | Cost: ${config.cost_score?.toFixed(2) || 'N/A'}`);
    console.log(`  Context: ${config.context_window || 'N/A'} tokens`);
    console.log(`  Price: $${config.price_per_1m_input || 'N/A'} input / $${config.price_per_1m_output || 'N/A'} output per 1M\n`);
  });
  
  // Also check what weights were used
  console.log('=== Expected Weights for Security Role ===');
  console.log('Quality: 0.35 | Speed: 0.30 | Cost: 0.35 | Freshness: 0.00\n');
  console.log('⚠️  With equal weight on quality and cost (0.35 each), claude-opus-4.1 selection needs investigation.');
  console.log('Expected: More cost-effective model with good quality balance.\n');
}

check();
