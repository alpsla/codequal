/**
 * Cloud Analysis Client
 * Communicates with cloud-based analysis service
 */
interface AnalysisRequest {
    tool: 'eslint' | 'semgrep' | 'bandit' | 'npm-audit' | 'tsc' | 'pylint' | 'mypy' | 'safety' | 'jshint' | 'jscpd' | 'madge' | 'dep-cruiser' | 'cppcheck' | 'cloc';
    repository: string;
    branch?: string;
    prNumber?: number;
    config?: Record<string, any>;
    files?: string[];
}
interface AnalysisResponse {
    analysisId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    results?: any;
    cached?: boolean;
    executionTime?: number;
    error?: string;
}
export declare class CloudAnalysisClient {
    private client;
    private redis;
    private baseUrl;
    constructor(baseUrl?: string, redisUrl?: string);
    /**
     * Submit analysis request to cloud service
     */
    analyze(request: AnalysisRequest): Promise<AnalysisResponse>;
    /**
     * Poll for async analysis results
     */
    private pollForResults;
    /**
     * Batch analyze multiple tools
     */
    batchAnalyze(repository: string, tools: string[], options?: Partial<AnalysisRequest>): Promise<Map<string, AnalysisResponse>>;
    /**
     * Get repository info (size, language, etc.)
     */
    getRepositoryInfo(repository: string): Promise<any>;
    /**
     * Generate cache key for request
     */
    private getCacheKey;
    /**
     * Helper delay function
     */
    private delay;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get list of available tools
     */
    getAvailableTools(): Promise<any>;
}
export {};
