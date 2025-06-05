#!/usr/bin/env node
/* eslint-env node */

/**
 * Researcher Model Comparison: GPT-4.1-nano vs Gemini 2.5 Flash
 * 
 * Tests both models on actual research tasks to compare:
 * - Quality of recommendations
 * - Response time
 * - Cost per query
 * - Accuracy of model selection
 */

/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config({ path: require('path').join(__dirname, '../../../../../.env') });
const fs = require('fs').promises;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  process.stderr.write('❌ OPENROUTER_API_KEY not found\n');
  process.exit(1);
}

// Models to compare
const MODELS = {
  gpt41nano: 'openai/gpt-4.1-nano',
  gemini25flash: 'google/gemini-2.5-flash-preview-05-20'
};

// Test contexts for research
const TEST_CONTEXTS = [
  {
    role: 'security',
    language: 'python',
    frameworks: ['fastapi'],
    size: 'large',
    tier: 'premium'
  },
  {
    role: 'performance',
    language: 'rust',
    frameworks: [],
    size: 'medium',
    tier: 'budget'
  },
  {
    role: 'architecture',
    language: 'typescript',
    frameworks: ['nestjs'],
    size: 'large',
    tier: 'standard'
  }
];

/**
 * Create research prompt
 */
function createResearchPrompt(context) {
  return `Select the 2 best AI models for ${context.role} analysis of a ${context.size} ${context.language} project${context.frameworks.length ? ` using ${context.frameworks.join(', ')}` : ''}.

Budget tier: ${context.tier}
- Budget: max $2/1M tokens average
- Standard: max $15/1M tokens average  
- Premium: max $100/1M tokens average

Requirements for ${context.role}:
${context.role === 'security' ? '- High accuracy in vulnerability detection\n- Understanding of security patterns\n- Low false positive rate' : ''}
${context.role === 'performance' ? '- Technical depth in optimization\n- Understanding of language-specific patterns\n- Cost-effective for analysis' : ''}
${context.role === 'architecture' ? '- Broad system understanding\n- Pattern recognition ability\n- Design principle knowledge' : ''}

Available models (showing top options):
1. anthropic/claude-3.5-sonnet - $3/$15 - High quality
2. openai/gpt-4o - $2.50/$10 - Excellent capability
3. google/gemini-2.5-pro - $3.50/$14 - Strong performance
4. deepseek/deepseek-r1-0528-qwen3-8b - $0.06/$0.09 - Budget option
5. openai/gpt-4o-mini - $0.15/$0.60 - Good balance
6. anthropic/claude-3-haiku - $0.25/$1.25 - Fast and capable
7. google/gemini-2.5-flash - $0.15/$0.60 - Quick and efficient
8. mistral/mistral-large - $2/$6 - European alternative

Output exactly 2 models in order of preference:
PRIMARY: [model-id]
FALLBACK: [model-id]`;
}

/**
 * Test a model on research task
 */
async function testModel(modelId, prompt) {
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/codequal/researcher-comparison',
        'X-Title': 'CodeQual Researcher Comparison'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.2
      })
    });

    const endTime = Date.now();

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const usage = data.usage;

    // Parse recommendations
    const primaryMatch = content.match(/PRIMARY:\s*([^\n]+)/i);
    const fallbackMatch = content.match(/FALLBACK:\s*([^\n]+)/i);

    return {
      modelId,
      responseTime: (endTime - startTime) / 1000,
      usage,
      content,
      recommendations: {
        primary: primaryMatch ? primaryMatch[1].trim() : null,
        fallback: fallbackMatch ? fallbackMatch[1].trim() : null
      },
      success: true
    };

  } catch (error) {
    return {
      modelId,
      error: error.message,
      success: false
    };
  }
}

/**
 * Calculate cost for usage
 */
function calculateCost(modelId, usage) {
  const costs = {
    'openai/gpt-4.1-nano': { input: 0.10, output: 0.40 },
    'google/gemini-2.5-flash-preview-05-20': { input: 0.15, output: 0.60 }
  };
  
  const modelCost = costs[modelId] || { input: 0, output: 0 };
  return (usage.prompt_tokens * modelCost.input + usage.completion_tokens * modelCost.output) / 1000000;
}

/**
 * Score recommendation quality
 */
function scoreRecommendation(context, recommendations) {
  let score = 0;
  const { primary, fallback } = recommendations;
  
  // Check if recommendations match context requirements
  if (context.tier === 'budget') {
    if (primary && (primary.includes('deepseek') || primary.includes('mini') || primary.includes('flash'))) score += 3;
    if (fallback && (fallback.includes('haiku') || fallback.includes('mini'))) score += 2;
  } else if (context.tier === 'premium') {
    if (primary && (primary.includes('sonnet') || primary.includes('gpt-4o') || primary.includes('pro'))) score += 3;
    if (fallback && (fallback.includes('opus') || fallback.includes('large'))) score += 2;
  } else { // standard
    if (primary && (primary.includes('gpt-4o-mini') || primary.includes('haiku') || primary.includes('flash'))) score += 3;
    if (fallback && !fallback.includes('opus')) score += 2;
  }
  
  // Role-specific scoring
  if (context.role === 'security' && primary && (primary.includes('sonnet') || primary.includes('gpt-4'))) score += 1;
  if (context.role === 'performance' && primary && primary.includes('deepseek')) score += 1;
  if (context.role === 'architecture' && primary && (primary.includes('gpt-4') || primary.includes('claude'))) score += 1;
  
  return score;
}

/**
 * Run comparison
 */
