import { adaptedEmbeddingService } from '@codequal/core/services/vector-db/embedding-service-with-adapter';
import { authenticatedVectorService } from '@codequal/core/services/vector-db/authenticated-vector-service';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testEmbeddingAdapter() {
  console.log('🧪 Testing Embedding Adapter System\n');

  const testTexts = [
    {
      text: 'This is a test of the embedding adapter system',
      contentType: 'text'
    },
    {
      text: `function calculateSum(a: number, b: number): number {
  return a + b;
}`,
      contentType: 'code'
    },
    {
      text: 'The quick brown fox jumps over the lazy dog. This pangram contains all letters of the alphabet.',
      contentType: 'documentation'
    }
  ];

  // Test 1: Create embeddings with different models
  console.log('Test 1: Creating embeddings with different models\n');
  
  for (const testCase of testTexts) {
    try {
      console.log(`Creating embedding for ${testCase.contentType}:`);
      console.log(`Text: "${testCase.text.substring(0, 50)}..."\n`);
      
      const result = await adaptedEmbeddingService.createEmbedding(testCase.text, {
        contentType: testCase.contentType
      });
      
      console.log('✅ Embedding created successfully');
      console.log(`   Model: ${result.metadata.modelUsed}`);
      console.log(`   Provider: ${result.metadata.provider}`);
      console.log(`   Original dimension: ${result.metadata.originalDimension}`);
      console.log(`   Adapted dimension: ${result.metadata.adaptedDimension}`);
      console.log(`   Adaptation method: ${result.metadata.adaptationMethod}`);
      console.log(`   Embedding sample: [${result.embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]\n`);
      
    } catch (error) {
      console.error('❌ Failed to create embedding:', error);
    }
  }

  // Test 2: Test dimension adaptation with different models
  console.log('\nTest 2: Testing dimension adaptation\n');
  
  const models = ['openai/text-embedding-3-small', 'openai/text-embedding-3-large'];
  
  for (const model of models) {
    try {
      console.log(`Testing model: ${model}`);
      
      const result = await adaptedEmbeddingService.createEmbedding(
        'Test text for dimension adaptation',
        { model }
      );
      
      console.log(`✅ Original: ${result.metadata.originalDimension}, Adapted: ${result.metadata.adaptedDimension}`);
      console.log(`   Method: ${result.metadata.adaptationMethod}\n`);
      
    } catch (error) {
      console.error(`❌ Failed with ${model}:`, error);
    }
  }

  // Test 3: Batch embeddings
  console.log('Test 3: Batch embedding creation\n');
  
  try {
    const batchTexts = [
      'First document about machine learning',
      'Second document about natural language processing',
      'Third document about computer vision'
    ];
    
    const results = await adaptedEmbeddingService.batchCreateEmbeddings(batchTexts, {
      contentType: 'documentation'
    });
    
    console.log(`✅ Created ${results.length} embeddings in batch`);
    results.forEach((result, i) => {
      console.log(`   [${i}] Dimension: ${result.embedding.length}, Method: ${result.metadata.adaptationMethod}`);
    });
    
  } catch (error) {
    console.error('❌ Batch embedding failed:', error);
  }

  // Test 4: Store and search with authenticated vector service
  console.log('\n\nTest 4: Store and search documents\n');
  
  // Create a test user
  const testUserId = 'test-user-' + Date.now();
  
  try {
    // Store a document
    console.log('Storing document...');
    const storeResult = await authenticatedVectorService.storeDocument({
      userId: testUserId,
      content: 'This is a test document about TypeScript and React development',
      contentType: 'documentation',
      metadata: {
        title: 'Test Document',
        language: 'typescript'
      }
    });
    
    console.log('✅ Document stored successfully');
    console.log(`   Document ID: ${storeResult.id}`);
    console.log(`   Embedding dimension: ${storeResult.embeddingMetadata.adaptedDimension}`);
    
    // Search for similar documents
    console.log('\nSearching for similar documents...');
    const searchResult = await authenticatedVectorService.searchDocuments({
      userId: testUserId,
      query: 'React TypeScript development guide',
      contentType: 'documentation',
      limit: 5
    });
    
    console.log(`✅ Found ${searchResult.metadata.resultCount} results`);
    console.log(`   Query embedding dimension: ${searchResult.metadata.embeddingDimension}`);
    
  } catch (error) {
    console.error('❌ Store/search failed:', error);
  }

  // Test 5: Check vector operation logs
  console.log('\n\nTest 5: Checking vector operation logs\n');
  
  try {
    const { data: logs } = await supabase
      .from('vector_operation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log(`Found ${logs?.length || 0} recent operations:`);
    logs?.forEach(log => {
      console.log(`   ${log.operation}: ${log.success ? '✅' : '❌'} (${log.duration_ms}ms)`);
      if (log.metadata?.originalDimension && log.metadata?.adaptedDimension) {
        console.log(`     Dimension: ${log.metadata.originalDimension} → ${log.metadata.adaptedDimension}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch logs:', error);
  }

  // Test 6: Get embedding statistics
  console.log('\n\nTest 6: Embedding statistics\n');
  
  try {
    const stats = await adaptedEmbeddingService.getEmbeddingStats('1h');
    
    if (stats) {
      console.log('✅ Statistics for last hour:');
      console.log(`   Total operations: ${stats.summary.total_operations || 0}`);
      console.log(`   Success rate: ${stats.summary.success_rate || '0%'}`);
      console.log(`   Average duration: ${Math.round(stats.summary.avg_duration_ms || 0)}ms`);
    }
    
  } catch (error) {
    console.error('❌ Failed to get stats:', error);
  }

  // Test 7: Check embedding configurations
  console.log('\n\nTest 7: Embedding configurations\n');
  
  try {
    const { data: configs } = await supabase
      .from('embedding_configurations')
      .select('*')
      .eq('is_active', true);
    
    console.log('Active embedding configurations:');
    configs?.forEach(config => {
      console.log(`   ${config.model_key}: ${config.dimensions} dimensions ($${config.cost_per_million}/M tokens)`);
    });
    
  } catch (error) {
    console.error('❌ Failed to fetch configs:', error);
  }

  console.log('\n\n✅ Testing complete!');
}

// Run the test
testEmbeddingAdapter().catch(console.error);