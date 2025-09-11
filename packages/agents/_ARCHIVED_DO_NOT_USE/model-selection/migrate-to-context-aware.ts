/**
 * Migration script to update all agents to use context-aware model selection
 * 
 * This updates:
 * 1. DeepWikiModelSelector
 * 2. All role-specific model selectors
 * 3. Unified model selector factory
 */

import { createLogger } from '@codequal/core/utils';

const logger = createLogger('MigrateToContextAware');

// Type imports needed for testContextAwareSelection function
type VectorStorageService = any; // Temporary type definition
declare function createUnifiedModelSelector(modelVersionSync: any, vectorStorage?: any): any;

// Update the unified-model-selector.ts exports
export const CONTEXT_AWARE_UPDATE = `
// Export context-aware selector
export { ContextAwareModelSelector, createContextAwareModelSelector } from './context-aware-model-selector';

// Update factory to use context-aware selector when vector storage is available
export function createUnifiedModelSelector(
  modelVersionSync: ModelVersionSync,
  vectorStorage?: VectorStorageService,
  logger?: Logger
): UnifiedModelSelector {
  // If vector storage is provided, use context-aware selector
  if (vectorStorage) {
    const { createContextAwareModelSelector } = require('./context-aware-model-selector');
    return createContextAwareModelSelector(modelVersionSync, vectorStorage, logger);
  }
  
  // Otherwise, use base unified selector
  return new UnifiedModelSelector(modelVersionSync, logger);
}
`;

// Update agent factory to pass vector storage
export const AGENT_FACTORY_UPDATE = `
// In agent factory files, ensure vector storage is passed
import { VectorStorageService } from '@codequal/database';

// Update factory functions to accept vector storage
export function createDeepWikiAgent(
  modelVersionSync: ModelVersionSync,
  vectorStorage?: VectorStorageService
): DeepWikiAgent {
  const selector = createUnifiedModelSelector(modelVersionSync, vectorStorage);
  return new DeepWikiAgent(selector);
}

// Similar updates for all other agent factories
`;

// Example implementation for DeepWiki
export const DEEPWIKI_SELECTOR_UPDATE = `
import { createUnifiedModelSelector } from '../model-selection/unified-model-selector';
import { VectorStorageService } from '@codequal/database';

export class DeepWikiModelSelector {
  private unifiedSelector: UnifiedModelSelector;
  
  constructor(
    modelVersionSync: ModelVersionSync,
    vectorStorage?: VectorStorageService
  ) {
    // Use context-aware selector if vector storage is available
    this.unifiedSelector = createUnifiedModelSelector(modelVersionSync, vectorStorage);
  }
  
  async selectModel(repositoryContext: RepositoryContext): Promise<ModelSelection> {
    // The unified selector will automatically use context-aware selection
    const result = await this.unifiedSelector.selectModelForContext('deepwiki', repositoryContext);
    
    return {
      ...result,
      reasoning: [
        'Selected using context-aware configuration',
        ...result.reasoning
      ]
    };
  }
}
`;

// Configuration for monitoring
export const MONITORING_CONFIG = {
  metrics: [
    'context_aware_selections_total',
    'context_config_hits',
    'context_config_misses',
    'fallback_selections_total',
    'selection_latency_ms'
  ],
  
  dashboards: [
    {
      name: 'Context-Aware Model Selection',
      panels: [
        'Selection Hit Rate',
        'Model Distribution by Context',
        'Performance Comparison',
        'Cost Analysis by Context'
      ]
    }
  ]
};

// Log migration plan
export async function logMigrationPlan(): Promise<void> {
  logger.info('=== CONTEXT-AWARE MODEL SELECTION MIGRATION PLAN ===');
  
  logger.info('1. Update unified-model-selector.ts to export context-aware selector');
  logger.info('2. Update all agent factories to pass VectorStorageService');
  logger.info('3. Update individual selectors to use unified selector with vector storage');
  logger.info('4. Add monitoring for context-aware selection performance');
  logger.info('5. Run comprehensive tests to verify compatibility');
  
  logger.info('\nAffected components:');
  const components = [
    'DeepWikiModelSelector',
    'ResearcherModelSelector', 
    'SecurityModelSelector',
    'ArchitectureModelSelector',
    'PerformanceModelSelector',
    'CodeQualityModelSelector',
    'DependencyModelSelector',
    'DocumentationModelSelector',
    'TestingModelSelector',
    'TranslatorModelSelector'
  ];
  
  components.forEach(comp => logger.info(`  - ${comp}`));
  
  logger.info('\nBenefits:');
  logger.info('  - Optimal model selection based on language and repository size');
  logger.info('  - Reduced costs for simple contexts');
  logger.info('  - Better quality for complex contexts');
  logger.info('  - Centralized configuration management');
  logger.info('  - Automatic updates from quarterly research');
}

// Example test to verify context-aware selection
export async function testContextAwareSelection(
  vectorStorage: VectorStorageService,
  modelVersionSync: any
): Promise<void> {
  logger.info('Testing context-aware selection...');
  
  const selector = createUnifiedModelSelector(modelVersionSync, vectorStorage);
  
  // Test different contexts
  const testCases = [
    { role: 'security', language: 'python', size: 'large' },
    { role: 'performance', language: 'go', size: 'small' },
    { role: 'documentation', language: 'javascript', size: 'medium' },
    { role: 'deepwiki', language: 'rust', size: 'extra_large' }
  ];
  
  for (const test of testCases) {
    const context = {
      primaryLanguage: test.language,
      size: test.size as any
    };
    
    const result = await selector.selectModelForContext(test.role, context);
    
    logger.info(`Test: ${test.role}/${test.language}/${test.size}`, {
      primary: `${result.primary.provider}/${result.primary.model}`,
      fallback: `${result.fallback.provider}/${result.fallback.model}`,
      reasoning: result.reasoning[0]
    });
  }
}

// Main migration function
export async function migrateToContextAware(): Promise<void> {
  try {
    await logMigrationPlan();
    
    logger.info('\n=== MIGRATION STEPS ===');
    logger.info('1. Run: npm run build');
    logger.info('2. Update imports in agent files');
    logger.info('3. Pass VectorStorageService to all selectors');
    logger.info('4. Run tests: npm test');
    logger.info('5. Deploy with monitoring enabled');
    
  } catch (error) {
    logger.error('Migration planning failed', { error });
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrateToContextAware()
    .then(() => logger.info('Migration plan completed'))
    .catch(error => logger.error('Migration failed', { error }));
}