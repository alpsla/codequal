/**
 * Agent Configuration Service
 * 
 * Provides optimal agent configurations using the dynamic RESEARCHER system.
 * 
 * Architecture:
 * - Vector DB: Contains existing model configurations
 * - Researcher Agent: Searches web for new models when configs missing
 * - Quarterly Scheduler: Refreshes all configs every 3 months to stay current
 * - Dynamic Fallback: Uses progressively broader Vector DB searches as last resort
 */

import { AgentRole, AgentProvider, AgentSelection } from '../config/agent-registry';
import { ModelVersionSync, RepositoryContext, RepositorySizeCategory } from './model-selection/ModelVersionSync';
import { createLogger } from '../utils/logger';

const logger = createLogger('AgentConfigurationService');

/**
 * Request Researcher agent to find missing model configuration
 */
async function requestResearcherForMissingConfig(
  role: AgentRole, 
  context: RepositoryContext
): Promise<AgentProvider> {
  logger.info('Requesting Researcher agent to find missing model config', { role, context });
  
  try {
    // Create web research request for missing model configuration
    const researchRequest = {
      type: 'web_model_research',
      role: role,
      context: context,
      searchCriteria: {
        language: context.language,
        sizeCategory: context.sizeCategory,
        roleRequirements: role,
        tags: [...(context.tags || []), role],
        priority: 'high'
      },
      researchSources: [
        'provider_websites',
        'model_leaderboards', 
        'research_papers',
        'github_repositories',
        'benchmarking_sites'
      ],
      timestamp: new Date().toISOString()
    };
    
    logger.info('Dispatching web research request to Researcher agent', { researchRequest });
    
    // Get ModelVersionSync instance to check for updates after research
    const modelSync = new ModelVersionSync(logger);
    
    // Trigger Researcher agent (this would be async in production)
    await triggerResearcherAgent({
      role: researchRequest.role,
      context: researchRequest.context,
      reason: `Missing model configuration for ${role} agent in ${context.language}/${context.sizeCategory} context`
    });
    
    // After research is complete, try to find the model again
    const updatedOptimalModel = await modelSync.findOptimalModel({
      ...context,
      tags: [...(context.tags || []), role]
    });
    
    if (updatedOptimalModel) {
      const model = Array.isArray(updatedOptimalModel) ? updatedOptimalModel[0] : updatedOptimalModel;
      logger.info('Researcher found and configured optimal model', { 
        role, 
        provider: model.provider,
        model: model.model 
      });
      
      // Map provider name to enum for backward compatibility
      const providerMapping: Record<string, AgentProvider> = {
        'anthropic': AgentProvider.ANTHROPIC,
        'openai': AgentProvider.OPENAI,
        'google': AgentProvider.GOOGLE,
        'deepseek': AgentProvider.DEEPSEEK,
        'openrouter': AgentProvider.OPENROUTER
      };
      
      return providerMapping[model.provider] || AgentProvider.OPENAI;
    }
    
    // If Researcher couldn't find a suitable model, use dynamic fallback from Vector DB
    logger.warn('Researcher could not find suitable model, using dynamic fallback', { role, context });
    return await getDynamicFallback(role, context);
    
  } catch (error) {
    logger.error('Error requesting Researcher for missing config', { role, context, error });
    return await getDynamicFallback(role, context);
  }
}

/**
 * Trigger the Researcher agent to search web for new model configurations
 */
