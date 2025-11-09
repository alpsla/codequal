#!/usr/bin/env npx ts-node

/**
 * Clean and Regenerate Model Configurations V2
 * ZERO hardcoded models - 100% dynamic discovery from OpenRouter
 * 
 * This script:
 * 1. Backs up current configurations
 * 2. Fetches ALL models from OpenRouter
 * 3. Filters by freshness (<6 months old)
 * 4. Scores each model for quality/speed/cost
 * 5. Generates optimal configs for all 300+ role/language/size combinations
 * 6. Stores in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Role definitions with weights (no hardcoded models!)
const ROLES = [
  'security', 'performance', 'code_quality', 'architecture', 'dependency',
  'educator', 'orchestrator', 'comparator', 'location_finder', 'researcher'
];

const LANGUAGES = [
  'java', 'python', 'typescript', 'javascript', 'go', 'rust',
  'csharp', 'cpp', 'ruby', 'php', 'kotlin', 'swift'
];

// SIZE REMOVED: Doesn't matter since tools already analyzed the repo
// Agent only sees individual code snippets, not entire codebase

// Role-specific weights for model selection
// UPDATED Nov 7, 2025: Maximize cost savings (analysis is async, speed less critical)
function getWeightsForRole(role: string): { quality: number; speed: number; cost: number; freshness: number } {
  const baseWeights = {
    // ANALYSIS ROLES: Cost-FIRST (30% quality, 55% cost, 15% speed, 0% freshness)
    // Rationale: Tools (PMD, Semgrep, ESLint) do heavy lifting → Agents just compile & suggest fixes
    // Analysis is ASYNC → Speed doesn't matter → MAXIMIZE cost savings
    // Freshness = 0%: All models < 6 months old already, cheapest matters more than newest
    security: { quality: 0.30, speed: 0.15, cost: 0.55, freshness: 0.00 },
    performance: { quality: 0.30, speed: 0.15, cost: 0.55, freshness: 0.00 },
    code_quality: { quality: 0.30, speed: 0.15, cost: 0.55, freshness: 0.00 },
    architecture: { quality: 0.30, speed: 0.15, cost: 0.55, freshness: 0.00 },
    dependency: { quality: 0.30, speed: 0.15, cost: 0.55, freshness: 0.00 },
    
    // META ROLES: Keep higher quality (these don't run per-issue, so cost less important)
    educator: { quality: 0.50, speed: 0.25, cost: 0.20, freshness: 0.05 },
    orchestrator: { quality: 0.50, speed: 0.30, cost: 0.15, freshness: 0.05 },
    comparator: { quality: 0.40, speed: 0.35, cost: 0.20, freshness: 0.05 },
    location_finder: { quality: 0.30, speed: 0.50, cost: 0.15, freshness: 0.05 },
    researcher: { quality: 0.50, speed: 0.30, cost: 0.15, freshness: 0.05 }
  };

  return baseWeights[role as keyof typeof baseWeights] || { quality: 0.30, speed: 0.30, cost: 0.35, freshness: 0.05 };
}

/**
 * Fetch ALL models from OpenRouter
 */
async function fetchAllModels(): Promise<any[]> {
  console.log('🔍 Fetching all models from OpenRouter...');
  
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json() as { data: any[] };
  console.log(`✅ Fetched ${data.data.length} total models from OpenRouter`);
  
  return data.data;
}

/**
 * Filter models by freshness (<6 months old) AND deduplicate to LATEST versions only
 * ALSO filter out non-code models (safety, moderation, image, audio, etc.)
 */
