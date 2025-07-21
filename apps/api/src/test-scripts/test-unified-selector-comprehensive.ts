#!/usr/bin/env ts-node

/**
 * Comprehensive Test of Unified Model Selector
 * Tests all configuration context parameter combinations
 * and provides samples for review
 */

import axios from 'axios';
import { 
  UnifiedModelSelector,
  ROLE_SCORING_PROFILES,
  RepositoryContext,
  createUnifiedModelSelector
} from '@codequal/agents/model-selection/unified-model-selector';
import { ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('UnifiedSelectorComprehensiveTest');

// Configuration
const JWT_TOKEN = process.env.JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsImtpZCI6InVMS2F5R1RkcUVOTWJ1RUQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2Z0amhtYmJjdXFqcW1tYmF5bXFiLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzYzFmMTQzOC1mNWJkLTQxZDItYTllZi1iZjQyNjhiNzdmZjciLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzUzMDQ1OTkzLCJpYXQiOjE3NTMwNDIzOTMsImVtYWlsIjoidGVzdDFAZ3JyLmxhIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InRlc3QxQGdyci5sYSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjNjMWYxNDM4LWY1YmQtNDFkMi1hOWVmLWJmNDI2OGI3N2ZmNyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im90cCIsInRpbWVzdGFtcCI6MTc1MzA0MjM5M31dLCJzZXNzaW9uX2lkIjoiZTNhNzk1NTEtMWM2OC00OGNmLThkNDUtZDZmZDViMzNjMTFlIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.zpVXnItx6vsHd-eV-208jcRsB54MdnfF4M-O3NAVdTc';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Test context variations
const CONTEXT_VARIATIONS = {
  sizes: ['small', 'medium', 'large', 'enterprise'] as const,
  languages: ['TypeScript', 'Python', 'Java', 'Go', 'Rust', 'JavaScript'],
  complexities: [2, 5, 8, 10],
  analysisDepths: ['quick', 'standard', 'comprehensive'] as const,
  frameworks: {
    TypeScript: ['React', 'Angular', 'Vue', 'Node.js', 'Express'],
    Python: ['Django', 'Flask', 'FastAPI', 'PyTorch'],
    Java: ['Spring', 'Hibernate', 'Kafka'],
    Go: ['Gin', 'Echo', 'Fiber'],
    Rust: ['Actix', 'Rocket', 'Tokio'],
    JavaScript: ['Express', 'Next.js', 'Nest.js']
  }
};

interface TestResult {
  context: RepositoryContext;
  role: string;
  primary: string;
  fallback: string;
  primaryScore: number;
  estimatedCost: number;
  reasoning: string[];
  replacedOutdated?: boolean;
  oldModel?: string;
}

/**
 * Generate test contexts covering various combinations
 */
function generateTestContexts(): RepositoryContext[] {
  const contexts: RepositoryContext[] = [];
  
  // Generate comprehensive test matrix
  for (const size of CONTEXT_VARIATIONS.sizes) {
    for (const language of CONTEXT_VARIATIONS.languages) {
      for (const complexity of CONTEXT_VARIATIONS.complexities) {
        for (const depth of CONTEXT_VARIATIONS.analysisDepths) {
          // Skip some combinations to keep test reasonable
          if (
            (size === 'small' && complexity > 5) ||
            (size === 'enterprise' && complexity < 5) ||
            (depth === 'quick' && size === 'enterprise') ||
            (depth === 'comprehensive' && size === 'small')
          ) {
            continue;
          }
          
          const frameworks = (CONTEXT_VARIATIONS.frameworks as any)[language] || [];
          const fileCount = size === 'small' ? 50 : 
                           size === 'medium' ? 500 : 
                           size === 'large' ? 5000 : 50000;
          const totalLines = fileCount * 50;
          
          contexts.push({
            url: `https://github.com/test/${language.toLowerCase()}-${size}-project`,
            size,
            primaryLanguage: language,
            languages: [language, ...frameworks.length > 0 ? ['JavaScript'] : []],
            frameworks: frameworks.slice(0, 2),
            fileCount,
            totalLines,
            complexity,
            analysisDepth: depth
          });
        }
      }
    }
  }
  
  // Add PR context variations
  contexts.push({
    url: 'https://github.com/test/pr-small-changes',
    size: 'large',
    primaryLanguage: 'TypeScript',
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['React'],
    fileCount: 5000,
    totalLines: 250000,
    complexity: 7,
    analysisDepth: 'standard',
    prContext: {
      changedFiles: 3,
      additions: 50,
      deletions: 20
    }
  });
  
  contexts.push({
    url: 'https://github.com/test/pr-large-refactor',
    size: 'enterprise',
    primaryLanguage: 'Java',
    languages: ['Java', 'Kotlin'],
    frameworks: ['Spring', 'Hibernate'],
    fileCount: 20000,
    totalLines: 1000000,
    complexity: 9,
    analysisDepth: 'comprehensive',
    prContext: {
      changedFiles: 150,
      additions: 5000,
      deletions: 3000
    }
  });
  
  return contexts;
}

/**
 * Fetch real models from OpenRouter
 */
async function fetchOpenRouterModels() {
  if (!OPENROUTER_API_KEY) {
    logger.warn('No OpenRouter API key, using mock data');
    return getMockModels();
  }
  
  try {
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://codequal.com',
        'X-Title': 'CodeQual Comprehensive Test'
      }
    });
    
    return response.data.data || [];
  } catch (error) {
    logger.error('Failed to fetch OpenRouter models', { error });
    return getMockModels();
  }
}

