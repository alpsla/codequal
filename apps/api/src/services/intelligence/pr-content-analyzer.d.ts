export interface PRFile {
    filename: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
}
export interface PRContentAnalysis {
    fileTypes: string[];
    fileCategories: FileCategory[];
    changeTypes: ChangeType[];
    impactedAreas: ImpactArea[];
    complexity: 'trivial' | 'moderate' | 'complex';
    riskLevel: 'low' | 'medium' | 'high';
    totalChanges: number;
    agentsToSkip: string[];
    agentsToKeep: string[];
    skipReasons: Record<string, string>;
}
export type FileCategory = 'code' | 'test' | 'documentation' | 'configuration' | 'style' | 'asset';
export type ChangeType = 'docs-only' | 'ui-only' | 'test-only' | 'config-only' | 'style-only' | 'dependency-update' | 'feature' | 'bugfix' | 'refactor' | 'mixed';
export type ImpactArea = 'frontend' | 'backend' | 'database' | 'tests' | 'docs' | 'infra' | 'deps';
export declare class PRContentAnalyzer {
    private readonly logger;
    /**
     * Analyze PR content to determine which agents to skip
     */
    analyzePR(files: PRFile[]): Promise<PRContentAnalysis>;
    private categorizeFiles;
    private getFileExtension;
    private getFileCategory;
    private getImpactedAreas;
    private determineChangeTypes;
    private calculateComplexity;
    private assessRiskLevel;
    private determineAgentRecommendations;
}
//# sourceMappingURL=pr-content-analyzer.d.ts.map