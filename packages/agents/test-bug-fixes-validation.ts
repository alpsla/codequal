/**
 * Comprehensive test to validate all bug fixes (BUG-041 through BUG-051)
 */

import { AdaptiveDeepWikiAnalyzer } from './src/standard/deepwiki/services/adaptive-deepwiki-analyzer';
import { validateConfig, validateAnalysisResult } from './src/standard/deepwiki/schemas/analysis-schema';

async function testBugFixes() {
  console.log('🔍 Validating Bug Fixes BUG-041 through BUG-051\n');
  
  const results: { bug: string; status: 'PASS' | 'FAIL'; message: string }[] = [];
  
  // Test BUG-050: Configuration validation
  console.log('Testing BUG-050: Configuration validation...');
  try {
    // Test invalid config
    try {
      validateConfig({
        deepwikiUrl: 'not-a-url',
        maxIterations: 100, // Too high
        timeout: 5000 // Too low
      });
      results.push({ bug: 'BUG-050', status: 'FAIL', message: 'Invalid config not rejected' });
    } catch (e) {
      // Expected to fail
      results.push({ bug: 'BUG-050', status: 'PASS', message: 'Config validation working' });
    }
    
    // Test valid config
    const validConfig = validateConfig({
      deepwikiUrl: 'http://localhost:8001',
      maxIterations: 3,
      timeout: 300000
    });
    if (validConfig.deepwikiUrl === 'http://localhost:8001') {
      results.push({ bug: 'BUG-050', status: 'PASS', message: 'Valid config accepted' });
    }
  } catch (error) {
    results.push({ bug: 'BUG-050', status: 'FAIL', message: String(error) });
  }
  
  // Test BUG-048: JSON schema validation
  console.log('Testing BUG-048: JSON schema validation...');
  try {
    // Test invalid data
    try {
      validateAnalysisResult({
        issues: [{ 
          // Missing required title/description/message
          severity: 'invalid' // Invalid enum value
        }]
      });
      results.push({ bug: 'BUG-048', status: 'FAIL', message: 'Invalid data not rejected' });
    } catch (e) {
      results.push({ bug: 'BUG-048', status: 'PASS', message: 'Schema validation working' });
    }
    
    // Test valid data
    const validResult = validateAnalysisResult({
      issues: [{
        title: 'Test Issue',
        severity: 'high',
        category: 'security'
      }],
      testCoverage: { overall: 80 }
    });
    if (validResult.issues.length === 1) {
      results.push({ bug: 'BUG-048', status: 'PASS', message: 'Valid data accepted' });
    }
  } catch (error) {
    results.push({ bug: 'BUG-048', status: 'FAIL', message: String(error) });
  }
  
  // Create analyzer with valid config
  const analyzer = new AdaptiveDeepWikiAnalyzer(
    'http://localhost:8001',
    'test-key',
    console,
    { maxIterations: 2, timeout: 60000 }
  );
  
  // Test BUG-041: Complex PR data merging
  console.log('Testing BUG-041: Complex PR data merging...');
  try {
    const existing = {
      issues: [
        { title: 'Issue 1', file: 'file1.ts', line: 10 },
        { title: 'Issue 2', description: 'Test issue' }
      ],
      testCoverage: { overall: 70, unit: 60 },
      dependencies: { 
        outdated: [{ name: 'lib1', current: '1.0.0' }]
      }
    };
    
    const newData = {
      issues: [
        { title: 'Issue 1', severity: 'high' }, // Should merge
        { title: 'Issue 3', file: 'file3.ts', line: 30 } // Should add
      ],
      testCoverage: { overall: 80, integration: 90 },
      dependencies: {
        outdated: [
          { name: 'lib1', latest: '2.0.0' }, // Should merge
          { name: 'lib2', current: '1.0.0' } // Should add
        ]
      }
    };
    
    const merged = (analyzer as any).mergeResults(existing, newData);
    
    // Validate merging
    if (
      merged.issues.length === 3 && // 2 original + 1 new
      merged.issues[0].severity === 'high' && // Merged field
      merged.issues[0].file === 'file1.ts' && // Preserved field
      merged.testCoverage.overall === 80 && // Higher value kept
      merged.testCoverage.unit === 60 && // Preserved
      merged.testCoverage.integration === 90 && // Added
      merged.dependencies.outdated.length === 2 && // Deduplicated
      merged.dependencies.outdated[0].latest === '2.0.0' // Merged
    ) {
      results.push({ bug: 'BUG-041', status: 'PASS', message: 'Complex merging working' });
    } else {
      results.push({ bug: 'BUG-041', status: 'FAIL', message: 'Merge logic incorrect' });
    }
  } catch (error) {
    results.push({ bug: 'BUG-041', status: 'FAIL', message: String(error) });
  }
  
  // Test BUG-047: Infinite loop prevention
  console.log('Testing BUG-047: Infinite loop prevention...');
  try {
    // Mock the gapAnalyzer to simulate no progress
    const mockAnalyzer = new AdaptiveDeepWikiAnalyzer(
      'http://localhost:8001',
      'test-key',
      { info: () => {}, warn: () => {}, error: () => {} }, // Silent logger
      { maxIterations: 5 }
    );
    
    // Override methods to simulate no progress scenario
    (mockAnalyzer as any).gapAnalyzer = {
      analyzeGaps: () => ({ totalGaps: 10, criticalGaps: 2, completeness: 50, gaps: [] }),
      isComplete: () => false
    };
    
    (mockAnalyzer as any).callDeepWiki = async () => '{"issues": []}';
    (mockAnalyzer as any).parseResponse = async () => ({ issues: [] });
    
    // Should stop after MAX_NO_PROGRESS iterations
    const startTime = Date.now();
    try {
      await mockAnalyzer.analyzeWithGapFilling('https://github.com/test/repo');
      const duration = Date.now() - startTime;
      
      // Should complete quickly (not stuck in infinite loop)
      if (duration < 5000) {
        results.push({ bug: 'BUG-047', status: 'PASS', message: 'Loop prevention working' });
      } else {
        results.push({ bug: 'BUG-047', status: 'FAIL', message: 'Took too long' });
      }
    } catch (e) {
      // Expected to fail with no progress
      results.push({ bug: 'BUG-047', status: 'PASS', message: 'Stopped on no progress' });
    }
  } catch (error) {
    results.push({ bug: 'BUG-047', status: 'FAIL', message: String(error) });
  }
  
  // Test BUG-043 & BUG-049: Error handling and messages
  console.log('Testing BUG-043 & BUG-049: Error handling...');
  try {
    const errorAnalyzer = new AdaptiveDeepWikiAnalyzer(
      'http://invalid-url:8001',
      'test-key',
      { info: () => {}, warn: () => {}, error: () => {} }
    );
    
    try {
      await errorAnalyzer.analyzeWithGapFilling('https://github.com/test/repo');
      results.push({ bug: 'BUG-043', status: 'FAIL', message: 'Should have thrown error' });
    } catch (error: any) {
      // Check for improved error message
      if (error.message.includes('DeepWiki analysis failed')) {
        results.push({ bug: 'BUG-043', status: 'PASS', message: 'Error handling working' });
        
        // BUG-049: Check error message quality
        if (error.message.includes('test/repo')) {
          results.push({ bug: 'BUG-049', status: 'PASS', message: 'Descriptive error messages' });
        } else {
          results.push({ bug: 'BUG-049', status: 'FAIL', message: 'Error lacks context' });
        }
      } else {
        results.push({ bug: 'BUG-043', status: 'FAIL', message: 'Poor error handling' });
      }
    }
  } catch (error) {
    results.push({ bug: 'BUG-043', status: 'FAIL', message: String(error) });
  }
  
  // Test BUG-051: Resource cleanup (check for abort controller)
  console.log('Testing BUG-051: Resource cleanup...');
  try {
    // Check if callDeepWiki method has abort controller logic
    const sourceCode = analyzer.constructor.toString();
    if (sourceCode.includes('abortController') || sourceCode.includes('AbortController')) {
      results.push({ bug: 'BUG-051', status: 'PASS', message: 'Abort controller present' });
    } else {
      // Check in instance methods
      const methodCode = (analyzer as any).callDeepWiki.toString();
      if (methodCode.includes('abort') && methodCode.includes('clearTimeout')) {
        results.push({ bug: 'BUG-051', status: 'PASS', message: 'Resource cleanup implemented' });
      } else {
        results.push({ bug: 'BUG-051', status: 'FAIL', message: 'No cleanup logic found' });
      }
    }
  } catch (error) {
    results.push({ bug: 'BUG-051', status: 'FAIL', message: String(error) });
  }
  
  // Print results summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BUG FIX VALIDATION RESULTS');
  console.log('='.repeat(60) + '\n');
  
  const bugGroups = new Map<string, typeof results>();
  results.forEach(result => {
    if (!bugGroups.has(result.bug)) {
      bugGroups.set(result.bug, []);
    }
    bugGroups.get(result.bug)!.push(result);
  });
  
  let totalPass = 0;
  let totalFail = 0;
  
  bugGroups.forEach((tests, bug) => {
    const passed = tests.every(t => t.status === 'PASS');
    const icon = passed ? '✅' : '❌';
    
    console.log(`${icon} ${bug}: ${passed ? 'FIXED' : 'FAILED'}`);
    tests.forEach(test => {
      console.log(`   ${test.status === 'PASS' ? '✓' : '✗'} ${test.message}`);
      if (test.status === 'PASS') totalPass++;
      else totalFail++;
    });
    console.log('');
  });
  
  console.log('='.repeat(60));
  console.log(`SUMMARY: ${totalPass} passed, ${totalFail} failed`);
  
  const allFixed = [
    'BUG-041', 'BUG-043', 'BUG-047', 'BUG-048', 
    'BUG-049', 'BUG-050', 'BUG-051'
  ];
  
  const fixed = allFixed.filter(bug => 
    bugGroups.get(bug)?.every(t => t.status === 'PASS')
  );
  
  console.log(`\n🎯 Fixed ${fixed.length}/${allFixed.length} bugs:`);
  fixed.forEach(bug => console.log(`   ✅ ${bug}`));
  
  const remaining = allFixed.filter(bug => !fixed.includes(bug));
  if (remaining.length > 0) {
    console.log(`\n⚠️ Still needs work:`);
    remaining.forEach(bug => console.log(`   ❌ ${bug}`));
  } else {
    console.log('\n🎉 ALL BUGS FIXED!');
  }
}

testBugFixes().catch(console.error);