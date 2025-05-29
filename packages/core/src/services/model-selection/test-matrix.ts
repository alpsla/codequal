/**
 * Test script for Dynamic Model Configuration Matrix
 * 
 * This script tests the ModelConfigurationMatrixService and MatrixBasedOrchestrator
 * to ensure they work correctly with the database schema.
 */

import { ModelConfigurationMatrixService, AnalysisParameters } from './ModelConfigurationMatrix';
import { MatrixBasedOrchestrator, AnalysisContext } from './MatrixBasedOrchestrator';
import { Logger } from '../../utils/logger';

// Mock logger for testing
const mockLogger: Logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.log(`[DEBUG] ${message}`, meta || '')
};

async function testModelConfigurationMatrix(): Promise<void> {
  try {
    console.log('🧪 Testing Dynamic Model Configuration Matrix...\n');

    // Initialize service
    const matrixService = new ModelConfigurationMatrixService(
      mockLogger,
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    );

    console.log('1. Initializing ModelConfigurationMatrixService...');
    await matrixService.init();
    console.log('✅ Service initialized successfully\n');

    // Test configuration lookup
    console.log('2. Testing configuration lookup...');
    const testParams: AnalysisParameters = {
      speed: 'fast',
      complexity: 'simple',
      language: 'javascript',
      repoSize: 'small',
      costSensitivity: 'high',
      qualityRequirement: 'basic',
      analysisType: 'pr_review'
    };

    const config = await matrixService.getConfiguration(testParams);
    if (config) {
      console.log('✅ Configuration found:', {
        configId: config.configId,
        model: `${config.modelConfig.provider}/${config.modelConfig.model}`,
        expectedTime: config.expectedMetrics.avgResponseTimeMs,
        cost: config.expectedMetrics.costPer1kTokens
      });
    } else {
      console.log('⚠️  No configuration found, will generate on-demand');
    }
    console.log();

    // Test language characteristics
    console.log('3. Testing language characteristics...');
    const langChar = await matrixService.getLanguageCharacteristics('javascript');
    if (langChar) {
      console.log('✅ Language characteristics found:', {
        language: langChar.language,
        group: langChar.groupName,
        isWeb: langChar.isWebLanguage,
        reasoning: langChar.reasoningBenefit
      });
    } else {
      console.log('⚠️  Language characteristics not found');
    }
    console.log();

    // Test matrix statistics
    console.log('4. Testing matrix statistics...');
    try {
      const stats = await matrixService.getMatrixStats();
      console.log('✅ Matrix statistics:', {
        totalConfigs: stats.totalConfigurations,
        languageCount: Object.keys(stats.configurationsByLanguage).length,
        topLanguages: Object.entries(stats.configurationsByLanguage)
          .slice(0, 3)
          .map(([lang, count]) => `${lang}: ${count}`)
      });
    } catch (error) {
      console.log('⚠️  Matrix statistics not available (expected for new setup)');
    }
    console.log();

    // Test orchestrator
    console.log('5. Testing MatrixBasedOrchestrator...');
    const orchestrator = new MatrixBasedOrchestrator(matrixService, mockLogger);

    const testContext: AnalysisContext = {
      repositoryId: 'test-repo',
      primaryLanguage: 'typescript',
      totalFiles: 25,
      totalLines: 2500,
      analysisType: 'pr_review',
      fileCount: 3,
      userTier: 'pro',
      timeoutPreference: 'fast'
    };

    const selection = await orchestrator.selectModelForAnalysis(testContext);
    console.log('✅ Model selection completed:', {
      configId: selection.configId,
      model: `${selection.selectedConfig.provider}/${selection.selectedConfig.model}`,
      estimatedCost: selection.estimatedCost,
      estimatedTime: selection.estimatedTimeMs,
      reasoning: selection.reasoning
    });
    console.log();

    // Test usage tracking
    console.log('6. Testing usage tracking...');
    await matrixService.updateUsageStats(selection.configId, true, 1200);
    console.log('✅ Usage statistics updated');
    console.log();

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Test different scenarios
async function testMultipleScenarios(): Promise<void> {
  console.log('\n🔄 Testing multiple analysis scenarios...\n');

  const matrixService = new ModelConfigurationMatrixService(
    mockLogger,
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
  );

  await matrixService.init();
  const orchestrator = new MatrixBasedOrchestrator(matrixService, mockLogger);

  const scenarios: Array<{ name: string; context: AnalysisContext }> = [
    {
      name: 'Small Python PR Review',
      context: {
        primaryLanguage: 'python',
        totalFiles: 5,
        totalLines: 500,
        analysisType: 'pr_review',
        fileCount: 2,
        userTier: 'free',
        timeoutPreference: 'fast'
      }
    },
    {
      name: 'Large Enterprise Security Scan',
      context: {
        primaryLanguage: 'java',
        totalFiles: 500,
        totalLines: 50000,
        analysisType: 'security',
        fileCount: 25,
        userTier: 'enterprise',
        qualityRequirement: 'perfect',
        requiresSecurityScan: true
      }
    },
    {
      name: 'Architecture Analysis for Rust',
      context: {
        primaryLanguage: 'rust',
        totalFiles: 50,
        totalLines: 8000,
        analysisType: 'architecture',
        fileCount: 12,
        userTier: 'pro',
        requiresArchitecturalAnalysis: true,
        timeoutPreference: 'thorough'
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`📊 Scenario: ${scenario.name}`);
    try {
      const selection = await orchestrator.selectModelForAnalysis(scenario.context);
      console.log(`   Selected: ${selection.selectedConfig.provider}/${selection.selectedConfig.model}`);
      console.log(`   Cost: $${selection.estimatedCost.toFixed(4)}, Time: ${selection.estimatedTimeMs}ms`);
      console.log(`   Reasoning: ${selection.reasoning.substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ Failed: ${error}`);
    }
    console.log();
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    await testModelConfigurationMatrix();
    await testMultipleScenarios();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { testModelConfigurationMatrix, testMultipleScenarios };