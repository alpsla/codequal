#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkColumnTypes() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking column types in analysis_chunks table...\n');

  try {
    // Get a sample row to see the structure
    const { data, error } = await supabase
      .from('analysis_chunks')
      .select('*')
      .limit(1);

    if (error) {
      console.log('Error querying table:', error.message);
      
      // Try to get column info another way
      const { data: emptyData, error: emptyError } = await supabase
        .from('analysis_chunks')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .single();
        
      if (emptyError && emptyError.message.includes('not found')) {
        console.log('Table exists but is empty or UUID not found');
      }
    } else {
      if (data && data.length > 0) {
        console.log('Sample row structure:');
        Object.keys(data[0]).forEach(key => {
          const value = data[0][key];
          const type = value === null ? 'null' : typeof value;
          console.log(`  - ${key}: ${type} (sample: ${JSON.stringify(value).substring(0, 50)}...)`);
        });
      } else {
        console.log('Table exists but is empty');
      }
    }

    // Check repositories table structure
    console.log('\n🔍 Checking repositories table...\n');
    const { data: repoData, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .limit(1);

    if (repoError) {
      console.log('Error querying repositories:', repoError.message);
    } else if (repoData && repoData.length > 0) {
      console.log('Sample repositories row:');
      Object.keys(repoData[0]).forEach(key => {
        const value = repoData[0][key];
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${key}: ${type}`);
      });
    } else {
      console.log('Repositories table is empty');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkColumnTypes();