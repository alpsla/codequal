/**
 * Base MCP Adapter
 * Provides common functionality for all MCP tool integrations
 */
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Tool, ToolResult, ToolFinding, AnalysisContext, ToolMetadata, ToolCapability, ToolRequirements } from '../../core/interfaces';
export declare abstract class BaseMCPAdapter extends EventEmitter implements Tool {
    abstract readonly id: string;
    abstract readonly name: string;
    readonly type: "mcp";
    abstract readonly version: string;
    abstract readonly capabilities: ToolCapability[];
    abstract readonly requirements: ToolRequirements;
    protected mcpProcess?: ChildProcess;
    protected isInitialized: boolean;
    protected mcpServerCommand: string;
    protected abstract mcpServerArgs: string[];
    constructor();
    /**
     * Check if tool can analyze given context
     */
    abstract canAnalyze(context: AnalysisContext): boolean;
    /**
     * Execute analysis - must be implemented by subclasses
     */
    abstract analyze(context: AnalysisContext): Promise<ToolResult>;
    /**
     * Get tool metadata
     */
    abstract getMetadata(): ToolMetadata;
    /**
     * Initialize MCP server if not already running
     */
    protected initializeMCPServer(): Promise<void>;
    /**
     * Execute MCP command via JSON-RPC
     */
    protected executeMCPCommand<T = any>(command: {
        method: string;
        params?: any;
    }): Promise<T>;
    /**
     * Create temporary directory for file analysis
     */
    protected createTempDirectory(context: AnalysisContext): Promise<string>;
    /**
     * Write files to temporary directory
     */
    protected writeFilesToTemp(files: Array<{
        path: string;
        content: string;
    }>, tempDir: string): Promise<void>;
    /**
     * Cleanup temporary directory
     */
    protected cleanupTempDirectory(tempDir: string): Promise<void>;
    /**
     * Map severity from tool-specific to standard
     */
    protected mapSeverity(toolSeverity: string | number): ToolFinding['severity'];
    /**
     * Common health check implementation
     */
    healthCheck(): Promise<boolean>;
    /**
     * Cleanup MCP server process
     */
    cleanup(): Promise<void>;
    /**
     * Filter files based on supported extensions
     */
    protected filterSupportedFiles(files: Array<{
        path: string;
        content: string;
        changeType: string;
    }>, supportedExtensions: string[]): Array<{
        path: string;
        content: string;
    }>;
    /**
     * Create standardized error result
     */
    protected createErrorResult(error: Error, startTime: number): ToolResult;
    /**
     * Create empty success result when no files to analyze
     */
    protected createEmptyResult(startTime: number): ToolResult;
}
//# sourceMappingURL=base-mcp-adapter.d.ts.map