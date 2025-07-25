#!/usr/bin/env ts-node
/* eslint-disable no-console */
/**
 * Test DeepWiki Auto-Trigger Logic
 * 
 * This test verifies that:
 * 1. DeepWiki analysis is triggered when repository doesn't exist in Vector DB
 * 2. DeepWiki analysis is triggered when existing analysis is outdated
 * 3. Fresh analysis is not re-triggered unnecessarily
 */

import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
// DeepWiki manager is now simplified and doesn't need importing for tests
import { createLogger } from '../../../../packages/core/src/utils/logger';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const _logger = createLogger('DeepWikiTriggerTest');

interface TestScenario {
  name: string;
  repositoryUrl: string;
  mockExistingAnalysis: boolean;
  mockAnalysisAge?: number; // in days
  expectedAction: 'trigger' | 'skip';
}

const testScenarios: TestScenario[] = [
  {
    name: 'New Repository (Not in Vector DB)',
    repositoryUrl: 'https://github.com/test/new-repo',
    mockExistingAnalysis: false,
    expectedAction: 'trigger'
  },
  {
    name: 'Fresh Analysis (< 1 day old)',
    repositoryUrl: 'https://github.com/test/fresh-repo',
    mockExistingAnalysis: true,
    mockAnalysisAge: 0.5,
    expectedAction: 'skip'
  },
  {
    name: 'Stale Analysis (3 days old)',
    repositoryUrl: 'https://github.com/test/stale-repo',
    mockExistingAnalysis: true,
    mockAnalysisAge: 3,
    expectedAction: 'skip' // Current logic accepts stale
  },
  {
    name: 'Outdated Analysis (10 days old)',
    repositoryUrl: 'https://github.com/test/outdated-repo',
    mockExistingAnalysis: true,
    mockAnalysisAge: 10,
    expectedAction: 'trigger'
  }
];

