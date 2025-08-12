#!/usr/bin/env npx ts-node

/**
 * Final Validation Test - Confirms ALL scoring bugs are fixed
 */

import { ReportGeneratorV7EnhancedComplete } from './src/standard/comparison/report-generator-v7-enhanced-complete';
import { ComparisonResult } from './src/standard/types/analysis-types';

// Color output helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;

interface ValidationResult {
  test: string;
  passed: boolean;
  details: string;
}

async function validateAllFixes(): Promise<void> {
  console.log(bold('\n🔍 VALIDATING ALL SCORING FIXES\n'));
  console.log('=' .repeat(80));
  
  const results: ValidationResult[] = [];
  const generator = new ReportGeneratorV7EnhancedComplete();
  
  // Test 1: Correct scoring system (5/3/1/0.5)
  console.log('\n📊 Test 1: Correct Scoring System (5/3/1/0.5)');
  const scoringTest: ComparisonResult = {
    success: true,
    newIssues: [
      { id: '1', severity: 'critical', category: 'security', message: 'Critical issue', location: { file: 'test.ts', line: 1 } },
      { id: '2', severity: 'high', category: 'security', message: 'High issue', location: { file: 'test.ts', line: 2 } },
      { id: '3', severity: 'medium', category: 'performance', message: 'Medium issue', location: { file: 'test.ts', line: 3 } },
      { id: '4', severity: 'low', category: 'code-quality', message: 'Low issue', location: { file: 'test.ts', line: 4 } }
    ],
    resolvedIssues: [],
    unchangedIssues: [],
    prMetadata: { filesChanged: 10, linesAdded: 100, linesRemoved: 50, author: 'test_user' }
  } as any;
  
  const report1 = await generator.generateReport(scoringTest);
  const hasOldScoring = report1.includes('-20') || report1.includes('-10 pts') || 
                        report1.includes('20 points') || report1.includes('10 points');
  const hasNewScoring = report1.includes('Critical Issues | -5') || 
                        report1.includes('High Issues | -3') ||
                        report1.includes('Critical: 5 points') ||
                        report1.includes('High: 3 points');
  
  results.push({
    test: 'Correct Scoring System',
    passed: !hasOldScoring && hasNewScoring,
    details: hasNewScoring ? '✅ Using 5/3/1/0.5 system' : '❌ Still using old 20/10/5/2 system'
  });
  
  // Test 2: Positive scoring for resolved issues
  console.log('\n🎯 Test 2: Positive Scoring for Resolved Issues');
  const positiveTest: ComparisonResult = {
    success: true,
    newIssues: [],
    resolvedIssues: [
      { id: 'r1', severity: 'critical', category: 'security', message: 'Fixed critical', location: { file: 'test.ts', line: 1 } },
      { id: 'r2', severity: 'high', category: 'security', message: 'Fixed high', location: { file: 'test.ts', line: 2 } }
    ],
    unchangedIssues: [],
    prMetadata: { filesChanged: 5, linesAdded: 20, linesRemoved: 30, author: 'test_user' }
  } as any;
  
  const report2 = await generator.generateReport(positiveTest);
  const hasPositiveScoring = report2.includes('Issues Resolved (Positive)') || 
                             report2.includes('Issues Fixed') ||
                             report2.includes('Critical Issues Fixed | +5');
  
  results.push({
    test: 'Positive Scoring',
    passed: hasPositiveScoring,
    details: hasPositiveScoring ? '✅ Rewards for resolved issues' : '❌ Missing positive scoring'
  });
  
  // Test 3: Code Quality realistic scores
  console.log('\n💯 Test 3: Realistic Code Quality Scores');
  const codeQualityTest: ComparisonResult = {
    success: true,
    newIssues: [
      { id: 'cq1', severity: 'medium', category: 'code-quality', message: 'Code complexity exceeds threshold', location: { file: 'test.ts', line: 100 } }
    ],
    resolvedIssues: [],
    unchangedIssues: [],
    prMetadata: { filesChanged: 15, linesAdded: 100, linesRemoved: 50, testCoverage: 71 },
    mainMetadata: { testCoverage: 82 }
  } as any;
  
  const report3 = await generator.generateReport(codeQualityTest);
  const codeQualityMatch = report3.match(/Code Quality Analysis[\s\S]*?Score: ([\d.]+)\/100/);
  const codeQualityScore = codeQualityMatch ? parseFloat(codeQualityMatch[1]) : 0;
  const isRealistic = codeQualityScore > 50 && codeQualityScore < 100;
  
  results.push({
    test: 'Code Quality Score',
    passed: isRealistic,
    details: isRealistic ? `✅ Realistic score: ${codeQualityScore}/100` : `❌ Unrealistic score: ${codeQualityScore}/100`
  });
  
  // Test 4: New user base score (50/100)
  console.log('\n👤 Test 4: New User Base Score');
  const baseScoreTest: ComparisonResult = {
    success: true,
    newIssues: [
      { id: 'n1', severity: 'low', category: 'security', message: 'Minor issue', location: { file: 'test.ts', line: 1 } }
    ],
    resolvedIssues: [],
    unchangedIssues: [],
    prMetadata: { filesChanged: 1, linesAdded: 10, linesRemoved: 5, author: 'new_user' }
  } as any;
  
  const report4 = await generator.generateReport(baseScoreTest);
  const hasCorrectBase = report4.includes('50/100') && report4.includes('(New User Base)');
  const hasWrongBase = report4.includes('100/100') && report4.includes('(New User Base)');
  
  results.push({
    test: 'New User Base Score',
    passed: hasCorrectBase && !hasWrongBase,
    details: (hasCorrectBase && !hasWrongBase) ? '✅ Base score is 50/100' : '❌ Base score is not 50/100'
  });
  
  // Test 5: Skills tracking
  console.log('\n📈 Test 5: Skills Tracking');
  const skillsTest: ComparisonResult = {
    success: true,
    newIssues: [
      { id: 's1', severity: 'high', category: 'security', message: 'Security issue', location: { file: 'test.ts', line: 1 } },
      { id: 's2', severity: 'medium', category: 'performance', message: 'Performance issue', location: { file: 'test.ts', line: 2 } }
    ],
    resolvedIssues: [],
    unchangedIssues: [
      { id: 'u1', severity: 'low', category: 'code-quality', message: 'Existing issue', location: { file: 'old.ts', line: 50 } }
    ],
    prMetadata: { filesChanged: 10, linesAdded: 100, linesRemoved: 50, author: 'test_user' }
  } as any;
  
  const report5 = await generator.generateReport(skillsTest);
  const hasSkillsTracking = report5.includes('Skills by Category') && 
                            report5.includes('new,') && 
                            report5.includes('existing');
  
  results.push({
    test: 'Skills Tracking',
    passed: hasSkillsTracking,
    details: hasSkillsTracking ? '✅ Tracks new and existing issues' : '❌ Skills tracking incomplete'
  });
  
  // Print results
  console.log('\n' + '=' .repeat(80));
  console.log(bold('\n📋 VALIDATION RESULTS\n'));
  
  let allPassed = true;
  results.forEach(result => {
    const status = result.passed ? green('✅ PASS') : red('❌ FAIL');
    console.log(`${status} - ${result.test}: ${result.details}`);
    if (!result.passed) allPassed = false;
  });
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const percentage = ((passedCount / totalCount) * 100).toFixed(0);
  
  console.log('\n' + '=' .repeat(80));
  console.log(bold('\n🏆 FINAL SCORE\n'));
  
  if (allPassed) {
    console.log(green(bold(`✅ ALL TESTS PASSED! (${passedCount}/${totalCount} - 100%)`)));
    console.log(green('\n🎉 All scoring bugs have been successfully fixed!'));
    console.log(green('The scoring system is now production-ready.\n'));
  } else {
    console.log(red(bold(`❌ SOME TESTS FAILED (${passedCount}/${totalCount} - ${percentage}%)`)));
    console.log(yellow('\n⚠️  Some scoring issues still need to be addressed.\n'));
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run validation
validateAllFixes().catch(console.error);