/**
 * Get mock models for testing without API
 */
function getMockModels() {
  return [
    // Current models
    { id: 'openai/gpt-4o', pricing: { prompt: '0.005', completion: '0.015' }, context_length: 128000 },
    { id: 'google/gemini-2.0-flash-lite', pricing: { prompt: '0.00019', completion: '0.00057' }, context_length: 1000000 },
    { id: 'anthropic/claude-3.5-sonnet', pricing: { prompt: '0.003', completion: '0.015' }, context_length: 200000 },
    { id: 'openai/gpt-4o-mini', pricing: { prompt: '0.00015', completion: '0.0006' }, context_length: 128000 },
    
    // Outdated models (should be replaced)
    { id: 'openai/gpt-4-1106-preview', pricing: { prompt: '0.01', completion: '0.03' }, context_length: 128000 },
    { id: 'anthropic/claude-2.1', pricing: { prompt: '0.008', completion: '0.024' }, context_length: 100000 },
    { id: 'google/palm-2-codechat-bison', pricing: { prompt: '0.001', completion: '0.002' }, context_length: 8192 },
    
    // New models
    { id: 'openai/gpt-4.5-turbo', pricing: { prompt: '0.01', completion: '0.03' }, context_length: 128000 },
    { id: 'anthropic/claude-3.7-sonnet', pricing: { prompt: '0.003', completion: '0.015' }, context_length: 200000 },
    { id: 'google/gemini-2.5-pro', pricing: { prompt: '0.00025', completion: '0.00075' }, context_length: 2000000 }
  ];
}

/**
 * Create mock ModelVersionSync
 */
function createMockModelVersionSync(models: any[]): ModelVersionSync {
  const processedModels = models
    .filter(m => {
      const id = m.id.toLowerCase();
      return !id.includes('embed') && 
             !id.includes('vision') && 
             !id.includes('sonar') && 
             m.pricing &&
             (parseFloat(m.pricing.prompt) > 0 || parseFloat(m.pricing.completion) > 0);
    })
    .map(m => ({
      provider: m.id.split('/')[0],
      model: m.id.split('/').slice(1).join('/'),
      versionId: 'latest',
      pricing: {
        input: parseFloat(m.pricing.prompt),
        output: parseFloat(m.pricing.completion)
      },
      capabilities: {
        codeQuality: inferQuality(m.id),
        speed: inferSpeed(m.id),
        contextWindow: m.context_length || 128000,
        reasoning: inferQuality(m.id) * 0.95
      },
      deprecated: isOutdated(m.id)
    }));

  return {
    getModelsForProvider: (provider: string) => 
      processedModels.filter(m => m.provider === provider),
    getModelVersionInfo: () => processedModels[0],
    getLatestVersion: () => 'latest',
    isVersionSupported: () => true
  } as any;
}

