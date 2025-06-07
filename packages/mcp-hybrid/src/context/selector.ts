/**
 * Context-aware tool selector
 * Selects appropriate tools based on PR context, agent role, and preferences
 */

import { 
  Tool,
  AgentRole,
  AnalysisContext,
  SelectedTools,
  ToolConfiguration
} from '../core/interfaces';
import { toolRegistry } from '../core/registry';

export interface VectorDBService {
  getToolConfigurations(repositoryId: string): Promise<ToolConfiguration[]>;
  getToolPreferences(repositoryId: string): Promise<{
    enabled?: string[];
    disabled?: string[];
    priority?: Record<string, number>;
  }>;
}

export class ContextAwareToolSelector {
  constructor(
    private registry = toolRegistry,
    private vectorService?: VectorDBService
  ) {}
  
  /**
   * Select tools based on context and role
   */
  async selectTools(
    role: AgentRole,
    context: AnalysisContext
  ): Promise<SelectedTools> {
    const excluded: Array<{ toolId: string; reason: string }> = [];
    
    // 1. Get base tools for role
    const candidateTools = this.registry.getToolsForRole(role);
    
    if (candidateTools.length === 0) {
      console.warn(`No tools registered for role: ${role}`);
    }
    
    // 2. Filter by language compatibility
    const languageCompatibleTools = candidateTools.filter(tool => {
      const canAnalyze = tool.canAnalyze(context);
      if (!canAnalyze) {
        const metadata = tool.getMetadata();
        const reason = this.getExclusionReason(tool, context);
        excluded.push({ toolId: tool.id, reason });
      }
      return canAnalyze;
    });
    
    // 3. Apply Vector DB preferences if available
    let finalTools = languageCompatibleTools;
    if (this.vectorService && context.repository) {
      const preferences = await this.vectorService.getToolPreferences(
        `${context.repository.owner}/${context.repository.name}`
      );
      
      finalTools = this.applyPreferences(languageCompatibleTools, preferences, excluded);
    }
    
    // 4. Apply organization constraints
    finalTools = this.applyOrganizationConstraints(
      finalTools,
      context.userContext,
      excluded
    );
    
    // 5. Check tool availability
    const availableTools = await this.checkAvailability(finalTools, excluded);
    
    // 6. Sort by priority
    const sortedTools = this.sortByPriority(availableTools, role);
    
    // 7. Separate primary and fallback tools
    const { primary, fallback } = this.separatePrimaryAndFallback(sortedTools, role);
    
    return {
      primary,
      fallback,
      excluded
    };
  }
  
  /**
   * Get reason why a tool was excluded
   */
  private getExclusionReason(tool: Tool, context: AnalysisContext): string {
    const metadata = tool.getMetadata();
    
    // Check language support
    if (metadata.supportedLanguages.length > 0 && 
        !metadata.supportedLanguages.some(lang => 
          context.repository.languages.includes(lang))) {
      return `Tool does not support languages: ${context.repository.languages.join(', ')}`;
    }
    
    // Check file requirements
    const requirements = tool.requirements;
    if (requirements.requiredFileTypes) {
      const hasRequiredFiles = requirements.requiredFileTypes.some(ext =>
        context.pr.files.some(file => file.path.endsWith(ext))
      );
      if (!hasRequiredFiles) {
        return `Missing required file types: ${requirements.requiredFileTypes.join(', ')}`;
      }
    }
    
    // Check minimum files
    if (requirements.minFiles && context.pr.files.length < requirements.minFiles) {
      return `Insufficient files: ${context.pr.files.length} < ${requirements.minFiles}`;
    }
    
    return 'Tool cannot analyze this context';
  }
  
  /**
   * Apply user/repository preferences from Vector DB
   */
  private applyPreferences(
    tools: Tool[],
    preferences: {
      enabled?: string[];
      disabled?: string[];
      priority?: Record<string, number>;
    },
    excluded: Array<{ toolId: string; reason: string }>
  ): Tool[] {
    let filteredTools = tools;
    
    // Remove disabled tools
    if (preferences.disabled && preferences.disabled.length > 0) {
      filteredTools = tools.filter(tool => {
        const isDisabled = preferences.disabled!.includes(tool.id);
        if (isDisabled) {
          excluded.push({
            toolId: tool.id,
            reason: 'Disabled by repository preferences'
          });
        }
        return !isDisabled;
      });
    }
    
    // If enabled list exists, only use those tools
    if (preferences.enabled && preferences.enabled.length > 0) {
      filteredTools = filteredTools.filter(tool => {
        const isEnabled = preferences.enabled!.includes(tool.id);
        if (!isEnabled) {
          excluded.push({
            toolId: tool.id,
            reason: 'Not in repository enabled tools list'
          });
        }
        return isEnabled;
      });
    }
    
    return filteredTools;
  }
  
