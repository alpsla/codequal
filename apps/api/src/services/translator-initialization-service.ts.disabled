import { createLogger } from '@codequal/core/utils';
import { TranslatorFactory } from '@codequal/agents/translator/translator-factory';
import { AuthenticatedUser, UserRole, UserStatus } from '@codequal/agents/multi-agent/types/auth';

const logger = createLogger('TranslatorInitializationService');

/**
 * System user for translator initialization
 */
const SYSTEM_USER: AuthenticatedUser = {
  id: 'system-translator-init',
  email: 'system@codequal.ai',
  role: UserRole.SERVICE_ACCOUNT,
  status: UserStatus.ACTIVE,
  permissions: {
    repositories: {
      '00000000-0000-0000-0000-000000000002': { read: true, write: false, admin: false }
    },
    organizations: ['system'],
    globalPermissions: ['system:read'],
    quotas: {
      requestsPerHour: 10000,
      maxConcurrentExecutions: 100,
      storageQuotaMB: 1000
    }
  },
  session: {
    token: 'system-token',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    fingerprint: 'system',
    ipAddress: '127.0.0.1',
    userAgent: 'System/1.0'
  }
};

/**
 * Initialize translator factory with Vector DB configurations
 */
export async function initializeTranslators(): Promise<void> {
  try {
    logger.info('🚀 Initializing translator factory with Vector DB configurations');
    
    // Check if required environment variables are set
    if (!process.env.OPENROUTER_API_KEY) {
      logger.warn('⚠️  OPENROUTER_API_KEY not set, translators will not be fully functional');
      return;
    }
    
    // Get translator factory instance
    const factory = TranslatorFactory.getInstance();
    
    // Initialize with Vector DB configurations
    await factory.initializeWithVectorDB(SYSTEM_USER);
    
    logger.info('✅ Translator factory initialized successfully');
    
    // Log configured models
    const configs = factory.getAllModelConfigs();
    configs.forEach((config, role) => {
      logger.info(`📝 ${role}: ${config.provider}/${config.model}`, {
        capabilities: config.capabilities,
        languages: config.supportedLanguages.length
      });
    });
    
  } catch (error) {
    logger.error('❌ Failed to initialize translators', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    // Don't throw - allow API to start even if translators fail to initialize
  }
}

/**
 * Re-initialize translators (useful for configuration updates)
 */
export async function reinitializeTranslators(): Promise<void> {
  logger.info('🔄 Re-initializing translators');
  await initializeTranslators();
}