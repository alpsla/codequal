/**
 * DeepWiki Model Configuration Utility
 *
 * Provides centralized model configurations for the DeepWiki service
 * based on repository language and size.
 */
export type DeepWikiProvider = 'google' | 'openai' | 'anthropic' | 'openrouter' | 'ollama';
export interface ModelConfig<T = string> {
    provider: T;
    model: string;
}
/**
 * Model configuration manager for DeepWiki
 */
export declare class ModelConfigManager {
    /**
     * Best model configurations by language and size
     * This has been updated based on comprehensive testing across different repositories
     *
     * The test analysis revealed that:
     * - OpenAI GPT-4o provides fastest responses across all languages
     * - Anthropic Claude provides most detailed responses, especially for Python and JavaScript
     * - Google Gemini provides good detail for TypeScript
     * - OpenRouter is a reliable fallback for Claude models when direct Anthropic API isn't working
     */
    private readonly MODEL_CONFIGS;
    /**
     * Get the optimal model configuration for a repository
     *
     * @param language The programming language of the repository
     * @param size The size category of the repository
     * @returns The optimal model configuration
     */
    getModelConfig(language: string, size: 'small' | 'medium' | 'large'): ModelConfig<DeepWikiProvider>;
    /**
     * Get fallback model configuration
     *
     * @param size The size category of the repository
     * @returns The fallback model configuration
     */
    getFallbackConfig(size: 'small' | 'medium' | 'large'): ModelConfig<DeepWikiProvider>;
}
export default ModelConfigManager;
