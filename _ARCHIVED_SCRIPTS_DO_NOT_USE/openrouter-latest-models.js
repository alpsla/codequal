/**
 * OpenRouter Latest Model Calibration
 * Uses OpenRouter to access the very latest models including Gemini 2.5
 */

require('dotenv').config();
const axios = require('axios');

// Known latest models (June 2025) that might be available on OpenRouter
const LATEST_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.5-pro', 
  'google/gemini-flash-1.5-latest',
  'anthropic/claude-4-opus',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o',
  'openai/gpt-4o-mini-2024-07-18',
  'meta-llama/llama-3.2-405b-instruct',
  'deepseek/deepseek-coder-v3',
  'x-ai/grok-beta',
  'x-ai/grok-2-latest'
];

/**
 * Check which latest models are available on OpenRouter
 */
async function checkLatestModels() {
  console.log('🔍 Checking for latest models on OpenRouter...\n');
  
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/codequal/calibration',
        'X-Title': 'CodeQual Calibration'
      }
    });
    
    const availableModels = response.data.data;
    const modelMap = new Map(availableModels.map(m => [m.id, m]));
    
    console.log('✅ Available Latest Models:');
    LATEST_MODELS.forEach(modelId => {
      const model = modelMap.get(modelId);
      if (model) {
        const inputCost = parseFloat(model.pricing.prompt) * 1000000;
        const outputCost = parseFloat(model.pricing.completion) * 1000000;
        console.log(`  - ${modelId}: $${inputCost.toFixed(2)}/$${outputCost.toFixed(2)} per 1M tokens`);
      }
    });
    
    // Check for any Gemini 2.5 models
    const gemini25Models = availableModels.filter(m => 
      m.id.includes('gemini') && (m.id.includes('2.5') || m.id.includes('latest'))
    );
    
    if (gemini25Models.length > 0) {
      console.log('\n🌟 Found Gemini 2.5 or latest models:');
      gemini25Models.forEach(model => {
        const inputCost = parseFloat(model.pricing.prompt) * 1000000;
        const outputCost = parseFloat(model.pricing.completion) * 1000000;
        console.log(`  - ${model.id}: $${inputCost.toFixed(2)}/$${outputCost.toFixed(2)} per 1M tokens`);
      });
    }
    
    return availableModels;
  } catch (error) {
    console.error('Error fetching models:', error.message);
    return [];
  }
}

/**
 * Test with a specific latest model
 */
async function testWithLatestModel(modelId, context) {
  const prompt = `You are using the latest AI models as of June 2025. Select 2 best models for ${context.role} code analysis.

Context: ${context.language}/${context.frameworks.join(',')}/${context.size} repository

Requirements:
- ${context.tier} budget tier
- Focus on latest releases (Gemini 2.5, Claude 3.7/4, GPT-4o, Grok-3, etc.)
- Consider specialized code models like DeepSeek Coder V3

Output exactly 2 CSV rows:
provider,model,cost_input,cost_output,tier,tokens

Prioritize newer models like Gemini 2.5 Flash for cost-efficiency.`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/codequal/calibration',
          'X-Title': 'CodeQual Calibration',
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(`Error with ${modelId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Main test
 */
async function main() {
  console.log('🚀 OpenRouter Latest Model Calibration\n');
  console.log('Goal: Use the newest models to recommend other newest models\n');
  
  // Check available models
  const models = await checkLatestModels();
  
  // Find the best researcher model (preferably Gemini 2.5 Flash or similar)
  const preferredResearchers = [
    'google/gemini-flash-1.5-latest',
    'google/gemini-2.5-flash',
    'openai/gpt-4o-mini-2024-07-18',
    'anthropic/claude-3.5-haiku',
    'deepseek/deepseek-coder-v3'
  ];
  
  let researcherModel = null;
  for (const preferred of preferredResearchers) {
    if (models.find(m => m.id === preferred)) {
      researcherModel = preferred;
      break;
    }
  }
  
  if (!researcherModel) {
    researcherModel = 'anthropic/claude-3.5-sonnet'; // Fallback
  }
  
  console.log(`\n✅ Using researcher model: ${researcherModel}\n`);
  
  // Test contexts
  const contexts = [
    { role: 'security', language: 'typescript', frameworks: ['react'], size: 'medium', tier: 'standard' },
    { role: 'performance', language: 'python', frameworks: ['django'], size: 'large', tier: 'premium' },
    { role: 'codeQuality', language: 'java', frameworks: ['spring'], size: 'small', tier: 'budget' }
  ];
  
  for (const context of contexts) {
    console.log(`\n📋 ${context.role} for ${context.language}/${context.frameworks[0]}`);
    console.log(`   Using: ${researcherModel}`);
    console.log('-'.repeat(60));
    
    const response = await testWithLatestModel(researcherModel, context);
    
    if (response) {
      // Parse CSV response
      const csvLines = response.split('\n')
        .map(line => line.trim())
        .filter(line => line.match(/^[\w/-]+,[\w\s.-]+,[\d.]+,[\d.]+,\w+,\d+$/));
      
      if (csvLines.length >= 2) {
        console.log('✅ Recommendations:');
        csvLines.slice(0, 2).forEach((line, i) => {
          const [provider, model, costIn, costOut] = line.split(',');
          console.log(`   ${i + 1}. ${provider}/${model} - $${costIn}/$${costOut} per 1M tokens`);
          
          // Check if it recommended latest models
          if (model.includes('2.5') || model.includes('3.7') || model.includes('4')) {
            console.log(`      🌟 Latest model!`);
          }
        });
      } else {
        console.log('⚠️  Could not parse CSV response:');
        console.log(response.substring(0, 200));
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('\n\n💡 Key Insights:');
  console.log('- OpenRouter provides access to latest models');
  console.log('- We can dynamically discover what\'s available');
  console.log('- Using a recent model as researcher improves recommendations');
  console.log('- This approach future-proofs our calibration system');
}

if (require.main === module) {
  main().catch(console.error);
}