async function runComparison() {
  process.stdout.write('🔬 RESEARCHER MODEL COMPARISON: GPT-4.1-nano vs Gemini 2.5 Flash\n\n');
  process.stdout.write('=' .repeat(70) + '\n');
  
  const results = {
    'gpt-4.1-nano': { successes: 0, totalTime: 0, totalCost: 0, totalScore: 0, errors: 0 },
    'gemini-2.5-flash': { successes: 0, totalTime: 0, totalCost: 0, totalScore: 0, errors: 0 }
  };
  
  const allTests = [];
  
  for (const context of TEST_CONTEXTS) {
    process.stdout.write(`\n\n📋 Testing: ${context.role} / ${context.language} / ${context.tier}\n`);
    process.stdout.write('-'.repeat(70) + '\n');
    
    const prompt = createResearchPrompt(context);
    
    for (const [name, modelId] of Object.entries(MODELS)) {
      process.stdout.write(`\n🤖 ${name}:\n`);
      
      const result = await testModel(modelId, prompt);
      
      if (result.success) {
        const cost = calculateCost(modelId, result.usage);
        const score = scoreRecommendation(context, result.recommendations);
        
        process.stdout.write(`✅ Response time: ${result.responseTime.toFixed(2)}s\n`);
        process.stdout.write(`📊 Tokens: ${result.usage.prompt_tokens} in, ${result.usage.completion_tokens} out\n`);
        process.stdout.write(`💰 Cost: $${cost.toFixed(6)}\n`);
        process.stdout.write(`🎯 Quality score: ${score}/6\n`);
        process.stdout.write(`📌 Primary: ${result.recommendations.primary || 'None'}\n`);
        process.stdout.write(`📌 Fallback: ${result.recommendations.fallback || 'None'}\n`);
        
        const modelKey = name.replace('41', '-4.1-').replace('25', '-2.5-');
        results[modelKey].successes++;
        results[modelKey].totalTime += result.responseTime;
        results[modelKey].totalCost += cost;
        results[modelKey].totalScore += score;
        
        allTests.push({
          model: name,
          context,
          ...result,
          cost,
          score
        });
      } else {
        process.stderr.write(`❌ Error: ${result.error}\n`);
        results[name.replace('41', '-4.1-').replace('25', '-2.5-')].errors++;
      }
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  process.stdout.write('\n\n📊 COMPARISON SUMMARY\n');
  process.stdout.write('=' .repeat(70) + '\n');
  
  for (const [model, stats] of Object.entries(results)) {
    if (stats.successes > 0) {
      process.stdout.write(`\n${model.toUpperCase()}:\n`);
      process.stdout.write(`- Success rate: ${stats.successes}/${stats.successes + stats.errors}\n`);
      process.stdout.write(`- Avg response time: ${(stats.totalTime / stats.successes).toFixed(2)}s\n`);
      process.stdout.write(`- Avg cost per query: $${(stats.totalCost / stats.successes).toFixed(6)}\n`);
      process.stdout.write(`- Avg quality score: ${(stats.totalScore / stats.successes).toFixed(1)}/6\n`);
      process.stdout.write(`- Monthly cost (3k/day): $${(stats.totalCost / stats.successes * 3000 * 30).toFixed(2)}\n`);
    }
  }
  
  // Winner determination
  process.stdout.write('\n\n🏆 WINNER ANALYSIS:\n');
  const gptStats = results['gpt-4.1-nano'];
  const geminiStats = results['gemini-2.5-flash'];
  
  if (gptStats.successes > 0 && geminiStats.successes > 0) {
    const gptAvgScore = gptStats.totalScore / gptStats.successes;
    const geminiAvgScore = geminiStats.totalScore / geminiStats.successes;
    const gptAvgCost = gptStats.totalCost / gptStats.successes;
    const geminiAvgCost = geminiStats.totalCost / geminiStats.successes;
    const gptAvgTime = gptStats.totalTime / gptStats.successes;
    const geminiAvgTime = geminiStats.totalTime / geminiStats.successes;
    
    process.stdout.write('\nQuality: ' + (gptAvgScore > geminiAvgScore ? 'GPT-4.1-nano' : gptAvgScore < geminiAvgScore ? 'Gemini 2.5 Flash' : 'TIE') + '\n');
    process.stdout.write('Cost: ' + (gptAvgCost < geminiAvgCost ? 'GPT-4.1-nano' : gptAvgCost > geminiAvgCost ? 'Gemini 2.5 Flash' : 'TIE') + '\n');
    process.stdout.write('Speed: ' + (gptAvgTime < geminiAvgTime ? 'GPT-4.1-nano' : gptAvgTime > geminiAvgTime ? 'Gemini 2.5 Flash' : 'TIE') + '\n');
    
    // Overall winner based on weighted score
    const gptOverall = gptAvgScore * 0.5 + (10 - gptAvgCost * 10000) * 0.3 + (10 - gptAvgTime) * 0.2;
    const geminiOverall = geminiAvgScore * 0.5 + (10 - geminiAvgCost * 10000) * 0.3 + (10 - geminiAvgTime) * 0.2;
    
    process.stdout.write('\n🎯 OVERALL WINNER: ' + (gptOverall > geminiOverall ? 'GPT-4.1-nano' : geminiOverall > gptOverall ? 'Gemini 2.5 Flash' : 'TIE') + '\n');
    process.stdout.write(`GPT-4.1-nano score: ${gptOverall.toFixed(2)}\n`);
    process.stdout.write(`Gemini 2.5 Flash score: ${geminiOverall.toFixed(2)}\n`);
  }
  
  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const outputPath = require('path').join(__dirname, `comparison-results-${timestamp}.json`);
  
  await fs.writeFile(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    models: MODELS,
    contexts: TEST_CONTEXTS,
    results: allTests,
    summary: results
  }, null, 2));
  
  process.stdout.write(`\n💾 Detailed results saved to: ${outputPath}\n`);
}

// Run the comparison
runComparison().catch(err => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
