/**
 * Direct test script for OpenRouter
 * Tests connections to different model formats to determine the correct one
 */

const axios = require('axios');

// OpenRouter API key
const OPENROUTER_API_KEY = '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';

// Models to test
const models = [
  'deepseek/deepseek-coder',
  'deepseek/deepseek-coder-v2',
  'deepseek-ai/deepseek-coder',
  'anthropic/claude-3-7-sonnet' // Known working model as a baseline
];

async function testModel(model) {
  console.log(`Testing model: ${model}...`);
  
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello and identify which AI model you are.' }
        ],
        max_tokens: 100
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/your-username/your-repo',
          'X-Title': 'Model Format Test'
        }
      }
    );
    
    console.log(`✅ Success with model: ${model}`);
    console.log(`Response: ${response.data.choices[0].message.content.trim()}`);
    console.log('---');
    return true;
  } catch (error) {
    console.error(`❌ Error with model ${model}:`);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Error data:', error.response.data);
    } else {
      console.error(`Error: ${error.message}`);
    }
    
    console.log('---');
    return false;
  }
}

async function main() {
  console.log('OpenRouter Direct Model Format Test');
  console.log('==================================');
  
  const results = {};
  
  for (const model of models) {
    results[model] = await testModel(model);
  }
  
  console.log('\nTest Results Summary:');
  console.log('=====================');
  
  for (const [model, success] of Object.entries(results)) {
    console.log(`${success ? '✅' : '❌'} ${model}`);
  }
  
  const workingModels = Object.entries(results)
    .filter(([_, success]) => success)
    .map(([model, _]) => model);
  
  if (workingModels.length > 0) {
    console.log(`\nWorking model(s): ${workingModels.join(', ')}`);
    console.log('Use these model names in your configuration.');
  } else {
    console.log('\nNo models were successful. Please check your API key and try again.');
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});