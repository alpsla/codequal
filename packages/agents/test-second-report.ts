#!/usr/bin/env npx ts-node

/**
 * Generate a second V8 report for comparison
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import * as fs from 'fs';
import { exec } from 'child_process';

async function generateSecondReport() {
  console.log('🚀 Generating Second V8 Report for Comparison...\n');
  
  // Create test data for a different PR
  const comparisonResult: any = {
    repositoryUrl: 'https://github.com/vercel/swr',
    
    mainBranch: {
      name: 'main',
      issues: [
        {
          id: 'MAIN-CRITICAL-1',
          title: 'Race Condition in Cache Update',
          description: 'Multiple simultaneous cache updates can cause data inconsistency',
          severity: 'critical',
          category: 'bug',
          type: 'race-condition',
          location: { file: 'src/cache.ts', line: 156 },
          codeSnippet: `cache.set(key, value); // No locking mechanism`,
          suggestedFix: 'Implement mutex or transaction-based cache updates'
        },
        {
          id: 'MAIN-HIGH-1',
          title: 'Missing Error Boundary',
          description: 'Component errors can crash the entire application',
          severity: 'high',
          category: 'stability',
          type: 'error-handling',
          location: { file: 'src/components/DataFetcher.tsx', line: 45 },
          codeSnippet: `render() { return <div>{this.state.data}</div>; }`,
          suggestedFix: 'Add error boundary component'
        },
        {
          id: 'MAIN-MEDIUM-1',
          title: 'Inefficient Re-renders',
          description: 'Component re-renders on every state change regardless of dependencies',
          severity: 'medium',
          category: 'performance',
          type: 'optimization',
          location: { file: 'src/hooks/useData.ts', line: 89 },
          codeSnippet: `useEffect(() => { fetchData(); }); // Missing dependency array`,
          suggestedFix: 'Add proper dependency array to useEffect'
        }
      ],
      metrics: {
        totalIssues: 3,
        criticalIssues: 1,
        highIssues: 1,
        mediumIssues: 1,
        lowIssues: 0
      }
    },
    
    prBranch: {
      name: 'PR #2950',
      issues: [
        {
          id: 'PR-CRITICAL-1',
          title: 'Race Condition in Cache Update',
          description: 'Multiple simultaneous cache updates can cause data inconsistency',
          severity: 'critical',
          category: 'bug',
          type: 'race-condition',
          location: { file: 'src/cache.ts', line: 156 },
          codeSnippet: `cache.set(key, value); // No locking mechanism`,
          suggestedFix: 'Implement mutex or transaction-based cache updates'
        },
        {
          id: 'PR-HIGH-1',
          title: 'Unhandled Promise Rejection',
          description: 'Async operations can fail silently without proper error handling',
          severity: 'high',
          category: 'error-handling',
          type: 'bug',
          location: { file: 'src/fetcher.ts', line: 234 },
          codeSnippet: `async function fetchData() {
  const response = await fetch(url);
  return response.json(); // No error handling
}`,
          suggestedFix: 'Add try-catch block with proper error logging'
        },
        {
          id: 'PR-HIGH-2',
          title: 'XSS Vulnerability in User Input',
          description: 'User input is rendered without sanitization',
          severity: 'high',
          category: 'security',
          type: 'vulnerability',
          location: { file: 'src/components/UserProfile.tsx', line: 67 },
          codeSnippet: `<div dangerouslySetInnerHTML={{__html: userData.bio}} />`,
          suggestedFix: 'Sanitize HTML content before rendering'
        },
        {
          id: 'PR-MEDIUM-1',
          title: 'Stale Closure in Event Handler',
          description: 'Event handler captures outdated state values',
          severity: 'medium',
          category: 'bug',
          type: 'closure',
          location: { file: 'src/hooks/useWebSocket.ts', line: 112 },
          codeSnippet: `socket.on('message', () => { console.log(count); });`,
          suggestedFix: 'Use ref or latest state pattern'
        },
        {
          id: 'PR-LOW-1',
          title: 'Console.log in Production',
          description: 'Debug logging left in production code',
          severity: 'low',
          category: 'code-quality',
          type: 'cleanup',
          location: { file: 'src/utils/logger.ts', line: 8 },
          codeSnippet: `console.log('Debug:', data);`,
          suggestedFix: 'Remove or use proper logging library'
        }
      ],
      metrics: {
        totalIssues: 5,
        criticalIssues: 1,
        highIssues: 2,
        mediumIssues: 1,
        lowIssues: 1
      }
    },
    
    prMetadata: {
      prNumber: 2950,
      prTitle: 'Fix cache invalidation and add WebSocket support',
      repository: 'https://github.com/vercel/swr',
      author: 'contributor-123',
      branch: 'feature/cache-fix',
      targetBranch: 'main',
      filesChanged: 12,
      additions: 456,
      deletions: 123,
      url: 'https://github.com/vercel/swr/pull/2950'
    },
    
    scores: {
      overall: 72,
      security: 65,
      performance: 78,
      maintainability: 82
    },
    
    summary: {
      totalNewIssues: 3, // Unhandled Promise, XSS, Console.log
      totalResolvedIssues: 1, // Inefficient Re-renders
      totalUnchangedIssues: 2, // Race Condition, (Missing Error Boundary removed)
      overallAssessment: 72
    },
    
    metadata: {
      analysisDate: new Date().toISOString(),
      analysisVersion: 'V8',
      aiModel: 'gpt-4o',
      confidence: 92,
      duration: 4.2,
      testType: 'comparison-test',
      dataSource: 'test-data'
    }
  };
  
  try {
    // Generate V8 report
    console.log('📄 Generating V8 HTML report...');
    const generator = new ReportGeneratorV8Final();
    const htmlReport = await generator.generateReport(comparisonResult);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `v8-comparison-report-vercel-swr-${timestamp}.html`;
    fs.writeFileSync(filename, htmlReport);
    console.log(`✅ Report saved to: ${filename}\n`);
    
    // Open in browser
    console.log('🌐 Opening report in browser...');
    exec(`open ${filename}`, (error) => {
      if (error) {
        console.error('Error opening browser:', error);
        console.log(`Please open manually: ${filename}`);
      } else {
        console.log('✅ Report opened in browser');
      }
      
      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 Report Summary:');
      console.log(`- Repository: vercel/swr PR #2950`);
      console.log(`- New Issues: 3 (Unhandled Promise, XSS, Console.log)`);
      console.log(`- Resolved Issues: 1 (Inefficient Re-renders)`);
      console.log(`- Unchanged Issues: 2 (Race Condition, Stale Closure)`);
      console.log(`- Overall Score: 72/100`);
      console.log('='.repeat(60));
    });
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
generateSecondReport().catch(console.error);