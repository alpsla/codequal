/**
 * Serena MCP Adapter - Semantic Code Understanding via LSP
 * Provides intelligent code analysis, refactoring suggestions, and semantic understanding
 */
import { BaseMCPAdapter } from './base-mcp-adapter';
import { ToolCapability, AnalysisContext, ToolResult, ToolMetadata, ToolRequirements } from '../../core/interfaces';
export declare class SerenaMCPAdapter extends BaseMCPAdapter {
    id: string;
    name: string;
    version: string;
    get mcpServerArgs(): string[];
    capabilities: ToolCapability[];
    requirements: ToolRequirements;
    /**
     * Check if tool can analyze given context
     */
    canAnalyze(context: AnalysisContext): boolean;
    /**
     * Analyze PR using Serena's semantic understanding
     */
    analyze(context: AnalysisContext): Promise<ToolResult>;
    /**
     * Analyze code quality using semantic understanding
     */
    private analyzeCodeQuality;
    /**
     * Analyze architecture using semantic understanding
     */
    private analyzeArchitecture;
    /**
     * Analyze security patterns
     */
    private analyzeSecurityPatterns;
    /**
     * Perform general semantic analysis
     */
    private performSemanticAnalysis;
    /**
     * Helper methods for analysis
     */
    private findComplexFunctions;
    private findDuplicationPatterns;
    private analyzeModuleStructure;
    private checkArchitecturalPatterns;
    private hasHardcodedSecrets;
    private findUnsafePatterns;
    private analyzeNamingConventions;
    private analyzeFunctionSignatures;
    private extractImports;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
    /**
     * Override to prevent MCP server initialization
     */
    protected initializeMCPServer(): Promise<void>;
    /**
     * Get metadata
     */
    getMetadata(): ToolMetadata;
}
export declare const serenaMCPAdapter: SerenaMCPAdapter;
//# sourceMappingURL=serena-mcp.d.ts.map