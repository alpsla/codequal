"use strict";
/**
 * Model Researcher Service
 *
 * Responsibilities:
 * 1. Research and evaluate latest AI models quarterly
 * 2. Store model configurations in Supabase
 * 3. Provide cached model selections for different contexts
 * 4. Handle orchestrator requests for specific context research
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelResearcherService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const axios_1 = __importDefault(require("axios"));
class ModelResearcherService {
    constructor() {
        this.RESEARCH_INTERVAL_DAYS = 90; // Quarterly
        this.QUALITY_WEIGHT = 0.70;
        this.SPEED_WEIGHT = 0.20;
        this.PRICE_WEIGHT = 0.10;
        this.MAX_SEARCH_ITERATIONS = 3;
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        // Use same BRAVE_API_KEY as EducationalSearchService and RuleBasedToolResearcher
        this.braveApiKey = process.env.BRAVE_API_KEY;
    }
    /**
     * Get optimal model for context - uses cached research from Supabase
     */
    async getOptimalModelForContext(context) {
        try {
            // Query Supabase for best model based on context (no quarterly check!)
            // Quarterly research should ONLY run via scheduled cron job, NOT on-demand
            const { data, error } = await this.supabase
                .from('model_research')
                .select('*')
                .contains('optimal_for->languages', [context.language])
                .contains('optimal_for->repo_sizes', [context.repo_size])
                .order('quality_score', { ascending: false })
                .limit(1)
                .single();
            if (error || !data) {
                // Context not found in research, request SPECIFIC research for this context only
                console.log(`Context not found: ${context.language}/${context.repo_size}, requesting specific research...`);
                return await this.requestSpecificContextResearch(context);
            }
            return data.model_id;
        }
        catch (error) {
            console.error('Error getting optimal model:', error);
            return this.getFallbackModel(context);
        }
    }
    /**
     * Check if research data is fresh (within quarterly window)
     */
    async checkResearchFreshness() {
        const { data, error } = await this.supabase
            .from('model_research_metadata')
            .select('last_research_date')
            .single();
        if (error || !data)
            return false;
        const lastResearchDate = new Date(data.last_research_date);
        const daysSinceResearch = (Date.now() - lastResearchDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceResearch < this.RESEARCH_INTERVAL_DAYS;
    }
    /**
     * Conduct quarterly research on all available models
     * This should be scheduled to run every 90 days
     *
     * NO WEB SEARCH - Use OpenRouter catalog as single source of truth
     * Filter by freshness (<6 months old) to meet user requirements
     */
    async conductQuarterlyResearch() {
        console.log('🔬 Starting quarterly model research...');
        console.log('📌 Using OpenRouter as single source of truth (no web search)');
        try {
            // STEP 1: Fetch ALL models from OpenRouter (single source of truth)
            console.log('🔍 Step 1: Fetching all models from OpenRouter...');
            const allModels = await this.fetchAvailableModels();
            console.log(`✅ Fetched ${allModels.length} total models from OpenRouter`);
            // STEP 2: Filter by freshness (< 6 months old)
            console.log('📅 Step 2: Filtering by freshness (<6 months old)...');
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const freshModels = allModels.filter(model => {
                if (!model.created)
                    return false;
                const createdDate = new Date(model.created * 1000);
                const isFresh = createdDate > sixMonthsAgo;
                return isFresh;
            });
            console.log(`✅ Found ${freshModels.length} models released in last 6 months`);
            // STEP 3: Research each fresh model
            console.log('📊 Step 3: Researching fresh models...');
            const researchResults = [];
            for (const model of freshModels) {
                const research = await this.researchModel(model);
                researchResults.push(research);
            }
            // STEP 4: Store research results in Supabase
            console.log('💾 Step 4: Storing research results...');
            await this.storeResearchResults(researchResults);
            // Update metadata
            await this.updateResearchMetadata();
            console.log(`✅ Quarterly research complete. Evaluated ${researchResults.length} fresh models.`);
        }
        catch (error) {
            console.error('Error conducting quarterly research:', error);
            throw error;
        }
    }
    /**
     * Search the web for latest AI models using Brave Search API
     * Same pattern as EducationalSearchService and RuleBasedToolResearcher
     *
     * Flow: Brave Search → AI Compilation → OpenRouter Validation
     */
    async searchWebForLatestModels() {
        console.log('🌐 Searching web for latest AI models using Brave Search...');
        if (!this.braveApiKey) {
            console.warn('⚠️ BRAVE_API_KEY not set - falling back to OpenRouter catalog only');
            return [];
        }
        try {
            // Get current date for search
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
            // Calculate date ranges dynamically
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
            // Get month names for search queries
            const lastThreeMonths = [];
            for (let i = 0; i < 3; i++) {
                const d = new Date();
                d.setMonth(currentDate.getMonth() - i);
                lastThreeMonths.push(d.toLocaleString('default', { month: 'long' }));
            }
            // Dynamic search queries using current date
            const searchQueries = [
                `latest AI language models released ${currentYear} ${currentMonth}`,
                `newest LLM models ${currentYear} last 3 months release dates`,
                `AI models released ${currentYear} ${lastThreeMonths.join(' ')} latest versions`,
                `${currentYear} AI model releases Anthropic OpenAI Google Meta Microsoft`,
                `state of the art language models ${currentYear} benchmark scores recent`,
                `LLM comparison ${currentYear} latest versions performance coding`,
                `newest AI models ${currentYear} last 6 months capabilities`,
            ];
            // Step 1: Brave Search - collect all search results
            console.log('   🔍 Step 1: Running Brave searches...');
            const allSearchResults = [];
            for (const query of searchQueries.slice(0, 5)) { // Limit to 5 queries
                const results = await this.searchBrave(query);
                allSearchResults.push(...results);
                console.log(`      Found ${results.length} results for: "${query.substring(0, 50)}..."`);
            }
            console.log(`   ✅ Collected ${allSearchResults.length} search results`);
            // Step 2: AI Compilation - let AI analyze results and recommend models
            console.log('   🤖 Step 2: AI compilation of search results...');
            const discoveredModels = await this.aiCompileModelSearchResults(allSearchResults, currentYear);
            console.log(`   ✅ AI recommended ${discoveredModels.length} models`);
            // Step 3: Filter by date (last 6 months)
            const recentModels = discoveredModels.filter(model => {
                if (model.releaseDate) {
                    const releaseDate = new Date(model.releaseDate);
                    if (releaseDate < sixMonthsAgo) {
                        console.log(`   Filtering out ${model.model} - older than 6 months`);
                        return false;
                    }
                    if (releaseDate > currentDate) {
                        console.log(`   Filtering out ${model.model} - future date`);
                        return false;
                    }
                    return true;
                }
                return true; // Keep if no date for OpenRouter validation
            });
            console.log(`✅ Found ${recentModels.length} recent models from web search`);
            return recentModels;
        }
        catch (error) {
            console.error('Error searching web for models:', error);
            return [];
        }
    }
    /**
     * Perform web search using Brave Search API (same pattern as EducationalSearchService)
     */
    async searchBrave(query) {
        var _a;
        if (!this.braveApiKey) {
            return [];
        }
        try {
            const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&search_lang=en`;
            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${this.braveApiKey}`,
                },
            });
            if (!response.ok) {
                console.log(`      ⚠️ Brave search failed for query`);
                return [];
            }
            const data = await response.json();
            const results = (((_a = data.web) === null || _a === void 0 ? void 0 : _a.results) || []).map((r) => ({
                title: r.title || '',
                url: r.url || '',
                description: r.description || '',
            }));
            return results;
        }
        catch (error) {
            console.error(`      ❌ Search error:`, error);
            return [];
        }
    }
    /**
     * AI compiles search results to recommend best models
     * Can request additional searches if needed
     */
    async aiCompileModelSearchResults(searchResults, currentYear) {
        const searchContext = searchResults.length > 0
            ? searchResults.slice(0, 30).map(r => `- ${r.title}: ${r.description} (${r.url})`).join('\n')
            : '(No search results - use your training knowledge of current AI models)';
        const prompt = `
Analyze the following web search results to identify the BEST and NEWEST AI/LLM models for code analysis as of ${currentYear}.

**SEARCH RESULTS:**
${searchContext}

**YOUR TASK:**
1. Identify AI models mentioned that are suitable for code analysis
2. Focus on models released in the last 6 months
3. Consider: Anthropic (Claude), OpenAI (GPT), Google (Gemini), Meta (Llama), Mistral, DeepSeek, Qwen

**RESPOND WITH JSON (no markdown):**
{
  "models": [
    {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet",
      "version": "claude-3-5-sonnet-20241022",
      "releaseDate": "2024-10-22",
      "capabilities": ["coding", "analysis", "reasoning"],
      "notes": "Latest Claude model with improved coding"
    }
  ],
  "reasoning": "Brief explanation of why these models were selected"
}

Important:
- Only include models you're confident exist
- Use accurate release dates (YYYY-MM-DD format)
- Focus on models good for code analysis
- Include both flagship and cost-effective options
`;
        try {
            const { AIService } = await Promise.resolve().then(() => __importStar(require('../../standard/services/ai-service')));
            const aiService = new AIService({
                openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
            });
            const response = await aiService.call({
                id: 'google/gemini-2.0-flash-001',
                model: 'gemini-2.0-flash-001',
                provider: 'google',
            }, {
                systemPrompt: 'You are an AI model researcher. Analyze search results to identify the latest AI models suitable for code analysis. Return structured JSON.',
                prompt,
                temperature: 0.1,
                maxTokens: 2000,
            });
            // Parse AI response
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return [];
            }
            const result = JSON.parse(jsonMatch[0]);
            return result.models || [];
        }
        catch (error) {
            console.error('      ❌ AI compilation error:', error);
            return [];
        }
    }
    /**
     * Parse WebSearch results to extract model information
     * NO hardcoded model names - dynamically extract from search results
     */
    parseWebSearchResults(searchResults) {
        const models = [];
        if (!searchResults || typeof searchResults !== 'string') {
            return models;
        }
        // Generic patterns to find model information - NO specific model names
        const modelPatterns = [
            // Pattern: "Provider released ModelName on Date"
            /(\w+)\s+released\s+([A-Z][a-zA-Z0-9\-\s.]+)\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
            // Pattern: "ModelName from Provider"
            /([A-Z][a-zA-Z0-9\-\s.]+)\s+from\s+(\w+)/gi,
            // Pattern: "Provider's ModelName"
            /(\w+)'s\s+([A-Z][a-zA-Z0-9\-\s.]+)\s+model/gi,
            // Pattern: "new ModelName model"
            /new\s+([A-Z][a-zA-Z0-9\-\s.]+)\s+model/gi,
            // Pattern: "ModelName achieved X% on benchmark"
            /([A-Z][a-zA-Z0-9\-\s.]+)\s+achieved\s+\d+\.?\d*%/gi
        ];
        const datePatterns = [
            /released?\s+on\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
            /launched?\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
            /available\s+since\s+(\w+\s+\d{4})/gi,
            /(\w+\s+\d{4})\s+release/gi,
            /as\s+of\s+(\w+\s+\d{4})/gi
        ];
        // Extract all potential model mentions
        const foundModels = new Set();
        for (const pattern of modelPatterns) {
            let match;
            while ((match = pattern.exec(searchResults)) !== null) {
                // Extract model name and provider dynamically
                let modelName = '';
                let provider = '';
                if (match[2]) {
                    // Pattern had provider and model
                    provider = match[1].toLowerCase();
                    modelName = match[2].trim();
                }
                else if (match[1]) {
                    // Pattern had just model
                    modelName = match[1].trim();
                }
                if (modelName && !foundModels.has(modelName)) {
                    foundModels.add(modelName);
                    // Try to find associated date
                    let releaseDate = '';
                    for (const datePattern of datePatterns) {
                        const dateMatch = searchResults.match(datePattern);
                        if (dateMatch && dateMatch[1]) {
                            releaseDate = dateMatch[1];
                            break;
                        }
                    }
                    // Try to determine provider if not found
                    if (!provider) {
                        const providerPatterns = [
                            /anthropic/i,
                            /openai/i,
                            /google/i,
                            /meta/i,
                            /mistral/i,
                            /deepseek/i,
                            /cohere/i,
                            /ai21/i
                        ];
                        for (const providerPattern of providerPatterns) {
                            if (searchResults.match(providerPattern)) {
                                provider = providerPattern.source.replace(/\\/g, '');
                                break;
                            }
                        }
                    }
                    models.push({
                        provider: provider || 'unknown',
                        model: modelName.replace(/\s+/g, '-').toLowerCase(),
                        version: modelName,
                        releaseDate: releaseDate || new Date().toISOString().split('T')[0],
                        notes: 'Discovered via web search'
                    });
                }
            }
        }
        return models;
    }
    /**
     * Match web-discovered models with OpenRouter catalog
     * This validates that the models found on the web are available in OpenRouter
     */
    matchWebModelsWithOpenRouter(webModels, openRouterModels) {
        console.log('🔗 Matching web models with OpenRouter catalog...');
        const matched = [];
        const openRouterMap = new Map();
        // Create a map for quick lookup
        openRouterModels.forEach(model => {
            openRouterMap.set(model.id.toLowerCase(), model);
        });
        // Try to match each web model with OpenRouter
        for (const webModel of webModels) {
            const searchKeys = [
                `${webModel.provider}/${webModel.model}`.toLowerCase(),
                `${webModel.provider}/${webModel.version}`.toLowerCase(),
                webModel.model.toLowerCase()
            ];
            for (const key of searchKeys) {
                for (const [openRouterId, openRouterModel] of openRouterMap) {
                    if (openRouterId.includes(key) || key.includes(openRouterId.split('/')[1])) {
                        matched.push({
                            ...openRouterModel,
                            webDiscovery: webModel
                        });
                        console.log(`✅ Matched: ${openRouterModel.id}`);
                        break;
                    }
                }
            }
        }
        // If no web models matched, use all OpenRouter models
        if (matched.length === 0) {
            console.log('⚠️ No web matches found, using OpenRouter catalog');
            return openRouterModels;
        }
        return matched;
    }
    /**
     * Research a specific model's capabilities
     */
    async researchModel(model) {
        // Calculate scores based on model characteristics
        const qualityScore = this.calculateQualityScore(model);
        const speedScore = this.calculateSpeedScore(model);
        const priceScore = this.calculatePriceScore(model);
        // Determine optimal use cases
        const optimalFor = this.determineOptimalUseCases(model, qualityScore);
        return {
            id: `research_${model.id}_${Date.now()}`,
            model_id: model.id,
            provider: model.id.split('/')[0],
            quality_score: qualityScore,
            speed_score: speedScore,
            price_score: priceScore,
            context_length: model.context_length || 0,
            specializations: this.detectSpecializations(model),
            optimal_for: optimalFor,
            research_date: new Date(),
            next_research_date: new Date(Date.now() + (this.RESEARCH_INTERVAL_DAYS * 24 * 60 * 60 * 1000)),
            metadata: {
                pricing: model.pricing,
                architecture: model.architecture,
                training_date: model.training_date
            }
        };
    }
    /**
     * Request specific context research from orchestrator
     * Called when cached research doesn't cover the needed context
     */
    async requestSpecificContextResearch(context) {
        var _a;
        console.log(`🔍 Requesting specific research for context:`, context);
        // Notify orchestrator that specific research is needed
        const researchRequest = {
            type: 'SPECIFIC_MODEL_RESEARCH',
            context,
            priority: 'high',
            requester: 'ModelResearcherService',
            timestamp: new Date()
        };
        // Send request to orchestrator
        await this.notifyOrchestrator(researchRequest);
        // Conduct immediate research for this specific context
        const models = await this.fetchAvailableModels();
        const scoredModels = models.map(model => {
            const contextScore = this.calculateContextSpecificScore(model, context);
            const qualityScore = this.calculateQualityScore(model);
            return {
                model,
                totalScore: (contextScore * 0.5) + (qualityScore * 0.5)
            };
        });
        // Sort by score and get top 2 models (primary + fallback)
        scoredModels.sort((a, b) => b.totalScore - a.totalScore);
        const primaryModel = scoredModels[0].model;
        const fallbackModel = ((_a = scoredModels[1]) === null || _a === void 0 ? void 0 : _a.model) || scoredModels[0].model;
        const specificModel = await this.researchModel(primaryModel);
        // Store the specific research result
        await this.storeSpecificResearch(specificModel, context);
        // CRITICAL: Also create the config entry in model_configurations table
        await this.createConfigFromResearch(context, primaryModel.id, fallbackModel.id);
        return specificModel.model_id;
    }
    /**
     * Create a model configuration entry from research results
     */
    async createConfigFromResearch(context, primaryModelId, fallbackModelId) {
        console.log(`💾 Creating config entry: ${context.task_type}/${context.language}`);
        // Map task_type back to role if needed
        const role = context.task_type || 'security';
        // Get weights for this role
        const weights = this.getRoleWeights(role);
        const config = {
            role,
            language: context.language,
            size_category: 'any',
            primary_provider: primaryModelId.split('/')[0],
            primary_model: primaryModelId,
            fallback_provider: fallbackModelId.split('/')[0],
            fallback_model: fallbackModelId,
            weights: {
                quality: weights.quality,
                speed: weights.speed,
                cost: weights.cost,
                freshness: 0.0,
                contextWindow: 0.05
            },
            min_requirements: {},
            reasoning: [
                `🔍 On-demand research on ${new Date().toISOString()}`,
                `Context: ${context.language} / ${role}`,
                `Primary: ${primaryModelId} (researched for specific context)`,
                `Fallback: ${fallbackModelId}`,
                `✅ Dynamically generated when config was missing`
            ],
            last_updated: new Date().toISOString(),
            updated_by: 'on-demand-research'
        };
        const { error } = await this.supabase
            .from('model_configurations')
            .insert([config]);
        if (error) {
            console.error('❌ Error creating config entry:', error);
        }
        else {
            console.log(`✅ Config entry created: ${role}/${context.language}`);
        }
    }
    /**
     * Get role-specific weights for model selection
     */
    getRoleWeights(role) {
        const weights = {
            // ANALYSIS ROLES: Consistent cost-focused weights across all sizes/languages
            // Tools do heavy lifting (find issues) → Models just explain/suggest fixes → Use cheap models
            // These weights naturally select cost-effective models like gpt-4o-mini or qwen
            security: { quality: 0.35, speed: 0.30, cost: 0.35, freshness: 0.00 },
            performance: { quality: 0.30, speed: 0.35, cost: 0.35, freshness: 0.00 },
            code_quality: { quality: 0.35, speed: 0.30, cost: 0.35, freshness: 0.00 }, // Changed from 0.6/0.1/0.3
            architecture: { quality: 0.35, speed: 0.30, cost: 0.35, freshness: 0.00 }, // Changed from 0.7/0.2/0.1
            dependency: { quality: 0.30, speed: 0.35, cost: 0.35, freshness: 0.00 }, // Changed from 0.4/0.4/0.2
            // META ROLES: Preserve existing weights (unchanged)
            educator: { quality: 0.65, speed: 0.25, cost: 0.10, freshness: 0.00 },
            orchestrator: { quality: 0.60, speed: 0.30, cost: 0.10, freshness: 0.00 },
            comparator: { quality: 0.30, speed: 0.60, cost: 0.10, freshness: 0.00 },
            location_finder: { quality: 0.20, speed: 0.70, cost: 0.10, freshness: 0.00 },
            researcher: { quality: 0.50, speed: 0.40, cost: 0.10, freshness: 0.00 }
        };
        return weights[role] || { quality: 0.50, speed: 0.30, cost: 0.20, freshness: 0.00 };
    }
    /**
     * Research models for a specific context
     */
    async researchSpecificContext(context) {
        const models = await this.fetchAvailableModels();
        // Score models specifically for this context
        const scoredModels = models.map(model => {
            const contextScore = this.calculateContextSpecificScore(model, context);
            const qualityScore = this.calculateQualityScore(model);
            return {
                model,
                totalScore: (contextScore * 0.5) + (qualityScore * 0.5)
            };
        });
        // Sort by score and pick the best
        scoredModels.sort((a, b) => b.totalScore - a.totalScore);
        const bestModel = scoredModels[0].model;
        return this.researchModel(bestModel);
    }
    /**
     * Calculate context-specific score for a model
     */
    calculateContextSpecificScore(model, context) {
        let score = 50;
        const modelLower = model.id.toLowerCase();
        // Universal, language-agnostic scoring
        // Size/context signals
        if (context.repo_size === 'large' && model.context_length >= 128000)
            score += 20;
        if (context.repo_size === 'small' && modelLower.includes('mini'))
            score += 10;
        // Task signal (prefer non-chat models for code analysis)
        if ((context.task_type || '').includes('code') && !modelLower.includes('chat'))
            score += 10;
        // Universal cost alignment driven by role weights (no language special cases)
        const role = context.task_type || 'code_quality';
        const roleWeights = this.getRoleWeights(role);
        const costWeight = Math.max(0, Math.min(1, roleWeights.cost || 0));
        // Price-aware penalty (scaled by cost weight)
        if (model.pricing) {
            const promptPrice = parseFloat(model.pricing.prompt || '0');
            const completionPrice = parseFloat(model.pricing.completion || '0');
            const avgPrice = (promptPrice + completionPrice) / 2;
            if (avgPrice > 0) {
                const pricePenalty = Math.min(25, Math.round(avgPrice * 100 * (0.5 + costWeight)));
                score -= pricePenalty;
            }
        }
        // Premium tier penalty unless large-context requirement exists
        const looksPremium = /(opus|sonnet|pro|large)/.test(modelLower);
        const requiresLargeContext = context.repo_size === 'large' || model.context_length >= 128000;
        if (looksPremium && !requiresLargeContext) {
            const premiumPenalty = Math.round(10 * (0.5 + costWeight));
            score -= premiumPenalty;
        }
        return Math.min(100, Math.max(0, score));
    }
    /**
     * Store research results in Supabase
     */
    async storeResearchResults(results) {
        try {
            // Clear old research data
            await this.supabase
                .from('model_research')
                .delete()
                .lt('research_date', new Date(Date.now() - (this.RESEARCH_INTERVAL_DAYS * 2 * 24 * 60 * 60 * 1000)));
            // Insert new research data
            const { error } = await this.supabase
                .from('model_research')
                .upsert(results, { onConflict: 'model_id' });
            if (error) {
                console.warn('⚠️  model_research table not found (optional), skipping storage');
                // Don't throw - this table is optional, configs are what matters
            }
            else {
                console.log('✅ Research results stored in model_research table');
            }
        }
        catch (error) {
            console.warn('⚠️  Could not store to model_research table (optional)');
            // Continue - the important work is updating model_configurations
        }
    }
    /**
     * Store specific context research
     */
    async storeSpecificResearch(result, context) {
        // Store in a separate table for specific context research
        // Map the ModelResearchResult to the expected table columns
        const insertData = {
            model_id: result.model_id,
            context,
            research_type: 'specific',
            quality_score: result.quality_score,
            speed_score: result.speed_score,
            price_score: result.price_score,
            total_score: (result.quality_score + result.speed_score + result.price_score) / 3,
            research_date: new Date(),
            expires_at: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days expiry for specific research
            metadata: {
                provider: result.provider,
                context_length: result.context_length,
                specializations: result.specializations,
                optimal_for: result.optimal_for
            }
        };
        const { error } = await this.supabase
            .from('model_context_research')
            .insert(insertData);
        if (error) {
            console.error('Error storing specific research:', error);
            console.error('Insert data:', JSON.stringify(insertData, null, 2));
            // Don't throw, just log the error to continue with the research
            // The research result is still valid even if storage fails
        }
    }
    /**
     * Update research metadata
     */
    async updateResearchMetadata() {
        try {
            const { error } = await this.supabase
                .from('model_research_metadata')
                .upsert({
                id: 'singleton',
                last_research_date: new Date(),
                next_scheduled_research: new Date(Date.now() + (this.RESEARCH_INTERVAL_DAYS * 24 * 60 * 60 * 1000)),
                total_models_researched: await this.getModelCount(),
                research_version: '1.0.0'
            });
            if (error) {
                console.warn('⚠️  model_research_metadata table not found (optional)');
            }
            else {
                console.log('✅ Research metadata updated');
            }
        }
        catch (error) {
            console.warn('⚠️  Could not update research metadata (optional)');
        }
    }
    /**
     * Notify orchestrator about research needs
     */
    async notifyOrchestrator(request) {
        // This would typically send a message to the orchestrator service
        // For now, we'll log it
        console.log('📨 Notifying orchestrator:', request);
        // In production, this would be something like:
        // await this.orchestratorClient.notify(request);
    }
    /**
     * Fetch available models from OpenRouter API
     */
    async fetchAvailableModels() {
        try {
            const response = await axios_1.default.get('https://openrouter.ai/api/v1/models');
            const models = response.data.data;
            // Filter to only recent models (within 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return models.filter((model) => {
                // Check if model has a date in its ID
                const dateMatch = model.id.match(/(\d{4})[-]?(\d{2})[-]?(\d{2})/);
                if (dateMatch) {
                    const modelDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
                    if (modelDate < sixMonthsAgo)
                        return false;
                }
                // Exclude deprecated models
                if (model.id.includes('deprecated'))
                    return false;
                return true;
            });
        }
        catch (error) {
            console.error('Error fetching models from OpenRouter:', error);
            return [];
        }
    }
    /**
     * Calculate quality score for a model
     */
    calculateQualityScore(model) {
        let score = 40;
        // Context length scoring
        if (model.context_length >= 200000)
            score += 25;
        else if (model.context_length >= 128000)
            score += 20;
        else if (model.context_length >= 64000)
            score += 15;
        else if (model.context_length >= 32000)
            score += 10;
        // Model tier scoring (generic, not hardcoded)
        const modelLower = model.id.toLowerCase();
        if (modelLower.includes('opus') || modelLower.includes('o1'))
            score += 25;
        else if (modelLower.includes('sonnet') || modelLower.includes('4o'))
            score += 20;
        else if (modelLower.includes('haiku') || modelLower.includes('mini'))
            score += 10;
        return Math.min(100, score);
    }
    /**
     * Calculate speed score for a model
     */
    calculateSpeedScore(model) {
        const modelLower = model.id.toLowerCase();
        let score = 50;
        if (modelLower.includes('mini') || modelLower.includes('haiku'))
            score += 30;
        else if (modelLower.includes('sonnet'))
            score += 10;
        else if (modelLower.includes('opus') || modelLower.includes('o1'))
            score -= 10;
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Calculate price score for a model
     */
    calculatePriceScore(model) {
        if (!model.pricing)
            return 50;
        const promptPrice = parseFloat(model.pricing.prompt || '0');
        const completionPrice = parseFloat(model.pricing.completion || '0');
        const avgPricePerToken = (promptPrice + completionPrice) / 2;
        // Convert to price per 1M tokens for easier comparison
        const pricePerMillion = avgPricePerToken * 1000000;
        // Score based on cost per 1M tokens
        // Free/very cheap models: 90+
        // Cheap ($0.10-$1): 80-90
        // Moderate ($1-$5): 50-70
        // Expensive ($5-$15): 20-40
        // Very expensive ($15+): 10
        if (pricePerMillion < 0.1)
            return 95; // Free/nearly free
        if (pricePerMillion < 1)
            return 90; // Very cheap (qwen, gemini-flash)
        if (pricePerMillion < 3)
            return 70; // Cheap
        if (pricePerMillion < 5)
            return 50; // Moderate
        if (pricePerMillion < 10)
            return 30; // Expensive (sonnet)
        if (pricePerMillion < 20)
            return 15; // Very expensive (opus)
        return 10; // Extremely expensive
    }
    /**
     * Determine optimal use cases for a model
     */
    determineOptimalUseCases(model, qualityScore) {
        const modelLower = model.id.toLowerCase();
        const languages = [];
        const repo_sizes = [];
        const frameworks = [];
        // High quality models for all languages
        if (qualityScore >= 80) {
            languages.push('Python', 'JavaScript', 'TypeScript', 'Java', 'Go', 'Rust');
        }
        else if (qualityScore >= 60) {
            languages.push('Python', 'JavaScript', 'TypeScript');
        }
        else {
            languages.push('JavaScript', 'TypeScript');
        }
        // Repo size based on context length
        if (model.context_length >= 128000) {
            repo_sizes.push('large', 'enterprise');
        }
        if (model.context_length >= 32000) {
            repo_sizes.push('medium');
        }
        repo_sizes.push('small');
        // Framework specializations
        if (modelLower.includes('code')) {
            frameworks.push('General');
        }
        if (qualityScore >= 75) {
            frameworks.push('Machine Learning', 'Blockchain', 'Microservices');
        }
        return { languages, repo_sizes, frameworks };
    }
    /**
     * Detect model specializations
     */
    detectSpecializations(model) {
        const specializations = [];
        const modelLower = model.id.toLowerCase();
        if (modelLower.includes('code'))
            specializations.push('code-generation');
        if (modelLower.includes('chat'))
            specializations.push('conversation');
        if (model.context_length >= 128000)
            specializations.push('large-context');
        if (modelLower.includes('vision'))
            specializations.push('multimodal');
        return specializations;
    }
    /**
     * Get fallback model for emergencies
     */
    getFallbackModel(context) {
        // Return a generic descriptor that can be mapped
        return `high-quality-${context.repo_size}-model`;
    }
    /**
     * Get total model count
     */
    async getModelCount() {
        const { count } = await this.supabase
            .from('model_research')
            .select('*', { count: 'exact', head: true });
        return count || 0;
    }
    /**
     * Update analysis role configurations with consistent weights
     *
     * ONLY updates these 5 analysis roles:
     * - security, performance, code_quality, architecture, dependency
     *
     * DOES NOT touch meta roles:
     * - researcher, orchestrator, educator, comparator, location_finder
     */
    async updateAnalysisRoleConfigurations() {
        var _a;
        console.log('\n🔄 Updating Analysis Role Configurations');
        console.log('='.repeat(80));
        console.log('✅ Policy-compliant: Using researcher service for updates');
        console.log('🎯 Target: 5 analysis roles only (security, performance, quality, architecture, dependency)');
        console.log('🔒 Unchanged: Meta roles (researcher, orchestrator, educator, comparator, location_finder)\n');
        const analysisRoles = ['security', 'performance', 'code_quality', 'architecture', 'dependency'];
        // Dynamically fetch ALL languages from existing configurations
        console.log('🌐 Fetching all configured languages from database...');
        const { data: languageData } = await this.supabase
            .from('model_configurations')
            .select('language');
        const allLanguages = [...new Set((languageData === null || languageData === void 0 ? void 0 : languageData.map((d) => d.language)) || [])].sort();
        console.log(`✅ Found ${allLanguages.length} languages: ${allLanguages.join(', ')}\n`);
        // Fetch fresh models from OpenRouter
        console.log('📊 Fetching latest models from OpenRouter...');
        const allModels = await this.fetchAvailableModels();
        console.log(`✅ Found ${allModels.length} fresh models\n`);
        let updated = 0;
        const skipped = 0;
        for (const role of analysisRoles) {
            console.log(`\n🔍 Processing role: ${role.toUpperCase()}`);
            const weights = this.getRoleWeights(role);
            console.log(`   Weights: quality=${weights.quality}, speed=${weights.speed}, cost=${weights.cost}`);
            // Score all models for this role
            const scoredModels = allModels.map(model => ({
                model,
                score: this.calculateRoleSpecificScore(model, role, weights)
            })).sort((a, b) => b.score - a.score);
            const primaryModel = scoredModels[0].model;
            const fallbackModel = ((_a = scoredModels[1]) === null || _a === void 0 ? void 0 : _a.model) || scoredModels[0].model;
            console.log(`   🥇 Best model: ${primaryModel.id} (score: ${scoredModels[0].score.toFixed(1)})`);
            console.log(`   🥈 Fallback: ${fallbackModel.id}`);
            // Update ALL languages and sizes for this role
            for (const language of allLanguages) {
                console.log(`\n   📝 Updating ${role}/${language}...`);
                // Get existing configs for this role/language
                const { data: existingConfigs } = await this.supabase
                    .from('model_configurations')
                    .select('*')
                    .eq('role', role)
                    .eq('language', language);
                if (!existingConfigs || existingConfigs.length === 0) {
                    // Create new config with 'any' size
                    await this.createOrUpdateConfig(role, language, 'any', primaryModel.id, fallbackModel.id, weights);
                    updated++;
                    console.log(`      ✅ Created: ${role}/${language}/any`);
                }
                else {
                    // Update all existing size configs
                    for (const config of existingConfigs) {
                        await this.createOrUpdateConfig(role, language, config.size_category || 'any', primaryModel.id, fallbackModel.id, weights);
                        updated++;
                        console.log(`      ✅ Updated: ${role}/${language}/${config.size_category || 'any'}`);
                    }
                }
            }
        }
        console.log('\n' + '='.repeat(80));
        console.log(`\n📊 Summary:`);
        console.log(`   Updated: ${updated} configurations`);
        console.log(`   Skipped: ${skipped} (meta roles preserved)`);
        console.log(`   Languages covered: ${allLanguages.length} (${allLanguages.join(', ')})`);
        console.log(`\n✅ Analysis role configurations updated successfully!`);
        console.log('   All 5 analysis roles now use consistent, cost-effective models across ALL languages\n');
    }
    /**
     * Update meta role configurations with preserved weights
     *
     * ONLY updates these 5 meta roles:
     * - researcher, orchestrator, educator, comparator, location_finder
     *
     * Preserves existing quality-focused weights, just checks for newer models
     */
    async updateMetaRoleConfigurations() {
        var _a;
        console.log('\n🔄 Updating Meta Role Configurations');
        console.log('='.repeat(80));
        console.log('✅ Policy-compliant: Using researcher service for updates');
        console.log('🎯 Target: 5 meta roles (researcher, orchestrator, educator, comparator, location_finder)');
        console.log('🔒 Weights preserved: Using existing quality-focused weights\n');
        const metaRoles = ['researcher', 'orchestrator', 'educator', 'comparator', 'location_finder'];
        // Meta roles are language-independent, use 'java' as the canonical config
        const canonicalLanguage = 'java';
        // Fetch fresh models from OpenRouter
        console.log('📊 Fetching latest models from OpenRouter...');
        const allModels = await this.fetchAvailableModels();
        console.log(`✅ Found ${allModels.length} fresh models\n`);
        let updated = 0;
        for (const role of metaRoles) {
            console.log(`\n🔍 Processing role: ${role.toUpperCase()}`);
            const weights = this.getRoleWeights(role);
            console.log(`   Weights: quality=${weights.quality}, speed=${weights.speed}, cost=${weights.cost}`);
            // Score all models for this role with preserved weights
            const scoredModels = allModels.map(model => ({
                model,
                score: this.calculateRoleSpecificScore(model, role, weights)
            })).sort((a, b) => b.score - a.score);
            const primaryModel = scoredModels[0].model;
            const fallbackModel = ((_a = scoredModels[1]) === null || _a === void 0 ? void 0 : _a.model) || scoredModels[0].model;
            console.log(`   🥇 Best model: ${primaryModel.id} (score: ${scoredModels[0].score.toFixed(1)})`);
            console.log(`   🥈 Fallback: ${fallbackModel.id}`);
            // Get existing config for this role
            const { data: existingConfig } = await this.supabase
                .from('model_configurations')
                .select('*')
                .eq('role', role)
                .eq('language', canonicalLanguage)
                .maybeSingle();
            // Update config with best available models
            await this.createOrUpdateConfig(role, canonicalLanguage, (existingConfig === null || existingConfig === void 0 ? void 0 : existingConfig.size_category) || 'any', primaryModel.id, fallbackModel.id, weights);
            updated++;
            console.log(`      ✅ Updated: ${role}/${canonicalLanguage}`);
        }
        console.log('\n' + '='.repeat(80));
        console.log(`\n📊 Summary:`);
        console.log(`   Updated: ${updated} meta role configurations`);
        console.log(`   Weights preserved: Original quality-focused weights maintained`);
        console.log(`   Models refreshed: Using latest available models from OpenRouter`);
        console.log(`\n✅ Meta role configurations updated successfully!`);
        console.log('   All 5 meta roles now use latest optimal models with preserved weights\n');
    }
    /**
     * Update AI Fixer role configurations
     *
     * Populates model_configurations for role='ai_fixer' across all supported languages.
     * AI Fixer uses quality-first weights since code fixing requires high accuracy.
     */
    async updateAIFixerRoleConfigurations() {
        var _a;
        console.log('\n🔄 Updating AI Fixer Role Configurations');
        console.log('='.repeat(80));
        console.log('✅ Policy-compliant: Using researcher service for updates');
        console.log('🎯 Target: ai_fixer role for all supported languages');
        console.log('🔧 Weights: Quality-first (quality=0.70, speed=0.15, cost=0.10, accuracy=0.05)\n');
        // AI Fixer supported languages (from ai-fixer-researcher.ts)
        const aiFixerLanguages = [
            'typescript', 'javascript', 'python', 'java', 'go', 'rust',
            'cpp', 'c', 'csharp', 'kotlin', 'swift', 'ruby', 'php'
        ];
        // AI Fixer uses quality-first weights
        const aiFixerWeights = {
            quality: 0.70,
            speed: 0.15,
            cost: 0.10,
            freshness: 0.05
        };
        // Fetch fresh models from OpenRouter
        console.log('📊 Fetching latest models from OpenRouter...');
        const allModels = await this.fetchAvailableModels();
        console.log(`✅ Found ${allModels.length} fresh models\n`);
        // Score models for AI fixing task (quality-focused)
        const scoredModels = allModels.map(model => ({
            model,
            score: this.calculateRoleSpecificScore(model, 'ai_fixer', aiFixerWeights)
        })).sort((a, b) => b.score - a.score);
        const primaryModel = scoredModels[0].model;
        const fallbackModel = ((_a = scoredModels[1]) === null || _a === void 0 ? void 0 : _a.model) || scoredModels[0].model;
        console.log(`🥇 Best AI Fixer model: ${primaryModel.id} (score: ${scoredModels[0].score.toFixed(1)})`);
        console.log(`🥈 Fallback: ${fallbackModel.id}\n`);
        let updated = 0;
        for (const language of aiFixerLanguages) {
            console.log(`   📝 Setting up ai_fixer/${language}...`);
            // Check if config exists
            const { data: existing } = await this.supabase
                .from('model_configurations')
                .select('id')
                .eq('role', 'ai_fixer')
                .eq('language', language)
                .maybeSingle();
            const config = {
                role: 'ai_fixer',
                language,
                size_category: 'any',
                primary_provider: primaryModel.id.split('/')[0],
                primary_model: primaryModel.id,
                fallback_provider: fallbackModel.id.split('/')[0],
                fallback_model: fallbackModel.id,
                weights: {
                    quality: aiFixerWeights.quality,
                    speed: aiFixerWeights.speed,
                    cost: aiFixerWeights.cost,
                    freshness: aiFixerWeights.freshness,
                    contextWindow: 0.05
                },
                min_requirements: {},
                reasoning: [
                    `🔬 AI Fixer research update on ${new Date().toISOString()}`,
                    `Role: ai_fixer (Tier 3 code fixing)`,
                    `Language: ${language}`,
                    `Primary: ${primaryModel.id} (quality-first selection)`,
                    `Fallback: ${fallbackModel.id}`,
                    `✅ Research-based selection for code fixing task`
                ],
                last_updated: new Date().toISOString(),
                updated_by: 'ai-fixer-researcher-service'
            };
            if (existing) {
                await this.supabase
                    .from('model_configurations')
                    .update(config)
                    .eq('id', existing.id);
                console.log(`      ✅ Updated: ai_fixer/${language}`);
            }
            else {
                await this.supabase
                    .from('model_configurations')
                    .insert([config]);
                console.log(`      ✅ Created: ai_fixer/${language}`);
            }
            updated++;
        }
        console.log('\n' + '='.repeat(80));
        console.log(`\n📊 Summary:`);
        console.log(`   Updated: ${updated} AI fixer configurations`);
        console.log(`   Languages: ${aiFixerLanguages.join(', ')}`);
        console.log(`   Primary model: ${primaryModel.id}`);
        console.log(`   Fallback model: ${fallbackModel.id}`);
        console.log(`\n✅ AI Fixer role configurations created successfully!`);
        console.log('   AIFixerResearcherService can now evaluate weight configurations\n');
    }
    /**
     * Calculate role-specific score for a model
     */
    calculateRoleSpecificScore(model, role, weights) {
        const qualityScore = this.calculateQualityScore(model);
        const speedScore = this.calculateSpeedScore(model);
        const priceScore = this.calculatePriceScore(model);
        const totalScore = (qualityScore * weights.quality) +
            (speedScore * weights.speed) +
            (priceScore * weights.cost);
        return totalScore;
    }
    /**
     * Create or update a model configuration
     */
    async createOrUpdateConfig(role, language, sizeCategory, primaryModelId, fallbackModelId, weights) {
        const config = {
            role,
            language,
            size_category: sizeCategory,
            primary_provider: primaryModelId.split('/')[0],
            primary_model: primaryModelId,
            fallback_provider: fallbackModelId.split('/')[0],
            fallback_model: fallbackModelId,
            weights: {
                quality: weights.quality,
                speed: weights.speed,
                cost: weights.cost,
                freshness: 0.0,
                contextWindow: 0.05
            },
            min_requirements: {},
            reasoning: [
                `🔬 Quarterly research update on ${new Date().toISOString()}`,
                `Role: ${role} (analysis role with consistent weights)`,
                `Language: ${language}, Size: ${sizeCategory}`,
                `Primary: ${primaryModelId}`,
                `Fallback: ${fallbackModelId}`,
                `✅ Research-based selection using role-specific weights`
            ],
            last_updated: new Date().toISOString(),
            updated_by: 'model-researcher-service'
        };
        // Check if config exists
        const { data: existing } = await this.supabase
            .from('model_configurations')
            .select('id')
            .eq('role', role)
            .eq('language', language)
            .eq('size_category', sizeCategory)
            .maybeSingle();
        if (existing) {
            // Update existing
            await this.supabase
                .from('model_configurations')
                .update(config)
                .eq('id', existing.id);
        }
        else {
            // Insert new
            await this.supabase
                .from('model_configurations')
                .insert([config]);
        }
    }
}
exports.ModelResearcherService = ModelResearcherService;
