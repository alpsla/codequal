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
// QUALITY/SPEED ESTIMATES
// ============================================================================

// Quality scores based on benchmarks and real-world performance
const MODEL_QUALITY_ESTIMATES: Record<string, number> = {
  // Top tier (90+)
  'anthropic/claude-sonnet-4': 95,
  'anthropic/claude-3.5-sonnet': 93,
  'openai/gpt-4o': 92,
  'google/gemini-2.5-pro': 91,
  'google/gemini-2.0-flash-thinking': 90,

  // High quality (80-89)
  'google/gemini-2.5-flash': 88,
  'openai/gpt-4o-mini': 85,
  'deepseek/deepseek-coder': 84,
  'qwen/qwen-2.5-coder-32b': 83,
  'mistral/mistral-large': 82,

  // Good quality (70-79)
  'qwen/qwen3-coder-flash': 78,
  'qwen/qwen2.5-coder-7b-instruct': 76,
  'google/gemini-2.0-flash': 80,
  'meta-llama/llama-3.1-70b': 77,

  // Acceptable (60-69)
  'qwen/qwen3-coder:free': 72,  // Free tier, slightly lower quality
  'google/gemini-2.0-flash-exp:free': 75,
  'meta-llama/llama-3.1-8b': 65,
};

// Speed scores (higher = faster, based on typical latency)
const MODEL_SPEED_ESTIMATES: Record<string, number> = {
  // Ultra-fast (90+)
  'google/gemini-2.0-flash': 95,
  'google/gemini-2.5-flash': 93,
  'google/gemini-2.0-flash-exp:free': 92,
  'openai/gpt-4o-mini': 90,

  // Fast (80-89)
  'qwen/qwen3-coder-flash': 88,
  'qwen/qwen2.5-coder-7b-instruct': 87,
  'qwen/qwen3-coder:free': 85,
  'meta-llama/llama-3.1-8b': 88,

  // Medium (70-79)
  'openai/gpt-4o': 75,
  'anthropic/claude-3.5-sonnet': 72,
  'deepseek/deepseek-coder': 78,

  // Slower (60-69)
  'anthropic/claude-sonnet-4': 68,
  'google/gemini-2.5-pro': 65,
  'mistral/mistral-large': 70,
  'meta-llama/llama-3.1-70b': 60,
};

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
   * Get quality score for a model (from estimates or heuristics)
   */
  getQualityScore(modelId: string): number {
    // Check if we have an estimate
    for (const [pattern, score] of Object.entries(MODEL_QUALITY_ESTIMATES)) {
      if (modelId.toLowerCase().includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(modelId.toLowerCase())) {
        return score;
      }
    }

    // Heuristic-based scoring
    const idLower = modelId.toLowerCase();

    if (idLower.includes('opus') || idLower.includes('sonnet-4')) return 90;
    if (idLower.includes('gpt-4o') && !idLower.includes('mini')) return 88;
    if (idLower.includes('gemini-2.5-pro')) return 88;
    if (idLower.includes('coder') || idLower.includes('code')) return 75;
    if (idLower.includes('mini') || idLower.includes('flash')) return 70;
    if (idLower.includes('70b')) return 75;
    if (idLower.includes('32b')) return 72;
    if (idLower.includes('8b') || idLower.includes('7b')) return 65;

    return 60; // Default for unknown models
  }

  /**
   * Get speed score for a model (from estimates or heuristics)
   */
  getSpeedScore(modelId: string): number {
    // Check if we have an estimate
    for (const [pattern, score] of Object.entries(MODEL_SPEED_ESTIMATES)) {
      if (modelId.toLowerCase().includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(modelId.toLowerCase())) {
        return score;
      }
    }

    // Heuristic-based scoring
    const idLower = modelId.toLowerCase();

    if (idLower.includes('flash')) return 90;
    if (idLower.includes('mini')) return 88;
    if (idLower.includes('8b') || idLower.includes('7b')) return 85;
    if (idLower.includes('32b')) return 70;
    if (idLower.includes('70b')) return 60;
    if (idLower.includes('opus') || idLower.includes('large')) return 55;
    if (idLower.includes('pro')) return 65;

    return 70; // Default
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

    // Get scores
    const qualityScore = this.getQualityScore(model.id);
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
   * Update Supabase model_configs table
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

    console.log('\n💾 Updating Supabase model_configs...');

    for (const config of roleConfigs) {
      if (!config.best_model) continue;

      try {
        const { error } = await this.supabase
          .from('model_configs')
          .upsert({
            role: config.role,
            model_id: config.best_model.model_id,
            provider: config.best_model.provider,
            quality_score: config.best_model.quality_score,
            speed_score: config.best_model.speed_score,
            cost_score: config.best_model.cost_score,
            final_score: config.best_model.final_score,
            price_per_million: config.best_model.price_per_million,
            weights: config.weights,
            updated_at: new Date().toISOString(),
            research_type: 'monthly_refresh',
          }, { onConflict: 'role' });

        if (error) {
          console.warn(`   ⚠️ Failed to update ${config.role}: ${error.message}`);
        } else {
          console.log(`   ✅ Updated ${config.role}: ${config.best_model.model_id}`);
        }
      } catch (err) {
        console.warn(`   ⚠️ Error updating ${config.role}:`, err);
      }
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
