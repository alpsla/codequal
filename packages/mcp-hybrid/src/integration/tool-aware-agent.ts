/**
 * Tool-Aware Agent Integration
 * Provides tool execution services for existing CodeQual agents
 */

import {
  AnalysisContext,
  AgentRole,
  ConsolidatedToolResults,
  ToolFinding
} from '../core/interfaces';
import { toolSelector } from '../context/selector';
import { toolExecutor } from '../core/executor';
import { toolRegistry } from '../core/registry';
import { initializeTools, getToolStatus } from '../core/initialize-tools';
import { logging } from '@codequal/core';

export interface AgentResult {
  role: AgentRole;
  analysis: any;
  toolResults?: ConsolidatedToolResults;
  executionTime: number;
  modelUsed: string;
}

export interface ParallelExecutionOptions {
  strategy?: 'parallel-all' | 'parallel-by-role' | 'sequential';
  maxParallel?: number;
  timeout?: number;
  toolConfig?: {
    fullRepoTools?: string[];
    prOnlyTools?: string[];
  };
}

/**
 * Tool execution service for agents
 * This service is used by the enhanced multi-agent executor
 */
export class AgentToolService {
  private logger = logging.createLogger('AgentToolService');
  private initialized = false;
  
  /**
   * Ensure tools are initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const status = getToolStatus();
      if (!status.initialized) {
        this.logger.info('Initializing tools...');
        await initializeTools();
        this.initialized = true;
        
        const newStatus = getToolStatus();
        this.logger.info('Tools initialized', {
          total: newStatus.toolCount,
          direct: newStatus.byType.direct,
          mcp: newStatus.byType.mcp
        });
      } else {
        this.initialized = true;
        this.logger.debug('Tools already initialized', status);
      }
    }
  }
  
  /**
   * Run tools for a specific agent role
   * @param role Agent role
   * @param context Analysis context
   * @param options Execution options
   */
  async runToolsForRole(
    role: AgentRole,
    context: AnalysisContext,
    options: ParallelExecutionOptions = {}
  ): Promise<ConsolidatedToolResults> {
    try {
      // Ensure tools are initialized
      await this.ensureInitialized();
      // ENSURE agentRole is set in context for role-based filtering
      const contextWithRole: AnalysisContext = {
        ...context,
        agentRole: role  // Override/ensure the role is set
      };
      
      // Select tools for this role using enhanced context
      const selectedTools = await toolSelector.selectTools(role, contextWithRole);
      
      this.logger.info(
        `Selected ${selectedTools.primary.length} primary and ${selectedTools.fallback.length} fallback tools for ${role} agent`
      );
      
      // Execute tools with role-aware context
      const results = await toolExecutor.executeTools(
        selectedTools,
        contextWithRole,  // Pass context with role
        {
          mode: (options.strategy || 'parallel-by-role') as 'parallel-all' | 'parallel-by-role' | 'sequential',
          maxConcurrency: options.maxParallel || 3,
          timeout: options.timeout || 30000
        }
      );
      
      this.logger.info(
        `Tool execution complete for ${role}: ${results.toolsExecuted.length} succeeded, ${results.toolsFailed.length} failed`
      );
      
      return results;
    } catch (error) {
      this.logger.error(`Error running tools for ${role}:`, error as Error);
      
      // Return empty results on error
      return {
        findings: [],
        metrics: {},
        toolsExecuted: [],
        toolsFailed: [],
        executionTime: 0
      };
    }
  }
  
  /**
   * Format tool results for inclusion in agent prompt
   * @param results Tool execution results
   * @param role Agent role for context
   */
  formatToolResultsForPrompt(
    results: ConsolidatedToolResults,
    role: AgentRole
  ): string {
    const sections: string[] = [];
    
    // Add header
    sections.push(`=== Tool Analysis Results for ${role} ===\n`);
    
    // Summary statistics
    sections.push('Summary:');
    sections.push(`- Tools executed: ${results.toolsExecuted.length}`);
    sections.push(`- Total findings: ${results.findings.length}`);
    sections.push(`- Execution time: ${results.executionTime}ms`);
    
    // Group findings by severity
    const bySeverity = this.groupFindingsBySeverity(results.findings);
    if (Object.keys(bySeverity).length > 0) {
      sections.push('\nFindings by Severity:');
      
      ['critical', 'high', 'medium', 'low', 'info'].forEach(severity => {
        const findings = bySeverity[severity];
        if (findings && findings.length > 0) {
          sections.push(`\n${severity.toUpperCase()} (${findings.length}):`);
          
          // Show top 5 findings for each severity
          findings.slice(0, 5).forEach(f => {
            const location = f.file ? `${f.file}:${f.line || '?'}` : 'General';
            sections.push(`- [${location}] ${f.message}`);
            if (f.ruleId) {
              sections.push(`  Rule: ${f.ruleId}`);
            }
          });
          
          if (findings.length > 5) {
            sections.push(`  ... and ${findings.length - 5} more`);
          }
        }
      });
    }
    
    // Add metrics
    if (Object.keys(results.metrics).length > 0) {
      sections.push('\nMetrics:');
      Object.entries(results.metrics).forEach(([key, value]) => {
        sections.push(`- ${this.formatMetricName(key)}: ${value}`);
      });
    }
    
    // Tool execution details
    sections.push('\nTool Execution:');
    sections.push(`- Successful: ${results.toolsExecuted.join(', ') || 'None'}`);
    if (results.toolsFailed.length > 0) {
      sections.push(`- Failed: ${results.toolsFailed.map(f => `${f.toolId} (${f.error})`).join(', ')}`);
    }
    
    return sections.join('\n');
  }
  
