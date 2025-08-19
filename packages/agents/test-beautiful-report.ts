/**
 * Test V7 HTML Report Generation
 * Creates a human-readable HTML report with all 12 required sections
 * Fixes the undefined issue problem
 */

import { ReportGeneratorV7HTML } from './src/standard/comparison/report-generator-v7-html';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateBeautifulReport() {
  console.log('🎨 Generating V7 HTML Report with All 12 Sections');
  console.log('=' .repeat(60));
  
  // Create mock comparison data with proper Issue interface fields
  const comparisonData: any = {
    newIssues: [
      {
        id: '1',
        message: 'New AbortController memory leak',  // Required field
        title: 'New AbortController memory leak',     // Optional field for display
        severity: 'high',
        category: 'performance',
        location: { file: 'src/core/abort.js', line: 67 },  // Proper location format
        description: 'AbortController instances are not properly cleaned up after request cancellation, leading to memory accumulation over time',
        suggestedFix: 'Implement proper cleanup in the destructor'
      },
      {
        id: '2',
        message: 'Race condition in retry mechanism',
        title: 'Race condition in retry mechanism',
        severity: 'medium',
        category: 'concurrency',
        location: { file: 'src/retry.js', line: 112 },
        description: 'Multiple retries can execute simultaneously under certain network conditions, causing duplicate requests',
        suggestedFix: 'Add mutex lock for retry operations'
      },
      {
        id: '3',
        message: 'Incomplete AbortController tests',
        title: 'Incomplete AbortController tests',
        severity: 'low',
        category: 'code-quality',
        location: { file: 'test/abort.js', line: 23 },
        description: 'Missing test coverage for abort scenarios during retry operations',
        suggestedFix: 'Add comprehensive test cases for abort scenarios'
      }
    ],
    resolvedIssues: [
      {
        id: '4',
        message: 'Potential memory leak in request queue',
        title: 'Potential memory leak in request queue',
        severity: 'medium',
        category: 'performance',
        location: { file: 'src/core/Ky.js', line: 234 },
        description: 'Fixed by properly clearing requests from the queue on cancellation'
      },
      {
        id: '5',
        message: 'Inconsistent error messages',
        title: 'Inconsistent error messages',
        severity: 'low',
        category: 'code-quality',
        location: { file: 'src/errors.js', line: 12 },
        description: 'Standardized error message format across all error types'
      },
      {
        id: '6',
        message: 'Missing test coverage for edge cases',
        title: 'Missing test coverage for edge cases',
        severity: 'low',
        category: 'code-quality',
        location: { file: 'test/retry.js', line: 45 },
        description: 'Added comprehensive tests for concurrent retry scenarios'
      }
    ],
    unchangedIssues: [
      {
        id: '7',
        message: 'Missing error handling in retry logic',
        title: 'Missing error handling in retry logic',
        severity: 'high',
        category: 'code-quality',
        location: { file: 'src/index.js', line: 145 },
        description: 'The retry mechanism does not handle network timeouts properly',
        suggestedFix: 'Add proper timeout handling with exponential backoff'
      },
      {
        id: '8',
        message: 'Type definition missing for retry options',
        title: 'Type definition missing for retry options',
        severity: 'medium',
        category: 'code-quality',
        location: { file: 'src/types/index.d.ts', line: 89 },
        description: 'The RetryOptions interface is incomplete',
        suggestedFix: 'Complete the RetryOptions interface definition'
      }
    ],
    modifiedIssues: [],
    mainBranchAnalysis: {
      issues: [
        { id: '7', message: 'Missing error handling in retry logic', severity: 'high', location: { file: 'src/index.js', line: 145 } },
        { id: '4', message: 'Potential memory leak in request queue', severity: 'medium', location: { file: 'src/core/Ky.js', line: 234 } },
        { id: '8', message: 'Type definition missing for retry options', severity: 'medium', location: { file: 'src/types/index.d.ts', line: 89 } },
        { id: '5', message: 'Inconsistent error messages', severity: 'low', location: { file: 'src/errors.js', line: 12 } },
        { id: '6', message: 'Missing test coverage for edge cases', severity: 'low', location: { file: 'test/retry.js', line: 45 } }
      ],
      scores: {
        overall: 72,
        security: 85,
        performance: 68,
        codeQuality: 70,
        testing: 65
      },
      recommendations: [],
      testCoverage: {
        overall: 78,
        byFile: {}
      }
    },
    featureBranchAnalysis: {
      issues: [
        { id: '7', message: 'Missing error handling in retry logic', severity: 'high', location: { file: 'src/index.js', line: 145 } },
        { id: '8', message: 'Type definition missing for retry options', severity: 'medium', location: { file: 'src/types/index.d.ts', line: 89 } },
        { id: '1', message: 'New AbortController memory leak', severity: 'high', location: { file: 'src/core/abort.js', line: 67 } },
        { id: '2', message: 'Race condition in retry mechanism', severity: 'medium', location: { file: 'src/retry.js', line: 112 } },
        { id: '3', message: 'Incomplete AbortController tests', severity: 'low', location: { file: 'test/abort.js', line: 23 } }
      ],
      scores: {
        overall: 68,
        security: 85,
        performance: 60,
        codeQuality: 68,
        testing: 60
      },
      recommendations: [],
      testCoverage: {
        overall: 71,
        byFile: {}
      }
    },
    metadata: {
      repository_url: 'https://github.com/sindresorhus/ky',
      model: 'google/gemini-2.5-pro-exp-03-25',
      confidence: 94
    },
    prMetadata: {
      number: 700,
      title: 'Add AbortController support and retry improvements',
      description: 'This PR adds AbortController support for request cancellation and improves the retry mechanism with exponential backoff',
      author: 'sindresorhus',
      created_at: '2023-08-15T10:30:00Z',
      repository_url: 'https://github.com/sindresorhus/ky',
      linesAdded: 324,
      linesRemoved: 156
    }
  };
  
  // Generate the V7 HTML report with all 12 sections
  const generator = new ReportGeneratorV7HTML();
  const htmlReport = await generator.generateReport(comparisonData);
  
  // Save the report
  const reportPath = path.join(__dirname, 'v7-pr-report.html');
  fs.writeFileSync(reportPath, htmlReport);
  
  console.log(`\n✅ Beautiful report generated!`);
  console.log(`📄 Report saved to: ${reportPath}`);
  console.log(`📊 Report size: ${(htmlReport.length / 1024).toFixed(1)}KB`);
  
  // Display summary
  console.log('\n📈 Report Summary:');
  console.log(`   PR Decision: ${comparisonData.newIssues.some(i => i.severity === 'critical' || i.severity === 'high') ? '❌ DECLINED' : '✅ APPROVED'}`);
  console.log(`   New Issues: ${comparisonData.newIssues.length}`);
  console.log(`   Fixed Issues: ${comparisonData.resolvedIssues.length}`);
  console.log(`   Unchanged Issues: ${comparisonData.unchangedIssues.length}`);
  console.log(`   Overall Score: ${(comparisonData as any).featureBranchAnalysis?.scores?.overall}/100`);
  
  // Open in browser
  console.log('\n🌐 Opening report in browser...');
  try {
    const command = process.platform === 'darwin' 
      ? `open "${reportPath}"`
      : process.platform === 'win32'
      ? `start "${reportPath}"`
      : `xdg-open "${reportPath}"`;
    
    await execAsync(command);
    console.log('✅ Report opened in browser');
  } catch (error) {
    console.log('⚠️ Could not open browser automatically');
    console.log(`   Please open manually: ${reportPath}`);
  }
  
  return reportPath;
}

// Run the generator
generateBeautifulReport()
  .then(path => {
    console.log('\n🎉 Beautiful HTML report successfully generated and opened!');
  })
  .catch(error => {
    console.error('❌ Error generating report:', error);
  });