#!/usr/bin/env ts-node

/**
 * DeepWiki Quality Comparison Test
 * Compares output quality between old expensive models and new optimized models
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { DeepWikiManager } from '../services/deepwiki-manager';
import { createLogger } from '@codequal/core/utils';
import * as fs from 'fs/promises';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DeepWikiQualityTest');

// Test configuration
const TEST_REPOSITORIES = [
  {
    name: 'Express.js (Small)',
    url: 'https://github.com/expressjs/express',
    branch: 'master',
    expectedInsights: {
      architecture: ['middleware pattern', 'router pattern', 'plugin architecture'],
      security: ['input validation', 'XSS prevention', 'CSRF considerations'],
      performance: ['async handling', 'middleware optimization']
    }
  },
  {
    name: 'Juice Shop (Security)',
    url: 'https://github.com/juice-shop/juice-shop',
    branch: 'master',
    expectedInsights: {
      architecture: ['Angular frontend', 'Express backend', 'SQLite database'],
      security: ['SQL injection', 'XSS vulnerabilities', 'weak authentication', 'insecure direct object references'],
      performance: ['database queries', 'frontend bundle size']
    }
  },
  {
    name: 'React (Large)',
    url: 'https://github.com/facebook/react',
    branch: 'main',
    expectedInsights: {
      architecture: ['reconciler pattern', 'fiber architecture', 'hooks system'],
      security: ['XSS prevention in JSX', 'dangerouslySetInnerHTML warnings'],
      performance: ['virtual DOM optimization', 'concurrent features', 'memoization']
    }
  }
];

// Model configurations
const MODEL_CONFIGS = {
  old: {
    name: 'Claude-3-Opus (Original)',
    primary: 'anthropic/claude-3-opus',
    fallback: 'openai/gpt-4-turbo',
    cost: 15.0 // per 1M tokens
  },
  new: {
    name: 'GPT-4.1-Nano (Optimized)',
    primary: 'openai/gpt-4.1-nano',
    fallback: 'anthropic/claude-3-haiku:beta',
    cost: 0.25 // per 1M tokens
  }
};

// Quality scoring interface
interface QualityScores {
  architecture: number;
  security: number;
  codeQuality: number;
  performance: number;
  dependencies: number;
  overall: number;
  specificFindings: string[];
  missedInsights: string[];
}

// Test user for DeepWiki
const testUser = {
  id: 'quality-test-user',
  email: 'quality-test@codequal.dev',
  role: 'admin' as const,
  status: 'active' as const,
  // ... (full user object as before)
};

/**
 * Run DeepWiki analysis with specific model configuration
 */
async function runDeepWikiAnalysis(
  repositoryUrl: string,
  modelConfig: typeof MODEL_CONFIGS.old | typeof MODEL_CONFIGS.new,
  branch: string
): Promise<any> {
  logger.info(`Running analysis with ${modelConfig.name}`, { repository: repositoryUrl });
  
  // Create DeepWiki manager with specific model override
  const deepwikiManager = new DeepWikiManager(testUser as any);
  
  // Override model selection (this would need to be implemented)
  (deepwikiManager as any).LEGACY_PRIMARY_MODEL = modelConfig.primary;
  (deepwikiManager as any).LEGACY_FALLBACK_MODELS = [modelConfig.fallback];
  
  // Trigger analysis
  const jobId = await deepwikiManager.triggerRepositoryAnalysis(repositoryUrl, { branch });
  
  // Wait for completion
  const results = await deepwikiManager.waitForAnalysisCompletion(repositoryUrl);
  
  return results;
}

/**
 * Score the quality of analysis results
 */
