/**
 * Direct OpenRouter Research - Fetch and analyze real models
 */

import axios from 'axios';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import * as fs from 'fs/promises';

// Load environment
loadEnv({ path: join(__dirname, '../../../../.env') });

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  created?: number;
}

interface ScoredModel {
  id: string;
  provider: string;
  model: string;
  inputCost: number;
  outputCost: number;
  avgCost: number;
  contextWindow: number;
  quality: number;
  speed: number;
  compositeScore: number;
  isDeprecated: boolean;
  created?: Date;
}

// Scoring weights for researcher use case
const SCORING_WEIGHTS = {
  quality: 0.4,    // Research needs quality
  cost: 0.4,      // Cost efficiency important
  speed: 0.2      // Speed less critical for research
};

// Known quality scores based on model families
const QUALITY_SCORES: Record<string, number> = {
  'gpt-4': 9.5,
  'gpt-4-turbo': 9.3,
  'claude-3-opus': 9.5,
  'claude-3.5-sonnet': 9.2,
  'claude-3-sonnet': 9.0,
  'claude-3-haiku': 8.5,
  'gemini-pro': 8.8,
  'gemini-2.0-flash': 8.5,
  'gemini-1.5-pro': 9.0,
  'mixtral-8x7b': 8.2,
  'mixtral-8x22b': 8.5,
  'llama-3.1-405b': 8.8,
  'llama-3.1-70b': 8.5,
  'deepseek-chat': 8.0,
  'qwen': 8.2
};

function scoreModel(model: OpenRouterModel): ScoredModel | null {
  // Parse costs
  const inputCost = parseFloat(model.pricing.prompt) * 1000000; // Convert to per million
  const outputCost = parseFloat(model.pricing.completion) * 1000000;
  const avgCost = (inputCost + outputCost) / 2;
  
  // Skip if costs are invalid
  if (isNaN(inputCost) || isNaN(outputCost) || avgCost === 0) {
    return null;
  }
  
  // Extract provider and model name
  const [provider, ...modelParts] = model.id.split('/');
  const modelName = modelParts.join('/');
  
  // Check if deprecated (older than 6 months or known deprecated models)
  const createdDate = model.created ? new Date(model.created * 1000) : null;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const isDeprecated = (createdDate && createdDate < sixMonthsAgo) ||
    modelName.includes('deprecated') ||
    modelName.includes('old') ||
    modelName.includes('32k') && modelName.includes('0613') ||
    modelName.includes('0301') ||
    modelName.includes('0314');
  
  // Estimate quality score
  let quality = 7.0; // Default
  for (const [key, score] of Object.entries(QUALITY_SCORES)) {
    if (modelName.toLowerCase().includes(key) || model.name.toLowerCase().includes(key)) {
      quality = score;
      break;
    }
  }
  
  // Adjust quality for specific models
  if (modelName.includes('instruct')) quality -= 0.3;
  if (modelName.includes('base')) quality -= 0.5;
  if (modelName.includes('turbo')) quality += 0.2;
  if (modelName.includes('preview')) quality += 0.1;
  
  // Estimate speed (inversely related to size/quality generally)
  let speed = 8.0;
  if (modelName.includes('405b') || modelName.includes('opus')) speed = 5.0;
  else if (modelName.includes('70b') || modelName.includes('sonnet')) speed = 6.5;
  else if (modelName.includes('8b') || modelName.includes('haiku')) speed = 9.0;
  else if (modelName.includes('turbo') || modelName.includes('flash')) speed = 9.5;
  
  // Calculate normalized scores (0-10 scale)
  const costScore = Math.max(0, 10 - (avgCost / 10)); // $0-100/M mapped to 10-0
  
  // Composite score
  const compositeScore = 
    quality * SCORING_WEIGHTS.quality +
    costScore * SCORING_WEIGHTS.cost +
    speed * SCORING_WEIGHTS.speed;
  
  return {
    id: model.id,
    provider,
    model: modelName,
    inputCost,
    outputCost,
    avgCost,
    contextWindow: model.context_length || 4096,
    quality,
    speed,
    compositeScore,
    isDeprecated,
    created: createdDate
  };
}

async function fetchOpenRouterModels() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not found in environment');
  }
  
  console.log('📡 Fetching models from OpenRouter...');
  
  const response = await axios.get('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/codequal/researcher',
      'X-Title': 'CodeQual Researcher'
    }
  });
  
  return response.data.data as OpenRouterModel[];
}

