/**
 * E2E Performance Test for On-Demand Researcher Requests
 * 
 * This test measures the performance impact when the orchestrator triggers
 * on-demand researcher requests for missing configurations.
 */

import axios from 'axios';
import { config } from 'dotenv';
import { createLogger } from '@codequal/core/utils';
import { VectorStorageService } from '@codequal/database';

// Load environment variables
config({ path: '../../.env' });

const logger = createLogger('ResearcherOnDemandPerformance');
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

interface PerformanceMetrics {
  // Overall metrics
  totalAnalysisTime: number;
  analysisWithCachedConfig: number;
  analysisWithOnDemandResearch: number;
  performanceOverhead: number;
  overheadPercentage: number;
  
  // Detailed breakdown
  configCheckTime: number;
  researchTriggerTime: number;
  modelSelectionTime: number;
  modelStorageTime: number;
  agentInitTime: number;
  
  // Research specific
  openRouterApiTime: number;
  aiModelEvaluationTime: number;
  vectorDbWriteTime: number;
  
  // User impact
  userPerceivedDelay: number;
  acceptableForUsers: boolean;
}

interface TestScenario {
  name: string;
  role: string;
  language: string;
  complexity: string;
  expectedToExist: boolean;
}

class ResearcherPerformanceTest {
  private vectorStorage: VectorStorageService;
  private userToken: string;
  private metrics: PerformanceMetrics = {
    totalAnalysisTime: 0,
    analysisWithCachedConfig: 0,
    analysisWithOnDemandResearch: 0,
    performanceOverhead: 0,
    overheadPercentage: 0,
    configCheckTime: 0,
    researchTriggerTime: 0,
    modelSelectionTime: 0,
    modelStorageTime: 0,
    agentInitTime: 0,
    openRouterApiTime: 0,
    aiModelEvaluationTime: 0,
    vectorDbWriteTime: 0,
    userPerceivedDelay: 0,
    acceptableForUsers: false
  };

  constructor(userToken: string) {
    this.userToken = userToken;
    this.vectorStorage = new VectorStorageService();
  }

  /**
   * Run performance comparison tests
   */
  async runPerformanceTests(): Promise<PerformanceMetrics> {
    logger.info('🚀 Starting On-Demand Researcher Performance Tests');

    try {
      // Test 1: Baseline with cached configuration
      logger.info('Test 1: Baseline with cached configuration');
      const cachedTime = await this.measureCachedConfigAnalysis();
      
      // Test 2: On-demand research for new configuration
      logger.info('Test 2: On-demand research scenario');
      const onDemandTime = await this.measureOnDemandResearchAnalysis();
      
      // Calculate overhead
      this.metrics.performanceOverhead = onDemandTime - cachedTime;
      this.metrics.overheadPercentage = (this.metrics.performanceOverhead / cachedTime) * 100;
      
      // Determine if acceptable (< 30 seconds overhead)
      this.metrics.acceptableForUsers = this.metrics.performanceOverhead < 30000;
      
      this.logPerformanceSummary();
      
    } catch (error) {
      logger.error('Performance test failed', { error });
    }

    return this.metrics;
  }

  /**
   * Measure analysis time with cached configuration
   */
  private async measureCachedConfigAnalysis(): Promise<number> {
    const startTime = Date.now();
    
    // Use common configuration that should exist
    const commonContext = {
      repositoryUrl: 'https://github.com/facebook/react',
      prNumber: 1,
      mode: 'comprehensive'
    };

    const response = await this.triggerAnalysisWithTiming(commonContext);
    await this.waitForCompletion(response.analysisId);
    
    const totalTime = Date.now() - startTime;
    this.metrics.analysisWithCachedConfig = totalTime;
    
    logger.info('Cached config analysis completed', { 
      time: `${totalTime}ms`,
      minutes: `${(totalTime / 60000).toFixed(2)}min`
    });
    
    return totalTime;
  }

