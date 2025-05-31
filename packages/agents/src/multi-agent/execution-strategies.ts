import { AgentConfig, AnalysisStrategy, RepositoryData } from './types';
import { createLogger } from '@codequal/core/utils';
import { AgentRole } from '@codequal/core/config/agent-registry';

/**
 * Execution context passed to strategies
 */
export interface ExecutionContext {
  repositoryData: RepositoryData;
  agents: AgentConfig[];
  options: {
    maxConcurrentAgents: number;
    tokenBudget: number;
    timeoutMs: number;
    debug: boolean;
  };
  additionalContext?: Record<string, any>;
}

/**
 * Result from strategy execution
 */
export interface StrategyExecutionResult {
  results: any[];
  metadata: {
    duration: number;
    tokenUsage: number;
    successfulAgents: number;
    failedAgents: number;
    strategy: AnalysisStrategy;
  };
}

/**
 * Base execution strategy interface
 */
export interface ExecutionStrategy {
  execute(context: ExecutionContext): Promise<StrategyExecutionResult>;
  getName(): string;
  getDescription(): string;
}

/**
 * Parallel execution strategy - all agents run concurrently
 */
export class ParallelExecutionStrategy implements ExecutionStrategy {
  private readonly logger = createLogger('ParallelStrategy');
  
  getName(): string {
    return 'Parallel';
  }
  
  getDescription(): string {
    return 'Execute all agents concurrently for maximum speed';
  }
  
  async execute(context: ExecutionContext): Promise<StrategyExecutionResult> {
    const startTime = Date.now();
    const { agents, options } = context;
    
    this.logger.info('Starting parallel execution', { agentCount: agents.length });
    
    // Create semaphore for concurrency control
    const semaphore = new Semaphore(options.maxConcurrentAgents);
    
    // Execute all agents with concurrency control
    const executionPromises = agents.map(async (agentConfig) => {
      return semaphore.acquire(async () => {
        return this.executeAgent(agentConfig, context);
      });
    });
    
    // Wait for all agents to complete
    const results = await Promise.allSettled(executionPromises);
    
    // Process results
    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failedResults = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    
    if (failedResults.length > 0) {
      this.logger.warn('Some agents failed in parallel execution', {
        failed: failedResults.length,
        successful: successfulResults.length
      });
    }
    
    const duration = Date.now() - startTime;
    
    return {
      results: successfulResults,
      metadata: {
        duration,
        tokenUsage: this.calculateTokenUsage(successfulResults),
        successfulAgents: successfulResults.length,
        failedAgents: failedResults.length,
        strategy: AnalysisStrategy.PARALLEL
      }
    };
  }
  
  private async executeAgent(agentConfig: AgentConfig, _context: ExecutionContext): Promise<any> {
    // This would integrate with the actual agent execution logic
    // For now, return a mock result
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    
    return {
      agentId: `${agentConfig.provider}-${agentConfig.role}`,
      config: agentConfig,
      result: {
        insights: [`Analysis from ${agentConfig.provider}`],
        suggestions: [`Suggestion from ${agentConfig.role}`],
        metadata: { executionTime: Date.now() }
      }
    };
  }
  
  private calculateTokenUsage(results: any[]): number {
    // Mock calculation - would be real in actual implementation
    return results.length * 1000;
  }
}

/**
 * Sequential execution strategy - agents run one after another with context passing
 */
export class SequentialExecutionStrategy implements ExecutionStrategy {
  private readonly logger = createLogger('SequentialStrategy');
  
  getName(): string {
    return 'Sequential';
  }
  
  getDescription(): string {
    return 'Execute agents sequentially, passing context between them';
  }
  
