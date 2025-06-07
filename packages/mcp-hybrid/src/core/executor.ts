/**
 * Tool Executor - Handles parallel tool execution with smart strategies
 * Executes tools in parallel for maximum performance
 */

import { 
  Tool,
  ToolResult,
  AnalysisContext,
  ConsolidatedToolResults,
  SelectedTools,
  ToolFinding
} from './interfaces';
import { toolManager } from './tool-manager';

export interface ExecutionStrategy {
  mode: 'parallel-all' | 'parallel-by-role' | 'sequential';
  maxConcurrency?: number;
  timeout?: number;
  failFast?: boolean;
}

export interface ExecutionProgress {
  totalTools: number;
  completed: number;
  failed: number;
  inProgress: number;
  results: Map<string, ToolResult>;
}

export class ToolExecutor {
  private defaultStrategy: ExecutionStrategy = {
    mode: 'parallel-all',
    maxConcurrency: 10,
    timeout: 60000, // 1 minute total
    failFast: false
  };
  
  /**
   * Execute tools with specified strategy
   */
  async executeTools(
    tools: SelectedTools,
    context: AnalysisContext,
    strategy: ExecutionStrategy = this.defaultStrategy,
    onProgress?: (progress: ExecutionProgress) => void
  ): Promise<ConsolidatedToolResults> {
    const startTime = Date.now();
    const allTools = [...tools.primary, ...tools.fallback];
    
    // Initialize progress tracking
    const progress: ExecutionProgress = {
      totalTools: allTools.length,
      completed: 0,
      failed: 0,
      inProgress: 0,
      results: new Map()
    };
    
    let results: ToolResult[] = [];
    
    switch (strategy.mode) {
      case 'parallel-all':
        results = await this.executeParallelAll(allTools, context, strategy, progress, onProgress);
        break;
        
      case 'parallel-by-role':
        results = await this.executeParallelByRole(tools, context, strategy, progress, onProgress);
        break;
        
      case 'sequential':
        results = await this.executeSequential(allTools, context, strategy, progress, onProgress);
        break;
    }
    
    // Consolidate results
    return this.consolidateResults(results, Date.now() - startTime);
  }
  
  /**
   * Execute all tools in parallel with concurrency limit
   */
  private async executeParallelAll(
    tools: Tool[],
    context: AnalysisContext,
    strategy: ExecutionStrategy,
    progress: ExecutionProgress,
    onProgress?: (progress: ExecutionProgress) => void
  ): Promise<ToolResult[]> {
    const maxConcurrency = strategy.maxConcurrency || 10;
    const results: ToolResult[] = [];
    const executing: Promise<void>[] = [];
    
    // Create a queue of tool executions
    const toolQueue = [...tools];
    
    // Process tools with concurrency limit
    while (toolQueue.length > 0 || executing.length > 0) {
      // Start new executions up to concurrency limit
      while (executing.length < maxConcurrency && toolQueue.length > 0) {
        const tool = toolQueue.shift()!;
        
        const execution = this.executeSingleTool(tool, context, strategy.timeout)
          .then(result => {
            results.push(result);
            progress.completed++;
            progress.results.set(tool.id, result);
            
            if (result.success) {
              console.log(`✓ Tool ${tool.id} completed in ${result.executionTime}ms`);
            } else {
              progress.failed++;
              console.error(`✗ Tool ${tool.id} failed: ${result.error?.message}`);
            }
          })
          .finally(() => {
            progress.inProgress--;
            onProgress?.(progress);
          });
        
        executing.push(execution);
        progress.inProgress++;
        onProgress?.(progress);
      }
      
      // Wait for at least one to complete
      if (executing.length > 0) {
        await Promise.race(executing);
        // Remove completed promises
        executing.splice(0, executing.length, 
          ...executing.filter(p => p.constructor.name === 'Promise')
        );
      }
    }
    
    // Wait for all remaining executions
    await Promise.all(executing);
    
    return results;
  }
  
