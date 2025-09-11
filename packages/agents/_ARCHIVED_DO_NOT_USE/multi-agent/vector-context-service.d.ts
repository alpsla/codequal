import { AgentRole } from '@codequal/core/config/agent-registry';
import { VectorSearchResult, RepositoryVectorContext } from './enhanced-executor';
import { AuthenticatedUser } from './types/auth';
/**
 * Agent-specific search configuration for Vector DB queries
 */
export interface AgentSearchConfig {
    role: AgentRole;
    searchTerms: string[];
    contentTypes: string[];
    maxResults: number;
    minSimilarity: number;
    timeWindowDays?: number;
}
/**
 * Vector Context Service - Replaces DeepWiki data extraction with Vector DB queries
 * Uses existing AuthenticatedRAGService for secure, tenant-isolated searches
 */
export declare class VectorContextService {
    private readonly authenticatedRAGService;
    private readonly logger;
    private readonly supabase;
    private readonly agentSearchConfigs;
    constructor(authenticatedRAGService: any, // Will be properly typed when integrated
    supabaseClient?: any);
    /**
     * Get agent-specific repository context from Vector DB
     */
    getRepositoryContext(repositoryId: string, agentRole: AgentRole, authenticatedUser: AuthenticatedUser, options?: {
        maxResults?: number;
        minSimilarity?: number;
        includeHistorical?: boolean;
    }): Promise<RepositoryVectorContext>;
    /**
     * Get cross-repository patterns for learning
     * 🔒 SECURITY: Implements strict access control and content sanitization
     */
    getCrossRepositoryPatterns(agentRole: AgentRole, searchQuery: string, authenticatedUser: AuthenticatedUser, options?: {
        maxResults?: number;
        excludeRepositoryId?: string;
        respectUserPermissions?: boolean;
        sanitizeContent?: boolean;
        anonymizeMetadata?: boolean;
    }): Promise<VectorSearchResult[]>;
    /**
     * Store analysis results in Vector DB with replace strategy
     */
    storeAnalysisResults(repositoryId: string, analysisResults: any[], userId: string): Promise<void>;
    /**
     * Search repository-specific content
     */
    private searchRepositoryContent;
    /**
     * Search historical patterns in repository
     */
    private searchHistoricalPatterns;
    /**
     * Delete existing repository analysis (replace strategy)
     */
    private deleteRepositoryAnalysis;
    /**
     * Create analysis chunks for Vector DB storage
     */
    private createAnalysisChunks;
    /**
     * Insert analysis chunks into Vector DB
     */
    private insertAnalysisChunks;
    /**
     * Map RAG service result to VectorSearchResult
     */
    private mapToVectorSearchResult;
    /**
     * Calculate confidence score based on result quality
     */
    private calculateConfidenceScore;
    /**
     * Calculate recency score from results
     */
    private calculateRecencyScore;
    /**
     * Calculate importance score for analysis result
     */
    private calculateImportanceScore;
    /**
     * Format finding content for Vector DB storage
     */
    private formatFindingContent;
    /**
     * Sanitize cross-repository results to prevent data leakage
     * 🔒 SECURITY: Removes sensitive information from cross-repo patterns
     */
    private sanitizeCrossRepoResults;
    /**
     * Sanitize content to remove specific identifiers
     * 🔒 SECURITY: Anonymizes patterns while preserving learning value
     */
    private sanitizeContent;
    /**
     * Create empty context when no data available
     */
    private createEmptyContext;
    /**
     * Validate repository access for authenticated user
     * 🔒 SECURITY: Ensures user has required permission for repository
     */
    private validateRepositoryAccess;
    /**
     * Get user's accessible repositories for cross-repository searches
     * 🔒 SECURITY: Only returns repositories user has read access to
     */
    private getUserAccessibleRepositories;
    /**
     * Check if a repository ID represents a public GitHub repository
     * Public GitHub repositories should be accessible for read operations
     */
    private isPublicGitHubRepository;
}
/**
 * Factory function to create Vector Context Service
 */
export declare function createVectorContextService(authenticatedRAGService: any): VectorContextService;
