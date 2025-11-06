import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('\n=== Fixing Duplicate Educator/Orchestrator Configs ===\n');
  
  // Delete the expensive "medium" specific configs
  console.log('🗑️  Deleting educator/java/medium (uses claude-opus-4.1)...');
  const { error: eduError } = await supabase
    .from('model_configurations')
    .delete()
    .eq('role', 'educator')
    .eq('language', 'java')
    .eq('size_category', 'medium');
  
  if (eduError) {
    console.error('Error deleting educator/medium:', eduError);
  } else {
    console.log('✅ Deleted\n');
  }
  
  console.log('🗑️  Deleting orchestrator/java/medium (uses claude-opus-4.1)...');
  const { error: orchError } = await supabase
    .from('model_configurations')
    .delete()
    .eq('role', 'orchestrator')
    .eq('language', 'java')
    .eq('size_category', 'medium');
  
  if (orchError) {
    console.error('Error deleting orchestrator/medium:', orchError);
  } else {
    console.log('✅ Deleted\n');
  }
  
  // Verify remaining configs
  console.log('📋 Remaining configs:\n');
  
  const { data } = await supabase
    .from('model_configurations')
    .select('*')
    .in('role', ['educator', 'orchestrator'])
    .eq('language', 'java');
  
  data?.forEach(r => {
    console.log(`   ${r.role}/java/${r.size_category || 'any'}: ${r.primary_model}`);
  });
  
  console.log('\n✅ Now Educator will use claude-sonnet-4.5 (cheaper & still high quality)');
  console.log('✅ Orchestrator will use gemini-2.5-flash (fast & cost-effective)\n');
}

fix();
