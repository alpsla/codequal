#!/usr/bin/env npx ts-node
/**
 * Test AI Fixer Brave Search Research
 *
 * Tests the Brave Search implementation for finding best AI models
 * for code fixing across different programming languages.
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

console.log('🔬 AI Fixer Brave Search Research Test');
console.log('='.repeat(60));
console.log(`Date: ${new Date().toISOString()}`);
if (BRAVE_API_KEY) {
  console.log(`BRAVE_API_KEY: ${BRAVE_API_KEY.slice(0, 8)}...`);
} else {
  console.log('⚠️  BRAVE_API_KEY not set - using AI knowledge fallback');
}
console.log('');

// Test with a subset of languages to save time/cost
const TEST_LANGUAGES = ['typescript', 'python', 'java', 'go'];

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

async function aiCompileFixerModelResults(
  language: string,
  searchResults: BraveSearchResult[]
): Promise<{ model_id: string; provider: string; reason: string; score: number } | null> {
  const searchContext = searchResults.length > 0
    ? searchResults.slice(0, 10).map(r => `- ${r.title}: ${r.description} (${r.url})`).join('\n')
    : '(No search results - use your training knowledge)';

  const prompt = `
Analyze the following web search results to identify the BEST AI/LLM model for ${language} code fixing/refactoring as of 2025.

Search Results:
${searchContext}

Based on these results and your knowledge, recommend the SINGLE BEST model for ${language} code fixing.
Consider factors like:
- Code understanding and generation quality
- Language-specific expertise (${language})
- Fix accuracy and compilation success rate
- Response speed
- Cost efficiency

Provide:
1. model_id - The OpenRouter API model identifier (e.g., "anthropic/claude-sonnet-4-20250514", "openai/gpt-4o", "google/gemini-2.0-flash-001", "deepseek/deepseek-coder")
2. provider - The provider (anthropic, openai, google, deepseek, meta, etc.)
3. reason - Why this model is best for ${language} code fixing
4. score - Confidence score 0-100

Return JSON format only:
{
  "model_id": "...",
  "provider": "...",
  "reason": "...",
  "score": 95
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
        systemPrompt: 'You are an AI model researcher specializing in code fixing tools. Return only valid JSON.',
        prompt,
        temperature: 0.1,
        maxTokens: 500,
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
  const results: Array<{ language: string; recommendation: any }> = [];

  for (const language of TEST_LANGUAGES) {
    console.log(`\n📊 Researching ${language.toUpperCase()} AI Fixer`);
    console.log('-'.repeat(50));

    // Step 1: Brave Search
    const query = `best AI LLM for ${language} code fixing refactoring auto-fix 2025`;
    console.log(`   🔍 Query: "${query}"`);
    console.log('');
    console.log('   🔍 Step 1: Brave Search...');
    const searchResults = await searchBrave(query);
    console.log(`      Found ${searchResults.length} results`);

    if (searchResults.length > 0) {
      console.log('      Top 3 results:');
      searchResults.slice(0, 3).forEach((r, i) => {
        console.log(`        ${i + 1}. ${r.title.slice(0, 60)}...`);
      });
    }

    // Step 2: AI Compilation
    console.log('\n   🤖 Step 2: AI Compilation...');
    const recommendation = await aiCompileFixerModelResults(language, searchResults);

    if (recommendation) {
      console.log(`      Best Model: ${recommendation.model_id} (${recommendation.provider})`);
      console.log(`      Score: ${recommendation.score}`);
      console.log(`      Reason: ${recommendation.reason?.slice(0, 80)}...`);
      results.push({ language, recommendation });
    } else {
      console.log('      ⚠️ No recommendation');
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 AI FIXER MODEL RECOMMENDATIONS SUMMARY');
  console.log('='.repeat(60));

  for (const result of results) {
    console.log(`\n${result.language.toUpperCase()}:`);
    console.log(`   Best: ${result.recommendation.model_id} (${result.recommendation.provider})`);
    console.log(`   Score: ${result.recommendation.score}`);
  }

  console.log('\n✅ Test complete!');
}

main().catch(console.error);
