/**
 * Preprocessing Tool Executor
 * Runs all preprocessing tools and notifies per-role readiness
 */

import { parallelToolExecutor } from './parallel-tool-executor';
import { toolResultsAggregator } from './tool-results-aggregator';
import { roleReadinessManager } from './per-role-readiness';
import { agentToolAwareness } from './agent-tool-awareness';
import { AnalysisContext, AgentRole } from '../core/interfaces';
import { logging } from '@codequal/core';
import { metricsReporter } from '../monitoring/supabase-metrics-reporter';

interface PreprocessingToolMap {
  role: AgentRole;
  tools: string[];
  priority: number;
}

export class PreprocessingExecutor {
  private logger = logging.createLogger('PreprocessingExecutor');
  
  // Define preprocessing tools per role
  // NOTE: Educational and Reporting agents run AFTER orchestration, but their
  // preprocessing tools still run upfront to gather data
  private readonly PREPROCESSING_TOOLS: PreprocessingToolMap[] = [
    // ANALYSIS AGENTS (run in parallel after preprocessing)
    {
      role: 'security',
      tools: ['semgrep-mcp', 'mcp-scan', 'npm-audit-direct', 'sonarqube', 'tavily-mcp'],
      priority: 100
    },
    {
      role: 'codeQuality',
      tools: ['eslint-direct', 'sonarjs-direct', 'jscpd-direct', 'prettier-direct', 'serena-mcp', 'sonarqube'],
      priority: 90
    },
    {
      role: 'dependency',
      tools: ['npm-audit-direct', 'license-checker-direct', 'npm-outdated-direct', 'dependency-cruiser-direct', 'tavily-mcp'],
      priority: 90
    },
    {
      role: 'performance',
      tools: ['lighthouse-direct', 'bundlephobia-direct', 'sonarqube', 'sonarjs-direct'],
      priority: 80
    },
    {
      role: 'architecture',
      tools: ['madge-direct', 'dependency-cruiser-direct', 'git-mcp', 'serena-mcp'],
      priority: 80
    },
    // SEQUENTIAL AGENTS (run after orchestration)
    {
      role: 'educational',
      tools: ['context-mcp', 'knowledge-graph-mcp', 'tavily-mcp', 'mcp-memory'],
      priority: 70  // Still preprocess to gather data
    },
    {
      role: 'reporting',
      tools: ['tavily-mcp', 'git-mcp'], // Only data gathering, visualization happens at agent-time
      priority: 60
    }
  ];
  
  // Tools that should NOT run during preprocessing
  private readonly AGENT_TIME_TOOLS = new Set([
    'chartjs-mcp',         // Visualization
    'mermaid-mcp',         // Diagrams
    'markdown-pdf-mcp',    // Report formatting
    'grafana-direct',      // Dashboard push
    'context7-mcp',        // Real-time lookup
    'working-examples-mcp', // Example search
    'mcp-docs-service'     // Doc generation
  ]);
  
  // Duplicate tools to skip
  private readonly SKIP_TOOLS = new Set([
    'web-search-mcp',  // Duplicate of Tavily
    'ref-mcp'          // Replaced by Tavily
  ]);
  
  /**
   * Execute all preprocessing tools with per-role notifications
   */
  async executePreprocessing(context: AnalysisContext): Promise<void> {
    const startTime = Date.now();
    this.logger.info('Starting preprocessing phase');
    
    try {
      // Create feature branch workspace
      const featureRepoPath = await agentToolAwareness.createFeatureBranchWorkspace(
        context.repository.clonedPath || '/tmp/repo',
        context.pr.prNumber,
        context.pr.baseBranch,
        context.pr.targetBranch
      );
      
      // Register execution start
      await agentToolAwareness.registerToolExecutionStart(
        context.repository.name,
        context.pr.prNumber,
        context.pr.targetBranch,
        featureRepoPath
      );
      
      // Extract changed files
      const changedFiles = await parallelToolExecutor.extractChangedFiles(
        featureRepoPath,
        context.pr.baseBranch,
        context.pr.targetBranch
      );
      
      // Create execution plans (filtering out agent-time and skip tools)
      let plans = await parallelToolExecutor.createExecutionPlans(changedFiles);
      plans = this.filterPreprocessingTools(plans);
      
      // Group plans by role for readiness tracking
      const rolePlans = this.groupPlansByRole(plans);
      
      // Execute tools with role-based notifications
      await this.executeWithRoleNotifications(plans, rolePlans, context);
      
      // Mark overall execution complete
      await agentToolAwareness.registerToolExecutionComplete(
        context.repository.name,
        context.pr.prNumber
      );
      
      const totalTime = Date.now() - startTime;
      this.logger.info(`Preprocessing completed in ${totalTime}ms`);
      
      // Report preprocessing metrics
      await metricsReporter.reportPreprocessingPhase(
        context.repository.name,
        context.pr.prNumber,
        'preprocessing-complete',
        totalTime,
        true,
        {
          changedFiles: changedFiles.length,
          toolsExecuted: plans.length,
          featureRepoPath
        }
      );
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error(`Preprocessing failed: ${error}`);
      
      // Report failure metrics
      await metricsReporter.reportPreprocessingPhase(
        context.repository.name,
        context.pr.prNumber,
        'preprocessing-failed',
        totalTime,
        false,
        undefined,
        String(error)
      );
      
      throw error;
    }
  }
  
