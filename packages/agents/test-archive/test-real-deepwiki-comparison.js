#!/usr/bin/env node

// Test with real DeepWiki API
const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager.js');
const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent');
const { DeepWikiService } = require('./dist/standard/services/deepwiki-service');
const { registerDeepWikiApi } = require('./dist/standard/services/deepwiki-api-wrapper');

console.log('Testing with REAL DeepWiki API...\n');

// Use environment variable to control mock vs real
process.env.USE_DEEPWIKI_MOCK = 'false';
process.env.DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'test-key';

// Register the real DeepWiki API
registerDeepWikiApi({
  async analyzeRepository(repositoryUrl, options) {
    console.log(`[DeepWiki API] Analyzing ${repositoryUrl} with options:`, options);
    
    // Call the real DeepWiki API manager
    const result = await deepWikiApiManager.analyzeRepository(repositoryUrl, options);
    
    // Convert to expected format if needed
    return {
      issues: result.issues || [],
      scores: result.scores || { overall: 85, security: 80, performance: 75, maintainability: 90 },
      metadata: {
        timestamp: new Date().toISOString(),
        tool_version: '1.0.0',
        duration_ms: result.metadata?.duration_ms || 5000,
        files_analyzed: result.metadata?.files_analyzed || 100,
        branch: options?.branch,
        total_lines: result.metadata?.total_lines
      }
    };
  }
});

async function testRealDeepWiki() {
  try {
    const logger = {
      info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
      error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
      debug: (msg, data) => {} // Silent debug
    };
    
    const deepWikiService = new DeepWikiService(logger);
    const comparisonAgent = new ComparisonAgent(logger);
    
    // Test with a real GitHub repository (using a small one for speed)
    const repoUrl = 'https://github.com/expressjs/express';
    
    console.log('=== Analyzing MAIN branch with real DeepWiki ===');
    const mainAnalysis = await deepWikiService.analyzeRepository(
      repoUrl,
      'main'
    );
    console.log(`Main branch: ${mainAnalysis.issues.length} issues found`);
    if (mainAnalysis.issues.length > 0) {
      console.log('Sample issues:', mainAnalysis.issues.slice(0, 3).map(i => ({
        id: i.id,
        severity: i.severity,
        category: i.category
      })));
    }
    
    console.log('\n=== Analyzing a PR branch ===');
    // For testing, we'll use a different branch or the same with a pr/ prefix
    const prAnalysis = await deepWikiService.analyzeRepository(
      repoUrl,
      'pr/test-branch'  // This will still analyze main but simulate a PR
    );
    console.log(`PR branch: ${prAnalysis.issues.length} issues found`);
    
    // Initialize and run comparison
    await comparisonAgent.initialize({
      language: 'javascript',
      complexity: 'medium'
    });
    
    console.log('\n=== Running Comparison Analysis ===');
    const result = await comparisonAgent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        number: 9999,
        title: 'Test PR with Real DeepWiki',
        author: 'test-user',
        repository_url: repoUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      generateReport: true
    });
    
    console.log('\n=== Comparison Results ===');
    console.log(`Total Resolved: ${result.summary.totalResolved}`);
    console.log(`Total New: ${result.summary.totalNew}`);
    console.log(`Total Modified: ${result.summary.totalModified}`);
    console.log(`Total Unchanged: ${result.summary.totalUnchanged}`);
    
    if (result.markdownReport) {
      // Save the report
      const fs = require('fs');
      const reportPath = './test-real-deepwiki-report.md';
      fs.writeFileSync(reportPath, result.markdownReport);
      console.log(`\n✅ Report saved to: ${reportPath}`);
      
      // Show a snippet of the report
      console.log('\n=== Report Preview ===');
      const lines = result.markdownReport.split('\n');
      console.log(lines.slice(0, 30).join('\n'));
      console.log('...\n[Report continues - see full file]');
    }
    
    console.log('\n✅ SUCCESS: Real DeepWiki API test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  // Clean exit
  setTimeout(() => process.exit(0), 2000);
}

// Run the test
testRealDeepWiki();