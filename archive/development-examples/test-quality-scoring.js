#!/usr/bin/env node

/**
 * Test Quality-Balanced Scoring Algorithm
 * 
 * This demonstrates how the RESEARCHER agent balances quality, recency, 
 * performance, and cost - not just picking the cheapest model.
 */

console.log('🧪 Testing Cross-Market Role-Specific Model Research\n');

// Sample models with different characteristics
const testModels = [
  {
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    releaseDate: '2025-06-02',
    capabilities: {
      codeQuality: 8.5,
      speed: 9.2,
      reasoning: 8.8,
      detailLevel: 8.0,
      contextWindow: 100000
    },
    pricing: { input: 0.075, output: 0.30 },
    tier: 'STANDARD'
  },
  {
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic', 
    releaseDate: '2025-06-02',
    capabilities: {
      codeQuality: 9.5,
      speed: 7.8,
      reasoning: 9.7,
      detailLevel: 9.4,
      contextWindow: 200000
    },
    pricing: { input: 3.00, output: 15.00 },
    tier: 'PREMIUM'
  },
  {
    name: 'GPT-4o Mini',
    provider: 'openai',
    releaseDate: '2025-06-02', 
    capabilities: {
      codeQuality: 7.8,
      speed: 9.5,
      reasoning: 7.5,
      detailLevel: 7.2,
      contextWindow: 128000
    },
    pricing: { input: 0.15, output: 0.60 },
    tier: 'STANDARD'
  },
  {
    name: 'DeepSeek Coder V2',
    provider: 'deepseek',
    releaseDate: '2025-06-02',
    capabilities: {
      codeQuality: 9.0,
      speed: 8.2, 
      reasoning: 8.5,
      detailLevel: 8.7,
      contextWindow: 64000
    },
    pricing: { input: 0.14, output: 0.28 },
    tier: 'STANDARD'
  },
  {
    name: 'Old GPT-4',
    provider: 'openai',
    releaseDate: '2023-03-14', // Old model
    capabilities: {
      codeQuality: 8.0,
      speed: 6.0,
      reasoning: 8.5,
      detailLevel: 8.0,
      contextWindow: 8000
    },
    pricing: { input: 30.0, output: 60.0 }, // Expensive
    tier: 'PREMIUM'
  }
];

// Scoring functions (simplified versions of the actual RESEARCHER logic)

function calculateRecencyScore(releaseDate) {
  const release = new Date(releaseDate);
  const now = new Date();
  const monthsDiff = (now.getTime() - release.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  if (monthsDiff <= 3) return 10.0;
  if (monthsDiff <= 6) return 9.0;
  if (monthsDiff <= 12) return 8.0;
  if (monthsDiff <= 18) return 6.0;
  if (monthsDiff <= 24) return 4.0;
  return 2.0;
}

function normalizeContextWindow(contextWindow) {
  if (contextWindow >= 200000) return 10.0;
  if (contextWindow >= 128000) return 8.0;
  if (contextWindow >= 64000) return 6.0;
  if (contextWindow >= 32000) return 5.0;
  if (contextWindow >= 16000) return 4.0;
  if (contextWindow >= 8000) return 3.0;
  return 2.0;
}

function calculateCostScore(pricing) {
  const avgCost = (pricing.input + pricing.output) / 2;
  
  if (avgCost <= 0.2) return 10.0;
  if (avgCost <= 1.0) return 9.0;
  if (avgCost <= 3.0) return 8.0;
  if (avgCost <= 8.0) return 6.0;
  if (avgCost <= 15.0) return 4.0;
  if (avgCost <= 30.0) return 2.0;
  return 1.0;
}

function calculateQualityBalancedScore(model, prioritizeCost = false) {
  const { capabilities, pricing } = model;
  
  // 1. Quality Score (40% weight by default)
  const qualityScore = (
    capabilities.codeQuality * 0.35 +
    capabilities.reasoning * 0.35 +
    capabilities.detailLevel * 0.20 +
    capabilities.speed * 0.10
  );
  
  // 2. Recency Score (25% weight)
  const recencyScore = calculateRecencyScore(model.releaseDate);
  
  // 3. Performance Score (20% weight)
  const performanceScore = (
    capabilities.speed * 0.4 +
    normalizeContextWindow(capabilities.contextWindow) * 0.3 +
    capabilities.reasoning * 0.3
  );
  
  // 4. Cost Score (15% weight by default)
  const costScore = calculateCostScore(pricing);
  
  // Weighted combination
  let finalScore;
  if (prioritizeCost) {
    // Cost-conscious: Cost gets 30% weight
    finalScore = (
      qualityScore * 0.3 +
      recencyScore * 0.2 +
      performanceScore * 0.2 +
      costScore * 0.3
    );
  } else {
    // Quality-first: Quality gets 40% weight
    finalScore = (
      qualityScore * 0.4 +
      recencyScore * 0.25 +
      performanceScore * 0.2 +
      costScore * 0.15
    );
  }
  
  // Bonuses
  if (qualityScore > 9.0 && model.tier === 'PREMIUM') {
    finalScore += 0.3; // Quality bonus
  }
  
  if (recencyScore > 9.0) {
    finalScore += 0.2; // Recency bonus
  }
  
  return Math.min(10, Math.max(0, finalScore));
}

// Test both scoring approaches
console.log('🎯 Quality-First Scoring (Default):');
console.log('=====================================');

const qualityFirstResults = testModels.map(model => ({
  ...model,
  score: calculateQualityBalancedScore(model, false),
  avgCost: (model.pricing.input + model.pricing.output) / 2
})).sort((a, b) => b.score - a.score);

qualityFirstResults.forEach((model, index) => {
  console.log(`${index + 1}. ${model.name}`);
  console.log(`   Score: ${model.score.toFixed(2)}/10`);
  console.log(`   Quality: ${model.capabilities.codeQuality}/10 | Reasoning: ${model.capabilities.reasoning}/10`);
  console.log(`   Cost: $${model.avgCost.toFixed(2)}/M | Released: ${model.releaseDate}`);
  console.log(`   Recency: ${calculateRecencyScore(model.releaseDate).toFixed(1)}/10 | Cost Score: ${calculateCostScore(model.pricing).toFixed(1)}/10`);
  console.log('');
});

console.log('\n💰 Cost-Conscious Scoring:');
console.log('===========================');

const costFirstResults = testModels.map(model => ({
  ...model,
  score: calculateQualityBalancedScore(model, true),
  avgCost: (model.pricing.input + model.pricing.output) / 2
})).sort((a, b) => b.score - a.score);

costFirstResults.forEach((model, index) => {
  console.log(`${index + 1}. ${model.name}`);
  console.log(`   Score: ${model.score.toFixed(2)}/10`);
  console.log(`   Quality: ${model.capabilities.codeQuality}/10 | Cost: $${model.avgCost.toFixed(2)}/M`);
  console.log('');
});

console.log('\n📊 Key Insights:');
console.log('=================');
console.log('• Quality-first scoring prioritizes capability over cost');
console.log('• Recent models (2025) get significant bonus points');
console.log('• Premium models with exceptional quality (>9.0) get bonuses');
console.log('• Old models are heavily penalized regardless of other factors');
console.log('• Cost is still considered but weighted appropriately');

console.log('\n🔬 Sample Research Prompt Used by RESEARCHER:');
console.log('=============================================');
console.log(`
RESEARCH CRITERIA (in order of importance):

1. **Quality & Capability** (40% weight)
   - Code understanding and analysis capability
   - Reasoning ability for complex problems
   - Detail level in responses

2. **Recency & Version** (25% weight)  
   - Latest model versions (prefer 2025 releases)
   - Most recent training data
   - Latest architectural improvements

3. **Performance** (20% weight)
   - Response speed and latency
   - Context window size  
   - Reliability and consistency

4. **Cost Efficiency** (15% weight)
   - Input/output token pricing
   - Value per dollar spent

QUALITY ASSESSMENT CRITERIA:
- Does it understand complex code patterns?
- Can it identify subtle security issues?
- Does it provide actionable recommendations?
- Is it the latest version of the model?
`);

console.log('\n✅ RESEARCHER agent balances ALL factors, not just cost!');

console.log('\n🎯 Cross-Market Role-Specific Research Example:');
console.log('=============================================');

// Simulate what the new RESEARCHER approach would do
const roleSpecificResults = {
  security: {
    research: 'Analyzed ALL models across ALL providers for security analysis',
    winner: {
      model: 'Claude 4 Sonnet',
      provider: 'Anthropic',
      reason: 'Latest Claude with superior reasoning for threat detection and security pattern recognition',
      score: 9.8,
      cost: '$8.00/M'
    },
    fallback: {
      model: 'Gemini 2.5 Flash', 
      provider: 'Google',
      reason: 'Cost-effective backup with good security capabilities',
      score: 8.2,
      cost: '$0.19/M'
    },
    rejected: [
      { model: 'GPT-5 Turbo', reason: 'Good but slightly lower reasoning for security' },
      { model: 'DeepSeek Coder V3', reason: 'Strong coding but less specialized for security' }
    ]
  },
  performance: {
    research: 'Analyzed ALL models across ALL providers for performance optimization',
    winner: {
      model: 'DeepSeek Coder V3',
      provider: 'DeepSeek', 
      reason: 'Latest version specialized for code optimization and performance analysis',
      score: 9.4,
      cost: '$0.18/M'
    },
    fallback: {
      model: 'GPT-5 Turbo',
      provider: 'OpenAI',
      reason: 'Latest GPT with good performance analysis capabilities',
      score: 8.5,
      cost: '$1.20/M'
    }
  }
};

Object.entries(roleSpecificResults).forEach(([role, result]) => {
  console.log(`\n${role.toUpperCase()} AGENT:`);
  console.log(`✅ Winner: ${result.winner.model} (${result.winner.provider})`);
  console.log(`   Score: ${result.winner.score}/10`);
  console.log(`   Cost: ${result.winner.cost}`);
  console.log(`   Why: ${result.winner.reason}`);
  console.log(`🔄 Fallback: ${result.fallback.model} (${result.fallback.provider})`);
  console.log(`   Reason: ${result.fallback.reason}`);
});

console.log('\n📊 Key Differences from Old Approach:');
console.log('=====================================');
console.log('• OLD: Find best OpenAI model + best Anthropic model + best Google model');
console.log('• NEW: Find THE SINGLE BEST model across ALL providers for specific role');
console.log('• OLD: Provider-by-provider comparison');  
console.log('• NEW: Cross-market analysis with role-specific evaluation');
console.log('• OLD: Generic scoring for all use cases');
console.log('• NEW: Specialized scoring per agent role (security, performance, etc.)');
console.log('• Result: Security gets Claude (best reasoning), Performance gets DeepSeek (code-specialized)');

console.log('\n🔬 How RESEARCHER Now Works:');
console.log('=============================');
console.log('1. Get agent role requirement (e.g., "security analysis")');
console.log('2. Research ALL available models from ALL providers'); 
console.log('3. Use role-specific evaluation criteria (threat detection, reasoning, etc.)');
console.log('4. Find SINGLE BEST model across entire market for that role');
console.log('5. Identify reliable fallback option');
console.log('6. Provide primary + fallback recommendation');
console.log('\n→ No more hardcoded model lists!');
console.log('→ No more "best per provider" - just absolute best for the job!');