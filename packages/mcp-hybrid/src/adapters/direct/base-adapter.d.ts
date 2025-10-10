/**
 * Base adapter for direct tool integrations
 * Provides common functionality for non-MCP tools
 */
import { Tool, ToolResult, AnalysisContext, ToolMetadata, ToolCapability, ToolRequirements } from '../../core/interfaces';
export declare abstract class DirectToolAdapter implements Tool {
    abstract readonly id: string;
    abstract readonly name: string;
    readonly type: "direct";
    abstract readonly version: string;
    abstract readonly capabilities: ToolCapability[];
    abstract readonly requirements: ToolRequirements;
    /**
     * Check if tool can analyze given PR context
     */
    abstract canAnalyze(context: AnalysisContext): boolean;
    /**
     * Execute analysis on PR files
     */
    abstract analyze(context: AnalysisContext): Promise<ToolResult>;
    /**
     * Get tool metadata
     */
    abstract getMetadata(): ToolMetadata;
    /**
     * Execute command and return output
     */
    protected executeCommand(command: string, args: string[], options?: {
        cwd?: string;
        timeout?: number;
        env?: Record<string, string>;
    }): Promise<{
        stdout: string;
        stderr: string;
        code: number;
    }>;
    /**
     * Simple command execution with output
     */
    protected execSimple(command: string): Promise<string>;
    /**
     * Parse JSON output safely
     */
    protected parseJsonOutput(output: string): any;
    /**
     * Common health check implementation
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get health check command - must be implemented by subclasses
     */
    protected abstract getHealthCheckCommand(): {
        cmd: string;
        args: string[];
    };
}
/**
 * Prettier Direct Adapter - Code formatting checks
 */
export declare class PrettierDirectAdapter extends DirectToolAdapter {
    readonly id = "prettier-direct";
    readonly name = "Prettier Code Formatter";
    readonly version = "3.0.0";
    readonly capabilities: ToolCapability[];
    readonly requirements: ToolRequirements;
    canAnalyze(context: AnalysisContext): boolean;
    analyze(context: AnalysisContext): Promise<ToolResult>;
    private checkFormatting;
    protected getHealthCheckCommand(): {
        cmd: string;
        args: string[];
    };
    getMetadata(): ToolMetadata;
}
/**
 * Dependency Cruiser Direct Adapter - Dependency analysis
 */
export declare class DependencyCruiserDirectAdapter extends DirectToolAdapter {
    readonly id = "dependency-cruiser-direct";
    readonly name = "Dependency Cruiser";
    readonly version = "15.0.0";
    readonly capabilities: ToolCapability[];
    readonly requirements: ToolRequirements;
    canAnalyze(context: AnalysisContext): boolean;
    analyze(context: AnalysisContext): Promise<ToolResult>;
    private analyzeDependencies;
    private mapSeverity;
    protected getHealthCheckCommand(): {
        cmd: string;
        args: string[];
    };
    getMetadata(): ToolMetadata;
}
export declare const prettierDirectAdapter: PrettierDirectAdapter;
export declare const dependencyCruiserDirectAdapter: DependencyCruiserDirectAdapter;
//# sourceMappingURL=base-adapter.d.ts.map