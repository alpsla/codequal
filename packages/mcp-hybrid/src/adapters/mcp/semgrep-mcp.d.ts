/**
 * Semgrep MCP Adapter
 * Security analysis tool using Semgrep via MCP
 */
import { BaseMCPAdapter } from './base-mcp-adapter';
import { ToolResult, ToolFinding, AnalysisContext, ToolMetadata, ToolCapability, ToolRequirements } from '../../core/interfaces';
export declare class SemgrepMCPAdapter extends BaseMCPAdapter {
    readonly id = "semgrep-mcp";
    readonly name = "Semgrep MCP";
    readonly version = "1.0.0";
    readonly capabilities: ToolCapability[];
    readonly requirements: ToolRequirements;
    protected readonly mcpServerArgs: string[];
    canAnalyze(context: AnalysisContext): boolean;
    analyze(context: AnalysisContext): Promise<ToolResult>;
    getMetadata(): ToolMetadata;
    protected mapSeverity(semgrepSeverity: string): ToolFinding['severity'];
}
//# sourceMappingURL=semgrep-mcp.d.ts.map