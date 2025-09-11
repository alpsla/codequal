/**
 * Tool Results Vector Storage Service
 * Stores MCP tool execution results in Vector DB for future retrieval and learning
 */
export interface ToolResultData {
    toolId: string;
    agentRole: string;
    executionTime: number;
    findings: Array<{
        type: 'issue' | 'suggestion' | 'info' | 'metric';
        severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
        category: string;
        message: string;
        file?: string;
        line?: number;
        code?: string;
        suggestion?: string;
    }>;
    metrics?: Record<string, number>;
    context: {
        repositoryId: string;
        prNumber: number;
        analysisId: string;
        timestamp: Date;
    };
}
export interface ToolResultVectorEntry {
    id: string;
    content: string;
    metadata: {
        tool_id: string;
        agent_role: string;
        repository_id: string;
        pr_number: number;
        analysis_id: string;
        finding_type: string;
        severity: string;
        category: string;
        execution_time: number;
        created_at: string;
        metrics?: Record<string, number>;
    };
    embedding?: number[];
}
export declare class ToolResultsVectorStorage {
    private readonly supabase;
    private readonly embeddingService;
    private readonly logger;
    constructor(supabase: any, embeddingService: any);
    /**
     * Store tool execution results in Vector DB
     */
    storeToolResults(analysisId: string, repositoryId: string, prNumber: number, toolResults: ToolResultData[]): Promise<void>;
    /**
     * Retrieve similar tool findings for a repository
     */
    retrieveSimilarFindings(repositoryId: string, query: string, options?: {
        toolId?: string;
        agentRole?: string;
        severity?: string;
        limit?: number;
        similarityThreshold?: number;
    }): Promise<ToolResultVectorEntry[]>;
    /**
     * Get historical tool metrics for a repository
     */
    getHistoricalMetrics(repositoryId: string, options?: {
        toolId?: string;
        agentRole?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<Record<string, any>>;
    /**
     * Create vector entries from tool results
     */
    private createVectorEntries;
    /**
     * Create content string for a finding
     */
    private createFindingContent;
    /**
     * Create summary content for tool execution
     */
    private createToolSummaryContent;
    /**
     * Get highest severity from findings
     */
    private getHighestSeverity;
    /**
     * Store a batch of vector entries
     */
    private storeBatch;
    /**
     * Aggregate metrics from historical data
     */
    private aggregateMetrics;
}
/**
 * Get or create tool results storage instance
 */
export declare function getToolResultsVectorStorage(supabase: any, embeddingService: any): ToolResultsVectorStorage;
