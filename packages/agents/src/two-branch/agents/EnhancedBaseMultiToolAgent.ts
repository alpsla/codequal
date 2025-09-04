/**
 * Enhanced Base Multi-Tool Agent with Deduplication
 * 
 * Improvements:
 * 1. Integrated deduplication
 * 2. Tool categorization (core, optional, commercial, external)
 * 3. Smart language detection for tool applicability
 * 4. Graceful config handling
 */

import { logger } from '../utils/logger';
import { IssueDeduplicator } from '../../standard/services/issue-deduplicator';

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
  rawIssueCount?: number;  // Before deduplication
  deduplicatedCount?: number;  // After deduplication
  summary: any;
  metadata: {
    totalExecutionTime: number;
    toolsExecuted: string[];
    toolsFailed: string[];
    toolsSkipped: string[];  // NEW: Track skipped tools
    skipReasons?: Record<string, string>;  // NEW: Why tools were skipped
    parallelExecution: boolean;
    deduplicationApplied: boolean;  // NEW: Track if deduplication was used
    repository?: string;
    error?: string;
    [key: string]: any;
  };
}

export interface ToolExecutor {
  name: string;
  execute: (targetPath: string, language?: string) => Promise<ToolResult>;
  isApplicable?: (language: string) => boolean;
  category?: 'core' | 'optional' | 'commercial' | 'external';  // NEW: Tool categorization
  requiresConfig?: string[];  // NEW: Required config files
}

export abstract class EnhancedBaseMultiToolAgent {
  protected abstract agentName: string;
  protected abstract tools: ToolExecutor[];
  protected deduplicator: IssueDeduplicator;
  
  constructor() {
    this.deduplicator = new IssueDeduplicator();
  }
  
  /**
   * Get only tools that should actually run
   */
  protected getExecutableTools(language: string, targetPath: string): {
    executable: ToolExecutor[];
    skipped: Array<{ tool: string; reason: string }>;
  } {
    const executable: ToolExecutor[] = [];
    const skipped: Array<{ tool: string; reason: string }> = [];
    
    for (const tool of this.tools) {
      // Skip external service tools
      if (tool.category === 'external') {
        skipped.push({
          tool: tool.name,
          reason: 'External service dependency'
        });
        continue;
      }
      
      // Skip commercial tools (for now - will be enabled in beta)
      if (tool.category === 'commercial') {
        skipped.push({
          tool: tool.name,
          reason: 'Commercial license required (will be enabled in beta)'
        });
        continue;
      }
      
      // Check language applicability
      if (tool.isApplicable && !tool.isApplicable(language)) {
        skipped.push({
          tool: tool.name,
          reason: `Not applicable for ${language}`
        });
        continue;
      }
      
      // Check required configs
      if (tool.requiresConfig) {
        const missingConfigs = tool.requiresConfig.filter(config => 
          !this.configExists(targetPath, config)
        );
        if (missingConfigs.length > 0) {
          skipped.push({
            tool: tool.name,
            reason: `Missing config: ${missingConfigs.join(', ')}`
          });
          continue;
        }
      }
      
      // Optional tools - only run if explicitly enabled
      if (tool.category === 'optional') {
        if (!this.isOptionalToolEnabled(tool.name)) {
          skipped.push({
            tool: tool.name,
            reason: 'Optional tool not enabled'
          });
          continue;
        }
      }
      
      executable.push(tool);
    }
    
    return { executable, skipped };
  }
  
  /**
   * Check if a config file exists
   */
  protected configExists(targetPath: string, configFile: string): boolean {
    // This would check for .prettierrc, .eslintrc, etc.
    // For now, return false to skip tools requiring config
    return false;
  }
  
  /**
   * Check if an optional tool is enabled
   */
  protected isOptionalToolEnabled(toolName: string): boolean {
    // Could be controlled by environment variable or config
    // For now, disable optional tools
    return false;
  }
  
