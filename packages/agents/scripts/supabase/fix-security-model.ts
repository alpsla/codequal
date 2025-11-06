import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('\n=== Fixing security/java/medium configuration ===\n');
  
  // Delete the wrong record
  const { error: deleteError } = await supabase
    .from('model_configurations')
    .delete()
    .eq('role', 'security')
    .eq('language', 'java')
    .eq('size_category', 'medium');
  
  if (deleteError) {
    console.error('Delete error:', deleteError);
    return;
  }
  
  console.log('✅ Deleted incorrect security/java/medium record');
  console.log('   (Was using claude-opus-4.1 with wrong weights)\n');
  
  // Verify it's gone
  const { data, error } = await supabase
    .from('model_configurations')
    .select('*')
    .eq('role', 'security')
    .eq('language', 'java');
  
  console.log(`Remaining security/java records: ${data?.length || 0}`);
  data?.forEach(r => {
    console.log(`  - ${r.size_category || 'any'}: ${r.primary_model}`);
  });
  
  console.log('\n✅ Now security/java will use the "any" record with deepseek (cost-effective!)');
}

fix();
