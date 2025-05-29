const OpenAI = require('openai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function debugEmbeddingModel() {
  console.log('🔍 Debugging Embedding Model Configuration\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('VECTOR_EMBEDDING_MODEL:', process.env.VECTOR_EMBEDDING_MODEL || '❌ Not set');
  console.log('Raw value:', JSON.stringify(process.env.VECTOR_EMBEDDING_MODEL));
  console.log('Length:', process.env.VECTOR_EMBEDDING_MODEL?.length);
  
  // Test direct OpenAI call
  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('\nTesting OpenAI Models:');
    
    const modelsToTest = [
      'text-embedding-3-large',
      'text-embedding-3-small',
      'text-embedding-ada-002'
    ];
    
    for (const model of modelsToTest) {
      try {
        console.log(`\nTesting ${model}:`);
        const response = await openai.embeddings.create({
          model: model,
          input: 'Test embedding generation',
        });
        
        console.log(`✅ ${model} works!`);
        console.log(`   Dimensions: ${response.data[0].embedding.length}`);
        console.log(`   Usage: ${response.usage.total_tokens} tokens`);
      } catch (error) {
        console.log(`❌ ${model} failed: ${error.message}`);
      }
    }
    
    // Test with environment variable value
    const envModel = process.env.VECTOR_EMBEDDING_MODEL;
    if (envModel) {
      console.log(`\nTesting environment model: "${envModel}"`);
      try {
        const response = await openai.embeddings.create({
          model: envModel,
          input: 'Test embedding generation',
        });
        console.log(`✅ Environment model works!`);
      } catch (error) {
        console.log(`❌ Environment model failed: ${error.message}`);
        
        // Try trimming
        const trimmed = envModel.trim();
        if (trimmed !== envModel) {
          console.log(`\nTrying trimmed value: "${trimmed}"`);
          try {
            const response = await openai.embeddings.create({
              model: trimmed,
              input: 'Test embedding generation',
            });
            console.log(`✅ Trimmed model works!`);
          } catch (error) {
            console.log(`❌ Trimmed model failed: ${error.message}`);
          }
        }
      }
    }
    
    // Check config loading
    console.log('\nChecking config loading:');
    const { getEmbeddingConfig } = require('./dist/config/vector-database.config.js');
    const config = getEmbeddingConfig();
    console.log('Config model:', config.openai.model);
    console.log('Config model JSON:', JSON.stringify(config.openai.model));
  }
}

debugEmbeddingModel().catch(console.error);