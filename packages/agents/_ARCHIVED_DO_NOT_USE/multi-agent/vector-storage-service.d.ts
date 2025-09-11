import { AuthenticatedUser } from './types/auth';
/**
 * Analysis result for Vector DB storage
 */
export interface AnalysisResult {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    findings: Array<{
        type: string;
        severity: string;
        location: string;
        description: string;
        suggestion?: string;
    }>;
    metrics: Record<string, any>;
    recommendations: string[];
    summary: string;
    categories: string[];
}
/**
 * Vector DB chunk for storage
 */
export interface VectorChunk {
    id: string;
    content: string;
    metadata: {
        repository_id: string;
        content_type: string;
        analysis_type?: string;
        severity?: string;
        file_path?: string;
        language?: string;
        framework?: string;
        finding_type?: string;
        importance_score: number;
        created_at: string;
        user_id: string;
    };
}
/**
 * Vector Storage Service - Implements replace strategy for repository analysis
 * Integrates with existing AuthenticatedRAGService for secure storage
 */
export declare class VectorStorageService {
    private readonly authenticatedRAGService;
    private readonly logger;
    constructor(authenticatedRAGService: any);
    /**
     * Store analysis results with replace strategy
     * 🔒 SECURITY: Validates repository access before storage operations
     * 1. Verify user has write access to repository
     * 2. Delete existing analysis for repository
     * 3. Insert new analysis chunks with proper isolation
     */
    storeAnalysisResults(repositoryId: string, analysisResults: AnalysisResult[], authenticatedUser: AuthenticatedUser, options?: {
        language?: string;
        framework?: string;
        replaceExisting?: boolean;
    }): Promise<{
        stored: number;
        errors: number;
    }>;
    /**
     * Validate user has required access to repository
     * 🔒 SECURITY: Prevents unauthorized data access/modification
     */
    private validateRepositoryAccess;
    /**
     * Delete all existing analysis for a repository (replace strategy)
     * 🔒 SECURITY: Repository access already validated by caller
     */
    private deleteRepositoryAnalysis;
    /**
     * Create Vector DB chunks from analysis results
     * 🔒 SECURITY: Sanitizes content and ensures proper metadata isolation
     */
    private createAnalysisChunks;
    /**
     * Insert a batch of chunks into Vector DB
     */
    private insertChunkBatch;
    /**
     * Format finding content for Vector DB storage
     */
    private formatFindingContent;
    /**
     * Format metrics content for Vector DB storage
     */
    private formatMetricsContent;
    /**
     * Calculate importance score for a finding
     */
    private calculateFindingImportance;
    /**
     * Calculate importance score for a summary
     */
    private calculateSummaryImportance;
    /**
     * Sanitize analysis result to prevent injection or data leakage
     * 🔒 SECURITY: Validates and cleans input data
     */
    private sanitizeAnalysisResult;
    /**
     * Sanitize string inputs to prevent injection attacks
     * 🔒 SECURITY: Basic sanitization for user inputs
     */
    private sanitizeString;
    /**
     * Get distribution of chunk types for logging
     */
    private getChunkTypeDistribution;
}
/**
 * Factory function to create Vector Storage Service
 */
export declare function createVectorStorageService(authenticatedRAGService: any): VectorStorageService;
