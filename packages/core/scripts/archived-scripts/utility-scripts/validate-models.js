#!/usr/bin/env node
/**
 * Model Validation Script for CodeQual
 * 
 * This script performs a quick test for each model to verify it can be executed
 * successfully before running the full calibration.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables
dotenv.config();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for input
const question = (query) => {
  return new Promise(resolve => rl.question(query, resolve));
};

// API Keys
const API_KEYS = {
  anthropic: process.env.ANTHROPIC_API_KEY || '',
  openai: process.env.OPENAI_API_KEY || '',
  google: process.env.GEMINI_API_KEY || '',
  deepseek: process.env.DEEPSEEK_API_KEY || '',
  openrouter: process.env.OPENROUTER_API_KEY || '',
  github: process.env.GITHUB_TOKEN || ''
};

// Models to test - expanded to include all providers
const MODELS = [
  // Anthropic models
  { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
  { provider: 'anthropic', model: 'claude-3-sonnet-20240229' },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20240620' },
  { provider: 'anthropic', model: 'claude-3-opus-20240229' },
  
  // OpenAI models
  { provider: 'openai', model: 'gpt-3.5-turbo' },
  { provider: 'openai', model: 'gpt-4o' },
  
  // DeepSeek models
  { provider: 'deepseek', model: 'deepseek-coder-lite' },
  { provider: 'deepseek', model: 'deepseek-coder' },
  { provider: 'deepseek', model: 'deepseek-coder-plus' },
  
  // Gemini models
  { provider: 'google', model: 'gemini-1.5-flash' },
  { provider: 'google', model: 'gemini-1.5-pro' },
  
  // OpenRouter models
  { provider: 'openrouter', model: 'anthropic/claude-3.7-sonnet' },
  { provider: 'openrouter', model: 'nousresearch/deephermes-3-mistral-24b-preview:free' }
];

/**
 * Get available models for providers that have a models endpoint
 */
