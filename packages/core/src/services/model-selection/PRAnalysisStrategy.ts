/**
 * PR Analysis Strategy for Multi-Agent Orchestration
 * 
 * Unlike DeepWiki (single model for entire analysis), PR analysis uses
 * multiple specialized agents for different aspects of code review.
 */

import { ModelConfig } from './ModelConfigurationMatrix';

/**
 * PR size categories
 */
export type PRSize = 'small' | 'medium' | 'large' | 'extra_large';

/**
 * Analysis mode based on user preference or PR characteristics
 */
export type AnalysisMode = 'quick' | 'balanced' | 'comprehensive';

/**
 * Specialized agent roles for PR analysis
 */
export interface PRAnalysisAgents {
  // Basic syntax and linting checks
  syntaxChecker?: ModelConfig;
  
  // Code quality, patterns, best practices
  codeQualityReviewer?: ModelConfig;
  
  // Security vulnerability scanning
  securityScanner?: ModelConfig;
  
  // Performance analysis and optimization suggestions
  performanceAnalyzer?: ModelConfig;
  
  // Architecture and design pattern review
  architectureReviewer?: ModelConfig;
  
  // Documentation and comment quality
  documentationChecker?: ModelConfig;
  
  // Test coverage and quality
  testAnalyzer?: ModelConfig;
}

/**
 * PR analysis strategy configuration
 */
export interface PRAnalysisStrategy {
  mode: AnalysisMode;
  prSize: PRSize;
  agents: PRAnalysisAgents;
  estimatedTime: number; // minutes
  estimatedCost: number; // USD
  parallelizable: boolean;
}

/**
 * PR Analysis Strategy Builder
 */
export class PRAnalysisStrategyBuilder {
  /**
   * Determine PR size based on metrics
   */
  static calculatePRSize(metrics: {
    filesChanged: number;
    linesAdded: number;
    linesDeleted: number;
  }): PRSize {
    const totalLines = metrics.linesAdded + metrics.linesDeleted;
    
    if (metrics.filesChanged <= 3 && totalLines <= 100) {
      return 'small';
    } else if (metrics.filesChanged <= 10 && totalLines <= 500) {
      return 'medium';
    } else if (metrics.filesChanged <= 25 && totalLines <= 2000) {
      return 'large';
    } else {
      return 'extra_large';
    }
  }

  /**
   * Build analysis strategy based on PR characteristics and user preferences
   */
  static buildStrategy(params: {
    prSize: PRSize;
    userTier: 'free' | 'pro' | 'enterprise';
    userPreference?: AnalysisMode;
    primaryLanguage: string;
    hasSecurityImplications: boolean;
    hasPerformanceImplications: boolean;
    hasArchitecturalChanges: boolean;
  }): PRAnalysisStrategy {
    // Determine analysis mode
    const mode = params.userPreference || this.determineDefaultMode(params.prSize, params.userTier);
    
    // Build agent configuration based on mode
    switch (mode) {
      case 'quick':
        return this.buildQuickStrategy(params);
      case 'balanced':
        return this.buildBalancedStrategy(params);
      case 'comprehensive':
        return this.buildComprehensiveStrategy(params);
    }
  }

  /**
   * Quick analysis - minimal agents, fast results
   */
  private static buildQuickStrategy(params: any): PRAnalysisStrategy {
    return {
      mode: 'quick',
      prSize: params.prSize,
      agents: {
        // Use fast model for both syntax and quality
        syntaxChecker: {
          provider: 'openrouter',
          model: 'google/gemini-2.5-flash',
          modelPath: 'openrouter/google/gemini-2.5-flash',
          temperature: 0.3,
          topP: 0.9,
          maxTokens: 2000,
          streamResponse: true,
          includeThinking: false,
          useCache: true
        },
        // Reuse same model for efficiency
        codeQualityReviewer: {
          provider: 'openrouter',
          model: 'google/gemini-2.5-flash',
          modelPath: 'openrouter/google/gemini-2.5-flash',
          temperature: 0.3,
          topP: 0.9,
          maxTokens: 2000,
          streamResponse: true,
          includeThinking: false,
          useCache: true
        }
      },
      estimatedTime: 1, // 1 minute
      estimatedCost: 0.0003, // ~$0.0003
      parallelizable: false // Use same model sequentially
    };
  }