  /**
   * Run all applicable tools in parallel with deduplication
   */
  protected async runToolsInParallel(
    targetPath: string,
    language: string,
    options?: {
      includeOptional?: boolean;
      timeout?: number;
    }
  ): Promise<ToolResult[]> {
    const startTime = Date.now();
    
    // Get executable tools
    const { executable, skipped } = this.getExecutableTools(language, targetPath);
    
    logger.info(`🚀 ${this.agentName}: Running ${executable.length} tools in parallel`);
    logger.info(`   (${skipped.length} tools skipped)`);
    
    executable.forEach(tool => {
      logger.info(`   • ${tool.name}`);
    });
    
    if (skipped.length > 0) {
      logger.info(`   Skipped tools:`);
      skipped.forEach(({ tool, reason }) => {
        logger.info(`   ⏭️ ${tool}: ${reason}`);
      });
    }
    
    // Execute all tools in parallel with error handling
    const toolPromises = executable.map(tool => 
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
    
    logger.info(`📊 ${this.agentName}: ${successful.length}/${executable.length} tools successful`);
    
    return results;
  }
  
  /**
   * Execute a tool safely with error handling
   */
  protected async executeToolSafely(
    tool: ToolExecutor,
    targetPath: string,
    language: string,
    timeout?: number
  ): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Add timeout if specified
      const promise = tool.execute(targetPath, language);
      
      if (timeout) {
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        );
        
        const result = await Promise.race([promise, timeoutPromise]);
        const executionTime = Date.now() - startTime;
        
        // Add execution time to metadata
        if (result.metadata) {
          result.metadata.executionTime = executionTime;
        } else {
          result.metadata = { executionTime, filesAnalyzed: 0, errors: [] };
        }
        
        logger.info(`   ✓ ${tool.name} completed in ${executionTime}ms`);
        return result;
      } else {
        const result = await promise;
        const executionTime = Date.now() - startTime;
        
        if (result.metadata) {
          result.metadata.executionTime = executionTime;
        } else {
          result.metadata = { executionTime, filesAnalyzed: 0, errors: [] };
        }
        
        logger.info(`   ✓ ${tool.name} completed in ${executionTime}ms`);
        return result;
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(`   ✗ ${tool.name} failed after ${executionTime}ms: ${error.message}`);
      
      return {
        tool: tool.name,
        findings: [],
        metadata: {
          executionTime,
          filesAnalyzed: 0,
          errors: [error.message]
        }
      };
    }
  }
  
  /**
   * Apply deduplication to findings
   */
  protected deduplicateFindings(findings: any[]): {
    deduplicated: any[];
    rawCount: number;
    removedCount: number;
  } {
    const rawCount = findings.length;
    
    // Convert to deduplicator format
    const formattedIssues = findings.map(finding => ({
      title: finding.title || finding.message || finding.description || 'Unknown',
      severity: finding.severity || 'medium',
      category: finding.category || finding.type || 'general',
      location: {
        file: finding.file || finding.location?.file || 'unknown',
        line: finding.line || finding.location?.line || 0
      },
      description: finding.description,
      codeSnippet: finding.codeSnippet || finding.snippet,
      ...finding  // Preserve original fields
    }));
    
    const deduplicated = this.deduplicator.deduplicateIssues(formattedIssues);
    const removedCount = rawCount - deduplicated.length;
    
    if (removedCount > 0) {
      logger.info(`🧹 ${this.agentName}: Removed ${removedCount} duplicate issues (${(removedCount/rawCount*100).toFixed(1)}% reduction)`);
    }
    
    return {
      deduplicated,
      rawCount,
      removedCount
    };
  }
  
  /**
   * Merge findings from multiple tools with deduplication
   */
  protected mergeToolFindings(toolResults: ToolResult[]): any[] {
    const allFindings: any[] = [];
    
    for (const result of toolResults) {
      for (const finding of result.findings) {
        // Add tool source to finding
        const enhancedFinding = {
          ...finding,
          tool: result.tool,
          metadata: {
            ...finding.metadata,
            source: result.tool
          }
        };
        allFindings.push(enhancedFinding);
      }
    }
    
    // Apply deduplication
    const { deduplicated, rawCount, removedCount } = this.deduplicateFindings(allFindings);
    
    logger.info(`📊 ${this.agentName}: Total findings: ${rawCount} raw, ${deduplicated.length} after deduplication`);
    
    return deduplicated;
  }
  
  /**
   * Generate summary from findings
   */
  protected abstract generateSummary(findings: any[]): any;
  
  /**
   * Main analysis method to be implemented by subclasses
   * Should use the enhanced features
   */
  public abstract analyze(input: {
    targetPath?: string;
    findings?: any[];
    language: string;
    context?: any;
  }): Promise<AgentAnalysisResult>;
}