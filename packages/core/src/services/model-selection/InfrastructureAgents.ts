/**
 * Infrastructure Agent Configurations
 * 
 * These are specialized, long-term stable models that support the core system.
 * Unlike PR/Repository analysis models, these change infrequently (quarterly)
 * and are enhanced with MCP (Model Context Protocol) tools.
 */

import { ModelConfig } from './ModelConfigurationMatrix';

/**
 * MCP Tool capabilities that can enhance models
 */
export interface MCPToolset {
  // Data access
  databaseAccess?: boolean;      // Query Supabase directly
  vectorSearch?: boolean;        // Search vector database
  cacheAccess?: boolean;         // Access cached analyses
  
  // External capabilities
  webSearch?: boolean;           // Search for examples, documentation
  codeExecution?: boolean;       // Run code examples
  imageGeneration?: boolean;     // Create diagrams
  
  // System integration
  agentControl?: boolean;        // Manage other agents
  memoryAccess?: boolean;        // Long-term memory
  analyticsAccess?: boolean;     // User/company analytics
  
  // Custom tools
  customTools?: string[];        // Additional MCP tools
}

/**
 * Infrastructure agent types
 */
export type InfrastructureAgentType = 
  | 'educational'      // Generates learning content
  | 'orchestrator'     // Coordinates all agents
  | 'report_compiler'  // Merges analyses
  | 'skill_tracker'    // Tracks progress
  | 'chat_assistant';  // Internal chatbot

/**
 * Infrastructure agent configuration
 */
export interface InfrastructureAgentConfig {
  agentType: InfrastructureAgentType;
  primaryModel: ModelConfig;
  mcpTools: MCPToolset;
  systemPrompt: string;
  updateFrequency: 'quarterly' | 'semi-annual' | 'annual';
  specializations: string[];
}

/**
 * Educational Agent Configuration
 * Generates personalized learning content based on user skill level
 */
export const EDUCATIONAL_AGENT_CONFIG: InfrastructureAgentConfig = {
  agentType: 'educational',
  primaryModel: {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    modelPath: 'openrouter/anthropic/claude-3.5-sonnet',
    temperature: 0.7, // Higher for creative educational content
    topP: 0.95,
    maxTokens: 4000,
    streamResponse: true,
    includeThinking: true, // Important for educational reasoning
    useCache: true
  },
  mcpTools: {
    webSearch: true,         // Find examples and tutorials
    codeExecution: true,     // Demonstrate code examples
    imageGeneration: true,   // Create educational diagrams
    memoryAccess: true,      // Remember user's learning journey
    analyticsAccess: true,   // Track skill progression
    vectorSearch: true       // Find relevant past lessons
  },
  systemPrompt: `You are an expert programming educator with deep knowledge across all programming languages and paradigms. Your role is to:
1. Adapt content to the user's current skill level
2. Provide clear explanations with practical examples
3. Create exercises that reinforce learning
4. Track and celebrate progress
5. Use analogies and visualizations when helpful
6. Encourage best practices and clean code

Remember: Every developer was once a beginner. Be patient, encouraging, and thorough.`,
  updateFrequency: 'quarterly',
  specializations: [
    'adaptive_learning',
    'code_examples',
    'visual_explanations',
    'progress_tracking',
    'exercise_generation'
  ]
};

/**
 * Master Orchestrator Configuration
 * Coordinates all agents and combines their outputs
 */
export const ORCHESTRATOR_CONFIG: InfrastructureAgentConfig = {
  agentType: 'orchestrator',
  primaryModel: {
    provider: 'openrouter',
    model: 'openai/gpt-4o', // Or claude-3.5-sonnet
    modelPath: 'openrouter/openai/gpt-4o',
    temperature: 0.2, // Low for consistency
    topP: 0.9,
    maxTokens: 8000,
    streamResponse: false,
    includeThinking: true,
    useCache: true
  },
  mcpTools: {
    databaseAccess: true,    // Query all stored analyses
    vectorSearch: true,      // Find relevant context
    cacheAccess: true,       // Access cached results
    agentControl: true,      // Manage other agents
    analyticsAccess: true,   // Company-wide insights
    memoryAccess: true       // Long-term context
  },
  systemPrompt: `You are the Master Orchestrator for CodeQual. Your responsibilities:
1. Intelligently route requests to appropriate agents
2. Combine PR analysis with cached repository analysis
3. Track user and company skill evolution over time
4. Optimize for cost while maintaining quality
5. Provide comprehensive insights by synthesizing multiple analyses
6. Manage agent coordination and fallbacks

Always consider: context, cost, quality, and user needs when making decisions.`,
  updateFrequency: 'semi-annual', // Very stable
  specializations: [
    'agent_coordination',
    'report_synthesis',
    'cost_optimization',
    'context_management',
    'skill_tracking'
  ]
};

/**
 * Report Compiler Configuration
 * Merges multiple analyses into polished reports
 */
