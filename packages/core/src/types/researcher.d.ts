/**
 * Researcher Agent Interface
 * Defines the contract for researcher agents without creating circular dependencies
 */
export interface IResearcherAgent {
    executeResearch(params: ResearchParams): Promise<ResearchResult>;
    getCapabilities(): ResearchCapabilities;
    validateConfiguration(config: any): boolean;
    conductResearchAndUpdate(context: any): Promise<ResearchResult>;
    conductMetaResearch(): Promise<ResearchResult>;
    useResearcherForContext(language: string, sizeCategory: string, agentRole: string, frameworks?: string[], complexity?: number): Promise<ResearchResult>;
    getCacheStats(): {
        hits: number;
        misses: number;
        size: number;
        model?: string;
    };
    upgradeResearcher(newModel: string, oldModel?: string, force?: boolean, preserveCache?: boolean): Promise<{
        success: boolean;
        oldModel: string;
        newModel: string;
    }>;
}
export interface ResearchParams {
    type: 'meta-research' | 'context-research';
    context?: any;
    options?: {
        maxTokens?: number;
        temperature?: number;
        [key: string]: any;
    };
}
export interface ResearchResult {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: {
        model?: string;
        duration?: number;
        tokens?: number;
        [key: string]: any;
    };
    currentModel?: string;
    recommendation?: string;
    upgradeRecommendation?: any;
    prompt?: string;
    tokensUsed?: number;
    templateReused?: boolean;
}
export interface ResearchCapabilities {
    supportsMetaResearch: boolean;
    supportsContextResearch: boolean;
    maxContextLength: number;
    supportedModels: string[];
}
export interface ResearchSchedule {
    id: string;
    type: 'quarterly' | 'on-demand';
    cronExpression?: string;
    lastRun?: Date;
    nextRun?: Date;
    status: 'active' | 'paused' | 'completed';
    metadata?: Record<string, any>;
}
