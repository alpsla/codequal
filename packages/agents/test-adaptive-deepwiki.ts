#!/usr/bin/env npx ts-node

/**
 * Test the Adaptive DeepWiki API with iterative collection
 * This should collect unique findings across multiple iterations
 */

import { registerDeepWikiApi } from './src/standard/services/deepwiki-api-wrapper';
import { DirectDeepWikiApi } from './src/standard/services/direct-deepwiki-api';
import { UnifiedAnalysisWrapper } from './src/standard/services/unified-analysis-wrapper';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { ComparisonResult } from './src/standard/types/analysis-types';

async function testAdaptiveDeepWiki() {
  console.log('🔬 Testing Adaptive DeepWiki Integration with Iterative Collection\n');
  console.log('='.repeat(60));
  console.log('This test uses up to 10 iterations to collect unique findings');
  console.log('Each iteration may find new issues not found in previous calls');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Step 1: Register DeepWiki API (now uses adaptive approach internally)
    console.log('📡 Step 1: Registering DeepWiki API with adaptive iterative collection...');
    const directApi = new DirectDeepWikiApi();
    registerDeepWikiApi(directApi);
    console.log('✅ DirectDeepWikiApi registered (using adaptive approach)\n');
    
    // Step 2: Analyze a repository
    const repoUrl = 'https://github.com/sindresorhus/ky';
    const prNumber = 700;
    
    console.log(`📊 Step 2: Analyzing ${repoUrl} PR #${prNumber}...`);
    console.log('This will make multiple DeepWiki calls to collect unique findings\n');
    
    // Use UnifiedAnalysisWrapper
    const wrapper = new UnifiedAnalysisWrapper();
    
    const startTime = Date.now();
    const result = await wrapper.analyzeRepository(repoUrl, {
      prId: String(prNumber),
      branch: 'main',
      skipCache: true,
      validateLocations: false,
      useDeepWikiMock: false
    });
    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 Analysis Results:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Total unique issues found: ${result.analysis.issues.length}`);
    console.log(`- Average confidence: ${result.validationStats.averageConfidence}%`);
    console.log(`- Total duration: ${duration}ms (${(duration/1000).toFixed(1)}s)`);
    console.log(`- Iterations performed: ${result.metadata.iterationsPerformed || 'unknown'}`);
    
    // Step 3: Display issue breakdown
    console.log('\n📝 Issue Breakdown by Category:');
    const categories: Record<string, number> = {};
    const severities: Record<string, number> = {};
    
    result.analysis.issues.forEach(issue => {
      categories[issue.category] = (categories[issue.category] || 0) + 1;
      severities[issue.severity] = (severities[issue.severity] || 0) + 1;
    });
    
    console.log('\nBy Category:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count} issues`);
    });
    
    console.log('\nBy Severity:');
    Object.entries(severities).forEach(([sev, count]) => {
      console.log(`  - ${sev}: ${count} issues`);
    });
    
    // Step 4: Generate V8 report
    console.log('\n📄 Step 3: Generating V8 Report...');
    const generator = new ReportGeneratorV8Final();
    
    // Create ComparisonResult structure
    const comparisonResult: ComparisonResult = {
      success: true,
      newIssues: result.analysis.issues.slice(0, Math.floor(result.analysis.issues.length / 2)),
      unchangedIssues: result.analysis.issues.slice(Math.floor(result.analysis.issues.length / 2)),
      resolvedIssues: [],
      prMetadata: {
        prNumber,
        prTitle: `Test PR #${prNumber}`,
        repository: repoUrl,
        author: 'test-user',
        branch: `pr-${prNumber}`,
        targetBranch: 'main',
        filesChanged: result.metadata.filesAnalyzed || 0,
        additions: 0,
        deletions: 0
      },
      summary: {
        totalNewIssues: result.analysis.issues.length,
        totalResolvedIssues: 0,
        totalUnchangedIssues: 0,
        overallAssessment: result.analysis.scores?.overall || 0
      }
    } as any;
    
    const report = await generator.generateReport(comparisonResult);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `adaptive-analysis-${timestamp}.html`;
    const fs = require('fs');
    fs.writeFileSync(filename, report);
    console.log(`✅ Report saved to: ${filename}`);
    
    // Step 5: Sample issues to verify they're real
    console.log('\n🔍 Sample Issues (first 5):');
    result.analysis.issues.slice(0, 5).forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.title}`);
      console.log(`   Category: ${issue.category}`);
      console.log(`   Severity: ${issue.severity}`);
      console.log(`   Location: ${issue.location?.file || 'unknown'}:${issue.location?.line || 0}`);
      if (issue.codeSnippet) {
        console.log(`   Code snippet preview: ${issue.codeSnippet.substring(0, 50)}...`);
      }
    });
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS: Adaptive DeepWiki analysis complete!');
    console.log('\nKey Benefits of Iterative Collection:');
    console.log('  1. Collects unique findings across multiple calls');
    console.log('  2. Overcomes non-deterministic API responses');
    console.log('  3. Achieves higher coverage of potential issues');
    console.log('  4. Stops automatically when no new issues found');
    console.log('='.repeat(60));
    
  } catch (error: any) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ ERROR:', error.message);
    console.log('Stack:', error.stack);
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run the test
testAdaptiveDeepWiki().catch(console.error);