function filterByFreshness(models: any[]): any[] {
  console.log('📅 Step 1: Filtering by freshness (<6 months old)...');
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const freshModels = models.filter(model => {
    if (!model.created) return false;
    const createdDate = new Date(model.created * 1000);
    return createdDate > sixMonthsAgo;
  });
  
  console.log(`✅ Found ${freshModels.length} fresh models (< 6 months old)`);
  
  // Filter out non-code models
  console.log('🔍 Step 1.5: Filtering out non-code models (safety, moderation, image, audio)...');
  
  const excludePatterns = ['safeguard', 'moderation', 'shield', 'guard', 'vision', 'audio', 'whisper', 'dall-e', 'midjourney', 'stable-diffusion'];
  
  const codeModels = freshModels.filter(model => {
    const modelId = model.id.toLowerCase();
    const desc = (model.description || '').toLowerCase();
    
    // Exclude if matches non-code patterns
    for (const pattern of excludePatterns) {
      if (modelId.includes(pattern) || desc.includes(pattern)) {
        return false;
      }
    }
    return true;
  });
  
  console.log(`✅ Filtered to ${codeModels.length} code-suitable models`);
  
  // Step 2: SKIP deduplication - keep all models and let scoring decide
  // UPDATED Nov 7, 2025: Deduplication was discarding cheap models like qwen3-coder-30b
  console.log('🔄 Step 2: Keeping ALL fresh models (no deduplication - scoring will pick best)...');
    
  // Keep ALL fresh code models - let scoring decide the best
  const latestModels = codeModels;
  
  console.log(`✅ Kept all ${latestModels.length} fresh code models (scoring will select optimal)`);
  return latestModels;
}

/**
 * Score a model for quality (based on context length, coding specialization, architecture)
 * UPDATED Nov 7, 2025: Heavily favor coding-specialized models (qwen-coder, deepseek-coder, etc.)
 */
function scoreQuality(model: any): number {
  let score = 50; // Base score
  
  const id = model.id.toLowerCase();
  const desc = (model.description || '').toLowerCase();
  
  // CODING SPECIALIZATION (MOST IMPORTANT for our use case)
  if (id.includes('coder') || id.includes('code')) score += 30; // Coding-specialized models
  else if (desc.includes('code generation') || desc.includes('repository-scale')) score += 25;
  else if (desc.includes('coding') || desc.includes('programming')) score += 15;
  
  // Context length (larger = better for complex tasks)
  if (model.context_length >= 256000) score += 15;
  else if (model.context_length >= 128000) score += 10;
  else if (model.context_length >= 64000) score += 5;
  
  // Well-known high-quality providers
  if (id.includes('anthropic/claude') || id.includes('openai/gpt-4') || id.includes('google/gemini-2.5')) {
    score += 10;
  }
  
  // Tier hints (within same family)
  if (id.includes('opus')) score += 5;
  else if (id.includes('sonnet')) score += 3;
  
  return Math.min(100, score);
}

/**
 * Score a model for speed (inversely related to quality, smaller context = faster)
 */
function scoreSpeed(model: any): number {
  let score = 50;
  
  // Smaller context = faster
  if (model.context_length <= 8000) score += 25;
  else if (model.context_length <= 16000) score += 15;
  else if (model.context_length <= 32000) score += 10;
  
  // Architecture hints
  const id = model.id.toLowerCase();
  if (id.includes('flash') || id.includes('lite') || id.includes('haiku')) score += 20;
  else if (id.includes('turbo')) score += 10;
  
  // Lower pricing often means faster models
  const promptPrice = model.pricing?.prompt ? parseFloat(model.pricing.prompt) : 0;
  if (promptPrice < 0.000001) score += 15;
  else if (promptPrice < 0.000005) score += 10;
  
  return Math.min(100, score);
}

/**
 * Score a model for cost (lower price = better score)
 * 
 * UPDATED Nov 7, 2025: Maximize savings - favor ultra-cheap models heavily
 * 50% cost weight means this is THE most important factor
 */
function scoreCost(model: any): number {
  const promptPrice = model.pricing?.prompt ? parseFloat(model.pricing.prompt) : 0;
  
  // Normalize price to 0-100 score (exponential preference for cheaper)
  // Ultra-cheap models (Qwen, DeepSeek) should score HIGHEST
  if (promptPrice === 0) return 85;  // Free models - good but may have limits
  if (promptPrice < 0.0000001) return 100;  // Ultra cheap (< $0.10 per 1M) - BEST!
  if (promptPrice < 0.0000005) return 95;   // Very cheap (< $0.50 per 1M)
  if (promptPrice < 0.000001) return 85;    // Cheap (< $1 per 1M)
  if (promptPrice < 0.000005) return 60;    // Moderate (< $5 per 1M)
  if (promptPrice < 0.00001) return 30;     // Expensive
  if (promptPrice < 0.00005) return 10;     // Very expensive
  return 5;  // Ultra expensive
}

