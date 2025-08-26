#!/usr/bin/env npx ts-node

/**
 * Test to verify DeepWiki integration uses REAL data only, no mocks
 * This test will fail if mock data is being generated
 */

import { DeepWikiApiWrapper } from './src/standard/services/deepwiki-api-wrapper';
import { DirectDeepWikiApi } from './src/standard/services/direct-deepwiki-api';
import { registerDeepWikiApi } from './src/standard/services/deepwiki-api-wrapper';
import { UnifiedAnalysisWrapper } from './src/standard/services/unified-analysis-wrapper';

async function testRealDeepWikiNoMocks() {
  console.log('🔍 Testing Real DeepWiki Integration - NO MOCKS ALLOWED\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Register real DeepWiki API
    console.log('📡 Step 1: Registering real DeepWiki API...');
    const directApi = new DirectDeepWikiApi();
    registerDeepWikiApi(directApi);
    console.log('✅ DirectDeepWikiApi registered\n');
    
    // Step 2: Test with a real repository
    const repoUrl = 'https://github.com/sindresorhus/ky';
    const prNumber = 700;
    
    console.log(`📊 Step 2: Analyzing ${repoUrl} PR #${prNumber}...`);
    console.log('This should use REAL DeepWiki API only\n');
    
    // Use UnifiedAnalysisWrapper for complete flow
    const wrapper = new UnifiedAnalysisWrapper();
    
    const result = await wrapper.analyzeRepository(repoUrl, {
      prId: String(prNumber),
      branch: 'main',
      skipCache: true,
      validateLocations: false, // Skip location validation for this test
      useDeepWikiMock: false // Explicitly disable mocks
    });
    
    console.log('📈 Analysis Results:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Issues found: ${result.analysis.issues.length}`);
    console.log(`- Average confidence: ${result.validationStats.averageConfidence}%`);
    console.log(`- Duration: ${result.metadata.duration}ms\n`);
    
    // Step 3: Check for mock data indicators
    console.log('🔎 Step 3: Checking for mock data indicators...\n');
    
    let hasMockData = false;
    const mockIndicators: string[] = [];
    
    // Check for common mock issue titles
    const mockTitles = [
      'SQL Injection vulnerability',
      'Hardcoded API Keys Detected',
      'Memory Leak in Event Listeners',
      'N+1 Database Query Problem',
      'High Cyclomatic Complexity'
    ];
    
    result.analysis.issues.forEach(issue => {
      if (mockTitles.includes(issue.title)) {
        hasMockData = true;
        mockIndicators.push(`Mock title detected: "${issue.title}"`);
      }
      
      // Check for mock code snippets
      if (issue.codeSnippet?.includes('// SECURITY ISSUE:') ||
          issue.codeSnippet?.includes('// PERFORMANCE ISSUE:') ||
          issue.codeSnippet?.includes('// CODE QUALITY:')) {
        hasMockData = true;
        mockIndicators.push(`Mock code snippet detected in issue: "${issue.title}"`);
      }
      
      // Check for generic file paths
      if (issue.location?.file === 'src/services/user.service.ts' ||
          issue.location?.file === 'src/controllers/auth.controller.ts' ||
          issue.location?.file === 'src/models/user.model.ts') {
        hasMockData = true;
        mockIndicators.push(`Mock file path detected: "${issue.location.file}"`);
      }
    });
    
    // Step 4: Display sample issues
    console.log('📝 Sample Issues (first 3):');
    result.analysis.issues.slice(0, 3).forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.title}`);
      console.log(`   Category: ${issue.category}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || 0}`);
      console.log(`   Has code snippet: ${!!issue.codeSnippet}`);
    });
    
    // Step 5: Final verdict
    console.log('\n' + '='.repeat(60));
    if (hasMockData) {
      console.log('❌ FAILURE: Mock data detected!');
      console.log('\nMock indicators found:');
      mockIndicators.forEach(indicator => console.log(`  - ${indicator}`));
      console.log('\n⚠️  The system is still using generated mock data instead of real DeepWiki analysis!');
      process.exit(1);
    } else if (result.analysis.issues.length === 0) {
      console.log('⚠️  WARNING: No issues found');
      console.log('This could mean:');
      console.log('  1. DeepWiki returned empty response');
      console.log('  2. Response parsing failed');
      console.log('  3. Transformer rejected the response');
    } else {
      console.log('✅ SUCCESS: Using real DeepWiki data!');
      console.log(`   - Found ${result.analysis.issues.length} real issues`);
      console.log('   - No mock data indicators detected');
      console.log('   - Data pipeline is working correctly');
    }
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ ERROR:', error.message);
    
    // Check if this is our intentional error from transformer
    if (error.message.includes('DeepWiki response invalid or unavailable')) {
      console.log('\n✅ GOOD: Transformer correctly rejected invalid response');
      console.log('This means mock generation is disabled as intended');
    } else {
      console.log('\n⚠️  Unexpected error occurred');
      console.log('Stack:', error.stack);
    }
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run the test
testRealDeepWikiNoMocks().catch(console.error);