/**
 * Check if model is outdated
 */
function isOutdated(modelId: string): boolean {
  const outdated = [
    'gpt-4-1106-preview',
    'claude-2.1',
    'palm-2',
    'gpt-3.5-turbo-0301',
    'claude-instant-1.1'
  ];
  
  return outdated.some(old => modelId.includes(old));
}

/**
 * Infer quality score
 */
function inferQuality(modelId: string): number {
  const id = modelId.toLowerCase();
  if (id.includes('gpt-4.5')) return 9.7;
  if (id.includes('opus') || id.includes('claude-3.7')) return 9.5;
  if (id.includes('gpt-4o') && !id.includes('mini')) return 8.8;
  if (id.includes('claude-3.5')) return 8.9;
  if (id.includes('gemini') && id.includes('2.5')) return 8.7;
  if (id.includes('gemini') && id.includes('2.0')) return 8.5;
  if (id.includes('gpt-4o-mini')) return 7.9;
  if (id.includes('claude-2')) return 7.5; // Outdated
  if (id.includes('palm')) return 7.0; // Outdated
  return 7.0;
}

/**
 * Infer speed score
 */
function inferSpeed(modelId: string): number {
  const id = modelId.toLowerCase();
  if (id.includes('flash') || id.includes('mini')) return 9.0;
  if (id.includes('sonnet')) return 7.5;
  if (id.includes('opus')) return 5.0;
  if (id.includes('turbo')) return 8.0;
  return 7.0;
}

/**
 * Test unified selector with comprehensive contexts
 */
async function testComprehensiveSelection() {
  console.log('🚀 Comprehensive Unified Model Selector Test\n');
  console.log('================================================================================');
  
  // Fetch models
  console.log('📡 Fetching available models...');
  const models = await fetchOpenRouterModels();
  console.log(`Found ${models.length} models\n`);
  
  // Create selector
  const modelVersionSync = createMockModelVersionSync(models);
  const selector = createUnifiedModelSelector(modelVersionSync);
  
  // Generate test contexts
  const contexts = generateTestContexts();
  console.log(`Generated ${contexts.length} test contexts\n`);
  
  // Test all combinations
  const results: TestResult[] = [];
  const roles = Object.keys(ROLE_SCORING_PROFILES) as Array<keyof typeof ROLE_SCORING_PROFILES>;
  
  // Sample 10 interesting combinations
  const sampleIndices = [0, 5, 10, 15, 20, 25, 30, 35, 40, contexts.length - 1];
  const sampleContexts = sampleIndices
    .filter(i => i < contexts.length)
    .map(i => contexts[i]);
  
  console.log('🧪 Testing sample configurations...\n');
  
  for (const [idx, context] of sampleContexts.entries()) {
    console.log(`\n📦 Sample ${idx + 1}: ${context.primaryLanguage} ${context.size} project`);
    console.log(`   Complexity: ${context.complexity}/10, Analysis: ${context.analysisDepth}`);
    if (context.prContext) {
      console.log(`   PR: ${context.prContext.changedFiles} files, +${context.prContext.additions}/-${context.prContext.deletions}`);
    }
    
    // Test critical roles for each context
    const criticalRoles = ['deepwiki', 'researcher', 'security', 'architecture'];
    
    for (const role of criticalRoles) {
      try {
        const result = await selector.selectModel(role as any, context);
        
        const testResult: TestResult = {
          context,
          role,
          primary: `${result.primary.provider}/${result.primary.model}`,
          fallback: `${result.fallback.provider}/${result.fallback.model}`,
          primaryScore: result.scores.primary.compositeScore,
          estimatedCost: result.estimatedCost || 0,
          reasoning: result.reasoning,
          replacedOutdated: false
        };
        
        // Check if it replaced an outdated model
        if (isOutdated(testResult.primary)) {
          testResult.replacedOutdated = true;
          testResult.oldModel = testResult.primary;
        }
        
        results.push(testResult);
        
        console.log(`   ${role}: ${testResult.primary} ($${testResult.estimatedCost.toFixed(4)})`);
        if (testResult.replacedOutdated) {
          console.log(`      ⚠️  Selected outdated model!`);
        }
        
      } catch (error) {
        console.error(`   ${role}: ❌ Failed - ${error instanceof Error ? error.message : error}`);
      }
    }
  }
  
  // Summary statistics
  console.log('\n================================================================================');
  console.log('📊 SUMMARY STATISTICS');
  console.log('================================================================================\n');
  
  // Model usage frequency
  const modelUsage = new Map<string, number>();
  results.forEach(r => {
    modelUsage.set(r.primary, (modelUsage.get(r.primary) || 0) + 1);
  });
  
  console.log('🏆 Most frequently selected models:');
  const sortedModels = Array.from(modelUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  sortedModels.forEach(([model, count]) => {
    const percentage = (count / results.length * 100).toFixed(1);
    console.log(`   ${model}: ${count} times (${percentage}%)`);
  });
  
  // Cost analysis
  const costs = results.map(r => r.estimatedCost);
  const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  
  console.log('\n💰 Cost Analysis:');
  console.log(`   Average: $${avgCost.toFixed(4)}`);
  console.log(`   Range: $${minCost.toFixed(4)} - $${maxCost.toFixed(4)}`);
  
  // Outdated models
  const outdatedSelections = results.filter(r => r.replacedOutdated);
  if (outdatedSelections.length > 0) {
    console.log('\n⚠️  Outdated models still being selected:');
    outdatedSelections.forEach(r => {
      console.log(`   ${r.oldModel} for ${r.role} (${r.context.size} ${r.context.primaryLanguage})`);
    });
  } else {
    console.log('\n✅ No outdated models selected!');
  }
  
  // Role-specific insights
  console.log('\n🎯 Role-specific insights:');
  const criticalRoles = ['deepwiki', 'researcher', 'security', 'architecture'];
  for (const role of criticalRoles) {
    const roleResults = results.filter(r => r.role === role);
    const roleModels = new Set(roleResults.map(r => r.primary));
    console.log(`   ${role}: Uses ${roleModels.size} different models`);
  }
  
  // Sample detailed results
  console.log('\n================================================================================');
  console.log('📋 DETAILED SAMPLE RESULTS (5 examples)');
  console.log('================================================================================\n');
  
  const detailedSamples = results.slice(0, 5);
  detailedSamples.forEach((result, idx) => {
    console.log(`Sample ${idx + 1}:`);
    console.log(`  Context: ${result.context.size} ${result.context.primaryLanguage} project`);
    console.log(`  Role: ${result.role}`);
    console.log(`  Primary: ${result.primary} (score: ${result.primaryScore.toFixed(2)})`);
    console.log(`  Fallback: ${result.fallback}`);
    console.log(`  Cost: $${result.estimatedCost.toFixed(4)}`);
    console.log(`  Reasoning: ${result.reasoning[0]}`);
    console.log('');
  });
  
  // API Integration Test
  if (API_BASE_URL && JWT_TOKEN) {
    console.log('\n================================================================================');
    console.log('🔌 API INTEGRATION TEST');
    console.log('================================================================================\n');
    
    try {
      // Test researcher endpoint
      const response = await axios.post(
        `${API_BASE_URL}/api/researcher/research`,
        {
          trigger: 'comprehensive',
          source: 'unified-selector-test'
        },
        {
          headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Researcher API responded successfully');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Configurations: ${response.data.configurationsUpdated || 0}`);
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log('❌ API test failed:', error.response?.data?.error || error.message);
      } else {
        console.log('❌ API test failed:', error);
      }
    }
  }
  
  console.log('\n✨ Comprehensive test completed!\n');
  
  return results;
}

// Run the test
if (require.main === module) {
  testComprehensiveSelection().catch(console.error);
}