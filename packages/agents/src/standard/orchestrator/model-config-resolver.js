"use strict";
/**
 * Model Configuration Resolver
 *
 * Handles model configuration retrieval with automatic fallback to research
 * when configurations are missing from Supabase.
 *
 * Fallback Strategy (When OpenRouter Keys Fail):
 * 1. Try primary OpenRouter key
 * 2. Try secondary OpenRouter key from OPENROUTER_API_KEYS array
 * 3. Fall back to direct Gemini/Claude/OpenAI API (emergency)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelConfigResolver = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const model_researcher_service_1 = require("../../two-branch/research-services/model-researcher-service");
const emergency_fallback_provider_1 = require("../../two-branch/services/emergency-fallback-provider");
class ModelConfigResolver {
    constructor(logger) {
        this.logger = logger;
        this.cache = new Map();
        this.openrouterKeys = [];
        this.currentKeyIndex = 0;
        this.failedKeys = new Set();
        this.strictNoFallback = false;
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase credentials not configured');
        }
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        this.researcher = new model_researcher_service_1.ModelResearcherService();
        this.emergencyFallback = new emergency_fallback_provider_1.EmergencyFallbackProvider();
        // Strict mode: disable any emergency/default fallbacks (E2E gate)
        this.strictNoFallback = (process.env.STRICT_NO_FALLBACK === 'true') ||
            (process.env.E2E_DISABLE_EMERGENCY_FALLBACK === 'true');
        // Load OpenRouter keys from environment
        this.loadOpenRouterKeys();
    }
    /**
     * Load OpenRouter API keys from environment variables
     * Supports both single key (OPENROUTER_API_KEY) and multiple keys (OPENROUTER_API_KEYS)
     */
    loadOpenRouterKeys() {
        const keysString = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || '';
        if (keysString) {
            // Split by comma, semicolon, or newline and filter empty strings
            this.openrouterKeys = keysString
                .split(/[,;\n]/)
                .map(key => key.trim())
                .filter(key => key.length > 0);
            this.log('info', `Loaded ${this.openrouterKeys.length} OpenRouter API key(s)`);
        }
        else {
            this.log('warn', 'No OpenRouter API keys found in environment');
        }
    }
    /**
     * Get the next available OpenRouter API key
     * Rotates through available keys, skipping failed ones
     */
    getNextOpenRouterKey() {
        if (this.openrouterKeys.length === 0) {
            return null;
        }
        // Try all keys once
        const startIndex = this.currentKeyIndex;
        do {
            const key = this.openrouterKeys[this.currentKeyIndex];
            // Move to next key for subsequent calls
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.openrouterKeys.length;
            // Skip if this key has failed
            if (!this.failedKeys.has(key)) {
                return key;
            }
        } while (this.currentKeyIndex !== startIndex);
        // All keys have failed
        return null;
    }
    /**
     * Mark an OpenRouter key as failed
     */
    markKeyAsFailed(key) {
        this.failedKeys.add(key);
        this.log('warn', `Marked OpenRouter key as failed (${this.failedKeys.size}/${this.openrouterKeys.length} failed)`);
    }
    /**
     * Reset failed keys (e.g., after some time has passed)
     */
    resetFailedKeys() {
        this.failedKeys.clear();
        this.currentKeyIndex = 0;
        this.log('info', 'Reset failed OpenRouter keys');
    }
    /**
     * Get model configuration for a specific context
     * Automatically researches and creates missing configurations
     *
     * Implements Two-Level Fallback Strategy:
     * 1. Normal: Use Supabase config → Trigger Researcher if missing
     * 2. Level 1 Fallback: If OpenRouter key fails, try next key
     * 3. Level 2 Fallback: If all OpenRouter keys fail, use emergency provider (Gemini/Claude/OpenAI)
     */
    async getModelConfiguration(role, language, size) {
        // BUG-119 FIX: Normalize role name (codequality → code_quality)
        const normalizedRole = this.normalizeRoleName(role);
        // Check cache first (use original role for cache key)
        const cacheKey = `${role}/${language}/${size}`;
        if (this.cache.has(cacheKey)) {
            this.log('debug', `Using cached configuration for ${cacheKey}`);
            return this.cache.get(cacheKey);
        }
        this.log('info', `Retrieving model configuration for ${cacheKey} (normalized: ${normalizedRole})`);
        // Try to get from Supabase using normalized role name
        // BUG FIX: Fall back to 'any' size if specific size not found
        const { data, error } = await this.supabase
            .from('model_configurations')
            .select('*')
            .eq('role', normalizedRole)
            .eq('language', language)
            .in('size_category', [size, 'any']) // Match specific size OR 'any'
            .order('size_category', { ascending: false }) // Prefer specific size (alphabetically last)
            .limit(1)
            .maybeSingle(); // Returns null if not found, doesn't throw
        if (data && !error) {
            this.log('info', `Found existing configuration for ${cacheKey} (size: ${data.size_category || 'any'})`);
            const config = this.transformConfig(data);
            this.cache.set(cacheKey, config);
            return config;
        }
        // Handle context-independent roles
        if (['orchestrator', 'researcher', 'educator'].includes(role)) {
            // Try universal configuration
            const { data: universalData, error: universalError } = await this.supabase
                .from('model_configurations')
                .select('*')
                .eq('role', role)
                .eq('language', 'universal')
                .eq('size_category', 'medium')
                .single();
            if (universalData && !universalError) {
                this.log('info', `Using universal configuration for ${role}`);
                const config = this.transformConfig(universalData);
                this.cache.set(cacheKey, config);
                return config;
            }
        }
        // Configuration not found - research and create
        this.log('warn', `No configuration found for ${cacheKey}, initiating research`);
        try {
            // Use researcher to find optimal models (with OpenRouter key fallback)
            const research = await this.researchModelForContextWithFallback(role, language, size);
            // Create new configuration
            const newConfig = {
                role,
                language,
                size_category: size,
                primary_provider: research.primary.provider,
                primary_model: research.primary.model,
                fallback_provider: research.fallback.provider,
                fallback_model: research.fallback.model,
                weights: research.weights,
                min_requirements: research.min_requirements || {},
                reasoning: research.reasoning,
                isEmergencyFallback: research.isEmergencyFallback || false
            };
            // Store in Supabase for future use (unless it's emergency fallback)
            if (!newConfig.isEmergencyFallback) {
                await this.storeConfiguration(newConfig);
            }
            else {
                this.log('warn', `Using emergency fallback - not storing in Supabase`);
            }
            // Cache and return
            this.cache.set(cacheKey, newConfig);
            return newConfig;
        }
        catch (researchError) {
            this.log('error', `Failed to research models for ${cacheKey}`, researchError);
            // Try emergency fallback as last resort
            return this.getEmergencyFallbackConfiguration(role, language, size);
        }
    }
    /**
     * Research model for context with OpenRouter key fallback
     * Tries multiple OpenRouter keys before giving up
     */
    async researchModelForContextWithFallback(role, language, size) {
        let lastError = null;
        // Try each available OpenRouter key at most once
        let attempts = 0;
        const maxAttempts = Math.max(1, this.openrouterKeys.length);
        while (attempts < maxAttempts) {
            const apiKey = this.getNextOpenRouterKey();
            if (!apiKey) {
                // All OpenRouter keys exhausted - fall back to emergency provider
                this.log('error', 'All OpenRouter keys failed, using emergency fallback');
                return this.getEmergencyResearchResult(role, language, size);
            }
            try {
                // Temporarily set the API key for the researcher
                const originalKey = process.env.OPENROUTER_API_KEY;
                process.env.OPENROUTER_API_KEY = apiKey;
                this.log('info', `Attempting research with OpenRouter key #${this.currentKeyIndex}`);
                // Call the original research method
                const result = await this.researchModelForContext(role, language, size);
                // Restore original key
                process.env.OPENROUTER_API_KEY = originalKey;
                this.log('info', 'Research successful with current OpenRouter key');
                return result;
            }
            catch (error) {
                attempts++;
                lastError = error;
                this.log('warn', `Research failed with OpenRouter key #${this.currentKeyIndex}: ${error.message}`);
                // Mark this key as failed
                this.markKeyAsFailed(apiKey);
                // Log Level 1 fallback activation
                this.log('warn', `⚠️  LEVEL 1 FALLBACK: Rotating to next OpenRouter key`);
                // Store Level 1 fallback alert (warning level)
                this.createFallbackAlert({
                    alert_type: 'openrouter_key_rotation',
                    severity: 'warning',
                    context: { role, language, size_category: size },
                    failed_key_index: this.currentKeyIndex - 1,
                    remaining_keys: this.openrouterKeys.length - this.failedKeys.size,
                    error_message: error.message,
                    message: `OpenRouter key #${this.currentKeyIndex} failed. Rotating to next key.`,
                    timestamp: new Date().toISOString()
                }).catch(err => {
                    this.log('error', 'Failed to store Level 1 fallback alert', err);
                });
            }
        }
        // All keys failed
        this.log('error', `All OpenRouter keys failed. Last error: ${lastError === null || lastError === void 0 ? void 0 : lastError.message}`);
        if (this.strictNoFallback) {
            throw new Error('ALERT: All OpenRouter keys failed and STRICT_NO_FALLBACK is enabled. Supabase model configuration or OpenRouter access is required.');
        }
        return this.getEmergencyResearchResult(role, language, size);
    }
    /**
     * Get emergency fallback configuration when all OpenRouter keys fail
     * Uses direct Gemini/Claude/OpenAI API
     */
    getEmergencyResearchResult(role, language, size) {
        if (this.strictNoFallback) {
            throw new Error('ALERT: Emergency fallback is disabled by STRICT_NO_FALLBACK. Ensure Supabase model configurations and OpenRouter are accessible.');
        }
        if (!this.emergencyFallback.isAvailable()) {
            throw new Error('All OpenRouter keys failed and no emergency fallback configured. ' +
                'Set EMERGENCY_FALLBACK_PROVIDER and corresponding API key (GOOGLE_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY)');
        }
        const config = this.emergencyFallback.getConfig();
        const model = config.model;
        // Log emergency fallback activation
        this.log('error', `🚨 EMERGENCY FALLBACK ACTIVATED: ${config.provider}/${model}`);
        this.log('error', `Context: ${role}/${language}/${size}`);
        this.log('error', `Failed OpenRouter keys: ${this.failedKeys.size}/${this.openrouterKeys.length}`);
        // Store alert in Supabase for monitoring
        this.createFallbackAlert({
            alert_type: 'emergency_fallback_activated',
            severity: 'critical',
            context: { role, language, size_category: size },
            provider: config.provider,
            model: config.model,
            failed_keys_count: this.failedKeys.size,
            total_keys_count: this.openrouterKeys.length,
            message: `All OpenRouter keys failed. Using emergency fallback: ${config.provider}/${model}`,
            timestamp: new Date().toISOString()
        }).catch(err => {
            this.log('error', 'Failed to store fallback alert in Supabase', err);
        });
        return {
            primary: {
                provider: config.provider,
                model: model
            },
            fallback: {
                provider: config.provider,
                model: model
            },
            weights: this.calculateWeightsForRole(role, size),
            min_requirements: this.getMinRequirements(role, size),
            reasoning: [
                '🚨 EMERGENCY FALLBACK MODE',
                'All OpenRouter API keys failed',
                `Using direct ${config.provider} API as temporary solution`,
                `Model: ${model}`,
                'This configuration is temporary and not stored in Supabase',
                '⚠️  ALERT GENERATED - Manual intervention required'
            ],
            isEmergencyFallback: true
        };
    }
    /**
     * Get emergency fallback configuration
     * Used as absolute last resort when even research fails
     */
    getEmergencyFallbackConfiguration(role, language, size) {
        if (this.strictNoFallback) {
            throw new Error('ALERT: Emergency fallback is disabled by STRICT_NO_FALLBACK. Unable to proceed without Supabase model configuration.');
        }
        if (!this.emergencyFallback.isAvailable()) {
            throw new Error('Model configuration unavailable and no emergency fallback configured. ' +
                'Set EMERGENCY_FALLBACK_PROVIDER and corresponding API key.');
        }
        const config = this.emergencyFallback.getConfig();
        const model = config.model;
        this.log('error', `🚨 CRITICAL: Using emergency fallback for ${role}/${language}/${size}`);
        return {
            role,
            language,
            size_category: size,
            primary_provider: config.provider,
            primary_model: model,
            fallback_provider: config.provider,
            fallback_model: model,
            weights: this.calculateWeightsForRole(role, size),
            min_requirements: this.getMinRequirements(role, size),
            reasoning: [
                '🚨 EMERGENCY FALLBACK MODE - ALL SYSTEMS FAILED',
                'OpenRouter: All keys failed',
                'Researcher: Unable to complete research',
                `Emergency Provider: ${config.provider}/${model}`,
                'TEMPORARY CONFIGURATION - Manual intervention required'
            ],
            isEmergencyFallback: true
        };
    }
    /**
     * Research optimal models for a specific context
     */
    async researchModelForContext(role, language, size) {
        this.log('info', `Researching models for ${role}/${language}/${size}`);
        // Use ModelResearcherService to find best models
        const modelId = await this.researcher.requestSpecificContextResearch({
            language,
            repo_size: size,
            task_type: role
        });
        if (!modelId) {
            throw new Error('No model found during research');
        }
        // For now, use the researched model as primary
        const primaryModel = modelId;
        // Get fallback from existing configurations or research
        const fallbackModel = await this.getFallbackModelFromConfig(role, language, size, primaryModel);
        // Calculate weights based on role
        const weights = this.calculateWeightsForRole(role, size);
        return {
            primary: {
                provider: this.extractProvider(primaryModel),
                model: primaryModel
            },
            fallback: {
                provider: this.extractProvider(fallbackModel),
                model: fallbackModel
            },
            weights,
            min_requirements: this.getMinRequirements(role, size),
            reasoning: [
                `Researched optimal models for ${language} ${size} repositories`,
                `Role ${role} requires ${this.getPriorityForRole(role)} priority`,
                'Model selected based on context-specific research',
                'Configuration auto-generated via fallback research'
            ]
        };
    }
    /**
     * Store configuration in Supabase
     */
    async storeConfiguration(config) {
        this.log('info', `Storing new configuration for ${config.role}/${config.language}/${config.size_category}`);
        // Remove fields not present in the DB schema (e.g., isEmergencyFallback)
        const { isEmergencyFallback, ...configWithoutFlag } = config;
        const { error } = await this.supabase
            .from('model_configurations')
            .insert({
            ...configWithoutFlag,
            updated_by: 'model-config-resolver',
            last_updated: new Date().toISOString()
        });
        if (error) {
            this.log('error', 'Failed to store configuration', error);
            // Don't throw - we can still use the configuration even if storage fails
        }
        else {
            this.log('info', 'Configuration stored successfully');
        }
    }
    /**
     * Transform database record to ModelConfiguration
     */
    transformConfig(data) {
        return {
            role: data.role,
            language: data.language,
            size_category: data.size_category,
            primary_provider: data.primary_provider,
            primary_model: data.primary_model,
            fallback_provider: data.fallback_provider,
            fallback_model: data.fallback_model,
            weights: data.weights || this.getDefaultWeights(),
            min_requirements: data.min_requirements || {},
            reasoning: data.reasoning || []
        };
    }
    /**
     * Trigger urgent model research for a specific context
     */
    async triggerUrgentModelResearch(role, language, size) {
        this.log('info', `Triggering urgent research for ${role}/${language}/${size}`);
        try {
            // Create a research task in Supabase
            const { error } = await this.supabase
                .from('model_research_tasks')
                .insert({
                role,
                language,
                size_category: size,
                status: 'pending',
                priority: 'urgent',
                requested_at: new Date().toISOString(),
                requested_by: 'model-config-resolver'
            });
            if (error) {
                this.log('error', 'Failed to create research task', error);
            }
            // Also try to trigger immediate research via ModelResearcherService
            if (this.researcher) {
                this.log('info', 'Attempting immediate research via ModelResearcherService');
                // The researcher should conduct the 2-step search:
                // 1. Web search for latest models (< 6 months old)
                // 2. OpenRouter validation for exact syntax
                await this.researcher.requestSpecificContextResearch({
                    language,
                    repo_size: size,
                    task_type: role
                });
            }
        }
        catch (error) {
            this.log('error', 'Failed to trigger urgent research', error);
        }
    }
    /**
     * Get default configuration as ultimate fallback
     * Uses actual API call to get available models dynamically
     */
    async getDefaultConfiguration(role, language, size) {
        var _a;
        this.log('warn', `Using fallback configuration for ${role}/${language}/${size}`);
        // Try to fetch actual available models from OpenRouter
        let primaryModel = 'openai/gpt-4o'; // Safe fallback that's always available
        let fallbackModel = 'openai/gpt-4o-mini';
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const axios = require('axios');
            const apiKey = process.env.OPENROUTER_API_KEY;
            if (apiKey) {
                const response = await axios.get('https://openrouter.ai/api/v1/models', {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });
                const models = response.data.data || [];
                // Filter for suitable models based on role
                const suitableModels = models.filter((m) => {
                    const isCodeCapable = m.context_length >= 50000;
                    const isQualityModel = m.id.includes('claude') || m.id.includes('gpt') || m.id.includes('gemini');
                    const notDeprecated = !m.id.includes('instruct');
                    return isCodeCapable && isQualityModel && notDeprecated;
                });
                if (suitableModels.length > 0) {
                    // Sort by context length and select the best
                    suitableModels.sort((a, b) => b.context_length - a.context_length);
                    primaryModel = suitableModels[0].id;
                    fallbackModel = ((_a = suitableModels[1]) === null || _a === void 0 ? void 0 : _a.id) || 'openai/gpt-4o-mini';
                    this.log('info', `Dynamically selected models: primary=${primaryModel}, fallback=${fallbackModel}`);
                }
            }
        }
        catch (error) {
            this.log('warn', 'Could not fetch available models, using safe defaults');
        }
        return {
            role,
            language,
            size_category: size,
            primary_provider: this.extractProvider(primaryModel),
            primary_model: primaryModel,
            fallback_provider: this.extractProvider(fallbackModel),
            fallback_model: fallbackModel,
            weights: this.calculateWeightsForRole(role, size),
            min_requirements: this.getMinRequirements(role, size),
            reasoning: [
                'Configuration dynamically selected from available models',
                `Selected ${primaryModel} based on availability and capabilities`
            ]
        };
    }
    /**
     * Extract provider from model ID
     */
    extractProvider(modelId) {
        const parts = modelId.split('/');
        return parts.length > 1 ? parts[0] : 'openai';
    }
    /**
     * Get priority for a role
     */
    getPriorityForRole(role) {
        switch (role) {
            case 'orchestrator':
            case 'comparator':
            case 'educator':
                return 'quality';
            case 'location_finder':
                return 'speed';
            case 'deepwiki':
            case 'researcher':
            default:
                return 'balanced';
        }
    }
    /**
     * Calculate weights for a role and size
     */
    calculateWeightsForRole(role, size) {
        const baseWeights = {
            quality: 0.5,
            speed: 0.2,
            cost: 0.2,
            freshness: 0.1,
            contextWindow: 0.0
        };
        // Adjust based on role
        switch (role) {
            case 'orchestrator':
            case 'comparator':
                baseWeights.quality = 0.8;
                baseWeights.speed = 0.05;
                baseWeights.cost = 0.05;
                break;
            case 'location_finder':
                baseWeights.quality = 0.3;
                baseWeights.speed = 0.5;
                baseWeights.cost = 0.1;
                break;
            case 'deepwiki':
                if (size === 'large') {
                    baseWeights.quality = 0.7;
                    baseWeights.contextWindow = 0.1;
                }
                break;
        }
        return baseWeights;
    }
    /**
     * Get minimum requirements for a role and size
     */
    getMinRequirements(role, size) {
        const requirements = {};
        if (role === 'deepwiki' && size === 'large') {
            requirements.minContextWindow = 500000;
            requirements.minQuality = 8.0;
        }
        else if (role === 'comparator') {
            requirements.minQuality = 7.5;
            requirements.minContextWindow = 128000;
        }
        else if (role === 'location_finder') {
            requirements.maxResponseTime = 3000;
            requirements.minContextWindow = 32000;
        }
        return requirements;
    }
    /**
     * Get default weights
     */
    getDefaultWeights() {
        return {
            quality: 0.6,
            speed: 0.2,
            cost: 0.1,
            freshness: 0.1,
            contextWindow: 0.0
        };
    }
    /**
     * Get fallback model from existing configurations or research
     */
    async getFallbackModelFromConfig(role, language, size, primaryModel) {
        // First, try to find a similar configuration that already has a fallback
        const { data: similarConfigs } = await this.supabase
            .from('model_configurations')
            .select('fallback_provider, fallback_model')
            .eq('role', role)
            .limit(5);
        if (similarConfigs && similarConfigs.length > 0) {
            // Find a fallback that's different from our primary
            for (const config of similarConfigs) {
                const fallback = `${config.fallback_provider}/${config.fallback_model}`;
                if (fallback !== primaryModel) {
                    this.log('debug', `Using fallback from similar config: ${fallback}`);
                    return fallback;
                }
            }
        }
        // If no suitable fallback found, research one
        const primaryProvider = this.extractProvider(primaryModel);
        // Request research for fallback with different provider preference
        const fallbackModel = await this.researcher.requestSpecificContextResearch({
            language,
            repo_size: size,
            task_type: role,
            specific_requirements: [`different_provider_than_${primaryProvider}`]
        });
        // If research fails, get from our populated configurations
        if (!fallbackModel) {
            // Query for any high-quality model from a different provider
            const { data: fallbackConfig } = await this.supabase
                .from('model_configurations')
                .select('primary_provider, primary_model')
                .neq('primary_provider', primaryProvider)
                .eq('role', 'orchestrator') // Use orchestrator as it has high-quality models
                .single();
            if (fallbackConfig) {
                return `${fallbackConfig.primary_provider}/${fallbackConfig.primary_model}`;
            }
        }
        return fallbackModel || primaryModel; // Last resort: use same as primary
    }
    /**
     * Clear cache
     */
    /**
     * BUG-119 FIX: Normalize role names for Supabase lookup
     * Maps code conventions to database conventions
     */
    normalizeRoleName(role) {
        const normalized = role.toLowerCase();
        // Map common variations to database names
        const roleMap = {
            'codequality': 'code_quality',
            'code-quality': 'code_quality',
            'code_quality': 'code_quality'
        };
        return roleMap[normalized] || normalized;
    }
    clearCache() {
        this.cache.clear();
        this.log('info', 'Configuration cache cleared');
    }
    /**
     * Create fallback alert in Supabase for monitoring
     * Stores both Level 1 (key rotation) and Level 2 (emergency) fallback events
     */
    async createFallbackAlert(alert) {
        try {
            const { error } = await this.supabase
                .from('system_alerts')
                .insert({
                alert_type: alert.alert_type,
                severity: alert.severity,
                component: 'ModelConfigResolver',
                context: alert.context || {},
                metadata: {
                    provider: alert.provider,
                    model: alert.model,
                    failed_keys_count: alert.failed_keys_count,
                    total_keys_count: alert.total_keys_count,
                    failed_key_index: alert.failed_key_index,
                    remaining_keys: alert.remaining_keys,
                    error_message: alert.error_message
                },
                message: alert.message,
                timestamp: alert.timestamp,
                resolved: false,
                created_at: new Date().toISOString()
            });
            if (error) {
                this.log('error', 'Failed to create fallback alert in Supabase', error);
            }
            else {
                this.log('info', `Fallback alert stored: ${alert.alert_type} (${alert.severity})`);
            }
        }
        catch (err) {
            this.log('error', 'Exception while creating fallback alert', err);
        }
    }
    /**
     * Log helper
     */
    log(level, message, data) {
        var _a, _b;
        if (this.logger) {
            (_b = (_a = this.logger)[level]) === null || _b === void 0 ? void 0 : _b.call(_a, message, data);
        }
        else {
            // Use array-style logging to avoid format string interpretation
            const prefix = '[ModelConfigResolver]';
            const levelTag = `[${level.toUpperCase()}]`;
            if (data !== undefined) {
                console.log(prefix, levelTag, message, data);
            }
            else {
                console.log(prefix, levelTag, message);
            }
        }
    }
}
exports.ModelConfigResolver = ModelConfigResolver;
