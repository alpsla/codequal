/**
 * Monitoring Enhancements for Performance and Cost Tracking
 *
 * Tracks:
 * - Token usage per model
 * - Cost per analysis
 * - Performance metrics
 * - Model selection patterns
 */
export interface AnalysisMetrics {
    analysisId: string;
    repositoryUrl: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    tokens: {
        model: string;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    }[];
    costs: {
        model: string;
        inputCost: number;
        outputCost: number;
        totalCost: number;
    }[];
    performance: {
        phaseTimings: {
            embedding: number;
            modelSelection: number;
            analysis: number;
            reportGeneration: number;
        };
        apiCalls: {
            model: string;
            count: number;
            averageLatency: number;
        }[];
    };
    results: {
        issuesFound: number;
        score: number;
        reportSize: number;
        dataCategories: number;
    };
}
export declare class PerformanceMonitor {
    private activeAnalyses;
    /**
     * Start tracking a new analysis
     */
    startAnalysis(analysisId: string, repositoryUrl: string): void;
    /**
     * Record token usage for a model
     */
    recordTokenUsage(analysisId: string, model: string, inputTokens: number, outputTokens: number): void;
    /**
     * Record phase timing
     */
    recordPhaseTime(analysisId: string, phase: keyof AnalysisMetrics['performance']['phaseTimings'], duration: number): void;
    /**
     * Record API call metrics
     */
    recordApiCall(analysisId: string, model: string, latency: number): void;
    /**
     * Complete analysis and get final metrics
     */
    completeAnalysis(analysisId: string, results: {
        issuesFound: number;
        score: number;
        reportSize: number;
        dataCategories: number;
    }): AnalysisMetrics | null;
    /**
     * Calculate cost based on model pricing
     */
    private calculateCost;
    /**
     * Get current active analyses
     */
    getActiveAnalyses(): string[];
    /**
     * Get analysis metrics
     */
    getAnalysisMetrics(analysisId: string): AnalysisMetrics | null;
}
export declare const performanceMonitor: PerformanceMonitor;
/**
 * Helper to format metrics for reporting
 */
export declare function formatAnalysisMetrics(metrics: AnalysisMetrics): string;
//# sourceMappingURL=monitoring-enhancements.d.ts.map