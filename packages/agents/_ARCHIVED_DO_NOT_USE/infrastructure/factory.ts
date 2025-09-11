/**
 * Dependency Injection Factory
 * 
 * Creates and wires up all dependencies for the orchestrator
 */

import { ComparisonOrchestrator } from '../standard/orchestrator/comparison-orchestrator';
import { ComparisonAgent } from '../standard/comparison/comparison-agent';
import { ResearcherAgent } from '../researcher/researcher-agent';
import { AuthenticatedUser, UserPermissions, UserSession, UserRole, UserStatus } from '../multi-agent/types/auth';
import { EducatorAgent } from '../standard/educator/educator-agent';
import { IEducatorAgent } from '../standard/educator/interfaces/educator.interface';
import { SupabaseConfigProvider } from './supabase/supabase-config-provider';
import { SupabaseSkillProvider } from './supabase/supabase-skill-provider';
import { SupabaseDataStore } from './supabase/supabase-data-store';
import { IConfigProvider } from '../standard/orchestrator/interfaces/config-provider.interface';
import { ISkillProvider } from '../standard/orchestrator/interfaces/skill-provider.interface';
import { IDataStore } from '../standard/services/interfaces/data-store.interface';

/**
 * Environment configuration
 */
export interface Environment {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  REDIS_URL?: string;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL?: string;
  SEARCH_MODEL_API_KEY?: string;
}

/**
 * Provider options for different environments
 */
export interface ProviderOptions {
  useCache?: boolean;
  cacheProvider?: 'redis' | 'memory';
}

/**
 * Create orchestrator with all dependencies
 */
export async function createOrchestrator(
  env: Environment,
  options: ProviderOptions = {}
): Promise<ComparisonOrchestrator> {
  // Create providers based on environment
  const configProvider = await createConfigProvider(env, options);
  const skillProvider = await createSkillProvider(env, options);
  const dataStore = await createDataStore(env, options);
  const researcherAgent = createResearcherAgent(env);
  const educatorAgent = await createEducatorAgent(env, options);
  
  // Create logger if needed
  const logger = createLogger(env);
  
  // Create comparison agent with skill provider for score persistence (BUG-012 fix)
  const comparisonAgent = new ComparisonAgent(
    logger,
    undefined,  // modelService - not used yet
    skillProvider  // Pass skill provider for database persistence
  );
  
  // Wire everything together
  return new ComparisonOrchestrator(
    configProvider,
    skillProvider,
    dataStore,
    researcherAgent,
    educatorAgent,
    logger,
    comparisonAgent
  );
}

/**
 * Create config provider
 */
async function createConfigProvider(
  env: Environment,
  options: ProviderOptions
): Promise<IConfigProvider> {
  return new SupabaseConfigProvider(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );
}

/**
 * Create skill provider
 */
async function createSkillProvider(
  env: Environment,
  options: ProviderOptions
): Promise<ISkillProvider> {
  return new SupabaseSkillProvider(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );
}

/**
 * Create data store
 */
async function createDataStore(
  env: Environment,
  options: ProviderOptions
): Promise<IDataStore> {
  // Create base Supabase store
  const baseStore = new SupabaseDataStore(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
  );
  
  // Wrap with cache if enabled
  if (options.useCache && env.REDIS_URL) {
    // TODO: Implement Redis cache wrapper
    // const { RedisDataStore } = await import('./redis/redis-data-store');
    // return new RedisDataStore(baseStore, env.REDIS_URL);
    return baseStore; // For now, return base store
  }
  
  return baseStore;
}

/**
 * Create researcher agent
 */