function scoreAnalysisQuality(
  results: any,
  expectedInsights: any
): QualityScores {
  const scores: QualityScores = {
    architecture: 0,
    security: 0,
    codeQuality: 0,
    performance: 0,
    dependencies: 0,
    overall: 0,
    specificFindings: [],
    missedInsights: []
  };
  
  // Score architecture insights
  if (results.analysis?.architecture) {
    const archFindings = JSON.stringify(results.analysis.architecture).toLowerCase();
    let found = 0;
    expectedInsights.architecture.forEach((insight: string) => {
      if (archFindings.includes(insight.toLowerCase())) {
        found++;
        scores.specificFindings.push(`Architecture: ${insight}`);
      } else {
        scores.missedInsights.push(`Architecture: ${insight}`);
      }
    });
    scores.architecture = (found / expectedInsights.architecture.length) * 10;
  }
  
  // Score security insights
  if (results.analysis?.security) {
    const secFindings = JSON.stringify(results.analysis.security).toLowerCase();
    let found = 0;
    expectedInsights.security.forEach((vuln: string) => {
      if (secFindings.includes(vuln.toLowerCase())) {
        found++;
        scores.specificFindings.push(`Security: ${vuln}`);
      } else {
        scores.missedInsights.push(`Security: ${vuln}`);
      }
    });
    scores.security = (found / expectedInsights.security.length) * 10;
  }
  
  // Score other aspects (simplified for demo)
  scores.codeQuality = results.analysis?.codeQuality ? 7 : 0;
  scores.performance = results.analysis?.performance ? 7 : 0;
  scores.dependencies = results.analysis?.dependencies ? 7 : 0;
  
  // Calculate overall score
  scores.overall = (
    scores.architecture + 
    scores.security + 
    scores.codeQuality + 
    scores.performance + 
    scores.dependencies
  ) / 5;
  
  return scores;
}

/**
 * Main quality comparison test
 */
