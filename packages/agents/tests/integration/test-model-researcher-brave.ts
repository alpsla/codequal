#!/usr/bin/env npx ts-node
/**
 * Test Model Researcher with Brave Search
 *
 * Tests the Brave Search implementation for finding best AI models
 * for specialized code analysis roles.
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

console.log('🔬 Model Researcher Brave Search Test');
console.log('='.repeat(60));
console.log(`Date: ${new Date().toISOString()}`);
if (BRAVE_API_KEY) {
  console.log(`BRAVE_API_KEY: ${BRAVE_API_KEY.slice(0, 8)}...`);
} else {
  console.log('⚠️  BRAVE_API_KEY not set - using AI knowledge fallback');
}
console.log('');

// Define specialized search queries for each role
const ROLE_QUERIES = [
  {
    role: 'security',
    query: 'best AI LLM models for code security vulnerability analysis 2025',
    description: 'Security vulnerability detection and analysis',
  },
  {
    role: 'dependency',
    query: 'best AI models for software dependency analysis CVE detection 2025',
    description: 'Dependency scanning and CVE identification',
  },
  {
    role: 'architecture',
    query: 'best AI LLM for code architecture analysis design patterns 2025',
    description: 'Code architecture and design pattern analysis',
  },
  {
    role: 'performance',
    query: 'best AI models for code performance optimization analysis 2025',
    description: 'Performance bottleneck detection and optimization',
  },
  {
    role: 'quality',
    query: 'best AI LLM for code quality review static analysis 2025',
    description: 'Code quality, maintainability, and best practices',
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

  const prompt = `
Analyze the following web search results to identify the BEST AI/LLM models for ${role} code analysis as of 2025.

Search Results:
${searchContext}

Based on these results and your knowledge, recommend the TOP 3 models for ${role} analysis.
For each model provide:
1. model_id - The OpenRouter or API model identifier (e.g., "anthropic/claude-3.5-sonnet", "openai/gpt-4o")
2. name - Human readable name
3. provider - The provider (anthropic, openai, google, meta, etc.)
4. reason - Why this model is best for ${role} analysis
5. score - Confidence score 0-100

Return JSON format:
{
  "role": "${role}",
  "models": [
    {
      "model_id": "...",
      "name": "...",
      "provider": "...",
      "reason": "...",
      "score": 95
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
        systemPrompt: 'You are an AI model researcher specializing in code analysis tools. Return only valid JSON.',
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
    console.log(`\n📊 Testing ${roleConfig.role.toUpperCase()} Role`);
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
    console.log('\n   🤖 Step 2: AI Compilation...');
    const aiResult = await aiCompileModelResults(roleConfig.role, searchResults);

    if (aiResult && aiResult.models) {
      console.log(`      Recommended ${aiResult.models.length} models:`);
      aiResult.models.forEach((m: any, i: number) => {
        console.log(`        ${i + 1}. ${m.model_id} (${m.provider}) - Score: ${m.score}`);
        console.log(`           Reason: ${m.reason?.slice(0, 80)}...`);
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
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));

  for (const result of results) {
    if (result && result.models && result.models.length > 0) {
      const topModel = result.models[0];
      console.log(`\n${result.role.toUpperCase()}:`);
      console.log(`   Best: ${topModel.model_id} (${topModel.provider})`);
      console.log(`   Score: ${topModel.score}`);
    }
  }

  console.log('\n✅ Test complete!');
}

main().catch(console.error);
