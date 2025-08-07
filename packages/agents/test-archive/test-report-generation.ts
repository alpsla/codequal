#!/usr/bin/env ts-node
/**
 * Test Report Generation with ReportGeneratorV7Complete
 */

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';

async function testReportGeneration() {
  console.log('📄 Testing Report Generation with ReportGeneratorV7Complete\n');
  
  // Use standard ComparisonAgent which uses ReportGeneratorV7Complete by default
  const agent = new ComparisonAgent();
  
  // Create test analysis request
  const testRequest = {
    mainBranchAnalysis: {
      issues: [
        {
          id: 'main-1',
          severity: 'medium' as const,
          category: 'code-quality' as const,
          message: 'Complex function needs refactoring',
          location: { file: 'src/utils.ts', line: 150 }
        }
      ],
      scores: {
        overall: 80,
        security: 85,
        performance: 80,
        maintainability: 75,
        testing: 80
      }
    },
    featureBranchAnalysis: {
      issues: [
        {
          id: 'feature-1',
          severity: 'high' as const,
          category: 'security' as const,
          message: 'Potential XSS vulnerability',
          location: { file: 'src/components/Input.tsx', line: 42 }
        },
        {
          id: 'feature-2',
          severity: 'medium' as const,
          category: 'performance' as const,
          message: 'Inefficient array operation in render',
          location: { file: 'src/components/List.tsx', line: 88 }
        }
      ],
      scores: {
        overall: 72,
        security: 65,
        performance: 70,
        maintainability: 80,
        testing: 75
      }
    },
    prMetadata: {
      id: 'pr-123',
      number: 123,
      title: 'Add new input validation feature',
      description: 'This PR adds input validation to prevent XSS attacks',
      author: 'developer123',
      created_at: new Date().toISOString(),
      repository_url: 'https://github.com/test/repo',
      linesAdded: 250,
      linesRemoved: 50
    },
    generateReport: true
  };
  
  console.log('Analyzing comparison...');
  const result = await agent.analyze(testRequest);
  
  if (result.report) {
    console.log('\n✅ Report generated successfully!\n');
    
    // Validate report sections
    const requiredSections = [
      'Executive Summary',
      'Issue Analysis', 
      'Security Impact',
      'Code Quality',
      'Skill Assessment',
      'Educational Resources',
      'Best Practices',
      'Implementation Guide',
      'Architecture Review',
      'Testing Strategy',
      'Performance Analysis',
      'Recommendations'
    ];
    
    const reportLines = result.report.split('\n');
    const foundSections = requiredSections.filter(section => 
      reportLines.some((line: string) => line.includes(section))
    );
    
    console.log('📊 Report Validation:');
    console.log(`   • Total lines: ${reportLines.length}`);
    console.log(`   • Sections found: ${foundSections.length}/${requiredSections.length}`);
    console.log(`   • PR approval status: ${result.report.includes('APPROVED') || result.report.includes('NEEDS ATTENTION') ? '✅' : '❌'}`);
    console.log(`   • Issues documented: ${result.report.includes('XSS') ? '✅' : '❌'}`);
    console.log(`   • Scores included: ${result.report.includes('72') || result.report.includes('Score') ? '✅' : '❌'}`);
    
    if (foundSections.length === requiredSections.length) {
      console.log('\n🎉 All required sections present!');
    } else {
      const missing = requiredSections.filter(s => !foundSections.includes(s));
      console.log(`\n⚠️  Missing sections: ${missing.join(', ')}`);
    }
    
    // Show a sample of the report
    console.log('\n📋 Report Preview (first 20 lines):');
    console.log('─'.repeat(60));
    console.log(reportLines.slice(0, 20).join('\n'));
    console.log('─'.repeat(60));
    console.log('... (truncated)');
    
  } else {
    console.log('❌ Report generation failed');
  }
  
  console.log('\n✅ Test completed!');
}

// Run test
testReportGeneration().catch(console.error);