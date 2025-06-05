/**
 * OpenRouter Model Discovery and Calibration
 * Uses OpenRouter API to get current models and test with the latest
 */

require('dotenv').config();
const axios = require('axios');

/**
 * Get available models from OpenRouter
 */
async function getOpenRouterModels() {
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/codequal/calibration',
        'X-Title': 'CodeQual Calibration'
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error.message);
    return [];
  }
}

/**
 * Filter and categorize models by use case
 */
function categorizeModels(models) {
  const categorized = {
    budget: [],      // < $1/1M tokens
    standard: [],    // $1-10/1M tokens
    premium: [],     // $10-50/1M tokens
    enterprise: []   // > $50/1M tokens
  };
  
  // Filter for code/instruct models only
  const codeModels = models.filter(model => {
    const id = model.id.toLowerCase();
    return (
      id.includes('instruct') ||
      id.includes('chat') ||
      id.includes('code') ||
      id.includes('sonnet') ||
      id.includes('opus') ||
      id.includes('turbo') ||
      !id.includes('vision') &&
      !id.includes('embed')
    );
  });
  
  codeModels.forEach(model => {
    const pricing = model.pricing;
    if (!pricing) return;
    
    // Calculate average cost per 1M tokens
    const inputCost = parseFloat(pricing.prompt) * 1000000;
    const outputCost = parseFloat(pricing.completion) * 1000000;
    const avgCost = (inputCost + outputCost) / 2;
    
    const modelInfo = {
      id: model.id,
      name: model.name,
      contextLength: model.context_length,
      inputCost: inputCost.toFixed(2),
      outputCost: outputCost.toFixed(2),
      avgCost: avgCost.toFixed(2)
    };
    
    if (avgCost < 1) categorized.budget.push(modelInfo);
    else if (avgCost < 10) categorized.standard.push(modelInfo);
    else if (avgCost < 50) categorized.premium.push(modelInfo);
    else categorized.enterprise.push(modelInfo);
  });
  
  // Sort each category by average cost
  Object.keys(categorized).forEach(tier => {
    categorized[tier].sort((a, b) => parseFloat(a.avgCost) - parseFloat(b.avgCost));
  });
  
  return categorized;
}

/**
 * Create a prompt with current OpenRouter models
 */
function createOpenRouterPrompt(context, models) {
  const tierModels = models[context.tier] || models.standard;
  
  // Get top 10 models from the tier
  const modelList = tierModels.slice(0, 10).map(m => 
    `${m.id}: $${m.inputCost}/$${m.outputCost} (${m.contextLength} tokens)`
  ).join('\n');
  
  return `Select 2 best models for ${context.role} analysis.
Context: ${context.language}/${context.frameworks.join(',')}/${context.size}

Available ${context.tier} tier models:
${modelList}

Output 2 CSV rows: provider/model,model,in,out,tier,tokens`;
}

/**
 * Call OpenRouter with a specific model
 */
async function callOpenRouter(prompt, model = 'anthropic/claude-3.5-sonnet') {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model,
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
    console.error('OpenRouter API error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Find the best researcher model from available options
 */
async function findBestResearcher(models) {
  console.log('🔍 Finding best researcher model...\n');
  
  // Look for good cost-effective models
  const candidates = [
    'google/gemini-flash-1.5',
    'google/gemini-flash-1.5-8b',
    'anthropic/claude-3.5-haiku',
    'openai/gpt-4o-mini',
    'deepseek/deepseek-coder',
    'meta-llama/llama-3.1-70b-instruct',
    'mistralai/mistral-large'
  ];
  
  const availableModels = models.filter(m => 
    candidates.some(c => m.id.includes(c))
  );
  
  console.log('Available researcher candidates:');
  availableModels.forEach(model => {
    const inputCost = parseFloat(model.pricing.prompt) * 1000000;
    const outputCost = parseFloat(model.pricing.completion) * 1000000;
    console.log(`- ${model.id}: $${inputCost.toFixed(3)}/$${outputCost.toFixed(3)} per 1M tokens`);
  });
  
  // Return the most cost-effective one
  const sorted = availableModels.sort((a, b) => {
    const costA = parseFloat(a.pricing.prompt) + parseFloat(a.pricing.completion);
    const costB = parseFloat(b.pricing.prompt) + parseFloat(b.pricing.completion);
    return costA - costB;
  });
  
  return sorted[0]?.id || 'anthropic/claude-3.5-sonnet';
}

/**
 * Main calibration test
 */
async function main() {
  console.log('🚀 OpenRouter Dynamic Model Discovery\n');
  
  // Step 1: Get current models
  console.log('📡 Fetching current models from OpenRouter...');
  const models = await getOpenRouterModels();
  console.log(`Found ${models.length} models\n`);
  
  // Step 2: Categorize by tier
  const categorized = categorizeModels(models);
  
  console.log('📊 Models by tier:');
  Object.entries(categorized).forEach(([tier, models]) => {
    console.log(`\n${tier.toUpperCase()} (${models.length} models):`);
    models.slice(0, 5).forEach(m => {
      console.log(`  - ${m.id}: $${m.avgCost} avg/1M tokens`);
    });
    if (models.length > 5) console.log(`  ... and ${models.length - 5} more`);
  });
  
  // Step 3: Find best researcher model
  const researcherModel = await findBestResearcher(models);
  console.log(`\n✅ Selected researcher: ${researcherModel}\n`);
  
  // Step 4: Test contexts
  const contexts = [
    { role: 'security', language: 'typescript', frameworks: ['react'], size: 'medium', tier: 'standard' },
    { role: 'performance', language: 'python', frameworks: ['django'], size: 'large', tier: 'premium' },
    { role: 'codeQuality', language: 'java', frameworks: ['spring'], size: 'small', tier: 'budget' }
  ];
  
  console.log('🧪 Testing model selection...\n');
  
  for (const context of contexts) {
    console.log(`\n📋 ${context.role} for ${context.language}/${context.frameworks[0]}`);
    console.log(`   Tier: ${context.tier}, Size: ${context.size}`);
    console.log('-'.repeat(50));
    
    const prompt = createOpenRouterPrompt(context, categorized);
    const response = await callOpenRouter(prompt, researcherModel);
    
    if (response) {
      const csvLines = response.split('\n')
        .filter(line => line.includes(',') && line.split(',').length >= 6);
      
      if (csvLines.length >= 2) {
        console.log('✅ Recommendations:');
        csvLines.slice(0, 2).forEach((line, i) => {
          const parts = line.split(',');
          console.log(`   ${i + 1}. ${parts[0]} - $${parts[2]}/$${parts[3]} per 1M tokens`);
        });
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Step 5: Show latest models
  console.log('\n\n🌟 Latest Models Found:');
  const latestModels = models
    .filter(m => m.id.includes('gemini') || m.id.includes('claude') || m.id.includes('gpt'))
    .slice(0, 10);
  
  latestModels.forEach(model => {
    const inputCost = parseFloat(model.pricing.prompt) * 1000000;
    const outputCost = parseFloat(model.pricing.completion) * 1000000;
    console.log(`- ${model.id}: $${inputCost.toFixed(2)}/$${outputCost.toFixed(2)} per 1M tokens`);
  });
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}
