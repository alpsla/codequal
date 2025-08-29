#!/usr/bin/env npx ts-node

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '..', '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearAndRegenerate() {
  console.log('🗑️  Clearing existing configurations...');
  
  // Clear all existing configurations
  const { error: deleteError } = await supabase
    .from('model_configurations')
    .delete()
    .neq('role', ''); // Delete all (using a condition that matches everything)
  
  if (deleteError) {
    console.error('Error clearing configs:', deleteError);
  } else {
    console.log('✅ Cleared all existing configurations');
  }
  
  // Now run the generator
  console.log('\n🚀 Regenerating configurations...\n');
  const { generateAllConfigurations, storeConfigurations } = await import('./generate-model-configs');
  
  const configs = await generateAllConfigurations();
  await storeConfigurations(configs);
}

clearAndRegenerate();