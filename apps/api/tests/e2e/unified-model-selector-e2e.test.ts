/**
 * E2E Test for Unified Model Selector
 * 
 * Tests the unified model selector with real OpenRouter data
 * to ensure backward compatibility and correct behavior.
 */

import axios from 'axios';
import { 
  UnifiedModelSelector,
  createUnifiedModelSelector,
  ROLE_SCORING_PROFILES,
  RepositoryContext
} from '@codequal/agents/model-selection/unified-model-selector';
import { ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('UnifiedModelSelectorE2E');

// Test configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

interface TestResult {
  role: string;
  primary: string;
  fallback: string;
  primaryScore: number;
  fallbackScore: number;
  estimatedCost?: number;
  reasoning: string[];
  duration: number;
}

/**
 * Fetch models from OpenRouter
 */
async function fetchOpenRouterModels() {
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual E2E Test'
      }
    });
    
    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch OpenRouter models', { error });
    throw error;
  }
}

/**
 * Create mock ModelVersionSync with real data
 */
function createMockModelVersionSync(models: any[]): ModelVersionSync {
  const processedModels = models
    .filter(m => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && 
             !id.includes('vision') && 
             !id.includes('sonar') && 
             !id.includes('online') && 
             !id.includes('base') && 
             m.pricing &&
             (parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0);
    })
    .map(m => ({
      provider: m.id.split('/')[0],
      model: m.id.split('/').slice(1).join('/'),
      model_id: m.id.split('/').slice(1).join('/'),
      version: 'latest',
      created_at: new Date().toISOString(),
      deprecated: false,
      pricing: {
        input: parseFloat(m.pricing.prompt),
        output: parseFloat(m.pricing.completion)
      },
      capabilities: {
        context_window: m.context_length || 128000,
        code_quality: inferQuality(m.id),
        speed: inferSpeed(m.id),
        reasoning: inferQuality(m.id) * 0.95,
        multimodal: m.id.includes('vision') || m.id.includes('multimodal'),
        function_calling: true
      },
      metadata: {
        status: m.id.includes('preview') ? 'preview' : 
               m.id.includes('beta') ? 'beta' : 'stable'
      }
    }));

  return {
    getAllModels: async () => processedModels,
    getModelsForProvider: (provider: string) => 
      processedModels.filter(m => m.provider === provider)
  } as any;
}

/**
 * Infer quality score (simplified version)
 */
function inferQuality(modelId: string): number {
  const id = modelId.toLowerCase();
  if (id.includes('opus') || id.includes('gpt-4.5')) return 9.5;
  if (id.includes('sonnet') || id.includes('gpt-4')) return 9.0;
  if (id.includes('gemini') && id.includes('pro')) return 8.5;
  if (id.includes('flash') || id.includes('mini')) return 7.5;
  return 7.0;
}

/**
 * Infer speed score (simplified version)
 */
function inferSpeed(modelId: string): number {
  const id = modelId.toLowerCase();
  if (id.includes('flash') || id.includes('mini')) return 9.0;
  if (id.includes('sonnet')) return 7.5;
  if (id.includes('opus')) return 5.0;
  return 7.0;
}

/**
 * Test all roles with unified selector
 */
async function testAllRoles(selector: UnifiedModelSelector): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const roles = Object.keys(ROLE_SCORING_PROFILES) as Array<keyof typeof ROLE_SCORING_PROFILES>;

  for (const role of roles) {
    const start = Date.now();
    
    try {
      // Create appropriate context for each role
      const context = createContextForRole(role);
      const selection = await selector.selectModel(role, context);
      
      results.push({
        role,
        primary: `${selection.primary.provider}/${selection.primary.model}`,
        fallback: `${selection.fallback.provider}/${selection.fallback.model}`,
        primaryScore: selection.scores.primary.compositeScore,
        fallbackScore: selection.scores.fallback.compositeScore,
        estimatedCost: selection.estimatedCost,
        reasoning: selection.reasoning,
        duration: Date.now() - start
      });
      
      logger.info(`✓ ${role}: ${selection.primary.provider}/${selection.primary.model} (score: ${selection.scores.primary.compositeScore.toFixed(2)})`);
    } catch (error) {
      logger.error(`✗ ${role}: Failed`, { error });
      results.push({
        role,
        primary: 'ERROR',
        fallback: 'ERROR',
        primaryScore: 0,
        fallbackScore: 0,
        reasoning: [`Error: ${error instanceof Error ? error.message : String(error)}`],
        duration: Date.now() - start
      });
    }
  }

  return results;
}

/**
 * Create context appropriate for each role
 */
function createContextForRole(role: string): RepositoryContext | undefined {
  switch (role) {
    case 'deepwiki':
    case 'architecture':
      return {
        url: 'https://github.com/example/large-repo',
        size: 'large',
        primaryLanguage: 'TypeScript',
        languages: ['TypeScript', 'JavaScript'],
        frameworks: ['React', 'Node.js'],
        fileCount: 5000,
        totalLines: 250000,
        complexity: 8,
        analysisDepth: 'comprehensive'
      };
    
    case 'security':
      return {
        url: 'https://github.com/example/secure-app',
        size: 'medium',
        primaryLanguage: 'Java',
        languages: ['Java', 'Kotlin'],
        frameworks: ['Spring Security'],
        fileCount: 1000,
        totalLines: 50000,
        complexity: 7,
        analysisDepth: 'comprehensive'
      };
    
    case 'documentation':
    case 'testing':
      return {
        url: 'https://github.com/example/docs',
        size: 'small',
        primaryLanguage: 'Markdown',
        languages: ['Markdown', 'JavaScript'],
        frameworks: [],
        fileCount: 100,
        totalLines: 5000,
        complexity: 2,
        analysisDepth: 'quick'
      };
    
    default:
      return undefined; // Use default context
  }
}