  /**
   * Measure analysis time with on-demand research
   */
  private async measureOnDemandResearchAnalysis(): Promise<number> {
    const startTime = Date.now();
    const timestamps: Record<string, number> = {};
    
    // Use uncommon configuration to trigger research
    const uncommonContext = {
      repositoryUrl: 'https://github.com/elixir-lang/elixir', // Elixir repo
      prNumber: 1,
      mode: 'comprehensive',
      metadata: {
        forceLanguage: 'elixir',
        forceComplexity: 'extra_large'
      }
    };

    // Track config check time
    timestamps.configCheckStart = Date.now();
    const configExists = await this.checkConfigExists('security', 'elixir', 'extra_large');
    timestamps.configCheckEnd = Date.now();
    this.metrics.configCheckTime = timestamps.configCheckEnd - timestamps.configCheckStart;

    if (!configExists) {
      logger.info('Config does not exist, researcher should be triggered');
    }

    // Trigger analysis
    timestamps.analysisStart = Date.now();
    const response = await this.triggerAnalysisWithTiming(uncommonContext);
    
    // Monitor for researcher activation
    await this.monitorWithDetailedTiming(response.analysisId, timestamps);
    
    const totalTime = Date.now() - startTime;
    this.metrics.analysisWithOnDemandResearch = totalTime;
    this.metrics.totalAnalysisTime = totalTime;
    
    logger.info('On-demand research analysis completed', { 
      time: `${totalTime}ms`,
      minutes: `${(totalTime / 60000).toFixed(2)}min`
    });
    
    return totalTime;
  }

