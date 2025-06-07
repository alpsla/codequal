/**
 * Tool Registry for managing MCP and direct tools
 * Handles tool registration, discovery, and role-based selection
 */

import { 
  Tool, 
  AgentRole, 
  AnalysisContext, 
  ToolMetadata,
  ToolType 
} from './interfaces';

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private roleMapping = new Map<AgentRole, Set<string>>();
  private languageMapping = new Map<string, Set<string>>();
  
  constructor() {
    this.initializeRoleMappings();
  }
  
  /**
   * Initialize role mappings with primary and fallback tools
   * Each role has at least 2 tools for redundancy
   */
  private initializeRoleMappings(): void {
    // Security role tools
    this.roleMapping.set('security', new Set([
      'mcp-scan',        // Primary: security verification
      'semgrep-mcp',     // Primary: code security scanning
      'sonarqube'        // Fallback: general security checks
    ]));
    
    // Code quality role tools
    this.roleMapping.set('codeQuality', new Set([
      'eslint-mcp',      // Primary: JS/TS linting
      'sonarqube',       // Primary: multi-language quality
      'prettier-direct'  // Fallback: formatting checks
    ]));
    
    // Architecture role tools
    this.roleMapping.set('architecture', new Set([
      'dependency-cruiser-direct',  // Primary: dependency analysis
      'madge-direct',              // Primary: circular dependency detection
      'git-mcp'                    // Fallback: file structure analysis
    ]));
    
    // Performance role tools
    this.roleMapping.set('performance', new Set([
      'lighthouse-direct',    // Primary: web performance
      'sonarqube',           // Primary: code complexity
      'bundlephobia-direct'  // Fallback: bundle size analysis
    ]));
    
    // Dependency role tools
    this.roleMapping.set('dependency', new Set([
      'npm-audit-direct',     // Primary: security audit
      'license-checker-direct', // Primary: license compliance
      'outdated-direct'       // Fallback: version checks
    ]));
    
    // Educational role tools
    this.roleMapping.set('educational', new Set([
      'context-mcp',          // Primary: retrieves context from Vector DB & web
      'knowledge-graph-mcp',  // Primary: identifies learning paths
      'mcp-memory',          // Fallback: stores/retrieves learning progress
      'web-search-mcp'       // Fallback: finds educational resources
    ]));
    
    // Reporting role tools
    this.roleMapping.set('reporting', new Set([
      'chartjs-mcp',         // Primary: generates charts/visualizations
      'mermaid-mcp',         // Primary: creates diagrams
      'markdown-pdf-mcp',    // Fallback: formats reports
      'grafana-direct'       // Fallback: dashboard integration
    ]));
  }
  
  /**
   * Register a tool in the registry
   */
  register(tool: Tool): void {
    const metadata = tool.getMetadata();
    
    // Register in main registry
    this.tools.set(tool.id, tool);
    
    // Update role mappings
    metadata.supportedRoles.forEach(role => {
      if (!this.roleMapping.has(role)) {
        this.roleMapping.set(role, new Set());
      }
      this.roleMapping.get(role)!.add(tool.id);
    });
    
    // Update language mappings
    if (metadata.supportedLanguages.length > 0) {
      metadata.supportedLanguages.forEach(lang => {
        if (!this.languageMapping.has(lang)) {
          this.languageMapping.set(lang, new Set());
        }
        this.languageMapping.get(lang)!.add(tool.id);
      });
    } else {
      // Tool supports all languages
      this.languageMapping.set('*', this.languageMapping.get('*') || new Set());
      this.languageMapping.get('*')!.add(tool.id);
    }
    
    console.log(`Registered tool: ${tool.id} (${tool.type})`);
  }
  
  /**
   * Unregister a tool
   */
  unregister(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;
    
    const metadata = tool.getMetadata();
    
    // Remove from role mappings
    metadata.supportedRoles.forEach(role => {
      this.roleMapping.get(role)?.delete(toolId);
    });
    
    // Remove from language mappings
    this.languageMapping.forEach(toolSet => {
      toolSet.delete(toolId);
    });
    
    // Remove from main registry
    this.tools.delete(toolId);
    
    console.log(`Unregistered tool: ${toolId}`);
    return true;
  }
  
  /**
   * Get a tool by ID
   */
  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }
  
  /**
   * Get all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get tools for a specific role
   */
  getToolsForRole(role: AgentRole): Tool[] {
    const toolIds = this.roleMapping.get(role) || new Set();
    return Array.from(toolIds)
      .map(id => this.tools.get(id))
      .filter((tool): tool is Tool => tool !== undefined);
  }
  
  /**
   * Get tools that support a specific language
   */
  getToolsForLanguage(language: string): Tool[] {
    const toolIds = new Set<string>();
    
    // Add language-specific tools
    this.languageMapping.get(language)?.forEach(id => toolIds.add(id));
    
    // Add universal tools
    this.languageMapping.get('*')?.forEach(id => toolIds.add(id));
    
    return Array.from(toolIds)
      .map(id => this.tools.get(id))
      .filter((tool): tool is Tool => tool !== undefined);
  }
  
  /**
   * Get tools that can analyze the given context
   */
  getCompatibleTools(context: AnalysisContext): Tool[] {
    return this.getAllTools().filter(tool => tool.canAnalyze(context));
  }
  
  /**
   * Get tools by type (MCP or direct)
   */
  getToolsByType(type: ToolType): Tool[] {
    return this.getAllTools().filter(tool => tool.type === type);
  }
  
  /**
   * Check if a tool is registered
   */
  hasT
(toolId: string): boolean {
    return this.tools.has(toolId);
  }
  
  /**
   * Get statistics about registered tools
   */
  getStatistics(): {
    total: number;
    byType: Record<ToolType, number>;
    byRole: Record<AgentRole, number>;
    byLanguage: Record<string, number>;
  } {
    const tools = this.getAllTools();
    
    const byType: Record<ToolType, number> = {
      mcp: 0,
      direct: 0
    };
    
    const byRole: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};
    
    // Count by type
    tools.forEach(tool => {
      byType[tool.type]++;
    });
    
    // Count by role
    this.roleMapping.forEach((toolIds, role) => {
      byRole[role] = toolIds.size;
    });
    
    // Count by language
    this.languageMapping.forEach((toolIds, lang) => {
      byLanguage[lang] = toolIds.size;
    });
    
    return {
      total: tools.length,
      byType,
      byRole: byRole as Record<AgentRole, number>,
      byLanguage
    };
  }
  
  /**
   * Validate all registered tools
   */
  async validateAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [toolId, tool] of this.tools) {
      try {
        const isHealthy = await tool.healthCheck();
        results.set(toolId, isHealthy);
      } catch (error) {
        console.error(`Health check failed for ${toolId}:`, error);
        results.set(toolId, false);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry();
