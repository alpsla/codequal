/**
 * Load Translator Configuration from Vector DB
 * 
 * This module handles loading translator model configurations from the Vector DB
 * and applying them to the translation system. It follows the same pattern as
 * the researcher configuration loader.
 */

import { VectorContextService } from '../multi-agent/vector-context-service';
import { AuthenticatedUser } from '../multi-agent/types/auth';
import { Logger, createLogger } from '@codequal/core/utils';
import { ModelVersionSync } from '@codequal/core/services/model-selection/ModelVersionSync';
import { 
  TranslatorRole, 
  StoredTranslatorConfig, 
  translatorConfigToModelInfo,
  TRANSLATOR_ROLE_CONFIGS
} from './translator-role-config';

// Special repository ID for translator configurations
const TRANSLATOR_CONFIG_REPO_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Load translator configurations from Vector DB for all roles
 */
export async function loadTranslatorConfigsFromVectorDB(
  authenticatedUser: AuthenticatedUser,
  vectorContextService: VectorContextService,
  logger: Logger
): Promise<Map<TranslatorRole, StoredTranslatorConfig>> {
  const configs = new Map<TranslatorRole, StoredTranslatorConfig>();
  
  try {
    logger.info('🔍 Loading translator configurations from Vector DB');

    // Search for translator configurations
    const repositoryContext = await vectorContextService.getRepositoryContext(
      TRANSLATOR_CONFIG_REPO_ID,
      'translator' as any,
      authenticatedUser,
      { maxResults: 20, includeHistorical: false }
    );

    if (!repositoryContext || repositoryContext.recentAnalysis.length === 0) {
      logger.info('📭 No translator configurations found in Vector DB, using defaults');
      return getDefaultTranslatorConfigs();
    }

    // Parse configurations from analysis results
    for (const result of repositoryContext.recentAnalysis) {
      try {
        // Extract configuration from the content
        const content = result.content;
        if (content && content.includes('translator_model_configuration')) {
          // Try to parse as JSON
          const config = JSON.parse(content) as StoredTranslatorConfig & { configType?: string };
          if (config.role && config.configType === 'translator_model_configuration') {
            configs.set(config.role, config);
            logger.info(`✅ Loaded config for ${config.role}`, {
              model: `${config.provider}/${config.model}`
            });
          }
        }
      } catch (parseError) {
        logger.warn('Failed to parse translator config', { error: parseError });
      }
    }

    // Fill missing roles with defaults
    for (const role of Object.values(TranslatorRole)) {
      if (!configs.has(role)) {
        const defaultConfig = getDefaultConfigForRole(role);
        if (defaultConfig) {
          configs.set(role, defaultConfig);
          logger.info(`📝 Using default config for ${role}`);
        }
      }
    }

    return configs;

  } catch (error) {
    logger.error('❌ Failed to load translator configurations from Vector DB', {
      error: error instanceof Error ? error.message : String(error)
    });
    return getDefaultTranslatorConfigs();
  }
}

/**
 * Store a translator configuration in Vector DB
 */
