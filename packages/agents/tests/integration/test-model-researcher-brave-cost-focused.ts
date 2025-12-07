#!/usr/bin/env npx ts-node
/**
 * Test Model Researcher with Brave Search - COST-FOCUSED
 *
 * Tests the Brave Search with queries that match our ACTUAL weights:
 * - Analysis roles: quality=0.35, speed=0.30, cost=0.35
 *
 * This should find cost-efficient, fast models like:
 * - Qwen-Coder
 * - Gemini Flash
 * - GPT-4o-mini
 *
 * NOT expensive models like Claude Sonnet or GPT-4o
 */

import * as dotenv from 'dotenv';
dotenv.config();

// Check required environment variables
const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
// Use first key from OPENROUTER_API_KEYS (multi-key list) or fallback to single key
const OPENROUTER_API_KEYS = process.env.OPENROUTER_API_KEYS;
const OPENROUTER_API_KEY = OPENROUTER_API_KEYS
  ? OPENROUTER_API_KEYS.split(',')[0]
  : process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY or OPENROUTER_API_KEYS not set');
  process.exit(1);
}

console.log('🔬 Model Researcher Brave Search Test - COST-FOCUSED');
console.log('='.repeat(60));
console.log(`Date: ${new Date().toISOString()}`);
if (BRAVE_API_KEY) {
  console.log(`BRAVE_API_KEY: ${BRAVE_API_KEY.slice(0, 8)}...`);
} else {
  console.log('⚠️  BRAVE_API_KEY not set - using AI knowledge fallback');
}
console.log('');
console.log('📊 Using ACTUAL analysis role weights:');
console.log('   quality=0.35, speed=0.30, cost=0.35');
console.log('   (Cost is weighted equally with quality!)');
console.log('');

// Define COST-FOCUSED search queries for each role
// These match our actual weights: cost=0.35, speed=0.30, quality=0.35
const ROLE_QUERIES = [
  {
    role: 'security',
    query: 'cheapest fastest AI LLM models for code security 2025 cost efficient budget',
    description: 'Security - cost-efficient fast models',
  },
  {
    role: 'dependency',
    query: 'low cost fast AI models for dependency CVE analysis 2025 cheap efficient',
    description: 'Dependency - budget-friendly fast models',
  },
  {
    role: 'architecture',
    query: 'affordable fast AI LLM for code architecture 2025 cost effective cheap',
    description: 'Architecture - affordable fast models',
  },
  {
    role: 'performance',
    query: 'fast cheap AI models for code performance analysis 2025 low latency budget',
    description: 'Performance - fast low-cost models',
  },
  {
    role: 'code_quality',
    query: 'budget friendly fast AI LLM for code quality review 2025 cheap efficient',
    description: 'Code Quality - cost-efficient fast models',
  },
];

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
    const results: BraveSearchResult[] = (data.web?.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || '',
    }));

    return results;
  } catch (error) {
    console.error(`      ❌ Search error:`, error);
    return [];
  }
}