function createResearcherAgent(env: Environment): ResearcherAgent {
  // Create a system authenticated user for the researcher
  const systemUser: AuthenticatedUser = {
    id: 'system',
    email: 'system@example.com',
    name: 'System User',
    organizationId: 'default',
    permissions: {
      repositories: {},
      organizations: ['default'],
      globalPermissions: ['read', 'write'],
      quotas: {
        requestsPerHour: 1000,
        maxConcurrentExecutions: 5,
        storageQuotaMB: 1000
      }
    },
    session: {
      token: 'system-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      fingerprint: 'system-fingerprint',
      ipAddress: '127.0.0.1',
      userAgent: 'system-agent'
    },
    role: 'admin' as UserRole,
    status: 'active' as UserStatus,
    metadata: {
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
      preferences: {}
    }
  };
  
  return new ResearcherAgent(systemUser);
}

/**
 * Create educator agent
 */
async function createEducatorAgent(
  env: Environment,
  options: ProviderOptions
): Promise<IEducatorAgent | undefined> {
  // Only create educator if search model is available
  if (!env.SEARCH_MODEL_API_KEY) {
    return undefined;
  }
  
  // Create with appropriate search model
  // Could be Perplexity, Tavily, or other search AI
  const searchModel = createSearchModel(env);
  const logger = createLogger(env);
  
  return new EducatorAgent(searchModel, logger);
}

/**
 * Create search model for educator
 */
function createSearchModel(env: Environment): any {
  // Placeholder for search model creation
  // In production, this would create Perplexity, Tavily, etc.
  return null;
}

/**
 * Create logger
 */
function createLogger(env: Environment): any {
  // Use your existing logger creation logic
  const logLevel = env.LOG_LEVEL || (env.NODE_ENV === 'production' ? 'info' : 'debug');
  
  // Simple console logger for now
  return {
    debug: (msg: string, data?: any) => {
      if (logLevel === 'debug') {
        console.debug(`[DEBUG] ${msg}`, data || ''); // eslint-disable-line no-console
      }
    },
    info: (msg: string, data?: any) => {
      console.info(`[INFO] ${msg}`, data || ''); // eslint-disable-line no-console
    },
    warn: (msg: string, data?: any) => {
      console.warn(`[WARN] ${msg}`, data || ''); // eslint-disable-line no-console
    },
    error: (msg: string, data?: any) => {
      console.error(`[ERROR] ${msg}`, data || ''); // eslint-disable-line no-console
    }
  };
}

/**
 * Factory for creating orchestrator in different contexts
 */
export class OrchestratorFactory {
  private static instances = new Map<string, ComparisonOrchestrator>();
  
  /**
   * Get or create orchestrator instance (singleton per environment)
   */
  static async getInstance(env: Environment, options?: ProviderOptions): Promise<ComparisonOrchestrator> {
    const key = `${env.NODE_ENV}-${options?.useCache ? 'cached' : 'direct'}`;
    
    if (!this.instances.has(key)) {
      this.instances.set(key, await createOrchestrator(env, options));
    }
    
    return this.instances.get(key)!;
  }
  
  /**
   * Clear all instances (useful for testing)
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}

/**
 * Create production orchestrator
 * 
 * This is the main entry point used by all integration channels (API, CLI, IDE, etc).
 * The orchestrator will:
 * 1. Pull current model configuration from Supabase (no validation)
 * 2. Use the configured model (version, cost info included)
 * 3. Fall back to defaults if no configuration exists
 * 
 * Model evaluation is handled separately by the scheduler service.
 */
export async function createProductionOrchestrator(): Promise<ComparisonOrchestrator> {
  const env: Environment = {
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    REDIS_URL: process.env.REDIS_URL,
    NODE_ENV: 'production',
    LOG_LEVEL: process.env.LOG_LEVEL
  };
  
  return createOrchestrator(env, {
    useCache: true,
    cacheProvider: 'redis'
  });
}

/**
 * Convenience function for testing
 */
export async function createTestOrchestrator(): Promise<ComparisonOrchestrator> {
  const env: Environment = {
    SUPABASE_URL: process.env.SUPABASE_URL || 'https://test.supabase.co',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'test-key',
    NODE_ENV: 'test'
  };
  
  return createOrchestrator(env, {
    useCache: false
  });
}