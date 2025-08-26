#!/usr/bin/env npx ts-node

import { ReportGeneratorV8Final } from '../comparison/report-generator-v8-final';
import { ComparisonResult } from '../types/analysis-types';

async function testLocationBug() {
  console.log('🧪 Testing V8 Report Generator Location Bug (BUG-058)\n');
  
  const generator = new ReportGeneratorV8Final();
  
  // Create test data with proper location information
  const testAnalysisResult: ComparisonResult = {
    success: true,
    newIssues: [
      {
        id: 'issue-001',
        type: 'vulnerability',
        severity: 'high',
        category: 'security',
        message: 'Hardcoded API key detected',
        description: 'API key should be in environment variables',
        location: {
          file: 'src/api/auth.ts',
          line: 42
        },
        suggestedFix: 'Move to .env file'
      },
      {
        id: 'issue-002',
        type: 'optimization',
        severity: 'medium',
        category: 'performance',
        message: 'N+1 query detected',
        description: 'Multiple database queries in a loop',
        location: {
          file: 'src/services/user.service.ts',
          line: 156
        },
        suggestedFix: 'Use eager loading'
      }
    ],
    unchangedIssues: [
      {
        id: 'issue-003',
        type: 'bug',
        severity: 'critical',
        category: 'code-quality',
        message: 'Null pointer exception possible',
        description: 'Object may be null when accessed',
        location: {
          file: 'src/utils/parser.ts',
          line: 89
        }
      }
    ],
    resolvedIssues: [
      {
        id: 'issue-004',
        type: 'vulnerability',
        severity: 'high',
        category: 'security',
        message: 'SQL injection vulnerability',
        description: 'Direct string concatenation in query',
        location: {
          file: 'src/db/queries.ts',
          line: 23
        }
      }
    ]
  };
  
  // Add extended metadata as any
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
  (testAnalysisResult as any).scanDuration = '45 seconds';
  (testAnalysisResult as any).modelUsed = 'gpt-4o';
  (testAnalysisResult as any).score = 75;
  
  console.log('📊 Test Data Summary:');
  console.log(`- New Issues: ${testAnalysisResult.newIssues?.length || 0}`);
  console.log(`- Unchanged Issues: ${testAnalysisResult.unchangedIssues?.length || 0}`);
  console.log(`- Resolved Issues: ${testAnalysisResult.resolvedIssues?.length || 0}\n`);
  
  console.log('🔍 Input Issue Locations:');
  testAnalysisResult.newIssues?.forEach(issue => {
    console.log(`✓ ${issue.message}: ${issue.location?.file}:${issue.location?.line}`);
  });
  console.log('');
  
  // Generate the report
  const report = await generator.generateReport(testAnalysisResult);
  
  // Check for "Unknown location" in the report
  const unknownLocationCount = (report.match(/Unknown location/gi) || []).length;
  const undefinedLocationCount = (report.match(/undefined:undefined/gi) || []).length;
  const unknownFileCount = (report.match(/unknown:\d+/gi) || []).length;
  
  console.log('📝 Report Analysis:');
  console.log(`- "Unknown location" found: ${unknownLocationCount} times`);
  console.log(`- "undefined:undefined" found: ${undefinedLocationCount} times`);
  console.log(`- "unknown:<number>" found: ${unknownFileCount} times\n`);
  
  // Extract location references from report
  const locationPattern = /Location:\s*([^:\n]+):(\d+|undefined)/gi;
  const locationMatches = [...report.matchAll(locationPattern)];
  
  if (locationMatches.length > 0) {
    console.log('📍 Locations Found in Report:');
    locationMatches.forEach(match => {
      const file = match[1].trim();
      const line = match[2];
      const isValid = file !== 'undefined' && file !== 'unknown' && line !== 'undefined';
      console.log(`  ${isValid ? '✅' : '❌'} ${file}:${line}`);
    });
  }
  
  // Check specific sections
  console.log('\n🔎 Checking Report Sections:');
  
  // Check Top Issues section
  const topIssuesMatch = report.match(/### Top Issues to Address:([^#]+)/);
  if (topIssuesMatch) {
    const hasValidLocations = topIssuesMatch[1].includes('.ts:') || topIssuesMatch[1].includes('.js:');
    console.log(`- Top Issues section: ${hasValidLocations ? '✅ Has valid locations' : '❌ Missing valid locations'}`);
  }
  
  // Check Action Items section
  const actionItemsMatch = report.match(/## 🎯 Action Items([^#]+)/);
  if (actionItemsMatch) {
    const hasValidLocations = actionItemsMatch[1].includes('.ts:') || actionItemsMatch[1].includes('.js:');
    console.log(`- Action Items section: ${hasValidLocations ? '✅ Has valid locations' : '❌ Missing valid locations'}`);
  }
  
  // Final verdict
  const hasLocationBug = unknownLocationCount > 0 || undefinedLocationCount > 0 || unknownFileCount > 0;
  
  console.log('\n' + '='.repeat(60));
  if (hasLocationBug) {
    console.log('❌ BUG-058 CONFIRMED: Location information is being lost!');
    console.log('   The report contains "Unknown location" or undefined references');
    console.log('   even though all test issues have valid location data.');
  } else {
    console.log('✅ BUG-058 FIXED: Location information is preserved correctly!');
  }
  console.log('='.repeat(60));
  
  // Save a snippet of the report for inspection
  const reportSnippet = report.substring(0, 2000);
  require('fs').writeFileSync(
    '/Users/alpinro/Code Prjects/codequal/packages/agents/test-v8-location-report.md',
    report,
    'utf-8'
  );
  console.log('\n📄 Full report saved to: test-v8-location-report.md');
}

testLocationBug().catch(console.error);