  async execute(context: ExecutionContext): Promise<StrategyExecutionResult> {
    const startTime = Date.now();
    const { agents } = context;
    
    this.logger.info('Starting sequential execution', { agentCount: agents.length });
    
    const results = [];
    let accumulatedContext = { ...context.additionalContext };
    let successfulAgents = 0;
    let failedAgents = 0;
    
    // Execute agents sequentially
    for (let i = 0; i < agents.length; i++) {
      const agentConfig = agents[i];
      
      try {
        this.logger.debug(`Executing agent ${i + 1}/${agents.length}`, {
          provider: agentConfig.provider,
          role: agentConfig.role
        });
        
        const result = await this.executeAgentWithContext(agentConfig, context, accumulatedContext);
        results.push(result);
        successfulAgents++;
        
        // Enhance context for next agent
        accumulatedContext = {
          ...accumulatedContext,
          previousResults: results,
          lastResult: result,
          executionStep: i + 1
        };
        
      } catch (error) {
        this.logger.warn(`Agent failed in sequential execution`, {
          agent: agentConfig.provider,
          step: i + 1,
          error: error instanceof Error ? error.message : error
        });
        
        failedAgents++;
        
        // Continue with next agent unless this was a critical failure
        if (agentConfig.position === 'primary' && !context.options.debug) {
          throw error;
        }
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      results,
      metadata: {
        duration,
        tokenUsage: this.calculateTokenUsage(results),
        successfulAgents,
        failedAgents,
        strategy: AnalysisStrategy.SEQUENTIAL
      }
    };
  }
  
  private async executeAgentWithContext(
    agentConfig: AgentConfig,
    context: ExecutionContext,
    accumulatedContext: Record<string, any>
  ): Promise<any> {
    // Enhanced context for sequential execution
    const _enhancedContext = {
      ...context.repositoryData,
      executionContext: accumulatedContext,
      agentPosition: agentConfig.position,
      previousInsights: accumulatedContext.previousResults?.map((r: any) => r.result?.insights).flat() || []
    };
    
    // Mock execution - would be real agent execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 1000));
    
    return {
      agentId: `${agentConfig.provider}-${agentConfig.role}`,
      config: agentConfig,
      result: {
        insights: [
          `Sequential analysis from ${agentConfig.provider}`,
          `Context-aware insight based on ${accumulatedContext.executionStep || 0} previous results`
        ],
        suggestions: [`Enhanced suggestion from ${agentConfig.role}`],
        metadata: { 
          executionTime: Date.now(),
          contextSize: Object.keys(accumulatedContext).length,
          sequentialStep: accumulatedContext.executionStep || 1
        }
      }
    };
  }
  
  private calculateTokenUsage(results: any[]): number {
    // Sequential execution typically uses more tokens due to context passing
    return results.length * 1500;
  }
}

/**
 * Specialized execution strategy - agents run based on file patterns and expertise
 */
export class SpecializedExecutionStrategy implements ExecutionStrategy {
  private readonly logger = createLogger('SpecializedStrategy');
  
  getName(): string {
    return 'Specialized';
  }
  
  getDescription(): string {
    return 'Execute agents based on their specialization and file patterns';
  }
  
  async execute(context: ExecutionContext): Promise<StrategyExecutionResult> {
    const startTime = Date.now();
    const { agents, repositoryData } = context;
    
    this.logger.info('Starting specialized execution', { agentCount: agents.length });
    
    // Group agents by specialization
    const specializations = this.groupAgentsBySpecialization(agents, repositoryData);
    
    const results = [];
    let successfulAgents = 0;
    let failedAgents = 0;
    
    // Execute each specialization group
    for (const [specialization, specializationData] of specializations.entries()) {
      this.logger.debug(`Executing specialization: ${specialization}`, {
        agentCount: specializationData.agents.length,
        fileCount: specializationData.relevantFiles.length
      });
      
      try {
        const specializationResults = await this.executeSpecializationGroup(
          specializationData,
          context
        );
        
        results.push(...specializationResults);
        successfulAgents += specializationResults.length;
        
      } catch (error) {
        this.logger.warn(`Specialization group failed`, {
          specialization,
          error: error instanceof Error ? error.message : error
        });
        failedAgents += specializationData.agents.length;
      }
    }
    
    const duration = Date.now() - startTime;
    
    return {
      results,
      metadata: {
        duration,
        tokenUsage: this.calculateTokenUsage(results),
        successfulAgents,
        failedAgents,
        strategy: AnalysisStrategy.SPECIALIZED
      }
    };
  }
  
  private groupAgentsBySpecialization(agents: AgentConfig[], repositoryData: RepositoryData) {
    const specializations = new Map<string, {
      agents: AgentConfig[];
      relevantFiles: any[];
      patterns: string[];
    }>();
    
    for (const agent of agents) {
      let specialization = 'general';
      let relevantFiles = repositoryData.files;
      let patterns: string[] = [];
      
      // Determine specialization based on file patterns
      if (agent.filePatterns && agent.filePatterns.length > 0) {
        patterns = agent.filePatterns;
        relevantFiles = repositoryData.files.filter(file =>
          patterns.some(pattern => file.path.match(new RegExp(pattern)))
        );
        
        // Create specialization name based on patterns
        specialization = this.getSpecializationName(patterns);
      }
      
      // Determine specialization based on role
      if (agent.role === AgentRole.SECURITY) {
        specialization = 'security';
      } else if (agent.role === AgentRole.PERFORMANCE) {
        specialization = 'performance';
      } else if (agent.role === AgentRole.CODE_QUALITY) {
        specialization = 'code-quality';
      }
      
      if (!specializations.has(specialization)) {
        specializations.set(specialization, {
          agents: [],
          relevantFiles,
          patterns
        });
      }
      
      specializations.get(specialization)!.agents.push(agent);
    }
    
    return specializations;
  }
  
  private getSpecializationName(patterns: string[]): string {
    // Determine specialization based on file patterns
    const patternStr = patterns.join('|').toLowerCase();
    
    if (patternStr.includes('test') || patternStr.includes('spec')) {
      return 'testing';
    } else if (patternStr.includes('config') || patternStr.includes('yml') || patternStr.includes('json')) {
      return 'configuration';
    } else if (patternStr.includes('docker') || patternStr.includes('ci') || patternStr.includes('cd')) {
      return 'devops';
    } else if (patternStr.includes('frontend') || patternStr.includes('ui') || patternStr.includes('css')) {
      return 'frontend';
    } else if (patternStr.includes('api') || patternStr.includes('backend') || patternStr.includes('server')) {
      return 'backend';
    } else {
      return 'file-specific';
    }
  }
  
  private async executeSpecializationGroup(
    specializationData: { agents: AgentConfig[]; relevantFiles: any[]; patterns: string[] },
    context: ExecutionContext
  ): Promise<any[]> {
    const { agents, relevantFiles } = specializationData;
    
    // Create specialized context
    const specializedContext = {
      ...context.repositoryData,
      files: relevantFiles,
      specialization: {
        patterns: specializationData.patterns,
        fileCount: relevantFiles.length,
        focusArea: agents[0]?.focusAreas?.[0] || 'general'
      }
    };
    
    // Execute agents in this specialization (parallel within group)
    const executionPromises = agents.map(async (agentConfig) => {
      return this.executeSpecializedAgent(agentConfig, specializedContext);
    });
    
    const results = await Promise.allSettled(executionPromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
  }
  
  private async executeSpecializedAgent(
    agentConfig: AgentConfig,
    specializedContext: any
  ): Promise<any> {
    // Mock specialized execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    return {
      agentId: `${agentConfig.provider}-${agentConfig.role}`,
      config: agentConfig,
      result: {
        insights: [
          `Specialized analysis from ${agentConfig.provider}`,
          `Focus area: ${specializedContext.specialization.focusArea}`,
          `Analyzed ${specializedContext.specialization.fileCount} relevant files`
        ],
        suggestions: [`Specialized suggestion for ${agentConfig.role}`],
        metadata: {
          executionTime: Date.now(),
          specialization: specializedContext.specialization,
          filePatterns: agentConfig.filePatterns || []
        }
      }
    };
  }
  
  private calculateTokenUsage(results: any[]): number {
    // Specialized execution may use fewer tokens due to focused analysis
    return results.length * 800;
  }
}

/**
 * Hybrid execution strategy - combines parallel and sequential approaches
 */
export class HybridExecutionStrategy implements ExecutionStrategy {
  private readonly logger = createLogger('HybridStrategy');
  
  getName(): string {
    return 'Hybrid';
  }
  
  getDescription(): string {
    return 'Execute primary agents first, then secondary agents in parallel with enhanced context';
  }
  
