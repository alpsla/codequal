/**
 * V9 Baseline Test
 * 
 * This test captures the CURRENT WORKING STATE of V9 components
 * It must pass before making any changes
 * 
 * Official implementations being tested:
 * - Base: v9-base-analyzer-refactored.ts
 * - Formatter: v9-report-formatter-complete.ts  
 * - Java: v9-java-analyzer-refactored.ts
 * - PR Comment: v9-pr-comment-generator.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Import EXACTLY what currently works
import { V9JavaAnalyzer } from './src/two-branch/analyzers/v9-java-analyzer-refactored';
import { V9ReportFormatterComplete } from './src/two-branch/analyzers/v9-report-formatter-complete';
import { V9PRCommentGenerator } from './src/two-branch/analyzers/v9-pr-comment-generator';
import { V9ScoringCalculator } from './src/two-branch/analyzers/v9-scoring-calculator';
import { V9IssueComparator } from './src/two-branch/analyzers/v9-issue-comparator';
import { V9BusinessImpact } from './src/two-branch/analyzers/v9-business-impact';
import { V9EducationalResources } from './src/two-branch/analyzers/v9-educational-resources';
import type { Issue, AnalysisResult } from './src/two-branch/analyzers/v9-types';

async function runBaselineTest(): Promise<boolean> {
  console.log('🔍 V9 Baseline Test - Capturing Current Working State');
  console.log('=' .repeat(80));
  
  const results: Record<string, boolean> = {};
  
  try {
    // Test 1: Java Analyzer Creation
    console.log('\n📌 Test 1: Java Analyzer Creation');
    const javaAnalyzer = new V9JavaAnalyzer('V9JavaAnalyzer');
    results['Java Analyzer Creation'] = !!javaAnalyzer;
    console.log('✅ Java analyzer created');
    
    // Test 2: Get Language Config
    console.log('\n📌 Test 2: Language Configuration');
    const config = javaAnalyzer.getLanguageConfig();
    results['Has Language Config'] = !!config && config.name === 'Java';
    console.log(`✅ Language: ${config.name}`);
    console.log(`   Tools: ${config.tools.map(t => t.name).join(', ')}`);
    
    // Test 3: Component Creation
    console.log('\n📌 Test 3: Component Creation');
    const scorer = new V9ScoringCalculator();
    const comparator = new V9IssueComparator();
    const businessImpact = new V9BusinessImpact();
    const educationalResources = new V9EducationalResources();
    const formatter = new V9ReportFormatterComplete();
    const commentGen = new V9PRCommentGenerator();
    
    results['Scoring Calculator'] = !!scorer;
    results['Issue Comparator'] = !!comparator;
    results['Business Impact'] = !!businessImpact;
    results['Educational Resources'] = !!educationalResources;
    results['Report Formatter'] = !!formatter;
    results['PR Comment Generator'] = !!commentGen;
    console.log('✅ All components created successfully');
    
    // Test 4: Data Flow with Mock Data
    console.log('\n📌 Test 4: Data Flow Test');
    
    // Create minimal mock issue
    const mockIssue: Issue = {
      id: 'BASELINE-001',
      category: 'Security',
      severity: 'critical',
      status: 'new' as any,
      title: 'Baseline Test Issue',
      description: 'Test issue for baseline',
      file: 'Test.java',
      line: 100,
      tool: 'baseline-tool',
      agent: 'BaselineAgent',
      impact: 'Test impact',
      businessImpact: 'Test business impact'
    };
    
    // Test scoring
    const score = scorer.calculateQualityScore([mockIssue], [], []);
    results['Score Calculation'] = typeof score === 'number' && score >= 0 && score <= 100;
    console.log(`✅ Score calculated: ${score}/100`);
    
    // Test grade
    const grade = scorer.getGrade(score);
    results['Grade Calculation'] = ['A', 'B', 'C', 'D', 'F'].includes(grade);
    console.log(`✅ Grade calculated: ${grade}`);
    
    // Test issue comparison
    const comparison = await comparator.compareIssues([], [mockIssue], ['Test.java']);
    results['Issue Comparison'] = !!comparison && Array.isArray(comparison.newIssues);
    console.log(`✅ Issues compared: ${comparison.newIssues.length} new issues`);
    
    // Test business impact
    const impact = businessImpact.calculateBusinessImpact([mockIssue], []);
    results['Business Impact'] = !!impact && !!impact.summary;
    console.log('✅ Business impact calculated');
    
    // Test educational resources
    const resources = await educationalResources.getEducationalResources(mockIssue, 'Java');
    results['Educational Resources'] = Array.isArray(resources) && resources.length > 0;
    console.log(`✅ Educational resources: ${resources.length} found`);
    
    // Create mock analysis result
    const mockResult: AnalysisResult = {
      decision: 'rejected',
      confidence: 95,
      reason: 'Baseline test',
      qualityScore: score,
      grade: grade,
      newIssues: [mockIssue],
      existingIssues: [],
      resolvedIssues: [],
      blockingIssues: [mockIssue],
      backlogIssues: [],
      modifiedFiles: ['Test.java'],
      businessImpact: impact,
      skillScore: {
        developer: 'baseline@test.com',
        score: 75,
        trend: [75],
        categories: {
          security: 75,
          performance: 75,
          architecture: 75,
          dependency: 75,
          quality: 75
        },
        recommendations: []
      },
      educationalResources: resources,
      metadata: {
        repository: 'baseline/test',
        prNumber: 1,
        branch: 'main',
        language: 'Java',
        totalFiles: 1,
        modifiedFiles: 1,
        analysisTime: 100,
        tools: ['baseline-tool'],
        timestamp: new Date().toISOString(),
        analyzedAt: new Date().toISOString(),
        analyzer: 'V9',
        repoUrl: 'https://github.com/baseline/test',
        executionTime: 100
      }
    };
    
    // Test 5: Report Generation
    console.log('\n📌 Test 5: Report Generation');
    // Create complete metadata for formatter
    const completeMetadata = {
      ...mockResult.metadata,
      prAuthor: 'Test Author',
      repoOwner: 'test-owner',
      totalLinesOfCode: 1000,
      agentsUsed: [],
      toolsUsed: [],
      totalCost: 0.01
    };
    const report = await formatter.generateCompleteReport(mockResult, completeMetadata as any, 'Java');
    results['Report Generation'] = typeof report === 'string' && report.length > 0;
    console.log(`✅ Report generated: ${report.length} characters`);
    
    // Test 6: PR Comment Generation
    console.log('\n📌 Test 6: PR Comment Generation');
    const comment = await commentGen.generatePRComment(mockResult);
    results['PR Comment'] = typeof comment === 'string' && comment.length > 0;
    console.log(`✅ PR comment generated: ${comment.length} characters`);
    
  } catch (error) {
    console.error('\n❌ Error during baseline test:', error);
    results['Fatal Error'] = false;
    return false;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('📊 BASELINE TEST RESULTS');
  console.log('=' .repeat(80));
  
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(results)) {
    const icon = result ? '✅' : '❌';
    console.log(`${icon} ${test}: ${result ? 'PASS' : 'FAIL'}`);
    if (result) passed++;
    else failed++;
  }
  
  const allPassed = failed === 0;
  
  console.log('\n' + '-' .repeat(40));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  
  if (allPassed) {
    console.log('\n✅ BASELINE ESTABLISHED - Safe to proceed with fixes');
    
    // Save baseline state
    const baselineState = {
      timestamp: new Date().toISOString(),
      passedTests: Object.keys(results).filter(k => results[k]),
      officialImplementations: {
        base: 'v9-base-analyzer-refactored.ts',
        java: 'v9-java-analyzer-refactored.ts',
        formatter: 'v9-report-formatter-complete.ts',
        prComment: 'v9-pr-comment-generator.ts'
      }
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'v9-baseline-state.json'),
      JSON.stringify(baselineState, null, 2)
    );
    console.log('\n📝 Baseline state saved to v9-baseline-state.json');
  } else {
    console.log('\n❌ BASELINE FAILED - Fix these issues before proceeding');
  }
  
  return allPassed;
}

// Run the baseline test
runBaselineTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });