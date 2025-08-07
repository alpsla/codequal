#!/usr/bin/env ts-node
/**
 * Test Report Generation with Mock Data
 * 
 * This script demonstrates generating a comprehensive analysis report
 * using the Standard framework with mock data (no external dependencies)
 */

import { createTestOrchestrator } from './src/standard/infrastructure/factory';
import { ComparisonAnalysisRequest } from './src/standard/types/analysis-types';
import * as fs from 'fs';

async function generateMockDataReport() {
  console.log('🚀 Generating Analysis Report with Mock Data\n');
  
  try {
    // Create test orchestrator (no external dependencies)
    console.log('📊 Creating test orchestrator...');
    const orchestrator = await createTestOrchestrator({
      logger: console
    });
    
    // Prepare comprehensive analysis request
    const analysisRequest: ComparisonAnalysisRequest = {
      userId: 'user-456',
      teamId: 'team-789',
      generateReport: true,
      includeEducation: true,
      
      prMetadata: {
        id: 'pr-27000',
        number: 27000,
        title: 'Add new search functionality with security improvements',
        description: 'This PR adds a new search feature to find users by name with proper input validation and authentication',
        author: 'johndoe',
        created_at: new Date().toISOString(),
        repository_url: 'https://github.com/facebook/react',
        linesAdded: 450,
        linesRemoved: 120
      },
      
      mainBranchAnalysis: {
        id: 'analysis-main-123',
        metadata: {
          repositoryUrl: 'https://github.com/facebook/react',
          files_analyzed: 250,
          total_lines: 15000,
          scan_duration: 45
        }
        issues: [
          {
            id: 'repo-critical-1',
            severity: 'critical' as const,
            category: 'security' as const,
            message: 'Hardcoded API credentials found in configuration',
            location: { file: 'src/config/database.ts', line: 45 },
            age: '6 months',
            codeSnippet: `const dbConfig = {
  host: 'prod.database.com',
  user: 'admin',
  password: 'P@ssw0rd123' // CRITICAL: Hardcoded password
};`,
            suggestedFix: `const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};`,
          },
          {
            id: 'repo-high-1',
            severity: 'high' as const,
            category: 'performance' as const,
            message: 'N+1 query pattern detected in user data fetching',
            location: { file: 'src/services/userService.ts', line: 120 },
            age: '3 months',
            codeSnippet: `users.forEach(async (user) => {
  user.profile = await Profile.findOne({ userId: user.id });
});`
          },
          {
            id: 'repo-medium-1',
            severity: 'medium' as const,
            category: 'code-quality' as const,
            message: 'Complex function with cyclomatic complexity of 15',
            location: { file: 'src/utils/dataProcessor.ts', line: 200 },
            age: '2 months'
          },
          {
            id: 'repo-medium-2',
            severity: 'medium' as const,
            category: 'code-quality' as const,
            message: 'Missing test coverage for error handling paths',
            location: { file: 'src/api/endpoints.ts', line: 89 },
            age: '1 month'
          },
          {
            id: 'repo-low-1',
            severity: 'low' as const,
            category: 'code-quality' as const,
            message: 'Inconsistent naming convention for variables',
            location: { file: 'src/helpers/formatter.ts', line: 34 },
            age: '2 weeks'
          }
        ],
        metrics: {
          testCoverage: 82,
          buildTime: 120,
          bundleSize: 2.5,
          codeComplexity: 3.2,
          technicalDebt: 4.5
        }
      },
      
      featureBranchAnalysis: {
        id: 'analysis-feature-456',
        metadata: {
          repositoryUrl: 'https://github.com/facebook/react',
          files_analyzed: 260,
          total_lines: 15500,
          scan_duration: 50
        },
        issues: [
          // Unfixed issues from main branch
          {
            id: 'repo-critical-1',
            severity: 'critical' as const,
            category: 'security' as const,
            message: 'Hardcoded API credentials found in configuration',
            location: { file: 'src/config/database.ts', line: 45 },
            age: '6 months'
          },
          {
            id: 'repo-high-1',
            severity: 'high' as const,
            category: 'performance' as const,
            message: 'N+1 query pattern detected in user data fetching',
            location: { file: 'src/services/userService.ts', line: 120 },
            age: '3 months'
          },
          {
            id: 'repo-medium-1',
            severity: 'medium' as const,
            category: 'code-quality' as const,
            message: 'Complex function with cyclomatic complexity of 15',
            location: { file: 'src/utils/dataProcessor.ts', line: 200 },
            age: '2 months'
          },
          {
            id: 'repo-low-1',
            severity: 'low' as const,
            category: 'code-quality' as const,
            message: 'Inconsistent naming convention for variables',
            location: { file: 'src/helpers/formatter.ts', line: 34 },
            age: '2 weeks'
          },
          // New issues introduced in PR
          {
            id: 'pr-critical-1',
            severity: 'critical' as const,
            category: 'security' as const,
            message: 'SQL injection vulnerability in new search feature',
            location: { file: 'src/api/search.ts', line: 35 },
            codeSnippet: `const query = \`SELECT * FROM users WHERE name LIKE '%\${searchTerm}%'\`;`,
            suggestedFix: `const query = 'SELECT * FROM users WHERE name LIKE ?';
const params = [\`%\${searchTerm}%\`];`,
          },
          {
            id: 'pr-high-1',
            severity: 'high' as const,
            category: 'security' as const,
            message: 'Missing authentication on new admin endpoint',
            location: { file: 'src/api/admin.ts', line: 15 },
            codeSnippet: `router.get('/admin/users', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});`,
            suggestedFix: `router.get('/admin/users', authenticate, authorize('admin'), async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});`
          },
          {
            id: 'pr-medium-1',
            severity: 'medium' as const,
            category: 'performance' as const,
            message: 'Unbounded query results in search endpoint',
            location: { file: 'src/api/search.ts', line: 50 },
            codeSnippet: `const results = await User.find({ name: { $regex: searchTerm } });`,
            suggestedFix: `const results = await User.find({ name: { $regex: searchTerm } }).limit(100);`
          }
        ],
        metrics: {
          testCoverage: 71, // Decreased from 82%
          buildTime: 145,
          bundleSize: 2.8,
          codeComplexity: 3.8,
          technicalDebt: 5.2
        }
      },
      
      filesChanged: 15,
      linesChanged: 570
    };
    
    console.log('\n🔍 Analyzing pull request...');
    console.log(`   Repository: ${analysisRequest.prMetadata?.repository_url || 'N/A'}`);
    console.log(`   PR Number: #${analysisRequest.prMetadata?.number || 'N/A'}`);
    console.log(`   Author: ${analysisRequest.prMetadata?.author || 'N/A'}`);
    console.log(`   Files Changed: ${analysisRequest.filesChanged}`);
    console.log(`   Lines Changed: ${analysisRequest.linesChanged}`);
    
    // Perform analysis
    const startTime = Date.now();
    const result = await orchestrator.executeComparison(analysisRequest);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`\n✅ Analysis completed in ${duration.toFixed(2)}s`);
    
    // Display results
    if (result.report) {
      console.log('\n📄 Generated Report Preview:');
      console.log('═'.repeat(80));
      
      // Show first 80 lines of the report
      const reportLines = result.report.split('\n');
      console.log(reportLines.slice(0, 80).join('\n'));
      
      if (reportLines.length > 80) {
        console.log('\n... (Report continues for ' + (reportLines.length - 80) + ' more lines)');
      }
      
      console.log('═'.repeat(80));
      
      // Save full report to file
      const reportPath = './sample-analysis-report.md';
      fs.writeFileSync(reportPath, result.report);
      console.log(`\n💾 Full report saved to: ${reportPath}`);
      
      // Display summary statistics
      console.log('\n📊 Report Statistics:');
      console.log(`   • Total lines: ${reportLines.length}`);
      console.log(`   • Report size: ${(result.report.length / 1024).toFixed(2)} KB`);
      console.log(`   • Decision: ${result.analysis?.decision || 'N/A'}`);
      console.log(`   • Overall Score: ${result.analysis?.overallScore || 'N/A'}/100`);
      console.log(`   • New Issues: ${result.analysis?.comparison?.newIssues?.length || 0}`);
      console.log(`   • Fixed Issues: ${result.analysis?.comparison?.fixedIssues?.length || 0}`);
      console.log(`   • Unfixed Issues: ${result.analysis?.comparison?.unchangedIssues?.length || 0}`);
      
      // Display scoring breakdown
      const scoring = result.analysis?.scoring;
      if (scoring) {
        console.log('\n💯 Scoring Breakdown:');
        console.log(`   • Base Score: ${scoring.baseScore}/100`);
        console.log(`   • New Issues Penalty: -${scoring.newIssuesPenalty}`);
        console.log(`   • Unfixed Issues Penalty: -${scoring.unfixedIssuesPenalty}`);
        console.log(`   • Fixed Issues Bonus: +${scoring.fixedIssuesBonus}`);
        console.log(`   • Improvement Bonus: +${scoring.improvementBonus}`);
        console.log(`   • Final Score: ${scoring.finalScore}/100`);
      }
      
      // Display skill tracking info
      if (result.skillTracking) {
        console.log('\n👤 Developer Skill Tracking:');
        console.log(`   • Updates processed: ${result.skillTracking.updates?.length || 0}`);
        console.log(`   • Team skills available: ${result.skillTracking.teamSkills ? 'Yes' : 'No'}`);
        if (result.skillTracking.updates && result.skillTracking.updates.length > 0) {
          const update = result.skillTracking.updates[0];
          console.log(`   • Categories affected: ${Object.keys(update.categoryScores).join(', ')}`);
        }
      }
      
      // Validate all 12 sections are present
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
      
      console.log('\n✔️  Report Validation:');
      const foundSections = requiredSections.filter(section => 
        result.report!.includes(section)
      );
      console.log(`   • Sections present: ${foundSections.length}/${requiredSections.length}`);
      
      if (foundSections.length < requiredSections.length) {
        const missing = requiredSections.filter(s => !foundSections.includes(s));
        console.log(`   • Missing sections: ${missing.join(', ')}`);
      } else {
        console.log('   • All required sections present ✅');
      }
      
    } else {
      console.log('\n❌ No report generated');
    }
    
  } catch (error) {
    console.error('\n❌ Error generating report:', error);
    process.exit(1);
  }
}

// Run the test
console.log('═'.repeat(80));
console.log('   CodeQual Standard Framework - Mock Data Report Generation');
console.log('═'.repeat(80));

generateMockDataReport()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });