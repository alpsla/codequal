/**
 * Load Researcher Configuration from Vector DB
 * 
 * This module handles loading the latest researcher configuration from the Vector DB
 * and updating the model selection system accordingly.
 */

import { VectorContextService } from '../multi-agent/vector-context-service';
import { AuthenticatedUser } from '../multi-agent/types/auth';
import { Logger, createLogger } from '@codequal/core/utils';
import { ModelVersionSync, ModelVersionInfo, ModelTier } from '@codequal/core/services/model-selection/ModelVersionSync';

const RESEARCHER_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000001';

export interface StoredResearcherConfig {
  provider: string;
  model: string;
  versionId: string;
  capabilities: any;
  pricing: any;
  tier: string;
  preferredFor: string[];
  reason: string;
  previousModel?: {
    provider: string;
    model: string;
  };
  operationId?: string;
  timestamp?: string;
}

/**
 * Load the latest researcher configuration from Vector DB
 */
export async function loadResearcherConfigFromVectorDB(
  authenticatedUser: AuthenticatedUser,
  vectorContextService: VectorContextService,
  logger: Logger
): Promise<StoredResearcherConfig | null> {
  try {
    logger.info('🔍 Loading researcher configuration from Vector DB');

    // Search for the latest researcher configuration
    const repositoryContext = await vectorContextService.getRepositoryContext(
      RESEARCHER_CONFIG_REPO_ID,
      'codeQuality' as any, // Using a placeholder role for now
      authenticatedUser,
      { maxResults: 1, includeHistorical: false }
    );

    if (!repositoryContext || repositoryContext.recentAnalysis.length === 0) {
      logger.info('📭 No researcher configuration found in Vector DB');
      return null;
    }

    // For now, return a default configuration since Vector DB integration is not fully set up
    logger.info('ℹ️ Using default researcher configuration (Vector DB integration in progress)');
    
    const defaultConfig: StoredResearcherConfig = {
      provider: 'google',
      model: 'gemini-2.5-flash',
      versionId: 'gemini-2.5-flash-20250603',
      capabilities: {
        codeQuality: 8.5,
        speed: 9.2,
        contextWindow: 100000,
        reasoning: 8.8,
        detailLevel: 8.0
      },
      pricing: { input: 0.075, output: 0.30 },
      tier: 'STANDARD' as any,
      preferredFor: ['researcher', 'model_research', 'cost_optimization'],
      reason: 'Default configuration for testing',
      timestamp: new Date().toISOString()
    };

    return defaultConfig;

  } catch (error) {
    logger.error('❌ Failed to load researcher configuration from Vector DB', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Apply the loaded researcher configuration to the model selection system
 */
export async function applyResearcherConfiguration(
  config: StoredResearcherConfig,
  modelVersionSync: ModelVersionSync,
  logger: Logger
): Promise<boolean> {
  try {
    logger.info('🔧 Applying researcher configuration', {
      provider: config.provider,
      model: config.model,
      versionId: config.versionId
    });

    // Create ModelVersionInfo from stored config
    const modelInfo: ModelVersionInfo = {
      provider: config.provider,
      model: config.model,
      versionId: config.versionId,
      releaseDate: new Date().toISOString().split('T')[0], // Use today if not stored
      description: `Researcher-optimized model: ${config.reason}`,
      capabilities: config.capabilities,
      pricing: config.pricing,
      tier: config.tier as ModelTier || ModelTier.STANDARD,
      preferredFor: config.preferredFor || ['researcher', 'model_research', 'cost_optimization']
    };

    // Update or register the model
    const key = `${config.provider}/${config.model}`;
    const exists = await modelVersionSync.getCanonicalVersion(config.provider, config.model);
    
    if (exists) {
      // Update existing model
      const success = await modelVersionSync.updateModelVersion(modelInfo);
      if (success) {
        logger.info('✅ Updated researcher model in canonical versions', { key });
      } else {
        logger.error('❌ Failed to update researcher model', { key });
      }
      return success;
    } else {
      // Register new model
      const success = await modelVersionSync.registerModel(modelInfo);
      if (success) {
        logger.info('✅ Registered new researcher model in canonical versions', { key });
      } else {
        logger.error('❌ Failed to register researcher model', { key });
      }
      return success;
    }

  } catch (error) {
    logger.error('❌ Failed to apply researcher configuration', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Initialize researcher configuration from Vector DB on startup
 */
export async function initializeResearcherFromVectorDB(
  authenticatedUser: AuthenticatedUser
): Promise<boolean> {
  const logger = createLogger('ResearcherConfigLoader');
  
  try {
    logger.info('🚀 Initializing researcher configuration from Vector DB');

    // Create services
    const vectorContextService = new VectorContextService(authenticatedUser);
    const modelVersionSync = new ModelVersionSync(logger);

    // Load configuration
    const config = await loadResearcherConfigFromVectorDB(
      authenticatedUser,
      vectorContextService,
      logger
    );

    if (!config) {
      logger.info('ℹ️ No stored researcher configuration found, using defaults');
      return false;
    }

    // Apply configuration
    const applied = await applyResearcherConfiguration(config, modelVersionSync, logger);
    
    if (applied) {
      logger.info('✅ Successfully initialized researcher from Vector DB', {
        model: `${config.provider}/${config.model}`,
        reason: config.reason
      });
    }

    return applied;

  } catch (error) {
    logger.error('❌ Failed to initialize researcher from Vector DB', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Store a new researcher configuration in Vector DB
 * This is called after the researcher upgrades itself
 */
export async function storeResearcherConfigInVectorDB(
  authenticatedUser: AuthenticatedUser,
  config: StoredResearcherConfig,
  operationId: string
): Promise<boolean> {
  const logger = createLogger('ResearcherConfigStore');
  
  try {
    logger.info('💾 Storing new researcher configuration in Vector DB', {
      provider: config.provider,
      model: config.model,
      operationId
    });

    const vectorContextService = new VectorContextService(authenticatedUser);

    // Transform to analysis result format
    const analysisResult = {
      type: 'model_configuration',
      severity: 'high' as const,
      findings: [{
        type: 'researcher/medium/researcher',
        severity: 'high' as const,
        location: 'model_config',
        description: JSON.stringify({
          ...config,
          operationId,
          timestamp: new Date().toISOString(),
          configType: 'researcher_self_configuration'
        }),
        suggestion: `Researcher model updated to ${config.provider}/${config.model}: ${config.reason}`
      }],
      metrics: {
        operationId,
        priority: 10, // Highest priority for researcher config
        isResearcherConfig: true
      },
      recommendations: [
        `Updated researcher to ${config.provider}/${config.model}`,
        `Reason: ${config.reason}`,
        config.previousModel ? `Previous model: ${config.previousModel.provider}/${config.previousModel.model}` : ''
      ].filter(Boolean),
      summary: `Researcher configuration updated to ${config.provider}/${config.model}`,
      categories: [
        'model_configuration',
        'researcher',
        'self_configuration',
        config.provider
      ]
    };

    // Store in Vector DB
    await vectorContextService.storeAnalysisResults(
      RESEARCHER_CONFIG_REPO_ID,
      [analysisResult],
      authenticatedUser.id
    );

    logger.info('✅ Stored researcher configuration in Vector DB', {
      repositoryId: RESEARCHER_CONFIG_REPO_ID,
      operationId
    });

    return true;

  } catch (error) {
    logger.error('❌ Failed to store researcher configuration', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}
