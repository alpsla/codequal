#!/usr/bin/env npx ts-node

import { ReportGeneratorV8Final } from '../comparison/report-generator-v8-final';
import { ComparisonResult } from '../types/analysis-types';

async function testIssueCount() {
  console.log('🧪 Testing V8 Report Generator Issue Counting (BUG-059)\n');
  
  const generator = new ReportGeneratorV8Final();
  
  // Create test data with multiple issues
  const testAnalysisResult: ComparisonResult = {
    success: true,
    newIssues: [
      {
        type: 'security',
        severity: 'critical',
        category: 'security',
        message: 'SQL Injection vulnerability',
        location: { file: 'api/db.ts', line: 42 }
      },
      {
        type: 'security',
        severity: 'high',
        category: 'security',
        message: 'Hardcoded API key',
        location: { file: 'config.ts', line: 10 }
      },
      {
        type: 'performance',
        severity: 'medium',
        category: 'performance',
        message: 'N+1 query detected',
        location: { file: 'services/user.ts', line: 156 }
      },
      {
        type: 'bug',
        severity: 'low',
        category: 'bug',
        message: 'Missing null check',
        location: { file: 'utils/parser.ts', line: 89 }
      }
    ],
    unchangedIssues: [
      {
        type: 'style',
        severity: 'low',
        category: 'style',
        message: 'Inconsistent naming convention',
        location: { file: 'old-code.ts', line: 5 }
      }
    ],
    resolvedIssues: [
      {
        type: 'security',
        severity: 'high',
        category: 'security',
        message: 'XSS vulnerability fixed',
        location: { file: 'views/template.ts', line: 23 }
      },
      {
        type: 'bug',
        severity: 'medium',
        category: 'bug',
        message: 'Race condition fixed',
        location: { file: 'async/handler.ts', line: 45 }
      }
    ]
  };
  
  // Add metadata
  (testAnalysisResult as any).prMetadata = {
    prNumber: 123,
    prTitle: 'Test PR',
    repository: 'test/repo',
    author: 'testuser',
    branch: 'feature-test',
    targetBranch: 'main',
    filesChanged: 5,
    additions: 100,
    deletions: 50
  };
  (testAnalysisResult as any).score = 65;
  
  console.log('📊 Expected Issue Counts:');
  console.log(`- New Issues: 4`);
  console.log(`- Unchanged Issues: 1`);
  console.log(`- Resolved Issues: 2`);
  console.log(`- Total: 7\n`);
  
  // Generate the report
  const report = generator.generateReport(testAnalysisResult, {
    format: 'markdown',
    includeEducation: false,
    verbosity: 'minimal'
  });
  
  // Extract issue counts from the report
  const newIssuesMatch = report.match(/\*\*New Issues:\*\*\s*(\d+)/);
  const resolvedMatch = report.match(/\*\*Resolved:\*\*\s*(\d+)/);
  const unchangedMatch = report.match(/\*\*Unchanged.*:\*\*\s*(\d+)/);
  
  const reportedNewCount = newIssuesMatch ? parseInt(newIssuesMatch[1]) : -1;
  const reportedResolvedCount = resolvedMatch ? parseInt(resolvedMatch[1]) : -1;
  const reportedUnchangedCount = unchangedMatch ? parseInt(unchangedMatch[1]) : -1;
  
  console.log('📝 Issue Counts in Report:');
  console.log(`- New Issues: ${reportedNewCount} ${reportedNewCount === 4 ? '✅' : '❌'}`);
  console.log(`- Resolved Issues: ${reportedResolvedCount} ${reportedResolvedCount === 2 ? '✅' : '❌'}`);
  console.log(`- Unchanged Issues: ${reportedUnchangedCount} ${reportedUnchangedCount === 1 ? '✅' : '❌'}\n`);
  
  // Check score calculation
  const scoreMatch = report.match(/\*\*(?:Quality )?Score:\*\*\s*(\d+)\/100/);
  const reportedScore = scoreMatch ? parseInt(scoreMatch[1]) : -1;
  
  console.log('📈 Score Calculation:');
  console.log(`- Expected score: ~65 (100 - 15(critical) - 10(high) - 5(medium) - 2(low) = 68)`);
  console.log(`- Reported score: ${reportedScore} ${reportedScore > 0 && reportedScore < 100 ? '✅' : '❌'}\n`);
  
  // Check if issues are actually listed
  const topIssuesSection = report.match(/### Top Issues to Address:([^#]+)/);
  let listedIssuesCount = 0;
  if (topIssuesSection) {
    const issueLines = topIssuesSection[1].match(/^-\s+.+$/gm);
    listedIssuesCount = issueLines ? issueLines.length : 0;
  }
  
  console.log('📋 Issues Listed in Report:');
  console.log(`- Top Issues section found: ${topIssuesSection ? '✅' : '❌'}`);
  console.log(`- Number of issues listed: ${listedIssuesCount} ${listedIssuesCount > 0 ? '✅' : '❌'}\n`);
  
  // Check severity breakdown
  const severityMatch = report.match(/🔴\s*\*\*Critical:\*\*\s*(\d+)/);
  const criticalCount = severityMatch ? parseInt(severityMatch[1]) : -1;
  
  console.log('🎯 Severity Breakdown:');
  console.log(`- Critical issues shown: ${criticalCount} ${criticalCount === 1 ? '✅' : '❌'}`);
  
  // Final verdict
  const allCountsCorrect = reportedNewCount === 4 && 
                          reportedResolvedCount === 2 && 
                          reportedUnchangedCount === 1 &&
                          listedIssuesCount > 0;
  
  console.log('\n' + '='.repeat(60));
  if (allCountsCorrect) {
    console.log('✅ BUG-059 FIXED: Issue counts are correct!');
  } else {
    console.log('❌ BUG-059 STILL PRESENT: Issue counts are incorrect!');
    if (reportedNewCount !== 4) {
      console.log(`   New issues: expected 4, got ${reportedNewCount}`);
    }
    if (listedIssuesCount === 0) {
      console.log('   No issues are being listed in the report');
    }
  }
  console.log('='.repeat(60));
  
  // Save report for inspection
  require('fs').writeFileSync(
    '/Users/alpinro/Code Prjects/codequal/packages/agents/test-v8-issue-count-report.md',
    report,
    'utf-8'
  );
  console.log('\n📄 Full report saved to: test-v8-issue-count-report.md');
}

testIssueCount().catch(console.error);