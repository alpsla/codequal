import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  console.log('\n=== Checking Supabase model_configurations Schema ===\n');
  
  // Get one record to see all columns
  const { data: sample, error: sampleError } = await supabase
    .from('model_configurations')
    .select('*')
    .limit(1);
  
  if (sample && sample[0]) {
    console.log('Column names:', Object.keys(sample[0]).join(', '));
    console.log('\nSample record:', JSON.stringify(sample[0], null, 2));
  }
  
  console.log('\n=== Checking security role specifically ===\n');
  
  const { data, error } = await supabase
    .from('model_configurations')
    .select('*')
    .eq('role', 'security')
    .eq('language', 'java');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Found ${data?.length || 0} records for security/java:\n`);
  console.log(JSON.stringify(data, null, 2));
}

check();
