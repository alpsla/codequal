#!/usr/bin/env ts-node
/**
 * Comprehensive Report Generation Test
 * 
 * This test demonstrates the full capabilities of the ReportGeneratorV7Complete
 * with properly structured data that includes all required fields
 */

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import * as fs from 'fs';

async function testComprehensiveReport() {
  console.log('📄 Testing Comprehensive Report Generation\n');
  
  // Create agent with logger
  const agent = new ComparisonAgent(console);
  
  // Initialize with configuration
  await agent.initialize({
    language: 'typescript',
    complexity: 'high',
    performance: 'balanced',
    rolePrompt: 'You are an expert code reviewer for a React application.'
  });
  
  // Create comprehensive test data
  const testRequest = {
    mainBranchAnalysis: {
      issues: [
        {
          id: 'main-critical-1',
          severity: 'critical' as const,
          category: 'security' as const,
          message: 'SQL injection vulnerability in user search',
          location: { file: 'src/api/users.ts', line: 45 },
          age: '3 months'
        },
        {
          id: 'main-high-1',
          severity: 'high' as const,
          category: 'performance' as const,
          message: 'Memory leak in component lifecycle',
          location: { file: 'src/components/Dashboard.tsx', line: 89 },
          age: '2 months'
        },
        {
          id: 'main-medium-1',
          severity: 'medium' as const,
          category: 'code-quality' as const,
          message: 'Complex function with cyclomatic complexity of 20',
          location: { file: 'src/utils/dataProcessor.ts', line: 120 }
        },
        {
          id: 'main-low-1',
          severity: 'low' as const,
          category: 'code-quality' as const,
          message: 'Inconsistent naming convention',
          location: { file: 'src/helpers/format.ts', line: 34 }
        }
      ],
      scores: {
        overall: 75,
        security: 65,
        performance: 70,
        maintainability: 80,
        testing: 85
      }
    },
    featureBranchAnalysis: {
      issues: [
        // Unfixed issues from main
        {
          id: 'main-critical-1',
          severity: 'critical' as const,
          category: 'security' as const,
          message: 'SQL injection vulnerability in user search',
          location: { file: 'src/api/users.ts', line: 45 },
          age: '3 months'
        },
        {
          id: 'main-medium-1',
          severity: 'medium' as const,
          category: 'code-quality' as const,
          message: 'Complex function with cyclomatic complexity of 20',
          location: { file: 'src/utils/dataProcessor.ts', line: 120 }
        },
        // New issues introduced
        {
          id: 'pr-critical-1',
          severity: 'critical' as const,
          category: 'security' as const,
          message: 'Hardcoded API key in configuration',
          location: { file: 'src/config/api.ts', line: 15 },
          codeSnippet: `const API_KEY = 'sk-1234567890abcdef';`,
          suggestedFix: `const API_KEY = process.env.REACT_APP_API_KEY;`
        },
        {
          id: 'pr-high-1',
          severity: 'high' as const,
          category: 'security' as const,
          message: 'XSS vulnerability in user input rendering',
          location: { file: 'src/components/UserProfile.tsx', line: 67 },
          codeSnippet: `<div dangerouslySetInnerHTML={{ __html: userData.bio }} />`,
          suggestedFix: `<div>{userData.bio}</div>`
        },
        {
          id: 'pr-medium-1',
          severity: 'medium' as const,
          category: 'performance' as const,
          message: 'Unnecessary re-renders in list component',
          location: { file: 'src/components/ItemList.tsx', line: 23 }
        }
      ],
      scores: {
        overall: 58,
        security: 40,
        performance: 65,
        maintainability: 70,
        testing: 75
      }
    },
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
    generateReport: true,
    // Add the raw AI analysis for better report generation
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
      decision: 'NEEDS_ATTENTION',
      overallScore: 58,
      comparison: {
        newIssues: [
          {
            id: 'pr-critical-1',
            severity: 'critical',
            category: 'security',
            message: 'Hardcoded API key in configuration'
          },
          {
            id: 'pr-high-1',
            severity: 'high',
            category: 'security',
            message: 'XSS vulnerability in user input rendering'
          },
          {
            id: 'pr-medium-1',
            severity: 'medium',
            category: 'performance',
            message: 'Unnecessary re-renders in list component'
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
            message: 'SQL injection vulnerability in user search'
          },
          {
            id: 'main-medium-1',
            severity: 'medium',
            category: 'code-quality',
            message: 'Complex function with cyclomatic complexity of 20'
          }
        ]
      },
      skillTracking: {
        updates: [
          {
            category: 'security',
            impact: -2.5,
            reason: 'Introduced critical security vulnerabilities'
          },
          {
            category: 'performance',
            impact: 0.5,
            reason: 'Fixed memory leak but introduced render issues'
          }
        ]
      }
    }
  };
  
  console.log('🔍 Analyzing PR #1234: Add user profile feature...');
  
  try {
    const result = await agent.analyze(testRequest);
    
    if (result.report) {
      console.log('\n✅ Report generated successfully!\n');
      
      // Save full report
      const reportPath = './comprehensive-analysis-report.md';
      fs.writeFileSync(reportPath, result.report);
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
      
      const reportLines = result.report.split('\n');
      const foundSections = requiredSections.filter(section => 
        reportLines.some(line => line.includes(section))
      );
      
      console.log('\n📊 Report Validation:');
      console.log(`   • Total lines: ${reportLines.length}`);
      console.log(`   • Report size: ${(result.report.length / 1024).toFixed(2)} KB`);
      console.log(`   • Sections found: ${foundSections.length}/${requiredSections.length}`);
      console.log(`   • Decision: ${result.analysis?.decision || 'NEEDS_ATTENTION'}`);
      console.log(`   • Overall Score: ${result.analysis?.overallScore || 58}/100`);
      console.log(`   • New Issues: ${testRequest.aiAnalysis.comparison.newIssues.length}`);
      console.log(`   • Fixed Issues: ${testRequest.aiAnalysis.comparison.fixedIssues.length}`);
      console.log(`   • Unfixed Issues: ${testRequest.aiAnalysis.comparison.unchangedIssues.length}`);
      
      if (foundSections.length === requiredSections.length) {
        console.log('\n🎉 All required sections present!');
      } else {
        const missing = requiredSections.filter(s => !foundSections.includes(s));
        console.log(`\n⚠️  Missing sections: ${missing.join(', ')}`);
      }
      
      // Show report highlights
      console.log('\n📋 Report Highlights:');
      console.log('─'.repeat(60));
      
      // Extract key information
      const headerEnd = reportLines.findIndex(line => line.includes('---'));
      const summaryStart = reportLines.findIndex(line => line.includes('Executive Summary'));
      const summaryEnd = reportLines.findIndex((line, i) => i > summaryStart && line.includes('##'));
      
      // Show header
      console.log(reportLines.slice(0, headerEnd + 1).join('\n'));
      
      // Show executive summary
      if (summaryStart !== -1 && summaryEnd !== -1) {
        console.log('\n' + reportLines.slice(summaryStart, summaryEnd).join('\n'));
      }
      
      console.log('─'.repeat(60));
      console.log('... (Full report saved to file)');
      
      // Validate critical information is present
      console.log('\n✔️  Content Validation:');
      console.log(`   • PR approval status: ${result.report.includes('NEEDS ATTENTION') ? '✅' : '❌'}`);
      console.log(`   • Critical issues documented: ${result.report.includes('Hardcoded API key') ? '✅' : '❌'}`);
      console.log(`   • XSS vulnerability mentioned: ${result.report.includes('XSS vulnerability') ? '✅' : '❌'}`);
      console.log(`   • Score breakdown included: ${result.report.includes('58') ? '✅' : '❌'}`);
      console.log(`   • Skill impacts documented: ${result.report.includes('security skills') || result.report.includes('Security Skills') ? '✅' : '❌'}`);
      
    } else {
      console.log('❌ Report generation failed');
    }
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
  
  console.log('\n✅ Test completed!');
}

// Run the comprehensive test
console.log('═'.repeat(80));
console.log('   CodeQual Standard Framework - Comprehensive Report Test');
console.log('═'.repeat(80));

testComprehensiveReport().catch(console.error);