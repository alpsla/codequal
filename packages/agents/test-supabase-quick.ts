import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  console.log('Testing Supabase connection...\n');
  
  const { data, error } = await supabase
    .from('model_configurations')
    .select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Supabase connection failed:', error);
    process.exit(1);
  }
  
  console.log('✅ Supabase connected successfully');
  console.log(`📊 Model configs available: ${data?.length || 0}`);
}

test();
