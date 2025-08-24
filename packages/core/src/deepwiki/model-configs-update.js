"use strict";
/**
 * DeepWiki Model Configuration Utility
 *
 * Provides centralized model configurations for the DeepWiki service
 * based on repository language and size.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelConfigManager = void 0;
/**
 * Model configuration manager for DeepWiki
 */
class ModelConfigManager {
    constructor() {
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
        this.MODEL_CONFIGS = {
            // Based on testing results
            'python': {
                'small': {
                    provider: 'openai',
                    model: 'gpt-4o' // Fastest for small repos
                },
                'medium': {
                    provider: 'anthropic',
                    model: 'claude-3-7-sonnet' // Most detailed for Python
                },
                'large': {
                    provider: 'anthropic',
                    model: 'claude-3-7-sonnet' // Most detailed for Python
                }
            },
            'javascript': {
                'small': {
                    provider: 'openai',
                    model: 'gpt-4o' // Fastest for small repos
                },
                'medium': {
                    provider: 'anthropic',
                    model: 'claude-3-7-sonnet' // Most detailed for JavaScript
                },
                'large': {
                    provider: 'anthropic',
                    model: 'claude-3-7-sonnet' // Most detailed for JavaScript
                }
            },
            'typescript': {
                'small': {
                    provider: 'openai',
                    model: 'gpt-4o' // Fastest for small repos
                },
                'medium': {
                    provider: 'google',
                    model: 'gemini-2.5-pro-preview-05-06' // Best for TypeScript
                },
                'large': {
                    provider: 'google',
                    model: 'gemini-2.5-pro-preview-05-06' // Best for TypeScript
                }
            },
            'java': {
                'small': {
                    provider: 'openai',
                    model: 'gpt-4o'
                },
                'medium': {
                    provider: 'google',
                    model: 'gemini-2.5-pro-preview-05-06'
                },
                'large': {
                    provider: 'google',
                    model: 'gemini-2.5-pro-preview-05-06'
                }
            },
            'ruby': {
                'small': {
                    provider: 'openai',
                    model: 'gpt-4o'
                },
                'medium': {
                    provider: 'anthropic',
                    model: 'claude-3-7-sonnet'
                },
                'large': {
                    provider: 'anthropic',
                    model: 'claude-3-7-sonnet'
                }
            },
            // Default for other languages
            'default': {
                'small': {
                    provider: 'openai',
                    model: 'gpt-4o' // Fastest overall for small repos
                },
                'medium': {
                    provider: 'anthropic',
                    model: 'claude-3-7-sonnet' // Most detailed overall
                },
                'large': {
                    provider: 'google',
                    model: 'gemini-2.5-pro-preview-05-06' // Good balance for large repos
                }
            },
            // Fallback configurations if preferred provider is unavailable
            'fallback': {
                'small': {
                    provider: 'openrouter',
                    model: 'anthropic/claude-3.7-sonnet' // Good fallback for Claude
                },
                'medium': {
                    provider: 'google',
                    model: 'gemini-2.5-pro-preview-05-06' // Reliable alternative
                },
                'large': {
                    provider: 'openai',
                    model: 'gpt-4o' // Fast alternative for large repos
                }
            }
        };
    }
    /**
     * Get the optimal model configuration for a repository
     *
     * @param language The programming language of the repository
     * @param size The size category of the repository
     * @returns The optimal model configuration
     */
    getModelConfig(language, size) {
        const languageConfig = this.MODEL_CONFIGS[language.toLowerCase()] || this.MODEL_CONFIGS.default;
        return languageConfig[size];
    }
    /**
     * Get fallback model configuration
     *
     * @param size The size category of the repository
     * @returns The fallback model configuration
     */
    getFallbackConfig(size) {
        return this.MODEL_CONFIGS.fallback[size];
    }
}
exports.ModelConfigManager = ModelConfigManager;
exports.default = ModelConfigManager;