  /**
   * Apply organization-level constraints
   */
  private applyOrganizationConstraints(
    tools: Tool[],
    userContext: AnalysisContext['userContext'],
    excluded: Array<{ toolId: string; reason: string }>
  ): Tool[] {
    // This could be extended to check organization policies
    // For now, just ensure user has necessary permissions
    
    return tools.filter(tool => {
      // Check if tool requires special permissions
      const metadata = tool.getMetadata();
      
      // Security tools might require special permissions
      if (metadata.tags.includes('security') && 
          !userContext.permissions.includes('security:scan')) {
        excluded.push({
          toolId: tool.id,
          reason: 'Insufficient permissions for security scanning'
        });
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Check tool availability
   */
  private async checkAvailability(
    tools: Tool[],
    excluded: Array<{ toolId: string; reason: string }>
  ): Promise<Tool[]> {
    const availableTools: Tool[] = [];
    
    for (const tool of tools) {
      try {
        const isHealthy = await tool.healthCheck();
        if (isHealthy) {
          availableTools.push(tool);
        } else {
          excluded.push({
            toolId: tool.id,
            reason: 'Tool health check failed'
          });
        }
      } catch (error: any) {
        excluded.push({
          toolId: tool.id,
          reason: `Tool unavailable: ${error.message}`
        });
      }
    }
    
    return availableTools;
  }
  
  /**
   * Sort tools by priority for the given role
   */
  private sortByPriority(tools: Tool[], role: AgentRole): Tool[] {
    // Define role-specific tool priorities
    const rolePriorities: Record<AgentRole, string[]> = {
      security: ['mcp-scan', 'semgrep-mcp', 'sonarqube'],
      codeQuality: ['eslint-mcp', 'sonarqube', 'prettier-direct'],
      architecture: ['dependency-cruiser-direct', 'madge-direct', 'git-mcp'],
      performance: ['lighthouse-direct', 'sonarqube', 'bundlephobia-direct'],
      dependency: ['npm-audit-direct', 'license-checker-direct', 'outdated-direct'],
      educational: ['context-mcp', 'knowledge-graph-mcp', 'mcp-memory', 'web-search-mcp'],
      reporting: ['chartjs-mcp', 'mermaid-mcp', 'markdown-pdf-mcp', 'grafana-direct']
    };
    
    const priorities = rolePriorities[role] || [];
    
    return tools.sort((a, b) => {
      const aPriority = priorities.indexOf(a.id);
      const bPriority = priorities.indexOf(b.id);
      
      // If both in priority list, sort by priority
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      }
      
      // Prioritized tools come first
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      
      // Otherwise maintain original order
      return 0;
    });
  }
  
  /**
   * Separate tools into primary and fallback groups
   */
  private separatePrimaryAndFallback(
    tools: Tool[],
    role: AgentRole
  ): { primary: Tool[]; fallback: Tool[] } {
    // For most roles, use all tools as primary
    // Fallback tools are typically direct integrations
    
    const primary: Tool[] = [];
    const fallback: Tool[] = [];
    
    for (const tool of tools) {
      if (tool.type === 'mcp') {
        primary.push(tool);
      } else {
        // Direct tools are fallbacks
        fallback.push(tool);
      }
    }
    
    // Special cases
    if (role === 'security' && primary.length === 0) {
      // If no MCP security tools available, use direct tools as primary
      return { primary: fallback, fallback: [] };
    }
    
    return { primary, fallback };
  }
  
  /**
   * Get recommended tools for a specific file type
   */
  getToolsForFileType(fileExtension: string): Tool[] {
    const allTools = this.registry.getAllTools();
    
    return allTools.filter(tool => {
      const capabilities = tool.capabilities;
      return capabilities.some(cap => 
        cap.fileTypes?.includes(fileExtension)
      );
    });
  }
  
  /**
   * Get tools that support specific capabilities
   */
  getToolsByCapability(capability: string): Tool[] {
    const allTools = this.registry.getAllTools();
    
    return allTools.filter(tool => 
      tool.capabilities.some(cap => cap.name === capability)
    );
  }
}

// Export singleton instance
export const toolSelector = new ContextAwareToolSelector();