async function main() {
  console.log(chalk.cyan('\n🔍 Testing DeepWiki Auto-Trigger Logic\n'));

  // Create authenticated user for testing
  const authenticatedUser = {
    id: 'test-deepwiki-trigger',
    email: 'test@example.com',
    organizationId: 'test-org',
    permissions: ['analyze'],
    role: 'user',
    status: 'active',
    session: {
      token: 'test-token',
      expiresAt: new Date(Date.now() + 3600000)
    }
  };

  // DeepWikiManager is now simplified - skip this test
  console.log(chalk.yellow('\n⚠️  DeepWiki trigger test skipped - using simplified version'));
  console.log(chalk.gray('The simplified DeepWiki no longer stores repositories'));
  console.log(chalk.gray('Analysis is always run fresh when requested'));
  return;
  
  /* Commenting out the rest of the test since DeepWiki is simplified
  // Mock the Vector DB checks
  const _originalCheckExists = deepWikiManager.checkRepositoryExists.bind(deepWikiManager);
  const _originalTriggerAnalysis = deepWikiManager.triggerRepositoryAnalysis.bind(deepWikiManager);
  
  const triggeredAnalyses: string[] = [];
  
  // Override methods for testing
  deepWikiManager.checkRepositoryExists = async (repoUrl: string) => {
    const scenario = testScenarios.find(s => s.repositoryUrl === repoUrl);
    return scenario?.mockExistingAnalysis || false;
  };
  
  deepWikiManager.triggerRepositoryAnalysis = async (repoUrl: string) => {
    triggeredAnalyses.push(repoUrl);
    console.log(chalk.yellow(`  🚀 Triggered analysis for: ${repoUrl}`));
    return `job-${Date.now()}`;
  };
  
  deepWikiManager.waitForAnalysisCompletion = async (repoUrl: string) => {
    console.log(chalk.gray(`  ⏳ Simulating analysis completion for: ${repoUrl}`));
    return {
      repositoryUrl: repoUrl,
      analysis: {
        architecture: { 
          score: 0.85, 
          findings: [], 
          recommendations: ['Consider implementing design patterns'] 
        },
        security: { 
          score: 0.9, 
          findings: [], 
          recommendations: ['Enable security scanning'] 
        },
        performance: { 
          score: 0.75, 
          findings: [], 
          recommendations: ['Optimize database queries'] 
        },
        codeQuality: { 
          score: 0.8, 
          findings: [], 
          recommendations: ['Add more unit tests'] 
        },
        dependencies: { 
          score: 0.7, 
          findings: [], 
          recommendations: ['Update outdated packages'] 
        }
      },
      metadata: {
        analyzedAt: new Date(),
        analysisVersion: '1.0.0',
        processingTime: 1000
      }
    };
  };

  // Test each scenario
  for (const scenario of testScenarios) {
    console.log(chalk.blue(`\nTesting: ${scenario.name}`));
    console.log(chalk.gray(`  Repository: ${scenario.repositoryUrl}`));
    console.log(chalk.gray(`  Existing Analysis: ${scenario.mockExistingAnalysis}`));
    if (scenario.mockAnalysisAge !== undefined) {
      console.log(chalk.gray(`  Analysis Age: ${scenario.mockAnalysisAge} days`));
    }
    
    try {
      // Simulate the check repository status logic
      const exists = await deepWikiManager.checkRepositoryExists(scenario.repositoryUrl);
      
      let needsReanalysis = false;
      if (!exists) {
        needsReanalysis = true;
        console.log(chalk.yellow('  📊 Status: Not in Vector DB - needs analysis'));
      } else {
        // Simulate age check
        const daysSinceAnalysis = scenario.mockAnalysisAge || 0;
        if (daysSinceAnalysis > 7) {
          needsReanalysis = true;
          console.log(chalk.yellow(`  📊 Status: Outdated (${daysSinceAnalysis} days old) - needs analysis`));
        } else if (daysSinceAnalysis > 1) {
          console.log(chalk.green(`  📊 Status: Stale (${daysSinceAnalysis} days old) - accepted`));
        } else {
          console.log(chalk.green(`  📊 Status: Fresh (${daysSinceAnalysis} days old) - no action needed`));
        }
      }
      
      // Trigger analysis if needed
      if (needsReanalysis) {
        await deepWikiManager.triggerRepositoryAnalysis(scenario.repositoryUrl);
        await deepWikiManager.waitForAnalysisCompletion(scenario.repositoryUrl);
      }
      
      // Verify expected behavior
      const wasTriggered = triggeredAnalyses.includes(scenario.repositoryUrl);
      const expectedToTrigger = scenario.expectedAction === 'trigger';
      
      if (wasTriggered === expectedToTrigger) {
        console.log(chalk.green(`  ✅ Behavior matches expectation: ${scenario.expectedAction}`));
      } else {
        console.log(chalk.red(`  ❌ Unexpected behavior: expected ${scenario.expectedAction}, but got ${wasTriggered ? 'trigger' : 'skip'}`));
      }
      
    } catch (error) {
      console.error(chalk.red(`  ❌ Test failed: ${error}`));
    }
  }

  // Summary
  console.log(chalk.cyan('\n📊 Test Summary:\n'));
  console.log(`Total scenarios tested: ${testScenarios.length}`);
  console.log(`Analyses triggered: ${triggeredAnalyses.length}`);
  console.log(`Repositories analyzed: ${triggeredAnalyses.join(', ') || 'None'}`);
  
  // Test the actual repository status check logic
  console.log(chalk.cyan('\n🔧 Testing Actual Repository Status Check Logic:\n'));
  
  // This simulates what happens in result-orchestrator.ts
  for (const scenario of testScenarios.slice(0, 2)) { // Just test first two
    console.log(chalk.blue(`\nChecking: ${scenario.name}`));
    
    const status = {
      existsInVectorDB: scenario.mockExistingAnalysis,
      lastAnalyzed: scenario.mockExistingAnalysis 
        ? new Date(Date.now() - (scenario.mockAnalysisAge || 0) * 24 * 60 * 60 * 1000)
        : undefined,
      analysisQuality: 'fresh' as 'fresh' | 'stale' | 'outdated',
      needsReanalysis: false
    };
    
    if (!status.existsInVectorDB) {
      status.analysisQuality = 'outdated';
      status.needsReanalysis = true;
    } else {
      const daysSinceAnalysis = status.lastAnalyzed 
        ? (Date.now() - status.lastAnalyzed.getTime()) / (1000 * 60 * 60 * 24) 
        : Infinity;
      
      if (daysSinceAnalysis <= 1) {
        status.analysisQuality = 'fresh';
        status.needsReanalysis = false;
      } else if (daysSinceAnalysis <= 7) {
        status.analysisQuality = 'stale';
        status.needsReanalysis = false;
      } else {
        status.analysisQuality = 'outdated';
        status.needsReanalysis = true;
      }
    }
    
    console.log(chalk.gray('  Status:'), status);
    console.log(status.needsReanalysis 
      ? chalk.yellow('  → Will trigger new analysis')
      : chalk.green('  → Will use existing analysis')
    );
  }
  
  console.log(chalk.cyan('\n✨ DeepWiki auto-trigger logic test completed!\n'));
}

// Run the test
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
*/}