  /**
   * Balanced analysis - key agents, good coverage
   */
  private static buildBalancedStrategy(params: any): PRAnalysisStrategy {
    const agents: PRAnalysisAgents = {
      syntaxChecker: {
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash',
        modelPath: 'openrouter/google/gemini-2.5-flash',
        temperature: 0.3,
        topP: 0.9,
        maxTokens: 2000,
        streamResponse: true,
        includeThinking: false,
        useCache: true
      },
      codeQualityReviewer: {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-haiku',
        modelPath: 'openrouter/anthropic/claude-3.5-haiku',
        temperature: 0.4,
        topP: 0.9,
        maxTokens: 3000,
        streamResponse: true,
        includeThinking: false,
        useCache: true
      }
    };

    // Add security scanner if needed
    if (params.hasSecurityImplications) {
      agents.securityScanner = {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        modelPath: 'openrouter/anthropic/claude-3.5-sonnet',
        temperature: 0.1, // Low temperature for precision
        topP: 0.95,
        maxTokens: 4000,
        streamResponse: false,
        includeThinking: true,
        useCache: true
      };
    }

    return {
      mode: 'balanced',
      prSize: params.prSize,
      agents,
      estimatedTime: 3, // 3 minutes
      estimatedCost: 0.002, // ~$0.002
      parallelizable: true // Different models can run in parallel
    };
  }

  /**
   * Comprehensive analysis - all relevant agents, thorough review
   */
  private static buildComprehensiveStrategy(params: any): PRAnalysisStrategy {
    const agents: PRAnalysisAgents = {
      syntaxChecker: {
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash',
        modelPath: 'openrouter/google/gemini-2.5-flash',
        temperature: 0.3,
        topP: 0.9,
        maxTokens: 2000,
        streamResponse: true,
        includeThinking: false,
        useCache: true
      },
      codeQualityReviewer: {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-haiku',
        modelPath: 'openrouter/anthropic/claude-3.5-haiku',
        temperature: 0.4,
        topP: 0.9,
        maxTokens: 3000,
        streamResponse: true,
        includeThinking: false,
        useCache: true
      },
      securityScanner: {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        modelPath: 'openrouter/anthropic/claude-3.5-sonnet',
        temperature: 0.1,
        topP: 0.95,
        maxTokens: 4000,
        streamResponse: false,
        includeThinking: true,
        useCache: true
      },
      documentationChecker: {
        provider: 'openrouter',
        model: 'google/gemini-2.5-flash',
        modelPath: 'openrouter/google/gemini-2.5-flash',
        temperature: 0.5,
        topP: 0.9,
        maxTokens: 2000,
        streamResponse: true,
        includeThinking: false,
        useCache: true
      }
    };

    // Add specialized agents based on implications
    if (params.hasPerformanceImplications) {
      agents.performanceAnalyzer = {
        provider: 'openrouter',
        model: 'deepseek/deepseek-coder',
        modelPath: 'openrouter/deepseek/deepseek-coder',
        temperature: 0.2,
        topP: 0.9,
        maxTokens: 4000,
        streamResponse: false,
        includeThinking: true,
        useCache: true
      };
    }

    if (params.hasArchitecturalChanges) {
      agents.architectureReviewer = {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        modelPath: 'openrouter/anthropic/claude-3.5-sonnet',
        temperature: 0.3,
        topP: 0.95,
        maxTokens: 6000,
        streamResponse: false,
        includeThinking: true,
        useCache: true
      };
    }

    return {
      mode: 'comprehensive',
      prSize: params.prSize,
      agents,
      estimatedTime: 5, // 5 minutes
      estimatedCost: 0.01, // ~$0.01
      parallelizable: true // All agents can run in parallel
    };
  }

  /**
   * Determine default analysis mode based on PR size and user tier
   */
  private static determineDefaultMode(prSize: PRSize, userTier: string): AnalysisMode {
    if (userTier === 'free') {
      return prSize === 'small' ? 'quick' : 'balanced';
    } else if (userTier === 'pro') {
      return prSize === 'extra_large' ? 'comprehensive' : 'balanced';
    } else { // enterprise
      return prSize === 'small' ? 'balanced' : 'comprehensive';
    }
  }

  /**
   * Get user-friendly description of the strategy
   */
  static getStrategyDescription(strategy: PRAnalysisStrategy): string {
    const agentCount = Object.keys(strategy.agents).length;
    const agentNames = Object.keys(strategy.agents).map(a => 
      a.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
    );

    return `${strategy.mode.charAt(0).toUpperCase() + strategy.mode.slice(1)} analysis using ${agentCount} specialized agents: ${agentNames.join(', ')}. Estimated time: ${strategy.estimatedTime} minutes.`;
  }
}