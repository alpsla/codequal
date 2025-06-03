/**
 * Agent Configuration Service
 * 
 * Provides simple utilities for getting optimal agent configurations
 * using the dynamic RESEARCHER system.
 */

import { AgentRole, AgentProvider, AgentSelection } from '../config/agent-registry';
import { ModelVersionSync, RepositoryContext } from './model-selection/ModelVersionSync';
import { createLogger } from '../utils/logger';

const logger = createLogger('AgentConfigurationService');

/**
 * Get optimal agent configuration for a specific role and context
 */
export function getOptimalAgent(
  role: AgentRole,
  context: RepositoryContext
): AgentProvider {
  const modelSync = new ModelVersionSync(logger);
  
  const optimalModel = modelSync.findOptimalModel({
    ...context,
    tags: [...(context.tags || []), role]
  });
  
  if (optimalModel) {
    // Map provider name to enum
    const providerMapping: Record<string, AgentProvider> = {
      'anthropic': AgentProvider.ANTHROPIC,
      'openai': AgentProvider.OPENAI,
      'google': AgentProvider.GOOGLE,
      'deepseek': AgentProvider.DEEPSEEK,
      'openrouter': AgentProvider.OPENROUTER
    };
    
    return providerMapping[optimalModel.provider] || AgentProvider.OPENAI;
  }
  
  // Fallback based on role
  const fallbacks: Record<AgentRole, AgentProvider> = {
    [AgentRole.ORCHESTRATOR]: AgentProvider.ANTHROPIC,
    [AgentRole.CODE_QUALITY]: AgentProvider.DEEPSEEK,
    [AgentRole.SECURITY]: AgentProvider.ANTHROPIC,
    [AgentRole.PERFORMANCE]: AgentProvider.OPENAI,
    [AgentRole.DEPENDENCY]: AgentProvider.OPENAI,
    [AgentRole.EDUCATIONAL]: AgentProvider.ANTHROPIC,
    [AgentRole.REPORT_GENERATION]: AgentProvider.OPENAI,
    [AgentRole.RESEARCHER]: AgentProvider.GOOGLE
  };
  
  return fallbacks[role];
}

/**
 * Get optimal agent selection for all roles given a repository context
 */
export function getOptimalAgentSelection(context: RepositoryContext): AgentSelection {
  const roles = Object.values(AgentRole);
  const selection: AgentSelection = {} as AgentSelection;
  
  for (const role of roles) {
    selection[role] = getOptimalAgent(role, context);
  }
  
  return selection;
}

/**
 * Get optimal agent selection with sensible defaults
 */
export function getDefaultAgentSelection(): AgentSelection {
  const defaultContext: RepositoryContext = {
    language: 'javascript',
    sizeCategory: 'medium',
    tags: []
  };
  
  return getOptimalAgentSelection(defaultContext);
}

/**
 * Check if a specific agent provider is available for a role
 */
export function isAgentAvailable(
  role: AgentRole, 
  provider: AgentProvider,
  context: RepositoryContext
): boolean {
  try {
    const modelSync = new ModelVersionSync(logger);
    
    // Check if we have a model for this provider/role combination
    const optimalModel = modelSync.findOptimalModel({
      ...context,
      tags: [...(context.tags || []), role]
    });
    
    return optimalModel?.provider === provider;
  } catch (error) {
    logger.error('Error checking agent availability', { role, provider, error });
    return false;
  }
}

/**
 * Get cost estimate for using a specific agent configuration
 */
export function getAgentCostEstimate(
  role: AgentRole,
  context: RepositoryContext
): { inputCost: number; outputCost: number } | null {
  try {
    const modelSync = new ModelVersionSync(logger);
    
    const optimalModel = modelSync.findOptimalModel({
      ...context,
      tags: [...(context.tags || []), role]
    });
    
    if (optimalModel?.pricing) {
      return {
        inputCost: optimalModel.pricing.input,
        outputCost: optimalModel.pricing.output
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting cost estimate', { role, error });
    return null;
  }
}