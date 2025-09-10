/**
 * V9 Architecture Validation Test
 * 
 * Run this test to validate the V9 architecture is working correctly
 * This ensures all components are using the correct implementations
 */

import { 
  V9AnalyzerFactory, 
  V9ReportFormatter, 
  V9PRCommentGenerator,
  V9ScoringCalculator,
  V9IssueComparator,
  V9BusinessImpact,
  V9EducationalResources,
  V9_VERSION,
  type AnalysisResult,
  type Issue
} from './src/two-branch/analyzers';

async function validateV9Architecture() {
  console.log('🔍 V9 Architecture Validation Test');
  console.log(`📌 Version: ${V9_VERSION}`);
  console.log('=' .repeat(80));
  
  const testResults: Record<string, boolean> = {};
  
  try {
    // Test 1: Factory creates analyzer
    console.log('\n✅ Test 1: Factory Pattern');
    const analyzer = V9AnalyzerFactory.create('java');
    testResults['Factory creates analyzer'] = !!analyzer;
    console.log('   - Analyzer created:', analyzer.constructor.name);
    
    // Test 2: Analyzer has correct structure
    console.log('\n✅ Test 2: Analyzer Structure');
    const config = analyzer.getLanguageConfig();
    testResults['Has language config'] = !!config;
    testResults['Has tools array'] = Array.isArray(config.tools);
    console.log('   - Language:', config.name);
    console.log('   - Tools:', config.tools.map(t => t.name).join(', '));
    
    // Test 3: All components instantiate
    console.log('\n✅ Test 3: Component Instantiation');
    const components = {
      'Scoring Calculator': new V9ScoringCalculator(),
      'Issue Comparator': new V9IssueComparator(),
      'Business Impact': new V9BusinessImpact(),
      'Educational Resources': new V9EducationalResources(),
      'Report Formatter': new V9ReportFormatter(),
      'PR Comment Generator': new V9PRCommentGenerator()
    };
    
    for (const [name, component] of Object.entries(components)) {
      testResults[name] = !!component;
      console.log(`   - ${name}: ✓`);
    }
    
    // Test 4: Data flow works
    console.log('\n✅ Test 4: Data Flow');
    
    // Create mock issue
    const mockIssue: Issue = {
      id: 'TEST-001',
      category: 'Security',
      severity: 'critical',
      status: 'new' as any,
      title: 'Test Security Issue',
      description: 'Test description',
      file: 'test.java',
      line: 100,
      tool: 'test-tool',
      agent: 'TestAgent',
      impact: 'High impact',
      businessImpact: 'Critical business impact',
      inModifiedFile: true
    };
    
    // Test scoring
    const score = components['Scoring Calculator'].calculateQualityScore([mockIssue], [], []);
    testResults['Score calculation'] = score >= 0 && score <= 100;
    console.log(`   - Quality Score: ${score}/100`);
    
    // Test issue comparison
    const comparison = await components['Issue Comparator'].compareIssues([], [mockIssue], ['test.java']);
    testResults['Issue comparison'] = !!comparison.newIssues;
    console.log(`   - New Issues: ${comparison.newIssues.length}`);
    
    // Test business impact
    const impact = components['Business Impact'].calculateBusinessImpact([mockIssue], []);
    testResults['Business impact'] = !!impact.summary;
    console.log(`   - Risk Level: ${impact.immediateRisk}`);
    
    // Test educational resources
    const resources = await components['Educational Resources'].getEducationalResources(mockIssue, 'Java');
    testResults['Educational resources'] = resources.length > 0;
    console.log(`   - Resources Found: ${resources.length}`);
    
    // Create mock analysis result
    const mockResult: AnalysisResult = {
      decision: score >= 70 ? 'approved' : 'rejected',
      confidence: 95,
      reason: 'Test validation',
      qualityScore: score,
      grade: components['Scoring Calculator'].getGrade(score),
      newIssues: [mockIssue],
      existingIssues: [],
      resolvedIssues: [],
      blockingIssues: [mockIssue],
      backlogIssues: [],
      modifiedFiles: ['test.java'],
      businessImpact: impact,
      skillScore: {
        developer: 'test@example.com',
        score: 75,
        trend: [70, 75],
        categories: {
          security: 70,
          performance: 75,
          architecture: 80,
          dependency: 75,
          quality: 80
        },
        recommendations: []
      },
      educationalResources: resources,
      metadata: {
        repository: 'test/repo',
        prNumber: 1,
        branch: 'main',
        language: 'Java',
        totalFiles: 10,
        modifiedFiles: 1,
        analysisTime: 1000,
        tools: ['test-tool'],
        timestamp: new Date().toISOString(),
        analyzedAt: new Date().toISOString(),
        analyzer: 'V9',
        repoUrl: 'https://github.com/test/repo',
        executionTime: 1000
      }
    };
    
    // Test report generation
    const report = await (components['Report Formatter'] as any).generateCompleteReport(mockResult, 'Java');
    testResults['Report generation'] = report.includes('V9 Code Quality Analysis Report');
    console.log(`   - Report Length: ${report.length} characters`);
    
    // Test PR comment generation
    const comment = await components['PR Comment Generator'].generatePRComment(mockResult);
    testResults['PR comment generation'] = comment.includes('PR Status');
    console.log(`   - Comment Length: ${comment.length} characters`);
    
    // Test 5: Singleton pattern works
    console.log('\n✅ Test 5: Singleton Pattern');
    const analyzer2 = V9AnalyzerFactory.create('java');
    testResults['Singleton reuse'] = analyzer === analyzer2;
    console.log(`   - Same instance: ${analyzer === analyzer2}`);
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    testResults['Fatal error'] = false;
  }
  
  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(80));
  
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(testResults)) {
    const icon = result ? '✅' : '❌';
    console.log(`${icon} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
    if (result) passed++;
    else failed++;
  }
  
  console.log('\n' + '-' .repeat(40));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! V9 architecture is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please fix the issues before proceeding.');
  }
  
  return failed === 0;
}

// Run the validation
validateV9Architecture()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });