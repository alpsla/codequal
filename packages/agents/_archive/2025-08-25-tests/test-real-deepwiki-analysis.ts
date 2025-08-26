#!/usr/bin/env ts-node

/**
 * Test Real DeepWiki Analysis
 * 
 * This script tests the DeepWiki service with real API integration
 */

import { createDeepWikiService } from '../services/deepwiki-service';
import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';
import { StandardAgentFactory, MockResearcherAgent } from '../infrastructure/factory';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function testRealDeepWikiAnalysis() {
  console.log('🚀 Testing Real DeepWiki Analysis');
  console.log('=================================\n');

  // Force real mode by setting environment variable
  process.env.USE_DEEPWIKI_MOCK = 'false';
  
  // Create output directory
  const outputDir = join(__dirname, '../reports', 'real-deepwiki-test', new Date().toISOString().split('T')[0]);
  mkdirSync(outputDir, { recursive: true });

  // Initialize services
  const logger = StandardAgentFactory.createLogger();
  const deepWikiService = createDeepWikiService(logger);
  
  // Initialize orchestrator
  const orchestrator = new ComparisonOrchestrator(
    await StandardAgentFactory.createConfigProvider(),
    StandardAgentFactory.createSkillProvider(),
    StandardAgentFactory.createDataStore(),
    new MockResearcherAgent(),
    undefined,
    logger
  );

  // Test repository and PR
  const repository = 'https://github.com/vercel/swr';
  const prNumber = '2950';
  
  try {
    console.log(`📊 Analyzing repository: ${repository}`);
    console.log(`📋 PR Number: ${prNumber}\n`);
    
    const startTime = Date.now();
    
    // Step 1: Analyze main branch
    console.log('🔍 Analyzing main branch with DeepWiki...');
    const mainBranchAnalysis = await deepWikiService.analyzeRepositoryForComparison(
      repository,
      'main'
    );
    console.log(`✅ Main branch analysis complete: ${mainBranchAnalysis.issues.length} issues found\n`);
    
    // Step 2: Analyze feature branch (PR branch)
    console.log(`🔍 Analyzing PR #${prNumber} with DeepWiki...`);
    const featureBranchAnalysis = await deepWikiService.analyzeRepositoryForComparison(
      repository,
      undefined,
      prNumber
    );
    console.log(`✅ Feature branch analysis complete: ${featureBranchAnalysis.issues.length} issues found\n`);
    
    // Step 3: Create comparison request
    const analysisRequest = {
      mainBranchAnalysis,
      featureBranchAnalysis,
      prMetadata: {
        id: prNumber,
        repository_url: repository,
        author: 'huozhi',
        title: 'Update mutation types',
        linesAdded: 156,
        linesRemoved: 89
      },
      userId: 'test-user',
      teamId: 'test-team',
      generateReport: true,
      includeEducation: true
    };
    
    // Step 4: Execute comparison
    console.log('🔄 Comparing branches and generating report...');
    const result = await orchestrator.executeComparison(analysisRequest);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Analysis completed in ${duration}s\n`);
    
    // Save the report
    const reportPath = join(outputDir, `deepwiki-analysis-report.md`);
    writeFileSync(reportPath, result.report || 'No report generated');
    console.log(`📄 Report saved to: ${reportPath}`);
    
    // Save raw analysis data
    const dataPath = join(outputDir, `deepwiki-analysis-data.json`);
    writeFileSync(dataPath, JSON.stringify({
      mainBranchAnalysis,
      featureBranchAnalysis,
      result
    }, null, 2));
    console.log(`📊 Raw data saved to: ${dataPath}`);
    
    // Display summary
    console.log('\n📋 Analysis Summary:');
    console.log('===================');
    console.log(`Repository: ${repository}`);
    console.log(`PR: #${prNumber}`);
    console.log(`Main Branch Issues: ${mainBranchAnalysis.issues.length}`);
    console.log(`Feature Branch Issues: ${featureBranchAnalysis.issues.length}`);
    console.log(`Success: ${result.success}`);
    
    if (result.comparison) {
      console.log(`\n🔍 Comparison Results:`);
      console.log(`New Issues: ${result.comparison.newIssues?.length || 0}`);
      console.log(`Resolved Issues: ${result.comparison.resolvedIssues?.length || 0}`);
      console.log(`Modified Issues: ${result.comparison.modifiedIssues?.length || 0}`);
    }
    
    console.log('\n🎉 Real DeepWiki analysis test complete!');
    
    // Return the report content for display
    return result.report || 'No report generated';
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    
    // Check if it's because real API is not available
    if (error instanceof Error && error.message.includes('DeepWiki API')) {
      console.log('\n⚠️  Real DeepWiki API is not available.');
      console.log('ℹ️  The system will use mock data instead.');
      console.log('💡 To use real DeepWiki, ensure:');
      console.log('   1. DeepWiki service is running');
      console.log('   2. DEEPWIKI_API_KEY is set');
      console.log('   3. The API is properly registered\n');
    }
    
    throw error;
  }
}

// Run the test if called directly
if (require.main === module) {
  testRealDeepWikiAnalysis()
    .then(report => {
      console.log('\n📄 Generated Report Preview:');
      console.log('===========================');
      console.log(report.substring(0, 1000) + '...\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testRealDeepWikiAnalysis };