  async execute(context: ExecutionContext): Promise<StrategyExecutionResult> {
    const startTime = Date.now();
    const { agents } = context;
    
    this.logger.info('Starting hybrid execution', { agentCount: agents.length });
    
    // Separate agents by position
    const primaryAgents = agents.filter(agent => agent.position === 'primary');
    const secondaryAgents = agents.filter(agent => agent.position === 'secondary');
    const specialistAgents = agents.filter(agent => agent.position === 'specialist');
    
    const results = [];
    let successfulAgents = 0;
    let failedAgents = 0;
    
    // Phase 1: Execute primary agents sequentially
    if (primaryAgents.length > 0) {
      this.logger.debug('Phase 1: Executing primary agents sequentially');
      
      const sequentialStrategy = new SequentialExecutionStrategy();
      const primaryResult = await sequentialStrategy.execute({
        ...context,
        agents: primaryAgents
      });
      
      results.push(...primaryResult.results);
      successfulAgents += primaryResult.metadata.successfulAgents;
      failedAgents += primaryResult.metadata.failedAgents;
    }
    
    // Phase 2: Execute secondary agents in parallel with primary context
    if (secondaryAgents.length > 0) {
      this.logger.debug('Phase 2: Executing secondary agents in parallel');
      
      const enhancedContext = {
        ...context,
        agents: secondaryAgents,
        additionalContext: {
          ...context.additionalContext,
          primaryResults: results,
          enhancementMode: true
        }
      };
      
      const parallelStrategy = new ParallelExecutionStrategy();
      const secondaryResult = await parallelStrategy.execute(enhancedContext);
      
      results.push(...secondaryResult.results);
      successfulAgents += secondaryResult.metadata.successfulAgents;
      failedAgents += secondaryResult.metadata.failedAgents;
    }
    
    // Phase 3: Execute specialist agents based on findings
    if (specialistAgents.length > 0) {
      this.logger.debug('Phase 3: Executing specialist agents');
      
      const specializedStrategy = new SpecializedExecutionStrategy();
      const specialistResult = await specializedStrategy.execute({
        ...context,
        agents: specialistAgents,
        additionalContext: {
          ...context.additionalContext,
          allPreviousResults: results,
          specialistMode: true
        }
      });
      
      results.push(...specialistResult.results);
      successfulAgents += specialistResult.metadata.successfulAgents;
      failedAgents += specialistResult.metadata.failedAgents;
    }
    
    const duration = Date.now() - startTime;
    
    return {
      results,
      metadata: {
        duration,
        tokenUsage: this.calculateTokenUsage(results),
        successfulAgents,
        failedAgents,
        strategy: AnalysisStrategy.PARALLEL // Note: Using PARALLEL as closest match
      }
    };
  }
  
  private calculateTokenUsage(results: any[]): number {
    // Hybrid execution balances token usage
    return results.length * 1200;
  }
}

/**
 * Strategy factory for creating execution strategies
 */
export class ExecutionStrategyFactory {
  private static strategies = new Map<AnalysisStrategy, () => ExecutionStrategy>([
    [AnalysisStrategy.PARALLEL, () => new ParallelExecutionStrategy()],
    [AnalysisStrategy.SEQUENTIAL, () => new SequentialExecutionStrategy()],
    [AnalysisStrategy.SPECIALIZED, () => new SpecializedExecutionStrategy()]
  ]);
  
  static createStrategy(strategy: AnalysisStrategy): ExecutionStrategy {
    const factory = this.strategies.get(strategy);
    if (!factory) {
      throw new Error(`Unknown execution strategy: ${strategy}`);
    }
    return factory();
  }
  
  static createHybridStrategy(): ExecutionStrategy {
    return new HybridExecutionStrategy();
  }
  
  static getAvailableStrategies(): Array<{ strategy: AnalysisStrategy; description: string }> {
    return [
      { strategy: AnalysisStrategy.PARALLEL, description: 'Execute all agents concurrently' },
      { strategy: AnalysisStrategy.SEQUENTIAL, description: 'Execute agents one after another with context' },
      { strategy: AnalysisStrategy.SPECIALIZED, description: 'Execute agents based on specialization' }
    ];
  }
}

/**
 * Semaphore for controlling concurrent execution
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];
  
  constructor(permits: number) {
    this.permits = permits;
  }
  
  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this.permits > 0) {
        this.permits--;
        this.executeAndRelease(fn, resolve, reject);
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          this.executeAndRelease(fn, resolve, reject);
        });
      }
    });
  }
  
  private async executeAndRelease<T>(
    fn: () => Promise<T>,
    resolve: (value: T) => void,
    reject: (error: any) => void
  ): Promise<void> {
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.permits++;
      if (this.waitQueue.length > 0) {
        const next = this.waitQueue.shift();
        if (next) next();
      }
    }
  }
}