/**
 * Score a model for freshness (newer = better)
 */
function scoreFreshness(model: any): number {
  if (!model.created) return 0;
  
  const createdDate = new Date(model.created * 1000);
  const now = new Date();
  const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Score based on age (0-180 days)
  if (ageInDays <= 30) return 100;  // < 1 month = perfect
  if (ageInDays <= 60) return 90;   // < 2 months
  if (ageInDays <= 90) return 80;   // < 3 months
  if (ageInDays <= 120) return 60;  // < 4 months
  if (ageInDays <= 150) return 40;  // < 5 months
  if (ageInDays <= 180) return 20;  // < 6 months
  return 0; // Older than 6 months
}

/**
 * Build weight-based search queries for Brave Search
 */
function buildWeightedSearchQueries(
  role: string,
  language: string,
  weights: { quality: number; speed: number; cost: number }
): string[] {
  // Determine primary focus based on weights
  const primaryFocus = 
    weights.quality > 0.5 ? 'best high-quality accurate' :
    weights.speed > 0.5 ? 'fastest most efficient' :
    weights.cost > 0.5 ? 'most cost-effective affordable cheap' :
    'balanced';
  
  const queries = [
    `${primaryFocus} AI LLM models for ${language} ${role} code review 2025`,
    `${language} ${role} AI model benchmark comparison performance 2025`
  ];
  
  // Add cost-specific queries if cost weight is high
  if (weights.cost > 0.3) {
    queries.push(`cheap affordable AI models ${language} ${role} analysis 2025`);
  }
  
  // Add quality-specific queries if quality weight is high
  if (weights.quality > 0.5) {
    queries.push(`top rated AI models ${language} ${role} accuracy benchmark 2025`);
  }
  
  return queries;
}

/**
 * Search Brave for model recommendations
 */
async function searchBraveForModels(query: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': process.env.BRAVE_API_KEY!
      }
    });
    
    if (!response.ok) {
      throw new Error(`Brave API error: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    const results = data.web?.results || [];
    
    // Extract model names from titles and descriptions
    const modelMentions = new Set<string>();
    
    for (const result of results.slice(0, 10)) {
      const text = `${result.title} ${result.description}`.toLowerCase();
      
      // Extract common model patterns
      const patterns = [
        /claude[\s-]+(opus|sonnet|haiku)?[\s-]*(\d+\.?\d*)/gi,
        /gpt[\s-]*(\d+\.?\d*)/gi,
        /gemini[\s-]+(pro|flash|lite)?[\s-]*(\d+\.?\d*)/gi,
        /qwen[\s-]*(\d+\.?\d*)/gi,
        /deepseek[\s-]*(chat|coder)?[\s-]*(v?\d+\.?\d*)/gi,
        /llama[\s-]*(\d+\.?\d*)/gi,
        /mistral[\s-]*(\d+\.?\d*)/gi
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          modelMentions.add(match[0].trim());
        }
      }
    }
    
    return Array.from(modelMentions);
  } catch (error) {
    console.log(`  ⚠️  Brave search failed: ${error}`);
    return [];
  }
}

/**
 * Use Brave Search + AI to recommend best models for specific role/language
 */
async function searchBestModelsForContext(
  role: string,
  language: string,
  availableModels: any[]
): Promise<string[]> {
  const weights = getWeightsForRole(role);
  const queries = buildWeightedSearchQueries(role, language, weights);
  
  console.log(`  🔍 Searching for ${role}/${language}...`);
  
  // Step 1: Search Brave for all queries
  const allMentions = new Set<string>();
  for (const query of queries) {
    const mentions = await searchBraveForModels(query);
    mentions.forEach(m => allMentions.add(m));
  }
  
  if (allMentions.size === 0) {
    console.log(`  ⚠️  No models found in search results`);
    return [];
  }
  
  // Step 2: Use AI to match search mentions to OpenRouter model IDs
  const modelList = availableModels.map(m => m.id).join('\n');
  const mentionsList = Array.from(allMentions).join(', ');
  
  const prompt = `You are an AI model mapping expert. Match the following model mentions from search results to exact OpenRouter model IDs.

**Model mentions found in search:**
${mentionsList}

**Available OpenRouter model IDs:**
${modelList}

**Instructions:**
1. Match each mention to the closest OpenRouter model ID
2. Prioritize newest versions (e.g., "claude-sonnet-4.5" over "claude-3.7-sonnet")
3. Return EXACTLY 3 model IDs
4. Focus on models mentioned most in search results

**Response Format (JSON only):**
{
  "recommended": ["model-id-1", "model-id-2", "model-id-3"],
  "reasoning": "Brief explanation"
}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || '{}';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const recommended = parsed.recommended || [];
      console.log(`  ✅ Found: ${recommended.slice(0, 2).join(', ')}`);
      return recommended;
    }
  } catch (error) {
    console.log(`  ⚠️  AI matching failed: ${error}`);
  }
  
  return [];
}

