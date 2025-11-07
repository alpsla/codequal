#!/usr/bin/env npx ts-node

/**
 * Compare Gemini 2.5 Flash vs Qwen3 Coder
 * 
 * Fetch actual data from OpenRouter and compare for our use case:
 * - Coding task performance
 * - Cost per token
 * - Speed/latency
 * - Context window
 * - Reliability
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

async function fetchModelData(modelId: string): Promise<any> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data: any = await response.json();
    const model = data.data.find((m: any) => m.id === modelId);
    return model;
  } catch (error) {
    console.error(`Error fetching ${modelId}:`, error);
    return null;
  }
}

async function compareModels() {
  console.log('\n📊 GEMINI 2.5 FLASH vs QWEN3 CODER COMPARISON');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Models to compare
  const gemini = await fetchModelData('google/gemini-2.5-flash-preview-09-2025');
  const geminiStable = await fetchModelData('google/gemini-2.5-flash');
  const qwen = await fetchModelData('qwen/qwen3-coder-30b-a3b-instruct');
  const qwenMax = await fetchModelData('qwen/qwen3-max');
  const deepseek = await fetchModelData('deepseek/deepseek-chat-v3.1');
  const minimax = await fetchModelData('minimax/minimax-m2'); // Check today's pricing
  
  const models = [
    { name: 'Qwen3 Coder 30B', data: qwen, id: 'qwen/qwen3-coder-30b-a3b-instruct' },
    { name: 'Gemini 2.5 Flash (Preview)', data: gemini, id: 'google/gemini-2.5-flash-preview-09-2025' },
    { name: 'Gemini 2.5 Flash (Stable)', data: geminiStable, id: 'google/gemini-2.5-flash' },
    { name: 'DeepSeek Chat v3.1', data: deepseek, id: 'deepseek/deepseek-chat-v3.1' },
    { name: 'Qwen3 Max', data: qwenMax, id: 'qwen/qwen3-max' },
    { name: 'MiniMax M2 (Today)', data: minimax, id: 'minimax/minimax-m2' }
  ];
  
  console.log('MODEL COMPARISON TABLE:\n');
  console.log('─'.repeat(100));
  console.log('Model                          | Input $/1M | Output $/1M | Context | Speed Hint | Created');
  console.log('─'.repeat(100));
  
  for (const model of models) {
    if (!model.data) {
      console.log(`${model.name.padEnd(30)} | NOT FOUND`);
      continue;
    }
    
    const inputPrice = model.data.pricing?.prompt || 0;
    const outputPrice = model.data.pricing?.completion || 0;
    const context = model.data.context_length || 0;
    const created = model.data.created ? new Date(model.data.created * 1000).toISOString().split('T')[0] : 'Unknown';
    
    // Speed hints from model name
    const speedHint = 
      model.data.id.includes('flash') ? 'Fast ⚡' :
      model.data.id.includes('lite') ? 'Very Fast ⚡⚡' :
      model.data.id.includes('turbo') ? 'Fast ⚡' :
      'Standard';
    
    console.log(
      `${model.name.padEnd(30)} | ` +
      `$${(inputPrice * 1000000).toFixed(4).padStart(6)} | ` +
      `$${(outputPrice * 1000000).toFixed(4).padStart(7)} | ` +
      `${context.toLocaleString().padStart(7)} | ` +
      `${speedHint.padEnd(10)} | ` +
      `${created}`
    );
  }
  
  console.log('─'.repeat(100));
  
  // Calculate cost for typical analysis
  console.log('\n💰 COST PROJECTION (1,000 AI calls per analysis):');
  console.log('─'.repeat(80));
  console.log('Assumptions: 500 input tokens + 300 output tokens per call\n');
  
  for (const model of models) {
    if (!model.data) continue;
    
    const inputPrice = model.data.pricing?.prompt || 0;
    const outputPrice = model.data.pricing?.completion || 0;
    
    const inputCost = 500 * inputPrice;
    const outputCost = 300 * outputPrice;
    const costPerCall = inputCost + outputCost;
    const costPer1000Calls = costPerCall * 1000;
    
    console.log(`${model.name}:`);
    console.log(`  Cost per call: $${costPerCall.toFixed(6)}`);
    console.log(`  Cost per analysis (1,000 calls): $${costPer1000Calls.toFixed(4)}`);
    console.log('');
  }
  
  // Scoring with our weights
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎯 SCORING WITH UPDATED WEIGHTS (30% Quality, 50% Cost, 15% Speed):');
  console.log('   Rationale: Analysis is ASYNC → Cost matters most, Speed less critical');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // UPDATED WEIGHTS: Cost is KING, Speed less important (async analysis)
  const weights = { quality: 0.30, speed: 0.15, cost: 0.50, freshness: 0.05 };
  
  const scores = models.map(model => {
    if (!model.data) return { name: model.name, score: 0 };
    
    // Quality (context length + tier)
    let qualityScore = 50;
    if (model.data.context_length >= 128000) qualityScore += 25;
    else if (model.data.context_length >= 64000) qualityScore += 15;
    else if (model.data.context_length >= 32000) qualityScore += 10;
    if (model.data.id.includes('coder') || model.data.id.includes('code')) qualityScore += 15; // Coding specialization
    qualityScore = Math.min(100, qualityScore);
    
    // Speed (flash/lite models faster)
    let speedScore = 50;
    if (model.data.id.includes('lite')) speedScore += 30;
    else if (model.data.id.includes('flash')) speedScore += 25;
    else if (model.data.id.includes('turbo')) speedScore += 15;
    if (model.data.context_length <= 32000) speedScore += 10; // Smaller context = faster
    speedScore = Math.min(100, speedScore);
    
    // Cost (ultra-cheap models score highest)
    const inputPrice = model.data.pricing?.prompt || 0;
    let costScore = 50;
    if (inputPrice === 0) costScore = 85; // Free = 85 (not 100, may have limits)
    else if (inputPrice < 0.0000001) costScore = 100; // Ultra cheap (< $0.10/1M) - BEST!
    else if (inputPrice < 0.0000005) costScore = 95;  // Very cheap (< $0.50/1M)
    else if (inputPrice < 0.000001) costScore = 85;   // Cheap (< $1/1M)
    else if (inputPrice < 0.000005) costScore = 60;   // Moderate
    
    // Freshness
    let freshnessScore = 0;
    if (model.data.created) {
      const ageInDays = (Date.now() - (model.data.created * 1000)) / (1000 * 60 * 60 * 24);
      if (ageInDays <= 30) freshnessScore = 100;
      else if (ageInDays <= 60) freshnessScore = 90;
      else if (ageInDays <= 90) freshnessScore = 80;
      else if (ageInDays <= 120) freshnessScore = 60;
    }
    
    const totalScore = 
      (qualityScore * weights.quality) +
      (speedScore * weights.speed) +
      (costScore * weights.cost) +
      (freshnessScore * weights.freshness);
    
    return {
      name: model.name,
      qualityScore,
      speedScore,
      costScore,
      freshnessScore,
      totalScore
    };
  });
  
  scores.sort((a, b) => b.totalScore - a.totalScore);
  
  console.log('Rank | Model                          | Quality | Speed | Cost | Fresh | TOTAL');
  console.log('─'.repeat(90));
  
  scores.forEach((s, idx) => {
    console.log(
      `${(idx + 1).toString().padStart(4)} | ` +
      `${s.name.padEnd(30)} | ` +
      `${s.qualityScore.toFixed(0).padStart(7)} | ` +
      `${s.speedScore.toFixed(0).padStart(5)} | ` +
      `${s.costScore.toFixed(0).padStart(4)} | ` +
      `${s.freshnessScore.toFixed(0).padStart(5)} | ` +
      `${s.totalScore.toFixed(1).padStart(5)}`
    );
  });
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📋 RECOMMENDATION:');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const winner = scores[0];
  console.log(`🥇 Winner: ${winner.name}`);
  console.log(`   Score: ${winner.totalScore.toFixed(1)}/100`);
  console.log(`   Strengths: ${winner.costScore >= 85 ? 'Ultra-cheap' : 'Affordable'}, ${winner.speedScore >= 70 ? 'Very Fast' : 'Fast'}`);
  
  if (winner.name.includes('Qwen')) {
    console.log(`\n✅ Qwen is optimal - coding-specialized and cost-effective`);
  } else if (winner.name.includes('Gemini')) {
    console.log(`\n✅ Gemini is optimal - balanced speed/cost/quality`);
  } else if (winner.name.includes('DeepSeek')) {
    console.log(`\n✅ DeepSeek is optimal - high quality at low cost`);
  }
  
  console.log('\n');
}

compareModels().catch(console.error);

