import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { AnalysisResult } from '@codequal/core';
import { AgentFactory } from './agent-factory';
import { Agent } from '@codequal/core/types/agent';
import { createLogger, LoggableData } from '@codequal/core/utils';

/**
 * Multi-agent strategy options
 */
export enum MultiAgentStrategy {
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential',
  SPECIALIZED = 'specialized'
}

/**
 * Configuration for multi-agent strategy
 */
export interface MultiAgentConfig {
  strategy: MultiAgentStrategy;
  primaryProvider: AgentProvider;
  secondaryProviders: AgentProvider[];
  role: AgentRole;
  config?: Record<string, unknown>;
}

/**
 * Class for managing multi-agent strategies
 */
export class MultiAgentManager {
  private logger = createLogger('MultiAgentManager');
  
  /**
   * Create a multi-agent strategy
   * @param config Multi-agent configuration
   * @returns Multi-agent strategy instance
   */
  createMultiAgentStrategy(config: MultiAgentConfig): MultiAgent {
    switch (config.strategy) {
      case MultiAgentStrategy.PARALLEL:
        return new ParallelMultiAgent(config);
      case MultiAgentStrategy.SEQUENTIAL:
        return new SequentialMultiAgent(config);
      case MultiAgentStrategy.SPECIALIZED:
        return new SpecializedMultiAgent(config);
      default:
        throw new Error(`Unsupported multi-agent strategy: ${config.strategy}`);
    }
  }
  
  /**
   * Default multi-agent configurations for each role
   */
  private static readonly RECOMMENDED_CONFIGURATIONS: Record<AgentRole, MultiAgentConfig> = {
    [AgentRole.SECURITY]: {
      strategy: MultiAgentStrategy.SPECIALIZED,
      primaryProvider: AgentProvider.DEEPSEEK_CODER,
      secondaryProviders: [AgentProvider.CLAUDE],
      role: AgentRole.SECURITY
    },
    [AgentRole.CODE_QUALITY]: {
      strategy: MultiAgentStrategy.PARALLEL,
      primaryProvider: AgentProvider.DEEPSEEK_CODER,
      secondaryProviders: [AgentProvider.CLAUDE, AgentProvider.OPENAI],
      role: AgentRole.CODE_QUALITY
    },
    [AgentRole.PERFORMANCE]: {
      strategy: MultiAgentStrategy.SEQUENTIAL,
      primaryProvider: AgentProvider.DEEPSEEK_CODER,
      secondaryProviders: [AgentProvider.CLAUDE],
      role: AgentRole.PERFORMANCE
    },
    [AgentRole.DEPENDENCY]: {
      strategy: MultiAgentStrategy.PARALLEL,
      primaryProvider: AgentProvider.DEEPSEEK_CODER,
      secondaryProviders: [AgentProvider.CLAUDE],
      role: AgentRole.DEPENDENCY
    },
    [AgentRole.EDUCATIONAL]: {
      strategy: MultiAgentStrategy.PARALLEL,
      primaryProvider: AgentProvider.CLAUDE,
      secondaryProviders: [AgentProvider.DEEPSEEK_CODER],
      role: AgentRole.EDUCATIONAL
    },
    [AgentRole.ORCHESTRATOR]: {
      strategy: MultiAgentStrategy.SPECIALIZED,
      primaryProvider: AgentProvider.CLAUDE,
      secondaryProviders: [AgentProvider.OPENAI],
      role: AgentRole.ORCHESTRATOR
    },
    [AgentRole.REPORT_GENERATION]: {
      strategy: MultiAgentStrategy.SEQUENTIAL,
      primaryProvider: AgentProvider.CLAUDE,
      secondaryProviders: [AgentProvider.OPENAI],
      role: AgentRole.REPORT_GENERATION
    }
  };

  /**
   * Default multi-agent configuration to use when no specific configuration is found
   */
  private static readonly DEFAULT_CONFIGURATION: MultiAgentConfig = {
    strategy: MultiAgentStrategy.PARALLEL,
    primaryProvider: AgentProvider.CLAUDE,
    secondaryProviders: [AgentProvider.OPENAI],
    role: AgentRole.CODE_QUALITY // Will be overridden in the method
  };

  /**
   * Get a recommended multi-agent strategy for a role
   * @param role Agent role
   * @returns Multi-agent configuration
   */
  getRecommendedStrategyForRole(role: AgentRole): MultiAgentConfig {
    // Get the recommended configuration for this role, or use the default if not found
    const config = MultiAgentManager.RECOMMENDED_CONFIGURATIONS[role] || 
      { ...MultiAgentManager.DEFAULT_CONFIGURATION, role };
    
    // Return a copy of the configuration to prevent modification of the static reference
    return { ...config };
  }
}

/**
 * Base class for multi-agent strategies
 */
export abstract class MultiAgent implements Agent {
  protected primaryAgent: Agent;
  protected secondaryAgents: Agent[] = [];
  protected config: MultiAgentConfig;
  protected logger = createLogger('MultiAgent');
  
  /**
   * Constructor
   * @param config Multi-agent configuration
   */
  constructor(config: MultiAgentConfig) {
    this.config = config;
    
    // Create primary agent
    this.primaryAgent = AgentFactory.createAgent(
      config.role, 
      config.primaryProvider,
      config.config || {}
    );
    
    // Create secondary agents
    for (const provider of config.secondaryProviders) {
      this.secondaryAgents.push(
        AgentFactory.createAgent(
          config.role,
          provider,
          config.config || {}
        )
      );
    }
  }
  
  /**
   * Analyze data using the multi-agent strategy
   * @param data Data to analyze
   * @returns Analysis result
   */
  abstract analyze(data: unknown): Promise<AnalysisResult>;
  
  /**
   * Log an informational message
   * @param message Message
   * @param data Additional data
   */
  log(message: string, data?: unknown): void {
    this.logger.info(message, data instanceof Error ? data : (typeof data === 'object' ? data : { value: data }));
  }
  
  /**
   * Log an error message
   * @param message Message
   * @param error Error object
   */
  error(message: string, error: unknown): void {
    this.logger.error(message, error instanceof Error ? error : { message: String(error) } as LoggableData);
  }
}

/**
 * Parallel multi-agent strategy
 * 
 * Runs all agents in parallel and combines results
 */
export class ParallelMultiAgent extends MultiAgent {
  /**
   * Analyze data using parallel agents
   * @param data Data to analyze
   * @returns Combined analysis result
   */
  async analyze(data: unknown): Promise<AnalysisResult> {
    try {
      // Start all analysis tasks in parallel
      const allAgents = [this.primaryAgent, ...this.secondaryAgents];
      const results = await Promise.all(
        allAgents.map(agent => agent.analyze(data).catch(error => {
          this.error(`Error in agent analysis:`, error);
          return null; // Return null for failed agents
        }))
      );
      
      // Filter out null results
      const validResults = results.filter(result => result !== null) as AnalysisResult[];
      
      // Combine results
      return this.combineResults(validResults);
    } catch (error) {
      this.error('Error in parallel multi-agent analysis', error);
      
      // Fallback to primary agent if multi-agent approach fails
      return this.primaryAgent.analyze(data);
    }
  }
  
  /**
   * Combine multiple analysis results
   * @param results Analysis results
   * @returns Combined result
   */
  private combineResults(results: AnalysisResult[]): AnalysisResult {
    if (results.length === 0) {
      return {
        insights: [],
        suggestions: [],
        educational: [],
        metadata: {
          error: true,
          timestamp: new Date().toISOString(),
          message: 'No valid results from any agent'
        }
      };
    }
    
    // Start with the first result as a base
    const combined: AnalysisResult = { ...results[0] };
    
    // Create sets to track unique items
    const uniqueInsights = new Set<string>();
    const uniqueSuggestions = new Set<string>();
    const uniqueEducational = new Set<string>();
    
    // Add existing items to sets
    results[0].insights?.forEach(item => 
      uniqueInsights.add(JSON.stringify(item))
    );
    
    results[0].suggestions?.forEach(item => 
      uniqueSuggestions.add(JSON.stringify(item))
    );
    
    results[0].educational?.forEach(item => 
      uniqueEducational.add(JSON.stringify(item))
    );
    
    // Process additional results
    for (let i = 1; i < results.length; i++) {
      const result = results[i];
      
      // Add unique insights
      result.insights?.forEach(item => {
        const key = JSON.stringify(item);
        if (!uniqueInsights.has(key)) {
          uniqueInsights.add(key);
          combined.insights = combined.insights || [];
          combined.insights.push(item);
        }
      });
      
      // Add unique suggestions
      result.suggestions?.forEach(item => {
        const key = JSON.stringify(item);
        if (!uniqueSuggestions.has(key)) {
          uniqueSuggestions.add(key);
          combined.suggestions = combined.suggestions || [];
          combined.suggestions.push(item);
        }
      });
      
      // Add unique educational content
      result.educational?.forEach(item => {
        const key = JSON.stringify(item);
        if (!uniqueEducational.has(key)) {
          uniqueEducational.add(key);
          combined.educational = combined.educational || [];
          combined.educational.push(item);
        }
      });
    }
    
    // Sort insights by severity (high -> medium -> low)
    if (combined.insights) {
      combined.insights.sort((a, b) => {
        const severityOrder: Record<string, number> = {
          high: 0,
          medium: 1,
          low: 2
        };
        
        return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
      });
    }
    
    // Update metadata to reflect multi-agent approach
    combined.metadata = {
      ...combined.metadata,
      timestamp: new Date().toISOString(),
      multiAgent: true,
      strategy: 'parallel',
      providers: [
        this.config.primaryProvider,
        ...this.config.secondaryProviders
      ]
    };
    
    return combined;
  }
}

/**
 * Sequential multi-agent strategy
 * 
 * Runs primary agent first, then passes results to secondary agents for enhancement
 */
export class SequentialMultiAgent extends MultiAgent {
  /**
   * Analyze data using sequential agents
   * @param data Data to analyze
   * @returns Enhanced analysis result
   */
  async analyze(data: unknown): Promise<AnalysisResult> {
    try {
      // Start with primary agent
      let result = await this.primaryAgent.analyze(data);
      
      // Pass result to each secondary agent for enhancement
      for (const agent of this.secondaryAgents) {
        try {
          // Create enhanced data with original data + primary results
          const enhancedData = {
            originalData: data,
            previousResult: result
          };
          
          // Get enhanced result
          const enhancedResult = await agent.analyze(enhancedData);
          
          // Merge results
          result = this.mergeResults(result, enhancedResult);
        } catch (error) {
          this.error('Error in sequential agent enhancement', error);
          // Continue with next agent if one fails
        }
      }
      
      // Update metadata
      result.metadata = {
        ...result.metadata,
        multiAgent: true,
        strategy: 'sequential',
        providers: [
          this.config.primaryProvider,
          ...this.config.secondaryProviders
        ]
      };
      
      return result;
    } catch (error) {
      this.error('Error in sequential multi-agent analysis', error);
      
      // Fallback to primary agent if multi-agent approach fails
      return this.primaryAgent.analyze(data);
    }
  }
  
  /**
   * Merge primary and enhanced results
   * @param primary Primary result
   * @param enhanced Enhanced result
   * @returns Merged result
   */
  private mergeResults(primary: AnalysisResult, enhanced: AnalysisResult): AnalysisResult {
    // Start with primary result
    const merged: AnalysisResult = { ...primary };
    
    // Create sets to track existing items
    const existingInsights = new Set<string>();
    const existingSuggestions = new Set<string>();
    const existingEducational = new Set<string>();
    
    // Add existing items to sets
    primary.insights?.forEach(item => 
      existingInsights.add(JSON.stringify(item))
    );
    
    primary.suggestions?.forEach(item => 
      existingSuggestions.add(JSON.stringify(item))
    );
    
    primary.educational?.forEach(item => 
      existingEducational.add(JSON.stringify(item))
    );
    
    // Add new insights
    enhanced.insights?.forEach(item => {
      const key = JSON.stringify(item);
      if (!existingInsights.has(key)) {
        merged.insights = merged.insights || [];
        merged.insights.push(item);
      }
    });
    
    // Add new suggestions
    enhanced.suggestions?.forEach(item => {
      const key = JSON.stringify(item);
      if (!existingSuggestions.has(key)) {
        merged.suggestions = merged.suggestions || [];
        merged.suggestions.push(item);
      }
    });
    
    // Add new educational content
    enhanced.educational?.forEach(item => {
      const key = JSON.stringify(item);
      if (!existingEducational.has(key)) {
        merged.educational = merged.educational || [];
        merged.educational.push(item);
      }
    });
    
    return merged;
  }
}

/**
 * Specialized multi-agent strategy
 * 
 * Uses each agent for its specialty and combines results
 */
