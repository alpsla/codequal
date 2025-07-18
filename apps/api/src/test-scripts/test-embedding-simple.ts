import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

async function testEmbedding() {
  console.log('🧪 Testing OpenRouter/OpenAI Embedding Service\n');
  
  // Check environment variables
  console.log('Environment check:');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('- OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('- VOYAGE_API_KEY:', process.env.VOYAGE_API_KEY ? '✅ Set' : '❌ Missing');
  
  try {
    // Try to import the embedding service
    console.log('\nImporting embedding service...');
    const { DirectEmbeddingService } = await import('@codequal/core/services/vector-db/openrouter-embedding-service');
    console.log('✅ Import successful');
    
    // Create service instance
    console.log('\nCreating service instance...');
    const embeddingService = new DirectEmbeddingService();
    console.log('✅ Service created');
    
    // Test simple embedding
    console.log('\nCreating test embedding...');
    const testText = 'This is a simple test of the embedding service';
    const embedding = await embeddingService.createEmbedding(testText);
    
    console.log('✅ Embedding created successfully!');
    console.log(`- Dimension: ${embedding.length}`);
    console.log(`- Sample values: [${embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);
    
    // Test with different models if available
    console.log('\nTesting different models...');
    const models = [
      'text-embedding-3-small',
      'text-embedding-3-large',
      'text-embedding-ada-002'
    ];
    
    for (const model of models) {
      try {
        const result = await embeddingService.createEmbedding(testText, { model });
        console.log(`✅ ${model}: ${result.length} dimensions`);
      } catch (error: any) {
        console.log(`❌ ${model}: ${error.message}`);
      }
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  }
}

// Run the test
testEmbedding().catch(console.error);