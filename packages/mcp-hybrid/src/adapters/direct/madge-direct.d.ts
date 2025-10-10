/**
 * Madge Direct Adapter
 * Uses madge npm package for circular dependency detection and visual dependency graphs
 */
import { DirectToolAdapter } from './base-adapter';
import { ToolResult, AnalysisContext, ToolMetadata, ToolCapability, ToolRequirements } from '../../core/interfaces';
export declare class MadgeDirectAdapter extends DirectToolAdapter {
    readonly id = "madge-direct";
    readonly name = "Madge Circular Dependency Detector";
    readonly version = "1.0.0";
    readonly capabilities: ToolCapability[];
    readonly requirements: ToolRequirements;
    /**
     * Get health check command
     */
    protected getHealthCheckCommand(): {
        cmd: string;
        args: string[];
    };
    /**
     * Check if tool can analyze given context
     */
    canAnalyze(context: AnalysisContext): boolean;
    /**
     * Execute madge analysis
     */
    analyze(context: AnalysisContext): Promise<ToolResult>;
    /**
     * Analyze imports in changed files
     */
    private analyzeImportsInChangedFiles;
    /**
     * Detect potential circular patterns in changed files
     */
    private detectPotentialCircularPatterns;
    /**
     * Analyze file structure and organization
     */
    private analyzeFileStructure;
    /**
     * Calculate import complexity score
     */
    private calculateImportComplexity;
    /**
     * Calculate limited architecture score
     */
    private calculateLimitedArchitectureScore;
    /**
     * Get unique directories from file list
     */
    private getUniqueDirectories;
    /**
     * Check if directory has TypeScript configuration
     */
    private hasTypeScriptConfig;
    /**
     * Run madge analysis on a directory
     */
    private runMadgeAnalysis;
    /**
     * Check specifically for circular dependencies
     */
    private checkCircular;
    /**
     * Generate findings for circular dependencies
     */
    private generateCircularFindings;
    /**
     * Analyze architecture metrics from madge result
     */
    private analyzeArchitectureMetrics;
    /**
     * Calculate maximum dependency depth
     */
    private calculateMaxDepth;
    /**
     * Generate findings based on architecture metrics
     */
    private generateMetricFindings;
    /**
     * Get severity based on circular dependency chain length
     */
    private getCircularSeverity;
    /**
     * Format circular dependency documentation
     */
    private formatCircularDoc;
    /**
     * Format multiple circular dependencies documentation
     */
    private formatMultipleCircularDoc;
    /**
     * Format coupling documentation
     */
    private formatCouplingDoc;
    /**
     * Format dependency depth documentation
     */
    private formatDepthDoc;
    /**
     * Format god module documentation
     */
    private formatGodModuleDoc;
    /**
     * Calculate overall metrics
     */
    private calculateOverallMetrics;
    /**
     * Calculate architecture score (0-10)
     */
    private calculateArchitectureScore;
    /**
     * Create empty result when no files to analyze
     */
    private createEmptyResult;
    /**
     * Get tool metadata
     */
    getMetadata(): ToolMetadata;
}
export declare const madgeDirectAdapter: MadgeDirectAdapter;
//# sourceMappingURL=madge-direct.d.ts.map