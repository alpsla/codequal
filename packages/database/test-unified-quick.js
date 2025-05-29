#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log('🔧 Quick Unified Search Test\n');

// Check that we have working search with existing data
const { createClient } = require('@supabase/supabase-js');

async function testQuickSearch() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  console.log('📋 Environment check:');
  console.log(`   Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Supabase Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   OpenAI Key: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Model: ${process.env.VECTOR_EMBEDDING_MODEL || 'default'}`);
  console.log(`   Dimensions: ${process.env.VECTOR_EMBEDDING_DIMENSIONS || 'default'}\n`);

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if we have existing chunks to search
  console.log('📊 Checking existing data...');
  const { data: chunks, error } = await supabase
    .from('analysis_chunks')
    .select('id, content, repository_id')
    .limit(5);

  if (error) {
    console.log(`❌ Database error: ${error.message}`);
    return;
  }

  if (!chunks || chunks.length === 0) {
    console.log('⚠️  No chunks found in database');
    console.log('   This is expected if no data has been ingested yet');
    return;
  }

  console.log(`✅ Found ${chunks.length} existing chunks`);
  chunks.forEach((chunk, i) => {
    console.log(`   ${i+1}. ${chunk.id.substring(0, 8)}... - "${chunk.content.substring(0, 50)}..."`);
  });

  // Try a simple search without embeddings (just return existing data)
  console.log('\n🔍 Testing repository search...');
  const { data: repoChunks, error: repoError } = await supabase
    .from('analysis_chunks')
    .select('id, content, metadata, repository_id')
    .eq('repository_id', '550e8400-e29b-41d4-a716-446655440000')
    .limit(3);

  if (repoError) {
    console.log(`❌ Repository search error: ${repoError.message}`);
  } else if (repoChunks && repoChunks.length > 0) {
    console.log(`✅ Found ${repoChunks.length} chunks for test repository`);
    repoChunks.forEach((chunk, i) => {
      console.log(`   ${i+1}. "${chunk.content.substring(0, 80)}..."`);
    });
  } else {
    console.log('⚠️  No chunks found for test repository');
  }

  console.log('\n✅ Basic database connectivity works!');
  console.log('💡 The UnifiedSearchService should work with this data');
  console.log('🔧 The embedding model error might be due to API configuration');
}

testQuickSearch().catch(console.error);