export async function storeTranslatorConfigInVectorDB(
  authenticatedUser: AuthenticatedUser,
  config: StoredTranslatorConfig,
  operationId: string
): Promise<boolean> {
  const logger = createLogger('TranslatorConfigStore');
  
  try {
    logger.info('💾 Storing translator configuration in Vector DB', {
      role: config.role,
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
        type: `translator/${config.role}/configuration`,
        severity: 'high' as const,
        location: 'model_config',
        description: JSON.stringify({
          ...config,
          operationId,
          timestamp: new Date().toISOString(),
          configType: 'translator_model_configuration'
        }),
        suggestion: `Translator ${config.role} model updated to ${config.provider}/${config.model}: ${config.reason}`
      }],
      metrics: {
        operationId,
        priority: 9, // High priority for translator configs
        role: config.role,
        isTranslatorConfig: true
      },
      recommendations: [
        `Updated ${config.role} to ${config.provider}/${config.model}`,
        `Reason: ${config.reason}`,
        `Supported languages: ${config.supportedLanguages.join(', ')}`,
        config.previousModel ? `Previous model: ${config.previousModel.provider}/${config.previousModel.model}` : ''
      ].filter(Boolean),
      summary: `Translator configuration for ${config.role} updated to ${config.provider}/${config.model}`,
      categories: [
        'model_configuration',
        'translator',
        config.role,
        config.provider
      ]
    };

    // Store in Vector DB
    await vectorContextService.storeAnalysisResults(
      TRANSLATOR_CONFIG_REPO_ID,
      [analysisResult],
      authenticatedUser.id
    );

    logger.info('✅ Stored translator configuration in Vector DB', {
      repositoryId: TRANSLATOR_CONFIG_REPO_ID,
      role: config.role,
      operationId
    });

    return true;

  } catch (error) {
    logger.error('❌ Failed to store translator configuration', {
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}

/**
 * Apply translator configurations to the model selection system
 */
export async function applyTranslatorConfigurations(
  configs: Map<TranslatorRole, StoredTranslatorConfig>,
  modelVersionSync: ModelVersionSync,
  logger: Logger
): Promise<boolean> {
  let allSuccess = true;

  for (const [role, config] of configs) {
    try {
      logger.info(`🔧 Applying translator configuration for ${role}`, {
        provider: config.provider,
        model: config.model
      });

      // Convert to ModelVersionInfo
      const modelInfo = translatorConfigToModelInfo(config);

      // Register or update the model
      const key = `${config.provider}/${config.model}`;
      const exists = await modelVersionSync.getCanonicalVersion(config.provider, config.model);
      
      if (exists) {
        const success = await modelVersionSync.updateModelVersion(modelInfo);
        if (!success) {
          logger.error(`❌ Failed to update model for ${role}`, { key });
          allSuccess = false;
        }
      } else {
        const success = await modelVersionSync.registerModel(modelInfo);
        if (!success) {
          logger.error(`❌ Failed to register model for ${role}`, { key });
          allSuccess = false;
        }
      }

    } catch (error) {
      logger.error(`❌ Failed to apply config for ${role}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      allSuccess = false;
    }
  }

  return allSuccess;
}

/**
 * Initialize translator configurations from Vector DB on startup
 */
export async function initializeTranslatorsFromVectorDB(
  authenticatedUser: AuthenticatedUser
): Promise<Map<TranslatorRole, StoredTranslatorConfig>> {
  const logger = createLogger('TranslatorConfigLoader');
  
  try {
    logger.info('🚀 Initializing translator configurations from Vector DB');

    // Create services
    const vectorContextService = new VectorContextService(authenticatedUser);
    const modelVersionSync = new ModelVersionSync(logger);

    // Load configurations
    const configs = await loadTranslatorConfigsFromVectorDB(
      authenticatedUser,
      vectorContextService,
      logger
    );

    if (configs.size === 0) {
      logger.info('ℹ️ No translator configurations found, using defaults');
      return getDefaultTranslatorConfigs();
    }

    // Apply configurations
    const applied = await applyTranslatorConfigurations(configs, modelVersionSync, logger);
    
    if (applied) {
      logger.info('✅ Successfully initialized translators from Vector DB', {
        configuredRoles: Array.from(configs.keys())
      });
    }

    return configs;

  } catch (error) {
    logger.error('❌ Failed to initialize translators from Vector DB', {
      error: error instanceof Error ? error.message : String(error)
    });
    return getDefaultTranslatorConfigs();
  }
}

/**
 * Get default translator configurations
 */
function getDefaultTranslatorConfigs(): Map<TranslatorRole, StoredTranslatorConfig> {
  const configs = new Map<TranslatorRole, StoredTranslatorConfig>();
  
  // Default configurations based on role requirements
  const defaults: Record<TranslatorRole, Partial<StoredTranslatorConfig>> = {
    [TranslatorRole.API_TRANSLATOR]: {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      versionId: 'gpt-3.5-turbo-1106',
      capabilities: {
        translationQuality: 8.5,
        speed: 9.0,
        contextWindow: 16000,
        languageSupport: 9.0,
        formatPreservation: 9.5
      },
      pricing: { input: 1.0, output: 2.0 },
      specialCapabilities: ['json_support', 'streaming']
    },
    
    [TranslatorRole.ERROR_TRANSLATOR]: {
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      versionId: 'claude-3-sonnet-20240229',
      capabilities: {
        translationQuality: 9.0,
        speed: 7.5,
        contextWindow: 200000,
        languageSupport: 9.5,
        formatPreservation: 8.5
      },
      pricing: { input: 3.0, output: 15.0 },
      specialCapabilities: ['context_understanding', 'solution_generation']
    },
    
    [TranslatorRole.DOCS_TRANSLATOR]: {
      provider: 'anthropic',
      model: 'claude-3-opus',
      versionId: 'claude-3-opus-20240229',
      capabilities: {
        translationQuality: 9.8,
        speed: 6.0,
        contextWindow: 200000,
        languageSupport: 9.5,
        formatPreservation: 9.5
      },
      pricing: { input: 15.0, output: 75.0 },
      specialCapabilities: ['markdown_support', 'long_context', 'technical_accuracy']
    },
    
    [TranslatorRole.UI_TRANSLATOR]: {
      provider: 'anthropic',
      model: 'claude-3-haiku',
      versionId: 'claude-3-haiku-20240307',
      capabilities: {
        translationQuality: 8.2,
        speed: 9.5,
        contextWindow: 200000,
        languageSupport: 9.0,
        formatPreservation: 8.0
      },
      pricing: { input: 0.25, output: 1.25 },
      specialCapabilities: ['length_control', 'ui_terminology']
    },
    
    [TranslatorRole.SDK_TRANSLATOR]: {
      provider: 'openai',
      model: 'gpt-4-turbo',
      versionId: 'gpt-4-1106-preview',
      capabilities: {
        translationQuality: 9.5,
        speed: 7.0,
        contextWindow: 128000,
        languageSupport: 9.5,
        formatPreservation: 9.8
      },
      pricing: { input: 10.0, output: 30.0 },
      specialCapabilities: ['code_awareness', 'comment_extraction', 'syntax_preservation']
    }
  };

  for (const [role, defaultConfig] of Object.entries(defaults)) {
    configs.set(role as TranslatorRole, {
      ...defaultConfig,
      role: role as TranslatorRole,
      supportedLanguages: ['en', 'es', 'zh', 'hi', 'pt', 'ja', 'de', 'ru', 'fr', 'ko'],
      reason: 'Default configuration',
      timestamp: new Date().toISOString()
    } as StoredTranslatorConfig);
  }

  return configs;
}

/**
 * Get default configuration for a specific role
 */
function getDefaultConfigForRole(role: TranslatorRole): StoredTranslatorConfig | null {
  const defaults = getDefaultTranslatorConfigs();
  return defaults.get(role) || null;
}