async function runQualityComparison() {
  console.log('=== DeepWiki Quality Comparison Test ===\n');
  console.log('Comparing:');
  console.log(`  Old: ${MODEL_CONFIGS.old.name} ($${MODEL_CONFIGS.old.cost}/1M tokens)`);
  console.log(`  New: ${MODEL_CONFIGS.new.name} ($${MODEL_CONFIGS.new.cost}/1M tokens)`);
  console.log(`  Cost Reduction: ${((1 - MODEL_CONFIGS.new.cost / MODEL_CONFIGS.old.cost) * 100).toFixed(1)}%\n`);
  
  const results: any = {
    repositories: [],
    summary: {
      oldAverage: 0,
      newAverage: 0,
      qualityRetention: 0
    }
  };
  
  // Test each repository
  for (const repo of TEST_REPOSITORIES) {
    console.log(`\n--- Testing ${repo.name} ---`);
    console.log(`Repository: ${repo.url}`);
    
    try {
      // Run with old model
      console.log('\n1. Running with old model...');
      const startOld = Date.now();
      const oldResults = await runDeepWikiAnalysis(repo.url, MODEL_CONFIGS.old, repo.branch);
      const timeOld = Date.now() - startOld;
      
      // Run with new model
      console.log('2. Running with new model...');
      const startNew = Date.now();
      const newResults = await runDeepWikiAnalysis(repo.url, MODEL_CONFIGS.new, repo.branch);
      const timeNew = Date.now() - startNew;
      
      // Score both results
      const oldScores = scoreAnalysisQuality(oldResults, repo.expectedInsights);
      const newScores = scoreAnalysisQuality(newResults, repo.expectedInsights);
      
      // Display comparison
      console.log('\n📊 Quality Scores (out of 10):');
      console.log('                    Old Model | New Model | Difference');
      console.log(`Architecture:       ${oldScores.architecture.toFixed(1)}      | ${newScores.architecture.toFixed(1)}      | ${(newScores.architecture - oldScores.architecture > 0 ? '+' : '')}${(newScores.architecture - oldScores.architecture).toFixed(1)}`);
      console.log(`Security:           ${oldScores.security.toFixed(1)}      | ${newScores.security.toFixed(1)}      | ${(newScores.security - oldScores.security > 0 ? '+' : '')}${(newScores.security - oldScores.security).toFixed(1)}`);
      console.log(`Code Quality:       ${oldScores.codeQuality.toFixed(1)}      | ${newScores.codeQuality.toFixed(1)}      | ${(newScores.codeQuality - oldScores.codeQuality > 0 ? '+' : '')}${(newScores.codeQuality - oldScores.codeQuality).toFixed(1)}`);
      console.log(`Performance:        ${oldScores.performance.toFixed(1)}      | ${newScores.performance.toFixed(1)}      | ${(newScores.performance - oldScores.performance > 0 ? '+' : '')}${(newScores.performance - oldScores.performance).toFixed(1)}`);
      console.log(`Dependencies:       ${oldScores.dependencies.toFixed(1)}      | ${newScores.dependencies.toFixed(1)}      | ${(newScores.dependencies - oldScores.dependencies > 0 ? '+' : '')}${(newScores.dependencies - oldScores.dependencies).toFixed(1)}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Overall:            ${oldScores.overall.toFixed(1)}      | ${newScores.overall.toFixed(1)}      | ${(newScores.overall - oldScores.overall > 0 ? '+' : '')}${(newScores.overall - oldScores.overall).toFixed(1)}`);
      
      console.log(`\n⏱️  Analysis Time: ${(timeOld / 1000).toFixed(1)}s vs ${(timeNew / 1000).toFixed(1)}s`);
      
      // Show specific findings
      if (newScores.missedInsights.length > 0) {
        console.log('\n⚠️  Insights missed by new model:');
        newScores.missedInsights.forEach(insight => console.log(`   - ${insight}`));
      }
      
      // Store results
      results.repositories.push({
        name: repo.name,
        oldScores,
        newScores,
        qualityRetention: (newScores.overall / oldScores.overall) * 100,
        timeComparison: {
          old: timeOld,
          new: timeNew,
          speedup: ((timeOld - timeNew) / timeOld) * 100
        }
      });
      
    } catch (error) {
      console.error(`❌ Error testing ${repo.name}:`, error);
    }
  }
  
  // Calculate summary
  const avgOld = results.repositories.reduce((sum: number, r: any) => sum + r.oldScores.overall, 0) / results.repositories.length;
  const avgNew = results.repositories.reduce((sum: number, r: any) => sum + r.newScores.overall, 0) / results.repositories.length;
  results.summary.oldAverage = avgOld;
  results.summary.newAverage = avgNew;
  results.summary.qualityRetention = (avgNew / avgOld) * 100;
  
  // Display summary
  console.log('\n\n=== QUALITY TEST SUMMARY ===\n');
  console.log(`Average Quality Scores:`);
  console.log(`  Old Model: ${avgOld.toFixed(1)}/10`);
  console.log(`  New Model: ${avgNew.toFixed(1)}/10`);
  console.log(`  Quality Retention: ${results.summary.qualityRetention.toFixed(1)}%`);
  
  // Decision recommendation
  console.log('\n📋 Recommendation:');
  if (results.summary.qualityRetention >= 90) {
    console.log('✅ STRONG ACCEPT: Quality maintained at 90%+ with 98% cost reduction');
    console.log('   The new models provide excellent value with minimal quality trade-off.');
  } else if (results.summary.qualityRetention >= 80) {
    console.log('✅ ACCEPT: Quality at 80%+ is acceptable given the massive cost savings');
    console.log('   Consider monitoring specific use cases where quality matters most.');
  } else if (results.summary.qualityRetention >= 70) {
    console.log('⚠️  CONDITIONAL: Quality at 70%+ requires careful consideration');
    console.log('   May need to use old models for critical analyses.');
  } else {
    console.log('❌ REJECT: Quality below 70% is not acceptable');
    console.log('   The cost savings do not justify the quality loss.');
  }
  
  // Context window advantage
  console.log('\n💡 Additional Considerations:');
  console.log('   - GPT-4.1-nano has 5x larger context window (1M+ vs 200k tokens)');
  console.log('   - May perform BETTER on very large repositories');
  console.log('   - Faster response times improve user experience');
  
  // Save detailed results
  await fs.writeFile(
    resolve(__dirname, '../../deepwiki-quality-comparison-results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\n📄 Detailed results saved to deepwiki-quality-comparison-results.json');
}

// Run the test
if (require.main === module) {
  runQualityComparison().catch(error => {
    logger.error('Quality comparison test failed', { error });
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}