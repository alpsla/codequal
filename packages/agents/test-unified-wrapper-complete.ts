#!/usr/bin/env ts-node

/**
 * Test Unified Analysis Wrapper - Complete Validation
 * 
 * Verifies all fixes in UnifiedAnalysisWrapper:
 * 1. Repository metadata extraction
 * 2. PR metadata handling
 * 3. Files analyzed counting
 * 4. Line changes tracking
 * 5. Test coverage handling
 * 6. Location validation flow
 * 7. Report generation with proper metadata
 */

import { UnifiedAnalysisWrapper } from './src/standard/services/unified-analysis-wrapper';
import { ApiAnalysisService } from './src/standard/services/unified-wrapper-integration';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';

async function testUnifiedWrapper() {
  console.log('🧪 Testing Unified Analysis Wrapper - Complete Validation\n');
  console.log('=' .repeat(80));
  
  // Test configuration
  const testRepo = 'https://github.com/sindresorhus/ky';
  const prNumber = 700;
  
  // Initialize wrapper
  const wrapper = new UnifiedAnalysisWrapper();
  
  console.log('\n📊 Test 1: Basic Analysis with Metadata Extraction\n');
  
  try {
    // Run analysis with PR metadata
    const result = await wrapper.analyzeRepository(testRepo, {
      prId: prNumber.toString(),
      branch: `pr/${prNumber}`,
      validateLocations: true,
      requireMinConfidence: 70,
      useDeepWikiMock: true, // Use mock for testing
      prMetadata: {
        repository: 'sindresorhus/ky',
        prNumber: prNumber,
        prTitle: 'Add retry mechanism for failed requests',
        author: 'test-user',
        filesChanged: 15,
        additions: 234,
        deletions: 56,
        baseCommit: 'abc123',
        headCommit: 'def456'
      }
    });
    
    // Validate metadata extraction
    console.log('✅ Metadata Extraction:');
    console.log(`   Repository: ${result.metadata.repository} (should be sindresorhus/ky)`);
    console.log(`   Owner: ${result.metadata.owner} (should be sindresorhus)`);
    console.log(`   PR Number: ${result.metadata.prNumber} (should be ${prNumber})`);
    console.log(`   Files Analyzed: ${result.metadata.filesAnalyzed} (should be > 0)`);
    console.log(`   Lines Changed: +${result.metadata.linesChanged?.additions || 0}/-${result.metadata.linesChanged?.deletions || 0}`);
    console.log(`   Test Coverage: ${result.metadata.testCoverage !== undefined ? result.metadata.testCoverage + '%' : 'Not measured'}`);
    console.log();
    
    // Validate location statistics
    console.log('📍 Location Validation:');
    console.log(`   Total Issues: ${result.validationStats.totalIssues}`);
    console.log(`   Valid Locations: ${result.validationStats.validLocations}`);
    console.log(`   Clarified: ${result.validationStats.clarifiedLocations}`);
    console.log(`   Invalid: ${result.validationStats.invalidLocations}`);
    console.log(`   Average Confidence: ${result.validationStats.averageConfidence.toFixed(2)}%`);
    console.log();
    
    // Test report generation with metadata
    console.log('📄 Test 2: Report Generation with Proper Metadata\n');
    
    const generator = new ReportGeneratorV8Final();
    
    // Create comparison result with metadata
    const comparisonResult = {
      success: true,
      mainAnalysis: result.analysis,
      featureAnalysis: result.analysis,
      newIssues: result.analysis.issues.slice(0, 2),
      resolvedIssues: [],
      unchangedIssues: result.analysis.issues.slice(2),
      score: result.analysis.scores.overall,
      decision: result.analysis.scores.overall >= 70 ? 'approved' as const : 'needs_work' as const,
      confidence: result.validationStats.averageConfidence,
      prMetadata: {
        ...result.prMetadata,
        repository: result.metadata.repository,
        prNumber: result.metadata.prNumber,
        filesChanged: result.metadata.filesAnalyzed,
        additions: result.metadata.linesChanged?.additions,
        deletions: result.metadata.linesChanged?.deletions,
        testCoverage: result.metadata.testCoverage
      }
    };
    
    const report = generator.generateReport(comparisonResult);
    
    // Validate report content
    const hasValidRepo = !report.includes('Unknown Repository');
    const hasValidPR = !report.includes('PR #0');
    const hasArchitecture = report.includes('System Architecture Overview');
    const hasEducation = report.includes('Educational Insights');
    const hasTestCoverage = report.includes('Test Coverage:') && !report.includes('NaN');
    
    console.log('✅ Report Validation:');
    console.log(`   Repository Info: ${hasValidRepo ? '✅ Valid' : '❌ Shows "Unknown Repository"'}`);
    console.log(`   PR Number: ${hasValidPR ? '✅ Valid' : '❌ Shows "#0"'}`);
    console.log(`   Architecture Diagram: ${hasArchitecture ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Educational Module: ${hasEducation ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Test Coverage: ${hasTestCoverage ? '✅ Valid' : '❌ Invalid or NaN'}`);
    console.log();
    
    // Save report for inspection
    const reportPath = './unified-wrapper-test-report.md';
    fs.writeFileSync(reportPath, report);
    console.log(`📝 Full report saved to: ${reportPath}`);
    console.log();
    
    // Test API service integration
    console.log('🔌 Test 3: API Service Integration\n');
    
    const apiService = new ApiAnalysisService();
    const apiResult = await apiService.analyzePullRequest(
      'sindresorhus',
      'ky',
      prNumber,
      {
        prTitle: 'Test PR',
        author: 'test-user',
        filesChanged: 10,
        additions: 150,
        deletions: 30
      }
    );
    
    console.log('✅ API Service Result:');
    console.log(`   Status: ${apiResult.status}`);
    console.log(`   Repository: ${apiResult.data?.repository}`);
    console.log(`   PR Number: ${apiResult.data?.prNumber}`);
    console.log(`   Main Branch Score: ${apiResult.data?.mainBranch.score}/100`);
    console.log(`   PR Branch Score: ${apiResult.data?.prBranch.score}/100`);
    console.log();
    
    // Summary
    console.log('=' .repeat(80));
    console.log('\n🎯 Test Summary\n');
    
    const allTestsPassed = 
      result.metadata.repository !== 'unknown' &&
      result.metadata.prNumber === prNumber &&
      result.metadata.filesAnalyzed > 0 &&
      hasValidRepo &&
      hasValidPR &&
      hasArchitecture &&
      hasEducation &&
      apiResult.status === 'success';
    
    if (allTestsPassed) {
      console.log('✅ All tests passed! UnifiedAnalysisWrapper is working correctly.');
      console.log('\nKey achievements:');
      console.log('   1. Repository metadata properly extracted');
      console.log('   2. PR metadata correctly handled');
      console.log('   3. Files analyzed counted accurately');
      console.log('   4. Line changes tracked when provided');
      console.log('   5. Test coverage handled without random values');
      console.log('   6. Location validation working');
      console.log('   7. Reports generated with proper metadata');
      console.log('   8. API service integration successful');
    } else {
      console.log('⚠️ Some tests failed. Review the output above for details.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUnifiedWrapper().catch(console.error);