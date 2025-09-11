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

async function checkSchema() {
  console.log('Checking model_configurations table schema...\n');
  
  // Try to get one row to see the columns
  const { data, error } = await supabase
    .from('model_configurations')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error querying table:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Available columns:', Object.keys(data[0]));
  } else {
    // Try inserting a test row to see what columns are expected
    const testData = {
      role: 'test',
      language: 'test',
      size_category: 'small',
      primary_provider: 'test',
      primary_model: 'test',
      fallback_provider: 'test',
      fallback_model: 'test',
      weights: { quality: 0.5, speed: 0.5 },
      reasoning: ['test'],
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('model_configurations')
      .insert([testData])
      .select();
    
    if (insertError) {
      console.log('Error during test insert:', insertError);
    } else {
      console.log('Successful insert! Available columns:', Object.keys(insertData![0]));
      // Clean up test data
      await supabase
        .from('model_configurations')
        .delete()
        .eq('role', 'test');
    }
  }
}

checkSchema();