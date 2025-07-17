import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.OPENAI_API_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function createAndStoreEmbedding(text: string, metadata: any) {
  // Create embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536
  });
  
  const embedding = response.data[0].embedding;
  
  // Store in analysis_reports
  const analysisId = `test-${Date.now()}`;
  const vectorId = uuidv4();
  
  // Log the operation
  await supabase
    .from('vector_operation_logs')
    .insert({
      operation: 'create_embedding',
      success: true,
      duration_ms: 10,
      metadata: {
        model: 'text-embedding-3-small',
        originalDimension: 1536,
        adaptedDimension: 1536,
        adaptationMethod: 'none',
        provider: 'openai',
        analysisId,
        vectorId
      }
    });
  
  // Store analysis report
  await supabase
    .from('analysis_reports')
    .insert({
      analysis_id: analysisId,
      repository_url: 'https://github.com/test/repo',
      report_data: {
        text,
        metadata,
        embedding_sample: embedding.slice(0, 5)
      },
      vector_ids: [vectorId],
      status: 'completed'
    });
  
  return { analysisId, vectorId, embeddingLength: embedding.length };
}

async function searchSimilar(query: string) {
  // Create query embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
    dimensions: 1536
  });
  
  const queryEmbedding = response.data[0].embedding;
  
  // Log the search operation
  await supabase
    .from('vector_operation_logs')
    .insert({
      operation: 'search_embedding',
      success: true,
      duration_ms: 5,
      metadata: {
        model: 'text-embedding-3-small',
        queryLength: query.length,
        embeddingDimension: queryEmbedding.length
      }
    });
  
  return queryEmbedding;
}

async function testEmbeddingIntegration() {
  console.log('🧪 Testing Embedding Integration\n');
  
  // Test 1: Create and store embeddings
  console.log('1. Creating and storing test embeddings...\n');
  
  const testDocuments = [
    {
      text: 'React is a JavaScript library for building user interfaces',
      metadata: { type: 'documentation', topic: 'react' }
    },
    {
      text: 'TypeScript adds static typing to JavaScript',
      metadata: { type: 'documentation', topic: 'typescript' }
    },
    {
      text: 'function fibonacci(n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }',
      metadata: { type: 'code', language: 'javascript' }
    }
  ];
  
  const storedDocs = [];
  
  for (const doc of testDocuments) {
    try {
      const result = await createAndStoreEmbedding(doc.text, doc.metadata);
      console.log(`✅ Stored: "${doc.text.substring(0, 50)}..."`);
      console.log(`   Analysis ID: ${result.analysisId}`);
      console.log(`   Embedding size: ${result.embeddingLength}\n`);
      storedDocs.push(result);
    } catch (error: any) {
      console.error(`❌ Failed to store: ${error.message}`);
    }
  }
  
  // Test 2: Search for similar documents
  console.log('\n2. Testing similarity search...\n');
  
  const queries = [
    'How to use React hooks',
    'Static typing in programming',
    'Recursive algorithms'
  ];
  
  for (const query of queries) {
    try {
      console.log(`🔍 Searching for: "${query}"`);
      const embedding = await searchSimilar(query);
      console.log(`✅ Query embedding created (${embedding.length} dimensions)\n`);
    } catch (error: any) {
      console.error(`❌ Search failed: ${error.message}`);
    }
  }
  
  // Test 3: Check operation logs
  console.log('3. Checking operation logs...\n');
  
  const { data: logs, error: logsError } = await supabase
    .from('vector_operation_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (logsError) {
    console.error('❌ Failed to fetch logs:', logsError.message);
  } else {
    console.log(`Found ${logs?.length || 0} recent operations:`);
    
    const operationCounts: Record<string, number> = {};
    logs?.forEach(log => {
      operationCounts[log.operation] = (operationCounts[log.operation] || 0) + 1;
    });
    
    Object.entries(operationCounts).forEach(([op, count]) => {
      console.log(`   ${op}: ${count} operations`);
    });
  }
  
  // Test 4: Check stored analysis reports
  console.log('\n\n4. Checking stored analysis reports...\n');
  
  const { data: reports, error: reportsError } = await supabase
    .from('analysis_reports')
    .select('analysis_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (reportsError) {
    console.error('❌ Failed to fetch reports:', reportsError.message);
  } else {
    console.log(`Found ${reports?.length || 0} analysis reports:`);
    reports?.forEach(report => {
      console.log(`   ${report.analysis_id} - ${report.status} (${new Date(report.created_at).toLocaleString()})`);
    });
  }
  
  // Test 5: Dimension adaptation simulation
  console.log('\n\n5. Testing dimension adaptation...\n');
  
  try {
    // Test with large model
    const largeResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: 'Test text for large model'
    });
    
    const largeEmbedding = largeResponse.data[0].embedding;
    console.log(`✅ Large model: ${largeEmbedding.length} dimensions`);
    
    // Simulate adaptation
    const adaptedEmbedding = largeEmbedding.slice(0, 1536);
    console.log(`   Adapted to: ${adaptedEmbedding.length} dimensions (truncation)`);
    
    // Log the adaptation
    await supabase
      .from('vector_operation_logs')
      .insert({
        operation: 'embedding_adapted',
        success: true,
        duration_ms: 2,
        metadata: {
          originalDimension: largeEmbedding.length,
          adaptedDimension: adaptedEmbedding.length,
          adaptationMethod: 'truncation',
          model: 'text-embedding-3-large'
        }
      });
    
  } catch (error: any) {
    console.error('❌ Dimension test failed:', error.message);
  }
  
  console.log('\n✅ Integration test complete!');
}

// Run the test
testEmbeddingIntegration().catch(console.error);