  /**
   * Create a summary object for agent consumption
   */
  createToolSummary(results: ConsolidatedToolResults): Record<string, any> {
    const summary: Record<string, any> = {
      totalFindings: results.findings.length,
      findingsBySeverity: {},
      findingsByCategory: {},
      metrics: results.metrics,
      toolsExecuted: results.toolsExecuted,
      executionTime: results.executionTime
    };
    
    // Count by severity
    results.findings.forEach(f => {
      summary.findingsBySeverity[f.severity] = 
        (summary.findingsBySeverity[f.severity] || 0) + 1;
      summary.findingsByCategory[f.category] = 
        (summary.findingsByCategory[f.category] || 0) + 1;
    });
    
    // Extract auto-fixable count
    summary.autoFixableCount = results.findings.filter(f => f.autoFixable).length;
    
    // Extract critical issues
    summary.criticalIssues = results.findings
      .filter(f => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 10)
      .map(f => ({
        message: f.message,
        file: f.file,
        line: f.line,
        ruleId: f.ruleId
      }));
    
    return summary;
  }
  
  /**
   * Group findings by severity
   */
  private groupFindingsBySeverity(
    findings: ToolFinding[]
  ): Record<string, ToolFinding[]> {
    const grouped: Record<string, ToolFinding[]> = {};
    
    findings.forEach(finding => {
      if (!grouped[finding.severity]) {
        grouped[finding.severity] = [];
      }
      grouped[finding.severity].push(finding);
    });
    
    return grouped;
  }
  
  /**
   * Format metric name for display
   */
  private formatMetricName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

/**
 * Parallel execution coordinator for multiple agents with tools
 */
export class ParallelAgentExecutor {
  private logger = logging.createLogger('ParallelAgentExecutor');
  private toolService = new AgentToolService();
  
  /**
   * Execute tools for multiple agents in parallel
   * Returns a map of role to tool results
   */
  async executeToolsForAgents(
    agentRoles: AgentRole[],
    context: AnalysisContext,
    options: ParallelExecutionOptions = {}
  ): Promise<Map<AgentRole, ConsolidatedToolResults>> {
    const results = new Map<AgentRole, ConsolidatedToolResults>();
    
    this.logger.info(`Executing tools for ${agentRoles.length} agents in parallel`);
    
    // Execute tools for all agents in parallel
    const toolPromises = agentRoles.map(async role => {
      // Ensure each role execution has the role set in context
      const roleContext: AnalysisContext = {
        ...context,
        agentRole: role
      };
      const toolResults = await this.toolService.runToolsForRole(role, roleContext, options);
      return { role, toolResults };
    });
    
    const toolExecutions = await Promise.all(toolPromises);
    
    // Store results
    toolExecutions.forEach(({ role, toolResults }) => {
      results.set(role, toolResults);
    });
    
    // Log summary
    this.logExecutionSummary(results);
    
    return results;
  }
  
  /**
   * Log execution summary
   */
  private logExecutionSummary(results: Map<AgentRole, ConsolidatedToolResults>): void {
    let totalTools = 0;
    let totalFindings = 0;
    let totalTime = 0;
    
    const summary: string[] = ['Tool Execution Summary:'];
    
    results.forEach((result, role) => {
      const toolCount = result.toolsExecuted.length;
      const findingCount = result.findings.length;
      
      summary.push(`  ${role}: ${toolCount} tools, ${findingCount} findings, ${result.executionTime}ms`);
      
      totalTools += toolCount;
      totalFindings += findingCount;
      totalTime = Math.max(totalTime, result.executionTime);
    });
    
    summary.push(`Total: ${results.size} agents, ${totalTools} tools, ${totalFindings} findings`);
    summary.push(`Execution time: ${totalTime}ms`);
    
    this.logger.info(summary.join('\n'));
  }
}

// Export singleton instances for easy use
export const agentToolService = new AgentToolService();
export const parallelAgentExecutor = new ParallelAgentExecutor();
