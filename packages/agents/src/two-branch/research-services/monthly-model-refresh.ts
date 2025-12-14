/**
 * Monthly Model Refresh Service
 *
 * Uses OpenRouter API as the single source of truth for model pricing.
 * Applies role-specific weights to calculate final scores and updates Supabase.
 *
 * Key learnings from research:
 * - Brave Search is unreliable (excludes Chinese models like Qwen)
 * - OpenRouter API provides real-time pricing data
 * - Model pricing changes quickly (models that were $0.15/M are now FREE)
 *
 * Schedule: Monthly (models change pricing frequently)
 *
 * Usage:
 *   npx ts-node src/two-branch/research-services/monthly-model-refresh.ts
 *   npx ts-node monthly-model-refresh.ts --dry-run  # Preview without DB updates
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// ============================================================================
// TYPES
// ============================================================================

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;  // Price per token (in dollars)
    completion: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  top_provider?: {
    is_moderated: boolean;
    context_length: number;
  };
  created?: number;  // Unix timestamp
}

interface ScoredModel {
  model_id: string;
  provider: string;
  name: string;
  quality_score: number;
  speed_score: number;
  cost_score: number;
  final_score: number;
  price_per_million: number;
  context_length: number;
  calculation: string;
}

interface RoleConfig {
  role: string;
  weights: { quality: number; speed: number; cost: number };
  best_model: ScoredModel | null;
  all_candidates: ScoredModel[];
}

// ============================================================================
// ROLE WEIGHTS (from model-researcher-service.ts getRoleWeights())
// ============================================================================

const ANALYSIS_ROLE_WEIGHTS: Record<string, { quality: number; speed: number; cost: number }> = {
  // Analysis roles: Cost-focused (tools do heavy lifting, models explain)
  security:     { quality: 0.35, speed: 0.30, cost: 0.35 },
  performance:  { quality: 0.30, speed: 0.35, cost: 0.35 },
  code_quality: { quality: 0.35, speed: 0.30, cost: 0.35 },
  architecture: { quality: 0.35, speed: 0.30, cost: 0.35 },
  dependency:   { quality: 0.30, speed: 0.35, cost: 0.35 },
};

const META_ROLE_WEIGHTS: Record<string, { quality: number; speed: number; cost: number }> = {
  // Meta roles: Quality/speed focused
  educator:        { quality: 0.65, speed: 0.25, cost: 0.10 },
  orchestrator:    { quality: 0.60, speed: 0.30, cost: 0.10 },
  comparator:      { quality: 0.30, speed: 0.60, cost: 0.10 },
  location_finder: { quality: 0.20, speed: 0.70, cost: 0.10 },
  researcher:      { quality: 0.50, speed: 0.40, cost: 0.10 },
};

const AI_FIXER_ROLE_WEIGHTS: Record<string, { quality: number; speed: number; cost: number }> = {
  // AI Fixer roles: Quality-focused for accurate code fixes
  // ai_fixer: Polyglot model for Java, JavaScript, TypeScript, Python, Go
  ai_fixer:      { quality: 0.50, speed: 0.30, cost: 0.20 },
  // ai_fixer_rust: Higher quality weight for Rust-specific complexity
  ai_fixer_rust: { quality: 0.60, speed: 0.20, cost: 0.20 },
};

// ============================================================================
// DYNAMIC QUALITY/SPEED SCORING (No hardcoded model estimates)
// ============================================================================
//
// Models are scored dynamically based on:
// 1. Quality: context_length, model tier patterns (opus/sonnet/pro/mini/flash/coder)
// 2. Speed: Model size patterns (70b/32b/8b/flash/mini)
// 3. Cost: Live pricing from OpenRouter API
//
// This approach allows the researcher to evaluate ANY model without needing
// to manually add quality estimates for new models.
// ============================================================================

// ============================================================================
// MONTHLY MODEL REFRESH SERVICE
// ============================================================================

export class MonthlyModelRefreshService {
  private supabase: any;
  private dryRun: boolean;

  constructor(options?: { dryRun?: boolean }) {
    this.dryRun = options?.dryRun ?? false;

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
  }

  /**
   * Fetch all available models from OpenRouter API
   */
  async fetchModelsFromOpenRouter(): Promise<OpenRouterModel[]> {
    console.log('📡 Fetching models from OpenRouter API...');

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json() as { data: OpenRouterModel[] };
      console.log(`✅ Fetched ${data.data.length} models from OpenRouter`);

      return data.data;
    } catch (error) {
      console.error('❌ Failed to fetch from OpenRouter:', error);
      return [];
    }
  }

  /**
   * Filter models relevant for code analysis
   */
  filterCodeAnalysisModels(models: OpenRouterModel[]): OpenRouterModel[] {
    const codeKeywords = ['code', 'coder', 'instruct', 'chat'];
    const excludePatterns = [
      'vision', 'image', 'audio', 'video', 'embedding',
      'whisper', 'dall-e', 'stable-diffusion'
    ];

    return models.filter(model => {
      const idLower = model.id.toLowerCase();
      const nameLower = (model.name || '').toLowerCase();

      // Exclude non-text models
      if (excludePatterns.some(p => idLower.includes(p) || nameLower.includes(p))) {
        return false;
      }

      // Include models good for code
      const isCodeModel = codeKeywords.some(k => idLower.includes(k) || nameLower.includes(k));
      const isMainstreamProvider = ['openai', 'anthropic', 'google', 'meta', 'mistral', 'qwen', 'deepseek'].some(
        p => idLower.startsWith(p)
      );

      return isCodeModel || isMainstreamProvider;
    });
  }

  /**
   * Calculate cost score (0-100, higher = cheaper)
   */
  calculateCostScore(pricePerMillion: number): number {
    // Score mapping based on price tiers
    if (pricePerMillion === 0) return 100;  // FREE
    if (pricePerMillion < 0.10) return 95;  // Very cheap
    if (pricePerMillion < 0.50) return 85;  // Cheap
    if (pricePerMillion < 1.00) return 75;  // Affordable
    if (pricePerMillion < 3.00) return 60;  // Moderate
    if (pricePerMillion < 10.00) return 40; // Expensive
    if (pricePerMillion < 20.00) return 20; // Very expensive
    return 10;  // Premium tier
  }

  /**
   * Get quality score for a model (fully dynamic - no hardcoded estimates)
   *
   * Scoring based on:
   * - Model tier patterns (opus/sonnet/pro/mini/flash/coder)
   * - Model size patterns (70b/32b/8b)
   * - Context length capability
   */
  getQualityScore(modelId: string, contextLength?: number): number {
    const idLower = modelId.toLowerCase();
    let score = 60; // Base score for unknown models

    // ==========================================================================
    // TIER-BASED SCORING (from model name patterns)
    // ==========================================================================

    // Top tier models (opus, o1, sonnet-4)
    if (idLower.includes('opus') || idLower.includes('o1-') || idLower.includes('sonnet-4')) {
      score = 92;
    }
    // High tier (sonnet, gpt-4o, gemini-pro)
    else if (idLower.includes('sonnet') || (idLower.includes('gpt-4o') && !idLower.includes('mini')) || idLower.includes('gemini-2.5-pro')) {
      score = 88;
    }
    // Code-specialized (coder models)
    else if (idLower.includes('coder') || idLower.includes('codestral')) {
      score = 80;
    }
    // Mid-tier (gpt-4-turbo, gemini-flash, etc.)
    else if (idLower.includes('turbo') || idLower.includes('gemini-2.5-flash') || idLower.includes('gemini-2.0-flash')) {
      score = 80;
    }
    // Fast/Mini models (still capable, just faster)
    else if (idLower.includes('mini') || idLower.includes('flash') || idLower.includes('haiku')) {
      score = 75;
    }

    // ==========================================================================
    // SIZE-BASED ADJUSTMENTS
    // ==========================================================================
    // Extract size from model name (e.g., "70b", "32b", "8b")
    const sizeMatch = idLower.match(/(\d+)b/);
    if (sizeMatch) {
      const sizeB = parseInt(sizeMatch[1], 10);
      if (sizeB >= 70) score = Math.max(score, 82);      // 70B+ models
      else if (sizeB >= 30) score = Math.max(score, 78); // 30-69B models (includes MoE)
      else if (sizeB >= 14) score = Math.max(score, 72); // 14-29B models
      else if (sizeB >= 7) score = Math.max(score, 68);  // 7-13B models
    }

    // ==========================================================================
    // CONTEXT LENGTH BONUS
    // ==========================================================================
    if (contextLength) {
      if (contextLength >= 200000) score += 5;      // 200K+ context
      else if (contextLength >= 128000) score += 3; // 128K context
      else if (contextLength >= 64000) score += 1;  // 64K context
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get speed score for a model (fully dynamic - no hardcoded estimates)
   *
   * Scoring based on:
   * - Speed-focused patterns (flash, mini, haiku, lite)
   * - Model size inverse relationship (smaller = faster)
   * - Expensive/heavy patterns (opus, large, pro)
   */
  getSpeedScore(modelId: string): number {
    const idLower = modelId.toLowerCase();
    let score = 70; // Base score

    // ==========================================================================
    // SPEED-FOCUSED MODEL PATTERNS
    // ==========================================================================

    // Ultra-fast models
    if (idLower.includes('flash') || idLower.includes('lite')) {
      score = 95;
    }
    // Fast models
    else if (idLower.includes('mini') || idLower.includes('haiku') || idLower.includes('instant')) {
      score = 90;
    }
    // Standard models
    else if (idLower.includes('sonnet') || idLower.includes('turbo')) {
      score = 75;
    }
    // Slower models
    else if (idLower.includes('opus') || idLower.includes('large') || idLower.includes('pro')) {
      score = 60;
    }

    // ==========================================================================
    // SIZE-BASED ADJUSTMENTS (smaller = faster)
    // ==========================================================================
    const sizeMatch = idLower.match(/(\d+)b/);
    if (sizeMatch) {
      const sizeB = parseInt(sizeMatch[1], 10);
      if (sizeB <= 8) score = Math.max(score, 88);        // 8B or smaller
      else if (sizeB <= 14) score = Math.max(score, 82);  // 8-14B
      else if (sizeB <= 32) score = Math.max(score, 75);  // 14-32B
      else if (sizeB <= 70) score = Math.min(score, 65);  // 32-70B (cap speed)
      else score = Math.min(score, 55);                   // 70B+ (cap speed)
    }

    // ==========================================================================
    // MoE BONUS (Mixture of Experts = faster inference)
    // ==========================================================================
    if (idLower.includes('moe') || idLower.includes('mixtral')) {
      score += 8; // MoE models are faster despite parameter count
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Score a model for a specific role using role weights
   */
  scoreModelForRole(
    model: OpenRouterModel,
    weights: { quality: number; speed: number; cost: number }
  ): ScoredModel {
    // Calculate price per million tokens (average of prompt + completion)
    const promptPrice = parseFloat(model.pricing.prompt) * 1_000_000;
    const completionPrice = parseFloat(model.pricing.completion) * 1_000_000;
    const pricePerMillion = (promptPrice + completionPrice) / 2;

    // Get scores (all derived dynamically from model metadata)
    const qualityScore = this.getQualityScore(model.id, model.context_length);
    const speedScore = this.getSpeedScore(model.id);
    const costScore = this.calculateCostScore(pricePerMillion);

    // Calculate weighted final score
    const finalScore = (
      (qualityScore * weights.quality) +
      (speedScore * weights.speed) +
      (costScore * weights.cost)
    );

    // Extract provider from model ID
    const provider = model.id.split('/')[0];

    return {
      model_id: model.id,
      provider,
      name: model.name || model.id,
      quality_score: Math.round(qualityScore),
      speed_score: Math.round(speedScore),
      cost_score: Math.round(costScore),
      final_score: Math.round(finalScore * 10) / 10,
      price_per_million: Math.round(pricePerMillion * 100) / 100,
      context_length: model.context_length,
      calculation: `(${qualityScore} * ${weights.quality}) + (${speedScore} * ${weights.speed}) + (${costScore} * ${weights.cost}) = ${finalScore.toFixed(1)}`,
    };
  }

  /**
   * Find best model for each role
   */
  async findBestModelsForRoles(
    models: OpenRouterModel[],
    roleWeights: Record<string, { quality: number; speed: number; cost: number }>
  ): Promise<RoleConfig[]> {
    const results: RoleConfig[] = [];

    for (const [role, weights] of Object.entries(roleWeights)) {
      console.log(`\n📊 Scoring models for ${role.toUpperCase()} (q=${weights.quality}, s=${weights.speed}, c=${weights.cost})`);

      // Score all models for this role
      const scoredModels = models.map(model => this.scoreModelForRole(model, weights));

      // Sort by final score (descending)
      scoredModels.sort((a, b) => b.final_score - a.final_score);

      // Get top 5 candidates
      const topCandidates = scoredModels.slice(0, 5);

      console.log(`   Top candidates:`);
      topCandidates.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.model_id}`);
        console.log(`      Q:${m.quality_score} S:${m.speed_score} C:${m.cost_score} → Final: ${m.final_score}`);
        console.log(`      Price: $${m.price_per_million}/M tokens`);
      });

      results.push({
        role,
        weights,
        best_model: topCandidates[0] || null,
        all_candidates: topCandidates,
      });
    }

    return results;
  }

  /**
   * Update Supabase model_configurations table
   *
   * IMPORTANT: The actual table is 'model_configurations' (not 'model_configs')
   * Schema: role, language, size_category, primary_model, fallback_model, weights, reasoning, etc.
   */
  async updateModelConfigs(roleConfigs: RoleConfig[]): Promise<void> {
    if (this.dryRun) {
      console.log('\n📋 DRY RUN - Would update the following configs:');
      for (const config of roleConfigs) {
        if (config.best_model) {
          console.log(`   ${config.role}: ${config.best_model.model_id} (score: ${config.best_model.final_score})`);
        }
      }
      return;
    }

    if (!this.supabase) {
      console.warn('⚠️ Supabase not configured, skipping database update');
      return;
    }

    console.log('\n💾 Updating Supabase model_configurations...');

    // Languages to update for each role
    const languages = [
      'typescript', 'javascript', 'python', 'java',
      'go', 'rust', 'ruby', 'php', 'csharp',
      'c', 'cpp', 'swift', 'kotlin', 'generic'
    ];

    for (const config of roleConfigs) {
      if (!config.best_model) continue;

      // BUG-101 FIX: Fallback model should NEVER be free
      // Free models share rate limits (free-models-per-min), so if primary hits limit,
      // free fallback will also be rate limited. Always use a PAID fallback.
      //
      // Strategy: Pick 2nd best PAID model from candidates, or default to gpt-4o-mini
      const paidCandidates = config.all_candidates.filter(m =>
        m.price_per_million > 0 && m.model_id !== config.best_model!.model_id
      );
      const secondBestPaid = paidCandidates.length > 0 ? paidCandidates[0] : null;

      // Default paid fallback if no other paid candidates
      const fallbackModel = secondBestPaid?.model_id || 'openai/gpt-4o-mini';

      // Update for each language
      for (const language of languages) {
        try {
          // BUG-101 FIX: Get provider from secondBestPaid or default
          const fallbackProvider = secondBestPaid?.provider || 'openai';

          const { error } = await this.supabase
            .from('model_configurations')  // CORRECT TABLE NAME
            .upsert({
              role: config.role,
              language: language,
              size_category: 'any',
              primary_provider: config.best_model.provider,
              primary_model: config.best_model.model_id,
              fallback_provider: fallbackProvider,
              fallback_model: fallbackModel,
              weights: {
                ...config.weights,
                freshness: 0,
                contextWindow: 0.05
              },
              min_requirements: {},
              reasoning: [
                `🔄 Monthly refresh ${new Date().toISOString().split('T')[0]}`,
                `Source: OpenRouter API`,
                `Primary: ${config.best_model.model_id} ($${config.best_model.price_per_million}/M)`,
                `Fallback: ${fallbackModel} (${secondBestPaid ? `$${secondBestPaid.price_per_million}/M` : 'default paid'})`,
                `Score: ${config.best_model.final_score} (Q:${config.best_model.quality_score} S:${config.best_model.speed_score} C:${config.best_model.cost_score})`
              ],
              last_updated: new Date().toISOString(),
              updated_by: 'monthly-model-refresh'
            }, {
              onConflict: 'role,language,size_category',
              ignoreDuplicates: false
            });

          if (error) {
            console.warn(`   ⚠️ Failed to update ${config.role}/${language}: ${error.message}`);
          }
        } catch (err: any) {
          console.warn(`   ⚠️ Error updating ${config.role}/${language}:`, err.message);
        }
      }

      console.log(`   ✅ Updated ${config.role}: ${config.best_model.model_id} → fallback: ${fallbackModel} (${languages.length} languages)`);
    }
  }

  /**
   * Run monthly model refresh
   */
  async runRefresh(): Promise<{
    analysisRoles: RoleConfig[];
    metaRoles: RoleConfig[];
    aiFixerRoles: RoleConfig[];
  }> {
    console.log('🔄 Monthly Model Refresh');
    console.log('='.repeat(60));
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('');

    // Step 1: Fetch models from OpenRouter
    const allModels = await this.fetchModelsFromOpenRouter();
    if (allModels.length === 0) {
      throw new Error('No models fetched from OpenRouter');
    }

    // Step 2: Filter for code analysis relevant models
    const codeModels = this.filterCodeAnalysisModels(allModels);
    console.log(`📋 Filtered to ${codeModels.length} code-relevant models`);

    // Step 3: Find best models for analysis roles
    console.log('\n' + '='.repeat(60));
    console.log('📊 ANALYSIS ROLES (cost-focused)');
    console.log('='.repeat(60));
    const analysisRoles = await this.findBestModelsForRoles(codeModels, ANALYSIS_ROLE_WEIGHTS);

    // Step 4: Find best models for meta roles
    console.log('\n' + '='.repeat(60));
    console.log('📊 META ROLES (quality/speed-focused)');
    console.log('='.repeat(60));
    const metaRoles = await this.findBestModelsForRoles(codeModels, META_ROLE_WEIGHTS);

    // Step 5: Find best models for AI fixer roles
    console.log('\n' + '='.repeat(60));
    console.log('📊 AI FIXER ROLES (quality-focused for accurate code fixes)');
    console.log('='.repeat(60));
    const aiFixerRoles = await this.findBestModelsForRoles(codeModels, AI_FIXER_ROLE_WEIGHTS);

    // Step 6: Update Supabase
    await this.updateModelConfigs([...analysisRoles, ...metaRoles, ...aiFixerRoles]);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 MONTHLY REFRESH SUMMARY');
    console.log('='.repeat(60));

    console.log('\n🔧 Analysis Roles (tools do heavy lifting → use cheap models):');
    for (const config of analysisRoles) {
      if (config.best_model) {
        console.log(`   ${config.role.padEnd(14)}: ${config.best_model.model_id}`);
        console.log(`                   Score: ${config.best_model.final_score} | $${config.best_model.price_per_million}/M`);
      }
    }

    console.log('\n🎯 Meta Roles (quality/speed focused):');
    for (const config of metaRoles) {
      if (config.best_model) {
        console.log(`   ${config.role.padEnd(14)}: ${config.best_model.model_id}`);
        console.log(`                   Score: ${config.best_model.final_score} | $${config.best_model.price_per_million}/M`);
      }
    }

    console.log('\n🔨 AI Fixer Roles (quality-focused for accurate code fixes):');
    for (const config of aiFixerRoles) {
      if (config.best_model) {
        console.log(`   ${config.role.padEnd(14)}: ${config.best_model.model_id}`);
        console.log(`                   Score: ${config.best_model.final_score} | $${config.best_model.price_per_million}/M`);
      }
    }

    console.log('\n✅ Monthly refresh complete!');

    return { analysisRoles, metaRoles, aiFixerRoles };
  }
}

// ============================================================================
// CLI RUNNER
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const service = new MonthlyModelRefreshService({ dryRun });

  try {
    await service.runRefresh();
  } catch (error) {
    console.error('❌ Monthly refresh failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { ANALYSIS_ROLE_WEIGHTS, META_ROLE_WEIGHTS, AI_FIXER_ROLE_WEIGHTS };
