/**
 * Token Usage Extractor
 *
 * This service provides an abstraction layer for extracting token usage
 * information from various AI model API responses dynamically.
 */
/**
 * Standard token usage format
 */
export interface TokenUsage {
    input: number;
    output: number;
    total: number;
}
/**
 * Token usage extraction strategy interface
 */
export interface TokenUsageExtractor {
    /**
     * Check if this extractor can handle the given response
     */
    canExtract(response: any): boolean;
    /**
     * Extract token usage from the response
     */
    extract(response: any): TokenUsage | null;
    /**
     * Provider name for logging
     */
    providerName: string;
}
/**
 * OpenAI/OpenRouter token usage extractor
 */
export declare class OpenAITokenExtractor implements TokenUsageExtractor {
    providerName: string;
    canExtract(response: any): boolean;
    extract(response: any): TokenUsage | null;
}
/**
 * Anthropic/Claude token usage extractor
 */
export declare class AnthropicTokenExtractor implements TokenUsageExtractor {
    providerName: string;
    canExtract(response: any): boolean;
    extract(response: any): TokenUsage | null;
}
/**
 * Google/Gemini token usage extractor
 */
export declare class GoogleTokenExtractor implements TokenUsageExtractor {
    providerName: string;
    canExtract(response: any): boolean;
    extract(response: any): TokenUsage | null;
}
/**
 * Cohere token usage extractor
 */
export declare class CohereTokenExtractor implements TokenUsageExtractor {
    providerName: string;
    canExtract(response: any): boolean;
    extract(response: any): TokenUsage | null;
}
/**
 * Generic token usage extractor that tries multiple strategies
 */
export declare class DynamicTokenUsageExtractor {
    private readonly logger;
    private readonly extractors;
    constructor();
    /**
     * Extract token usage from any supported API response
     */
    extractTokenUsage(response: any): TokenUsage | null;
    /**
     * Try to extract token usage heuristically from unknown response formats
     */
    private extractHeuristically;
    /**
     * Register a custom token extractor
     */
    registerExtractor(extractor: TokenUsageExtractor): void;
}
/**
 * Get the dynamic token usage extractor instance
 */
export declare function getTokenUsageExtractor(): DynamicTokenUsageExtractor;
/**
 * Extract token usage from any API response
 */
export declare function extractTokenUsage(response: any): TokenUsage | null;