export const REPORT_COMPILER_CONFIG: InfrastructureAgentConfig = {
  agentType: 'report_compiler',
  primaryModel: {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-haiku', // Good balance for formatting
    modelPath: 'openrouter/anthropic/claude-3.5-haiku',
    temperature: 0.3,
    topP: 0.9,
    maxTokens: 6000,
    streamResponse: true,
    includeThinking: false,
    useCache: true
  },
  mcpTools: {
    databaseAccess: true,
    cacheAccess: true,
    imageGeneration: true, // For report visualizations
    vectorSearch: true
  },
  systemPrompt: `You are an expert technical writer specializing in code analysis reports. Your role:
1. Synthesize multiple analysis sources into cohesive reports
2. Maintain consistent formatting and structure
3. Highlight key findings and actionable insights
4. Adapt tone and detail level to audience
5. Create clear visualizations when helpful
6. Ensure reports are scannable and well-organized`,
  updateFrequency: 'quarterly',
  specializations: [
    'report_formatting',
    'insight_synthesis',
    'visualization',
    'technical_writing'
  ]
};

/**
 * Skill Tracker Configuration
 * Analyzes code quality evolution over time
 */
export const SKILL_TRACKER_CONFIG: InfrastructureAgentConfig = {
  agentType: 'skill_tracker',
  primaryModel: {
    provider: 'openrouter',
    model: 'google/gemini-2.5-pro', // Good at pattern recognition
    modelPath: 'openrouter/google/gemini-2.5-pro',
    temperature: 0.3,
    topP: 0.9,
    maxTokens: 4000,
    streamResponse: false,
    includeThinking: true,
    useCache: true
  },
  mcpTools: {
    databaseAccess: true,
    analyticsAccess: true,
    vectorSearch: true,
    memoryAccess: true
  },
  systemPrompt: `You are a skill progression analyst. Your role:
1. Identify patterns in code quality over time
2. Recognize skill improvements and areas needing work
3. Provide specific, actionable feedback
4. Celebrate achievements and milestones
5. Suggest next learning steps
6. Track both individual and team progress`,
  updateFrequency: 'quarterly',
  specializations: [
    'pattern_recognition',
    'skill_assessment',
    'progress_tracking',
    'learning_recommendations'
  ]
};

/**
 * Infrastructure Agent Manager
 * Handles configuration and enhancement of infrastructure agents
 */
export class InfrastructureAgentManager {
  private configs: Map<InfrastructureAgentType, InfrastructureAgentConfig>;

  constructor() {
    this.configs = new Map([
      ['educational', EDUCATIONAL_AGENT_CONFIG],
      ['orchestrator', ORCHESTRATOR_CONFIG],
      ['report_compiler', REPORT_COMPILER_CONFIG],
      ['skill_tracker', SKILL_TRACKER_CONFIG]
    ]);
  }

  /**
   * Get configuration for an infrastructure agent
   */
  getConfig(agentType: InfrastructureAgentType): InfrastructureAgentConfig {
    const config = this.configs.get(agentType);
    if (!config) {
      throw new Error(`Unknown infrastructure agent type: ${agentType}`);
    }
    return config;
  }

  /**
   * Check if an agent needs configuration update
   */
  needsUpdate(agentType: InfrastructureAgentType, lastUpdated: Date): boolean {
    const config = this.getConfig(agentType);
    const monthsSinceUpdate = this.getMonthsSince(lastUpdated);
    
    switch (config.updateFrequency) {
      case 'quarterly':
        return monthsSinceUpdate >= 3;
      case 'semi-annual':
        return monthsSinceUpdate >= 6;
      case 'annual':
        return monthsSinceUpdate >= 12;
      default:
        return false;
    }
  }

  /**
   * Get MCP enhancement for a specific use case
   */
  getMCPEnhancement(
    agentType: InfrastructureAgentType,
    useCase: string
  ): MCPToolset {
    const baseTools = this.getConfig(agentType).mcpTools;
    
    // Add use-case specific tools
    switch (useCase) {
      case 'generate_tutorial':
        return {
          ...baseTools,
          webSearch: true,
          codeExecution: true,
          imageGeneration: true
        };
      case 'analyze_pr_with_context':
        return {
          ...baseTools,
          databaseAccess: true,
          vectorSearch: true,
          cacheAccess: true
        };
      case 'track_team_progress':
        return {
          ...baseTools,
          analyticsAccess: true,
          memoryAccess: true
        };
      default:
        return baseTools;
    }
  }

  /**
   * Create enhanced agent with MCP tools
   */
  createEnhancedAgent(
    agentType: InfrastructureAgentType,
    additionalTools?: MCPToolset
  ): InfrastructureAgentConfig {
    const baseConfig = this.getConfig(agentType);
    
    return {
      ...baseConfig,
      mcpTools: {
        ...baseConfig.mcpTools,
        ...additionalTools
      }
    };
  }

  private getMonthsSince(date: Date): number {
    const now = new Date();
    const months = (now.getFullYear() - date.getFullYear()) * 12;
    return months + now.getMonth() - date.getMonth();
  }
}