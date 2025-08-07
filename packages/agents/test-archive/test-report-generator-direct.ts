#!/usr/bin/env ts-node
/**
 * Direct Report Generator Test
 * 
 * This test directly uses the ReportGeneratorV7Complete with properly structured data
 */

import { ReportGeneratorV7Complete } from './src/standard/comparison/report-generator-v7-complete';
import { ComparisonResult } from './src/standard/types/analysis-types';
import * as fs from 'fs';

async function testDirectReportGeneration() {
  console.log('📄 Testing Direct Report Generation with ReportGeneratorV7Complete\n');
  
  const reportGenerator = new ReportGeneratorV7Complete();
  
  // Create properly structured comparison result
  const comparison: ComparisonResult = {
    success: true,
    comparison: {
      newIssues: [
        {
          id: 'pr-critical-1',
          severity: 'critical',
          category: 'security',
          message: 'Hardcoded API key found in configuration file',
          location: { file: 'src/config/api.ts', line: 15 },
          codeSnippet: `const API_KEY = 'sk-1234567890abcdef';`,
          suggestedFix: `const API_KEY = process.env.REACT_APP_API_KEY;`
        },
        {
          id: 'pr-high-1',
          severity: 'high',
          category: 'security',
          message: 'XSS vulnerability in user input rendering',
          location: { file: 'src/components/UserProfile.tsx', line: 67 },
          codeSnippet: `<div dangerouslySetInnerHTML={{ __html: userData.bio }} />`,
          suggestedFix: `<div>{userData.bio}</div>`
        },
        {
          id: 'pr-medium-1',
          severity: 'medium',
          category: 'performance',
          message: 'Unnecessary re-renders in list component',
          location: { file: 'src/components/ItemList.tsx', line: 23 }
        }
      ],
      fixedIssues: [
        {
          id: 'main-high-1',
          severity: 'high',
          category: 'performance',
          message: 'Memory leak in component lifecycle'
        },
        {
          id: 'main-low-1',
          severity: 'low',
          category: 'code-quality',
          message: 'Inconsistent naming convention'
        }
      ],
      unchangedIssues: [
        {
          id: 'main-critical-1',
          severity: 'critical',
          category: 'security',
          message: 'SQL injection vulnerability in user search',
          age: '3 months'
        },
        {
          id: 'main-medium-1',
          severity: 'medium',
          category: 'code-quality',
          message: 'Complex function with cyclomatic complexity of 20'
        }
      ],
      summary: {
        totalIssues: 5,
        criticalIssues: 2,
        highIssues: 1,
        mediumIssues: 2,
        lowIssues: 0,
        scoreChange: -17,
        improvements: ['Fixed memory leak', 'Improved code consistency'],
        regressions: ['Introduced security vulnerabilities', 'Performance degradation']
      }
    },
    analysis: {
      prMetadata: {
        id: 'pr-1234',
        number: 1234,
        title: 'Add user profile feature with bio support',
        description: 'This PR adds a new user profile page where users can view and edit their bio',
        author: 'johndoe',
        created_at: new Date().toISOString(),
        repository_url: 'https://github.com/facebook/react',
        linesAdded: 450,
        linesRemoved: 120
      },
      decision: 'NEEDS_ATTENTION',
      overallScore: 58,
      scoring: {
        baseScore: 75,
        newIssuesPenalty: 13,
        unfixedIssuesPenalty: 8,
        fixedIssuesBonus: 3,
        improvementBonus: 1,
        finalScore: 58
      },
      mainBranchScore: 75,
      featureBranchScore: 58,
      coverageChange: -11,
      performanceImpact: 'negative',
      securityImpact: 'critical',
      maintainabilityImpact: 'neutral'
    },
    aiAnalysis: {
      repository: 'https://github.com/facebook/react',
      prNumber: 1234,
      prTitle: 'Add user profile feature with bio support',
      author: {
        username: 'johndoe',
        name: 'John Doe'
      },
      modelUsed: 'GPT-4 Turbo',
      scanDuration: 4.5,
      previousScore: 75,
      coverageDecrease: 11,
      vulnerableDependencies: 0,
      skillImpacts: {
        security: -2.5,
        performance: 0.5,
        codeQuality: 0,
        testing: -0.5
      },
      developerProfile: {
        username: 'johndoe',
        teamName: 'Frontend Team',
        historicalPerformance: {
          avgScore: 82,
          totalPRs: 45,
          criticalIssuesIntroduced: 2,
          issuesFixed: 38
        }
      }
    }
  };
  
  console.log('🔍 Generating comprehensive report...');
  
  try {
    const report = reportGenerator.generateMarkdownReport(comparison);
    
    console.log('\n✅ Report generated successfully!\n');
    
    // Save full report
    const reportPath = './direct-generation-report.md';
    fs.writeFileSync(reportPath, report);
    console.log(`💾 Full report saved to: ${reportPath}`);
    
    // Validate all sections
    const requiredSections = [
      '1. Executive Summary',
      '2. Issue Analysis',
      '3. Security Impact Assessment',
      '4. Code Quality Analysis',
      '5. Skill Assessment & Growth',
      '6. Educational Resources',
      '7. Best Practices Alignment',
      '8. Implementation Guide',
      '9. Architecture & Design Review',
      '10. Testing Strategy',
      '11. Performance Analysis',
      '12. Final Recommendations'
    ];
    
    const reportLines = report.split('\n');
    const foundSections = requiredSections.filter(section => 
      reportLines.some(line => line.includes(section))
    );
    
    console.log('\n📊 Report Statistics:');
    console.log(`   • Total lines: ${reportLines.length}`);
    console.log(`   • Report size: ${(report.length / 1024).toFixed(2)} KB`);
    console.log(`   • Sections found: ${foundSections.length}/${requiredSections.length}`);
    
    if (foundSections.length === requiredSections.length) {
      console.log('\n🎉 All required sections present!');
    } else {
      const missing = requiredSections.filter(s => !foundSections.includes(s));
      console.log(`\n⚠️  Missing sections: ${missing.join(', ')}`);
    }
    
    // Show report preview
    console.log('\n📋 Report Preview (first 50 lines):');
    console.log('═'.repeat(80));
    console.log(reportLines.slice(0, 50).join('\n'));
    console.log('═'.repeat(80));
    console.log('... (Full report saved to file)');
    
    // Validate content
    console.log('\n✔️  Content Validation:');
    console.log(`   • Repository info: ${report.includes('facebook/react') ? '✅' : '❌'}`);
    console.log(`   • PR #1234 mentioned: ${report.includes('1234') ? '✅' : '❌'}`);
    console.log(`   • Author (johndoe): ${report.includes('johndoe') || report.includes('John Doe') ? '✅' : '❌'}`);
    console.log(`   • Decision (NEEDS ATTENTION): ${report.includes('NEEDS ATTENTION') ? '✅' : '❌'}`);
    console.log(`   • Score (58/100): ${report.includes('58') ? '✅' : '❌'}`);
    console.log(`   • Critical issues: ${report.includes('Hardcoded API key') ? '✅' : '❌'}`);
    console.log(`   • XSS vulnerability: ${report.includes('XSS vulnerability') ? '✅' : '❌'}`);
    console.log(`   • Fixed issues: ${report.includes('Memory leak') ? '✅' : '❌'}`);
    console.log(`   • Skill impacts: ${report.includes('Security Skills') || report.includes('security skills') ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Error generating report:', error);
  }
  
  console.log('\n✅ Test completed!');
}

// Run the test
console.log('═'.repeat(80));
console.log('   Direct Report Generator Test - Full Feature Demonstration');
console.log('═'.repeat(80));

testDirectReportGeneration().catch(console.error);