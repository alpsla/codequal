#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkSchema() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Checking existing database schema...\n');

  try {
    // Check for existing tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['analysis_chunks', 'chunk_relationships', 'repositories', 'repository_analyses']);

    if (tablesError) {
      console.log('Could not query information_schema, trying alternative method...');
      
      // Try to select from each table to see if it exists
      const tablesToCheck = ['analysis_chunks', 'chunk_relationships', 'repositories', 'repository_analyses'];
      
      for (const table of tablesToCheck) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error) {
          console.log(`✅ Table exists: ${table}`);
        } else if (error.message.includes('does not exist')) {
          console.log(`❌ Table does not exist: ${table}`);
        } else {
          console.log(`⚠️  Table ${table}: ${error.message}`);
        }
      }
    } else {
      console.log('📊 Existing tables in public schema:');
      tables.forEach(t => console.log(`  - ${t.table_name}`));
    }

    // Check for existing functions
    console.log('\n🔧 Checking for search function...');
    const { data: searchTest, error: searchError } = await supabase
      .rpc('search_similar_chunks', {
        query_embedding: Array(1536).fill(0),
        repo_id: 'test',
        match_count: 1,
        min_similarity: 0.5
      });

    if (!searchError) {
      console.log('✅ Function exists: search_similar_chunks');
    } else if (searchError.message.includes('does not exist')) {
      console.log('❌ Function does not exist: search_similar_chunks');
    } else {
      console.log(`⚠️  Function search_similar_chunks: ${searchError.message}`);
    }

  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkSchema();