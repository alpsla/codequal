import { AgentProvider, AgentRole } from '@codequal/core/config/agent-registry';
import { createLogger } from '@codequal/core/utils';
import { 
  AgentRoleEvaluationParameters, 
  RepositoryContext, 
  PRContext, 
  UserPreferences,
  mockAgentEvaluationData,
  defaultTemperatures,
  shouldUseSecondaryAgent,
  SecondaryAgentDecisionCriteria
} from './agent-evaluation-data';
import { AgentConfig } from '../types';
import { AgentPosition } from '../types/types';

/**
 * Result from the agent selection process
 */
export interface AgentSelectionResult {
  primaryAgent: AgentConfig;
  secondaryAgents: AgentConfig[];
  fallbackAgents: AgentConfig[];
  useMCP: boolean;
  expectedCost: number;
  confidence: number; // 0-100 score
  explanation: string; // Explanation of selection decision
}

/**
 * Agent Selection Service
 * Responsible for selecting the optimal agents based on context
 */
export class AgentSelector {
  private logger = createLogger('AgentSelector');
  private evaluationData: Record<AgentProvider, Partial<AgentRoleEvaluationParameters>>;
  
  constructor(
    evaluationData?: Record<AgentProvider, Partial<AgentRoleEvaluationParameters>>
  ) {
    // Use provided evaluation data or fall back to mock data
    this.evaluationData = evaluationData || mockAgentEvaluationData;
  }
  
  /**
   * Select the best agent for a specific role and context
   * @param role The role the agent will fulfill
   * @param repoContext Repository context
   * @param prContext PR context
   * @param preferences User preferences
   * @returns The selected agent configuration
   */
  public selectAgent(
    role: AgentRole,
    repoContext: RepositoryContext,
    prContext: PRContext,
    preferences?: UserPreferences
  ): AgentConfig {
    this.logger.debug(`Selecting agent for role: ${role}`);
    
    // Get scores for each agent for this role
    const scores = this.calculateAgentScores(role, repoContext, prContext, preferences);
    
    // Find the highest scoring agent
    let highestScore = 0;
    let bestAgent: AgentProvider | null = null;
    
    for (const [provider, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        bestAgent = provider as AgentProvider;
      }
    }
    
    if (!bestAgent) {
      // Default to Claude if no agent has a score
      bestAgent = AgentProvider.CLAUDE;
      this.logger.warn('No agent scored above 0, defaulting to Claude');
    }
    
    // Construct the agent configuration
    const config: AgentConfig = {
      provider: bestAgent,
      role,
      position: AgentPosition.PRIMARY, // Default position, can be overridden
      temperature: defaultTemperatures[role],
      // Add other default parameters as needed
    };
    
    // Apply language-specific optimizations if applicable
    if (repoContext.primaryLanguages.length > 0) {
      const primaryLanguage = repoContext.primaryLanguages[0];
      this.optimizeForLanguage(config, primaryLanguage);
    }
    
    // Apply user preferences if available
    if (preferences) {
      this.applyUserPreferences(config, preferences);
    }
    
    this.logger.info(`Selected ${bestAgent} for role ${role} with score ${highestScore}`);
    return config;
  }
  
  /**
   * Select multiple agents for a complete multi-agent setup
   * @param roles The roles required for analysis
   * @param repoContext Repository context
   * @param prContext PR context
   * @param preferences User preferences
   * @returns Complete agent selection result
   */
  public selectMultiAgentConfiguration(
    roles: AgentRole[],
    repoContext: RepositoryContext,
    prContext: PRContext,
    preferences?: UserPreferences,
    secondaryAgentCriteria?: SecondaryAgentDecisionCriteria
  ): AgentSelectionResult {
    this.logger.debug(`Selecting multi-agent configuration for roles: ${roles.join(', ')}`);
    
    // Select primary agents for each role
    const primaryAgents: AgentConfig[] = [];
    
    for (const role of roles) {
      const agentConfig = this.selectAgent(role, repoContext, prContext, preferences);
      agentConfig.position = AgentPosition.PRIMARY;
      primaryAgents.push(agentConfig);
    }
    
    // Determine if secondary agents should be used
    // Note: In a real implementation, this would be based on actual results from primary agents
    // Here we simulate a decision based on context
    const secondaryAgents: AgentConfig[] = [];
    
    if (secondaryAgentCriteria) {
      // Mock primary result for demonstration purposes
      const mockPrimaryResult = {
        metadata: {
          confidence: 0.6 + (Math.random() * 0.3) // Random confidence between 0.6-0.9
        }
      };
      
      const useSecondaryAgent = shouldUseSecondaryAgent(
        repoContext,
        prContext,
        mockPrimaryResult,
        secondaryAgentCriteria
      );
      
      if (useSecondaryAgent) {
        this.logger.info('Secondary agents recommended based on context criteria');
        
        // Select complementary agents that are different from primary
        for (const role of roles) {
          const primaryAgent = primaryAgents.find(a => a.role === role);
          if (!primaryAgent) continue;
          
          // Select a different agent for the secondary role
          const secondaryAgentConfig = this.selectComplementaryAgent(
            role,
            primaryAgent.provider,
            repoContext,
            prContext,
            preferences
          );
          
          secondaryAgentConfig.position = AgentPosition.SECONDARY;
          secondaryAgents.push(secondaryAgentConfig);
        }
      } else {
        this.logger.info('Secondary agents not recommended for this context');
      }
    }
    
    // Select fallback agents
    const fallbackAgents: AgentConfig[] = [];
    
    for (const role of roles) {
      const primaryConfig = primaryAgents.find(a => a.role === role);
      if (!primaryConfig) continue;
      
      // Select two different fallback providers
      const fallbackConfigs = this.selectFallbackAgents(
        role,
        primaryConfig.provider,
        repoContext,
        prContext,
        preferences
      );
      
      fallbackAgents.push(...fallbackConfigs);
    }
    
    // Determine if MCP should be used
    const useMCP = this.shouldUseMCP(repoContext, prContext, preferences);
    
    // Calculate expected cost
    const expectedCost = this.calculateExpectedCost(
      primaryAgents,
      secondaryAgents,
      fallbackAgents,
      useMCP
    );
    
    // Find the primary agent with highest role
    const primaryAgent = primaryAgents.reduce((prev, current) => {
      const prevScore = this.calculateAgentScores(
        prev.role,
        repoContext,
        prContext,
        preferences
      )[prev.provider];
      
      const currentScore = this.calculateAgentScores(
        current.role,
        repoContext,
        prContext,
        preferences
      )[current.provider];
      
      return currentScore > prevScore ? current : prev;
    }, primaryAgents[0]);
    
    // Calculate confidence score based on agent scores
    const confidence = this.calculateConfidenceScore(
      primaryAgents,
      secondaryAgents,
      repoContext,
      prContext
    );
    
    // Generate explanation
    const explanation = this.generateSelectionExplanation(
      primaryAgent,
      secondaryAgents,
      fallbackAgents,
      useMCP,
      repoContext,
      prContext
    );
    
    return {
      primaryAgent,
      secondaryAgents,
      fallbackAgents,
      useMCP,
      expectedCost,
      confidence,
      explanation
    };
  }
  
  /**
   * Calculate scores for each agent for a specific role and context
   * @param role Agent role
   * @param repoContext Repository context
   * @param prContext PR context
   * @param preferences User preferences
   * @returns Scores for each agent (0-100)
   */
  private calculateAgentScores(
    role: AgentRole,
    repoContext: RepositoryContext,
    prContext: PRContext,
    preferences?: UserPreferences
  ): Record<AgentProvider, number> {
    const scores: Record<AgentProvider, number> = Object.values(AgentProvider).reduce((acc: Record<AgentProvider, number>, provider) => {
      acc[provider] = 0;
      return acc;
    }, {} as Record<AgentProvider, number>);
    
    // Iterate through each agent provider
    for (const provider of Object.values(AgentProvider) as AgentProvider[]) {
      const evaluation = this.evaluationData[provider];
      if (!evaluation || !evaluation.rolePerformance) {
        continue;
      }
      
      const rolePerf = evaluation.rolePerformance[role];
      if (!rolePerf) {
        continue;
      }
      
      // Base score is the overall score for the role
      let score = rolePerf.overallScore;
      
      // Adjust for language match
      if (repoContext.primaryLanguages.length > 0 && rolePerf.bestPerformingLanguages) {
        const primaryLanguage = repoContext.primaryLanguages[0];
        const languageScore = rolePerf.bestPerformingLanguages[primaryLanguage] || 0;
        score += (languageScore - 50) * 0.3; // Boost or penalize based on language performance
      }
      
      // Adjust for repository size
      if (evaluation.repoCharacteristics?.sizePerformance) {
        const sizeCategory = this.categorizeSizePerformance(repoContext.size.totalFiles);
        const sizeScore = evaluation.repoCharacteristics.sizePerformance[sizeCategory] || 0;
        score += (sizeScore - 50) * 0.2;
      }
      
      // Adjust for repository complexity
      if (evaluation.repoCharacteristics?.complexityPerformance) {
        const complexityCategory = this.categorizeComplexityPerformance(repoContext.complexity);
        const complexityScore = evaluation.repoCharacteristics.complexityPerformance[complexityCategory] || 0;
        score += (complexityScore - 50) * 0.2;
      }
      
      // Adjust for PR change type
      if (evaluation.prCharacteristics?.changeTypePerformance) {
        const changeTypeScore = evaluation.prCharacteristics.changeTypePerformance[prContext.changeType] || 0;
        score += (changeTypeScore - 50) * 0.1;
      }
      
      // Apply user preferences if available
      if (preferences) {
        // Boost score for preferred providers
        if (preferences.preferredProviders && preferences.preferredProviders.includes(provider)) {
          score += 10;
        }
        
        // Apply quality preference
        if (typeof preferences.qualityPreference === 'number') {
          // Adjust score based on quality preference (higher preference = more weight on quality)
          const qualityAdjustment = (rolePerf.overallScore - 50) * (preferences.qualityPreference / 100);
          score += qualityAdjustment;
        }
      }
      
      // Ensure score is in valid range
      scores[provider] = Math.max(0, Math.min(100, score));
    }
    
    return scores;
  }
  
  /**
   * Select a complementary agent that is different from the primary
   * @param role The role to fulfill
   * @param primaryProvider The primary provider to avoid
   * @param repoContext Repository context
   * @param prContext PR context
   * @param preferences User preferences
   * @returns A complementary agent configuration
   */
  private selectComplementaryAgent(
    role: AgentRole,
    primaryProvider: AgentProvider,
    repoContext: RepositoryContext,
    prContext: PRContext,
    preferences?: UserPreferences
  ): AgentConfig {
    // Calculate scores for each agent
    const scores = this.calculateAgentScores(role, repoContext, prContext, preferences);
    
    // Remove the primary provider from consideration
    delete scores[primaryProvider];
    
    // Find the highest scoring remaining agent
    let highestScore = 0;
    let bestAgent: AgentProvider | null = null;
    
    for (const [provider, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        bestAgent = provider as AgentProvider;
      }
    }
    
    if (!bestAgent) {
      // Default to a different provider if no agent scores well
      const availableProviders = Object.values(AgentProvider).filter(p => p !== primaryProvider);
      bestAgent = availableProviders[0] || AgentProvider.CLAUDE;
    }
    
    // Construct the agent configuration
    const config: AgentConfig = {
      provider: bestAgent,
      role,
      position: AgentPosition.SECONDARY,
      temperature: defaultTemperatures[role] + 0.1, // Slightly higher temperature for diversity
    };
    
    // Apply language-specific optimizations
    if (repoContext.primaryLanguages.length > 0) {
      const primaryLanguage = repoContext.primaryLanguages[0];
      this.optimizeForLanguage(config, primaryLanguage);
    }
    
    return config;
  }
  
  /**
   * Select fallback agents for a role
   * @param role The role to fulfill
   * @param primaryProvider The primary provider to avoid
   * @param repoContext Repository context
   * @param prContext PR context
   * @param preferences User preferences
   * @returns Array of fallback agent configurations
   */
  private selectFallbackAgents(
    role: AgentRole,
    primaryProvider: AgentProvider,
    repoContext: RepositoryContext,
    prContext: PRContext,
    preferences?: UserPreferences
  ): AgentConfig[] {
    // Calculate scores for each agent
    const scores = this.calculateAgentScores(role, repoContext, prContext, preferences);
    
    // Remove the primary provider from consideration
    delete scores[primaryProvider];
    
    // Sort providers by score
    const sortedProviders = Object.entries(scores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .map(([provider]) => provider as AgentProvider);
    
    // Select top 2 providers for fallback (or fewer if not enough)
    const fallbackProviders = sortedProviders.slice(0, 2);
    
    // Create fallback configurations
    return fallbackProviders.map((provider, index) => ({
      provider,
      role,
      position: AgentPosition.FALLBACK,
      priority: index + 1,
      temperature: defaultTemperatures[role] - 0.05, // Slightly lower temperature for reliability
    }));
  }
  
  /**
   * Determine if MCP should be used based on context
   * @param repoContext Repository context
   * @param prContext PR context
   * @param preferences User preferences
   * @returns Whether to use MCP
   */
  private shouldUseMCP(
    repoContext: RepositoryContext,
    prContext: PRContext,
    preferences?: UserPreferences
  ): boolean {
    // In a real implementation, this would be based on MCP performance metrics
    // For now, we use a simplified heuristic
    
    // Large repositories or complex PRs benefit from MCP
    const repoSizeThreshold = 5000; // files
    const prComplexityThreshold = 70; // 0-100
    
    // If user has explicitly set MCP preferences, respect them
    if (preferences?.preferredProviders) {
      // TODO: Add MCP provider to AgentProvider enum
      // if (preferences.preferredProviders.includes(AgentProvider.MCP)) {
      //   return true;
      // }
    }
    
    // Check if repository is large
    if (repoContext.size.totalFiles > repoSizeThreshold) {
      return true;
    }
    
    // Check if PR is complex
    if (prContext.complexity > prComplexityThreshold) {
      return true;
    }
    
    // Default to not using MCP
    return false;
  }
  
  /**
   * Optimize agent configuration for a specific language
   * @param config Agent configuration to optimize
   * @param language Target language
   */
  private optimizeForLanguage(config: AgentConfig, language: string): void {
    // In a real implementation, this would apply language-specific optimizations
    // For now, we just add the language to focusAreas
    
    config.focusAreas = config.focusAreas || [];
    if (!config.focusAreas.includes(language)) {
      config.focusAreas.push(language);
    }
    
    // Add language-specific model parameters if needed
    // E.g., different max tokens for different languages
    switch (language) {
      case 'JavaScript':
      case 'TypeScript':
        config.maxTokens = config.maxTokens || 4000;
        break;
      case 'Python':
        config.maxTokens = config.maxTokens || 3500;
        break;
      case 'Java':
        config.maxTokens = config.maxTokens || 5000;
        break;
      case 'C++':
        config.maxTokens = config.maxTokens || 6000;
        break;
      default:
        config.maxTokens = config.maxTokens || 4000;
    }
  }
  
  /**
   * Apply user preferences to agent configuration
   * @param config Agent configuration to modify
   * @param preferences User preferences
   */
  private applyUserPreferences(config: AgentConfig, preferences: UserPreferences): void {
    // Override provider if user has preferred providers
    if (preferences.preferredProviders && preferences.preferredProviders.length > 0) {
      // Use the first preferred provider
      config.provider = preferences.preferredProviders[0];
    }
    
    // Apply custom temperature if user has quality preference
    if (typeof preferences.qualityPreference === 'number') {
      // Lower temperature for higher quality preference
      const qualityFactor = preferences.qualityPreference / 100;
      config.temperature = Math.max(0, Math.min(1, config.temperature || 0.5) - (qualityFactor * 0.3));
    }
    
    // Set max tokens based on budget constraints
    if (preferences.maxCost) {
      // Simple heuristic: lower max tokens for lower budget
      const costFactor = Math.min(preferences.maxCost / 0.1, 1); // Normalize to 0-1, assuming $0.10 is standard
      config.maxTokens = Math.floor((config.maxTokens || 4000) * costFactor);
    }
  }
  
  /**
   * Calculate expected cost of an analysis
   * @param primaryAgents Primary agents
   * @param secondaryAgents Secondary agents
   * @param fallbackAgents Fallback agents
   * @param useMCP Whether MCP is used
   * @returns Expected cost in USD
   */
  private calculateExpectedCost(
    primaryAgents: AgentConfig[],
    secondaryAgents: AgentConfig[],
    fallbackAgents: AgentConfig[],
    useMCP: boolean
  ): number {
    // In a real implementation, this would use actual cost data and usage patterns
    // For now, we use a simple estimation model
    
    // Base cost per agent type (in USD)
    // Base cost per agent type (in USD)
    const baseCosts: Partial<Record<AgentProvider, number>> = {
      [AgentProvider.CLAUDE]: 0.05,
      [AgentProvider.OPENAI]: 0.03,
      [AgentProvider.DEEPSEEK_CODER]: 0.02,
      [AgentProvider.GEMINI_2_5_PRO]: 0.04,
      [AgentProvider.MCP_CODE_REVIEW]: 0.06,
      [AgentProvider.MCP_DEPENDENCY]: 0.05,
      [AgentProvider.MCP_CODE_CHECKER]: 0.05,
      [AgentProvider.MCP_REPORTER]: 0.04,
    };
    
    // Calculate primary agent costs
    let totalCost = primaryAgents.reduce((sum, agent) => {
      return sum + (baseCosts[agent.provider] || 0.03);
    }, 0);
    
    // Add secondary agent costs (assuming 80% chance of being used)
    totalCost += secondaryAgents.reduce((sum, agent) => {
      return sum + (baseCosts[agent.provider] || 0.03) * 0.8;
    }, 0);
    
    // Add fallback agent costs (assuming 20% chance of being used)
    totalCost += fallbackAgents.reduce((sum, agent) => {
      return sum + (baseCosts[agent.provider] || 0.03) * 0.2;
    }, 0);
    
    // Adjust for MCP if used (10% overhead)
    if (useMCP) {
      totalCost *= 1.1;
    }
    
    return totalCost;
  }
  
  /**
   * Calculate confidence score for the selected configuration
   * @param primaryAgents Primary agents
   * @param secondaryAgents Secondary agents
   * @param repoContext Repository context
   * @param prContext PR context
   * @returns Confidence score (0-100)
   */
  private calculateConfidenceScore(
    primaryAgents: AgentConfig[],
    secondaryAgents: AgentConfig[],
    repoContext: RepositoryContext,
    _prContext: PRContext
  ): number {
    // Base confidence from primary agents
    let baseConfidence = primaryAgents.reduce((sum, agent) => {
      const evaluation = this.evaluationData[agent.provider];
      if (!evaluation?.rolePerformance?.[agent.role]) {
        return sum + 50; // Default confidence
      }
      
      return sum + evaluation.rolePerformance[agent.role].overallScore;
    }, 0) / primaryAgents.length;
    
    // Boost from secondary agents if present
    if (secondaryAgents.length > 0) {
      baseConfidence += 10;
    }
    
    // Adjust for repository complexity
    // More complex repos = lower confidence
    const complexityPenalty = repoContext.complexity * 0.2;
    
    // Final confidence score
    return Math.max(0, Math.min(100, baseConfidence - complexityPenalty));
  }
  
  /**
   * Generate explanation for agent selection
   * @param primaryAgent Primary agent
   * @param secondaryAgents Secondary agents
   * @param fallbackAgents Fallback agents
   * @param useMCP Whether MCP is used
   * @param repoContext Repository context
   * @param prContext PR context
   * @returns Explanation string
   */
  private generateSelectionExplanation(
    primaryAgent: AgentConfig,
    secondaryAgents: AgentConfig[],
    fallbackAgents: AgentConfig[],
    useMCP: boolean,
    repoContext: RepositoryContext,
    _prContext: PRContext
  ): string {
    const primaryProviderName = this.getProviderDisplayName(primaryAgent.provider);
    const primaryRoleName = this.getRoleDisplayName(primaryAgent.role);
    
    let explanation = `Selected ${primaryProviderName} as the primary agent for ${primaryRoleName} analysis `;
    
    // Add language context if available
    if (repoContext.primaryLanguages.length > 0) {
      explanation += `for ${repoContext.primaryLanguages.join(', ')} code `;
    }
    
    // Add reasoning for primary agent
    const evaluation = this.evaluationData[primaryAgent.provider];
    if (evaluation?.rolePerformance?.[primaryAgent.role]) {
      const rolePerf = evaluation.rolePerformance[primaryAgent.role];
      
      if (rolePerf.specialties.length > 0) {
        explanation += `due to strengths in ${rolePerf.specialties.slice(0, 2).join(', ')}. `;
      } else {
        explanation += `based on overall performance score of ${rolePerf.overallScore}. `;
      }
    } else {
      explanation += `based on available evaluation data. `;
    }
    
    // Add secondary agent info if used
    if (secondaryAgents.length > 0) {
      const secondaryProviderNames = secondaryAgents.map(
        agent => this.getProviderDisplayName(agent.provider)
      );
      
      explanation += `Using ${secondaryProviderNames.join(', ')} as secondary agents for complementary analysis. `;
    } else {
      explanation += `No secondary agents were selected based on context criteria. `;
    }
    
    // Add fallback info
    if (fallbackAgents.length > 0) {
      const fallbackProviderNames = fallbackAgents.map(
        agent => this.getProviderDisplayName(agent.provider)
      );
      
      explanation += `Fallback agents include ${fallbackProviderNames.join(', ')}. `;
    }
    
    // Add MCP info
    if (useMCP) {
      explanation += `Using Model Control Plane for enhanced processing due to ${
        repoContext.size.totalFiles > 5000 ? 'large repository size' : 'complex PR changes'
      }.`;
    }
    
    return explanation;
  }
  
  /**
   * Categorize repository size for performance evaluation
   * @param totalFiles Total number of files
   * @returns Size category
   */
  private categorizeSizePerformance(totalFiles: number): string {
    if (totalFiles < 100) {
      return 'small';
    } else if (totalFiles < 1000) {
      return 'medium';
    } else if (totalFiles < 10000) {
      return 'large';
    } else {
      return 'enterprise';
    }
  }
  
  /**
   * Categorize repository complexity for performance evaluation
   * @param complexity Complexity score (0-100)
   * @returns Complexity category
   */
  private categorizeComplexityPerformance(complexity: number): string {
    if (complexity < 25) {
      return 'simple';
    } else if (complexity < 50) {
      return 'moderate';
    } else if (complexity < 75) {
      return 'complex';
    } else {
      return 'highlyComplex';
    }
  }
  
  /**
   * Get display name for a provider
   * @param provider Agent provider
   * @returns Display name
   */
  private getProviderDisplayName(provider: AgentProvider): string {
    switch (provider) {
      case AgentProvider.CLAUDE:
        return 'Claude';
      case AgentProvider.OPENAI:
        return 'GPT';
      case AgentProvider.DEEPSEEK_CODER:
        return 'DeepSeek Coder';
      case AgentProvider.GEMINI_2_5_PRO:
        return 'Gemini';
      default:
        return String(provider);
    }
  }
  
  /**
   * Get display name for a role
   * @param role Agent role
   * @returns Display name
   */
  private getRoleDisplayName(role: AgentRole): string {
    switch (role) {
      case AgentRole.CODE_QUALITY:
        return 'code quality';
      case AgentRole.SECURITY:
        return 'security';
      case AgentRole.PERFORMANCE:
        return 'performance';
      case AgentRole.EDUCATIONAL:
        return 'educational content';
      case AgentRole.REPORT_GENERATION:
        return 'documentation';
      default:
        return String(role);
    }
  }
}
