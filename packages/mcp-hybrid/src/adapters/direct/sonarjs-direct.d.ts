/**
 * SonarJS Direct Adapter
 * Provides additional code quality rules via ESLint plugin
 */
import { DirectToolAdapter } from './base-adapter';
import { ToolResult, AnalysisContext, ToolMetadata, ToolCapability, ToolRequirements } from '../../core/interfaces';
export declare class SonarJSDirectAdapter extends DirectToolAdapter {
    readonly id = "sonarjs-direct";
    readonly name = "SonarJS Direct";
    readonly version = "1.0.0";
    private eslint;
    private readonly SONAR_RULES;
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
     * Initialize ESLint with SonarJS plugin
     */
    private initializeESLint;
    /**
     * Build SonarJS rules configuration
     */
    private buildSonarRules;
    /**
     * Execute SonarJS analysis
     */
    analyze(context: AnalysisContext): Promise<ToolResult>;
    /**
     * Create finding from ESLint message
     */
    private createFinding;
    /**
     * Map SonarJS severity to tool severity
     */
    private mapSeverity;
    /**
     * Get rule documentation
     */
    private getRuleDocumentation;
    /**
     * Calculate metrics from analysis
     */
    private calculateMetrics;
    /**
     * Calculate code quality score (0-10)
     */
    private calculateQualityScore;
    /**
     * Check if file is JavaScript or TypeScript
     */
    private isJavaScriptOrTypeScript;
    /**
     * Get tool metadata
     */
    getMetadata(): ToolMetadata;
}
export declare const sonarJSDirectAdapter: SonarJSDirectAdapter;
//# sourceMappingURL=sonarjs-direct.d.ts.map