/**
 * OpenRouter Model Validator
 *
 * Validates and normalizes model names against OpenRouter's available models
 * This ensures that the Researcher agent only stores valid model names in Vector DB
 */
interface OpenRouterModel {
    id: string;
    name: string;
    created?: number;
    context_length?: number;
    pricing?: {
        prompt: string;
        completion: string;
    };
}
export declare class OpenRouterModelValidator {
    private static instance;
    private availableModels;
    private lastFetchTime;
    private readonly CACHE_DURATION;
    private readonly OPENROUTER_API_KEY;
    private constructor();
    static getInstance(): OpenRouterModelValidator;
    /**
     * Fetch available models from OpenRouter API
     */
    private fetchAvailableModels;
    /**
     * Load fallback models in case API is unavailable
     */
    private loadFallbackModels;
    /**
     * Ensure models are loaded (with caching)
     */
    private ensureModelsLoaded;
    /**
     * Validate if a model exists in OpenRouter
     */
    isValidModel(modelId: string): Promise<boolean>;
    /**
     * Normalize a model name to OpenRouter format
     * Attempts to find the correct OpenRouter model ID for a given model name
     */
    normalizeModelName(modelName: string): Promise<string | null>;
    /**
     * Get all available models
     */
    getAvailableModels(): Promise<string[]>;
    /**
     * Get model info
     */
    getModelInfo(modelId: string): Promise<OpenRouterModel | null>;
    /**
     * Validate and normalize a model name (alias for normalizeModelName)
     * This is the primary method the Researcher agent should use
     */
    validateAndNormalize(modelName: string): Promise<string | null>;
}
export declare const openRouterModelValidator: OpenRouterModelValidator;
export {};
