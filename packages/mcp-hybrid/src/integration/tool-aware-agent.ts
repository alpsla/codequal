/**
 * Tool-Aware Agent Implementation
 * Agents that use tools during analysis with parallel execution
 */

import {
  Tool,
  ToolResult,
  AnalysisContext,
  AgentRole,
  ConsolidatedToolResults
} from '../core/interfaces';
import { toolSelector } from '../context/selector';
import { toolExecutor, ExecutionStrategy } from '../core/executor';

export interface AgentResult {
  role: AgentRole;
  analysis: any;
  toolResults?: ConsolidatedToolResults;
  executionTime: number;
  modelUsed: string;
}

export interface ParallelExecutionOptions {
  runToolsFirst: boolean;
  toolStrategy?: ExecutionStrategy;
  agentTimeout?: number;
}

/**
 * Base class for tool-aware agents
 */
export abstract class ToolAwareAgent {
  constructor(
    protected role: AgentRole,
    protected model: any // Model config
  ) {}
  
  /**
   * Analyze with tools - can run tools and agent analysis in parallel
   */
  async analyzeWithTools(
    context: AnalysisContext,
    options: ParallelExecutionOptions = { runToolsFirst: true }
  ): Promise<AgentResult> {
    const startTime = Date.now();
    
    if (options.runToolsFirst) {
      // Traditional approach: Tools first, then agent
      return this.analyzeSequentially(context, options);
    } else {
      // Advanced approach: Tools and agent in parallel
      return this.analyzeInParallel(context, options);
    }
  }
  
  /**
   * Sequential execution: Tools first, then agent with results
   */
  private async analyzeSequentially(
    context: AnalysisContext,
    options: ParallelExecutionOptions
  ): Promise<AgentResult> {
    const startTime = Date.now();
    
    // 1. Select tools for this agent role
    const selectedTools = await toolSelector.selectTools(this.role, context);
    
    console.log(`[${this.role}] Selected ${selectedTools.primary.length} primary tools, ${selectedTools.fallback.length} fallback tools`);
    
    // 2. Execute tools in parallel
    const toolResults = await toolExecutor.executeTools(
      selectedTools,
      context,
      options.toolStrategy || { mode: 'parallel-all', maxConcurrency: 10 }
    );
    
    console.log(`[${this.role}] Tools executed in ${toolResults.executionTime}ms`);
    
    // 3. Run agent analysis with tool results
    const agentAnalysis = await this.analyzeWithContext(context, toolResults);
    
    return {
      role: this.role,
      analysis: agentAnalysis,
      toolResults,
      executionTime: Date.now() - startTime,
      modelUsed: this.model.name || 'unknown'
    };
  }
  
  /**
   * Parallel execution: Tools and agent run simultaneously
   */
  private async analyzeInParallel(
    context: AnalysisContext,
    options: ParallelExecutionOptions
  ): Promise<AgentResult> {
    const startTime = Date.now();
    
    // 1. Select tools
    const selectedTools = await toolSelector.selectTools(this.role, context);
    
    // 2. Start both tool execution and agent analysis in parallel
    const [toolResults, agentAnalysis] = await Promise.all([
      // Execute tools
      toolExecutor.executeTools(
        selectedTools,
        context,
        options.toolStrategy || { mode: 'parallel-all', maxConcurrency: 10 }
      ),
      
      // Run agent analysis without tool results (base analysis)
      this.analyzeWithContext(context, null)
    ]);
    
    // 3. If we have tool results, enhance the agent analysis
    const finalAnalysis = toolResults.findings.length > 0
      ? await this.enhanceAnalysis(agentAnalysis, toolResults)
      : agentAnalysis;
    
    return {
      role: this.role,
      analysis: finalAnalysis,
      toolResults,
      executionTime: Date.now() - startTime,
      modelUsed: this.model.name || 'unknown'
    };
  }
  
  /**
   * Analyze with optional tool context
   */
  protected abstract analyzeWithContext(
    context: AnalysisContext,
    toolResults: ConsolidatedToolResults | null
  ): Promise<any>;
  
  /**
   * Enhance analysis with tool results (for parallel execution)
   */
  protected async enhanceAnalysis(
    baseAnalysis: any,
    toolResults: ConsolidatedToolResults
  ): Promise<any> {
    // Default implementation - subclasses can override
    return {
      ...baseAnalysis,
      enhanced: true,
      toolFindings: toolResults.findings.length,
      toolMetrics: toolResults.metrics
    };
  }
}

/**
 * Parallel execution coordinator for multiple agents
 */
