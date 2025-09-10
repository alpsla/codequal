/**
 * Truly Dynamic Model Selector
 *
 * NO hardcoded models, versions, or thresholds
 * Selects models purely based on role requirements and actual capabilities
 */
export interface RoleRequirements {
    role: string;
    description: string;
    languages?: string[];
    repositorySize: 'small' | 'medium' | 'large' | 'enterprise';
    maxCostPerMillion?: number;
    weights: {
        quality: number;
        speed: number;
        cost: number;
    };
    minContextWindow?: number;
    requiresReasoning?: boolean;
    requiresCodeAnalysis?: boolean;
}
export interface ModelCandidate {
    id: string;
    provider: string;
    model: string;
    contextLength: number;
    pricing: {
        prompt: number;
        completion: number;
    };
    qualityScore?: number;
    speedScore?: number;
    costScore?: number;
    totalScore?: number;
}
export declare class DynamicModelSelector {
    private openRouterApiKey;
    constructor(apiKey?: string);
    /**
     * Select models for a role WITHOUT any hardcoded names or versions
     */
    selectModelsForRole(requirements: RoleRequirements): Promise<{
        primary: ModelCandidate;
        fallback: ModelCandidate;
        reasoning: string;
    }>;
    /**
     * Fetch all models from OpenRouter
     */
    private fetchAllModels;
    /**
     * Filter models by basic requirements
     */
    private filterByRequirements;
    /**
     * Score models based on role requirements
     */
    private scoreModels;
    /**
     * Get version score from model name - higher versions are better
     * FIXED: Properly recognizes 2.5 > 2.0, 4.1 > 3.5, etc.
     */
    /**
     * Get version score from model name - higher versions are better
     * FIXED: Properly recognizes 2.5 > 2.0 > 1.5
     */
    private getVersionScore;
    /**
     * Get tier score from model name indicators
     */
    private getTierScore;
    /**
     * Get provider reputation score
     */
    private getProviderScore;
    /**
     * Get quality bonus from model name (no hardcoding specific models!)
     */
    private getNameQualityBonus;
    /**
     * Get speed bonus from model name
     */
    private getNameSpeedBonus;
    /**
     * Select a good fallback (different provider, good score)
     */
    private selectFallback;
    /**
     * Generate reasoning for the selection
     */
    private generateReasoning;
}
/**
 * Example role configurations (NO hardcoded models!)
 */
export declare const ROLE_CONFIGS: Record<string, Partial<RoleRequirements>>;
