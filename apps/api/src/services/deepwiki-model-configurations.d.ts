/**
 * DeepWiki Model Configurations
 * Manages model performance metrics and configurations
 */
export interface ModelPerformanceMetrics {
    averageDuration: number;
    successRate: number;
    averageIssuesFound: number;
    lastUpdated: Date;
}
export declare class DeepWikiModelConfig {
    private performanceMetrics;
    updatePerformanceMetrics(language: string, repositorySize: string, duration: number, issuesFound: number, success: boolean): Promise<void>;
    getPerformanceMetrics(language: string, repositorySize: string): ModelPerformanceMetrics | null;
    getModelConfiguration(language: string, repositorySize: string): Promise<any>;
}
export declare const deepWikiModelConfig: DeepWikiModelConfig;
//# sourceMappingURL=deepwiki-model-configurations.d.ts.map