export class SpecializedMultiAgent extends MultiAgent {
  /**
   * Analyze data using specialized agents with context enrichment
   * @param data Data to analyze
   * @returns Combined analysis result with domain-specific insights
   */
  async analyze(data: unknown): Promise<AnalysisResult> {
    try {
      // Run primary agent first with specialized context
      const prData = data as { files?: Array<{ filename: string; content?: string }> };
      
      // Create enriched context for primary agent
      const primaryData = {
        originalData: data,
        specializedFocus: this.getRoleFocusArea(this.config.role),
        files: prData.files || [],
        position: 'primary'
      };
      
      // Run primary agent
      const primaryResult = await this.primaryAgent.analyze(primaryData).catch(error => {
        this.error(`Error in primary ${this.config.role} analysis with ${this.config.primaryProvider}`, error as LoggableData);
        return null;
      });
      
      // If primary analysis failed, return empty result or fall back to first secondary agent
      if (!primaryResult) {
        return this.secondaryAgents[0]?.analyze(data) || {
          insights: [],
          suggestions: [],
          educational: [],
          metadata: {
            error: true,
            timestamp: new Date().toISOString(),
            message: `Primary ${this.config.role} analysis failed`
          }
        };
      }
      
      // Create enriched context for secondary agents with primary results
      const secondaryData = {
        originalData: data,
        specializedFocus: `complementary_${this.config.role}`,
        primaryResults: primaryResult,
        files: prData.files || [],
        position: 'secondary'
      };
      
      // Run secondary agents with enriched context
      const secondaryResults = await Promise.all(
        this.secondaryAgents.map(agent => 
          agent.analyze(secondaryData).catch(error => {
            this.error(`Error in secondary ${this.config.role} analysis`, error as LoggableData);
            return null;
          })
        )
      );
      
      // Filter out null results
      const validSecondaryResults = secondaryResults.filter(result => 
        result !== null
      ) as AnalysisResult[];
      
      // Combine all agent results
      const allResults = [primaryResult, ...validSecondaryResults];
      
      // Combine results
      return this.combineSpecializedResults(allResults);
    } catch (error) {
      this.error('Error in specialized multi-agent analysis', error as LoggableData);
      
      // Fallback to primary agent if multi-agent approach fails
      return this.primaryAgent.analyze(data);
    }
  }
  
  /**
   * Get focus area based on role
   * @param role Agent role
   * @returns Focus area for specialized context
   */
  private getRoleFocusArea(role: AgentRole): string {
    const focusAreas: Record<AgentRole, string> = {
      [AgentRole.SECURITY]: 'security_analysis',
      [AgentRole.CODE_QUALITY]: 'code_quality_analysis',
      [AgentRole.PERFORMANCE]: 'performance_analysis',
      [AgentRole.DEPENDENCY]: 'dependency_analysis',
      [AgentRole.EDUCATIONAL]: 'educational_content',
      [AgentRole.ORCHESTRATOR]: 'orchestration',
      [AgentRole.REPORT_GENERATION]: 'report_generation'
    };
    
    return focusAreas[role] || String(role);
  }
  
  // No cloud-specific functions needed anymore
  
  /**
   * Combine specialized results with domain weighting
   * @param results Results from different agents
   * @returns Combined results with specialty weighting
   */
  private combineSpecializedResults(results: AnalysisResult[]): AnalysisResult {
    if (results.length === 0) {
      return {
        insights: [],
        suggestions: [],
        educational: [],
        metadata: {
          error: true,
          timestamp: new Date().toISOString(),
          message: 'No valid results from any agent'
        }
      };
    }
    
    // Start with the primary result
    const combined: AnalysisResult = { ...results[0] };
    
    // Create sets to track unique items
    const uniqueInsights = new Set<string>();
    const uniqueSuggestions = new Set<string>();
    const uniqueEducational = new Set<string>();
    
    // Add primary items to sets
    results[0].insights?.forEach(item => 
      uniqueInsights.add(JSON.stringify(item))
    );
    
    results[0].suggestions?.forEach(item => 
      uniqueSuggestions.add(JSON.stringify(item))
    );
    
    results[0].educational?.forEach(item => 
      uniqueEducational.add(JSON.stringify(item))
    );
    
    // Process additional results
    for (let i = 1; i < results.length; i++) {
      const result = results[i];
      
      // Add unique insights
      result.insights?.forEach(item => {
        const key = JSON.stringify(item);
        if (!uniqueInsights.has(key)) {
          uniqueInsights.add(key);
          combined.insights = combined.insights || [];
          combined.insights.push(item);
        }
      });
      
      // Add unique suggestions
      result.suggestions?.forEach(item => {
        const key = JSON.stringify(item);
        if (!uniqueSuggestions.has(key)) {
          uniqueSuggestions.add(key);
          combined.suggestions = combined.suggestions || [];
          combined.suggestions.push(item);
        }
      });
      
      // Add unique educational content
      result.educational?.forEach(item => {
        const key = JSON.stringify(item);
        if (!uniqueEducational.has(key)) {
          uniqueEducational.add(key);
          combined.educational = combined.educational || [];
          combined.educational.push(item);
        }
      });
    }
    
    // Sort insights by severity (high -> medium -> low)
    if (combined.insights) {
      combined.insights.sort((a, b) => {
        const severityOrder: Record<string, number> = {
          high: 0,
          medium: 1,
          low: 2
        };
        
        return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
      });
    }
    
    // Update metadata
    combined.metadata = {
      ...combined.metadata,
      timestamp: new Date().toISOString(),
      multiAgent: true,
      strategy: 'specialized',
      providers: [
        this.config.primaryProvider,
        ...this.config.secondaryProviders
      ]
    };
    
    return combined;
  }
}