async function triggerResearcherAgent(researchRequest: { role: string; context: RepositoryContext; reason: string }): Promise<void> {
  // TODO: Implement actual Researcher agent integration
  // This would:
  // 1. Send request to Researcher agent service
  // 2. Researcher searches WEB for new models matching the context:
  //    - Provider websites (OpenAI, Anthropic, Google, etc.)
  //    - Model leaderboards and benchmarks
  //    - AI research papers and announcements
  //    - GitHub model repositories
  // 3. Researcher analyzes found models for context suitability:
  //    - Performance benchmarks for the language/framework
  //    - Cost-effectiveness for the repository size
  //    - Capabilities matching the role requirements
  // 4. Researcher updates CANONICAL_MODEL_VERSIONS with new model metadata
  // 5. Researcher stores findings in Vector DB for future use
  // 6. Note: Quarterly scheduler also triggers comprehensive research every 3 months
  
  logger.info('Researcher agent triggered - searching web for new models', { researchRequest });
  
  // Simulate web research time (longer than Vector DB lookup)
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Dynamic fallback using Vector DB when Researcher can't find specific config
 */
async function getDynamicFallback(role: AgentRole, context: RepositoryContext): Promise<AgentProvider> {
  const modelSync = new ModelVersionSync(logger);
  
  // Try progressively broader searches in Vector DB
  const fallbackStrategies = [
    // 1. Same language, any role
    { ...context, tags: [] },
    // 2. Same size category, any language  
    { language: '', sizeCategory: context.sizeCategory, tags: [] },
    // 3. Any configuration for this role
    { language: '', sizeCategory: RepositorySizeCategory.MEDIUM, tags: [role] },
    // 4. Most general available model
    { language: '', sizeCategory: RepositorySizeCategory.MEDIUM, tags: [] }
  ];
  
  for (const fallbackContext of fallbackStrategies) {
    const fallbackModel = await modelSync.findOptimalModel(fallbackContext);
    if (fallbackModel) {
      const model = Array.isArray(fallbackModel) ? fallbackModel[0] : fallbackModel;
      logger.info('Found dynamic fallback model', { 
        strategy: fallbackContext, 
        provider: model.provider,
        model: model.model 
      });
      
      // Map provider name to enum for backward compatibility
      const providerMapping: Record<string, AgentProvider> = {
        'anthropic': AgentProvider.ANTHROPIC,
        'openai': AgentProvider.OPENAI,
        'google': AgentProvider.GOOGLE,
        'deepseek': AgentProvider.DEEPSEEK,
        'openrouter': AgentProvider.OPENROUTER
      };
      
      return providerMapping[model.provider] || AgentProvider.OPENAI;
    }
  }
  
  // If absolutely no models found in Vector DB, there's a system configuration issue
  logger.error('No models found in Vector DB - system configuration issue', { role, context });
  throw new Error('No model configurations available in Vector DB');
}

/**
 * Get optimal agent configuration for a specific role and context
 */
export async function getOptimalAgent(
  role: AgentRole,
  context: RepositoryContext
): Promise<AgentProvider> {
  const modelSync = new ModelVersionSync(logger);
  
  const optimalModel = await modelSync.findOptimalModel({
    ...context,
    tags: [...(context.tags || []), role]
  });
  
  if (optimalModel) {
    const model = Array.isArray(optimalModel) ? optimalModel[0] : optimalModel;
    // Map provider name to enum for backward compatibility
    const providerMapping: Record<string, AgentProvider> = {
      'anthropic': AgentProvider.ANTHROPIC,
      'openai': AgentProvider.OPENAI,
      'google': AgentProvider.GOOGLE,
      'deepseek': AgentProvider.DEEPSEEK,
      'openrouter': AgentProvider.OPENROUTER
    };
    
    return providerMapping[model.provider] || AgentProvider.OPENAI;
  }
  
  // If no optimal model found, trigger Researcher agent to find missing config
  logger.info(`No model configuration found for role ${role} with context`, { context });
  
  // Request Researcher agent to search for missing model version in Vector DB
  return await requestResearcherForMissingConfig(role, context);
}

/**
 * Get optimal agent selection for all roles given a repository context
 */
export async function getOptimalAgentSelection(context: RepositoryContext): Promise<AgentSelection> {
  const roles = Object.values(AgentRole);
  const selection: AgentSelection = {} as AgentSelection;
  
  for (const role of roles) {
    selection[role] = await getOptimalAgent(role, context);
  }
  
  return selection;
}

/**
 * Get optimal agent selection with sensible defaults
 */
export async function getDefaultAgentSelection(): Promise<AgentSelection> {
  const defaultContext: RepositoryContext = {
    language: 'javascript',
    sizeCategory: RepositorySizeCategory.MEDIUM,
    tags: []
  };
  
  return await getOptimalAgentSelection(defaultContext);
}

/**
 * Check if a specific agent provider is available for a role
 */
export async function isAgentAvailable(
  role: AgentRole, 
  provider: AgentProvider,
  context: RepositoryContext
): Promise<boolean> {
  try {
    const modelSync = new ModelVersionSync(logger);
    
    // Check if we have a model for this provider/role combination
    const optimalModel = await modelSync.findOptimalModel({
      ...context,
      tags: [...(context.tags || []), role]
    });
    
    const model = Array.isArray(optimalModel) ? optimalModel[0] : optimalModel;
    return model?.provider === provider;
  } catch (error) {
    logger.error('Error checking agent availability', { role, provider, error });
    return false;
  }
}

/**
 * Get cost estimate for using a specific agent configuration
 */
export async function getAgentCostEstimate(
  role: AgentRole,
  context: RepositoryContext
): Promise<{ inputCost: number; outputCost: number } | null> {
  try {
    const modelSync = new ModelVersionSync(logger);
    
    const optimalModel = await modelSync.findOptimalModel({
      ...context,
      tags: [...(context.tags || []), role]
    });
    
    const model = Array.isArray(optimalModel) ? optimalModel[0] : optimalModel;
    if (model?.pricing) {
      return {
        inputCost: model.pricing.input,
        outputCost: model.pricing.output
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting cost estimate', { role, error });
    return null;
  }
}