/**
 * ESLint Direct Adapter
 * Directly executes ESLint for JavaScript/TypeScript analysis
 */
import { DirectToolAdapter } from './base-adapter';
import { AnalysisContext, ToolResult, ToolMetadata, ToolCapability, ToolRequirements } from '../../core/interfaces';
export declare class ESLintDirectAdapter extends DirectToolAdapter {
    readonly id = "eslint-direct";
    readonly name = "ESLint Code Quality Analyzer";
    readonly version = "9.0.0";
    readonly capabilities: ToolCapability[];
    readonly requirements: ToolRequirements;
    canAnalyze(context: AnalysisContext): boolean;
    analyze(context: AnalysisContext): Promise<ToolResult>;
    private writeESLintConfig;
    private runESLint;
    private parseESLintMessages;
    private calculateMetrics;
    getMetadata(): ToolMetadata;
    /**
     * Get health check command for ESLint
     */
    protected getHealthCheckCommand(): {
        cmd: string;
        args: string[];
    };
}
export declare const eslintDirectAdapter: ESLintDirectAdapter;
//# sourceMappingURL=eslint-direct.d.ts.map