export class ParallelAgentExecutor {
  /**
   * Execute multiple agents with their tools in parallel
   */
  async executeAgents(
    agents: Map<AgentRole, ToolAwareAgent>,
    context: AnalysisContext,
    options: {
      parallelAgents: boolean;
      parallelTools: boolean;
      toolStrategy?: ExecutionStrategy;
    } = { parallelAgents: true, parallelTools: true }
  ): Promise<Map<AgentRole, AgentResult>> {
    const results = new Map<AgentRole, AgentResult>();
    
    if (options.parallelAgents) {
      // Execute all agents in parallel
      console.log('Executing all agents in parallel...');
      
      const agentPromises = Array.from(agents.entries()).map(async ([role, agent]) => {
        const result = await agent.analyzeWithTools(context, {
          runToolsFirst: true,
          toolStrategy: options.toolStrategy
        });
        return { role, result };
      });
      
      const agentResults = await Promise.all(agentPromises);
      
      agentResults.forEach(({ role, result }) => {
        results.set(role, result);
      });
    } else {
      // Execute agents sequentially
      console.log('Executing agents sequentially...');
      
      for (const [role, agent] of agents) {
        const result = await agent.analyzeWithTools(context, {
          runToolsFirst: true,
          toolStrategy: options.toolStrategy
        });
        results.set(role, result);
      }
    }
    
    // Log summary
    this.logExecutionSummary(results);
    
    return results;
  }
  
  /**
   * Execute agents with maximum parallelism
   */
  async executeMaxParallel(
    agents: Map<AgentRole, ToolAwareAgent>,
    context: AnalysisContext
  ): Promise<Map<AgentRole, AgentResult>> {
    console.log('🚀 Executing with maximum parallelism...');
    
    // All agents run in parallel, each agent's tools also run in parallel
    return this.executeAgents(agents, context, {
      parallelAgents: true,
      parallelTools: true,
      toolStrategy: {
        mode: 'parallel-all',
        maxConcurrency: 20,
        timeout: 30000
      }
    });
  }
  
  /**
   * Log execution summary
   */
  private logExecutionSummary(results: Map<AgentRole, AgentResult>): void {
    console.log('\n📊 Execution Summary:');
    console.log('====================');
    
    let totalTools = 0;
    let totalFindings = 0;
    let totalTime = 0;
    
    results.forEach((result, role) => {
      const toolCount = result.toolResults?.toolsExecuted.length || 0;
      const findingCount = result.toolResults?.findings.length || 0;
      
      console.log(`\n${role}:`);
      console.log(`  - Execution time: ${result.executionTime}ms`);
      console.log(`  - Tools executed: ${toolCount}`);
      console.log(`  - Findings: ${findingCount}`);
      console.log(`  - Model: ${result.modelUsed}`);
      
      totalTools += toolCount;
      totalFindings += findingCount;
      totalTime = Math.max(totalTime, result.executionTime);
    });
    
    console.log('\n📈 Totals:');
    console.log(`  - Total agents: ${results.size}`);
    console.log(`  - Total tools: ${totalTools}`);
    console.log(`  - Total findings: ${totalFindings}`);
    console.log(`  - Total time: ${totalTime}ms`);
    console.log(`  - Average time per agent: ${Math.round(totalTime / results.size)}ms`);
  }
}

/**
 * Example implementation of a tool-aware agent
 */
export class SecurityToolAwareAgent extends ToolAwareAgent {
  constructor(model: any) {
    super('security', model);
  }
  
  protected async analyzeWithContext(
    context: AnalysisContext,
    toolResults: ConsolidatedToolResults | null
  ): Promise<any> {
    // Build prompt based on whether we have tool results
    const prompt = toolResults
      ? this.buildPromptWithTools(context, toolResults)
      : this.buildBasePrompt(context);
    
    // Call model (mock implementation)
    const analysis = await this.model.complete(prompt);
    
    return {
      securityIssues: analysis.issues || [],
      recommendations: analysis.recommendations || [],
      riskScore: analysis.riskScore || 0,
      toolsUsed: toolResults?.toolsExecuted || []
    };
  }
  
  private buildPromptWithTools(
    context: AnalysisContext,
    toolResults: ConsolidatedToolResults
  ): string {
    return `
Analyze the security of this PR with the following tool findings:

Tool Results:
${toolResults.findings.map(f => `- [${f.severity}] ${f.message}`).join('\n')}

Metrics:
${Object.entries(toolResults.metrics).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

PR Context:
- Files changed: ${context.pr.files.length}
- Primary language: ${context.repository.primaryLanguage}

Provide security analysis including risk score and recommendations.
`;
  }
  
  private buildBasePrompt(context: AnalysisContext): string {
    return `
Analyze the security of this PR:

PR Context:
- Files changed: ${context.pr.files.length}
- Primary language: ${context.repository.primaryLanguage}
- Changes: ${context.pr.files.map(f => f.path).join(', ')}

Provide security analysis including risk score and recommendations.
`;
  }
}
