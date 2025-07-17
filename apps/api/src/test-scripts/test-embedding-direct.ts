import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Load environment variables
const envPath = resolve(__dirname, '../../.env');
console.log('Loading environment from:', envPath);
config({ path: envPath });

// Verify environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
  process.exit(1);
}

console.log('Environment loaded successfully\n');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testEmbeddingDirect() {
  console.log('🧪 Direct Embedding Test\n');

  // Test 1: Check embedding configurations table
  console.log('1. Checking embedding configurations...');
  
  try {
    const { data: configs, error } = await supabase
      .from('embedding_configurations')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching configs:', error.message);
      return;
    }

    console.log(`✅ Found ${configs?.length || 0} active configurations`);
    configs?.forEach(config => {
      console.log(`   - ${config.model_key}: ${config.dimensions}D, $${config.cost_per_million}/M`);
    });
  } catch (error) {
    console.error('❌ Failed to check configurations:', error);
    return;
  }

  // Test 2: Create an embedding with OpenAI
  console.log('\n2. Creating embedding with OpenAI...');
  
  try {
    const testText = 'This is a test of the embedding system';
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testText,
      dimensions: 1536 // Force to our standard dimension
    });

    const embedding = response.data[0].embedding;
    console.log('✅ Embedding created successfully');
    console.log(`   Model: ${response.model}`);
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);
    
    // Test 3: Store in vector_operation_logs
    console.log('\n3. Logging operation...');
    
    const { error: logError } = await supabase
      .from('vector_operation_logs')
      .insert({
        operation: 'test_embedding_direct',
        success: true,
        duration_ms: response.usage?.total_tokens || 0,
        metadata: {
          model: response.model,
          originalDimension: embedding.length,
          adaptedDimension: 1536,
          adaptationMethod: 'native',
          provider: 'openai'
        }
      });

    if (logError) {
      console.error('❌ Failed to log operation:', logError.message);
    } else {
      console.log('✅ Operation logged successfully');
    }

  } catch (error: any) {
    console.error('❌ Failed to create embedding:', error.message || error);
    
    // Log the failure
    await supabase
      .from('vector_operation_logs')
      .insert({
        operation: 'test_embedding_direct',
        success: false,
        error_message: error.message || 'Unknown error',
        metadata: {
          provider: 'openai'
        }
      });
  }

  // Test 4: Check recent logs
  console.log('\n4. Checking recent operation logs...');
  
  try {
    const { data: logs, error } = await supabase
      .from('vector_operation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Failed to fetch logs:', error.message);
    } else {
      console.log(`✅ Recent operations:`);
      logs?.forEach(log => {
        const time = new Date(log.created_at).toLocaleTimeString();
        const status = log.success ? '✅' : '❌';
        console.log(`   ${status} ${time} - ${log.operation} (${log.duration_ms}ms)`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to check logs:', error);
  }

  // Test 5: Test dimension adaptation manually
  console.log('\n5. Testing dimension adaptation...');
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: 'Test text for large model'
      // Not specifying dimensions to get the full 3072
    });

    const embedding = response.data[0].embedding;
    console.log(`✅ Large model embedding: ${embedding.length} dimensions`);
    
    // Simulate adaptation to 1536
    const adapted = embedding.slice(0, 1536);
    console.log(`   Adapted to: ${adapted.length} dimensions`);
    console.log('   Method: truncation');

  } catch (error: any) {
    console.error('❌ Failed dimension test:', error.message);
  }

  console.log('\n✅ Direct testing complete!');
}

// Run the test
testEmbeddingDirect().catch(console.error);