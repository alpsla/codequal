import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the correct path
const envPath = resolve(__dirname, '../../.env');
console.log('Loading environment from:', envPath);
config({ path: envPath });

// Also try to load local .env if it exists
const localEnvPath = resolve(__dirname, '../.env');
config({ path: localEnvPath });

// Debug environment variables
console.log('Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\nError: Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

// Import after environment is loaded
import { adaptedEmbeddingService } from '@codequal/core/services/vector-db/embedding-service-with-adapter';
import { authenticatedVectorService } from '@codequal/core/services/vector-db/authenticated-vector-service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEmbeddingAdapter() {
  console.log('\n🧪 Testing Embedding Adapter System\n');

  // Test 1: Simple embedding creation
  console.log('Test 1: Creating a simple embedding\n');
  
  try {
    const testText = 'This is a test of the embedding adapter system';
    console.log(`Creating embedding for: "${testText}"`);
    
    const result = await adaptedEmbeddingService.createEmbedding(testText, {
      contentType: 'text'
    });
    
    console.log('✅ Embedding created successfully');
    console.log(`   Model: ${result.metadata.modelUsed}`);
    console.log(`   Provider: ${result.metadata.provider}`);
    console.log(`   Original dimension: ${result.metadata.originalDimension}`);
    console.log(`   Adapted dimension: ${result.metadata.adaptedDimension}`);
    console.log(`   Adaptation method: ${result.metadata.adaptationMethod}`);
    console.log(`   Embedding length: ${result.embedding.length}`);
    console.log(`   First 5 values: [${result.embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]\n`);
    
  } catch (error: any) {
    console.error('❌ Failed to create embedding:', error.message || error);
    console.error('Full error:', error);
  }

  // Test 2: Check if tables exist
  console.log('\nTest 2: Checking database tables\n');
  
  const tables = ['embedding_configurations', 'vector_operation_logs', 'analysis_reports'];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Found (${count || 0} records)`);
      }
    } catch (error: any) {
      console.log(`❌ ${table}: ${error.message || error}`);
    }
  }

  // Test 3: Check embedding configurations
  console.log('\n\nTest 3: Active embedding configurations\n');
  
  try {
    const { data: configs, error } = await supabase
      .from('embedding_configurations')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('❌ Failed to fetch configs:', error.message);
    } else if (configs && configs.length > 0) {
      console.log(`Found ${configs.length} active configurations:`);
      configs.forEach(config => {
        console.log(`   ${config.model_key}: ${config.dimensions} dimensions ($${config.cost_per_million}/M tokens)`);
      });
    } else {
      console.log('⚠️  No active embedding configurations found');
    }
  } catch (error: any) {
    console.error('❌ Error fetching configs:', error.message || error);
  }

  console.log('\n✅ Basic testing complete!');
}

// Run the test
testEmbeddingAdapter().catch(error => {
  console.error('\n❌ Test failed:', error.message || error);
  process.exit(1);
});