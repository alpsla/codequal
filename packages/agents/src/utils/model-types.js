"use strict";
/**
 * Model-related types to replace @codequal/core/services/model-selection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelVersionSync = exports.ModelTier = void 0;
var ModelTier;
(function (ModelTier) {
    ModelTier["PREMIUM"] = "premium";
    ModelTier["STANDARD"] = "standard";
    ModelTier["BUDGET"] = "budget";
    ModelTier["FREE"] = "free";
})(ModelTier || (exports.ModelTier = ModelTier = {}));
class ModelVersionSync {
    constructor(logger, supabaseUrl, supabaseKey) {
        this.logger = logger;
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
    }
    async getModelVersion(provider, model) {
        // Stub implementation
        return {
            id: `${provider}/${model}`,
            provider,
            model,
            tier: ModelTier.STANDARD,
            capabilities: {
                supportsFunctionCalling: true,
                supportsStreaming: true,
                maxTokens: 4096
            },
            pricing: {
                input: 0.01,
                output: 0.02
            }
        };
    }
    async updateModelVersion(info) {
        console.log('Model version updated:', info);
    }
    getCanonicalVersion(modelId) {
        // Extract canonical version from model ID (e.g., "claude-3.5-sonnet" -> "3.5")
        const versionMatch = modelId.match(/(\d+(?:\.\d+)?)/);
        return versionMatch ? versionMatch[1] : '1.0';
    }
}
exports.ModelVersionSync = ModelVersionSync;