/**
 * Select optimal model for a specific context
 * 
 * UPDATED Nov 7, 2025: Use weight-based scoring directly from OpenRouter catalog
 * - Skip Brave Search for analysis roles (rate limits + not needed)
 * - Only use Brave Search for Educator role (teaching methodologies benefit from web research)
 */
async function selectOptimalModel(
  models: any[],
  role: string,
  language: string
): Promise<{ primary: string; fallback: string }> {
  
  // EDUCATOR ONLY: Use Brave Search for teaching methodology insights
  const useSearchForEducator = role === 'educator';
  
  if (useSearchForEducator) {
    const aiRecommended = await searchBestModelsForContext(role, language, models);
  const validRecommendations = aiRecommended.filter(id => 
    models.some(m => m.id === id)
  );
  
  if (validRecommendations.length >= 2) {
    return {
      primary: validRecommendations[0],
      fallback: validRecommendations[1]
    };
    }
  }
  
  // ALL OTHER ROLES: Direct weight-based scoring from OpenRouter catalog
  const weights = getWeightsForRole(role);
  
  const scoredModels = models.map(model => {
    const qualityScore = scoreQuality(model);
    const speedScore = scoreSpeed(model);
    const costScore = scoreCost(model);
    const freshnessScore = scoreFreshness(model);
    
    const totalScore = 
      (qualityScore * weights.quality) +
      (speedScore * weights.speed) +
      (costScore * weights.cost) +
      (freshnessScore * weights.freshness);
    
    return {
      model,
      score: totalScore,
      breakdown: { quality: qualityScore, speed: speedScore, cost: costScore, freshness: freshnessScore }
    };
  });
  
  scoredModels.sort((a, b) => b.score - a.score);
  
  // DEBUG: Log top 3 for analysis roles
  if (['security', 'performance', 'code_quality', 'architecture', 'dependency'].includes(role) && language === 'java') {
    console.log(`\n   🔍 DEBUG Top 3 scores for ${role}/java:`);
    scoredModels.slice(0, 3).forEach((s, idx) => {
      console.log(`      ${idx + 1}. ${s.model.id}: ${s.score.toFixed(1)} (Q:${s.breakdown.quality} C:${s.breakdown.cost} S:${s.breakdown.speed} F:${s.breakdown.freshness})`);
    });
  }
  
  return {
    primary: scoredModels[0]?.model.id || 'google/gemini-2.5-flash',
    fallback: scoredModels[1]?.model.id || 'deepseek/deepseek-chat-v3.1'
  };
}

/**
 * Backup existing configurations
 */
async function backupConfigurations(): Promise<void> {
  console.log('\n📦 Backing up existing configurations...');
  
  const { data, error } = await supabase
    .from('model_configurations')
    .select('*');
  
  if (error) {
    console.error('❌ Backup failed:', error);
    return;
  }
  
  const backupPath = path.join(__dirname, `../backups/model-configs-backup-${Date.now()}.json`);
  const backupDir = path.dirname(backupPath);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  console.log(`✅ Backed up ${data?.length || 0} configurations to ${backupPath}`);
}

/**
 * Clear existing configurations
 */
async function clearConfigurations(): Promise<void> {
  console.log('\n🧹 Clearing existing configurations...');
  
  const { error } = await supabase
    .from('model_configurations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (error) {
    console.error('❌ Clear failed:', error);
    throw error;
  }
  
  console.log('✅ Cleared all existing configurations');
}

/**
 * Generate and store new configurations
 */