  /**
   * Filter out agent-time and duplicate tools
   */
  private filterPreprocessingTools(plans: any[]): any[] {
    return plans.filter(plan => {
      // Skip agent-time tools
      if (this.AGENT_TIME_TOOLS.has(plan.toolId)) {
        this.logger.info(`Skipping agent-time tool: ${plan.toolId}`);
        return false;
      }
      
      // Skip duplicate tools
      if (this.SKIP_TOOLS.has(plan.toolId)) {
        this.logger.info(`Skipping duplicate tool: ${plan.toolId}`);
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Group execution plans by role
   */
  private groupPlansByRole(plans: any[]): Map<AgentRole, Set<string>> {
    const roleTools = new Map<AgentRole, Set<string>>();
    
    this.PREPROCESSING_TOOLS.forEach(({ role, tools }) => {
      roleTools.set(role, new Set(tools));
    });
    
    return roleTools;
  }
  
  /**
   * Execute tools and notify role readiness as they complete
   */
  private async executeWithRoleNotifications(
    plans: any[],
    rolePlans: Map<AgentRole, Set<string>>,
    context: AnalysisContext
  ): Promise<void> {
    // Track completed tools per role
    const roleProgress = new Map<AgentRole, Set<string>>();
    
    // Initialize progress tracking
    rolePlans.forEach((tools, role) => {
      roleProgress.set(role, new Set());
    });
    
    // Custom execution that tracks completion per role
    const toolResults = await parallelToolExecutor.executeToolsInParallel(plans, context);
    
    // Process results and update role readiness
    for (const [toolId, roleResults] of toolResults) {
      // Update progress for each role that uses this tool
      for (const [role, _] of roleResults) {
        const progress = roleProgress.get(role);
        if (progress) {
          progress.add(toolId);
          
          // Check if all tools for this role are complete
          const requiredTools = rolePlans.get(role);
          if (requiredTools && this.isRoleComplete(progress, requiredTools)) {
            // Notify role readiness
            await roleReadinessManager.updateRoleToolCompletion(
              context.repository.name,
              context.pr.prNumber,
              role,
              Array.from(progress)
            );
            
            // Only notify for analysis agents
            // Educational and Reporting are handled by orchestrator
            if (this.isAnalysisAgent(role)) {
              this.logger.info(`✅ Analysis agent ${role} is ready to start`);
            } else {
              this.logger.info(`📦 Preprocessing for ${role} complete (will run after orchestration)`);
            }
          }
        }
      }
    }
    
    // Store aggregated results in Vector DB
    await toolResultsAggregator.aggregateAllToolResults(context);
  }
  
  /**
   * Check if all required tools for a role are complete
   */
  private isRoleComplete(completed: Set<string>, required: Set<string>): boolean {
    // Account for shared tools that might be deduplicated
    const sharedTools = new Set(['sonarqube', 'npm-audit-direct', 'dependency-cruiser-direct']);
    
    for (const tool of required) {
      if (!completed.has(tool)) {
        // Check if it's a shared tool that might have run for another role
        if (!sharedTools.has(tool)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Check if role is an analysis agent (runs in parallel)
   */
  private isAnalysisAgent(role: AgentRole): boolean {
    const analysisAgents = new Set(['security', 'codeQuality', 'dependency', 'performance', 'architecture']);
    return analysisAgents.has(role);
  }
  
  /**
   * Get tools that should run during agent analysis
   * Only Reporting has agent-time tools for visualization
   */
  getAgentTimeTools(role: AgentRole): string[] {
    switch (role) {
      case 'reporting':
        // Visualization tools run when creating final report
        return ['chartjs-mcp', 'mermaid-mcp', 'markdown-pdf-mcp', 'grafana-direct'];
      case 'educational':
        // Educational may use these for real-time lookups if needed
        return ['context7-mcp', 'working-examples-mcp', 'mcp-docs-service'];
      default:
        return [];
    }
  }
}

// Export singleton
export const preprocessingExecutor = new PreprocessingExecutor();