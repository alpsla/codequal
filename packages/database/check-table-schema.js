#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkTableSchema() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking table schemas...\n');

  try {
    // Try to insert a dummy row to see required columns for analysis_chunks
    console.log('📊 analysis_chunks table schema:');
    
    const { error: insertError } = await supabase
      .from('analysis_chunks')
      .insert({});
      
    if (insertError) {
      console.log('Required/missing columns from insert error:');
      console.log(insertError.message);
    }

    // Try to insert a dummy row to see required columns for chunk_relationships
    console.log('\n🔗 chunk_relationships table schema:');
    
    const { error: relError } = await supabase
      .from('chunk_relationships')
      .insert({});
      
    if (relError) {
      console.log('Required/missing columns from insert error:');
      console.log(relError.message);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTableSchema();