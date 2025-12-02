#!/usr/bin/env npx ts-node
/**
 * Test Model Researcher - LATEST MODELS ONLY + WEIGHTS
 *
 * Uses Brave Search + AI to:
 * 1. Find current AI models from web
 * 2. Filter to ONLY latest version of each model family
 * 3. Apply exact weights: quality=0.35, speed=0.30, cost=0.35
 */

import * as dotenv from 'dotenv';
dotenv.config();

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const OPENROUTER_API_KEYS = process.env.OPENROUTER_API_KEYS;
const OPENROUTER_API_KEY = OPENROUTER_API_KEYS
  ? OPENROUTER_API_KEYS.split(',')[0]
  : process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY not set');
  process.exit(1);
}

// Exact weights per role from getRoleWeights() in model-researcher-service.ts
const ROLE_WEIGHTS: Record<string, { quality: number; speed: number; cost: number }> = {
  security:     { quality: 0.35, speed: 0.30, cost: 0.35 },
  performance:  { quality: 0.30, speed: 0.35, cost: 0.35 },
  code_quality: { quality: 0.35, speed: 0.30, cost: 0.35 },
  architecture: { quality: 0.35, speed: 0.30, cost: 0.35 },
  dependency:   { quality: 0.30, speed: 0.35, cost: 0.35 },
};

console.log('🔬 Model Selection - LATEST ONLY + ROLE-SPECIFIC WEIGHTS');
console.log('='.repeat(60));
console.log(`Date: ${new Date().toISOString()}`);
console.log('');
console.log('📊 CURRENT CONFIG: qwen/qwen3-coder-flash (baseline to compare)');
console.log('');
console.log('Role-specific weights:');
Object.entries(ROLE_WEIGHTS).forEach(([role, w]) => {
  console.log(`   ${role}: q=${w.quality}, s=${w.speed}, c=${w.cost}`);
});
console.log('');

interface BraveResult { title: string; url: string; description: string; }

async function searchBrave(query: string): Promise<BraveResult[]> {
  if (!BRAVE_API_KEY) return [];
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=15`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });
    if (!response.ok) return [];
    const data = await response.json() as any;
    return (data.web?.results || []).map((r: any) => ({
      title: r.title || '', url: r.url || '', description: r.description || '',
    }));
  } catch { return []; }
}

async function selectModelsWithWeights(
  role: string,
  searchResults: BraveResult[],
  weights: { quality: number; speed: number; cost: number }
): Promise<any> {
  const context = searchResults.slice(0, 20).map(r => `- ${r.title}: ${r.description}`).join('\n');

  const prompt = `
You are selecting AI models for ${role} code analysis.

**CRITICAL RULE: ONLY LATEST VERSIONS**
- For each model family, ONLY consider the LATEST version
- IGNORE all outdated/deprecated versions
- Example: If GPT-4o and GPT-3.5 both exist, ONLY consider GPT-4o
- Example: If Claude Sonnet 4 and Claude 3 exist, ONLY consider Claude Sonnet 4
- Example: If Gemini 2.5 and Gemini 1.5 exist, ONLY consider Gemini 2.5

**WEIGHTS FOR SCORING:**
- quality_weight: ${weights.quality}
- speed_weight: ${weights.speed}
- cost_weight: ${weights.cost}

**SCORING:**
final_score = (quality * ${weights.quality}) + (speed * ${weights.speed}) + (cost * ${weights.cost})

Where (0-100 scale):
- quality: Code analysis capability
- speed: Response latency (100=fastest)
- cost: Token price (100=cheapest, 0=most expensive)

**SEARCH CONTEXT:**
${context}

**TASK:**
1. Identify ONLY the LATEST version of each major model family
2. Score each using the weights above
3. Calculate final_score for each
4. SORT BY final_score DESCENDING (HIGHEST score first)
5. Return TOP 5 models - the model with HIGHEST final_score must be #1

**CRITICAL: Models with high cost_score (cheap) should rank HIGHER**
- A model with Q:75 S:95 C:95 → final_score=87.5 should rank ABOVE
- A model with Q:95 S:75 C:65 → final_score=80.5

**OUTPUT (JSON only, SORTED by final_score DESC):**
{
  "role": "${role}",
  "models": [
    {
      "model_id": "provider/model-name",
      "is_latest_version": true,
      "quality": 75,
      "speed": 95,
      "cost": 95,
      "final_score": 87.5,
      "price_estimate": "$0.50/M tokens"
    }
  ]
}
`;

  try {
    const { AIService } = await import('../../src/standard/services/ai-service');
    const aiService = new AIService({ openRouterApiKey: OPENROUTER_API_KEY });

    const response = await aiService.call(
      { id: 'google/gemini-2.0-flash-001', model: 'gemini-2.0-flash-001', provider: 'google' },
      {
        systemPrompt: 'You are a model researcher. ONLY recommend LATEST versions. Apply weights precisely. Return JSON only.',
        prompt,
        temperature: 0.0,
        maxTokens: 1500,
      }
    );

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error('AI error:', error);
    return null;
  }
}

async function main() {
  const roles = ['security', 'dependency', 'architecture', 'performance', 'code_quality'];
  const results: any[] = [];

  for (const role of roles) {
    const weights = ROLE_WEIGHTS[role];
    console.log(`\n📊 ${role.toUpperCase()} (q=${weights.quality}, s=${weights.speed}, c=${weights.cost})`);
    console.log('-'.repeat(50));

    // Search for latest models
    const query = `latest AI LLM models December 2025 ${role} code analysis pricing`;
    console.log(`   Query: "${query}"`);

    const searchResults = await searchBrave(query);
    console.log(`   Found ${searchResults.length} results`);

    // Select with role-specific weights
    const result = await selectModelsWithWeights(role, searchResults, weights);

    if (result?.models) {
      console.log(`\n   Top models (LATEST ONLY):`);
      result.models.slice(0, 5).forEach((m: any, i: number) => {
        console.log(`   ${i + 1}. ${m.model_id}`);
        console.log(`      Q:${m.quality} S:${m.speed} C:${m.cost} → ${m.final_score} | ${m.price_estimate || 'N/A'}`);
      });
      results.push(result);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY (weights: q=0.35, s=0.30, c=0.35)');
  console.log('='.repeat(60));

  for (const r of results) {
    if (r?.models?.[0]) {
      const top = r.models[0];
      console.log(`\n${r.role.toUpperCase()}: ${top.model_id}`);
      console.log(`   Score: ${top.final_score} | ${top.price_estimate || 'N/A'}`);
    }
  }

  console.log('\n✅ Complete!');
}

main().catch(console.error);
