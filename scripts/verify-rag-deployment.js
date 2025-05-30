#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function verifyRAGDeployment() {
  console.log(`${colors.blue}🔍 Verifying RAG Deployment${colors.reset}`);
  console.log('============================\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let allGood = true;

  // 1. Check educational content table
  console.log(`${colors.blue}1. Checking Educational Content Table${colors.reset}`);
  try {
    const { data, error, count } = await supabase
      .from('rag_educational_content')
      .select('*', { count: 'exact' });

    if (error) throw error;

    console.log(`${colors.green}✅ Table exists with ${count} entries${colors.reset}`);
    
    if (data && data.length > 0) {
      console.log('   Sample content:');
      data.slice(0, 3).forEach(item => {
        console.log(`   - ${item.title} (${item.content_type})`);
      });
    }
  } catch (error) {
    console.log(`${colors.red}❌ Table not found or error: ${error.message}${colors.reset}`);
    allGood = false;
  }

  // 2. Check query patterns table
  console.log(`\n${colors.blue}2. Checking Query Patterns Table${colors.reset}`);
  try {
    const { error } = await supabase
      .from('rag_query_patterns')
      .select('count')
      .limit(1);

    if (error) throw error;
    console.log(`${colors.green}✅ Table exists${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}❌ Table not found: ${error.message}${colors.reset}`);
    allGood = false;
  }

  // 3. Test RAG search function
  console.log(`\n${colors.blue}3. Testing RAG Search Function${colors.reset}`);
  try {
    // Create a simple test embedding
    const testEmbedding = new Array(1536).fill(0.1);
    
    const { data, error } = await supabase.rpc('rag_search_educational_content', {
      query_embedding: testEmbedding,
      match_count: 3
    });

    if (error) throw error;

    console.log(`${colors.green}✅ Search function works${colors.reset}`);
    if (data && data.length > 0) {
      console.log(`   Found ${data.length} results`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Function error: ${error.message}${colors.reset}`);
    allGood = false;
  }

  // 4. Check document embeddings view
  console.log(`\n${colors.blue}4. Checking Document Embeddings View${colors.reset}`);
  try {
    const { data, error } = await supabase
      .from('rag_document_embeddings')
      .select('count')
      .limit(1);

    if (error) throw error;
    console.log(`${colors.green}✅ View exists${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}⚠️  View might not exist (expected if no documents yet)${colors.reset}`);
  }

  // Summary
  console.log(`\n${colors.blue}Summary${colors.reset}`);
  console.log('====================');
  
  if (allGood) {
    console.log(`${colors.green}✅ RAG deployment verified successfully!${colors.reset}`);
    console.log('\nNext steps:');
    console.log('1. Run tests: npm test -- --testPathPattern="rag"');
    console.log('2. Test integration: npx ts-node scripts/test-rag-integration.ts');
    console.log('3. Start implementing Multi-Agent Executor');
  } else {
    console.log(`${colors.red}❌ Some components are missing${colors.reset}`);
    console.log('\nPlease ensure the migration was run completely in Supabase SQL Editor');
  }
}

// Run verification
verifyRAGDeployment().catch(error => {
  console.error(`${colors.red}❌ Verification failed:${colors.reset}`, error);
  process.exit(1);
});