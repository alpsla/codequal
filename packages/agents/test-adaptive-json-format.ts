#!/usr/bin/env npx ts-node

/**
 * Test Adaptive DeepWiki Analyzer with JSON Format
 * 
 * This script tests the improved adaptive analyzer that now requests JSON format
 * from DeepWiki for better data extraction.
 */

import { AdaptiveDeepWikiAnalyzer } from './src/standard/deepwiki/services/adaptive-deepwiki-analyzer';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_KEY = process.env.DEEPWIKI_API_KEY || '';

async function testAdaptiveWithJSON() {
  console.log('🔍 Testing Adaptive Analyzer with JSON Format\n');
  console.log('=' .repeat(80));
  
  const analyzer = new AdaptiveDeepWikiAnalyzer(
    DEEPWIKI_URL,
    DEEPWIKI_KEY,
    console
  );
  
  const repoUrl = 'https://github.com/sindresorhus/ky';
  const branch = 'main';
  
  console.log(`\nAnalyzing: ${repoUrl} (${branch})`);
  console.log('Using JSON format for better data extraction\n');
  
  try {
    const startTime = Date.now();
    const result = await analyzer.analyzeWithGapFilling(repoUrl, branch);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 ANALYSIS RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\nTotal Duration: ${duration.toFixed(1)}s`);
    console.log(`Iterations Used: ${result.iterations.length}`);
    console.log(`Final Completeness: ${result.completeness}%`);
    
    // Analyze each iteration
    console.log('\n📈 Iteration Progress:');
    result.iterations.forEach((iter, index) => {
      console.log(`\nIteration ${index + 1}:`);
      console.log(`  - Duration: ${(iter.duration / 1000).toFixed(1)}s`);
      console.log(`  - Completeness: ${iter.gaps.completeness}%`);
      console.log(`  - Total Gaps: ${iter.gaps.totalGaps}`);
      console.log(`  - Critical Gaps: ${iter.gaps.criticalGaps}`);
      
      // Check if response was JSON
      const responseType = iter.response.trim().startsWith('{') ? 'JSON' : 'Text';
      console.log(`  - Response Type: ${responseType}`);
      
      if (iter.parsed) {
        console.log(`  - Issues Found: ${iter.parsed.issues?.length || 0}`);
        console.log(`  - Test Coverage: ${iter.parsed.testCoverage?.overall || 'N/A'}%`);
      }
    });
    
    // Final result details
    console.log('\n📋 Final Data Extracted:');
    const final = result.finalResult;
    
    console.log(`\nIssues: ${final.issues?.length || 0}`);
    if (final.issues && final.issues.length > 0) {
      // Show sample issues
      console.log('Sample Issues:');
      final.issues.slice(0, 3).forEach((issue: any, i: number) => {
        console.log(`  ${i + 1}. [${issue.severity}] ${issue.title}`);
        if (issue.file && issue.file !== 'unknown') {
          console.log(`     📍 ${issue.file}:${issue.line || '?'}`);
        }
      });
    }
    
    console.log(`\nTest Coverage:`);
    console.log(`  - Overall: ${final.testCoverage?.overall || 0}%`);
    console.log(`  - Test Files: ${final.testCoverage?.testFileCount || 0}`);
    console.log(`  - Source Files: ${final.testCoverage?.sourceFileCount || 0}`);
    
    console.log(`\nDependencies:`);
    console.log(`  - Total: ${final.dependencies?.total || 0}`);
    console.log(`  - Outdated: ${final.dependencies?.outdated?.length || 0}`);
    console.log(`  - Vulnerable: ${final.dependencies?.vulnerable?.length || 0}`);
    
    console.log(`\nArchitecture:`);
    console.log(`  - Score: ${final.architecture?.score || 0}/100`);
    console.log(`  - Anti-patterns: ${final.architecture?.antiPatterns?.length || 0}`);
    
    console.log(`\nTeam Metrics:`);
    console.log(`  - Contributors: ${final.teamMetrics?.contributors || 0}`);
    console.log(`  - Main Contributors: ${final.teamMetrics?.mainContributors?.length || 0}`);
    
    console.log(`\nDocumentation:`);
    console.log(`  - Score: ${final.documentation?.score || 0}/100`);
    console.log(`  - Missing Docs: ${final.documentation?.missing?.length || 0}`);
    
    // Check improvement over previous attempts
    console.log('\n' + '='.repeat(80));
    console.log('✅ IMPROVEMENT ANALYSIS');
    console.log('='.repeat(80));
    
    const improvements = [];
    
    // Previous attempts showed 7-43% completeness
    if (result.completeness > 43) {
      improvements.push(`✅ Completeness improved from 43% to ${result.completeness}%`);
    } else {
      improvements.push(`❌ Completeness still low at ${result.completeness}% (target: >85%)`);
    }
    
    // Previous attempts found 0 issues
    if (final.issues && final.issues.length > 0) {
      improvements.push(`✅ Now finding ${final.issues.length} issues (was 0)`);
    } else {
      improvements.push('❌ Still not finding any issues');
    }
    
    // Check if test coverage is being extracted
    if (final.testCoverage?.overall && final.testCoverage.overall > 0) {
      improvements.push(`✅ Test coverage extracted: ${final.testCoverage.overall}%`);
    } else {
      improvements.push('❌ Test coverage still not extracted properly');
    }
    
    // Check if locations are being found
    const issuesWithLocations = (final.issues || []).filter((i: any) => 
      i.file && i.file !== 'unknown'
    ).length;
    const locationPercentage = final.issues?.length > 0 
      ? Math.round((issuesWithLocations / final.issues.length) * 100)
      : 0;
    
    if (locationPercentage > 50) {
      improvements.push(`✅ ${locationPercentage}% of issues have file locations`);
    } else {
      improvements.push(`❌ Only ${locationPercentage}% of issues have file locations`);
    }
    
    console.log('\n' + improvements.join('\n'));
    
    // Save results for comparison
    const fs = require('fs');
    fs.writeFileSync(
      'adaptive-json-results.json',
      JSON.stringify(result, null, 2)
    );
    console.log('\n💾 Full results saved to: adaptive-json-results.json');
    
  } catch (error: any) {
    console.error('\n❌ Error during analysis:', error.message);
    if (error.response) {
      console.error('Response error:', error.response.data);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('🏁 Test Complete');
  console.log('='.repeat(80));
}

// Run the test
testAdaptiveWithJSON().catch(console.error);