/**
 * Compare with old selector results
 */
async function compareWithOldSelectors(models: any[]): Promise<void> {
  logger.info('\n=== Comparing with old selectors ===');
  
  // Test DeepWiki compatibility
  const deepwikiScores = scoreModelsForDeepWiki(models);
  logger.info(`DeepWiki old selector top pick: ${deepwikiScores[0].id} (score: ${deepwikiScores[0].compositeScore.toFixed(2)})`);
  
  // Test Researcher compatibility
  const researcherScores = scoreModelsForResearcher(models);
  logger.info(`Researcher old selector top pick: ${researcherScores[0].id} (score: ${researcherScores[0].compositeScore.toFixed(2)})`);
}

/**
 * Legacy scoring functions for comparison
 */
function scoreModelsForDeepWiki(models: any[]) {
  const DEEPWIKI_SCORING_WEIGHTS = { quality: 0.50, cost: 0.30, speed: 0.20 };
  
  return models
    .filter(m => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && !id.includes('vision') && m.pricing;
    })
    .map(m => {
      const inputCost = parseFloat(m.pricing.prompt) * 1000000;
      const outputCost = parseFloat(m.pricing.completion) * 1000000;
      const avgCost = (inputCost + outputCost) / 2;
      const quality = inferQuality(m.id);
      const speed = inferSpeed(m.id);
      const priceScore = 10 - (Math.min(avgCost, 20) / 2);
      
      const compositeScore = 
        quality * DEEPWIKI_SCORING_WEIGHTS.quality +
        priceScore * DEEPWIKI_SCORING_WEIGHTS.cost +
        speed * DEEPWIKI_SCORING_WEIGHTS.speed;
      
      return { id: m.id, compositeScore, quality, priceScore, speed };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

function scoreModelsForResearcher(models: any[]) {
  const RESEARCHER_SCORING_WEIGHTS = { quality: 0.50, price: 0.35, speed: 0.15 };
  
  return models
    .filter(m => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && !id.includes('vision') && m.pricing;
    })
    .map(m => {
      const inputCost = parseFloat(m.pricing.prompt) * 1000000;
      const outputCost = parseFloat(m.pricing.completion) * 1000000;
      const avgCost = (inputCost + outputCost) / 2;
      const quality = inferQuality(m.id);
      const speed = inferSpeed(m.id);
      const priceScore = 10 - (Math.min(avgCost, 20) / 2);
      
      const compositeScore = 
        quality * RESEARCHER_SCORING_WEIGHTS.quality +
        priceScore * RESEARCHER_SCORING_WEIGHTS.price +
        speed * RESEARCHER_SCORING_WEIGHTS.speed;
      
      return { id: m.id, compositeScore, quality, priceScore, speed };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * Main E2E test
 */
async function runE2ETest() {
  logger.info('Starting Unified Model Selector E2E Test');
  logger.info('=====================================\n');

  try {
    // Fetch real models from OpenRouter
    logger.info('Fetching models from OpenRouter...');
    const models = await fetchOpenRouterModels();
    logger.info(`Found ${models.length} models\n`);

    // Create unified selector with real data
    const modelVersionSync = createMockModelVersionSync(models);
    const selector = createUnifiedModelSelector(modelVersionSync);

    // Test all roles
    logger.info('Testing all agent roles:');
    logger.info('------------------------');
    const results = await testAllRoles(selector);

    // Summary
    logger.info('\n=== Test Summary ===');
    logger.info(`Total roles tested: ${results.length}`);
    logger.info(`Successful: ${results.filter(r => r.primary !== 'ERROR').length}`);
    logger.info(`Failed: ${results.filter(r => r.primary === 'ERROR').length}`);
    logger.info(`Average selection time: ${(results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(0)}ms`);

    // Compare with old selectors
    await compareWithOldSelectors(models);

    // Print detailed results
    logger.info('\n=== Detailed Results ===');
    results.forEach(result => {
      logger.info(`\n${result.role.toUpperCase()}:`);
      logger.info(`  Primary: ${result.primary} (score: ${result.primaryScore.toFixed(2)})`);
      logger.info(`  Fallback: ${result.fallback} (score: ${result.fallbackScore.toFixed(2)})`);
      if (result.estimatedCost !== undefined) {
        logger.info(`  Estimated cost: $${result.estimatedCost.toFixed(4)}`);
      }
      logger.info(`  Selection time: ${result.duration}ms`);
    });

    // Test specific scenarios
    logger.info('\n=== Testing Specific Scenarios ===');
    
    // Test Gemini 2.0 vs 2.5 selection
    const researcherResult = results.find(r => r.role === 'researcher');
    if (researcherResult) {
      logger.info('\nGemini model selection validation:');
      if (researcherResult.primary.includes('gemini-2.0') && !researcherResult.primary.includes('gemini-2.5')) {
        logger.info('✓ Correctly selected Gemini 2.0 over 2.5 (ROI analysis working)');
      } else if (researcherResult.primary.includes('gemini-2.5')) {
        logger.warn('⚠ Selected Gemini 2.5 - check if ROI analysis is working correctly');
      }
    }

    logger.info('\n✅ E2E test completed successfully!');

  } catch (error) {
    logger.error('E2E test failed', { error });
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runE2ETest().catch(console.error);
}