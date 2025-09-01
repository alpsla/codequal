/**
 * Base Multi-Tool Agent
 * 
 * Provides parallel tool execution capabilities for specialized agents
 * Each agent can run multiple analysis tools in parallel
 */

import { logger } from '../utils/logger';

export interface ToolResult {
  tool: string;
  findings: any[];
  metadata?: {
    executionTime: number;
    filesAnalyzed?: number;
    errors?: string[];
  };
}

export interface AgentAnalysisResult {
  agent: string;
  tools: string[];
  issues: any[];
  summary: any;
  metadata: {
    totalExecutionTime: number;
    toolsExecuted: string[];
    toolsFailed: string[];
    parallelExecution: boolean;
    repository?: string;  // Optional: for GitHub/GitLab agents
    error?: string;       // Optional: for error messages
    [key: string]: any;   // Allow additional properties
  };
}

export interface ToolExecutor {
  name: string;
  execute: (targetPath: string, language?: string) => Promise<ToolResult>;
  isApplicable?: (language: string) => boolean;
}

export abstract class BaseMultiToolAgent {
  protected abstract agentName: string;
  protected abstract tools: ToolExecutor[];
  
  /**
   * Run all applicable tools in parallel
   */
  protected async runToolsInParallel(
    targetPath: string,
    language: string,
    options?: {
      includeTools?: string[];
      excludeTools?: string[];
      timeout?: number;
    }
  ): Promise<ToolResult[]> {
    const startTime = Date.now();
    
    // Filter applicable tools
    const applicableTools = this.tools.filter(tool => {
      // Check if tool is excluded
      if (options?.excludeTools?.includes(tool.name)) {
        return false;
      }
      
      // Check if we have an include list and tool is not in it
      if (options?.includeTools && !options.includeTools.includes(tool.name)) {
        return false;
      }
      
      // Check if tool is applicable for the language
      if (tool.isApplicable && !tool.isApplicable(language)) {
        return false;
      }
      
      return true;
    });
    
    logger.info(`🚀 ${this.agentName}: Running ${applicableTools.length} tools in parallel`);
    applicableTools.forEach(tool => {
      logger.info(`   • ${tool.name}`);
    });
    
    // Execute all tools in parallel with error handling
    const toolPromises = applicableTools.map(tool => 
      this.executeToolSafely(tool, targetPath, language, options?.timeout)
    );
    
    const results = await Promise.all(toolPromises);
    
    const executionTime = Date.now() - startTime;
    logger.info(`✅ ${this.agentName}: All tools completed in ${executionTime}ms`);
    
    // Log summary
    const successful = results.filter(r => r.findings.length > 0 || !r.metadata?.errors?.length);
    const failed = results.filter(r => r.metadata?.errors?.length);
    
    if (failed.length > 0) {
      logger.warn(`⚠️ ${this.agentName}: ${failed.length} tools failed`);
      failed.forEach(r => {
        logger.warn(`   • ${r.tool}: ${r.metadata?.errors?.join(', ')}`);
      });
    }
    
    return results;
  }
  
  /**
   * Execute a single tool with error handling and timeout
   */
  private async executeToolSafely(
    tool: ToolExecutor,
    targetPath: string,
    language: string,
    timeout = 30000
  ): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<ToolResult>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
      });
      
      // Race between tool execution and timeout
      const result = await Promise.race([
        tool.execute(targetPath, language),
        timeoutPromise
      ]);
      
      // Add execution time to metadata
      if (!result.metadata) {
        result.metadata = { executionTime: 0 };
      }
      result.metadata.executionTime = Date.now() - startTime;
      
      logger.info(`   ✓ ${tool.name} completed in ${result.metadata.executionTime}ms`);
      return result;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`   ✗ ${tool.name} failed after ${executionTime}ms: ${error}`);
      
      // Return error result
      return {
        tool: tool.name,
        findings: [],
        metadata: {
          executionTime,
          errors: [error.message || 'Unknown error']
        }
      };
    }
  }
  
  /**
   * Consolidate findings from multiple tools
   */
  protected consolidateFindings(toolResults: ToolResult[]): any[] {
    const allFindings = [];
    const findingMap = new Map<string, any>();
    
    for (const result of toolResults) {
      for (const finding of result.findings) {
        // Create a fingerprint for deduplication
        const fingerprint = this.createFindingFingerprint(finding);
        
        if (findingMap.has(fingerprint)) {
          // Merge or enhance existing finding
          const existing = findingMap.get(fingerprint);
          this.mergeFinding(existing, finding, result.tool);
        } else {
          // Add new finding
          finding.sources = [result.tool];
          findingMap.set(fingerprint, finding);
          allFindings.push(finding);
        }
      }
    }
    
    return allFindings;
  }
  
  /**
   * Create fingerprint for finding deduplication
   */
  protected createFindingFingerprint(finding: any): string {
    return `${finding.file || ''}:${finding.line || 0}:${finding.type || ''}:${finding.rule || ''}`;
  }
  
  /**
   * Merge duplicate findings from different tools
   */
  protected mergeFinding(existing: any, newFinding: any, toolName: string): void {
    // Add tool to sources
    if (!existing.sources.includes(toolName)) {
      existing.sources.push(toolName);
    }
    
    // Merge confidence scores
    if (newFinding.confidence && existing.confidence) {
      existing.confidence = Math.max(existing.confidence, newFinding.confidence);
    }
    
    // Merge additional context
    if (newFinding.context && !existing.context) {
      existing.context = newFinding.context;
    }
  }
  
  /**
   * Generate summary from findings
   */
  protected abstract generateSummary(findings: any[]): any;
  
  /**
   * Main analysis method to be implemented by subclasses
   */
  public abstract analyze(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult>;
}