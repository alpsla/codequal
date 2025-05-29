#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log('🔧 Debugging Embedding Model Issue\n');

async function debugEmbeddingIssue() {
  console.log('📋 Environment Variables:');
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : '❌ Missing'}`);
  console.log(`   VECTOR_EMBEDDING_MODEL: "${process.env.VECTOR_EMBEDDING_MODEL}"`);
  console.log(`   VECTOR_EMBEDDING_DIMENSIONS: "${process.env.VECTOR_EMBEDDING_DIMENSIONS}"`);

  if (!process.env.OPENAI_API_KEY) {
    console.log('\n❌ OpenAI API key is missing');
    return;
  }

  console.log('\n🔍 Testing OpenAI API Direct Call...');
  
  try {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });

    console.log('✅ OpenAI client created successfully');

    // Test with the exact model name from env
    const modelFromEnv = process.env.VECTOR_EMBEDDING_MODEL;
    console.log(`\n🧪 Testing model: "${modelFromEnv}"`);

    const response = await openai.embeddings.create({
      model: modelFromEnv,
      input: 'test query',
      dimensions: parseInt(process.env.VECTOR_EMBEDDING_DIMENSIONS || '1536', 10)
    });

    console.log('✅ Embedding API call successful!');
    console.log(`   Model used: ${modelFromEnv}`);
    console.log(`   Dimensions: ${response.data[0].embedding.length}`);
    console.log(`   First few values: [${response.data[0].embedding.slice(0, 3).map(x => x.toFixed(3)).join(', ')}...]`);

  } catch (error) {
    console.log(`❌ OpenAI API Error: ${error.message}`);
    
    if (error.message.includes('invalid model ID')) {
      console.log('\n🔧 Trying alternative model names...');
      
      const alternativeModels = [
        'text-embedding-3-large',
        'text-embedding-ada-002',
        'text-embedding-3-small'
      ];

      for (const model of alternativeModels) {
        try {
          console.log(`   Testing: ${model}`);
          const { OpenAI } = require('openai');
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          
          const response = await openai.embeddings.create({
            model: model,
            input: 'test query',
            dimensions: model === 'text-embedding-3-large' ? 1536 : undefined
          });

          console.log(`   ✅ ${model} works! Dimensions: ${response.data[0].embedding.length}`);
          
          // Update recommendation
          console.log(`\n💡 SOLUTION FOUND:`);
          console.log(`   Update your .env file:`);
          console.log(`   VECTOR_EMBEDDING_MODEL=${model}`);
          console.log(`   VECTOR_EMBEDDING_DIMENSIONS=${response.data[0].embedding.length}`);
          
          return { model, dimensions: response.data[0].embedding.length };
          
        } catch (altError) {
          console.log(`   ❌ ${model} failed: ${altError.message}`);
        }
      }
    }
  }

  console.log('\n🔍 Testing without dimensions parameter...');
  try {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: 'test query'
      // No dimensions parameter
    });

    console.log('✅ Success without dimensions parameter!');
    console.log(`   Default dimensions: ${response.data[0].embedding.length}`);
    
    return { model: 'text-embedding-3-large', dimensions: response.data[0].embedding.length };
    
  } catch (error) {
    console.log(`❌ Still failed: ${error.message}`);
  }
}

debugEmbeddingIssue().catch(console.error);