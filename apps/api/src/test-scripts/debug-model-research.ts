#!/usr/bin/env ts-node

/**
 * Debug Model Research Script
 * 
 * This script:
 * 1. Fetches all models from OpenRouter
 * 2. Shows model age and scoring
 * 3. Performs parallel research with different scoring methods
 */

import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../../../.env.local') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

interface OpenRouterModel {
  id: string;
  name: string;
  created?: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  top_provider?: boolean;
  architecture?: {
    release_date?: string;
  };
}

/**
 * Calculate model age in months
 */
function getModelAge(model: OpenRouterModel): number {
  const now = new Date();
  
  // Check architecture release date first
  if (model.architecture?.release_date) {
    const releaseDate = new Date(model.architecture.release_date);
    return (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  }
  
  // Try to infer from model name
  const modelId = model.id.toLowerCase();
  
  // Known release dates
  const knownDates: Record<string, string> = {
    'gpt-4o': '2024-05-13',
    'gpt-4o-mini': '2024-07-18',
    'gpt-4.5': '2025-01-01', // Future model
    'gpt-4.1-nano': '2024-11-01',
    'claude-3.5-sonnet': '2024-06-20',
    'claude-3.5-haiku': '2024-10-22',
    'gemini-2.0': '2024-12-11',
    'gemini-2.5': '2025-01-01', // Future model
    'gemini-1.5': '2024-02-15', // Old!
    'deepseek-v3': '2024-12-26',
    'qwen-2.5': '2024-09-19',
    'llama-3.3': '2024-12-06',
    'llama-3.2': '2024-09-25',
  };
  
  // Check known dates
  for (const [key, date] of Object.entries(knownDates)) {
    if (modelId.includes(key)) {
      const releaseDate = new Date(date);
      return (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    }
  }
  
  // Default to 6 months if unknown
  return 6;
}

/**
 * Score model with age penalty
 */
function scoreModelWithAge(model: OpenRouterModel): {
  quality: number;
  cost: number;
  speed: number;
  ageScore: number;
  compositeScore: number;
} {
  const modelId = model.id.toLowerCase();
  const age = getModelAge(model);
  
  // Base quality scores
  let quality = 7.0;
  if (modelId.includes('gpt-4.5')) quality = 9.7;
  else if (modelId.includes('gpt-4.1-nano')) quality = 8.9;
  else if (modelId.includes('opus') || modelId.includes('claude-3.7')) quality = 9.5;
  else if (modelId.includes('gpt-4o') && !modelId.includes('mini')) quality = 8.8;
  else if (modelId.includes('claude-3.5')) quality = 8.9;
  else if (modelId.includes('gemini') && modelId.includes('2.5')) quality = 8.7;
  else if (modelId.includes('gemini') && modelId.includes('2.0')) quality = 8.5;
  else if (modelId.includes('deepseek-v3')) quality = 9.0;
  else if (modelId.includes('qwen-2.5')) quality = 8.6;
  else if (modelId.includes('llama-3.3')) quality = 8.4;
  else if (modelId.includes('gemini') && modelId.includes('1.5')) quality = 7.5; // Old model
  else if (modelId.includes('gpt-4o-mini')) quality = 7.9;
  
  // Speed scores
  let speed = 7.0;
  if (modelId.includes('flash') || modelId.includes('mini') || modelId.includes('nano')) speed = 9.0;
  else if (modelId.includes('sonnet')) speed = 7.5;
  else if (modelId.includes('opus')) speed = 5.0;
  else if (modelId.includes('turbo')) speed = 8.0;
  
  // Cost calculation
  const inputCost = parseFloat(model.pricing.prompt) * 1000000;
  const outputCost = parseFloat(model.pricing.completion) * 1000000;
  const avgCost = (inputCost + outputCost) / 2;
  const costScore = 10 - Math.min(avgCost / 2, 10);
  
  // Age penalty (0-3 months: no penalty, 3-6 months: small penalty, 6+ months: large penalty)
  let agePenalty = 0;
  if (age > 6) {
    agePenalty = 0.3; // 30% penalty for models older than 6 months
  } else if (age > 3) {
    agePenalty = 0.1; // 10% penalty for models 3-6 months old
  }
  
  const ageScore = 1 - agePenalty;
  
  // Composite score with age factor
  const compositeScore = (quality * 0.5 + costScore * 0.35 + speed * 0.15) * ageScore;
  
  return {
    quality,
    cost: costScore,
    speed,
    ageScore,
    compositeScore
  };
}

/**
 * Main debug function
 */
async function debugModelResearch() {
  console.log('🔍 Debug Model Research\n');
  console.log('================================================================================\n');
  
  if (!OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found in environment');
    return;
  }
  
  try {
    // Fetch models
    console.log('1️⃣  Fetching models from OpenRouter...');
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/codequal/debug',
        'X-Title': 'CodeQual Debug'
      }
    });
    
    const models = response.data.data as OpenRouterModel[];
    console.log(`   ✅ Found ${models.length} models\n`);
    
    // Filter relevant models
    const relevantModels = models.filter(m => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && 
             !id.includes('vision') && 
             m.pricing &&
             (parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0);
    });
    
    console.log(`2️⃣  Analyzing ${relevantModels.length} relevant models...\n`);
    
    // Score all models
    const scoredModels = relevantModels.map(model => {
      const scores = scoreModelWithAge(model);
      const age = getModelAge(model);
      return {
        ...model,
        ...scores,
        age,
        ageCategory: age <= 3 ? 'NEW' : age <= 6 ? 'RECENT' : 'OLD'
      };
    }).sort((a, b) => b.compositeScore - a.compositeScore);
    
    // Show top 20 models
    console.log('📊 Top 20 Models by Composite Score (with age penalty):\n');
    console.log('Rank | Model ID                              | Quality | Cost  | Speed | Age(mo) | Age Score | Composite');
    console.log('-----|---------------------------------------|---------|-------|-------|---------|-----------|----------');
    
    scoredModels.slice(0, 20).forEach((model, i) => {
      console.log(
        `${(i + 1).toString().padStart(4)} | ${model.id.padEnd(37)} | ${model.quality.toFixed(1).padStart(7)} | ${model.cost.toFixed(2).padStart(5)} | ${model.speed.toFixed(1).padStart(5)} | ${model.age.toFixed(1).padStart(7)} | ${model.ageScore.toFixed(2).padStart(9)} | ${model.compositeScore.toFixed(2).padStart(8)}`
      );
    });
    
    // Show models by age category
    console.log('\n\n📅 Models by Age Category:\n');
    
    const newModels = scoredModels.filter(m => m.ageCategory === 'NEW');
    const recentModels = scoredModels.filter(m => m.ageCategory === 'RECENT');
    const oldModels = scoredModels.filter(m => m.ageCategory === 'OLD');
    
    console.log(`✨ NEW (0-3 months): ${newModels.length} models`);
    newModels.slice(0, 5).forEach(m => {
      console.log(`   - ${m.id} (${m.age.toFixed(1)} months, score: ${m.compositeScore.toFixed(2)})`);
    });
    
    console.log(`\n🔄 RECENT (3-6 months): ${recentModels.length} models`);
    recentModels.slice(0, 5).forEach(m => {
      console.log(`   - ${m.id} (${m.age.toFixed(1)} months, score: ${m.compositeScore.toFixed(2)})`);
    });
    
    console.log(`\n⚠️  OLD (6+ months): ${oldModels.length} models`);
    oldModels.slice(0, 5).forEach(m => {
      console.log(`   - ${m.id} (${m.age.toFixed(1)} months, score: ${m.compositeScore.toFixed(2)})`);
    });
    
    // Check for specific models
    console.log('\n\n🔎 Checking for specific models:\n');
    const checkModels = ['gpt-4.1-nano', 'gpt-4o', 'claude-3.5-sonnet', 'gemini-2.0-flash', 'gemini-1.5', 'deepseek-v3'];
    
    checkModels.forEach(searchTerm => {
      const found = scoredModels.find(m => m.id.toLowerCase().includes(searchTerm));
      if (found) {
        console.log(`✓ ${searchTerm}: Found as "${found.id}" - Age: ${found.age.toFixed(1)}mo, Score: ${found.compositeScore.toFixed(2)}`);
      } else {
        console.log(`✗ ${searchTerm}: Not found`);
      }
    });
    
    // Role-specific recommendations
    console.log('\n\n🎯 Role-Specific Recommendations (Top 3 per role):\n');
    
    const roles = {
      deepwiki: { quality: 0.50, cost: 0.30, speed: 0.20 },
      researcher: { quality: 0.50, cost: 0.35, speed: 0.15 },
      security: { quality: 0.60, cost: 0.20, speed: 0.20 }
    };
    
    for (const [role, weights] of Object.entries(roles)) {
      console.log(`\n${role.toUpperCase()}:`);
      
      const roleScored = scoredModels.map(m => ({
        ...m,
        roleScore: (m.quality * weights.quality + m.cost * weights.cost + m.speed * weights.speed) * m.ageScore
      })).sort((a, b) => b.roleScore - a.roleScore);
      
      roleScored.slice(0, 3).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.id} - Score: ${m.roleScore.toFixed(2)} (Age: ${m.age.toFixed(1)}mo)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run debug
debugModelResearch();