  /**
   * Monitor analysis with detailed timing capture
   */
  private async monitorWithDetailedTiming(
    analysisId: string, 
    timestamps: Record<string, number>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let researcherDetected = false;
      let lastPhase = '';
      
      const checkInterval = setInterval(async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/analysis/${analysisId}/progress`,
            {
              headers: { 'Authorization': `Bearer ${this.userToken}` }
            }
          );

          const { status, phase, details } = response.data;
          
          // Detect phase changes
          if (phase !== lastPhase) {
            logger.info(`Phase change: ${lastPhase} -> ${phase}`);
            timestamps[`${phase}Start`] = Date.now();
            
            if (lastPhase) {
              timestamps[`${lastPhase}End`] = Date.now();
            }
            lastPhase = phase;
          }

          // Detect researcher activation
          if (!researcherDetected && (
            phase?.includes('researcher') || 
            phase?.includes('model_research') ||
            details?.includes('Finding model configuration')
          )) {
            researcherDetected = true;
            timestamps.researchStart = Date.now();
            this.metrics.researchTriggerTime = timestamps.researchStart - timestamps.analysisStart;
            logger.info('🔍 Researcher activated!', {
              triggerTime: `${this.metrics.researchTriggerTime}ms`
            });
          }

          // Capture specific events from details
          if (details?.includes('OpenRouter API')) {
            timestamps.openRouterStart = timestamps.openRouterStart || Date.now();
          }
          if (details?.includes('Model evaluation complete')) {
            timestamps.modelEvalEnd = Date.now();
          }
          if (details?.includes('Storing configuration')) {
            timestamps.storageStart = Date.now();
          }
          if (details?.includes('Configuration stored')) {
            timestamps.storageEnd = Date.now();
          }

          // Check completion
          if (status === 'completed' || status === 'failed') {
            clearInterval(checkInterval);
            
            // Calculate detailed metrics
            if (timestamps.researchStart && timestamps.storageEnd) {
              this.metrics.modelSelectionTime = timestamps.storageEnd - timestamps.researchStart;
            }
            if (timestamps.openRouterStart && timestamps.modelEvalEnd) {
              this.metrics.openRouterApiTime = timestamps.modelEvalEnd - timestamps.openRouterStart;
            }
            if (timestamps.storageStart && timestamps.storageEnd) {
              this.metrics.vectorDbWriteTime = timestamps.storageEnd - timestamps.storageStart;
            }
            
            // User perceived delay (from trigger to first agent starting)
            if (timestamps.agentInitStart) {
              this.metrics.userPerceivedDelay = timestamps.agentInitStart - timestamps.analysisStart;
            }
            
            resolve();
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 1000); // Check every second for detailed timing

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout monitoring analysis'));
      }, 600000);
    });
  }

  /**
   * Check if configuration exists
   */
  private async checkConfigExists(role: string, language: string, complexity: string): Promise<boolean> {
    try {
      const contextKey = `${role}_${language}_${complexity}`;
      // Use metadata search instead of similarity search
      const results = await this.vectorStorage.searchByMetadata(
        {
          repository_id: '00000000-0000-0000-0000-000000000001',
          'metadata.contextKey': contextKey,
          'metadata.type': 'model_configuration'
        },
        10
      );
      
      return results.length > 0;
    } catch (error) {
      logger.warn('Config check failed, assuming config does not exist', { error });
      return false;
    }
  }

  /**
   * Trigger analysis with timing
   */
  private async triggerAnalysisWithTiming(context: any): Promise<{ analysisId: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/analysis`,
      context,
      {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return { analysisId: response.data.analysisId };
  }

  /**
   * Wait for analysis completion
   */
  private async waitForCompletion(analysisId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/analysis/${analysisId}/status`,
            { headers: { 'Authorization': `Bearer ${this.userToken}` } }
          );

          if (response.data.status === 'completed') {
            clearInterval(checkInterval);
            resolve();
          } else if (response.data.status === 'failed') {
            clearInterval(checkInterval);
            reject(new Error('Analysis failed'));
          }
        } catch (error) {
          clearInterval(checkInterval);
          reject(error);
        }
      }, 5000);

      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Timeout'));
      }, 600000);
    });
  }

  /**
   * Log performance summary
   */
  private logPerformanceSummary(): void {
    console.log('\n📊 Performance Metrics Summary');
    console.log('================================');
    console.log(`Cached Config Analysis: ${(this.metrics.analysisWithCachedConfig / 1000).toFixed(2)}s`);
    console.log(`On-Demand Research Analysis: ${(this.metrics.analysisWithOnDemandResearch / 1000).toFixed(2)}s`);
    console.log(`\nPerformance Overhead: ${(this.metrics.performanceOverhead / 1000).toFixed(2)}s (${this.metrics.overheadPercentage.toFixed(1)}%)`);
    
    console.log('\n⏱️  Detailed Timing Breakdown:');
    console.log(`Config Check: ${this.metrics.configCheckTime}ms`);
    console.log(`Research Trigger: ${this.metrics.researchTriggerTime}ms`);
    console.log(`Model Selection: ${(this.metrics.modelSelectionTime / 1000).toFixed(2)}s`);
    console.log(`Vector DB Write: ${this.metrics.vectorDbWriteTime}ms`);
    
    console.log('\n👤 User Impact:');
    console.log(`Perceived Delay: ${(this.metrics.userPerceivedDelay / 1000).toFixed(2)}s`);
    console.log(`Acceptable (<30s): ${this.metrics.acceptableForUsers ? '✅ YES' : '❌ NO'}`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (this.metrics.performanceOverhead > 30000) {
      console.log('- Consider pre-warming cache for common language/complexity combinations');
      console.log('- Implement async research with placeholder models');
      console.log('- Add progress indicators for transparency');
    } else {
      console.log('- Performance is within acceptable range');
      console.log('- Monitor for edge cases with slower response times');
    }
  }
}

/**
 * Main test runner
 */
async function main() {
  const userToken = process.env.TEST_USER_TOKEN || '';
  
  if (!userToken) {
    logger.error('TEST_USER_TOKEN environment variable is required');
    process.exit(1);
  }

  const test = new ResearcherPerformanceTest(userToken);
  const metrics = await test.runPerformanceTests();
  
  // Save metrics to UI documentation
  const fs = require('fs').promises;
  const metricsPath = '/Users/alpinro/Code Prjects/codequal/docs/ui-preparation/e2e-testing-ui-insights.md';
  
  try {
    let content = await fs.readFile(metricsPath, 'utf-8');
    const performanceSection = `
### On-Demand Researcher Performance Metrics
**Test Date**: ${new Date().toISOString()}

| Metric | Value | Impact |
|--------|-------|--------|
| Cached Config Analysis | ${(metrics.analysisWithCachedConfig / 1000).toFixed(2)}s | Baseline |
| On-Demand Research Analysis | ${(metrics.analysisWithOnDemandResearch / 1000).toFixed(2)}s | With overhead |
| Performance Overhead | ${(metrics.performanceOverhead / 1000).toFixed(2)}s | ${metrics.overheadPercentage.toFixed(1)}% increase |
| User Perceived Delay | ${(metrics.userPerceivedDelay / 1000).toFixed(2)}s | Time to first result |
| Acceptable for Users | ${metrics.acceptableForUsers ? '✅' : '❌'} | <30s threshold |

**Breakdown**:
- Config Check: ${metrics.configCheckTime}ms
- Research Trigger: ${metrics.researchTriggerTime}ms  
- Model Selection: ${(metrics.modelSelectionTime / 1000).toFixed(2)}s
- Vector DB Write: ${metrics.vectorDbWriteTime}ms
`;
    
    // Update the performance section
    const marker = '### Analysis Timing Data';
    const insertIndex = content.indexOf(marker);
    if (insertIndex !== -1) {
      content = content.slice(0, insertIndex) + performanceSection + '\n' + content.slice(insertIndex);
      await fs.writeFile(metricsPath, content);
      logger.info('✅ Performance metrics saved to UI documentation');
    }
  } catch (error) {
    logger.error('Failed to update UI documentation', { error });
  }
}

if (require.main === module) {
  main().catch(error => {
    logger.error('Test execution failed', { error });
    process.exit(1);
  });
}

export { ResearcherPerformanceTest };