async function aiCompileModelResults(
  role: string,
  searchResults: BraveSearchResult[]
): Promise<any> {
  const searchContext = searchResults.length > 0
    ? searchResults.slice(0, 15).map(r => `- ${r.title}: ${r.description} (${r.url})`).join('\n')
    : '(No search results - use your training knowledge)';

  // COST-FOCUSED prompt that matches our actual weights
  const prompt = `
Analyze the following web search results to identify the MOST COST-EFFICIENT and FAST AI/LLM models for ${role} code analysis as of 2025.

**CRITICAL REQUIREMENTS:**
- We need CHEAP models (cost is 35% of our decision)
- We need FAST models (speed is 30% of our decision)
- Quality is important but secondary (35% of decision)
- We DO NOT want expensive models like Claude Sonnet, GPT-4o, or Opus
- We WANT models like: Qwen-Coder, Gemini Flash, GPT-4o-mini, DeepSeek-Coder, Llama

**Search Results:**
${searchContext}

**YOUR TASK:**
Recommend TOP 3 COST-EFFICIENT, FAST models for ${role} analysis.
For each model provide:
1. model_id - The OpenRouter API model identifier (prefer: qwen/qwen3-coder, google/gemini-2.5-flash, openai/gpt-4o-mini, deepseek/deepseek-coder)
2. name - Human readable name
3. provider - The provider
4. cost_per_million_tokens - Approximate cost (lower is better)
5. latency_ms - Typical response time (lower is better)
6. reason - Why this model is best for ${role} considering COST and SPEED
7. score - Overall score 0-100 (weight: 35% cost, 30% speed, 35% quality)

Return JSON format:
{
  "role": "${role}",
  "models": [
    {
      "model_id": "qwen/qwen3-coder-flash",
      "name": "Qwen 3 Coder Flash",
      "provider": "alibaba",
      "cost_per_million_tokens": 0.10,
      "latency_ms": 200,
      "reason": "Extremely cheap and fast, good for simple code formatting tasks",
      "score": 92
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
        systemPrompt: 'You are an AI model researcher specializing in COST-EFFICIENT code analysis tools. Focus on CHEAP and FAST models, not expensive premium ones. Return only valid JSON.',
        prompt,
        temperature: 0.1,
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
    console.error('      ❌ AI compilation error:', error);
    return null;
  }
}

async function main() {
  const results: any[] = [];

  for (const roleConfig of ROLE_QUERIES) {
    console.log(`\n📊 Testing ${roleConfig.role.toUpperCase()} Role (COST-FOCUSED)`);
    console.log('-'.repeat(50));
    console.log(`   Description: ${roleConfig.description}`);
    console.log(`   Query: "${roleConfig.query}"`);

    // Step 1: Brave Search
    console.log('\n   🔍 Step 1: Brave Search...');
    const searchResults = await searchBrave(roleConfig.query);
    console.log(`      Found ${searchResults.length} results`);

    if (searchResults.length > 0) {
      console.log('      Top 3 results:');
      searchResults.slice(0, 3).forEach((r, i) => {
        console.log(`        ${i + 1}. ${r.title.slice(0, 60)}...`);
      });
    }

    // Step 2: AI Compilation
    console.log('\n   🤖 Step 2: AI Compilation (COST-FOCUSED)...');
    const aiResult = await aiCompileModelResults(roleConfig.role, searchResults);

    if (aiResult && aiResult.models) {
      console.log(`      Recommended ${aiResult.models.length} COST-EFFICIENT models:`);
      aiResult.models.forEach((m: any, i: number) => {
        const cost = m.cost_per_million_tokens ? `$${m.cost_per_million_tokens}/M` : 'N/A';
        const latency = m.latency_ms ? `${m.latency_ms}ms` : 'N/A';
        console.log(`        ${i + 1}. ${m.model_id} (${m.provider})`);
        console.log(`           Cost: ${cost}, Latency: ${latency}, Score: ${m.score}`);
        console.log(`           Reason: ${m.reason?.slice(0, 70)}...`);
      });
      results.push(aiResult);
    } else {
      console.log('      ⚠️ No AI recommendations');
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 COST-FOCUSED SUMMARY');
  console.log('='.repeat(60));
  console.log('\nExpected: Models like Qwen-Coder, Gemini Flash, GPT-4o-mini');
  console.log('NOT expected: Claude Sonnet, GPT-4o, Opus (too expensive)\n');

  for (const result of results) {
    if (result && result.models && result.models.length > 0) {
      const topModel = result.models[0];
      const cost = topModel.cost_per_million_tokens ? `$${topModel.cost_per_million_tokens}/M` : 'N/A';
      console.log(`\n${result.role.toUpperCase()}:`);
      console.log(`   Best: ${topModel.model_id} (${topModel.provider})`);
      console.log(`   Cost: ${cost}, Score: ${topModel.score}`);
    }
  }

  console.log('\n✅ Test complete!');
}

main().catch(console.error);
