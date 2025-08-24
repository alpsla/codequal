#!/usr/bin/env npx ts-node

import { ReportGeneratorV8Final } from '../comparison/report-generator-v8-final';
import { ComparisonResult } from '../types/analysis-types';

async function testUnknownLocation() {
  console.log('🧪 Testing V8 Report Generator with Missing Location Data\n');
  
  const generator = new ReportGeneratorV8Final();
  
  // Create test data with MISSING location information
  const testAnalysisResult: ComparisonResult = {
    success: true,
    newIssues: [
      {
        id: 'issue-001',
        type: 'vulnerability',
        severity: 'critical',
        category: 'security',
        message: 'Hardcoded API key detected',
        description: 'API key should be in environment variables',
        // NO LOCATION
        suggestedFix: 'Move to .env file'
      },
      {
        id: 'issue-002',
        type: 'optimization',
        severity: 'high',
        category: 'performance',
        message: 'N+1 query detected',
        description: 'Multiple database queries in a loop',
        location: {
          // Partial location - missing line
          file: 'src/services/user.service.ts'
        } as any,
        suggestedFix: 'Use eager loading'
      },
      {
        id: 'issue-003',
        type: 'bug',
        severity: 'medium',
        category: 'code-quality',
        message: 'Potential null reference',
        description: 'Object may be null',
        location: {
          // Partial location - missing file
          line: 156
        } as any,
        suggestedFix: 'Add null check'
      }
    ],
    unchangedIssues: [],
    resolvedIssues: []
  };
  
  // Add extended metadata
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
  (testAnalysisResult as any).score = 65;
  
  console.log('📊 Test Data Summary:');
  console.log(`- Issue 1: No location at all`);
  console.log(`- Issue 2: Has file but no line number`);
  console.log(`- Issue 3: Has line but no file name\n`);
  
  // Generate the report
  const report = await generator.generateReport(testAnalysisResult);
  
  // Check for proper handling of missing locations
  const unknownLocationCount = (report.match(/Unknown location/gi) || []).length;
  const undefinedLocationCount = (report.match(/undefined:undefined/gi) || []).length;
  const undefinedCount = (report.match(/undefined(?!:)/gi) || []).length;
  const partialLocationCount = (report.match(/[^:]+:undefined|undefined:[^:]+/gi) || []).length;
  
  console.log('📝 Report Analysis:');
  console.log(`- "Unknown location" found: ${unknownLocationCount} times (expected: >0)`);
  console.log(`- "undefined:undefined" found: ${undefinedLocationCount} times (expected: 0)`);
  console.log(`- Partial locations (file:undefined or undefined:line): ${partialLocationCount} times (expected: 0)\n`);
  
  // Extract location references from report
  const locationPattern = /Location:\s*([^\n]+)/gi;
  const locationMatches = [...report.matchAll(locationPattern)];
  
  if (locationMatches.length > 0) {
    console.log('📍 Locations Found in Report:');
    locationMatches.forEach(match => {
      const location = match[1].trim();
      const isValid = !location.includes('undefined') && 
                     (location === 'Unknown location' || location.includes(':'));
      console.log(`  ${isValid ? '✅' : '❌'} ${location}`);
    });
  }
  
  // Check Action Items section specifically
  const actionItemsMatch = report.match(/## .*Action Items([^#]+)/);
  if (actionItemsMatch) {
    console.log('\n🎯 Action Items Section Check:');
    const hasUndefined = actionItemsMatch[1].includes('undefined');
    const hasUnknownLocation = actionItemsMatch[1].includes('Unknown location');
    console.log(`  ${!hasUndefined ? '✅' : '❌'} No 'undefined' in locations`);
    console.log(`  ${hasUnknownLocation ? '✅' : '❌'} Uses 'Unknown location' for missing data`);
  }
  
  // Final verdict
  const hasProperFallback = unknownLocationCount > 0 && 
                           undefinedLocationCount === 0 && 
                           partialLocationCount === 0;
  
  console.log('\n' + '='.repeat(60));
  if (hasProperFallback) {
    console.log('✅ SUCCESS: Missing locations properly handled with "Unknown location"!');
  } else {
    console.log('❌ FAILURE: Missing locations not properly handled!');
    if (undefinedLocationCount > 0) {
      console.log('   Found "undefined:undefined" in report');
    }
    if (partialLocationCount > 0) {
      console.log('   Found partial locations with undefined');
    }
    if (unknownLocationCount === 0) {
      console.log('   No "Unknown location" fallback found');
    }
  }
  console.log('='.repeat(60));
}

testUnknownLocation().catch(console.error);