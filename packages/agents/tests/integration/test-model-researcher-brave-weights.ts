#!/usr/bin/env npx ts-node
/**
 * Test Model Researcher with Brave Search - WEIGHTS-BASED
 *
 * Uses EXACT numerical weights for model selection:
 * - quality: 0.35
 * - speed: 0.30
 * - cost: 0.35
 *
 * The AI calculates: score = (quality * 0.35) + (speed * 0.30) + (cost * 0.35)
 */

import * as dotenv from 'dotenv';
dotenv.config();

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const OPENROUTER_API_KEYS = process.env.OPENROUTER_API_KEYS;
const OPENROUTER_API_KEY = OPENROUTER_API_KEYS
  ? OPENROUTER_API_KEYS.split(',')[0]
  : process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY or OPENROUTER_API_KEYS not set');
  process.exit(1);
}

// Our EXACT weights from getRoleWeights() in model-researcher-service.ts
const ANALYSIS_WEIGHTS = {
  quality: 0.35,
  speed: 0.30,
  cost: 0.35,
};

console.log('🔬 Model Researcher Brave Search Test - WEIGHTS-BASED');
console.log('='.repeat(60));
console.log(`Date: ${new Date().toISOString()}`);
console.log('');
console.log('📊 Using EXACT weights:');
console.log(`   quality: ${ANALYSIS_WEIGHTS.quality}`);
console.log(`   speed:   ${ANALYSIS_WEIGHTS.speed}`);
console.log(`   cost:    ${ANALYSIS_WEIGHTS.cost}`);
console.log('');
console.log('Formula: score = (quality_score * 0.35) + (speed_score * 0.30) + (cost_score * 0.35)');
console.log('');

const ROLES = ['security', 'dependency', 'architecture', 'performance', 'code_quality'];

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

async function searchBrave(query: string): Promise<BraveSearchResult[]> {
  if (!BRAVE_API_KEY) return [];

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    });

    if (!response.ok) {
      console.log(`      ⚠️ Brave search failed: ${response.status}`);
      return [];
    }

    const data = await response.json() as any;
    return (data.web?.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || '',
    }));
  } catch (error) {
    console.error(`      ❌ Search error:`, error);
    return [];
  }
}

async function aiSelectModelWithWeights(
  role: string,
  searchResults: BraveSearchResult[],
  weights: { quality: number; speed: number; cost: number }
): Promise<any> {
  const searchContext = searchResults.length > 0
    ? searchResults.slice(0, 15).map(r => `- ${r.title}: ${r.description}`).join('\n')
    : '(No search results - use your training knowledge)';

  // WEIGHTS-BASED prompt - no subjective words
  const prompt = `
You are selecting AI models for ${role} code analysis. Use ONLY these weights to calculate scores.

**WEIGHTS:**
- quality_weight: ${weights.quality}
- speed_weight: ${weights.speed}
- cost_weight: ${weights.cost}

**SCORING FORMULA:**
final_score = (quality_score * ${weights.quality}) + (speed_score * ${weights.speed}) + (cost_score * ${weights.cost})

Where each component score (0-100):
- quality_score: Model's code analysis capability (100 = best, 0 = worst)
- speed_score: Response latency (100 = fastest <100ms, 0 = slowest >10s)
- cost_score: Token price (100 = free, 90 = <$0.10/M, 70 = <$1/M, 50 = <$5/M, 20 = <$15/M, 0 = >$15/M)

**AVAILABLE MODELS (2025 latest):**
Search context:
${searchContext}

**YOUR TASK:**
1. For each candidate model, calculate quality_score, speed_score, cost_score
2. Apply the formula to get final_score
3. Return TOP 3 models sorted by final_score

**OUTPUT FORMAT (JSON only):**
{
  "role": "${role}",
  "weights_used": {"quality": ${weights.quality}, "speed": ${weights.speed}, "cost": ${weights.cost}},
  "models": [
    {
      "model_id": "provider/model-name",
      "quality_score": 75,
      "speed_score": 85,
      "cost_score": 90,
      "final_score": 83.0,
      "calculation": "(75 * 0.35) + (85 * 0.30) + (90 * 0.35) = 83.0"
    }
  ]
}
`;

  try {
    const { AIService } = await import('../../src/standard/services/ai-service');
    const aiService = new AIService({
      openRouterApiKey: OPENROUTER_API_KEY,
    });

    const response = await aiService.call(
      {
        id: 'google/gemini-2.0-flash-001',
        model: 'gemini-2.0-flash-001',
        provider: 'google',
      },
      {
        systemPrompt: 'You are a model selection calculator. Apply the given weights formula precisely. Return only valid JSON.',
        prompt,
        temperature: 0.0, // Deterministic
        maxTokens: 1500,
      }
    );

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('      ⚠️ No JSON found in AI response');
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('      ❌ AI error:', error);
    return null;
  }
}

async function main() {
  const results: any[] = [];

  for (const role of ROLES) {
    console.log(`\n📊 ${role.toUpperCase()}`);
    console.log('-'.repeat(50));

    // Search for latest AI models for code analysis
    const query = `AI LLM models for code ${role} analysis 2025 pricing speed`;
    console.log(`   Query: "${query}"`);

    const searchResults = await searchBrave(query);
    console.log(`   Found ${searchResults.length} results`);

    // Apply weights
    console.log(`\n   Applying weights: q=${ANALYSIS_WEIGHTS.quality}, s=${ANALYSIS_WEIGHTS.speed}, c=${ANALYSIS_WEIGHTS.cost}`);
    const result = await aiSelectModelWithWeights(role, searchResults, ANALYSIS_WEIGHTS);

    if (result && result.models) {
      console.log(`\n   Top models by weighted score:`);
      result.models.forEach((m: any, i: number) => {
        console.log(`   ${i + 1}. ${m.model_id}`);
        console.log(`      Q:${m.quality_score} S:${m.speed_score} C:${m.cost_score} → Final: ${m.final_score}`);
        if (m.calculation) {
          console.log(`      ${m.calculation}`);
        }
      });
      results.push(result);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY (weights: q=0.35, s=0.30, c=0.35)');
  console.log('='.repeat(60));

  for (const result of results) {
    if (result?.models?.[0]) {
      const top = result.models[0];
      console.log(`\n${result.role.toUpperCase()}: ${top.model_id}`);
      console.log(`   Score: ${top.final_score} (Q:${top.quality_score} S:${top.speed_score} C:${top.cost_score})`);
    }
  }

  console.log('\n✅ Test complete!');
}

main().catch(console.error);
