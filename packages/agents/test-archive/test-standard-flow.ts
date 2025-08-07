#!/usr/bin/env ts-node

import { DeepWikiService } from './src/standard/services/deepwiki-service';
import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { DeepWikiApiWrapper, registerDeepWikiApi } from './src/standard/services/deepwiki-api-wrapper';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('test-standard-flow');

// Register the DeepWiki API mock
import { deepWikiApiManager } from '../../apps/api/dist/services/deepwiki-api-manager';

// Mock API implementation that uses the enhanced mock
const mockApi = {
  async analyzeRepository(repositoryUrl: string, options?: any) {
    console.log(`[MockAPI] Analyzing with options:`, options);
    process.env.USE_DEEPWIKI_MOCK = 'true';
    const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
    
    // Convert to the expected format
    return {
      issues: result.issues || [],
      scores: result.scores || { overall: 85, security: 80, performance: 75, maintainability: 90 },
      metadata: {
        timestamp: new Date().toISOString(),
        tool_version: '1.0.0',
        duration_ms: 2000,
        files_analyzed: 100,
        branch: options?.branch
      }
    };
  }
};

registerDeepWikiApi(mockApi);

async function testStandardFlow() {
  console.log('Testing Standard framework flow with branch differentiation...\n');
  
  // Initialize services
  const deepWikiService = new DeepWikiService(
    new DeepWikiApiWrapper(),
    undefined, // no cache for this test
    logger
  );
  
  const comparisonAgent = new ComparisonAgent(logger);
  
  // Analyze main branch
  console.log('=== Analyzing MAIN branch ===');
  const mainAnalysis = await deepWikiService.analyzeRepository(
    'https://github.com/test/repo',
    'main'
  );
  console.log(`Main branch issues: ${mainAnalysis.issues.length}`);
  console.log('Main issue IDs:', mainAnalysis.issues.map(i => i.id).join(', '));
  
  // Analyze PR branch
  console.log('\n=== Analyzing PR branch ===');
  const prAnalysis = await deepWikiService.analyzeRepository(
    'https://github.com/test/repo',
    'pr/123'
  );
  console.log(`PR branch issues: ${prAnalysis.issues.length}`);
  console.log('PR issue IDs:', prAnalysis.issues.map(i => i.id).join(', '));
  
  // Run comparison
  console.log('\n=== Running Comparison ===');
  await comparisonAgent.initialize({
    language: 'typescript',
    complexity: 'medium'
  });
  
  const comparison = await comparisonAgent.analyze({
    mainBranchAnalysis: mainAnalysis,
    featureBranchAnalysis: prAnalysis,
    prMetadata: {
      number: 123,
      title: 'Test PR',
      author: 'test-user',
      repository_url: 'https://github.com/test/repo',
      base_branch: 'main',
      head_branch: 'pr/123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    generateReport: false // Just get the comparison data
  });
  
  console.log('\nComparison Results:');
  console.log('- Resolved issues:', comparison.summary.totalResolved);
  console.log('- New issues:', comparison.summary.totalNew);
  console.log('- Modified issues:', comparison.summary.totalModified);
  console.log('- Unchanged issues:', comparison.summary.totalUnchanged);
  
  if (comparison.resolvedIssues.length > 0) {
    console.log('\nResolved issues:', comparison.resolvedIssues.map((i: any) => i.id).join(', '));
  }
  
  if (comparison.newIssues.length > 0) {
    console.log('New issues:', comparison.newIssues.map((i: any) => i.id).join(', '));
  }
  
  // Verify expectations
  const hasResolvedSEC001 = comparison.resolvedIssues.some((i: any) => i.id === 'SEC-001');
  const hasNewPR001 = comparison.newIssues.some((i: any) => i.id === 'PR-NEW-001');
  const hasNewPR002 = comparison.newIssues.some((i: any) => i.id === 'PR-NEW-002');
  
  console.log('\n=== VERIFICATION ===');
  console.log(`✓ SEC-001 resolved: ${hasResolvedSEC001}`);
  console.log(`✓ PR-NEW-001 detected: ${hasNewPR001}`);
  console.log(`✓ PR-NEW-002 detected: ${hasNewPR002}`);
  
  if (hasResolvedSEC001 && hasNewPR001 && hasNewPR002) {
    console.log('\n✅ SUCCESS: Standard framework correctly detects branch differences!');
  } else {
    console.log('\n❌ FAILURE: Branch differences not properly detected');
  }
  
  // Exit cleanly
  setTimeout(() => process.exit(0), 1000);
}

testStandardFlow().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});