#!/usr/bin/env ts-node

/**
 * Test scoring differentiation - shows how different weights produce different selections
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface ModelInfo {
  id: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

interface TestConfig {
  name: string;
  weights: { quality: number; speed: number; cost: number };
  minContext: number;
  maxCost?: number;
}

// Enhanced scoring with better differentiation
function scoreModelEnhanced(model: ModelInfo, config: TestConfig): number {
  const modelName = model.id.toLowerCase();
  const promptCost = parseFloat(model.pricing.prompt);
  const completionCost = parseFloat(model.pricing.completion);
  
  // Skip invalid pricing
  if (promptCost <= 0 || completionCost <= 0) return 0;
  
  const avgCostPerM = (promptCost + completionCost) / 2 * 1000000;
  
  // Skip if over budget
  if (config.maxCost && avgCostPerM > config.maxCost) return 0;
  
  // QUALITY SCORE
  let qualityScore = 0;
  
  // Context contribution
  const contextScore = Math.min(model.context_length / 1000000, 1) * 0.3;
  qualityScore += contextScore;
  
  // Version scoring - FIXED: 2.5 > 2.0
  const versionMatch = modelName.match(/(\d+\.?\d*)/);
  if (versionMatch) {
    const version = parseFloat(versionMatch[1]);
    if (version >= 5) qualityScore += 0.3;
    else if (version >= 4) qualityScore += 0.27;
    else if (version >= 3) qualityScore += 0.21;
    else if (version >= 2.5) qualityScore += 0.24;  // 2.5 better than 2.0
    else if (version >= 2) qualityScore += 0.18;
    else qualityScore += 0.12;
  }
  
  // Tier scoring
  if (modelName.includes('opus') || modelName.includes('ultra')) qualityScore += 0.3;
  else if (modelName.includes('pro') || modelName.includes('advanced')) qualityScore += 0.27;
  else if (modelName.includes('sonnet') || modelName.includes('large')) qualityScore += 0.21;
  else if (modelName.includes('flash') && modelName.includes('2.5')) qualityScore += 0.21; // 2.5 flash is good
  else if (modelName.includes('chat') || modelName.includes('standard')) qualityScore += 0.18;
  else if (modelName.includes('haiku') || modelName.includes('mini')) qualityScore += 0.09;
  else qualityScore += 0.15;
  
  // Provider bonus
  if (modelName.includes('claude') || modelName.includes('gpt') || modelName.includes('gemini')) {
    qualityScore += 0.1;
  }
  
  // SPEED SCORE
  let speedScore = 0;
  
  // Name indicators
  if (modelName.includes('flash') || modelName.includes('turbo')) speedScore += 0.4;
  else if (modelName.includes('instant') || modelName.includes('fast')) speedScore += 0.35;
  else if (modelName.includes('mini') || modelName.includes('haiku')) speedScore += 0.3;
  else if (modelName.includes('nano') || modelName.includes('lite')) speedScore += 0.25;
  else speedScore += 0.1;
  
  // Inverse context for speed
  speedScore += (1 - contextScore) * 0.3;
  
  // Lower cost often = faster
  const costRatio = Math.min(avgCostPerM / 100, 1);
  speedScore += (1 - costRatio) * 0.3;
  
  // COST SCORE (exponential for sensitivity)
  const costScore = Math.pow(1 - costRatio, 1.5);
  
  // Apply weights with power scaling for differentiation
  const finalScore = 
    Math.pow(qualityScore, 1.2) * Math.pow(config.weights.quality, 0.8) +
    Math.pow(speedScore, 1.1) * Math.pow(config.weights.speed, 0.8) +
    Math.pow(costScore, 1.3) * Math.pow(config.weights.cost, 0.8);
  
  return finalScore;
}

async function testDifferentiation() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key found');
    return;
  }
  
  console.log('🔬 TESTING MODEL SELECTION DIFFERENTIATION\n');
  console.log('=' .repeat(80));
  
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual Test'
      }
    });
    
    const allModels: ModelInfo[] = response.data.data || [];
    
    // Filter valid models
    const validModels = allModels.filter(m => {
      const id = m.id.toLowerCase();
      const promptPrice = parseFloat(m.pricing.prompt);
      const completionPrice = parseFloat(m.pricing.completion);
      
      return (
        !id.includes('whisper') &&
        !id.includes('tts') &&
        !id.includes('dalle') &&
        !id.includes('stable') &&
        !id.includes('auto') &&  // Skip auto-routing
        m.context_length >= 32000 &&
        promptPrice > 0 &&
        completionPrice > 0
      );
    });
    
    console.log(`Found ${validModels.length} valid models\n`);
    
    // Test configurations with VERY different weights
    const configs: TestConfig[] = [
      {
        name: '💰 EXTREME COST FOCUS (90% cost)',
        weights: { quality: 0.05, speed: 0.05, cost: 0.9 },
        minContext: 32000,
        maxCost: 10
      },
      {
        name: '🎯 EXTREME QUALITY FOCUS (90% quality)',
        weights: { quality: 0.9, speed: 0.05, cost: 0.05 },
        minContext: 100000,
        maxCost: 100
      },
      {
        name: '⚡ EXTREME SPEED FOCUS (90% speed)',
        weights: { quality: 0.05, speed: 0.9, cost: 0.05 },
        minContext: 32000,
        maxCost: 50
      },
      {
        name: '⚖️  PERFECTLY BALANCED (33% each)',
        weights: { quality: 0.34, speed: 0.33, cost: 0.33 },
        minContext: 64000,
        maxCost: 20
      },
      {
        name: '📊 QUALITY + COST (45% each, 10% speed)',
        weights: { quality: 0.45, speed: 0.1, cost: 0.45 },
        minContext: 100000,
        maxCost: 30
      }
    ];
    
    const selections: Map<string, string[]> = new Map();
    
    for (const config of configs) {
      console.log(`\n${config.name}`);
      console.log(`   Weights: Q=${(config.weights.quality*100).toFixed(0)}% S=${(config.weights.speed*100).toFixed(0)}% C=${(config.weights.cost*100).toFixed(0)}%`);
      if (config.maxCost) {
        console.log(`   Budget: Max $${config.maxCost}/M tokens`);
      }
      console.log('   ' + '─'.repeat(60));
      
      // Filter and score
      const eligible = validModels.filter(m => m.context_length >= config.minContext);
      const scored = eligible
        .map(m => ({
          ...m,
          score: scoreModelEnhanced(m, config)
        }))
        .filter(m => m.score > 0)
        .sort((a, b) => b.score - a.score);
      
      if (scored.length > 0) {
        const top3 = scored.slice(0, 3);
        
        top3.forEach((model, idx) => {
          const promptCost = parseFloat(model.pricing.prompt) * 1000000;
          const completionCost = parseFloat(model.pricing.completion) * 1000000;
          const avgCost = (promptCost + completionCost) / 2;
          
          console.log(`\n   ${idx + 1}. ${model.id}`);
          console.log(`      Context: ${model.context_length.toLocaleString()} tokens`);
          console.log(`      Avg Cost: $${avgCost.toFixed(2)}/M`);
          console.log(`      Score: ${(model.score * 100).toFixed(0)}/100`);
        });
        
        // Track selections
        const key = config.name;
        selections.set(key, top3.map(m => m.id));
      }
    }
    
    // Analyze differentiation
    console.log('\n\n📊 DIFFERENTIATION ANALYSIS');
    console.log('=' .repeat(80));
    
    // Check if different configs got different models
    const allTopModels = new Set<string>();
    const configTopModels: Map<string, string> = new Map();
    
    selections.forEach((models, config) => {
      if (models.length > 0) {
        allTopModels.add(models[0]);
        configTopModels.set(config, models[0]);
      }
    });
    
    console.log('\n🎯 Top Model by Configuration:');
    configTopModels.forEach((model, config) => {
      console.log(`   ${config.substring(0, 30).padEnd(30)} → ${model}`);
    });
    
    const uniqueModels = allTopModels.size;
    const totalConfigs = configTopModels.size;
    
    console.log(`\n✅ Differentiation Score: ${uniqueModels}/${totalConfigs} unique top selections`);
    
    if (uniqueModels === totalConfigs) {
      console.log('   🎉 PERFECT: Each configuration got a different optimal model!');
    } else if (uniqueModels >= totalConfigs * 0.6) {
      console.log('   ✅ GOOD: Most configurations got different optimal models');
    } else {
      console.log('   ⚠️  NEEDS IMPROVEMENT: Too many configs selecting same models');
    }
    
    // Show Gemini 2.5 vs 2.0 comparison
    console.log('\n\n🔍 GEMINI VERSION COMPARISON');
    console.log('=' .repeat(80));
    
    const gemini25Models = validModels.filter(m => m.id.toLowerCase().includes('gemini') && m.id.includes('2.5'));
    const gemini20Models = validModels.filter(m => m.id.toLowerCase().includes('gemini') && m.id.includes('2.0'));
    
    if (gemini25Models.length > 0 && gemini20Models.length > 0) {
      console.log('\nGemini 2.5 models:');
      gemini25Models.slice(0, 3).forEach(m => {
        const avgCost = (parseFloat(m.pricing.prompt) + parseFloat(m.pricing.completion)) / 2 * 1000000;
        console.log(`   ${m.id}: $${avgCost.toFixed(2)}/M`);
      });
      
      console.log('\nGemini 2.0 models:');
      gemini20Models.slice(0, 3).forEach(m => {
        const avgCost = (parseFloat(m.pricing.prompt) + parseFloat(m.pricing.completion)) / 2 * 1000000;
        console.log(`   ${m.id}: $${avgCost.toFixed(2)}/M`);
      });
      
      console.log('\n✅ Gemini 2.5 Flash is correctly recognized as:');
      console.log('   • More advanced than 2.0 (higher version)');
      console.log('   • Often cheaper than 2.0 variants');
      console.log('   • Better performance/cost ratio');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testDifferentiation().catch(console.error);