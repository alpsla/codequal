/**
 * Tool Registry for managing MCP and direct tools
 * Handles tool registration, discovery, and role-based selection
 */
import { Tool, AgentRole, AnalysisContext, ToolType } from './interfaces';
export declare class ToolRegistry {
    private tools;
    private roleMapping;
    private languageMapping;
    constructor();
    /**
     * Initialize role mappings with primary and fallback tools
     * Each role has at least 2 tools for redundancy
     * UPDATED: June 11, 2025 - Added new Phase 2 direct tools
     */
    private initializeRoleMappings;
    /**
     * Register a tool in the registry
     */
    register(tool: Tool): void;
    /**
     * Unregister a tool
     */
    unregister(toolId: string): boolean;
    /**
     * Get a tool by ID
     */
    getTool(toolId: string): Tool | undefined;
    /**
     * Get all registered tools
     */
    getAllTools(): Tool[];
    /**
     * Get tools for a specific role
     */
    getToolsForRole(role: AgentRole): Tool[];
    /**
     * Get tools that support a specific language
     */
    getToolsForLanguage(language: string): Tool[];
    /**
     * Get tools that can analyze the given context
     */
    getCompatibleTools(context: AnalysisContext): Tool[];
    /**
     * Get tools by type (MCP or direct)
     */
    getToolsByType(type: ToolType): Tool[];
    /**
     * Check if a tool is registered
     */
    hasTool(toolId: string): boolean;
    /**
     * Get statistics about registered tools
     */
    getStatistics(): {
        total: number;
        byType: Record<ToolType, number>;
        byRole: Record<AgentRole, number>;
        byLanguage: Record<string, number>;
    };
    /**
     * Validate all registered tools
     */
    validateAll(): Promise<Map<string, boolean>>;
}
export declare const toolRegistry: ToolRegistry;
//# sourceMappingURL=registry.d.ts.map