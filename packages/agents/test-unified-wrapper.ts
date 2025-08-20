#!/usr/bin/env ts-node

/**
 * Test Unified Analysis Wrapper
 * 
 * Verifies the complete flow sequence works correctly
 * and produces accurate, validated location data.
 */

import { UnifiedAnalysisWrapper } from './src/standard/services/unified-analysis-wrapper';

async function testUnifiedWrapper() {
  console.log('🔄 Testing Unified Analysis Wrapper\n');
  console.log('=' .repeat(80));
  
  const wrapper = new UnifiedAnalysisWrapper();
  const repoUrl = 'https://github.com/sindresorhus/ky';
  
  // Test 1: With Mock Data (should get 100% valid after clarification)
  console.log('\n📊 Test 1: Mock Data with Full Validation\n');
  
  const mockResult = await wrapper.analyzeRepository(repoUrl, {
    branch: 'main',
    useDeepWikiMock: true,
    validateLocations: true,
    requireMinConfidence: 70,
    maxClarificationAttempts: 2
  });
  
  console.log('Result:', {
    success: mockResult.success,
    totalIssues: mockResult.validationStats.totalIssues,
    validLocations: mockResult.validationStats.validLocations,
    clarifiedLocations: mockResult.validationStats.clarifiedLocations,
    invalidLocations: mockResult.validationStats.invalidLocations,
    averageConfidence: Math.round(mockResult.validationStats.averageConfidence)
  });
  
  console.log('\nFlow Steps:');
  for (const step of mockResult.metadata.flowSteps) {
    const icon = step.status === 'success' ? '✅' : step.status === 'partial' ? '⚠️' : '❌';
    console.log(`  ${icon} ${step.step} (${step.duration}ms)`, step.details || '');
  }
  
  // Test 2: With Real DeepWiki (if available)
  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 Test 2: Real DeepWiki with Full Validation\n');
  
  try {
    const realResult = await wrapper.analyzeRepository(repoUrl, {
      branch: 'main',
      prId: '700',
      useDeepWikiMock: false,
      validateLocations: true,
      requireMinConfidence: 70,
      maxClarificationAttempts: 2
    });
    
    console.log('Result:', {
      success: realResult.success,
      totalIssues: realResult.validationStats.totalIssues,
      validLocations: realResult.validationStats.validLocations,
      clarifiedLocations: realResult.validationStats.clarifiedLocations,
      invalidLocations: realResult.validationStats.invalidLocations,
      averageConfidence: Math.round(realResult.validationStats.averageConfidence)
    });
    
    console.log('\nFlow Steps:');
    for (const step of realResult.metadata.flowSteps) {
      const icon = step.status === 'success' ? '✅' : step.status === 'partial' ? '⚠️' : '❌';
      console.log(`  ${icon} ${step.step} (${step.duration}ms)`, step.details || '');
    }
    
    // Generate report
    const report = await wrapper.generateValidationReport(realResult);
    
    // Save report
    const fs = require('fs');
    fs.writeFileSync('./unified-analysis-report.md', report);
    console.log('\n📄 Full report saved to: ./unified-analysis-report.md');
    
  } catch (error: any) {
    console.log('❌ Real DeepWiki test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   (DeepWiki is not running)');
    }
  }
  
  // Test 3: Comparison flow (main vs PR)
  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 Test 3: Comparison Flow (Main vs PR)\n');
  
  const mainAnalysis = await wrapper.analyzeRepository(repoUrl, {
    branch: 'main',
    useDeepWikiMock: true,
    validateLocations: true
  });
  
  const prAnalysis = await wrapper.analyzeRepository(repoUrl, {
    branch: 'pr/700',
    prId: '700',
    useDeepWikiMock: true,
    validateLocations: true
  });
  
  console.log('Main Branch:', {
    issues: mainAnalysis.validationStats.totalIssues,
    valid: mainAnalysis.validationStats.validLocations
  });
  
  console.log('PR Branch:', {
    issues: prAnalysis.validationStats.totalIssues,
    valid: prAnalysis.validationStats.validLocations
  });
  
  // Compare issues
  const mainIssueIds = new Set(mainAnalysis.analysis.issues.map(i => i.id));
  const prIssueIds = new Set(prAnalysis.analysis.issues.map(i => i.id));
  
  const unchanged = [...mainIssueIds].filter(id => prIssueIds.has(id)).length;
  const resolved = [...mainIssueIds].filter(id => !prIssueIds.has(id)).length;
  const newIssues = [...prIssueIds].filter(id => !mainIssueIds.has(id)).length;
  
  console.log('\nComparison:', {
    unchanged,
    resolved,
    new: newIssues
  });
  
  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('\n🎯 SUMMARY\n');
  
  if (mockResult.validationStats.validLocations === mockResult.validationStats.totalIssues) {
    console.log('✅ Mock data: All locations validated successfully');
  } else {
    console.log('⚠️ Mock data: Some locations remain invalid');
  }
  
  console.log('\n💡 The unified wrapper provides:');
  console.log('   1. Single entry point for all analysis needs');
  console.log('   2. Automatic location validation and clarification');
  console.log('   3. Confidence-based filtering');
  console.log('   4. Detailed flow tracking for debugging');
  console.log('   5. Consistent data format across all consumers');
}

// Run the test
testUnifiedWrapper().catch(console.error);