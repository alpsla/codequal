#!/usr/bin/env ts-node

/**
 * Test DeepWiki Model Selection with Real OpenRouter API
 * Shows actual models selected for different scenarios
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface ModelInfo {
  id: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

// Scoring function (simplified version of TrulyDynamicSelector)
function scoreModel(model: ModelInfo, weights: { quality: number; speed: number; cost: number }) {
  const contextScore = Math.min(model.context_length / 1000000, 1); // Normalize to 0-1
  const avgCost = (parseFloat(model.pricing.prompt) + parseFloat(model.pricing.completion)) / 2;
  const costScore = 1 - Math.min(avgCost / 100, 1); // Inverse cost score
  
  // Quality indicators from name
  const name = model.id.toLowerCase();
  let qualityBonus = 0.5;
  if (name.includes('opus') || name.includes('pro')) qualityBonus += 0.3;
  if (name.includes('4.1') || name.includes('5') || name.includes('2.5')) qualityBonus += 0.2;
  
  // Speed indicators
  let speedBonus = 0.5;
  if (name.includes('flash') || name.includes('turbo') || name.includes('mini')) speedBonus += 0.3;
  if (name.includes('haiku') || name.includes('nano')) speedBonus += 0.2;
  
  const qualityScore = contextScore * 0.5 + qualityBonus * 0.5;
  const speedScore = speedBonus;
  
  return qualityScore * weights.quality + speedScore * weights.speed + costScore * weights.cost;
}

async function testRealAPI() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENROUTER_API_KEY not found');
    return;
  }
  
  console.log('🔍 Fetching REAL models from OpenRouter API...\n');
  
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual DeepWiki Test'
      }
    });
    
    const allModels: ModelInfo[] = response.data.data || [];
    console.log(`✅ Found ${allModels.length} models in OpenRouter\n`);
    
    // Filter out non-text models
    const textModels = allModels.filter(m => 
      !m.id.includes('whisper') && 
      !m.id.includes('tts') && 
      !m.id.includes('dalle') &&
      !m.id.includes('stable-diffusion') &&
      m.context_length >= 32000
    );
    
    // Test configurations
    const configs = [
      {
        name: '1️⃣  Small TypeScript Project (Cost-conscious)',
        weights: { quality: 0.3, speed: 0.2, cost: 0.5 },
        minContext: 32000,
        maxCost: 10
      },
      {
        name: '2️⃣  Medium Python ML Project (Balanced)',
        weights: { quality: 0.5, speed: 0.2, cost: 0.3 },
        minContext: 100000,
        maxCost: 30
      },
      {
        name: '3️⃣  Large Java Enterprise (Quality-focused)',
        weights: { quality: 0.7, speed: 0.1, cost: 0.2 },
        minContext: 200000,
        maxCost: 100
      },
      {
        name: '4️⃣  Microservices Go/Rust (Speed-focused)',
        weights: { quality: 0.4, speed: 0.4, cost: 0.2 },
        minContext: 128000,
        maxCost: 20
      },
      {
        name: '5️⃣  Enterprise C++ System (Maximum quality)',
        weights: { quality: 0.8, speed: 0.05, cost: 0.15 },
        minContext: 500000,
        maxCost: 200
      }
    ];
    
    console.log('📊 DEEPWIKI MODEL SELECTION RESULTS');
    console.log('=' .repeat(80));
    
    for (const config of configs) {
      console.log(`\n${config.name}`);
      console.log('─'.repeat(70));
      
      // Filter by requirements
      const eligible = textModels.filter(m => {
        const avgCost = (parseFloat(m.pricing.prompt) + parseFloat(m.pricing.completion)) / 2;
        return m.context_length >= config.minContext && avgCost <= config.maxCost;
      });
      
      // Score and sort
      const scored = eligible.map(m => ({
        ...m,
        score: scoreModel(m, config.weights)
      })).sort((a, b) => b.score - a.score);
      
      if (scored.length >= 2) {
        const primary = scored[0];
        const fallback = scored.find(m => m.id.split('/')[0] !== primary.id.split('/')[0]) || scored[1];
        
        console.log(`  PRIMARY: ${primary.id}`);
        console.log(`    Context: ${primary.context_length.toLocaleString()} tokens`);
        console.log(`    Cost: $${primary.pricing.prompt}/$${primary.pricing.completion} per M`);
        console.log(`    Score: ${(primary.score * 100).toFixed(0)}/100`);
        
        console.log(`  FALLBACK: ${fallback.id}`);
        console.log(`    Context: ${fallback.context_length.toLocaleString()} tokens`);
        console.log(`    Cost: $${fallback.pricing.prompt}/$${fallback.pricing.completion} per M`);
        console.log(`    Score: ${(fallback.score * 100).toFixed(0)}/100`);
      } else {
        console.log('  ❌ Not enough eligible models');
      }
    }
    
    // Show what models are actually available
    console.log('\n\n🏆 TOP AVAILABLE MODELS BY CONTEXT SIZE');
    console.log('=' .repeat(80));
    
    const topByContext = [...textModels]
      .sort((a, b) => b.context_length - a.context_length)
      .slice(0, 10);
    
    for (const model of topByContext) {
      const avgCost = (parseFloat(model.pricing.prompt) + parseFloat(model.pricing.completion)) / 2;
      console.log(`${model.id.padEnd(50)} ${model.context_length.toLocaleString().padStart(10)} tokens  $${avgCost.toFixed(2)}/M`);
    }
    
  } catch (error: any) {
    console.error('Failed to fetch models:', error.message);
  }
}

testRealAPI().then(() => {
  console.log('\n✅ Test completed');
}).catch(console.error);