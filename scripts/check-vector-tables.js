#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkVectorTables() {
  console.log('🔍 Checking Vector Database Status\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Check analysis_chunks (the base vector table)
  console.log('1. Checking analysis_chunks table:');
  try {
    const { count, error } = await supabase
      .from('analysis_chunks')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`   ✅ Table exists with ${count} rows`);
  } catch (error) {
    console.log(`   ❌ Table not found: ${error.message}`);
  }

  // List all tables starting with 'rag_'
  console.log('\n2. Checking for RAG tables:');
  const { data: tables } = await supabase.rpc('get_tables_like', {
    pattern: 'rag_%'
  }).select().catch(() => ({ data: null }));

  if (tables && tables.length > 0) {
    tables.forEach(table => {
      console.log(`   ✅ ${table.table_name}`);
    });
  } else {
    console.log('   ❌ No RAG tables found');
    console.log('   → Need to run migration: 20250530_rag_schema_integration.sql');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. If RAG tables missing, run the migration in Supabase SQL Editor');
  console.log('2. File: packages/database/migrations/20250530_rag_schema_integration.sql');
}

checkVectorTables().catch(console.error);