  /**
   * Execute tools in parallel groups by role
   */
  private async executeParallelByRole(
    tools: SelectedTools,
    context: AnalysisContext,
    strategy: ExecutionStrategy,
    progress: ExecutionProgress,
    onProgress?: (progress: ExecutionProgress) => void
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    
    // First, execute all primary tools in parallel
    console.log('Executing primary tools in parallel...');
    const primaryPromises = tools.primary.map(tool => 
      this.executeSingleTool(tool, context, strategy.timeout)
        .then(result => {
          progress.completed++;
          progress.results.set(tool.id, result);
          onProgress?.(progress);
          return result;
        })
    );
    
    progress.inProgress = primaryPromises.length;
    onProgress?.(progress);
    
    const primaryResults = await Promise.allSettled(primaryPromises);
    
    // Process primary results
    let primaryFailures = 0;
    primaryResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (!result.value.success) primaryFailures++;
      } else {
        // Promise rejected
        const tool = tools.primary[index];
        results.push({
          success: false,
          toolId: tool.id,
          executionTime: 0,
          error: {
            code: 'EXECUTION_FAILED',
            message: result.reason?.message || 'Unknown error',
            recoverable: true
          }
        });
        primaryFailures++;
      }
    });
    
    // If too many primary tools failed, execute fallbacks
    if (primaryFailures > tools.primary.length / 2 && tools.fallback.length > 0) {
      console.log('Executing fallback tools due to primary failures...');
      
      const fallbackPromises = tools.fallback.map(tool => 
        this.executeSingleTool(tool, context, strategy.timeout)
          .then(result => {
            progress.completed++;
            progress.results.set(tool.id, result);
            onProgress?.(progress);
            return result;
          })
      );
      
      const fallbackResults = await Promise.allSettled(fallbackPromises);
      
      fallbackResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const tool = tools.fallback[index];
          results.push({
            success: false,
            toolId: tool.id,
            executionTime: 0,
            error: {
              code: 'EXECUTION_FAILED',
              message: result.reason?.message || 'Unknown error',
              recoverable: true
            }
          });
        }
      });
    }
    
    return results;
  }
  
  /**
   * Execute tools sequentially (fallback mode)
   */
  private async executeSequential(
    tools: Tool[],
    context: AnalysisContext,
    strategy: ExecutionStrategy,
    progress: ExecutionProgress,
    onProgress?: (progress: ExecutionProgress) => void
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    
    for (const tool of tools) {
      progress.inProgress = 1;
      onProgress?.(progress);
      
      try {
        const result = await this.executeSingleTool(tool, context, strategy.timeout);
        results.push(result);
        progress.completed++;
        progress.results.set(tool.id, result);
        
        if (strategy.failFast && !result.success) {
          console.log('Stopping execution due to failFast strategy');
          break;
        }
      } catch (error: any) {
        results.push({
          success: false,
          toolId: tool.id,
          executionTime: 0,
          error: {
            code: 'EXECUTION_FAILED',
            message: error.message,
            recoverable: true
          }
        });
        progress.failed++;
        
        if (strategy.failFast) {
          break;
        }
      }
      
      progress.inProgress = 0;
      onProgress?.(progress);
    }
    
    return results;
  }
  
  /**
   * Execute a single tool with timeout
   */
  private async executeSingleTool(
    tool: Tool,
    context: AnalysisContext,
    timeout?: number
  ): Promise<ToolResult> {
    const timeoutMs = timeout || 30000; // Default 30 seconds per tool
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<ToolResult>((_, reject) => {
        setTimeout(() => reject(new Error(`Tool execution timeout after ${timeoutMs}ms`)), timeoutMs);
      });
      
      // Race between tool execution and timeout
      const result = await Promise.race([
        toolManager.executeTool(tool, context),
        timeoutPromise
      ]);
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        toolId: tool.id,
        executionTime: timeoutMs,
        error: {
          code: 'TIMEOUT',
          message: error.message,
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Consolidate tool results into a single structure
   */
  private consolidateResults(
    results: ToolResult[],
    totalExecutionTime: number
  ): ConsolidatedToolResults {
    const findings: ToolFinding[] = [];
    const metrics: Record<string, number> = {};
    const toolsExecuted: string[] = [];
    const toolsFailed: Array<{ toolId: string; error: string }> = [];
    
    // Process each result
    for (const result of results) {
      if (result.success) {
        toolsExecuted.push(result.toolId);
        
        // Merge findings
        if (result.findings) {
          findings.push(...result.findings);
        }
        
        // Merge metrics
        if (result.metrics) {
          Object.entries(result.metrics).forEach(([key, value]) => {
            // Prefix metric with tool ID to avoid collisions
            metrics[`${result.toolId}.${key}`] = value;
          });
        }
      } else {
        toolsFailed.push({
          toolId: result.toolId,
          error: result.error?.message || 'Unknown error'
        });
      }
    }
    
    // Add summary metrics
    metrics['tools.total'] = results.length;
    metrics['tools.succeeded'] = toolsExecuted.length;
    metrics['tools.failed'] = toolsFailed.length;
    metrics['tools.successRate'] = toolsExecuted.length / results.length;
    
    return {
      findings: this.deduplicateFindings(findings),
      metrics,
      toolsExecuted,
      toolsFailed,
      executionTime: totalExecutionTime
    };
  }
  
  /**
   * Deduplicate findings from multiple tools
   */
  private deduplicateFindings(findings: ToolFinding[]): ToolFinding[] {
    const seen = new Map<string, ToolFinding>();
    
    for (const finding of findings) {
      // Create a unique key for the finding
      const key = `${finding.type}-${finding.category}-${finding.file || 'global'}-${finding.line || 0}-${finding.message}`;
      
      if (!seen.has(key)) {
        seen.set(key, finding);
      } else {
        // If duplicate, keep the one with higher severity
        const existing = seen.get(key)!;
        if (this.compareSeverity(finding.severity, existing.severity) > 0) {
          seen.set(key, finding);
        }
      }
    }
    
    return Array.from(seen.values());
  }
  
  /**
   * Compare severity levels
   */
  private compareSeverity(a: ToolFinding['severity'], b: ToolFinding['severity']): number {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    return severityOrder[a] - severityOrder[b];
  }
}

// Export singleton instance
export const toolExecutor = new ToolExecutor();

/**
 * Example usage with different strategies
 */
export const executionExamples = {
  // Maximum parallelism - best for independent tools
  fastParallel: {
    mode: 'parallel-all' as const,
    maxConcurrency: 20,
    timeout: 30000,
    failFast: false
  },
  
  // Balanced approach - primary tools first, then fallbacks if needed
  balanced: {
    mode: 'parallel-by-role' as const,
    maxConcurrency: 10,
    timeout: 45000,
    failFast: false
  },
  
  // Conservative approach - one at a time
  conservative: {
    mode: 'sequential' as const,
    timeout: 60000,
    failFast: true
  }
};