async function main() {
  console.log('================================================================================');
  console.log('🚀 REAL MODEL RESEARCH FROM OPENROUTER');
  console.log('================================================================================\n');
  
  try {
    // Fetch models
    const models = await fetchOpenRouterModels();
    console.log(`✅ Fetched ${models.length} models from OpenRouter\n`);
    
    // Score and filter models
    const scoredModels = models
      .map(scoreModel)
      .filter((m): m is ScoredModel => m !== null && !m.isDeprecated)
      .sort((a, b) => b.compositeScore - a.compositeScore);
    
    console.log(`📊 Scored ${scoredModels.length} non-deprecated models\n`);
    
    // Display top 10 models
    console.log('🏆 TOP 10 MODELS FOR RESEARCHER:\n');
    scoredModels.slice(0, 10).forEach((model, idx) => {
      console.log(`${idx + 1}. ${model.id}`);
      console.log(`   Composite Score: ${model.compositeScore.toFixed(2)}`);
      console.log(`   Quality: ${model.quality.toFixed(1)}/10`);
      console.log(`   Cost: $${model.avgCost.toFixed(2)}/M tokens (Input: $${model.inputCost.toFixed(2)}, Output: $${model.outputCost.toFixed(2)})`);
      console.log(`   Speed: ${model.speed.toFixed(1)}/10`);
      console.log(`   Context: ${model.contextWindow.toLocaleString()} tokens`);
      console.log('');
    });
    
    // Analyze by provider
    console.log('📊 PROVIDER ANALYSIS:\n');
    const providers = new Map<string, ScoredModel[]>();
    scoredModels.forEach(model => {
      if (!providers.has(model.provider)) {
        providers.set(model.provider, []);
      }
      providers.get(model.provider)!.push(model);
    });
    
    const providerStats = Array.from(providers.entries())
      .map(([provider, models]) => ({
        provider,
        count: models.length,
        avgScore: models.reduce((sum, m) => sum + m.compositeScore, 0) / models.length,
        avgCost: models.reduce((sum, m) => sum + m.avgCost, 0) / models.length,
        topModel: models[0]
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
    
    providerStats.forEach(stat => {
      console.log(`${stat.provider}:`);
      console.log(`  Models: ${stat.count}`);
      console.log(`  Avg Score: ${stat.avgScore.toFixed(2)}`);
      console.log(`  Avg Cost: $${stat.avgCost.toFixed(2)}/M`);
      console.log(`  Best Model: ${stat.topModel.model} (${stat.topModel.compositeScore.toFixed(2)})`);
      console.log('');
    });
    
    // Find best value models (high score, low cost)
    console.log('💎 BEST VALUE MODELS (Score > 7.5, Cost < $5/M):\n');
    const valueModels = scoredModels
      .filter(m => m.compositeScore > 7.5 && m.avgCost < 5)
      .slice(0, 5);
    
    valueModels.forEach(model => {
      console.log(`- ${model.id}: Score ${model.compositeScore.toFixed(2)}, $${model.avgCost.toFixed(2)}/M`);
    });
    
    // Sample configurations for different use cases
    console.log('\n\n🎯 RECOMMENDED CONFIGURATIONS:\n');
    
    // High quality research (e.g., security, architecture)
    const highQualityModels = scoredModels.filter(m => m.quality >= 8.5);
    console.log('1. High Quality Research (Security/Architecture):');
    console.log(`   Primary: ${highQualityModels[0]?.id || 'N/A'}`);
    console.log(`   Fallback: ${highQualityModels.find(m => m.provider !== highQualityModels[0]?.provider)?.id || highQualityModels[1]?.id || 'N/A'}`);
    
    // Cost-efficient research (e.g., documentation, testing)
    const costEfficient = scoredModels.filter(m => m.avgCost < 3 && m.quality >= 7.5);
    console.log('\n2. Cost-Efficient Research (Docs/Testing):');
    console.log(`   Primary: ${costEfficient[0]?.id || 'N/A'}`);
    console.log(`   Fallback: ${costEfficient.find(m => m.provider !== costEfficient[0]?.provider)?.id || costEfficient[1]?.id || 'N/A'}`);
    
    // Balanced research (general purpose)
    console.log('\n3. Balanced Research (General Purpose):');
    console.log(`   Primary: ${scoredModels[0]?.id || 'N/A'}`);
    console.log(`   Fallback: ${scoredModels.find(m => m.provider !== scoredModels[0]?.provider)?.id || scoredModels[1]?.id || 'N/A'}`);
    
    // Large context research
    const largeContext = scoredModels.filter(m => m.contextWindow >= 100000).slice(0, 5);
    console.log('\n4. Large Context Research (Big Codebases):');
    console.log(`   Primary: ${largeContext[0]?.id || 'N/A'} (${largeContext[0]?.contextWindow.toLocaleString() || 0} tokens)`);
    console.log(`   Fallback: ${largeContext.find(m => m.provider !== largeContext[0]?.provider)?.id || largeContext[1]?.id || 'N/A'}`);
    
    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      totalModels: models.length,
      scoredModels: scoredModels.length,
      topModels: scoredModels.slice(0, 20),
      providerStats,
      recommendations: {
        highQuality: {
          primary: highQualityModels[0],
          fallback: highQualityModels.find(m => m.provider !== highQualityModels[0]?.provider) || highQualityModels[1]
        },
        costEfficient: {
          primary: costEfficient[0],
          fallback: costEfficient.find(m => m.provider !== costEfficient[0]?.provider) || costEfficient[1]
        },
        balanced: {
          primary: scoredModels[0],
          fallback: scoredModels.find(m => m.provider !== scoredModels[0]?.provider) || scoredModels[1]
        },
        largeContext: {
          primary: largeContext[0],
          fallback: largeContext.find(m => m.provider !== largeContext[0]?.provider) || largeContext[1]
        }
      }
    };
    
    await fs.writeFile(
      join(__dirname, 'openrouter-research-results.json'),
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n\n✅ Results saved to openrouter-research-results.json');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();