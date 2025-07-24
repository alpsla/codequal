/**
 * Educational Tool Orchestrator
 * Manages tool execution for Educational Agent through the orchestrator pattern
 * Implements cost controls and data storage strategies
 */
import { ToolResultRetrievalService } from '@codequal/core/services/deepwiki-tools';
import { AuthenticatedUser } from '../middleware/auth-middleware';
export interface EducationalToolResult {
    documentation: EducationalDocumentation[];
    workingExamples: WorkingExample[];
    versionInfo: VersionInfo[];
    cachedResults: number;
    freshResults: number;
    totalCost: number;
}
export interface EducationalDocumentation {
    id: string;
    topic: string;
    content: string;
    source: 'cache' | 'context7' | 'vector_db';
    url?: string;
    version?: string;
    lastUpdated: Date;
    expiresAt: Date;
    storageType: 'cache' | 'persistent';
}
export interface WorkingExample {
    id: string;
    title: string;
    code: string;
    language: string;
    source: 'cache' | 'curated' | 'external';
    validated: boolean;
    storageType: 'cache' | 'curated';
    expiresAt?: Date;
}
export interface VersionInfo {
    packageName: string;
    currentVersion: string;
    latestVersion: string;
    source: 'cache' | 'context7';
    expiresAt: Date;
}

export interface CompiledFindings {
    findings: Array<{
        category: string;
        severity: string;
        message: string;
        file?: string;
        line?: number;
    }>;
    summary: string;
    totalIssues: number;
}

export interface RecommendationModule {
    recommendations: Array<{
        category: string;
        title: string;
        description: string;
        priority: 'high' | 'medium' | 'low';
    }>;
}

export interface DeepWikiSummary {
    overview: string;
    keyInsights: string[];
    timestamp: Date;
}

export interface AnalysisContext {
    repositoryUrl: string;
    branch?: string;
    primaryLanguage?: string;
    dependencies?: Record<string, string>;
    metadata?: Record<string, unknown>;
}
export interface EducationalDataStorageConfig {
    cacheOnlyPatterns: {
        documentation: {
            ttl: number;
            maxSize: number;
        };
        examples: {
            ttl: number;
            maxSize: number;
        };
        versionInfo: {
            ttl: number;
            maxSize: number;
        };
    };
    userStorage: {
        maxSizePerUser: number;
        learningHistoryDays: number;
        skillTrackingEnabled: boolean;
    };
    curatedContent: {
        maxExamples: number;
        requiresApproval: boolean;
        categories: string[];
    };
}
export declare class EducationalToolOrchestrator {
    private authenticatedUser;
    private toolResultRetrievalService;
    private readonly logger;
    private readonly cacheManager;
    private readonly storageConfig;
    constructor(authenticatedUser: AuthenticatedUser, toolResultRetrievalService: ToolResultRetrievalService);
    /**
     * Execute educational tools with compiled analysis results
     * Called by orchestrator AFTER specialized agents complete
     * Tools receive the compiled findings as context for educational content generation
     */
    executeEducationalTools(compiledFindings: CompiledFindings, recommendationModule: RecommendationModule, deepWikiSummary: DeepWikiSummary, analysisContext: AnalysisContext): Promise<EducationalToolResult>;
    /**
     * Check cache for existing content
     */
    private checkCache;
    /**
     * Fetch documentation with Context 7 integration
     */
    private fetchDocumentation;
    /**
     * Fetch working examples (prefer curated content)
     */
    private fetchWorkingExamples;
    /**
     * Fetch version information with aggressive caching
     */
    private fetchVersionInfo;
    /**
     * Search Vector DB for existing educational content
     */
    private searchVectorDB;
    /**
     * Get curated examples from our approved library
     */
    private getCuratedExamples;
    /**
     * Calculate cost for documentation fetching
     */
    private calculateDocumentationCost;
    /**
     * Enforce storage limits to control costs
     */
    private enforceStorageLimits;
    /**
     * Get storage usage for a user
     */
    getUserStorageUsage(): Promise<{
        cacheSize: number;
        persistentSize: number;
        totalSize: number;
        limit: number;
    }>;
    /**
     * Extract educational topics from compiled findings and recommendations
     */
    private extractTopicsFromCompiledFindings;
    /**
     * Extract package names from analysis context
     */
    private extractPackagesFromAnalysis;
    /**
     * Fetch documentation with compiled findings context
     * This is where educational tools would receive the compiled analysis results
     */
    private fetchDocumentationWithCompiledContext;
    /**
     * Fetch working examples with compiled context
     */
    private fetchWorkingExamplesWithCompiledContext;
    /**
     * Execute Context 7 MCP tool with compiled findings context
     */
    private executeContext7WithCompiledContext;
    /**
     * Execute working examples MCP tool with compiled context
     */
    private executeWorkingExamplesToolWithCompiledContext;
    /**
     * Get curated examples based on compiled findings
     */
    private getCuratedExamplesForCompiledFindings;
}
//# sourceMappingURL=educational-tool-orchestrator.d.ts.map