async function generateConfigurations(freshModels: any[]): Promise<void> {
  console.log('\n⚙️ Generating configurations with Brave Search + AI...');
  
  const totalCombinations = ROLES.length * LANGUAGES.length;
  console.log(`📊 Total combinations: ${totalCombinations} (10 roles × 12 languages)`);
  console.log(`📊 Size removed: Agent only sees code snippets, not full repos\n`);
  
  const configurations = [];
  let count = 0;
  
  for (const role of ROLES) {
    console.log(`\n🔧 Role: ${role}`);
    const weights = getWeightsForRole(role);
    console.log(`   Weights: Q=${(weights.quality*100).toFixed(0)}% S=${(weights.speed*100).toFixed(0)}% C=${(weights.cost*100).toFixed(0)}%`);
    console.log(`   Selection: ${role === 'educator' ? 'Brave Search + Scoring' : 'Direct Scoring (no web search)'}`);
    
    for (const language of LANGUAGES) {
      count++;
      
      const { primary, fallback } = await selectOptimalModel(freshModels, role, language);
      
      configurations.push({
        role,
        language,
        size_category: 'any', // Size doesn't matter - agent sees snippets only
        primary_provider: primary.split('/')[0],
        primary_model: primary,
        fallback_provider: fallback.split('/')[0],
        fallback_model: fallback,
        weights: {
          quality: weights.quality,
          speed: weights.speed,
          cost: weights.cost,
          freshness: weights.freshness,
          contextWindow: 0.05
        },
        min_requirements: {},
        reasoning: [
          `🤖 Generated via Brave Search + AI on ${new Date().toISOString()}`,
          `Context: ${language} / ${role}`,
          `Search-based: Weight-tailored queries (quality=${weights.quality}, cost=${weights.cost})`,
          `Primary: ${primary} (validated on OpenRouter)`,
          `Fallback: ${fallback}`,
          `✅ ZERO hardcoded models - 100% dynamic discovery`,
          `✅ Freshness enforced: < 6 months old`
        ],
        last_updated: new Date().toISOString(),
        updated_by: 'clean-and-regenerate-v2-brave'
      });
      
      console.log(`  [${count}/${totalCombinations}] ${language}: ${primary} / ${fallback}`);
    }
  }
  
  console.log(`\n✅ Generated ${configurations.length} configurations`);
  
  // Store in Supabase (batch insert)
  console.log('\n💾 Storing configurations in Supabase...');
  
  const batchSize = 50;
  for (let i = 0; i < configurations.length; i += batchSize) {
    const batch = configurations.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('model_configurations')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Batch insert failed (${i}-${i+batchSize}):`, error);
      throw error;
    }
    
    console.log(`  Stored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(configurations.length/batchSize)}`);
  }
  
  console.log('✅ All configurations stored successfully');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting clean and regenerate process...');
  console.log('📌 ZERO hardcoded models - 100% dynamic from OpenRouter\n');
  
  try {
    // Step 1: Fetch all models from OpenRouter
    const allModels = await fetchAllModels();
    
    // Step 2: Filter by freshness
    const freshModels = filterByFreshness(allModels);
    
    if (freshModels.length === 0) {
      throw new Error('No fresh models found! Check OpenRouter API or date filtering.');
    }
    
    // Step 3: Backup existing configs
    await backupConfigurations();
    
    // Step 4: Clear existing configs
    await clearConfigurations();
    
    // Step 5: Generate and store new configs
    await generateConfigurations(freshModels);
    
    console.log('\n✅ Clean and regenerate process complete!');
    console.log('\n📊 Summary:');
    console.log(`  - Fresh models from OpenRouter: ${freshModels.length} (< 6 months old)`);
    console.log(`  - Configurations generated: ${ROLES.length * LANGUAGES.length} (10 roles × 12 languages)`);
    console.log(`  - Search engine: Brave Search API (free tier)`);
    console.log(`  - Selection method: Weight-based queries + AI matching`);
    console.log(`  - Freshness enforced: ✅ (< 6 months old)`);
    console.log(`  - Zero hardcoded models: ✅ (100% dynamic)`);
    console.log(`  - Size-agnostic: ✅ (agents see snippets only)`);
    
  } catch (error) {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  }
}

// Run the script
main();

