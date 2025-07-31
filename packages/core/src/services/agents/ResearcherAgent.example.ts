/**
 * Example implementation of the Researcher Agent
 * This demonstrates how the agent should validate and store models in Vector DB
 */

import { Logger } from '../../utils/logger';
import { ModelVersionSync, ModelVersionInfo } from '../model-selection/ModelVersionSync';
import { openRouterModelValidator } from '../model-selection/openrouter-model-validator';
import { RepositorySizeCategory } from '../../config/models/repository-model-config';

interface ResearchContext {
  language: string;
  sizeCategory: RepositorySizeCategory;
  requirements?: string[];
}

export class ResearcherAgent {
  constructor(
    private logger: Logger,
    private modelVersionSync: ModelVersionSync
  ) {}

  /**
   * Research and store optimal models for a given context
   * This is called when no suitable model exists in Vector DB
   */
  async researchModelsForContext(context: ResearchContext): Promise<ModelVersionInfo | null> {
    try {
      this.logger.info('Researching models for context', context as any);
      
      // Step 1: Search for models based on requirements
      // In a real implementation, this would query various sources
      const candidateModels = await this.searchForModels(context);
      
      // Step 2: For each candidate, validate with OpenRouter BEFORE storing
      for (const candidate of candidateModels) {
        // Validate the model name with OpenRouter
        const validatedName = await openRouterModelValidator.validateAndNormalize(candidate.model);
        
        if (!validatedName) {
          this.logger.warn(`Skipping invalid model: ${candidate.model}`);
          continue;
        }
        
        // Update the candidate with the validated name
        candidate.model = validatedName;
        
        // Step 3: Store the validated model in Vector DB
        const stored = await this.modelVersionSync.storeValidatedModel(
          candidate,
          context.language,
          context.sizeCategory
        );
        
        if (stored) {
          this.logger.info('Successfully stored validated model', {
            provider: stored.provider,
            model: stored.model,
            language: context.language,
            sizeCategory: context.sizeCategory
          });
          
          return stored;
        }
      }
      
      this.logger.error('No valid models found for context', context as any);
      return null;
      
    } catch (error) {
      this.logger.error('Failed to research models', error as Error);
      return null;
    }
  }
  
  /**
   * Mock implementation of model search
   * In reality, this would query model marketplaces, documentation, etc.
   */
  private async searchForModels(context: ResearchContext): Promise<ModelVersionInfo[]> {
    // Example: For Python large repos, prefer models with good reasoning
    if (context.language === 'python' && context.sizeCategory === RepositorySizeCategory.LARGE) {
      return [
        {
          provider: 'openrouter',
          model: 'gpt-4o-2025-07', // This will be normalized to 'openai/gpt-4o'
          versionId: '2025-07',
          releaseDate: '2025-07-01',
          description: 'Latest GPT-4 optimized for code analysis',
          capabilities: {
            codeQuality: 9.5,
            speed: 7.5,
            contextWindow: 128000,
            reasoning: 9.5,
            detailLevel: 9.0
          },
          pricing: {
            input: 5.0,
            output: 15.0
          },
          preferredFor: ['python', 'large_repositories']
        },
        {
          provider: 'openrouter', 
          model: 'deepseek-r1', // This will be validated
          versionId: 'r1',
          releaseDate: '2025-01-01',
          description: 'DeepSeek R1 with strong reasoning capabilities',
          capabilities: {
            codeQuality: 9.0,
            speed: 6.0,
            contextWindow: 64000,
            reasoning: 9.5,
            detailLevel: 8.5
          },
          pricing: {
            input: 0.7,
            output: 1.0
          },
          preferredFor: ['python', 'large_repositories', 'complex_reasoning']
        }
      ];
    }
    
    // Default fallback models
    return [
      {
        provider: 'openrouter',
        model: 'gpt-4o', // Will be validated and normalized
        versionId: 'latest',
        releaseDate: new Date().toISOString(),
        description: 'General purpose model',
        capabilities: {
          codeQuality: 8.0,
          speed: 8.0,
          contextWindow: 128000,
          reasoning: 8.0,
          detailLevel: 8.0
        },
        pricing: {
          input: 5.0,
          output: 15.0
        },
        preferredFor: [context.language, `${context.sizeCategory}_repositories`]
      }
    ];
  }
  
  /**
   * Quarterly refresh of models
   * This should be scheduled to run every 3 months
   */
  async refreshModelsQuarterly(): Promise<void> {
    this.logger.info('Starting quarterly model refresh');
    
    try {
      // Get all language/size combinations from the system
      const contexts: ResearchContext[] = [
        { language: 'python', sizeCategory: RepositorySizeCategory.SMALL },
        { language: 'python', sizeCategory: RepositorySizeCategory.MEDIUM },
        { language: 'python', sizeCategory: RepositorySizeCategory.LARGE },
        { language: 'javascript', sizeCategory: RepositorySizeCategory.SMALL },
        { language: 'javascript', sizeCategory: RepositorySizeCategory.MEDIUM },
        { language: 'javascript', sizeCategory: RepositorySizeCategory.LARGE },
        // ... more combinations
      ];
      
      for (const context of contexts) {
        // Research and update models for each context
        await this.researchModelsForContext(context);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.logger.info('Quarterly model refresh completed');
      
    } catch (error) {
      this.logger.error('Failed to complete quarterly refresh', error as Error);
    }
  }
}

/**
 * Example usage in the orchestrator
 */
export async function exampleOrchestratorUsage(
  logger: Logger,
  modelVersionSync: ModelVersionSync
) {
  const researcher = new ResearcherAgent(logger, modelVersionSync);
  
  // When orchestrator can't find a model in Vector DB
  const context: ResearchContext = {
    language: 'python',
    sizeCategory: RepositorySizeCategory.LARGE,
    requirements: ['high_reasoning', 'large_context_window']
  };
  
  const model = await researcher.researchModelsForContext(context);
  
  if (model) {
    logger.info('Researcher found and stored model:', {
      provider: model.provider,
      model: model.model,
      validated: true,
      storedInVectorDB: true
    });
  }
}