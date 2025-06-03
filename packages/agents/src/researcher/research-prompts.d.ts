/**
 * Research Prompts for RESEARCHER Agent
 *
 * These are the actual prompts the RESEARCHER agent uses to research
 * optimal AI models, considering quality, recency, cost, and performance.
 */
export declare const RESEARCH_PROMPTS: {
    /**
     * Specialized Agent Requirement Research - Find best cross-market model for specific needs
     */
    AGENT_REQUIREMENT_RESEARCH: string;
    /**
     * Agent Role-Specific Research Templates
     */
    SECURITY_AGENT_RESEARCH: string;
    PERFORMANCE_AGENT_RESEARCH: string;
    ARCHITECTURE_AGENT_RESEARCH: string;
    CODE_QUALITY_AGENT_RESEARCH: string;
    /**
     * Dynamic Discovery Prompt - No hardcoded models
     */
    DYNAMIC_MODEL_DISCOVERY: string;
    /**
     * Quality Assessment Prompt
     */
    QUALITY_ASSESSMENT: string;
    /**
     * Use Case Specialization Prompt
     */
    USE_CASE_ANALYSIS: string;
};
/**
 * Research configuration templates for different scenarios
 */
export declare const RESEARCH_CONFIGS: {
    /**
     * Quality-First Research (for critical applications)
     */
    QUALITY_FIRST: {
        weights: {
            quality: number;
            recency: number;
            performance: number;
            cost: number;
        };
        criteria: string;
        useCase: string;
    };
    /**
     * Balanced Research (default)
     */
    BALANCED: {
        weights: {
            quality: number;
            recency: number;
            performance: number;
            cost: number;
        };
        criteria: string;
        useCase: string;
    };
    /**
     * Cost-Conscious Research (for high-volume operations)
     */
    COST_CONSCIOUS: {
        weights: {
            quality: number;
            recency: number;
            performance: number;
            cost: number;
        };
        criteria: string;
        useCase: string;
    };
    /**
     * Latest-and-Greatest Research (for cutting-edge features)
     */
    BLEEDING_EDGE: {
        weights: {
            quality: number;
            recency: number;
            performance: number;
            cost: number;
        };
        criteria: string;
        useCase: string;
    };
};
export default RESEARCH_PROMPTS;
