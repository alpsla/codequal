"use strict";
/**
 * Smart Agent Tracker Service
 * Automatically detects primary vs fallback model usage
 * by comparing with Supabase configurations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartTracker = exports.SmartAgentTrackerService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class SmartAgentTrackerService {
    constructor() {
        this.configCache = new Map();
        this.supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }
    static getInstance() {
        if (!SmartAgentTrackerService.instance) {
            SmartAgentTrackerService.instance = new SmartAgentTrackerService();
        }
        return SmartAgentTrackerService.instance;
    }
    /**
     * Smart tracking that automatically detects primary vs fallback
     */
    async trackAgentActivity(params) {
        // Step 1: Get the model configuration for this agent/language/size combination
        const config = await this.getRelevantConfig(params.agentRole, params.language, params.repositorySize);
        if (!config) {
            console.warn(`No config found for ${params.agentRole} - requesting from researcher`);
            await this.requestNewConfig(params);
            // Track with unknown tier
            return {
                detectedTier: 'unknown',
                configUsed: null,
                cost: this.estimateCost(params.modelUsed, params.inputTokens, params.outputTokens)
            };
        }
        // Step 2: Automatically detect if this is primary or fallback
        const detectedTier = this.detectModelTier(params.modelUsed, config);
        // Step 3: Calculate cost based on the detected tier
        const cost = this.calculateCostFromConfig(config, detectedTier, params.inputTokens, params.outputTokens);
        // Step 4: Track the activity with the detected information
        await this.recordActivity({
            ...params,
            model_config_id: config.id,
            is_fallback: detectedTier === 'fallback',
            detected_tier: detectedTier,
            cost,
            config_version: config.last_updated
        });
        // Step 5: Update performance metrics
        if (!params.success && detectedTier === 'primary') {
            // Primary model failed - this is important for researcher to know
            await this.recordModelFailure(config.id, 'primary', params.error);
        }
        // Log for debugging
        console.log(`[SmartTracker] Detected ${detectedTier} model usage:`, {
            agent: params.agentRole,
            modelUsed: params.modelUsed,
            expectedPrimary: config.primary_model,
            expectedFallback: config.fallback_model,
            detectedTier,
            cost: `$${cost.toFixed(6)}`
        });
        return {
            detectedTier,
            configUsed: config,
            cost
        };
    }
    /**
     * Intelligently detect which tier the model belongs to
     */
    detectModelTier(modelUsed, config) {
        // Normalize model names for comparison
        const normalizedUsed = this.normalizeModelName(modelUsed);
        const normalizedPrimary = this.normalizeModelName(config.primary_model);
        const normalizedFallback = config.fallback_model
            ? this.normalizeModelName(config.fallback_model)
            : null;
        // Check if it matches primary
        if (this.modelsMatch(normalizedUsed, normalizedPrimary)) {
            return 'primary';
        }
        // Check if it matches fallback
        if (normalizedFallback && this.modelsMatch(normalizedUsed, normalizedFallback)) {
            return 'fallback';
        }
        // Doesn't match either - might be an emergency fallback or new model
        console.warn(`Model ${modelUsed} doesn't match primary (${config.primary_model}) or fallback (${config.fallback_model})`);
        // Try to make an intelligent guess based on model capabilities
        if (this.isLikelyFallback(modelUsed)) {
            return 'fallback';
        }
        return 'unknown';
    }
    /**
     * Normalize model names for comparison
     * Handles variations like "gpt-4o" vs "gpt-4o-2024-08-06"
     */
    normalizeModelName(model) {
        return model
            .toLowerCase()
            .replace(/[-_]/g, '')
            .replace(/\d{4}\d{2}\d{2}/, '') // Remove date stamps
            .replace(/preview|latest|snapshot/g, '')
            .trim();
    }
    /**
     * Check if two model names match (considering versions)
     */
    modelsMatch(model1, model2) {
        // Exact match
        if (model1 === model2)
            return true;
        // Check if one is a version of the other
        // e.g., "gpt4o" matches "gpt4o20240806"
        if (model1.startsWith(model2) || model2.startsWith(model1)) {
            return true;
        }
        // Check common aliases
        const aliases = {
            'gpt4o': ['gpt4omni', 'gpt4o', 'gpt4turbo'],
            'gpt4omini': ['gpt4mini', 'gpt4omini'],
            'claude35sonnet': ['claude35', 'claudesonnet35'],
            'claude3haiku': ['claudehaiku', 'haiku'],
        };
        for (const [key, aliasList] of Object.entries(aliases)) {
            if (aliasList.includes(model1) && aliasList.includes(model2)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Heuristic to determine if a model is likely a fallback
     */
    isLikelyFallback(model) {
        const fallbackIndicators = [
            'mini',
            'small',
            'light',
            'fast',
            'cheap',
            '3.5',
            'haiku',
            'flash'
        ];
        const normalized = model.toLowerCase();
        return fallbackIndicators.some(indicator => normalized.includes(indicator));
    }
    /**
     * Calculate cost based on configuration and detected tier
     */
    calculateCostFromConfig(config, tier, inputTokens, outputTokens) {
        let inputRate;
        let outputRate;
        switch (tier) {
            case 'primary':
                inputRate = config.primary_cost_per_1m_input || 1.0;
                outputRate = config.primary_cost_per_1m_output || 1.0;
                break;
            case 'fallback':
                inputRate = config.fallback_cost_per_1m_input || 0.5;
                outputRate = config.fallback_cost_per_1m_output || 0.5;
                break;
            case 'unknown':
                // Use average of primary and fallback as estimate
                inputRate = ((config.primary_cost_per_1m_input || 1.0) +
                    (config.fallback_cost_per_1m_input || 0.5)) / 2;
                outputRate = ((config.primary_cost_per_1m_output || 1.0) +
                    (config.fallback_cost_per_1m_output || 0.5)) / 2;
                break;
        }
        return (inputTokens / 1000000) * inputRate +
            (outputTokens / 1000000) * outputRate;
    }
    /**
     * Estimate cost for unknown models
     */
    estimateCost(model, inputTokens, outputTokens) {
        // Default rates based on model name patterns
        const estimates = {
            'gpt-4': { input: 30, output: 60 },
            'gpt-4o': { input: 2.5, output: 10 },
            'gpt-4o-mini': { input: 0.15, output: 0.6 },
            'gpt-3.5': { input: 0.5, output: 1.5 },
            'claude': { input: 3, output: 15 },
            'gemini': { input: 3.5, output: 10.5 }
        };
        const modelLower = model.toLowerCase();
        for (const [key, rates] of Object.entries(estimates)) {
            if (modelLower.includes(key)) {
                return (inputTokens / 1000000) * rates.input +
                    (outputTokens / 1000000) * rates.output;
            }
        }
        // Default fallback
        return (inputTokens / 1000000) * 1.0 + (outputTokens / 1000000) * 1.0;
    }
    /**
     * Get relevant configuration from Supabase
     */
    async getRelevantConfig(role, language, size) {
        const cacheKey = `${role}-${language}-${size}`;
        // Check cache
        if (this.configCache.has(cacheKey)) {
            return this.configCache.get(cacheKey);
        }
        // Query Supabase
        const { data, error } = await this.supabase
            .from('model_configs')
            .select('*')
            .eq('role', role)
            .eq('is_active', true)
            .or(`language.eq.${language},language.is.null`)
            .or(`repository_size.eq.${size},repository_size.is.null`)
            .order('performance_score', { ascending: false })
            .limit(1)
            .single();
        if (data) {
            this.configCache.set(cacheKey, data);
            // Clear cache after 5 minutes
            setTimeout(() => this.configCache.delete(cacheKey), 300000);
        }
        return data;
    }
    /**
     * Record activity in Supabase
     */
    async recordActivity(activity) {
        await this.supabase.from('agent_activities').insert(activity);
    }
    /**
     * Record model failure for researcher analysis
     */
    async recordModelFailure(configId, tier, error) {
        await this.supabase.from('model_failures').insert({
            config_id: configId,
            tier,
            error,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Request new configuration from researcher
     */
    async requestNewConfig(params) {
        await this.supabase.from('research_requests').insert({
            request_type: 'model_config',
            role: params.agentRole,
            language: params.language,
            repository_size: params.repositorySize,
            status: 'pending',
            requested_by: 'smart_tracker',
            requested_at: new Date().toISOString(),
            metadata: {
                reason: 'No configuration found',
                model_attempted: params.modelUsed
            }
        });
    }
    /**
     * Get usage statistics showing primary vs fallback usage
     */
    async getModelTierStatistics(role, timeRange) {
        let query = this.supabase
            .from('agent_activities')
            .select('*');
        if (role) {
            query = query.eq('agent_role', role);
        }
        if (timeRange) {
            query = query
                .gte('timestamp', timeRange.start.getTime())
                .lte('timestamp', timeRange.end.getTime());
        }
        const { data: activities } = await query;
        if (!activities || activities.length === 0) {
            return {
                primaryUsage: 0,
                fallbackUsage: 0,
                unknownUsage: 0,
                primarySuccessRate: 0,
                fallbackSuccessRate: 0,
                costSavingsFromFallback: 0
            };
        }
        const primary = activities.filter(a => a.detected_tier === 'primary');
        const fallback = activities.filter(a => a.detected_tier === 'fallback');
        const unknown = activities.filter(a => a.detected_tier === 'unknown');
        const primarySuccess = primary.filter(a => a.success).length;
        const fallbackSuccess = fallback.filter(a => a.success).length;
        // Calculate cost savings
        const fallbackCost = fallback.reduce((sum, a) => sum + a.cost, 0);
        const estimatedPrimaryCost = fallback.reduce((sum, a) => {
            // Estimate what it would have cost with primary model
            return sum + (a.cost * 3); // Assume primary is 3x more expensive on average
        }, 0);
        return {
            primaryUsage: primary.length,
            fallbackUsage: fallback.length,
            unknownUsage: unknown.length,
            primarySuccessRate: primary.length > 0 ? primarySuccess / primary.length : 0,
            fallbackSuccessRate: fallback.length > 0 ? fallbackSuccess / fallback.length : 0,
            costSavingsFromFallback: estimatedPrimaryCost - fallbackCost
        };
    }
}
exports.SmartAgentTrackerService = SmartAgentTrackerService;
// Export singleton
exports.smartTracker = SmartAgentTrackerService.getInstance();