async function getAvailableModels() {
  const updatedModels = [...MODELS];
  
  try {
    if (API_KEYS.google) {
      console.log('Fetching available Gemini models...');
      const response = await axios.get(
        'https://generativelanguage.googleapis.com/v1/models?key=' + API_KEYS.google
      );
      
      const models = response.data.models || [];
      console.log(`Found ${models.length} Gemini models`);
      
      // Find Gemini models and update the list
      for (const model of models) {
        if (model.name.includes('gemini-1.5-pro')) {
          console.log(`Found Gemini 1.5 Pro model: ${model.name}`);
          // Update model name in MODELS array
          const modelIndex = updatedModels.findIndex(m => m.provider === 'google' && m.model.includes('gemini-1.5-pro'));
          if (modelIndex >= 0) {
            updatedModels[modelIndex].model = model.name.replace('models/', '');
          }
        }
        
        if (model.name.includes('gemini-1.5-flash')) {
          console.log(`Found Gemini 1.5 Flash model: ${model.name}`);
          // Update model name in MODELS array
          const modelIndex = updatedModels.findIndex(m => m.provider === 'google' && m.model.includes('gemini-1.5-flash'));
          if (modelIndex >= 0) {
            updatedModels[modelIndex].model = model.name.replace('models/', '');
          }
        }
      }
    }
    
    if (API_KEYS.openrouter) {
      console.log('Fetching available OpenRouter models...');
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEYS.openrouter}`
        }
      });
      
      const models = response.data.data || [];
      console.log(`Found ${models.length} OpenRouter models`);
      
      // Find Claude and other models
      const claudeModel = models.find(m => m.id.includes('claude') && m.id.includes('sonnet'));
      if (claudeModel) {
        console.log(`Found Claude model from OpenRouter: ${claudeModel.id}`);
        // Update model name in MODELS array
        const modelIndex = updatedModels.findIndex(m => m.provider === 'openrouter' && m.model.includes('claude'));
        if (modelIndex >= 0) {
          updatedModels[modelIndex].model = claudeModel.id;
        }
      }
      
      const otherModel = models.find(m => !m.id.includes('claude') && m.context_length > 16000);
      if (otherModel) {
        console.log(`Found alternative model from OpenRouter: ${otherModel.id}`);
        // Update model name in MODELS array
        const modelIndex = updatedModels.findIndex(m => m.provider === 'openrouter' && !m.model.includes('claude'));
        if (modelIndex >= 0) {
          updatedModels[modelIndex].model = otherModel.id;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching available models:', error.message);
  }
  
  return updatedModels;
}

/**
 * Test a single model with a simple prompt
 */
async function testModel(provider, model) {
  console.log(`Testing ${provider}/${model}...`);
  
  const prompt = "What's the architecture of a modern web application? Keep your answer short.";
  const startTime = Date.now();
  
  try {
    let response;
    
    switch (provider) {
      case 'anthropic':
        response = await axios.post('https://api.anthropic.com/v1/messages', {
          model,
          max_tokens: 100,
          messages: [
            { role: 'user', content: prompt }
          ]
        }, {
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': API_KEYS.anthropic
          }
        });
        
        console.log('Content sample:', response.data.content[0].text.substring(0, 50) + '...');
        break;
        
      case 'openai':
        response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 100
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEYS.openai}`
          }
        });
        
        console.log('Content sample:', response.data.choices[0].message.content.substring(0, 50) + '...');
        break;
        
      case 'google':
        response = await axios.post(
          `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEYS.google}`,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              maxOutputTokens: 100
            }
          }
        );
        
        console.log('Content sample:', response.data.candidates[0].content.parts[0].text.substring(0, 50) + '...');
        break;
        
      case 'deepseek':
        response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
          model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 100
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEYS.deepseek}`
          }
        });
        
        console.log('Content sample:', response.data.choices[0].message.content.substring(0, 50) + '...');
        break;
        
      case 'openrouter':
        response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
          model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 100
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEYS.openrouter}`
          }
        });
        
        console.log('Content sample:', response.data.choices[0].message.content.substring(0, 50) + '...');
        break;
        
      default:
        throw new Error(`Provider ${provider} not supported`);
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`✅ ${provider}/${model} test successful (${duration.toFixed(2)}s)`);
    return true;
  } catch (error) {
    console.error(`❌ ${provider}/${model} test failed:`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, JSON.stringify(error.response.data).substring(0, 200));
    }
    
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Model Validation Script ===');
  console.log('This script will test each model with a simple prompt to verify it can be executed.\n');
  
  // Manual API Key Entry
  const updateKeys = await question('Do you want to manually provide API keys? (y/n): ');
  
  if (updateKeys.toLowerCase() === 'y') {
    // Anthropic
    const anthropicKey = await question('Enter Anthropic API key (or press Enter to skip): ');
    if (anthropicKey) API_KEYS.anthropic = anthropicKey;
    
    // OpenAI
    const openaiKey = await question('Enter OpenAI API key (or press Enter to skip): ');
    if (openaiKey) API_KEYS.openai = openaiKey;
    
    // Gemini
    const googleKey = await question('Enter Google API key (or press Enter to skip): ');
    if (googleKey) API_KEYS.google = googleKey;
    
    // DeepSeek
    const deepseekKey = await question('Enter DeepSeek API key (or press Enter to skip): ');
    if (deepseekKey) API_KEYS.deepseek = deepseekKey;
    
    // OpenRouter
    const openrouterKey = await question('Enter OpenRouter API key (or press Enter to skip): ');
    if (openrouterKey) API_KEYS.openrouter = openrouterKey;
  }
  
  // Get available models
  const availableModels = await getAvailableModels();
  
  // Test models
  const results = {
    working: [],
    failing: []
  };
  
  for (const { provider, model } of availableModels) {
    // Check if we have an API key for this provider
    if (!API_KEYS[provider]) {
      console.log(`Skipping ${provider}/${model} - No API key provided`);
      results.failing.push({ provider, model, reason: 'No API key' });
      continue;
    }
    
    // Test the model
    const success = await testModel(provider, model);
    
    if (success) {
      results.working.push({ provider, model });
    } else {
      results.failing.push({ provider, model, reason: 'API error' });
    }
    
    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Show summary
  console.log('\n=== Model Testing Summary ===');
  
  console.log('\nWorking Models:');
  if (results.working.length === 0) {
    console.log('  None');
  } else {
    results.working.forEach(({ provider, model }) => {
      console.log(`  - ${provider}/${model}`);
    });
  }
  
  console.log('\nFailing Models:');
  if (results.failing.length === 0) {
    console.log('  None');
  } else {
    results.failing.forEach(({ provider, model, reason }) => {
      console.log(`  - ${provider}/${model} (${reason})`);
    });
  }
  
  // Save results to file
  const outputPath = path.join(__dirname, 'model-validation-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
  
  // Next steps for calibration
  console.log('\n=== Next Steps ===');
  console.log('1. Review the results to confirm which models are working');
  console.log('2. To run full calibration with working models:');
  console.log('   node packages/core/scripts/comprehensive-calibration.js');
  console.log('3. To generate configuration from calibration results:');
  console.log('   node packages/core/scripts/comprehensive-calibration.js --generate-config');
  
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  rl.close();
  process.exit(1);
});
