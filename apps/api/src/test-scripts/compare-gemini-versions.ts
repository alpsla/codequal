/**
 * Detailed comparison of Gemini 2.0 vs 2.5 for Researcher role
 */

import * as fs from 'fs/promises';
import { join } from 'path';

async function compareGeminiVersions() {
  console.log('================================================================================');
  console.log('📊 GEMINI 2.0 vs 2.5 DETAILED COMPARISON FOR RESEARCHER');
  console.log('================================================================================\n');
  
  // Load the verification results
  const results = JSON.parse(
    await fs.readFile(join(__dirname, 'gemini-verification-results.json'), 'utf-8')
  );
  
  // Extract relevant models
  const gemini20FlashLite = results.flashModels.find((m: any) => m.id === 'google/gemini-2.0-flash-lite-001');
  const gemini25FlashLite = results.flashModels.find((m: any) => m.id === 'google/gemini-2.5-flash-lite-preview-06-17');
  const gemini25Flash = results.flashModels.find((m: any) => m.id === 'google/gemini-2.5-flash');
  
  console.log('🔍 MODELS UNDER COMPARISON:\n');
  console.log('1. google/gemini-2.0-flash-lite-001 (Current Selection)');
  console.log('2. google/gemini-2.5-flash-lite-preview-06-17 (New Lite Version)');
  console.log('3. google/gemini-2.5-flash (Full Version)\n');
  
  // Cost comparison
  console.log('💰 COST COMPARISON:\n');
  console.log('Model                                    | Input $/M | Output $/M | Avg $/M');
  console.log('----------------------------------------------------------------------');
  console.log(`Gemini 2.0 Flash Lite                   | $${gemini20FlashLite.inputCost.toFixed(4)} | $${gemini20FlashLite.outputCost.toFixed(4)} | $${gemini20FlashLite.avgCost.toFixed(4)}`);
  console.log(`Gemini 2.5 Flash Lite Preview           | $${gemini25FlashLite.inputCost.toFixed(4)} | $${gemini25FlashLite.outputCost.toFixed(4)} | $${gemini25FlashLite.avgCost.toFixed(4)}`);
  console.log(`Gemini 2.5 Flash                        | $${gemini25Flash.inputCost.toFixed(4)} | $${gemini25Flash.outputCost.toFixed(4)} | $${gemini25Flash.avgCost.toFixed(4)}`);
  
  // Calculate differences
  const costDiff25Lite = ((gemini25FlashLite.avgCost - gemini20FlashLite.avgCost) / gemini20FlashLite.avgCost * 100);
  const costDiff25Full = ((gemini25Flash.avgCost - gemini20FlashLite.avgCost) / gemini20FlashLite.avgCost * 100);
  
  console.log('\nCost Analysis:');
  console.log(`- Gemini 2.5 Flash Lite is ${costDiff25Lite.toFixed(1)}% ${costDiff25Lite > 0 ? 'more expensive' : 'cheaper'} than 2.0 Flash Lite`);
  console.log(`- Gemini 2.5 Flash is ${costDiff25Full.toFixed(1)}% more expensive than 2.0 Flash Lite`);
  
  // Features comparison
  console.log('\n\n🚀 FEATURES & CAPABILITIES:\n');
  console.log('Context Window:');
  console.log(`- All models: ${gemini20FlashLite.contextWindow.toLocaleString()} tokens (1M+)`);
  
  console.log('\nRelease Dates:');
  console.log(`- Gemini 2.0 Flash Lite: ${new Date(gemini20FlashLite.created).toLocaleDateString()} (Production)`);
  console.log(`- Gemini 2.5 Flash Lite: ${new Date(gemini25FlashLite.created).toLocaleDateString()} (Preview)`);
  console.log(`- Gemini 2.5 Flash: ${new Date(gemini25Flash.created).toLocaleDateString()} (Production)`);
  
  // Quality estimation based on version and preview status
  console.log('\n\n📈 QUALITY ESTIMATION:\n');
  console.log('Based on version numbers and release status:');
  console.log('- Gemini 2.0 Flash Lite: 8.5/10 (Production, proven)');
  console.log('- Gemini 2.5 Flash Lite: 8.7/10 (Newer, but preview)');
  console.log('- Gemini 2.5 Flash: 9.0/10 (Latest full version)');
  
  // Use case analysis for Researcher
  console.log('\n\n🎯 RESEARCHER AGENT USE CASE ANALYSIS:\n');
  console.log('Requirements:');
  console.log('- Task: Discover and evaluate AI models');
  console.log('- Priority: Cost efficiency (40%), Quality (40%), Speed (20%)');
  console.log('- Usage: ~3M tokens/day for continuous research');
  console.log('- Needs: Fast responses, good reasoning, cost control\n');
  
  // Monthly cost projection
  const monthlyTokens = 3_000_000 * 30; // 3M tokens per day
  const monthlyCost20 = (monthlyTokens / 1_000_000) * gemini20FlashLite.avgCost;
  const monthlyCost25Lite = (monthlyTokens / 1_000_000) * gemini25FlashLite.avgCost;
  const monthlyCost25Full = (monthlyTokens / 1_000_000) * gemini25Flash.avgCost;
  
  console.log('📊 MONTHLY COST PROJECTION (90M tokens):');
  console.log(`- Gemini 2.0 Flash Lite: $${monthlyCost20.toFixed(2)}/month`);
  console.log(`- Gemini 2.5 Flash Lite: $${monthlyCost25Lite.toFixed(2)}/month (+$${(monthlyCost25Lite - monthlyCost20).toFixed(2)})`);
  console.log(`- Gemini 2.5 Flash: $${monthlyCost25Full.toFixed(2)}/month (+$${(monthlyCost25Full - monthlyCost20).toFixed(2)})`);
  
  // Scoring for Researcher use case
  console.log('\n\n🏆 SCORING FOR RESEARCHER ROLE:\n');
  
  // Gemini 2.0 Flash Lite
  const score20 = {
    quality: 8.5,
    costScore: 10 - (gemini20FlashLite.avgCost / 10), // Lower cost = higher score
    speed: 9.5, // Flash Lite is optimized for speed
    composite: 0
  };
  score20.composite = score20.quality * 0.4 + score20.costScore * 0.4 + score20.speed * 0.2;
  
  // Gemini 2.5 Flash Lite Preview
  const score25Lite = {
    quality: 8.7, // Slightly better but preview
    costScore: 10 - (gemini25FlashLite.avgCost / 10),
    speed: 9.5,
    composite: 0
  };
  score25Lite.composite = score25Lite.quality * 0.4 + score25Lite.costScore * 0.4 + score25Lite.speed * 0.2;
  
  // Gemini 2.5 Flash
  const score25Full = {
    quality: 9.0,
    costScore: 10 - (gemini25Flash.avgCost / 10),
    speed: 9.0, // Slightly slower than Lite
    composite: 0
  };
  score25Full.composite = score25Full.quality * 0.4 + score25Full.costScore * 0.4 + score25Full.speed * 0.2;
  
  console.log('Composite Scores (weighted for Researcher role):');
  console.log(`1. Gemini 2.0 Flash Lite: ${score20.composite.toFixed(2)}`);
  console.log(`   - Quality: ${score20.quality.toFixed(1)} × 40% = ${(score20.quality * 0.4).toFixed(2)}`);
  console.log(`   - Cost: ${score20.costScore.toFixed(1)} × 40% = ${(score20.costScore * 0.4).toFixed(2)}`);
  console.log(`   - Speed: ${score20.speed.toFixed(1)} × 20% = ${(score20.speed * 0.2).toFixed(2)}`);
  
  console.log(`\n2. Gemini 2.5 Flash Lite Preview: ${score25Lite.composite.toFixed(2)}`);
  console.log(`   - Quality: ${score25Lite.quality.toFixed(1)} × 40% = ${(score25Lite.quality * 0.4).toFixed(2)}`);
  console.log(`   - Cost: ${score25Lite.costScore.toFixed(1)} × 40% = ${(score25Lite.costScore * 0.4).toFixed(2)}`);
  console.log(`   - Speed: ${score25Lite.speed.toFixed(1)} × 20% = ${(score25Lite.speed * 0.2).toFixed(2)}`);
  
  console.log(`\n3. Gemini 2.5 Flash: ${score25Full.composite.toFixed(2)}`);
  console.log(`   - Quality: ${score25Full.quality.toFixed(1)} × 40% = ${(score25Full.quality * 0.4).toFixed(2)}`);
  console.log(`   - Cost: ${score25Full.costScore.toFixed(1)} × 40% = ${(score25Full.costScore * 0.4).toFixed(2)}`);
  console.log(`   - Speed: ${score25Full.speed.toFixed(1)} × 20% = ${(score25Full.speed * 0.2).toFixed(2)}`);
  
  // Final recommendation
  console.log('\n\n📋 FINAL RECOMMENDATION:\n');
  
  const winner = [
    { name: 'Gemini 2.0 Flash Lite', score: score20.composite },
    { name: 'Gemini 2.5 Flash Lite Preview', score: score25Lite.composite },
    { name: 'Gemini 2.5 Flash', score: score25Full.composite }
  ].sort((a, b) => b.score - a.score)[0];
  
  console.log(`🏆 WINNER: ${winner.name} (Score: ${winner.score.toFixed(2)})`);
  
  if (winner.name === 'Gemini 2.0 Flash Lite') {
    console.log('\n✅ The original selection of Gemini 2.0 Flash Lite is CORRECT');
    console.log('\nReasons:');
    console.log('- Lowest cost ($0.1875/M vs $0.25/M for 2.5 Lite)');
    console.log('- Production-ready (not preview)');
    console.log('- Excellent speed (optimized for fast inference)');
    console.log('- Sufficient quality for model research tasks');
    console.log(`- Saves $${(monthlyCost25Lite - monthlyCost20).toFixed(2)}/month vs 2.5 Lite`);
  } else {
    console.log('\n⚠️  Consider updating to: ' + winner.name);
    console.log('\nReasons:');
    if (winner.name.includes('2.5')) {
      console.log('- Improved model capabilities');
      console.log('- Better reasoning for complex research');
    }
  }
  
  console.log('\n\n💡 ADDITIONAL INSIGHTS:\n');
  console.log('1. Gemini 2.5 Flash Lite is still in "preview" status');
  console.log('2. The 33% cost increase may not justify the quality improvement for research tasks');
  console.log('3. For production use, stable models (2.0) are preferred over preview versions');
  console.log('4. All models have the same 1M+ context window, so no differentiation there');
  
  // Save comparison
  const comparison = {
    timestamp: new Date().toISOString(),
    models: {
      gemini20FlashLite,
      gemini25FlashLite,
      gemini25Flash
    },
    scores: {
      gemini20FlashLite: score20,
      gemini25FlashLite: score25Lite,
      gemini25Flash: score25Full
    },
    monthlyProjections: {
      gemini20FlashLite: monthlyCost20,
      gemini25FlashLite: monthlyCost25Lite,
      gemini25Flash: monthlyCost25Full
    },
    recommendation: winner.name,
    verdict: winner.name === 'Gemini 2.0 Flash Lite' ? 
      'Original selection is correct' : 
      `Update to ${winner.name}`
  };
  
  await fs.writeFile(
    join(__dirname, 'gemini-comparison-results.json'),
    JSON.stringify(comparison, null, 2)
  );
  
  console.log('\n✅ Detailed comparison saved to gemini-comparison-results.json');
}

compareGeminiVersions().catch(console.error);